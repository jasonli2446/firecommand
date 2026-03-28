export type ResourceType = 'engine' | 'helicopter' | 'hand_crew' | 'air_tanker' | 'dozer' | 'water_tender';
export type ResourceStatus = 'available' | 'deployed' | 'en_route' | 'maintenance';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  latitude: number;
  longitude: number;
  homeBase: string;
  assignedClusterId: string | null;
  capacity: number;
  eta?: string;
  deployedAt?: number;
}
