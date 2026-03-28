import { create } from 'zustand';
import { FireDetection, FireCluster } from '@/types/fire';
import { Resource } from '@/types/resource';
import { EvacuationZone } from '@/types/evacuation';

interface AppState {
  fireDetections: FireDetection[];
  fireClusters: FireCluster[];
  resources: Resource[];
  evacuationZones: EvacuationZone[];

  selectedClusterId: string | null;
  panelOpen: boolean;
  activeTab: string;
  timelinePosition: number;
  isPlaying: boolean;
  playbackSpeed: number;

  setFireDetections: (detections: FireDetection[]) => void;
  setFireClusters: (clusters: FireCluster[]) => void;
  setResources: (resources: Resource[]) => void;
  setEvacuationZones: (zones: EvacuationZone[]) => void;
  selectCluster: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setTimelinePosition: (pos: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  deployResource: (resourceId: string, clusterId: string) => void;
  recallResource: (resourceId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  fireDetections: [],
  fireClusters: [],
  resources: [],
  evacuationZones: [],

  selectedClusterId: null,
  panelOpen: false,
  activeTab: 'overview',
  timelinePosition: 1,
  isPlaying: false,
  playbackSpeed: 1,

  setFireDetections: (detections) => set({ fireDetections: detections }),
  setFireClusters: (clusters) => set({ fireClusters: clusters }),
  setResources: (resources) => set({ resources }),
  setEvacuationZones: (zones) => set({ evacuationZones: zones }),
  selectCluster: (id) => set({ selectedClusterId: id, panelOpen: id !== null, activeTab: 'overview' }),
  setPanelOpen: (open) => set({ panelOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTimelinePosition: (pos) => set({ timelinePosition: pos }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  deployResource: (resourceId, clusterId) =>
    set((state) => ({
      resources: state.resources.map((r) =>
        r.id === resourceId ? { ...r, status: 'en_route' as const, assignedClusterId: clusterId } : r
      ),
    })),
  recallResource: (resourceId) =>
    set((state) => ({
      resources: state.resources.map((r) =>
        r.id === resourceId ? { ...r, status: 'available' as const, assignedClusterId: null } : r
      ),
    })),
}));
