'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import Map from 'react-map-gl/mapbox';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PolygonLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
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

const RISK_LINE_COLORS: Record<string, [number, number, number]> = {
  immediate: [255, 60, 60],
  warning: [255, 165, 0],
  watch: [255, 255, 100],
};

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

export function FireMap() {
  const {
    fireDetections,
    fireClusters,
    resources,
    evacuationZones,
    selectCluster,
    timelinePosition,
  } = useAppStore();

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

    new ScatterplotLayer<Resource>({
      id: 'resources',
      data: resources,
      getPosition: (d: Resource) => [d.longitude, d.latitude],
      getFillColor: (d: Resource) =>
        STATUS_COLORS[d.status] || [255, 255, 255, 100],
      radiusMinPixels: 4,
      radiusMaxPixels: 8,
      stroked: true,
      getLineColor: [255, 255, 255, 120] as [number, number, number, number],
      lineWidthMinPixels: 1,
      pickable: true,
    }),
  ], [filteredDetections, fireClusters, resources, evacuationZones, handleClusterClick]);

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
        initialViewState={INITIAL_VIEW_STATE}
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
