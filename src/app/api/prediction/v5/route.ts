import { NextRequest } from 'next/server';
import { proxyPost } from '../../../../lib/central-api-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return proxyPost(req, '/api/visa/prediction/v5');
}
