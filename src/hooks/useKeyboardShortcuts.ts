'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const store = useAppStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (store.timelinePosition >= 0.999)
            store.setTimelinePosition(0);
          store.setIsPlaying(!store.isPlaying);
          break;
        case 'p':
          store.setPanelOpen(!store.panelOpen);
          break;
        case 'Escape':
          if (store.tourActive) {
            store.setTourState(false, -1);
            store.selectCluster(null);
          } else if (store.selectedClusterId) {
            store.selectCluster(null);
          } else if (store.panelOpen) {
            store.setPanelOpen(false);
          }
          break;
        case '1':
          if (e.shiftKey) { store.setActiveTab('overview'); store.setPanelOpen(true); }
          else store.setPlaybackSpeed(1);
          break;
        case '2':
          if (e.shiftKey) { store.setActiveTab('ai'); store.setPanelOpen(true); }
          else store.setPlaybackSpeed(2);
          break;
        case '3':
          if (e.shiftKey) { store.setActiveTab('resources'); store.setPanelOpen(true); }
          break;
        case '4':
          if (e.shiftKey) { store.setActiveTab('evacuations'); store.setPanelOpen(true); }
          else store.setPlaybackSpeed(4);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // Cycle through fire clusters (previous)
          if (e.metaKey || e.ctrlKey) {
            const clusters = [...store.fireClusters].sort((a, b) => {
              // Sort by severity (critical first)
              const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
              const severityDiff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
                                   (severityOrder[b.severity as keyof typeof severityOrder] ?? 4);
              if (severityDiff !== 0) return severityDiff;
              // Then by totalFRP descending
              return b.totalFRP - a.totalFRP;
            });

            if (clusters.length === 0) break;

            const currentIndex = store.selectedClusterId
              ? clusters.findIndex(c => c.id === store.selectedClusterId)
              : -1;

            const nextIndex = currentIndex === -1 || currentIndex === 0
              ? clusters.length - 1  // Wrap to last
              : currentIndex - 1;

            const nextCluster = clusters[nextIndex];
            store.selectCluster(nextCluster.id);
            store.setPendingFlyTo(nextCluster.centroid);
          } else {
            // Timeline scrubbing
            store.setTimelinePosition(
              Math.max(0, store.timelinePosition - 0.05)
            );
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Cycle through fire clusters (next)
          if (e.metaKey || e.ctrlKey) {
            const clusters = [...store.fireClusters].sort((a, b) => {
              // Sort by severity (critical first)
              const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
              const severityDiff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 4) -
                                   (severityOrder[b.severity as keyof typeof severityOrder] ?? 4);
              if (severityDiff !== 0) return severityDiff;
              // Then by totalFRP descending
              return b.totalFRP - a.totalFRP;
            });

            if (clusters.length === 0) break;

            const currentIndex = store.selectedClusterId
              ? clusters.findIndex(c => c.id === store.selectedClusterId)
              : -1;

            const nextIndex = currentIndex === -1 || currentIndex === clusters.length - 1
              ? 0  // Wrap to first
              : currentIndex + 1;

            const nextCluster = clusters[nextIndex];
            store.selectCluster(nextCluster.id);
            store.setPendingFlyTo(nextCluster.centroid);
          } else {
            // Timeline scrubbing
            store.setTimelinePosition(
              Math.min(1, store.timelinePosition + 0.05)
            );
          }
          break;
        case '?':
          store.setShowHelp(!store.showHelp);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
