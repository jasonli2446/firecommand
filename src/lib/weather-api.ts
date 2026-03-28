import { WeatherCondition } from '@/types/weather';

const WEATHER_HEADERS = {
  'User-Agent': '(FireCommand, firecommand@example.com)',
  'Accept': 'application/geo+json',
};

const directionToDegrees: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

// Server-side cache — weather doesn't change fast, cache for 30 min
const weatherCache = new Map<string, { data: WeatherCondition | null; expires: number }>();
const WEATHER_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchWeather(lat: number, lon: number): Promise<WeatherCondition | null> {
  // Round to 2 decimal places for cache key — nearby coords share weather
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.data;

  try {
    // Step 1: Get grid info
    const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
      headers: WEATHER_HEADERS,
    });
    if (!pointRes.ok) return null;
    const pointData = await pointRes.json();

    const { gridId, gridX, gridY } = pointData.properties;

    // Step 2: Get forecast
    const forecastRes = await fetch(
      `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast`,
      { headers: WEATHER_HEADERS }
    );
    if (!forecastRes.ok) return null;
    const forecastData = await forecastRes.json();

    const period = forecastData.properties.periods[0];
    if (!period) return null;

    const windSpeed = parseWindSpeed(period.windSpeed);
    const windDirection = directionToDegrees[period.windDirection] ?? 0;
    const temperature = period.temperature;
    const humidity = period.relativeHumidity?.value ?? 30;

    const result: WeatherCondition = {
      latitude: lat,
      longitude: lon,
      windSpeed,
      windDirection,
      windGust: windSpeed * 1.3,
      temperature,
      humidity,
      forecastTime: new Date(period.startTime),
      isFireWeatherWarning: windSpeed > 25 || humidity < 15,
    };
    weatherCache.set(key, { data: result, expires: Date.now() + WEATHER_CACHE_TTL });
    return result;
  } catch {
    return null;
  }
}

function parseWindSpeed(str: string): number {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}
