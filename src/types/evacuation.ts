export type RiskLevel = 'immediate' | 'warning' | 'watch';
export type EvacuationStatus = 'active' | 'lifted';

export interface EvacuationZone {
  id: string;
  clusterId: string;
  center: [number, number];
  radiusMiles: number;
  riskLevel: RiskLevel;
  population: number;
  status: EvacuationStatus;
  issuedAt: Date;
}
