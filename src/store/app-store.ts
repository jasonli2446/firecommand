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
  executeAIPlan: () => void;
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
  executeAIPlan: () =>
    set((state) => {
      if (!state.selectedClusterId) return state;
      const clusterId = state.selectedClusterId;
      const cluster = state.fireClusters.find((c) => c.id === clusterId);
      if (!cluster) return state;

      // Deploy resources based on cluster severity
      const deployCount =
        cluster.severity === 'critical' ? 6 :
        cluster.severity === 'high' ? 4 : 2;

      // Prioritize: helicopters/air_tankers for critical, engines/crews for others
      const priorityTypes =
        cluster.severity === 'critical'
          ? ['helicopter', 'air_tanker', 'engine', 'hand_crew', 'water_tender', 'dozer']
          : ['engine', 'hand_crew', 'water_tender', 'helicopter', 'dozer', 'air_tanker'];

      const available = state.resources
        .filter((r) => r.status === 'available')
        .sort((a, b) => {
          const aIdx = priorityTypes.indexOf(a.type);
          const bIdx = priorityTypes.indexOf(b.type);
          return aIdx - bIdx;
        });

      const toDeploy = new Set(
        available.slice(0, deployCount).map((r) => r.id)
      );

      return {
        resources: state.resources.map((r) =>
          toDeploy.has(r.id)
            ? { ...r, status: 'en_route' as const, assignedClusterId: clusterId }
            : r
        ),
      };
    }),
}));
