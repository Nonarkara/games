export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders
    }
  });
}

export function redirect(location, status = 302, extraHeaders = {}) {
  return new Response(null, {
    status,
    headers: { location, 'cache-control': 'no-store', ...extraHeaders }
  });
}

export async function readJson(request, maxBytes = 262144) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return { ok: false, response: json({ error: 'json_content_type_required' }, 415) };
  }
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, response: json({ error: 'payload_too_large' }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    return { ok: false, response: json({ error: 'payload_too_large' }, 413) };
  }
  try { return { ok: true, value: JSON.parse(text) }; }
  catch { return { ok: false, response: json({ error: 'invalid_json' }, 400) }; }
}

export function sameOrigin(request, publicOrigin) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const expected = publicOrigin || new URL(request.url).origin;
  return origin === expected || origin === new URL(request.url).origin;
}
