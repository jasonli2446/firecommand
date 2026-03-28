// Palantir OSDK client configuration
// This will be configured once the OSDK is generated from Developer Console
// For now, export placeholder config that the app checks before using

export const PALANTIR_CONFIG = {
  foundryUrl: process.env.NEXT_PUBLIC_PALANTIR_FOUNDRY_URL || '',
  clientId: process.env.NEXT_PUBLIC_PALANTIR_CLIENT_ID || '',
  ontologyRid: process.env.NEXT_PUBLIC_PALANTIR_ONTOLOGY_RID || '',
  isConfigured: !!(
    process.env.NEXT_PUBLIC_PALANTIR_FOUNDRY_URL &&
    process.env.NEXT_PUBLIC_PALANTIR_CLIENT_ID
  ),
};
