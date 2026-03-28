import { FireCluster } from '@/types/fire';
import { EvacuationZone, RiskLevel } from '@/types/evacuation';

export function generateEvacuationZones(clusters: FireCluster[]): EvacuationZone[] {
  const zones: EvacuationZone[] = [];
  let counter = 1;

  for (const cluster of clusters) {
    let riskLevel: RiskLevel;
    let radiusMiles: number;
    let population: number;

    if (cluster.severity === 'critical') {
      riskLevel = 'immediate';
      radiusMiles = 5;
      population = 1000 + Math.floor(Math.random() * 4000);
    } else if (cluster.severity === 'high') {
      riskLevel = 'warning';
      radiusMiles = 8;
      population = 2000 + Math.floor(Math.random() * 6000);
    } else if (cluster.severity === 'moderate') {
      riskLevel = 'watch';
      radiusMiles = 10;
      population = 500 + Math.floor(Math.random() * 3000);
    } else {
      continue; // No zone for low severity
    }

    zones.push({
      id: `evac_${counter}`,
      clusterId: cluster.id,
      center: [
        cluster.centroid[0] + (Math.random() - 0.3) * 0.05,
        cluster.centroid[1] - 0.02,
      ],
      radiusMiles,
      riskLevel,
      population,
      status: 'active',
      issuedAt: new Date(Date.now() - Math.random() * 86400000),
    });
    counter++;
  }

  return zones;
}
