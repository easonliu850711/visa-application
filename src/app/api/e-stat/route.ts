import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CORE_API_BASE = (process.env.CENTRAL_API_BASE_URL || 'http://127.0.0.1:4005').replace(/\/+$/, '');
const CORE_API_KEY = process.env.CENTRAL_API_KEY || process.env.X_IMORI_API_KEY || '';

export async function GET() {
  try {
    const headers: HeadersInit = {};

    if (CORE_API_KEY) {
      headers['x-imori-api-key'] = CORE_API_KEY;
    }

    const upstream = await fetch(`${CORE_API_BASE}/api/visa/e-stat`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const raw = await upstream.json();

    const bureaus = raw?.data?.bureaus ?? raw?.bureaus ?? [];

    return NextResponse.json(
      { bureaus },
      {
        status: upstream.status,
        headers: {
          'cache-control': 'no-store',
          'x-visa-api-mode': 'central-api-proxy',
        },
      },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'Central API proxy failed' },
      { status: 500 },
    );
  }
}