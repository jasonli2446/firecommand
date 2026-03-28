'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import type { WeatherCondition } from '@/types/weather';

export function useAIAgent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (weather?: WeatherCondition | null) => {
    const state = useAppStore.getState();
    const { fireClusters, resources, evacuationZones, selectedClusterId } = state;

    setIsAnalyzing(true);
    setRecommendation('');
    setError(null);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clusters: fireClusters.map(c => ({
            id: c.id,
            name: c.name,
            severity: c.severity,
            totalFRP: c.totalFRP,
            estimatedAcres: c.estimatedAcres,
            centroid: c.centroid,
            pointCount: c.points.length,
            firstDetected: c.firstDetected,
            lastDetected: c.lastDetected,
          })),
          resources: resources.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            status: r.status,
            homeBase: r.homeBase,
            latitude: r.latitude,
            longitude: r.longitude,
          })),
          evacuationZones: evacuationZones.map(z => ({
            id: z.id,
            riskLevel: z.riskLevel,
            population: z.population,
            radiusMiles: z.radiusMiles,
          })),
          selectedClusterId,
          weather: weather ? {
            temperature: weather.temperature,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            windDirection: weather.windDirection,
            windGust: weather.windGust,
          } : undefined,
        }),
      });

      if (!res.ok) throw new Error('AI analysis failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setRecommendation(prev => prev + chunk);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearRecommendation = useCallback(() => {
    setRecommendation('');
    setError(null);
  }, []);

  return { isAnalyzing, recommendation, error, analyze, clearRecommendation };
}
