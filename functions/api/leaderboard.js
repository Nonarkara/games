/**
 * GET  /api/leaderboard?game_id=X  → { game_id, board: [{ i, s, d }] }
 * POST /api/leaderboard  { game_id, initials, score, session_id }
 *   → { game_id, board, accepted: true, your_score, your_rank }
 *
 * Tamper resistance (in order of defense):
 *   1. Session must exist, be unused, not expired, and match game_id
 *      — consumed with UPDATE … AND used = 0 so two posts cannot both win
 *   2. Initials must be 1–4 chars, [A-Z0-9]
 *   3. Score must satisfy  0 <= score <= GAME_MAX[game_id]
 *   4. UNIQUE(session_id) on scores prevents double-submit even if
 *      a session is somehow reused
 *   5. session_id must be 64 hex chars (what POST /api/session issues)
 *
 * GAME_MAX is the only authoritative ceiling. Same-origin writes only.
 */

import { GAME_MAX } from '../_shared/games.js';
import { json, readJson, sameOrigin } from '../_shared/http.js';
import { rateLimit } from '../_shared/rateLimit.js';
import {
  GAME_ID_MAX,
  INITIALS_RE,
  isSessionId,
  normalizeInitials,
  sanitizeBoard,
  scoreInRange
} from '../../js/scoreGate.js';

const RATE_LIMIT_MS = 2 * 1000;

async function readBoard(env, game_id) {
  const { results } = await env.DB.prepare(
    'SELECT initials AS i, score AS s, date AS d FROM scores WHERE game_id = ?1 ORDER BY score DESC, created_at ASC LIMIT 5'
  ).bind(game_id).all();
  return sanitizeBoard(results || []);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const game_id = url.searchParams.get('game_id') || '';
  if (!game_id) return json({ error: 'game_id_required' }, 400);
  if (game_id.length > GAME_ID_MAX || GAME_MAX[game_id] == null) {
    return json({ error: 'unknown_game' }, 400);
  }
  try { return json({ game_id, board: await readBoard(env, game_id) }); }
  catch { return json({ error: 'service_unavailable' }, 503); }
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  const parsed = await readJson(request, 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  const game_id = String(body?.game_id || '').trim();
  const initials = normalizeInitials(body?.initials);
  const score = Number(body?.score);
  const session_id = String(body?.session_id || '').trim().toLowerCase();

  if (!game_id) return json({ error: 'game_id_required' }, 400);
  if (game_id.length > GAME_ID_MAX) return json({ error: 'unknown_game' }, 400);
  if (!isSessionId(session_id)) return json({ error: 'session_id_required' }, 400);
  if (!INITIALS_RE.test(initials)) return json({ error: 'initials_must_be_1_to_4_alnum' }, 400);

  const max = GAME_MAX[game_id];
  if (max == null) return json({ error: 'unknown_game' }, 400);
  if (!scoreInRange(score, max)) {
    if (!Number.isSafeInteger(score) || score < 0) return json({ error: 'invalid_score' }, 400);
    return json({ error: 'score_above_max', max }, 400);
  }

  const limited = await rateLimit(env, request, { prefix: 'score-post', windowMs: RATE_LIMIT_MS });
  if (!limited.ok) {
    if (limited.unavailable) return json({ error: 'service_unavailable' }, 503);
    return json({ error: 'rate_limited', retry_after_ms: limited.retryAfterMs }, 429);
  }

  const now = Date.now();
  let consumed;
  try {
    consumed = await env.DB.prepare(
      'UPDATE sessions SET used = 1 WHERE session_id = ?1 AND used = 0 AND game_id = ?2 AND expires_at >= ?3'
    ).bind(session_id, game_id, now).run();
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
  if (!consumed.meta?.changes) return json({ error: 'session_invalid' }, 400);

  const date = new Date().toISOString().slice(0, 10);

  try {
    await env.DB.prepare(
      'INSERT INTO scores (game_id, initials, score, date, session_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(game_id, initials, score, date, session_id, now).run();
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('UNIQUE')) return json({ error: 'session_already_used' }, 409);
    return json({ error: 'service_unavailable' }, 503);
  }

  const board = await readBoard(env, game_id);
  const rank = board.findIndex(entry => entry.s === score && entry.i === initials) + 1;
  return json({ game_id, board, accepted: true, your_score: score, your_rank: rank || null });
}
