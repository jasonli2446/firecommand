'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map from 'react-map-gl/mapbox';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer, ArcLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { useAppStore } from '@/store/app-store';
import type { FireDetection, FireCluster } from '@/types/fire';
import type { Resource } from '@/types/resource';
import type { EvacuationZone } from '@/types/evacuation';
import type { PickingInfo } from '@deck.gl/core';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const INITIAL_VIEW_STATE = {
  longitude: -119.5,
  latitude: 37.5,
  zoom: 6,
  pitch: 45,
  bearing: -15,
};

const SEVERITY_COLORS: Record<string, [number, number, number, number]> = {
  critical: [255, 50, 50, 200],
  high: [255, 120, 0, 200],
  moderate: [255, 200, 0, 180],
  low: [255, 255, 100, 140],
};

const STATUS_COLORS: Record<string, [number, number, number, number]> = {
  available: [34, 197, 94, 200],
  deployed: [59, 130, 246, 200],
  en_route: [250, 204, 21, 200],
  maintenance: [107, 114, 128, 150],
};

const RISK_FILL_COLORS: Record<string, [number, number, number, number]> = {
  immediate: [255, 0, 0, 30],
  warning: [255, 165, 0, 20],
  watch: [255, 255, 0, 15],
};

const RESOURCE_LABELS: Record<string, string> = {
  engine: 'E',
  helicopter: 'H',
  hand_crew: 'C',
  air_tanker: 'A',
  dozer: 'D',
  water_tender: 'W',
};

const RISK_LINE_COLORS: Record<string, [number, number, number]> = {
  immediate: [255, 60, 60],
  warning: [255, 165, 0],
  watch: [255, 255, 100],
};

// Default wind direction for spread prediction (degrees, 0=N, from direction)
// 225° = from SW, so fire spreads NE — typical California Santa Ana pattern
const DEFAULT_WIND_DIR = 225;

// Containment calculation — how much each resource type contributes
const CONTAINMENT_PER_TYPE: Record<string, number> = {
  helicopter: 10, air_tanker: 12, engine: 6,
  hand_crew: 5, dozer: 8, water_tender: 4,
};

function getClusterContainment(
  clusterId: string,
  resources: Resource[]
): number {
  const deployed = resources.filter(
    (r) => r.assignedClusterId === clusterId && (r.status === 'deployed' || r.status === 'en_route')
  );
  const total = deployed.reduce((sum, r) => sum + (CONTAINMENT_PER_TYPE[r.type] || 3), 0);
  return Math.min(85, total);
}

// Pre-compute circle polygons and cache them
const circleCache = new globalThis.Map<string, [number, number][]>();
function createCirclePolygon(
  center: [number, number],
  radiusMiles: number,
  numPoints = 32
): [number, number][] {
  const key = `${center[0]},${center[1]},${radiusMiles}`;
  const cached = circleCache.get(key);
  if (cached) return cached;

  const [lng, lat] = center;
  const radiusDeg = radiusMiles / 69;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    points.push([
      lng + (radiusDeg * Math.cos(angle)) / cosLat,
      lat + radiusDeg * Math.sin(angle),
    ]);
  }
  circleCache.set(key, points);
  return points;
}

// Create a wedge polygon for fire spread prediction
const spreadCache = new globalThis.Map<string, [number, number][]>();
function createSpreadWedge(
  center: [number, number],
  windFromDeg: number,
  radiusMiles: number,
  spreadAngleDeg = 60,
  numPoints = 16
): [number, number][] {
  const key = `${center[0]},${center[1]},${windFromDeg},${radiusMiles}`;
  const cached = spreadCache.get(key);
  if (cached) return cached;

  const [lng, lat] = center;
  const radiusDeg = radiusMiles / 69;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  // Wind blows FROM windFromDeg, fire spreads in opposite direction
  const spreadDirRad = ((windFromDeg + 180) * Math.PI) / 180;
  const halfAngle = (spreadAngleDeg * Math.PI) / 360;

  const points: [number, number][] = [[lng, lat]]; // Start at center
  for (let i = 0; i <= numPoints; i++) {
    const angle = spreadDirRad - halfAngle + (i / numPoints) * 2 * halfAngle;
    points.push([
      lng + (radiusDeg * Math.sin(angle)) / cosLat,
      lat + radiusDeg * Math.cos(angle),
    ]);
  }
  points.push([lng, lat]); // Close polygon
  spreadCache.set(key, points);
  return points;
}

