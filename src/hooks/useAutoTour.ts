'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/app-store';

const TOUR_DWELL_TIME = 4000; // Time spent on each fire (ms)
const TOUR_TRANSITION_TIME = 2000; // Camera flight time (ms)

export function useAutoTour() {
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const startTour = useCallback(() => {
    const { fireClusters } = useAppStore.getState();
    if (fireClusters.length === 0) return;
    setTourActive(true);
    setTourStep(0);
  }, []);

  const stopTour = useCallback(() => {
    setTourActive(false);
    setTourStep(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!tourActive || tourStep < 0) return;

    const { fireClusters, selectCluster } = useAppStore.getState();

    // Sort: critical first, then by FRP descending
    const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const sorted = [...fireClusters].sort((a, b) => {
      const sd = sevOrder[a.severity] - sevOrder[b.severity];
      return sd !== 0 ? sd : b.totalFRP - a.totalFRP;
    });

    // Only tour the top fires (critical + high, max 5)
    const tourFires = sorted
      .filter((c) => c.severity === 'critical' || c.severity === 'high')
      .slice(0, 5);

    if (tourStep < tourFires.length) {
      // Select the fire (triggers fly-to via FireMap useEffect)
      selectCluster(tourFires[tourStep].id);

      // After dwell time, advance to next
      timerRef.current = setTimeout(() => {
        setTourStep((s) => s + 1);
      }, TOUR_DWELL_TIME + TOUR_TRANSITION_TIME);
    } else {
      // Tour complete — deselect and zoom out
      selectCluster(null);
      setTourActive(false);
      setTourStep(-1);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tourActive, tourStep]);

  return { tourActive, startTour, stopTour };
}
