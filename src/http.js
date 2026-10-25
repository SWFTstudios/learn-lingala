// Small HTTP helpers shared by the API routes.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

// Parse a JSON request body with a size cap. State-changing requests must be
// JSON: browsers cannot send that cross-site without a CORS preflight, which
// (together with SameSite cookies and the Origin check) blocks CSRF.
export async function readJson(request, maxBytes = 512 * 1024) {
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Expected application/json');
  }
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request body too large');
  try {
    const body = JSON.parse(text || '{}');
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

export function checkOrigin(request, url) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) throw new HttpError(403, 'Cross-origin request blocked');
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'local';
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

// Workers Rate Limiting binding. Missing bindings (e.g. in tests) are a no-op.
export async function rateLimit(limiter, key) {
  if (!limiter) return;
  const { success } = await limiter.limit({ key });
  if (!success) throw new HttpError(429, 'Too many requests — please wait a minute and try again.');
}
