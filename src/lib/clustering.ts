import { FireDetection, FireCluster } from '@/types/fire';

const EPSILON = 0.05; // ~5.5km in degrees
const MIN_POINTS = 2;

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
    if (totalFRP > 500 || points.length > 20) severity = 'critical';
    else if (totalFRP > 200 || points.length > 10) severity = 'high';
    else if (totalFRP > 50 || points.length > 5) severity = 'moderate';
    else severity = 'low';

    const name = `Fire ${NATO_ALPHABET[nameIdx % NATO_ALPHABET.length]}${nameIdx >= NATO_ALPHABET.length ? ` ${Math.floor(nameIdx / NATO_ALPHABET.length) + 1}` : ''}`;
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
