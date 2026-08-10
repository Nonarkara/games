/**
 * GET  /api/leaderboard?game_id=X  → { game_id, board: [{ i, s, d }] }
 * POST /api/leaderboard  { game_id, initials, score, session_id }
 *   → { game_id, board, accepted: true, your_score, your_rank }
 *
 * Tamper resistance (in order of defense):
 *   1. Session must exist, be unused, not expired, and match game_id
 *   2. Initials must be 1–4 chars, [A-Z0-9]
 *   3. Score must satisfy  0 <= score <= GAME_MAX[game_id]
 *   4. UNIQUE(session_id) on scores prevents double-submit even if
 *      a session is somehow reused
 *
 * The board is the top 5 scores for the game, sorted descending.
 *
 * GAME_MAX is the only authoritative input. It encodes what is achievable
 * in a single round. A cheater who invents a session can still not exceed
 * the max. For games where lower-is-better (Trail Making), the server
 * stores the score as-is and the client converts at submit time.
 *
 * CORS: open. The site is the same origin, but we set * anyway for
 *     tooling and analytics.
 */

const GAME_MAX = {
  // TRAIN
  'dual-n-back':     30,    // max N-back level achieved
  'digit-span':      20,    // max digits recalled
  'stroop-match':    100,   // accuracy % (×10 internally)
  'go-nogo':         100,   // accuracy %
  'simon-seq':       30,    // max sequence length
  'schulte-table':   60,    // seconds; lower is better — store inverted
  'visual-search':   100,   // accuracy %
  'corsi-blocks':    12,    // max blocks recalled
  'memory-palace':   50,    // objects recalled
  'flanker':         100,   // accuracy %
  'aim-trainer':     300,   // inverted from seconds (300 - time, lower is better)
  'mental-math':     100,   // correct answers
  'type-rush':       200,   // WPM
  'reflex-matrix':   100,   // hits
  'trail-making':    600,   // inverted from seconds (600 - time, lower is better)
  'mental-rotation': 200,   // correct * 10 - wrong * 5, max 200
  'iowa-gambling':   2000,  // net + 1000, range -1000..+1000
  'posner-cueing':   1200,  // (700 - validRT) + cueEffect*2 - errors*25
  'change-blindness':1200,  // 6 rounds × max(20, 200 - secs*8)
  'operation-span':  600,   // 18 letters × 20 + 4 perfect-set bonuses × 40
  'chimp-test':      1200,  // 15 trials, best case levels 4→9 then 9s, ×10
  'calibration':     100,   // 10 intervals × 10
  'monty-hall':      150,   // 15 rounds × 10
  // ARCADE
  'cyber-tetris':    999999,
  'cyber-pacman':    99999,
  'cyber-snake':     99999,
  'space-defender':  99999,
  'flappy-bird':     999,
  'minesweeper':     600,   // inverted
  'slide-2048':      131072, // 2^17
  'cyber-blackjack': 10000,
  'trivia-master':   100,
  'pattern-breaker': 20,
  'arcade-breakout': 99999,
  'arcade-pong':     21,
  'rom-loader':      1,
  'ai-sandbox':      1,
  // LEARN
  'number-chain':    50,
  'tower-hanoi':     1000,  // inverted
  'anagram-scramble':100,
  'word-builder':    100,
  'periodic-quest':  50,
  'capital-quiz':    50,
  'math-safari':     100,
  'memory-match':    600,   // inverted
  'word-search':     300,   // inverted
  'sudoku-sprint':   600,   // inverted
  'fifteen-puzzle':  300,   // inverted
  // LABS
  'non-trivial':     50,
  'blow-cartridge':  50,
  'kings-cup':       52,    // 52 cards in the deck
  'never-have-i':    50,    // 50 statements
  'most-likely':     40,    // 40 prompts
  'cog-reflection':  30,    // 3 questions * 10
  'raven-matrices':  80,    // 8 puzzles * 10
  'sternberg':       240,   // 24 trials * 10
  'number-sense':    600,   // 60 trials * 10
  'wcst':            240,   // 24 trials * 10
  'tower-london':    200,   // 4 puzzles * 50
  'mind-eyes':       80,    // 8 trials * 10
  'ride-the-bus':    100,   // streak score
  'power-hour':      600,   // 60 prompts * 10
  'buzz-21':         100,   // rounds
  'truth-or-dare':   100,   // rounds
  'higher-lower':    100,   // streak score
  'two-truths':      100    // 5 rounds * 20
};

