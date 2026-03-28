export interface FireDetection {
  id: string;
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: 'low' | 'nominal' | 'high';
  frp: number;
  satellite: string;
  acquiredAt: Date;
  daynight: 'D' | 'N';
}

export interface FireCluster {
  id: string;
  centroid: [number, number]; // [lng, lat]
  points: FireDetection[];
  totalFRP: number;
  maxConfidence: 'low' | 'nominal' | 'high';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  boundingBox: [number, number, number, number];
  firstDetected: Date;
  lastDetected: Date;
  estimatedAcres: number;
  name: string;
}
