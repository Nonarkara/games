/**
 * Persistent D1 rate limit. Key is a hash of prefix + salt + client IP.
 * Raw IPs are never stored.
 */

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * @returns {{ ok: true } | { ok: false, retryAfterMs?: number, unavailable?: boolean }}
 */
export async function rateLimit(env, request, { prefix, windowMs }) {
  const now = Date.now();
  const keyHash = await sha256(`${prefix}:${env.RATE_LIMIT_SALT || 'ngs-score-v1'}:${clientIp(request)}`);
  try {
    const limit = await env.DB.prepare(
      `INSERT INTO api_rate_limits (key_hash, last_seen_at) VALUES (?1, ?2)
       ON CONFLICT(key_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at
       WHERE api_rate_limits.last_seen_at <= ?3`
    ).bind(keyHash, now, now - windowMs).run();
    if (!limit.meta?.changes) return { ok: false, retryAfterMs: windowMs };
    return { ok: true };
  } catch {
    return { ok: false, unavailable: true };
  }
}
