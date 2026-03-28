import { NextRequest } from 'next/server';
import { fetchFireDetections } from '@/lib/firms-api';
import { FireDetection } from '@/types/fire';

interface CacheEntry {
  data: { detections: FireDetection[]; count: number; fetchedAt: string };
  timestamp: number;
  key: string;
}

// Server-side cache: store last fetch result for 15 minutes
let cache: CacheEntry | null = null;
const CACHE_TTL = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const bounds = {
      west: parseFloat(params.get('west') || '-125'),
      south: parseFloat(params.get('south') || '32'),
      east: parseFloat(params.get('east') || '-114'),
      north: parseFloat(params.get('north') || '42'),
    };
    const days = parseInt(params.get('days') || '2');
    const cacheKey = `${bounds.west},${bounds.south},${bounds.east},${bounds.north},${days}`;

    if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL) {
      return Response.json(cache.data);
    }

    const detections = await fetchFireDetections(bounds, days);
    const responseData = { detections, count: detections.length, fetchedAt: new Date().toISOString() };

    cache = { data: responseData, timestamp: Date.now(), key: cacheKey };

    return Response.json(responseData);
  } catch (error) {
    console.error('FIRMS API error:', error);
    if (cache) {
      return Response.json(cache.data);
    }
    return Response.json({ error: 'Failed to fetch fire data' }, { status: 500 });
  }
}
