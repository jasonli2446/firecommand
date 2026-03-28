// Palantir OSDK client configuration
// Supports progressive enhancement: works standalone, adds Foundry features when configured

export const PALANTIR_CONFIG = {
  foundryUrl: process.env.NEXT_PUBLIC_PALANTIR_FOUNDRY_URL || '',
  clientId: process.env.NEXT_PUBLIC_PALANTIR_CLIENT_ID || '',
  ontologyRid: process.env.NEXT_PUBLIC_PALANTIR_ONTOLOGY_RID || '',
  agentRid: process.env.PALANTIR_AGENT_RID || '',
  isFoundryConfigured: !!(
    process.env.NEXT_PUBLIC_PALANTIR_FOUNDRY_URL &&
    process.env.NEXT_PUBLIC_PALANTIR_CLIENT_ID
  ),
  isAgentConfigured: !!(
    process.env.PALANTIR_AGENT_RID &&
    process.env.PALANTIR_TOKEN
  ),
};

export type IntegrationStatus = {
  foundry: 'connected' | 'standalone';
  agent: 'palantir-aip' | 'mock';
  dataSource: 'firms-api' | 'ontology';
};

export function getIntegrationStatus(): IntegrationStatus {
  return {
    foundry: PALANTIR_CONFIG.isFoundryConfigured ? 'connected' : 'standalone',
    agent: PALANTIR_CONFIG.isAgentConfigured ? 'palantir-aip' : 'mock',
    dataSource: PALANTIR_CONFIG.isFoundryConfigured ? 'ontology' : 'firms-api',
  };
}
