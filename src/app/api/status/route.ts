import { getIntegrationStatus } from '@/lib/osdk-client';

export async function GET() {
  const status = getIntegrationStatus();
  return Response.json(status);
}
