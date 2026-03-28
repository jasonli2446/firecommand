'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { Flame, Users, Truck, Wind } from 'lucide-react';

export function MapStatsOverlay() {
  const fireClusters = useAppStore((s) => s.fireClusters);
  const resources = useAppStore((s) => s.resources);
  const evacuationZones = useAppStore((s) => s.evacuationZones);

  const totalAcres = fireClusters.reduce(
    (acc, c) => acc + c.estimatedAcres,
    0
  );
  const deployedCount = resources.filter(
    (r) => r.status === 'deployed' || r.status === 'en_route'
  ).length;
  const popAtRisk = evacuationZones.reduce(
    (acc, z) => acc + z.population,
    0
  );

  const critCount = fireClusters.filter((c) => c.severity === 'critical').length;
  const highCount = fireClusters.filter((c) => c.severity === 'high').length;

  const prevDeployedRef = useRef(deployedCount);
  const [deployFlash, setDeployFlash] = useState(false);

  useEffect(() => {
    if (deployedCount > prevDeployedRef.current) {
      setDeployFlash(true);
      const timer = setTimeout(() => setDeployFlash(false), 1200);
      prevDeployedRef.current = deployedCount;
      return () => clearTimeout(timer);
    }
    prevDeployedRef.current = deployedCount;
  }, [deployedCount]);

  return (
    <div className="absolute top-[56px] left-3 z-30 flex gap-2">
      <StatPill
        icon={<Flame className="h-3 w-3 text-orange-500" />}
        label="Active Fires"
        value={fireClusters.length.toString()}
        accent={critCount > 0 ? 'critical' : highCount > 0 ? 'high' : undefined}
      />
      <StatPill
        icon={<Wind className="h-3 w-3 text-red-400" />}
        label="Est. Acres"
        value={totalAcres.toLocaleString()}
      />
      <StatPill
        icon={<Truck className="h-3 w-3 text-blue-400" />}
        label="Deployed"
        value={`${deployedCount}/${resources.length}`}
        flash={deployFlash}
      />
      {popAtRisk > 0 && (
        <StatPill
          icon={<Users className="h-3 w-3 text-amber-400" />}
          label="Pop. at Risk"
          value={popAtRisk.toLocaleString()}
        />
      )}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
  flash,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: 'critical' | 'high';
  flash?: boolean;
}) {
  const borderClass = accent === 'critical' ? 'border-red-500/30' :
                      accent === 'high' ? 'border-orange-500/30' : 'border-white/5';
  return (
    <div className={`glass-panel rounded-lg px-3 py-1.5 flex items-center gap-2 border ${borderClass} min-w-[120px] ${flash ? 'ring-1 ring-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : ''}`}>
      {icon}
      <div className="flex flex-col">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">
          {label}
        </span>
        <span className="text-sm font-bold text-white leading-tight tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}
