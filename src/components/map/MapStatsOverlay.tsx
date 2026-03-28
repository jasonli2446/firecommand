'use client';

import { useAppStore } from '@/store/app-store';
import { Flame, Users, Truck, Wind } from 'lucide-react';

export function MapStatsOverlay() {
  const { fireClusters, resources, evacuationZones } = useAppStore();

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

  return (
    <div className="absolute bottom-20 left-4 z-30 flex flex-col gap-2">
      <StatPill
        icon={<Flame className="h-3 w-3 text-orange-500" />}
        label="Total Fires"
        value={fireClusters.length.toString()}
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-panel rounded-lg px-3 py-1.5 flex items-center gap-2 border border-white/5 min-w-[140px]">
      {icon}
      <div className="flex flex-col">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">
          {label}
        </span>
        <span className="text-sm font-bold text-white leading-tight">
          {value}
        </span>
      </div>
    </div>
  );
}
