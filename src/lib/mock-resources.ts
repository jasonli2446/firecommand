import { Resource, ResourceType, ResourceStatus } from '@/types/resource';

interface ResourceTemplate {
  type: ResourceType;
  prefix: string;
  locations: { name: string; lat: number; lon: number }[];
}

const templates: ResourceTemplate[] = [
  {
    type: 'engine',
    prefix: 'Engine',
    locations: [
      { name: 'Sacramento', lat: 38.58, lon: -121.49 },
      { name: 'Fresno', lat: 36.74, lon: -119.77 },
      { name: 'San Bernardino', lat: 34.11, lon: -117.29 },
      { name: 'Riverside', lat: 33.98, lon: -117.37 },
      { name: 'Redding', lat: 40.59, lon: -122.39 },
      { name: 'San Luis Obispo', lat: 35.28, lon: -120.66 },
      { name: 'Sonora', lat: 37.98, lon: -120.38 },
      { name: 'Grass Valley', lat: 39.22, lon: -121.06 },
      { name: 'Ukiah', lat: 39.15, lon: -123.21 },
      { name: 'Madera', lat: 36.96, lon: -120.06 },
      { name: 'Oroville', lat: 39.51, lon: -121.56 },
      { name: 'Camino', lat: 38.73, lon: -120.67 },
      { name: 'San Diego', lat: 32.72, lon: -117.16 },
      { name: 'Santa Rosa', lat: 38.44, lon: -122.71 },
      { name: 'Chico', lat: 39.73, lon: -121.84 },
    ],
  },
  {
    type: 'helicopter',
    prefix: 'Heli',
    locations: [
      { name: 'Hemet-Ryan Air Base', lat: 33.73, lon: -117.02 },
      { name: 'Paso Robles Air Base', lat: 35.67, lon: -120.63 },
      { name: 'Vina Air Base', lat: 39.93, lon: -122.05 },
      { name: 'Columbia Air Base', lat: 38.03, lon: -120.41 },
      { name: 'Boggs Mountain', lat: 38.83, lon: -122.66 },
    ],
  },
  {
    type: 'hand_crew',
    prefix: 'Crew',
    locations: [
      { name: 'Angeles NF', lat: 34.25, lon: -117.94 },
      { name: 'Sequoia NF', lat: 36.49, lon: -118.83 },
      { name: 'Shasta-Trinity NF', lat: 41.07, lon: -122.54 },
      { name: 'Mendocino NF', lat: 39.69, lon: -122.87 },
      { name: 'Eldorado NF', lat: 38.78, lon: -120.42 },
      { name: 'Los Padres NF', lat: 34.72, lon: -119.79 },
      { name: 'Plumas NF', lat: 39.94, lon: -121.15 },
      { name: 'Klamath NF', lat: 41.73, lon: -123.01 },
      { name: 'Tahoe NF', lat: 39.32, lon: -120.66 },
      { name: 'Sierra NF', lat: 37.22, lon: -119.37 },
    ],
  },
  {
    type: 'air_tanker',
    prefix: 'Tanker',
    locations: [
      { name: 'McClellan Air Base', lat: 38.67, lon: -121.40 },
      { name: 'Channel Islands ANGS', lat: 34.22, lon: -119.10 },
      { name: 'Ramona Airport', lat: 33.04, lon: -116.91 },
    ],
  },
  {
    type: 'dozer',
    prefix: 'Dozer',
    locations: [
      { name: 'San Bernardino NF', lat: 34.18, lon: -117.08 },
      { name: 'Stanislaus NF', lat: 38.19, lon: -120.12 },
      { name: 'Lassen NF', lat: 40.42, lon: -121.49 },
      { name: 'Cleveland NF', lat: 33.43, lon: -116.87 },
    ],
  },
  {
    type: 'water_tender',
    prefix: 'Water',
    locations: [
      { name: 'Lake Shasta', lat: 40.72, lon: -122.42 },
      { name: 'Lake Oroville', lat: 39.54, lon: -121.48 },
      { name: 'Folsom Lake', lat: 38.72, lon: -121.16 },
      { name: 'Pine Flat Lake', lat: 36.83, lon: -119.33 },
      { name: 'Lake Cachuma', lat: 34.58, lon: -119.98 },
      { name: 'Diamond Valley Lake', lat: 33.70, lon: -117.17 },
      { name: 'Lake Berryessa', lat: 38.61, lon: -122.23 },
      { name: 'Millerton Lake', lat: 37.00, lon: -119.65 },
    ],
  },
];

const statusDistribution: ResourceStatus[] = [
  'available', 'available', 'available', 'available', 'available', 'available',
  'deployed', 'deployed',
  'en_route',
  'maintenance',
];

export function generateResources(): Resource[] {
  const resources: Resource[] = [];
  let counter = 1;

  for (const template of templates) {
    for (let i = 0; i < template.locations.length; i++) {
      const loc = template.locations[i];
      const status = statusDistribution[counter % statusDistribution.length];
      const jitterLat = (Math.random() - 0.5) * 0.05;
      const jitterLon = (Math.random() - 0.5) * 0.05;

      resources.push({
        id: `res_${counter}`,
        name: `${template.prefix} ${counter}`,
        type: template.type,
        status,
        latitude: loc.lat + jitterLat,
        longitude: loc.lon + jitterLon,
        homeBase: loc.name,
        assignedClusterId: null,
        capacity: template.type === 'helicopter' ? 3 : template.type === 'air_tanker' ? 5 : template.type === 'hand_crew' ? 20 : 4,
      });
      counter++;
    }
  }

  return resources;
}
