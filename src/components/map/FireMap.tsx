'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map from 'react-map-gl/mapbox';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer, ArcLayer, TextLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { FlyToInterpolator } from '@deck.gl/core';
import { luma } from '@luma.gl/core';
import { webgl2Adapter } from '@luma.gl/webgl';
import { useAppStore } from '@/store/app-store';

// Force WebGL — prevents luma.gl from crashing on WebGPU detection
if (typeof window !== 'undefined') {
  luma.registerAdapters([webgl2Adapter]);
}
import type { FireDetection, FireCluster } from '@/types/fire';
import type { Resource } from '@/types/resource';
import type { EvacuationZone } from '@/types/evacuation';
import type { PickingInfo } from '@deck.gl/core';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Start zoomed out, then animate in
const INITIAL_VIEW_STATE = {
  longitude: -119.5,
  latitude: 37.5,
  zoom: 5.5,
  pitch: 30,
  bearing: -30,
  minZoom: 5,
  maxZoom: 15,
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

// Per-type accent colors for resource outline rings
const RESOURCE_TYPE_COLORS: Record<string, [number, number, number, number]> = {
  engine: [255, 100, 100, 200],      // red
  helicopter: [100, 180, 255, 200],   // blue
  hand_crew: [255, 200, 50, 200],     // gold
  air_tanker: [180, 130, 255, 200],   // purple
  dozer: [255, 160, 50, 200],         // orange
  water_tender: [80, 200, 220, 200],  // cyan
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

// Create a small wind-direction arrow near a fire cluster
function createWindArrow(
  center: [number, number],
  windFromDeg: number,
  sizeMiles = 2.5
): [number, number][] {
  const [lng, lat] = center;
  const s = sizeMiles / 69;
  const cosLat = Math.cos((lat * Math.PI) / 180);

  // Fire spreads in opposite direction from wind source
  const dir = ((windFromDeg + 180) * Math.PI) / 180;
  const perp = dir + Math.PI / 2;

  // Offset arrow from cluster center (so it sits beyond the fire dot)
  const offset = s * 1.4;
  const cx = lng + (offset * Math.sin(dir)) / cosLat;
  const cy = lat + offset * Math.cos(dir);

  // Kite/arrow shape: pointy tip forward, narrow tail
  const tipDist = s * 0.5;
  const tailDist = s * 0.5;
  const wingDist = s * 0.18;
  const notchDist = s * 0.15; // notch in tail for classic arrow look

  return [
    // Tip
    [cx + (tipDist * Math.sin(dir)) / cosLat, cy + tipDist * Math.cos(dir)],
    // Left wing
    [cx + (wingDist * Math.sin(perp)) / cosLat, cy + wingDist * Math.cos(perp)],
    // Left inner notch
    [cx - (notchDist * Math.sin(dir)) / cosLat + (wingDist * 0.3 * Math.sin(perp)) / cosLat,
     cy - notchDist * Math.cos(dir) + wingDist * 0.3 * Math.cos(perp)],
    // Tail center
    [cx - (tailDist * Math.sin(dir)) / cosLat, cy - tailDist * Math.cos(dir)],
    // Right inner notch
    [cx - (notchDist * Math.sin(dir)) / cosLat - (wingDist * 0.3 * Math.sin(perp)) / cosLat,
     cy - notchDist * Math.cos(dir) - wingDist * 0.3 * Math.cos(perp)],
    // Right wing
    [cx - (wingDist * Math.sin(perp)) / cosLat, cy - wingDist * Math.cos(perp)],
    // Close
    [cx + (tipDist * Math.sin(dir)) / cosLat, cy + tipDist * Math.cos(dir)],
  ];
}

export function FireMap() {
  const {
    fireDetections,
    fireClusters,
    resources,
    evacuationZones,
    selectCluster,
    selectedClusterId,
    selectedWindDirection,
    selectedWindSpeed,
    timelinePosition,
    tourActive,
    tourStep,
  } = useAppStore();

  // Controlled view state for fly-to animations
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);

  // Opening cinematic sweep when data first loads
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (hasAnimated.current || fireClusters.length === 0) return;
    hasAnimated.current = true;

    // Delay slightly to let the map render first
    const timer = setTimeout(() => {
      setViewState((prev) => ({
        ...prev,
        zoom: 6.2,
        pitch: 45,
        bearing: -15,
        transitionDuration: 3500,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [fireClusters.length]);

  // Fly to selected cluster — cinematic bearing rotation during tour
  useEffect(() => {
    if (!selectedClusterId) {
      // When deselecting (e.g., tour ends), fly back to overview
      if (tourActive === false && tourStep === -1) {
        setViewState((prev) => ({
          ...prev,
          longitude: -119.5,
          latitude: 37.5,
          zoom: 6.2,
          pitch: 45,
          bearing: -15,
          transitionDuration: 3000,
          transitionInterpolator: new FlyToInterpolator(),
        }));
      }
      return;
    }
    const cluster = fireClusters.find((c) => c.id === selectedClusterId);
    if (!cluster) return;

    // Cinematic bearing rotation during auto-tour
    const bearing = tourActive ? -30 + tourStep * 12 : -15;
    const zoom = tourActive ? 9.5 : Math.max(viewState.zoom, 8);
    const pitch = tourActive ? 55 : 45;

    setViewState((prev) => ({
      ...prev,
      longitude: cluster.centroid[0],
      latitude: cluster.centroid[1],
      zoom,
      pitch,
      bearing,
      transitionDuration: tourActive ? 2500 : 1500,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, [selectedClusterId, fireClusters, tourActive, tourStep]);

  // Animation refs — avoids re-rendering React at 60fps
  const pulseRef = useRef(1);
  const animTickRef = useRef(0); // shared tick counter for updateTriggers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deckRef = useRef<any>(null);

  useEffect(() => {
    let frame: number;
    const start = Date.now();
    let lastDraw = 0;
    const FRAME_INTERVAL = 33; // ~30fps instead of 60fps
    const animate = () => {
      const now = Date.now();
      if (now - lastDraw >= FRAME_INTERVAL) {
        lastDraw = now;
        const elapsed = (now - start) / 1000;
        pulseRef.current = 1 + 0.15 * Math.sin(elapsed * 2);
        animTickRef.current++;
        if (deckRef.current?.redraw) {
          deckRef.current.redraw('pulse');
        }
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

  // Pre-compute containment for all clusters — avoids O(clusters*resources) per layer per frame
  const containmentMap = useMemo(() => {
    const map = new globalThis.Map<string, number>();
    for (const c of fireClusters) {
      map.set(c.id, getClusterContainment(c.id, resources));
    }
    return map;
  }, [fireClusters, resources]);

  // Cache deployed count to avoid repeated .filter() in updateTriggers
  const deployedCount = useMemo(
    () => resources.filter((r) => r.status === 'deployed' || r.status === 'en_route').length,
    [resources]
  );

  const handleClusterClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        const cluster = info.object as FireCluster;
        selectCluster(cluster.id);
        setViewState((prev) => ({
          ...prev,
          longitude: cluster.centroid[0],
          latitude: cluster.centroid[1],
          zoom: 9,
          pitch: 50,
          bearing: prev.bearing,
          transitionDuration: 1500,
          transitionInterpolator: new FlyToInterpolator(),
        }));
      }
    },
    [selectCluster]
  );

  // Use real wind direction for selected cluster, default for others
  const getWindDir = useCallback(
    (clusterId: string) =>
      clusterId === selectedClusterId && selectedWindDirection !== null
        ? selectedWindDirection
        : DEFAULT_WIND_DIR,
    [selectedClusterId, selectedWindDirection]
  );

  const layers = useMemo(() => [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (HeatmapLayer as any)({
      id: 'fire-heatmap',
      data: filteredDetections,
      getPosition: (d: FireDetection) => [d.longitude, d.latitude],
      getWeight: (d: FireDetection) => d.frp || 1,
      colorRange: [
        [255, 255, 150],
        [255, 200, 60],
        [255, 130, 30],
        [240, 50, 20],
        [180, 0, 30],
        [120, 0, 50],
      ] as [number, number, number][],
      radiusPixels: 65,
      intensity: 1.8,
      threshold: 0.08,
      aggregation: 'SUM' as const,
    }),

    // Fire spread prediction wedges (non-low severity)
    // Scale with timeline position so fires visually "grow" during scrub
    new PolygonLayer<FireCluster>({
      id: 'fire-spread-prediction',
      data: fireClusters.filter(
        (c) => c.severity !== 'low'
      ),
      getPolygon: (d: FireCluster) => {
        const baseRadius = d.severity === 'critical'
          ? Math.min(d.totalFRP * 0.02 + 5, 20)
          : d.severity === 'high'
          ? Math.min(d.totalFRP * 0.015 + 3, 12)
          : Math.min(d.totalFRP * 0.01 + 2, 8);
        // Scale from 20% to 100% based on timeline position
        const scale = 0.2 + 0.8 * Math.pow(timelinePosition, 0.7);
        return createSpreadWedge(d.centroid, getWindDir(d.id), baseRadius * scale);
      },
      getFillColor: (d: FireCluster) =>
        d.severity === 'critical'
          ? [255, 60, 30, 18] as [number, number, number, number]
          : d.severity === 'high'
          ? [255, 140, 0, 12] as [number, number, number, number]
          : [255, 180, 0, 8] as [number, number, number, number],
      getLineColor: (d: FireCluster) =>
        d.severity === 'critical'
          ? [255, 60, 30, 60] as [number, number, number, number]
          : d.severity === 'high'
          ? [255, 140, 0, 40] as [number, number, number, number]
          : [255, 180, 0, 25] as [number, number, number, number],
      lineWidthMinPixels: 1,
      filled: true,
      stroked: true,
      updateTriggers: {
        getPolygon: [timelinePosition, selectedClusterId, selectedWindDirection],
      },
    }),

    // Wind direction arrows at fires with elevated severity
    new PolygonLayer<FireCluster>({
      id: 'wind-arrows',
      data: fireClusters.filter(
        (c) => c.severity !== 'low'
      ),
      getPolygon: (d: FireCluster) =>
        createWindArrow(d.centroid, getWindDir(d.id), Math.min(d.totalFRP * 0.01 + 2, 5)),
      getFillColor: [135, 206, 250, 140] as [number, number, number, number],
      getLineColor: [135, 206, 250, 200] as [number, number, number, number],
      lineWidthMinPixels: 1,
      filled: true,
      stroked: true,
      updateTriggers: {
        getPolygon: [selectedClusterId, selectedWindDirection],
      },
    }),

    // Wind direction labels
    new TextLayer<FireCluster>({
      id: 'wind-labels',
      data: fireClusters.filter(
        (c) => c.severity !== 'low'
      ),
      getPosition: (d: FireCluster) => {
        const s = Math.min(d.totalFRP * 0.01 + 2, 5) / 69;
        const cosLat = Math.cos((d.centroid[1] * Math.PI) / 180);
        const windDir = getWindDir(d.id);
        const dir = ((windDir + 180) * Math.PI) / 180;
        const offset = s * 2.2;
        return [
          d.centroid[0] + (offset * Math.sin(dir)) / cosLat,
          d.centroid[1] + offset * Math.cos(dir),
        ];
      },
      getText: (d: FireCluster) => {
        const windDir = getWindDir(d.id);
        if (d.id === selectedClusterId && selectedWindSpeed !== null) {
          return `${selectedWindSpeed} mph`;
        }
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return dirs[Math.round(((windDir + 180) % 360) / 45) % 8];
      },
      getSize: 9,
      getColor: [135, 206, 250, 180] as [number, number, number, number],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      billboard: true,
      sizeMinPixels: 8,
      sizeMaxPixels: 11,
      fontSettings: { sdf: true },
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 200] as [number, number, number, number],
      updateTriggers: {
        getPosition: [selectedClusterId, selectedWindDirection],
        getText: [selectedClusterId, selectedWindSpeed, selectedWindDirection],
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
        getRadius: animTickRef.current,
        getLineColor: animTickRef.current,
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
        getRadius: animTickRef.current,
        getLineColor: animTickRef.current,
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

    // Evacuation zone labels
    new TextLayer<EvacuationZone>({
      id: 'evacuation-labels',
      data: evacuationZones,
      getPosition: (d: EvacuationZone) => d.center,
      getText: (d: EvacuationZone) => `EVAC ${d.riskLevel.toUpperCase()}`,
      getSize: 10,
      getColor: (d: EvacuationZone) => {
        const colors: Record<string, [number, number, number, number]> = {
          immediate: [255, 80, 80, 160],
          warning: [255, 165, 0, 140],
          watch: [255, 255, 100, 120],
        };
        return colors[d.riskLevel] || [255, 255, 255, 100];
      },
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      billboard: true,
      sizeMinPixels: 8,
      sizeMaxPixels: 11,
      fontSettings: { sdf: true },
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 180] as [number, number, number, number],
    }),

    // Outer glow behind fire clusters — bloom effect
    new ScatterplotLayer<FireCluster>({
      id: 'fire-cluster-glow',
      data: fireClusters.filter((c) => c.severity !== 'low'),
      getPosition: (d: FireCluster) => d.centroid,
      getRadius: (d: FireCluster) => Math.sqrt(d.totalFRP + 1) * 250,
      getFillColor: (d: FireCluster) => {
        const base = SEVERITY_COLORS[d.severity] || [255, 255, 255, 100];
        return [base[0], base[1], base[2], 25] as [number, number, number, number];
      },
      radiusMinPixels: 15,
      radiusMaxPixels: 80,
      radiusScale: pulseRef.current,
      stroked: false,
      updateTriggers: {
        radiusScale: animTickRef.current,
      },
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
        radiusScale: animTickRef.current,
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
        radiusScale: animTickRef.current,
        data: selectedClusterId,
      },
    }),

    // Containment arc rings around clusters with deployed resources
    new PolygonLayer<FireCluster>({
      id: 'containment-arcs',
      data: fireClusters.filter((c) => (containmentMap.get(c.id) || 0) > 0),
      getPolygon: (d: FireCluster) => {
        const pct = containmentMap.get(d.id) || 0;
        const radiusMiles = Math.sqrt(d.totalFRP + 1) * 0.04 + 1.5;
        return createContainmentArc(d.centroid, radiusMiles, pct);
      },
      getFillColor: (d: FireCluster) => {
        const pct = containmentMap.get(d.id) || 0;
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
        getPolygon: deployedCount,
        getFillColor: deployedCount,
      },
    }),

    // Fire cluster name labels
    new TextLayer<FireCluster>({
      id: 'cluster-labels',
      data: fireClusters,
      getPosition: (d: FireCluster) => d.centroid,
      getText: (d: FireCluster) => {
        const pct = containmentMap.get(d.id) || 0;
        const assignedCount = resources.filter(
          (r) => r.assignedClusterId === d.id && (r.status === 'deployed' || r.status === 'en_route')
        ).length;
        let label = d.name;
        if (pct > 0) label += `  ${pct}%`;
        if (assignedCount > 0) label += `  [${assignedCount}]`;
        return label;
      },
      getSize: 12,
      getColor: (d: FireCluster) => {
        const pct = containmentMap.get(d.id) || 0;
        if (pct >= 60) return [34, 197, 94, 255] as [number, number, number, number];
        if (pct >= 40) return [250, 204, 21, 255] as [number, number, number, number];
        if (pct > 0) return [255, 165, 0, 255] as [number, number, number, number];
        return [255, 255, 255, 200] as [number, number, number, number];
      },
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'top' as const,
      getPixelOffset: [0, 14] as [number, number],
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      billboard: true,
      sizeMinPixels: 10,
      sizeMaxPixels: 14,
      fontSettings: { sdf: true },
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200] as [number, number, number, number],
      updateTriggers: {
        getText: deployedCount,
        getColor: deployedCount,
      },
    }),

    new ScatterplotLayer<Resource>({
      id: 'resources',
      data: resources,
      getPosition: (d: Resource) => [d.longitude, d.latitude],
      getFillColor: (d: Resource) =>
        STATUS_COLORS[d.status] || [255, 255, 255, 100],
      radiusMinPixels: 7,
      radiusMaxPixels: 12,
      stroked: true,
      getLineColor: (d: Resource) =>
        RESOURCE_TYPE_COLORS[d.type] || [255, 255, 255, 120],
      lineWidthMinPixels: 2,
      pickable: true,
    }),

    // Resource type labels
    new TextLayer<Resource>({
      id: 'resource-labels',
      data: resources,
      getPosition: (d: Resource) => [d.longitude, d.latitude],
      getText: (d: Resource) => RESOURCE_LABELS[d.type] || '?',
      getSize: 10,
      getColor: [255, 255, 255, 240] as [number, number, number, number],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
      fontWeight: 700,
      fontFamily: 'system-ui, sans-serif',
      billboard: true,
      sizeScale: 1,
      sizeMinPixels: 9,
      sizeMaxPixels: 13,
      fontSettings: { sdf: true },
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200] as [number, number, number, number],
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
          ? [59, 130, 246, 140] as [number, number, number, number]
          : [250, 204, 21, 160] as [number, number, number, number],
      getTargetColor: (d: Resource) =>
        d.status === 'deployed'
          ? [59, 130, 246, 60] as [number, number, number, number]
          : [255, 140, 50, 120] as [number, number, number, number],
      getWidth: (d: Resource) => d.status === 'en_route' ? 2.5 : 1.5,
      getHeight: 0.35,
      greatCircle: false,
    }),

    // Glow behind moving dots
    new ScatterplotLayer<Resource>({
      id: 'moving-resources-glow',
      data: resources.filter((r) => r.status === 'en_route' && r.assignedClusterId && r.deployedAt),
      getPosition: (d: Resource) => {
        const cluster = fireClusters.find((c) => c.id === d.assignedClusterId);
        if (!cluster || !d.deployedAt) return [d.longitude, d.latitude];
        const elapsed = Date.now() - d.deployedAt;
        const t = Math.min(1, elapsed / 8000);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        return [
          d.longitude + (cluster.centroid[0] - d.longitude) * ease,
          d.latitude + (cluster.centroid[1] - d.latitude) * ease,
        ];
      },
      getFillColor: [250, 204, 21, 40] as [number, number, number, number],
      getRadius: 3000,
      radiusMinPixels: 10,
      radiusMaxPixels: 25,
      stroked: false,
      updateTriggers: { getPosition: animTickRef.current },
    }),

    // Animated moving dots for en_route resources
    new ScatterplotLayer<Resource>({
      id: 'moving-resources',
      data: resources.filter((r) => r.status === 'en_route' && r.assignedClusterId && r.deployedAt),
      getPosition: (d: Resource) => {
        const cluster = fireClusters.find((c) => c.id === d.assignedClusterId);
        if (!cluster || !d.deployedAt) return [d.longitude, d.latitude];
        const TRAVEL_DURATION = 8000;
        const elapsed = Date.now() - d.deployedAt;
        const t = Math.min(1, elapsed / TRAVEL_DURATION);
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
        getPosition: animTickRef.current,
      },
    }),
  ], [filteredDetections, fireClusters, resources, evacuationZones, selectedClusterId, selectedWindDirection, selectedWindSpeed, handleClusterClick, getWindDir, timelinePosition, containmentMap, deployedCount]);

  const getTooltip = useCallback((info: PickingInfo) => {
    if (!info.object) return null;

    if (info.layer?.id === 'fire-clusters') {
      const cluster = info.object as FireCluster;
      const pct = containmentMap.get(cluster.id) || 0;
      const clusterDeployed = resources.filter(
        (r) => r.assignedClusterId === cluster.id && (r.status === 'deployed' || r.status === 'en_route')
      ).length;
      const pctColor = pct >= 60 ? '#22c55e' : pct >= 40 ? '#facc15' : pct >= 20 ? '#f97316' : '#ef4444';
      return {
        html: `<div style="font-family: system-ui; padding: 6px 10px;">
          <strong>${cluster.name}</strong>
          <span style="color: ${pctColor}; float: right; margin-left: 12px; font-weight: 700;">${pct}%</span><br/>
          <span style="opacity: 0.7; font-size: 11px;">Severity: ${cluster.severity.toUpperCase()} | ${cluster.estimatedAcres.toLocaleString()} ac</span><br/>
          <span style="opacity: 0.7; font-size: 11px;">FRP: ${cluster.totalFRP} | ${cluster.points.length} detections</span>
          ${clusterDeployed > 0 ? `<br/><span style="color: #3b82f6; font-size: 11px;">${clusterDeployed} resource${clusterDeployed > 1 ? 's' : ''} assigned</span>` : ''}
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
      const statusColor = resource.status === 'available' ? '#22c55e' :
                          resource.status === 'deployed' ? '#3b82f6' :
                          resource.status === 'en_route' ? '#facc15' : '#6b7280';
      return {
        html: `<div style="font-family: system-ui; padding: 6px 10px;">
          <strong>${resource.name}</strong>
          <span style="color: ${statusColor}; float: right; margin-left: 12px; font-size: 11px; font-weight: 600;">${resource.status.replace('_', ' ').toUpperCase()}</span><br/>
          <span style="opacity: 0.7; font-size: 11px;">${resource.type.replace('_', ' ')} | ${resource.homeBase}</span>
          ${resource.assignedClusterId ? `<br/><span style="color: #f97316; font-size: 11px;">Assigned to fire</span>` : ''}
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
  }, [containmentMap, resources]);

  // Click empty space to deselect
  const handleMapClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object && selectedClusterId) {
        selectCluster(null);
      }
    },
    [selectedClusterId, selectCluster]
  );

  return (
    <div className="absolute inset-0">
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof viewState)}
        controller={true}
        layers={layers}
        getTooltip={getTooltip}
        onClick={handleMapClick}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onLoad={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const map = e.target as any;
            map.setFog({
              range: [1, 8],
              color: 'rgba(10, 10, 15, 0.85)',
              'high-color': 'rgba(20, 20, 40, 0.5)',
              'horizon-blend': 0.04,
              'space-color': 'rgba(5, 5, 10, 1)',
              'star-intensity': 0.15,
            });
            // Add 3D terrain for dramatic mountainous California landscape
            if (!map.getSource('mapbox-dem')) {
              map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14,
              });
              map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
            }
          }}
        />
      </DeckGL>
    </div>
  );
}