// 1–4, not exactly 4. The client caps at INITIALS_LEN but happily submits
// shorter — someone signing "AB" is a real user, not a malformed request.
// Requiring exactly 4 here silently dropped those scores from the global board.
const INITIALS_RE = /^[A-Z0-9]{1,4}$/;

function jsonResponse(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      ...extraHeaders
    }
  });
}

async function readBoard(env, game_id) {
  const { results } = await env.DB.prepare(
    'SELECT initials AS i, score AS s, date AS d FROM scores WHERE game_id = ?1 ORDER BY score DESC, created_at ASC LIMIT 5'
  ).bind(game_id).all();
  return results || [];
}

async function validateSession(env, session_id, game_id) {
  const row = await env.DB.prepare(
    'SELECT game_id, used, expires_at FROM sessions WHERE session_id = ?1'
  ).bind(session_id).first();
  if (!row) return { ok: false, reason: 'unknown_session' };
  if (row.used) return { ok: false, reason: 'session_used' };
  if (Date.now() > row.expires_at) return { ok: false, reason: 'session_expired' };
  if (row.game_id !== game_id) return { ok: false, reason: 'session_game_mismatch' };
  return { ok: true };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const game_id = url.searchParams.get('game_id');
  if (!game_id) return jsonResponse({ error: 'game_id_required' }, 400);
  const board = await readBoard(env, game_id);
  return jsonResponse({ game_id, board });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'invalid_json' }, 400); }

  const game_id    = String(body?.game_id || '').trim();
  const initials   = String(body?.initials || '').toUpperCase();
  const score      = Number(body?.score);
  const session_id = String(body?.session_id || '').trim();

  if (!game_id) return jsonResponse({ error: 'game_id_required' }, 400);
  if (!session_id) return jsonResponse({ error: 'session_id_required' }, 400);
  if (!INITIALS_RE.test(initials)) return jsonResponse({ error: 'initials_must_be_1_to_4_alnum' }, 400);
  if (!Number.isFinite(score) || score < 0) return jsonResponse({ error: 'invalid_score' }, 400);
  const max = GAME_MAX[game_id];
  if (max == null) return jsonResponse({ error: 'unknown_game' }, 400);
  if (score > max) return jsonResponse({ error: 'score_above_max', max }, 400);

  const session = await validateSession(env, session_id, game_id);
  if (!session.ok) return jsonResponse({ error: 'session_invalid', reason: session.reason }, 400);

  const date = new Date().toISOString().slice(0, 10);
  const created_at = Date.now();

  try {
    // Mark the session used + insert the score in a single batch. The
    // UNIQUE(session_id) constraint on scores is the backstop if the
    // session was somehow already consumed.
    await env.DB.batch([
      env.DB.prepare('UPDATE sessions SET used = 1 WHERE session_id = ?1').bind(session_id),
      env.DB.prepare(
        'INSERT INTO scores (game_id, initials, score, date, session_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
      ).bind(game_id, initials, score, date, session_id, created_at)
    ]);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes('UNIQUE')) return jsonResponse({ error: 'session_already_used' }, 409);
    return jsonResponse({ error: 'db_error', detail: msg }, 500);
  }

  const board = await readBoard(env, game_id);
  const rank = board.findIndex(e => e.s === score && e.i === initials) + 1; // 0 = not on board
  return jsonResponse({ game_id, board, accepted: true, your_score: score, your_rank: rank || null });
}

export async function onRequestOptions() {
  return jsonResponse({}, 204);
}
