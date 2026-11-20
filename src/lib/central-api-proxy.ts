import type { NextRequest } from 'next/server';

function configuredOrigin(): string | null {
  const value = process.env.CENTRAL_API_BASE_URL?.trim() || process.env.API_CORE_BASE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch { return null; }
}

function proxyFailure(status: number, code: string, message: string) {
  return Response.json({ success: false, error: { code, message } }, {
    status,
    headers: { 'cache-control': 'no-store', 'x-visa-api-mode': 'central-api-proxy' },
  });
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
  const origin = configuredOrigin();
  if (!origin) return proxyFailure(503, 'SERVICE_UNAVAILABLE', '中央 API 連線設定尚未就緒');
  // Routes supply fixed paths. Reject absolute/protocol-relative inputs rather
  // than allowing them to replace the explicitly configured service origin.
  if (!path.startsWith('/api/') || path.includes('\\') || path.includes('..')) {
    return proxyFailure(500, 'INTERNAL_ERROR', '中央 API 路由設定無效');
  }
  const headers = new Headers();

  if (contentType) {
    headers.set('content-type', contentType);
  }

  const key = process.env.CENTRAL_API_KEY || process.env.X_IMORI_API_KEY;
  if (key) {
    headers.set('x-imori-api-key', key);
  }

  const signal = AbortSignal.timeout(10000);
  try {
    const upstream = await fetch(`${origin}${path}`, {
      method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal,
    });

    const text = await upstream.text();

    return new Response([204, 205, 304].includes(upstream.status) ? null : text, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream),
    });
  } catch {
    return signal.aborted
      ? proxyFailure(504, 'GATEWAY_TIMEOUT', '中央 API 回應逾時，請稍後重試')
      : proxyFailure(502, 'EXTERNAL_API_ERROR', '中央 API 暫時無法連線，請稍後重試');
  }
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
