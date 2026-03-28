import { create } from 'zustand';
import { FireDetection, FireCluster } from '@/types/fire';
import { Resource } from '@/types/resource';
import { EvacuationZone } from '@/types/evacuation';
import { notify } from '@/components/Notifications';

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  type: 'deploy' | 'recall' | 'ai_plan' | 'system';
  message: string;
}

interface AppState {
  fireDetections: FireDetection[];
  fireClusters: FireCluster[];
  resources: Resource[];
  evacuationZones: EvacuationZone[];
  actionLog: ActionLogEntry[];

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
  addLogEntry: (type: ActionLogEntry['type'], message: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  fireDetections: [],
  fireClusters: [],
  resources: [],
  evacuationZones: [],
  actionLog: [],

  selectedClusterId: null,
  panelOpen: true,
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
  addLogEntry: (type, message) =>
    set((state) => ({
      actionLog: [
        { id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now(), type, message },
        ...state.actionLog,
      ].slice(0, 50), // Keep last 50 entries
    })),
  deployResource: (resourceId, clusterId) =>
    set((state) => {
      const resource = state.resources.find((r) => r.id === resourceId);
      const cluster = state.fireClusters.find((c) => c.id === clusterId);
      if (resource && cluster) {
        notify('success', `${resource.name} deployed to ${cluster.name}`);
      }
      return {
        resources: state.resources.map((r) =>
          r.id === resourceId ? { ...r, status: 'en_route' as const, assignedClusterId: clusterId, deployedAt: Date.now() } : r
        ),
        actionLog: [
          { id: `log_${Date.now()}`, timestamp: Date.now(), type: 'deploy' as const, message: `${resource?.name || resourceId} → ${cluster?.name || clusterId}` },
          ...state.actionLog,
        ].slice(0, 50),
      };
    }),
  recallResource: (resourceId) =>
    set((state) => {
      const resource = state.resources.find((r) => r.id === resourceId);
      if (resource) {
        notify('info', `${resource.name} recalled to base`);
      }
      return {
        resources: state.resources.map((r) =>
          r.id === resourceId ? { ...r, status: 'available' as const, assignedClusterId: null, deployedAt: undefined } : r
        ),
        actionLog: [
          { id: `log_${Date.now()}`, timestamp: Date.now(), type: 'recall' as const, message: `${resource?.name || resourceId} recalled to base` },
          ...state.actionLog,
        ].slice(0, 50),
      };
    }),
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

      const toDeployList = available.slice(0, deployCount);
      const toDeploy = new Set(toDeployList.map((r) => r.id));

      if (toDeployList.length > 0) {
        notify(
          'success',
          `Executing AI plan: ${toDeployList.length} resources deploying to ${cluster.name}`
        );
      }

      const logEntries: ActionLogEntry[] = [
        { id: `log_${Date.now()}_plan`, timestamp: Date.now(), type: 'ai_plan', message: `AIP plan executed for ${cluster.name}: ${toDeployList.length} resources` },
        ...toDeployList.map((r, i) => ({
          id: `log_${Date.now()}_${i}`,
          timestamp: Date.now() + i,
          type: 'deploy' as const,
          message: `${r.name} (${r.type.replace('_', ' ')}) → ${cluster.name}`,
        })),
      ];

      return {
        resources: state.resources.map((r) =>
          toDeploy.has(r.id)
            ? { ...r, status: 'en_route' as const, assignedClusterId: clusterId, deployedAt: Date.now() }
            : r
        ),
        actionLog: [...logEntries, ...state.actionLog].slice(0, 50),
      };
    }),
}));
