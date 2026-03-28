import { NextRequest } from 'next/server';
import { fetchWeather } from '@/lib/weather-api';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = parseFloat(params.get('lat') || '');
  const lon = parseFloat(params.get('lon') || '');

  if (isNaN(lat) || isNaN(lon)) {
    return Response.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const weather = await fetchWeather(lat, lon);
  return Response.json({ weather });
}
