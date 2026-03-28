'use client';

import { useQuery } from '@tanstack/react-query';
import { WeatherCondition } from '@/types/weather';

interface WeatherResponse {
  weather: WeatherCondition | null;
}

export function useWeatherData(lat: number | null, lon: number | null) {
  const query = useQuery<WeatherResponse>({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error('Failed to fetch weather');
      return res.json();
    },
    enabled: lat !== null && lon !== null,
    staleTime: 3600000, // 1 hour
  });

  return {
    weather: query.data?.weather ? {
      ...query.data.weather,
      forecastTime: new Date(query.data.weather.forecastTime),
    } : null,
    isLoading: query.isLoading,
  };
}
