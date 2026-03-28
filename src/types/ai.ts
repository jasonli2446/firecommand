export interface AIRecommendation {
  summary: string;
  riskAssessment: {
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    rationale: string;
  };
  priorityActions: {
    priority: number;
    action: string;
    targetClusterId: string;
    urgency: 'immediate' | 'within_1hr' | 'within_4hr';
  }[];
  resourceDeployments: {
    resourceId: string;
    resourceName: string;
    targetClusterId: string;
    targetFireName: string;
    rationale: string;
    estimatedETA: string;
  }[];
  evacuationRecommendations: {
    clusterId: string;
    fireName: string;
    riskLevel: 'immediate' | 'warning' | 'watch';
    estimatedPopulation: number;
    rationale: string;
  }[];
  fireSpreadPredictions: {
    clusterId: string;
    fireName: string;
    spreadDirection: string;
    spreadBearing: number;
    riskFactors: string[];
  }[];
}
