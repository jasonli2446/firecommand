'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';

type DemoStep =
  | 'idle'
  | 'settling'
  | 'tour'
  | 'select_fire'
  | 'show_ai_tab'
  | 'auto_analyze'
  | 'auto_execute'
  | 'complete';

interface DemoCallbacks {
  startTour: () => void;
  stopTour: () => void;
}

export function useDemoMode(callbacks: DemoCallbacks) {
  const { startTour, stopTour } = callbacks;
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const stopDemo = useCallback(() => {
    cleanup();
    setDemoActive(false);
    setDemoStep('idle');
    const { tourActive, setDemoActive: setStoreDemoActive } = useAppStore.getState();
    setStoreDemoActive(false);
    if (tourActive) stopTour();
  }, [cleanup, stopTour]);

  const startDemo = useCallback(() => {
    const { fireClusters, setDemoActive: setStoreDemoActive } = useAppStore.getState();
    if (fireClusters.length === 0) return;
    setDemoActive(true);
    setStoreDemoActive(true);
    setDemoStep('settling');
  }, []);

  // State machine
  useEffect(() => {
    if (!demoActive) return;

    switch (demoStep) {
      case 'settling':
        // Let camera opening animation finish
        timeoutRef.current = setTimeout(() => setDemoStep('tour'), 2000);
        break;

      case 'tour':
        startTour();
        // Poll for tour completion (or timeout after 35s)
        const startTime = Date.now();
        pollRef.current = setInterval(() => {
          const { tourActive } = useAppStore.getState();
          const elapsed = Date.now() - startTime;
          if (!tourActive || elapsed > 35000) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (tourActive) stopTour();
            // Small pause after tour
            timeoutRef.current = setTimeout(() => setDemoStep('select_fire'), 1500);
          }
        }, 500);
        break;

      case 'select_fire': {
        const { fireClusters, selectCluster } = useAppStore.getState();
        const sevOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
        const sorted = [...fireClusters].sort((a, b) => {
          const sd = sevOrder[a.severity] - sevOrder[b.severity];
          return sd !== 0 ? sd : b.totalFRP - a.totalFRP;
        });
        if (sorted.length > 0) {
          selectCluster(sorted[0].id);
          timeoutRef.current = setTimeout(() => setDemoStep('show_ai_tab'), 2500);
        } else {
          setDemoStep('complete');
        }
        break;
      }

      case 'show_ai_tab': {
        const { setActiveTab, setPanelOpen, triggerAIAnalyze } = useAppStore.getState();
        setPanelOpen(true);
        setActiveTab('ai');
        if (triggerAIAnalyze) {
          // Continue to automated analysis
          timeoutRef.current = setTimeout(() => setDemoStep('auto_analyze'), 2000);
        } else {
          // Demo pauses here — user clicks "Analyze" and "Execute" manually
          setDemoStep('complete');
        }
        break;
      }

      case 'auto_analyze': {
        const { triggerAIAnalyze } = useAppStore.getState();
        if (triggerAIAnalyze) {
          triggerAIAnalyze();
          // Wait for analysis to complete (streaming takes ~10-12s)
          timeoutRef.current = setTimeout(() => setDemoStep('auto_execute'), 12000);
        } else {
          setDemoStep('complete');
        }
        break;
      }

      case 'auto_execute': {
        const { executeAIPlan } = useAppStore.getState();
        executeAIPlan();
        // Wait a moment before completing
        timeoutRef.current = setTimeout(() => setDemoStep('complete'), 2000);
        break;
      }

      case 'complete': {
        const { setDemoActive: setStoreDemoActive } = useAppStore.getState();
        setDemoActive(false);
        setStoreDemoActive(false);
        setDemoStep('idle');
        break;
      }
    }

    return () => cleanup();
  }, [demoActive, demoStep, startTour, stopTour, cleanup]);

  return { demoActive, demoStep, startDemo, stopDemo };
}
