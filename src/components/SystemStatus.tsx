'use client';

import { useState, useEffect } from 'react';

interface StatusItem {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  latency?: number;
}

export function SystemStatus() {
  const [statuses, setStatuses] = useState<StatusItem[]>([
    { name: 'NASA FIRMS', status: 'online', latency: 0 },
    { name: 'NWS Weather', status: 'online', latency: 0 },
    { name: 'Palantir AIP', status: 'online', latency: 0 },
    { name: 'Mapbox GL', status: 'online', latency: 0 },
  ]);

  // Check API status on mount
  useEffect(() => {
    async function checkHealth() {
      const start = Date.now();
      try {
        const res = await fetch('/api/status');
        const latency = Date.now() - start;
        if (res.ok) {
          setStatuses((prev) =>
            prev.map((s) =>
              s.name === 'NASA FIRMS'
                ? { ...s, status: 'online' as const, latency }
                : s
            )
          );
        }
      } catch {
        setStatuses((prev) =>
          prev.map((s) =>
            s.name === 'NASA FIRMS' ? { ...s, status: 'degraded' as const } : s
          )
        );
      }
    }
    checkHealth();
  }, []);

  const statusColor = (s: StatusItem['status']) =>
    s === 'online' ? 'bg-emerald-500' : s === 'degraded' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        System Status
      </h3>
      <div className="space-y-1.5">
        {statuses.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor(s.status)}`} />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
            <span className="text-muted-foreground/50 text-[10px] tabular-nums">
              {s.status === 'online' ? (s.latency ? `${s.latency}ms` : 'OK') : s.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
