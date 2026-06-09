import { proxyGet } from '../../../lib/central-api-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  return proxyGet('/api/visa/e-stat');
}
