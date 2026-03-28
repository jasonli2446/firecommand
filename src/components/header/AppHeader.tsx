'use client';

import { Flame, Radio, Satellite } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';

interface AppHeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function AppHeader({ lastUpdated, isLoading }: AppHeaderProps) {
  const { fireClusters, resources } = useAppStore();

  const criticalCount = fireClusters.filter(
    (c) => c.severity === 'critical'
  ).length;
  const activeResources = resources.filter(
    (r) => r.status === 'deployed' || r.status === 'en_route'
  ).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5">
      <div className="flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-orange-500" />
          <div>
            <span className="text-sm font-bold tracking-widest text-white uppercase">
              FireCommand
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
              Wildfire Response Coordinator
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`}
            />
            <span className="text-muted-foreground font-medium">
              {isLoading ? 'UPDATING' : 'LIVE'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <Satellite className="h-3.5 w-3.5" />
            <span>VIIRS NOAA-20</span>
          </div>
          {lastUpdated && (
            <span className="hidden md:inline text-muted-foreground">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} CRITICAL
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            <Radio className="h-3 w-3 mr-1" />
            {fireClusters.length} fires
          </Badge>
          <Badge variant="secondary" className="text-xs hidden sm:flex">
            {activeResources} deployed
          </Badge>
        </div>
      </div>
    </header>
  );
}
