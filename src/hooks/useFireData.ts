'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { clusterFires } from '@/lib/clustering';
import { generateEvacuationZones } from '@/lib/mock-evacuation';
import { FireDetection } from '@/types/fire';

interface FirmsResponse {
  detections: FireDetection[];
  count: number;
  fetchedAt: string;
}

export function useFireData() {
  const { setFireDetections, setFireClusters, setEvacuationZones } = useAppStore();

  const query = useQuery<FirmsResponse>({
    queryKey: ['fire-data'],
    queryFn: async () => {
      const res = await fetch('/api/firms');
      if (!res.ok) throw new Error('Failed to fetch fire data');
      return res.json();
    },
    refetchInterval: 900000,
    staleTime: 600000,
    gcTime: 1800000, // keep in garbage collection for 30 min
  });

  useEffect(() => {
    if (query.data?.detections) {
      // Rehydrate dates and pre-compute timestamps for fast timeline filtering
      const detections = query.data.detections.map(d => ({
        ...d,
        acquiredAt: new Date(d.acquiredAt),
        _timestamp: new Date(d.acquiredAt).getTime(),
      }));

      // Sort by timestamp for binary search in timeline
      detections.sort((a, b) => a._timestamp - b._timestamp);

      setFireDetections(detections);

      const clusters = clusterFires(detections);
      setFireClusters(clusters);

      const zones = generateEvacuationZones(clusters);
      setEvacuationZones(zones);
    }
  }, [query.data, setFireDetections, setFireClusters, setEvacuationZones]);

  return {
    isLoading: query.isLoading,
    error: query.error,
    lastUpdated: query.data?.fetchedAt ? new Date(query.data.fetchedAt) : null,
  };
}
