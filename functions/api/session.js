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
const ALLOWED_GAMES  = null;           // null = any game_id accepted; set to an array to lock down

// In-memory rate-limit ledger. Edge runtime = single instance per region,
// good enough for a hobby leaderboard. For a real prod system, swap for
// Durable Objects or a CF rate-limit rule.
const rateLimit = new Map();

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
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'invalid_json' }, 400); }

  const game_id = String(body?.game_id || '').trim();
  if (!game_id) return jsonResponse({ error: 'game_id_required' }, 400);
  if (ALLOWED_GAMES && !ALLOWED_GAMES.includes(game_id)) {
    return jsonResponse({ error: 'unknown_game' }, 400);
  }

  // Rate limit
  const ip = clientIp(request);
  const now = Date.now();
  const last = rateLimit.get(ip) || 0;
  if (now - last < RATE_LIMIT_MS) {
    return jsonResponse({ error: 'rate_limited', retry_after_ms: RATE_LIMIT_MS - (now - last) }, 429);
  }
  rateLimit.set(ip, now);

  const session_id = randHex(32);
  const issued_at  = now;
  const expires_at = now + SESSION_TTL_MS;

  try {
    await env.DB.prepare(
      'INSERT INTO sessions (session_id, game_id, issued_at, expires_at, used) VALUES (?1, ?2, ?3, ?4, 0)'
    ).bind(session_id, game_id, issued_at, expires_at).run();
  } catch (e) {
    return jsonResponse({ error: 'db_error', detail: String(e?.message || e) }, 500);
  }

  return jsonResponse({ session_id, expires_at, game_id });
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
