'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';

const TOUR_DWELL_TIME = 5000; // Time spent on each fire (ms)
const TOUR_TRANSITION_TIME = 2500; // Camera flight time (ms)

export function useAutoTour() {
  const tourActive = useAppStore((s) => s.tourActive);
  const tourStep = useAppStore((s) => s.tourStep);
  const setTourState = useAppStore((s) => s.setTourState);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startTour = useCallback(() => {
    const { fireClusters } = useAppStore.getState();
    if (fireClusters.length === 0) return;
    setTourState(true, 0);
  }, [setTourState]);

  const stopTour = useCallback(() => {
    setTourState(false, -1);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [setTourState]);

  useEffect(() => {
    if (!tourActive || tourStep < 0) return;

    const { fireClusters, selectCluster } = useAppStore.getState();

    // Sort: critical first, then by FRP descending
    const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const sorted = [...fireClusters].sort((a, b) => {
      const sd = sevOrder[a.severity] - sevOrder[b.severity];
      return sd !== 0 ? sd : b.totalFRP - a.totalFRP;
    });

    // Tour top fires (critical + high preferred, include moderate if needed)
    const highSev = sorted.filter((c) => c.severity === 'critical' || c.severity === 'high');
    const tourFires = highSev.length >= 3
      ? highSev.slice(0, 5)
      : sorted.filter((c) => c.severity !== 'low').slice(0, 5);

    if (tourStep < tourFires.length) {
      // Select the fire (triggers fly-to via FireMap useEffect)
      selectCluster(tourFires[tourStep].id);

      // After dwell time, advance to next
      timerRef.current = setTimeout(() => {
        setTourState(true, tourStep + 1);
      }, TOUR_DWELL_TIME + TOUR_TRANSITION_TIME);
    } else {
      // Tour complete — deselect and zoom out
      selectCluster(null);
      setTourState(false, -1);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tourActive, tourStep, setTourState]);

  return { tourActive, startTour, stopTour };
}
