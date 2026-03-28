'use client';

import { useMemo } from 'react';

interface FRPSparklineProps {
  points: Array<{ acquiredAt: string | Date; frp: number }>;
}

export function FRPSparkline({ points }: FRPSparklineProps) {
  const data = useMemo(() => {
    if (points.length < 2) return null;

    // Sort by time and bin into 12 buckets
    const sorted = [...points]
      .map((p) => ({
        time: new Date(p.acquiredAt).getTime(),
        frp: p.frp || 0,
      }))
      .sort((a, b) => a.time - b.time);

    const bins = 12;
    const minTime = sorted[0].time;
    const maxTime = sorted[sorted.length - 1].time;
    const range = maxTime - minTime || 1;

    const buckets = new Array(bins).fill(0);
    const counts = new Array(bins).fill(0);

    for (const d of sorted) {
      const bin = Math.min(bins - 1, Math.floor(((d.time - minTime) / range) * bins));
      buckets[bin] += d.frp;
      counts[bin]++;
    }

    // Average FRP per bucket
    const avgFRP = buckets.map((sum, i) => (counts[i] > 0 ? sum / counts[i] : 0));
    const maxFRP = Math.max(...avgFRP, 1);

    return { avgFRP, maxFRP };
  }, [points]);

  if (!data) return null;

  const { avgFRP, maxFRP } = data;
  const width = 200;
  const height = 32;
  const padding = 2;

  // Build SVG path
  const pathPoints = avgFRP.map((val, i) => {
    const x = padding + (i / (avgFRP.length - 1)) * (width - padding * 2);
    const y = height - padding - (val / maxFRP) * (height - padding * 2);
    return `${x},${y}`;
  });
  const linePath = `M ${pathPoints.join(' L ')}`;
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">FRP Trend</span>
        <span className="text-[10px] text-orange-400/70 font-medium">
          Peak: {Math.round(maxFRP)} MW
        </span>
      </div>
      <svg width={width} height={height} className="block w-full">
        {/* Area fill */}
        <path d={areaPath} fill="url(#frp-gradient)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="frp-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
