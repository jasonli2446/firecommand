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
          if (store.selectedClusterId) {
            store.selectCluster(null);
          } else if (store.panelOpen) {
            store.setPanelOpen(false);
          }
          break;
        case '1':
          store.setPlaybackSpeed(1);
          break;
        case '2':
          store.setPlaybackSpeed(2);
          break;
        case '4':
          store.setPlaybackSpeed(4);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.setTimelinePosition(
            Math.max(0, store.timelinePosition - 0.05)
          );
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.setTimelinePosition(
            Math.min(1, store.timelinePosition + 0.05)
          );
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
