import { FireDetection } from '@/types/fire';

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export async function fetchFireDetections(
  bounds = { west: -125, south: 32, east: -114, north: 42 },
  days = 2
): Promise<FireDetection[]> {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) throw new Error('FIRMS_MAP_KEY not set');

  const url = `${FIRMS_BASE}/${key}/VIIRS_NOAA20_NRT/${bounds.west},${bounds.south},${bounds.east},${bounds.north}/${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIRMS API error: ${res.status}`);

  const csv = await res.text();
  return parseFireCSV(csv);
}

function parseFireCSV(csv: string): FireDetection[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');
  const brightIdx = headers.indexOf('bright_ti4');
  const confIdx = headers.indexOf('confidence');
  const frpIdx = headers.indexOf('frp');
  const satIdx = headers.indexOf('satellite');
  const dateIdx = headers.indexOf('acq_date');
  const timeIdx = headers.indexOf('acq_time');
  const dnIdx = headers.indexOf('daynight');

  return lines.slice(1).map((line, i) => {
    const cols = line.split(',');
    const acqDate = cols[dateIdx];
    const acqTime = cols[timeIdx].padStart(4, '0');

    return {
      id: `det_${i}_${cols[latIdx]}_${cols[lonIdx]}`,
      latitude: parseFloat(cols[latIdx]),
      longitude: parseFloat(cols[lonIdx]),
      brightness: parseFloat(cols[brightIdx]),
      confidence: normalizeConfidence(cols[confIdx]),
      frp: parseFloat(cols[frpIdx]) || 0,
      satellite: cols[satIdx],
      acquiredAt: new Date(`${acqDate}T${acqTime.slice(0,2)}:${acqTime.slice(2)}:00Z`),
      daynight: (cols[dnIdx] === 'D' ? 'D' : 'N') as 'D' | 'N',
    };
  }).filter(d => !isNaN(d.latitude) && !isNaN(d.longitude));
}

function normalizeConfidence(val: string): 'low' | 'nominal' | 'high' {
  const lower = val.toLowerCase().trim();
  if (lower === 'h' || lower === 'high') return 'high';
  if (lower === 'l' || lower === 'low') return 'low';
  return 'nominal';
}
