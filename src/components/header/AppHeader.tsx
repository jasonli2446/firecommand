'use client';

import { Flame, Radio, Satellite, PanelRightOpen, PanelRightClose, AlertTriangle, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useMemo } from 'react';

interface AppHeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  tourActive?: boolean;
  onStartTour?: () => void;
  onStopTour?: () => void;
}

export function AppHeader({ lastUpdated, isLoading, tourActive, onStartTour, onStopTour }: AppHeaderProps) {
  const { fireClusters, resources, evacuationZones, panelOpen, setPanelOpen } =
    useAppStore();

  const criticalCount = fireClusters.filter(
    (c) => c.severity === 'critical'
  ).length;
  const highCount = fireClusters.filter(
    (c) => c.severity === 'high'
  ).length;
  const activeResources = resources.filter(
    (r) => r.status === 'deployed' || r.status === 'en_route'
  ).length;
  const immediateEvacCount = evacuationZones.filter(
    (z) => z.riskLevel === 'immediate'
  ).length;
  const totalPopAtRisk = evacuationZones.reduce(
    (acc, z) => acc + z.population,
    0
  );

  // Generate alert messages based on current situation
  const alerts = useMemo(() => {
    const msgs: string[] = [];
    const critClusters = fireClusters.filter((c) => c.severity === 'critical');
    const highClusters = fireClusters.filter((c) => c.severity === 'high');
    for (const c of critClusters) {
      msgs.push(
        `CRITICAL: ${c.name} — ${c.estimatedAcres.toLocaleString()} acres, FRP ${c.totalFRP}`
      );
    }
    for (const c of highClusters.slice(0, 3)) {
      msgs.push(
        `HIGH: ${c.name} — ${c.estimatedAcres.toLocaleString()} acres, ${c.points.length} detections`
      );
    }
    if (immediateEvacCount > 0) {
      msgs.push(
        `${immediateEvacCount} IMMEDIATE evacuation zone${immediateEvacCount > 1 ? 's' : ''} active — ${totalPopAtRisk.toLocaleString()} people at risk`
      );
    }
    const availableCount = resources.filter(
      (r) => r.status === 'available'
    ).length;
    if (availableCount < 5) {
      msgs.push(
        `LOW RESOURCES: Only ${availableCount} units available for deployment`
      );
    }
    return msgs;
  }, [fireClusters, immediateEvacCount, totalPopAtRisk, resources]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-panel border-b border-white/5">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Flame className="h-5 w-5 text-orange-500" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
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
            <div className="hidden md:flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-blue-400 font-medium">AIP</span>
            </div>
            {lastUpdated && (
              <span className="hidden md:inline text-muted-foreground">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {criticalCount > 0 ? (
              <Badge variant="destructive" className="text-xs glow-red">
                {criticalCount} CRITICAL
              </Badge>
            ) : highCount > 0 ? (
              <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                {highCount} HIGH
              </Badge>
            ) : null}
            <Badge variant="secondary" className="text-xs">
              <Radio className="h-3 w-3 mr-1" />
              {fireClusters.length} fires
            </Badge>
            <Badge variant="secondary" className="text-xs hidden sm:flex">
              {activeResources} deployed
            </Badge>

            {tourActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 animate-pulse"
                onClick={onStopTour}
              >
                TOUR
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
                onClick={onStartTour}
                title="Auto-tour critical fires (T)"
              >
                <Compass className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-white"
              onClick={() => setPanelOpen(!panelOpen)}
            >
              {panelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Alert ticker */}
      {alerts.length > 0 && (
        <div className="glass-panel border-b border-white/5 overflow-hidden h-7">
          <div className="flex items-center h-full px-3 gap-2">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <div className="overflow-hidden flex-1">
              <div
                className="whitespace-nowrap text-xs text-amber-400/90 font-medium"
                style={{
                  animation: `ticker ${Math.max(alerts.join('   ///   ').length * 0.12, 15)}s linear infinite`,
                }}
              >
                {alerts.join('   ///   ')}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
