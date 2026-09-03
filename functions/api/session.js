/**
 * POST /api/session  { game_id: string }
 *   → { session_id, expires_at, game_id }
 *
 * Issues a one-time session token. The token is good for a single score
 * submission at /api/leaderboard, expires in 5 minutes, and is rate-limited
 * to 1 per IP per 2 seconds.
 *
 * Auth: none. The defense is the per-game max score in /api/leaderboard,
 * the session expiry, and the rate limit. A serious cheater can issue
 * their own session — they still cannot post a score above the game max.
 */

const SESSION_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 2 * 1000;

import { ALLOWED_GAME_IDS } from '../_shared/games.js';
import { json, readJson, sameOrigin } from '../_shared/http.js';
import { rateLimit } from '../_shared/rateLimit.js';
import { GAME_ID_MAX } from '../../js/scoreGate.js';

function randHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  const parsed = await readJson(request, 2048);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  const game_id = String(body?.game_id || '').trim();
  if (!game_id) return json({ error: 'game_id_required' }, 400);
  if (game_id.length > GAME_ID_MAX || !ALLOWED_GAME_IDS.has(game_id)) {
    return json({ error: 'unknown_game' }, 400);
  }

  const limited = await rateLimit(env, request, { prefix: 'score-session', windowMs: RATE_LIMIT_MS });
  if (!limited.ok) {
    if (limited.unavailable) return json({ error: 'service_unavailable' }, 503);
    return json({ error: 'rate_limited', retry_after_ms: limited.retryAfterMs }, 429);
  }

  const session_id = randHex(32);
  const issued_at = Date.now();
  const expires_at = issued_at + SESSION_TTL_MS;

  try {
    await env.DB.prepare(
      'INSERT INTO sessions (session_id, game_id, issued_at, expires_at, used) VALUES (?1, ?2, ?3, ?4, 0)'
    ).bind(session_id, game_id, issued_at, expires_at).run();
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?1').bind(issued_at).run();
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }

  return json({ session_id, expires_at, game_id });
}
