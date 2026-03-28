'use client';

import { useAppStore } from '@/store/app-store';

const CA_BOUNDS = {
  minLng: -124.5,
  maxLng: -114,
  minLat: 32.5,
  maxLat: 42,
};

const WIDTH = 120;
const HEIGHT = 100;

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

function toPixel(lng: number, lat: number): [number, number] {
  const x = ((lng - CA_BOUNDS.minLng) / (CA_BOUNDS.maxLng - CA_BOUNDS.minLng)) * WIDTH;
  const y = HEIGHT - ((lat - CA_BOUNDS.minLat) / (CA_BOUNDS.maxLat - CA_BOUNDS.minLat)) * HEIGHT;
  return [x, y];
}

export function MiniMap() {
  const fireClusters = useAppStore((s) => s.fireClusters);
  const selectedClusterId = useAppStore((s) => s.selectedClusterId);
  const panelOpen = useAppStore((s) => s.panelOpen);

  if (fireClusters.length === 0) return null;

  const rightOffset = panelOpen ? 'right-[432px]' : 'right-3';

  return (
    <div className={`fixed bottom-[88px] z-30 glass-panel rounded-md border border-white/10 p-1.5 opacity-70 hover:opacity-100 transition-all duration-300 ${rightOffset}`}>
      <svg width={WIDTH} height={HEIGHT} className="block">
        {/* California outline (simplified) */}
        <path
          d="M 85 5 L 95 10 L 98 25 L 105 35 L 110 55 L 105 65 L 95 72 L 80 80 L 65 88 L 50 92 L 35 90 L 20 85 L 10 70 L 8 55 L 12 40 L 18 25 L 30 15 L 50 8 L 70 5 Z"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
        {/* Fire cluster dots */}
        {fireClusters.map((c) => {
          const [x, y] = toPixel(c.centroid[0], c.centroid[1]);
          const isSelected = c.id === selectedClusterId;
          const r = c.severity === 'critical' ? 4 : c.severity === 'high' ? 3 : 2;
          return (
            <g key={c.id}>
              {isSelected && (
                <circle cx={x} cy={y} r={r + 3} fill="none" stroke="white" strokeWidth="1" opacity="0.6" />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={SEVERITY_COLORS[c.severity] || '#888'}
                opacity={isSelected ? 1 : 0.7}
              />
            </g>
          );
        })}
      </svg>
      <div className="text-[8px] text-center text-muted-foreground/40 tracking-widest mt-0.5">CALIFORNIA</div>
    </div>
  );
}
