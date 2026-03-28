'use client';

import { useAppStore } from '@/store/app-store';
import { Flame, MapPin, Thermometer, Wind, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function TourOverlay() {
  const tourActive = useAppStore((s) => s.tourActive);
  const tourStep = useAppStore((s) => s.tourStep);
  const selectedClusterId = useAppStore((s) => s.selectedClusterId);
  const fireClusters = useAppStore((s) => s.fireClusters);
  const resources = useAppStore((s) => s.resources);
  const windSpeed = useAppStore((s) => s.selectedWindSpeed);
  const windDir = useAppStore((s) => s.selectedWindDirection);

  if (!tourActive || tourStep < 0 || !selectedClusterId) return null;

  const cluster = fireClusters.find((c) => c.id === selectedClusterId);
  if (!cluster) return null;

  const assignedCount = resources.filter(
    (r) => r.assignedClusterId === cluster.id && (r.status === 'deployed' || r.status === 'en_route')
  ).length;

  // Sort fires for tour to determine total
  const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
  const sorted = [...fireClusters].sort((a, b) => {
    const sd = sevOrder[a.severity] - sevOrder[b.severity];
    return sd !== 0 ? sd : b.totalFRP - a.totalFRP;
  });
  const highSev = sorted.filter((c) => c.severity === 'critical' || c.severity === 'high');
  const tourFires = highSev.length >= 3
    ? highSev.slice(0, 5)
    : sorted.filter((c) => c.severity !== 'low').slice(0, 5);

  const sevColor =
    cluster.severity === 'critical' ? 'text-red-400' :
    cluster.severity === 'high' ? 'text-orange-400' :
    cluster.severity === 'moderate' ? 'text-yellow-400' : 'text-green-400';

  const sevBg =
    cluster.severity === 'critical' ? 'bg-red-500/20 border-red-500/30' :
    cluster.severity === 'high' ? 'bg-orange-500/20 border-orange-500/30' :
    cluster.severity === 'moderate' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-green-500/20 border-green-500/30';

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 tour-overlay-enter">
      <div className="glass-panel rounded-xl border border-white/10 px-6 py-4 min-w-[400px] max-w-[500px]">
        {/* Tour progress */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {tourFires.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-6 rounded-full transition-all duration-500 ${
                  i <= tourStep ? 'bg-orange-500' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto uppercase tracking-wider">
            {tourStep + 1} / {tourFires.length}
          </span>
        </div>

        {/* Fire info */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${sevBg} border shrink-0`}>
            <Flame className={`h-5 w-5 ${sevColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-tight truncate">
              {cluster.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                FRP {cluster.totalFRP}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {cluster.estimatedAcres.toLocaleString()} ac
              </span>
              <span className="flex items-center gap-1">
                {cluster.points.length} detections
              </span>
              {windSpeed !== null && (
                <span className="flex items-center gap-1 text-blue-400/80">
                  <Wind className="h-3 w-3" />
                  {windSpeed} mph
                  {windDir !== null && ` ${['N','NE','E','SE','S','SW','W','NW'][Math.round(windDir / 45) % 8]}`}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-xs font-bold uppercase ${sevColor}`}>
              {cluster.severity}
            </span>
            <div className="flex items-center gap-1 justify-end mt-1">
              {cluster.trend === 'growing' && (
                <>
                  <TrendingUp className="h-3 w-3 text-red-400" />
                  <span className="text-[10px] text-red-400 font-semibold">GROWING</span>
                </>
              )}
              {cluster.trend === 'stable' && (
                <>
                  <Minus className="h-3 w-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-semibold">STABLE</span>
                </>
              )}
              {cluster.trend === 'declining' && (
                <>
                  <TrendingDown className="h-3 w-3 text-green-400" />
                  <span className="text-[10px] text-green-400 font-semibold">DECLINING</span>
                </>
              )}
            </div>
            {assignedCount > 0 && (
              <p className="text-[10px] text-blue-400 mt-0.5">
                {assignedCount} resources
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
