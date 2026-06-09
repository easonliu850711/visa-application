import { NextRequest } from 'next/server';

const CORE_API_BASE = (
  process.env.CENTRAL_API_BASE_URL ||
  process.env.API_CORE_BASE_URL ||
  'http://127.0.0.1:3005'
).replace(/\/+$/, '');
const CORE_API_KEY = process.env.CENTRAL_API_KEY || process.env.X_IMORI_API_KEY || '';

function toCoreUrl(path: string) {
  return `${CORE_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  headers.set('cache-control', 'no-store');
  headers.set('x-visa-api-mode', 'central-api-proxy');

  return headers;
}

async function proxyToCore(method: 'GET' | 'POST', path: string, body?: string, contentType?: string) {
  const headers = new Headers();

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (CORE_API_KEY) {
    headers.set('x-imori-api-key', CORE_API_KEY);
  }

  const upstream = await fetch(toCoreUrl(path), {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const text = await upstream.text();

  return new Response(text, {
    status: upstream.status,
    headers: buildResponseHeaders(upstream),
  });
}

export async function proxyGet(path: string) {
  return proxyToCore('GET', path);
}

export async function proxyPost(req: NextRequest, path: string) {
  return proxyToCore(
    'POST',
    path,
    await req.text(),
    req.headers.get('content-type') || 'application/json',
  );
}
