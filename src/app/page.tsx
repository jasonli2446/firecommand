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
import { ActivityLog } from '@/components/ActivityLog';
import { HelpOverlay } from '@/components/HelpOverlay';
import { TourOverlay } from '@/components/TourOverlay';
import { useFireData } from '@/hooks/useFireData';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoTour } from '@/hooks/useAutoTour';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAppStore } from '@/store/app-store';
import { generateResources } from '@/lib/mock-resources';

export default function Home() {
  const { isLoading, lastUpdated } = useFireData();
  useKeyboardShortcuts();
  const { tourActive, startTour, stopTour } = useAutoTour();
  const { demoActive, startDemo, stopDemo } = useDemoMode(startTour, stopTour);
  const setResources = useAppStore((s) => s.setResources);
  const fireClusters = useAppStore((s) => s.fireClusters);
  const resources = useAppStore((s) => s.resources);

  const addLogEntry = useAppStore((s) => s.addLogEntry);

  // 'T' key toggles auto-tour, 'D' key starts demo mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 't' || e.key === 'T') {
        tourActive ? stopTour() : startTour();
      } else if (e.key === 'D' && !e.ctrlKey && !e.metaKey) {
        demoActive ? stopDemo() : startDemo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [tourActive, startTour, stopTour, demoActive, startDemo, stopDemo]);

  // Generate resources once on mount
  useEffect(() => {
    setResources(generateResources());
    addLogEntry('system', 'FireCommand online — FIRMS data loaded');
  }, [setResources, addLogEntry]);

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

  // Auto-transition en_route → deployed after travel animation (8s)
  // Use a stable interval that reads from store directly — no dependency on resources
  useEffect(() => {
    const TRAVEL_DURATION = 8000;
    const timer = setInterval(() => {
      const store = useAppStore.getState();
      const now = Date.now();
      const toTransition = store.resources.filter(
        (r) => r.status === 'en_route' && r.deployedAt && now - r.deployedAt >= TRAVEL_DURATION
      );
      if (toTransition.length > 0) {
        const ids = new Set(toTransition.map((r) => r.id));
        store.setResources(
          store.resources.map((r) =>
            ids.has(r.id) ? { ...r, status: 'deployed' as const } : r
          )
        );
      }
    }, 2000); // Check every 2s instead of 1s
    return () => clearInterval(timer);
  }, []);

  if (isLoading && !fireClusters.length) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative h-full w-full">
      <FireMap />
      <div className="absolute inset-0 map-vignette z-[1]" />
      <div className="absolute inset-0 scan-lines z-[1] pointer-events-none" />
      <AppHeader lastUpdated={lastUpdated} isLoading={isLoading} tourActive={tourActive} onStartTour={startTour} onStopTour={stopTour} />
      <MapLegend />
      <MapStatsOverlay />
      <CommandPanel />
      <TimelineBar />
      <ActivityLog />
      <TourOverlay />
      <HelpOverlay />
      <NotificationContainer />
    </div>
  );
}
