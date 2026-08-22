/**
 * POST /api/session  { game_id: string }
 *   → { session_id, expires_at, game_id }
 *
 * Issues a one-time session token. The token is good for a single score
 * submission at /api/leaderboard, expires in 5 minutes, and is rate-limited
 * to 1 per IP per 2 seconds.
 *
 * The session_id is a 32-byte hex string (crypto.randomUUID would be enough
 * but we hand-roll a hex string so the function is portable to non-Node
 * edge runtimes).
 *
 * Auth: none. The defense is the per-game max score in /api/leaderboard,
 * the session expiry, and the rate limit. A serious cheater can issue
 * their own session — they still cannot post a score above the game max.
 */

const SESSION_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const RATE_LIMIT_MS  = 2 * 1000;       // 1 per IP per 2s
import { ALLOWED_GAME_IDS } from '../_shared/games.js';
import { json, readJson, sameOrigin } from '../_shared/http.js';

// sha256 hex via Web Crypto. Inlined here because the only caller (rate
// limiting) lives in this file; the rest of the auth helpers were removed
// when the account system was reverted.
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function randHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  const parsed = await readJson(request, 2048);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  const game_id = String(body?.game_id || '').trim();
  if (!game_id) return json({ error: 'game_id_required' }, 400);
  if (!ALLOWED_GAME_IDS.has(game_id)) return json({ error: 'unknown_game' }, 400);

  // Rate limit
  const now = Date.now();
  const keyHash = await sha256(`score:${env.RATE_LIMIT_SALT || 'ngs-score-v1'}:${clientIp(request)}`);
  try {
    const limit = await env.DB.prepare(
      `INSERT INTO api_rate_limits (key_hash, last_seen_at) VALUES (?1, ?2)
       ON CONFLICT(key_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at
       WHERE api_rate_limits.last_seen_at <= ?3`
    ).bind(keyHash, now, now - RATE_LIMIT_MS).run();
    if (!limit.meta?.changes) return json({ error: 'rate_limited', retry_after_ms: RATE_LIMIT_MS }, 429);
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }

  const session_id = randHex(32);
  const issued_at  = now;
  const expires_at = now + SESSION_TTL_MS;

  try {
    await env.DB.prepare(
      'INSERT INTO sessions (session_id, game_id, issued_at, expires_at, used) VALUES (?1, ?2, ?3, ?4, 0)'
    ).bind(session_id, game_id, issued_at, expires_at).run();
  } catch (e) {
    return json({ error: 'service_unavailable' }, 503);
  }

  return json({ session_id, expires_at, game_id });
}
