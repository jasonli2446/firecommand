'use client';

import { useEffect } from 'react';
import { FireMap } from '@/components/map/FireMap';
import { AppHeader } from '@/components/header/AppHeader';
import { CommandPanel } from '@/components/panels/CommandPanel';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { MapStatsOverlay } from '@/components/map/MapStatsOverlay';
import { MapLegend } from '@/components/map/MapLegend';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NotificationContainer } from '@/components/Notifications';
import { useFireData } from '@/hooks/useFireData';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAppStore } from '@/store/app-store';
import { generateResources } from '@/lib/mock-resources';

export default function Home() {
  const { isLoading, lastUpdated } = useFireData();
  useKeyboardShortcuts();
  const setResources = useAppStore((s) => s.setResources);
  const fireClusters = useAppStore((s) => s.fireClusters);
  const resources = useAppStore((s) => s.resources);

  // Generate resources once on mount
  useEffect(() => {
    setResources(generateResources());
  }, [setResources]);

  // Auto-assign deployed/en_route resources to nearest fire clusters
  useEffect(() => {
    if (!fireClusters.length || !resources.length) return;

    const needsAssignment = resources.some(
      (r) =>
        (r.status === 'deployed' || r.status === 'en_route') &&
        !r.assignedClusterId
    );
    if (!needsAssignment) return;

    const updated = resources.map((r) => {
      if (
        (r.status === 'deployed' || r.status === 'en_route') &&
        !r.assignedClusterId
      ) {
        // Find nearest cluster
        let minDist = Infinity;
        let nearest = fireClusters[0];
        for (const c of fireClusters) {
          const dx = r.longitude - c.centroid[0];
          const dy = r.latitude - c.centroid[1];
          const dist = dx * dx + dy * dy;
          if (dist < minDist) {
            minDist = dist;
            nearest = c;
          }
        }
        return { ...r, assignedClusterId: nearest.id };
      }
      return r;
    });

    setResources(updated);
  }, [fireClusters.length]); // Only run when clusters first load

  if (isLoading && !fireClusters.length) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative h-full w-full">
      <FireMap />
      <AppHeader lastUpdated={lastUpdated} isLoading={isLoading} />
      <MapLegend />
      <MapStatsOverlay />
      <CommandPanel />
      <TimelineBar />
      <NotificationContainer />
    </div>
  );
}
