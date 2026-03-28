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
  showHelp: boolean;
  selectedWindDirection: number | null;
  selectedWindSpeed: number | null;
  tourActive: boolean;
  tourStep: number;
  triggerAIAnalyze: (() => void) | null;
  pendingFlyTo: [number, number] | null;
  mapStyle: 'dark' | 'satellite';
  demoActive: boolean;

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
  setShowHelp: (show: boolean) => void;
  setSelectedWind: (direction: number | null, speed: number | null) => void;
  setTourState: (active: boolean, step: number) => void;
  setTriggerAIAnalyze: (fn: (() => void) | null) => void;
  setPendingFlyTo: (coords: [number, number] | null) => void;
  setMapStyle: (style: 'dark' | 'satellite') => void;
  setDemoActive: (active: boolean) => void;
  deployResource: (resourceId: string, clusterId: string) => void;
  recallResource: (resourceId: string) => void;
  executeAIPlan: (recommendationText?: string) => void;
  addLogEntry: (type: ActionLogEntry['type'], message: string) => void;
}

/**
 * Parse AI recommendation markdown to extract resource type → quantity mappings.
 * Matches patterns like "3 helicopters", "Deploy 2 engines", "1x air tanker", etc.
 */
function parseAIRecommendation(text: string): Record<string, number> {
  const result: Record<string, number> = {};

  // Map of aliases → canonical resource type
  const typeAliases: [RegExp, string][] = [
    [/helicopters?|helis?|rotary.?wing/gi, 'helicopter'],
    [/air.?tankers?|airtankers?/gi, 'air_tanker'],
    [/engines?|fire.?engines?|type.?\d+.?engines?/gi, 'engine'],
    [/hand.?crews?|hotshots?|hand crews?/gi, 'hand_crew'],
    [/dozers?|bulldozers?/gi, 'dozer'],
    [/water.?tenders?/gi, 'water_tender'],
  ];

  // Pattern 1: "N resource_type" e.g. "3 helicopters", "Deploy 2 engines"
  // Pattern 2: "Nx resource_type" e.g. "2x air tankers"
  // Pattern 3: resource_type mentioned without number → defaults to 1
  for (const [aliasPattern, canonicalType] of typeAliases) {
    // Reset lastIndex for global patterns
    aliasPattern.lastIndex = 0;

    // Find all mentions of this resource type
    const mentions = text.match(aliasPattern);
    if (!mentions) continue;

    let maxCount = 0;

    for (const mention of mentions) {
      // Look for a number before the mention in a window of ~30 chars
      const idx = text.indexOf(mention);
      const before = text.slice(Math.max(0, idx - 30), idx);

      // Check for "N " or "Nx" patterns before the resource name
      const numberMatch = before.match(/(\d+)\s*x?\s*$/i);
      if (numberMatch) {
        maxCount = Math.max(maxCount, parseInt(numberMatch[1], 10));
      } else {
        // No explicit number — count as 1 if not already counted higher
        maxCount = Math.max(maxCount, 1);
      }
    }

    if (maxCount > 0) {
      result[canonicalType] = maxCount;
    }
  }

  return result;
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
  showHelp: false,
  selectedWindDirection: null,
  selectedWindSpeed: null,
  tourActive: false,
  tourStep: -1,
  triggerAIAnalyze: null,
  pendingFlyTo: null,
  mapStyle: 'dark',
  demoActive: false,

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
  setShowHelp: (show) => set({ showHelp: show }),
  setSelectedWind: (direction, speed) => set({ selectedWindDirection: direction, selectedWindSpeed: speed }),
  setTourState: (active, step) => set({ tourActive: active, tourStep: step }),
  setTriggerAIAnalyze: (fn) => set({ triggerAIAnalyze: fn }),
  setPendingFlyTo: (coords) => set({ pendingFlyTo: coords }),
  setMapStyle: (style) => set({ mapStyle: style }),
  setDemoActive: (active) => set({ demoActive: active }),
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
  executeAIPlan: (recommendationText?: string) =>
    set((state) => {
      if (!state.selectedClusterId) return state;
      const clusterId = state.selectedClusterId;
      const cluster = state.fireClusters.find((c) => c.id === clusterId);
      if (!cluster) return state;

      // Parse the AI recommendation to extract what resources it actually suggested
      const parsed = recommendationText ? parseAIRecommendation(recommendationText) : null;
      const hasValidParse = parsed && Object.keys(parsed).length > 0;

      // Use parsed AI quantities, or fall back to severity-based defaults
      const typeQuotas: Record<string, number> = hasValidParse
        ? parsed
        : cluster.severity === 'critical'
          ? { helicopter: 2, air_tanker: 1, engine: 3, hand_crew: 2, dozer: 1, water_tender: 1 }
          : cluster.severity === 'high'
          ? { helicopter: 1, air_tanker: 1, engine: 2, hand_crew: 1, dozer: 1, water_tender: 1 }
          : { helicopter: 1, engine: 2, hand_crew: 1, water_tender: 1 };

      const available = state.resources.filter((r) => r.status === 'available');
      const toDeployList: typeof available = [];
      const typeCounts: Record<string, number> = {};

      for (const type of Object.keys(typeQuotas)) {
        const quota = typeQuotas[type];
        const ofType = available.filter(
          (r) => r.type === type && !toDeployList.includes(r)
        );
        const take = ofType.slice(0, quota);
        toDeployList.push(...take);
        if (take.length > 0) typeCounts[type] = take.length;
      }
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
