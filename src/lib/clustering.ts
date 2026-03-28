import { FireDetection, FireCluster } from '@/types/fire';

const EPSILON = 0.05; // ~5.5km in degrees
const MIN_POINTS = 2;

// California geographic landmarks for realistic fire names
const CA_LANDMARKS: { name: string; lat: number; lon: number }[] = [
  { name: 'Angeles Forest', lat: 34.27, lon: -118.12 },
  { name: 'Sequoia Ridge', lat: 36.45, lon: -118.75 },
  { name: 'Shasta', lat: 41.30, lon: -122.31 },
  { name: 'Diablo Range', lat: 37.40, lon: -121.50 },
  { name: 'Big Sur', lat: 36.27, lon: -121.80 },
  { name: 'Tehachapi', lat: 35.13, lon: -118.45 },
  { name: 'San Gabriel', lat: 34.22, lon: -117.90 },
  { name: 'Mendocino', lat: 39.30, lon: -123.30 },
  { name: 'El Dorado', lat: 38.75, lon: -120.50 },
  { name: 'Palomar', lat: 33.36, lon: -116.85 },
  { name: 'Lassen Peak', lat: 40.49, lon: -121.51 },
  { name: 'Trinity', lat: 40.80, lon: -122.75 },
  { name: 'Carrizo Plain', lat: 35.20, lon: -119.80 },
  { name: 'Pinnacles', lat: 36.49, lon: -121.18 },
  { name: 'Sierra Madre', lat: 34.16, lon: -118.06 },
  { name: 'Plumas', lat: 40.00, lon: -121.00 },
  { name: 'Calaveras', lat: 38.20, lon: -120.40 },
  { name: 'Kern River', lat: 35.70, lon: -118.40 },
  { name: 'Modoc', lat: 41.60, lon: -120.70 },
  { name: 'Topanga', lat: 34.05, lon: -118.60 },
  { name: 'Silverado', lat: 33.74, lon: -117.63 },
  { name: 'Camp Pendleton', lat: 33.30, lon: -117.35 },
  { name: 'Malibu Canyon', lat: 34.05, lon: -118.72 },
  { name: 'Lake Arrowhead', lat: 34.25, lon: -117.19 },
  { name: 'Cuyamaca', lat: 32.95, lon: -116.58 },
  { name: 'Yosemite', lat: 37.86, lon: -119.54 },
  { name: 'Tahoe Basin', lat: 39.05, lon: -120.03 },
  { name: 'Wine Country', lat: 38.50, lon: -122.75 },
  { name: 'Santa Ynez', lat: 34.73, lon: -119.80 },
  { name: 'Ojai Valley', lat: 34.45, lon: -119.24 },
  { name: 'Red Bluff', lat: 40.18, lon: -122.24 },
  { name: 'Grass Valley', lat: 39.22, lon: -121.06 },
  { name: 'Clear Lake', lat: 39.02, lon: -122.77 },
  { name: 'Siskiyou', lat: 41.78, lon: -122.58 },
  { name: 'Mono Lake', lat: 38.00, lon: -119.00 },
  { name: 'Kings Canyon', lat: 36.80, lon: -118.68 },
  { name: 'Death Valley', lat: 36.50, lon: -117.10 },
  { name: 'Joshua Tree', lat: 34.00, lon: -116.20 },
  { name: 'San Bernardino', lat: 34.20, lon: -117.30 },
  { name: 'Klamath', lat: 41.50, lon: -123.40 },
  { name: 'Almanor', lat: 40.25, lon: -121.20 },
  { name: 'Butte Creek', lat: 39.80, lon: -121.60 },
  { name: 'Placer Hills', lat: 39.00, lon: -120.80 },
  { name: 'Tule River', lat: 36.10, lon: -118.80 },
  { name: 'Antelope Valley', lat: 34.80, lon: -118.20 },
  { name: 'Cuesta Ridge', lat: 35.30, lon: -120.65 },
  { name: 'Figueroa Mountain', lat: 34.70, lon: -119.98 },
  { name: 'Mount Tamalpais', lat: 37.92, lon: -122.58 },
  { name: 'Napa Valley', lat: 38.50, lon: -122.35 },
  { name: 'Point Reyes', lat: 38.07, lon: -122.87 },
  { name: 'Emigrant Gap', lat: 39.30, lon: -120.67 },
  { name: 'Pilot Peak', lat: 40.80, lon: -121.20 },
  { name: 'Lake Berryessa', lat: 38.65, lon: -122.20 },
  { name: 'Frazier Park', lat: 34.82, lon: -118.95 },
  { name: 'Laguna Beach', lat: 33.55, lon: -117.78 },
  { name: 'Anza', lat: 33.55, lon: -116.67 },
  { name: 'Eagle Rock', lat: 33.80, lon: -116.35 },
  { name: 'Riverside', lat: 33.95, lon: -117.40 },
  { name: 'San Jacinto', lat: 33.80, lon: -116.80 },
];