// Create a containment arc (partial ring) around a fire cluster
function createContainmentArc(
  center: [number, number],
  radiusMiles: number,
  percentage: number, // 0-100
  thickness = 0.15, // ring thickness as fraction of radius
  numPoints = 48
): [number, number][] {
  if (percentage <= 0) return [];
  const [lng, lat] = center;
  const outerRadius = radiusMiles / 69;
  const innerRadius = outerRadius * (1 - thickness);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const endAngle = (percentage / 100) * Math.PI * 2;

  const points: [number, number][] = [];
  // Outer arc (clockwise from top)
  for (let i = 0; i <= numPoints; i++) {
    const angle = -Math.PI / 2 + (i / numPoints) * endAngle;
    points.push([
      lng + (outerRadius * Math.cos(angle)) / cosLat,
      lat + outerRadius * Math.sin(angle),
    ]);
  }
  // Inner arc (back, counterclockwise)
  for (let i = numPoints; i >= 0; i--) {
    const angle = -Math.PI / 2 + (i / numPoints) * endAngle;
    points.push([
      lng + (innerRadius * Math.cos(angle)) / cosLat,
      lat + innerRadius * Math.sin(angle),
    ]);
  }
  // Close polygon
  points.push(points[0]);
  return points;
}

export function FireMap() {
  const {
    fireDetections,
    fireClusters,
    resources,
    evacuationZones,
    selectCluster,
    selectedClusterId,
    timelinePosition,
  } = useAppStore();

  // Controlled view state for fly-to animations
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Fly to selected cluster
  useEffect(() => {
    if (!selectedClusterId) return;
    const cluster = fireClusters.find((c) => c.id === selectedClusterId);
    if (!cluster) return;

    setViewState((prev) => ({
      ...prev,
      longitude: cluster.centroid[0],
      latitude: cluster.centroid[1],
      zoom: Math.max(prev.zoom, 8),
      transitionDuration: 1500,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, [selectedClusterId, fireClusters]);

  // Use a ref for pulse animation — avoids re-rendering the entire component 60fps
  const pulseRef = useRef(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - start) / 1000;
      pulseRef.current = 1 + 0.15 * Math.sin(elapsed * 2);
      // Only redraw the deck overlay, not re-render React
      if (deckRef.current?.redraw) {
        deckRef.current.redraw('pulse');
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Pre-compute time range once when data changes
  const timeRange = useMemo(() => {
    if (!fireDetections.length) return { min: 0, max: 0 };
    // Data is pre-sorted by timestamp in useFireData
    const timestamps = fireDetections.map(d =>
      (d as FireDetection & { _timestamp?: number })._timestamp ?? new Date(d.acquiredAt).getTime()
    );
    return { min: timestamps[0], max: timestamps[timestamps.length - 1] };
  }, [fireDetections]);

  // Pre-compute sorted timestamps for fast binary search filtering
  const sortedTimestamps = useMemo(() => {
    return fireDetections.map(d =>
      (d as FireDetection & { _timestamp?: number })._timestamp ?? new Date(d.acquiredAt).getTime()
    );
  }, [fireDetections]);

  const filteredDetections = useMemo(() => {
    if (!fireDetections.length || timeRange.min === 0) return [];
    const cutoff = timeRange.min + (timeRange.max - timeRange.min) * timelinePosition;

    // Binary search for cutoff index (data is sorted)
    let lo = 0, hi = sortedTimestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedTimestamps[mid] <= cutoff) lo = mid + 1;
      else hi = mid;
    }
    return fireDetections.slice(0, lo);
  }, [fireDetections, timelinePosition, timeRange, sortedTimestamps]);

  const handleClusterClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        selectCluster((info.object as FireCluster).id);
      }
    },
    [selectCluster]
  );

  const layers = useMemo(() => [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (HeatmapLayer as any)({
      id: 'fire-heatmap',
      data: filteredDetections,
      getPosition: (d: FireDetection) => [d.longitude, d.latitude],
      getWeight: (d: FireDetection) => d.frp || 1,
      colorRange: [
        [255, 255, 178],
        [254, 204, 92],
        [253, 141, 60],
        [240, 59, 32],
        [189, 0, 38],
      ] as [number, number, number][],
      radiusPixels: 60,
      intensity: 1.5,
      threshold: 0.1,
      aggregation: 'SUM' as const,
    }),

    // Fire spread prediction wedges (critical/high severity only)
    // Scale with timeline position so fires visually "grow" during scrub
    new PolygonLayer<FireCluster>({
      id: 'fire-spread-prediction',
      data: fireClusters.filter(
        (c) => c.severity === 'critical' || c.severity === 'high'
      ),
      getPolygon: (d: FireCluster) => {
        const baseRadius = d.severity === 'critical'
          ? Math.min(d.totalFRP * 0.02 + 5, 20)
          : Math.min(d.totalFRP * 0.015 + 3, 12);
        // Scale from 20% to 100% based on timeline position
        const scale = 0.2 + 0.8 * Math.pow(timelinePosition, 0.7);
        return createSpreadWedge(d.centroid, DEFAULT_WIND_DIR, baseRadius * scale);
      },
      getFillColor: (d: FireCluster) =>
        d.severity === 'critical'
          ? [255, 60, 30, 18] as [number, number, number, number]
          : [255, 140, 0, 12] as [number, number, number, number],
      getLineColor: (d: FireCluster) =>
        d.severity === 'critical'
          ? [255, 60, 30, 60] as [number, number, number, number]
          : [255, 140, 0, 40] as [number, number, number, number],
      lineWidthMinPixels: 1,
      filled: true,
      stroked: true,
      updateTriggers: {
        getPolygon: timelinePosition,
      },
    }),

    // Threat pulse rings for critical fires — radar-style expanding rings
    new ScatterplotLayer<FireCluster>({
      id: 'threat-pulse-ring-1',
      data: fireClusters.filter((c) => c.severity === 'critical'),
      getPosition: (d: FireCluster) => d.centroid,
      getRadius: (d: FireCluster) => {
        const base = Math.sqrt(d.totalFRP + 1) * 150;
        const phase = (Date.now() % 3000) / 3000;
        return base * (1 + phase * 2);
      },
      getFillColor: [0, 0, 0, 0] as [number, number, number, number],
      stroked: true,
      getLineColor: () => {
        const phase = (Date.now() % 3000) / 3000;
        const alpha = Math.round(120 * (1 - phase));
        return [255, 50, 50, alpha] as [number, number, number, number];
      },
      lineWidthMinPixels: 2,
      radiusMinPixels: 8,
      radiusMaxPixels: 120,
      updateTriggers: {
        getRadius: Date.now(),
        getLineColor: Date.now(),
      },
    }),

    // Second pulse ring (offset phase)
    new ScatterplotLayer<FireCluster>({
      id: 'threat-pulse-ring-2',
      data: fireClusters.filter((c) => c.severity === 'critical'),
      getPosition: (d: FireCluster) => d.centroid,
      getRadius: (d: FireCluster) => {
        const base = Math.sqrt(d.totalFRP + 1) * 150;
        const phase = ((Date.now() + 1500) % 3000) / 3000;
        return base * (1 + phase * 2);
      },
      getFillColor: [0, 0, 0, 0] as [number, number, number, number],
      stroked: true,
      getLineColor: () => {
        const phase = ((Date.now() + 1500) % 3000) / 3000;
        const alpha = Math.round(80 * (1 - phase));
        return [255, 50, 50, alpha] as [number, number, number, number];
      },
      lineWidthMinPixels: 1,
      radiusMinPixels: 8,
      radiusMaxPixels: 120,
      updateTriggers: {
        getRadius: Date.now(),
        getLineColor: Date.now(),
      },
    }),

    new PolygonLayer<EvacuationZone>({
      id: 'evacuation-zones',
      data: evacuationZones,
      getPolygon: (d: EvacuationZone) =>
        createCirclePolygon(d.center, d.radiusMiles),
      getFillColor: (d: EvacuationZone) =>
        RISK_FILL_COLORS[d.riskLevel] || [255, 255, 255, 10],
      getLineColor: (d: EvacuationZone) =>
        RISK_LINE_COLORS[d.riskLevel] || [255, 255, 255],
      lineWidthMinPixels: 2,
      filled: true,
      stroked: true,
    }),

    new ScatterplotLayer<FireCluster>({
      id: 'fire-clusters',
      data: fireClusters,
      getPosition: (d: FireCluster) => d.centroid,
      getRadius: (d: FireCluster) => Math.sqrt(d.totalFRP + 1) * 100,
      getFillColor: (d: FireCluster) =>
        SEVERITY_COLORS[d.severity] || [255, 255, 255, 100],
      radiusMinPixels: 6,
      radiusMaxPixels: 40,
      radiusScale: pulseRef.current,
      stroked: true,
      getLineColor: [255, 255, 255, 80] as [number, number, number, number],
      lineWidthMinPixels: 1,
      pickable: true,
      onClick: handleClusterClick,
      updateTriggers: {
        radiusScale: Date.now(), // Force update on each draw call
      },
    }),

    // Selection ring around selected cluster
    new ScatterplotLayer<FireCluster>({
      id: 'selected-cluster-ring',
      data: fireClusters.filter((c) => c.id === selectedClusterId),
      getPosition: (d: FireCluster) => d.centroid,
      getRadius: (d: FireCluster) => Math.sqrt(d.totalFRP + 1) * 140,
      getFillColor: [0, 0, 0, 0] as [number, number, number, number],
      radiusMinPixels: 12,
      radiusMaxPixels: 55,
      radiusScale: pulseRef.current,
      stroked: true,
      getLineColor: [255, 255, 255, 200] as [number, number, number, number],
      lineWidthMinPixels: 2,
      updateTriggers: {
        radiusScale: Date.now(),
        data: selectedClusterId,
      },
    }),

    // Containment arc rings around clusters with deployed resources
    new PolygonLayer<FireCluster>({
      id: 'containment-arcs',
      data: fireClusters.filter((c) => getClusterContainment(c.id, resources) > 0),
      getPolygon: (d: FireCluster) => {
        const pct = getClusterContainment(d.id, resources);
        const radiusMiles = Math.sqrt(d.totalFRP + 1) * 0.04 + 1.5;
        return createContainmentArc(d.centroid, radiusMiles, pct);
      },
      getFillColor: (d: FireCluster) => {
        const pct = getClusterContainment(d.id, resources);
        if (pct >= 60) return [34, 197, 94, 160] as [number, number, number, number];
        if (pct >= 40) return [250, 204, 21, 140] as [number, number, number, number];
        if (pct >= 20) return [255, 165, 0, 130] as [number, number, number, number];
        return [255, 50, 50, 120] as [number, number, number, number];
      },
      getLineColor: [255, 255, 255, 40] as [number, number, number, number],
      lineWidthMinPixels: 1,
      filled: true,
      stroked: true,
      updateTriggers: {
        getPolygon: [resources.filter((r) => r.status === 'deployed' || r.status === 'en_route').length],
        getFillColor: [resources.filter((r) => r.status === 'deployed' || r.status === 'en_route').length],
      },
    }),

    new ScatterplotLayer<Resource>({
      id: 'resources',
      data: resources,
      getPosition: (d: Resource) => [d.longitude, d.latitude],
      getFillColor: (d: Resource) =>
        STATUS_COLORS[d.status] || [255, 255, 255, 100],
      radiusMinPixels: 6,
      radiusMaxPixels: 10,
      stroked: true,
      getLineColor: [255, 255, 255, 120] as [number, number, number, number],
      lineWidthMinPixels: 1,
      pickable: true,
    }),

    // Resource type labels
    new TextLayer<Resource>({
      id: 'resource-labels',
      data: resources,
      getPosition: (d: Resource) => [d.longitude, d.latitude],
      getText: (d: Resource) => RESOURCE_LABELS[d.type] || '?',
      getSize: 10,
      getColor: [255, 255, 255, 220] as [number, number, number, number],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      billboard: true,
      sizeScale: 1,
      sizeMinPixels: 8,
      sizeMaxPixels: 12,
    }),

    // Deployment arcs from resources to assigned fire clusters
    new ArcLayer<Resource>({
      id: 'deployment-arcs',
      data: resources.filter(
        (r) =>
          (r.status === 'deployed' || r.status === 'en_route') &&
          r.assignedClusterId
      ),
      getSourcePosition: (d: Resource) => [d.longitude, d.latitude],
      getTargetPosition: (d: Resource) => {
        const cluster = fireClusters.find((c) => c.id === d.assignedClusterId);
        return cluster ? cluster.centroid : [d.longitude, d.latitude];
      },
      getSourceColor: (d: Resource) =>
        d.status === 'deployed'
          ? [59, 130, 246, 180] as [number, number, number, number]
          : [250, 204, 21, 180] as [number, number, number, number],
      getTargetColor: [255, 100, 50, 180] as [number, number, number, number],
      getWidth: 2,
      getHeight: 0.3,
      greatCircle: false,
    }),

    // Animated moving dots for en_route resources
    new ScatterplotLayer<Resource>({
      id: 'moving-resources',
      data: resources.filter((r) => r.status === 'en_route' && r.assignedClusterId && r.deployedAt),
      getPosition: (d: Resource) => {
        const cluster = fireClusters.find((c) => c.id === d.assignedClusterId);
        if (!cluster || !d.deployedAt) return [d.longitude, d.latitude];
        const TRAVEL_DURATION = 8000; // 8 seconds travel animation
        const elapsed = Date.now() - d.deployedAt;
        const t = Math.min(1, elapsed / TRAVEL_DURATION);
        // Ease-in-out cubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        return [
          d.longitude + (cluster.centroid[0] - d.longitude) * ease,
          d.latitude + (cluster.centroid[1] - d.latitude) * ease,
        ];
      },
      getFillColor: [250, 204, 21, 255] as [number, number, number, number],
      getRadius: 800,
      radiusMinPixels: 4,
      radiusMaxPixels: 8,
      stroked: true,
      getLineColor: [255, 255, 255, 200] as [number, number, number, number],
      lineWidthMinPixels: 1,
      updateTriggers: {
        getPosition: Date.now(),
      },
    }),
  ], [filteredDetections, fireClusters, resources, evacuationZones, selectedClusterId, handleClusterClick, timelinePosition]);

  const getTooltip = useCallback((info: PickingInfo) => {
    if (!info.object) return null;

    if (info.layer?.id === 'fire-clusters') {
      const cluster = info.object as FireCluster;
      return {
        html: `<div style="font-family: system-ui; padding: 4px 8px;">
          <strong>${cluster.name}</strong><br/>
          Severity: ${cluster.severity.toUpperCase()}<br/>
          FRP: ${cluster.totalFRP} | Points: ${cluster.points.length}<br/>
          ~${cluster.estimatedAcres.toLocaleString()} acres
        </div>`,
        style: {
          backgroundColor: 'rgba(10,10,15,0.9)',
          color: '#e2e8f0',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '13px',
        },
      };
    }

    if (info.layer?.id === 'resources') {
      const resource = info.object as Resource;
      return {
        html: `<div style="font-family: system-ui; padding: 4px 8px;">
          <strong>${resource.name}</strong><br/>
          Type: ${resource.type.replace('_', ' ')}<br/>
          Status: ${resource.status}<br/>
          Base: ${resource.homeBase}
        </div>`,
        style: {
          backgroundColor: 'rgba(10,10,15,0.9)',
          color: '#e2e8f0',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '13px',
        },
      };
    }

    return null;
  }, []);

  return (
    <div className="absolute inset-0">
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
        />
      </DeckGL>
    </div>
  );
}