function findNearestLandmark(lat: number, lon: number, usedNames: Set<string>): string {
  let best = '';
  let bestDist = Infinity;
  for (const lm of CA_LANDMARKS) {
    if (usedNames.has(lm.name)) continue;
    const d = (lat - lm.lat) ** 2 + (lon - lm.lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = lm.name;
    }
  }
  return best;
}

// Fallback NATO alphabet for when landmarks run out
const NATO_ALPHABET = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
  'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey',
  'X-Ray', 'Yankee', 'Zulu',
];

function distance(a: FireDetection, b: FireDetection): number {
  const dlat = a.latitude - b.latitude;
  const dlon = a.longitude - b.longitude;
  return Math.sqrt(dlat * dlat + dlon * dlon);
}

function regionQuery(points: FireDetection[], point: FireDetection, eps: number): number[] {
  const neighbors: number[] = [];
  for (let i = 0; i < points.length; i++) {
    if (distance(points[i], point) <= eps) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

export function clusterFires(detections: FireDetection[]): FireCluster[] {
  if (detections.length === 0) return [];

  const labels = new Array(detections.length).fill(-1); // -1 = unvisited
  let clusterId = 0;

  for (let i = 0; i < detections.length; i++) {
    if (labels[i] !== -1) continue;

    const neighbors = regionQuery(detections, detections[i], EPSILON);
    if (neighbors.length < MIN_POINTS) {
      labels[i] = -2; // noise
      continue;
    }

    labels[i] = clusterId;
    const queue = [...neighbors.filter(n => n !== i)];

    while (queue.length > 0) {
      const j = queue.shift()!;
      if (labels[j] === -2) labels[j] = clusterId; // noise -> border
      if (labels[j] !== -1) continue;

      labels[j] = clusterId;
      const jNeighbors = regionQuery(detections, detections[j], EPSILON);
      if (jNeighbors.length >= MIN_POINTS) {
        for (const n of jNeighbors) {
          if (labels[n] === -1 || labels[n] === -2) queue.push(n);
        }
      }
    }

    clusterId++;
  }

  // Build clusters
  const clusterMap = new Map<number, FireDetection[]>();
  for (let i = 0; i < detections.length; i++) {
    if (labels[i] < 0) continue;
    const existing = clusterMap.get(labels[i]) || [];
    existing.push(detections[i]);
    clusterMap.set(labels[i], existing);
  }

  // Also add noise points as single-point clusters for visibility
  for (let i = 0; i < detections.length; i++) {
    if (labels[i] === -2) {
      clusterMap.set(clusterId++, [detections[i]]);
    }
  }

  const clusters: FireCluster[] = [];
  let nameIdx = 0;
  const usedLandmarkNames = new Set<string>();

  for (const [id, points] of clusterMap) {
    const lats = points.map(p => p.latitude);
    const lons = points.map(p => p.longitude);
    const totalFRP = points.reduce((sum, p) => sum + p.frp, 0);
    const maxConf = points.some(p => p.confidence === 'high') ? 'high' :
                    points.some(p => p.confidence === 'nominal') ? 'nominal' : 'low';

    const dates = points.map(p => p.acquiredAt.getTime());
    const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;

    // Estimate acres from spread (very rough)
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lonSpread = Math.max(...lons) - Math.min(...lons);
    const areaDeg2 = Math.max(latSpread * lonSpread, 0.001);
    const acresPerDeg2 = 19040000; // rough conversion at CA latitude
    const estimatedAcres = Math.round(areaDeg2 * acresPerDeg2);

    let severity: FireCluster['severity'];
    if (totalFRP > 200 || points.length > 8) severity = 'critical';
    else if (totalFRP > 80 || points.length > 4) severity = 'high';
    else if (totalFRP > 20 || points.length > 2) severity = 'moderate';
    else severity = 'low';

    // Use nearest California landmark if available, fallback to NATO
    const landmark = findNearestLandmark(avgLat, avgLon, usedLandmarkNames);
    let name: string;
    if (landmark) {
      name = `${landmark} Fire`;
      usedLandmarkNames.add(landmark);
    } else {
      name = `Fire ${NATO_ALPHABET[nameIdx % NATO_ALPHABET.length]}${nameIdx >= NATO_ALPHABET.length ? ` ${Math.floor(nameIdx / NATO_ALPHABET.length) + 1}` : ''}`;
    }
    nameIdx++;

    clusters.push({
      id: `cluster_${id}`,
      centroid: [avgLon, avgLat],
      points,
      totalFRP: Math.round(totalFRP),
      maxConfidence: maxConf,
      severity,
      boundingBox: [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)],
      firstDetected: new Date(Math.min(...dates)),
      lastDetected: new Date(Math.max(...dates)),
      estimatedAcres,
      name,
    });
  }

  // Sort by severity (critical first)
  const sevOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
  clusters.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return clusters;
}
