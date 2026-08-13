import { requireUser } from '../_shared/auth.js';
import { GAME_MAX } from '../_shared/games.js';
import { json, readJson, sameOrigin } from '../_shared/http.js';

const MAX_EVENTS = 100;
const INITIALS_RE = /^[A-Z0-9]{1,4}$/;

function cleanSnapshot(raw) {
  const highScores = {};
  for (const [gameId, value] of Object.entries(raw?.highScores || {})) {
    const score = Number(value);
    if (GAME_MAX[gameId] != null && Number.isFinite(score) && score >= 0) {
      highScores[gameId] = Math.min(Math.floor(score), GAME_MAX[gameId]);
    }
  }
  const favoriteStates = {};
  for (const [gameId, state] of Object.entries(raw?.favoriteStates || {})) {
    if (GAME_MAX[gameId] == null || Object.keys(favoriteStates).length >= 200) continue;
    favoriteStates[gameId] = {
      value: Boolean(state?.value),
      updatedAt: Math.min(Date.now() + 300000, Math.max(0, Math.floor(Number(state?.updatedAt) || 0)))
    };
  }
  for (const gameId of (Array.isArray(raw?.favorites) ? raw.favorites : []).map(String)) {
    if (GAME_MAX[gameId] != null && favoriteStates[gameId] == null && Object.keys(favoriteStates).length < 200) {
      favoriteStates[gameId] = { value: true, updatedAt: 0 };
    }
  }
  const favorites = Object.entries(favoriteStates).filter(([, state]) => state.value).map(([gameId]) => gameId);
  const gamesPlayed = Math.min(1000000, Math.max(0, Math.floor(Number(raw?.gamesPlayed) || 0)));
  const lastInitials = INITIALS_RE.test(String(raw?.lastInitials || '')) ? String(raw.lastInitials) : '';
  return { highScores, favorites, favoriteStates, gamesPlayed, lastInitials };
}

function cleanEvents(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.slice(-MAX_EVENTS).flatMap(event => {
    const eventId = String(event?.eventId || '');
    const gameId = String(event?.gameId || '');
    if (!/^[A-Za-z0-9_-]{12,64}$/.test(eventId) || seen.has(eventId) || GAME_MAX[gameId] == null) return [];
    seen.add(eventId);
    return [{
      eventId,
      gameId,
      category: String(event?.category || 'unknown').slice(0, 40),
      score: Math.min(GAME_MAX[gameId], Math.max(0, Math.floor(Number(event?.score) || 0))),
      durationMs: Math.min(86400000, Math.max(0, Math.floor(Number(event?.durationMs) || 0))),
      timestamp: Math.min(Date.now() + 300000, Math.max(0, Math.floor(Number(event?.timestamp) || Date.now())))
    }];
  });
}

async function readState(env, userId) {
  const row = await env.DB.prepare(
    'SELECT payload_json, revision, updated_at FROM user_snapshots WHERE user_id = ?1'
  ).bind(userId).first();
  const { results } = await env.DB.prepare(
    `SELECT event_id AS eventId, game_id AS gameId, category, score,
            duration_ms AS durationMs, played_at AS timestamp
       FROM user_play_events WHERE user_id = ?1 ORDER BY played_at DESC LIMIT 500`
  ).bind(userId).all();
  let snapshot = cleanSnapshot({});
  try { if (row?.payload_json) snapshot = cleanSnapshot(JSON.parse(row.payload_json)); } catch { /* clean empty snapshot */ }
  return { snapshot, revision: row?.revision || 0, updated_at: row?.updated_at || null, events: (results || []).reverse() };
}

export async function onRequestGet({ request, env }) {
  try {
    const auth = await requireUser(request, env);
    if (!auth.ok) return auth.response;
    return json(await readState(env, auth.user.id));
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request, env.PUBLIC_ORIGIN)) return json({ error: 'origin_rejected' }, 403);
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  try {
    const auth = await requireUser(request, env);
    if (!auth.ok) return auth.response;
    const snapshot = cleanSnapshot(parsed.value?.snapshot);
    const events = cleanEvents(parsed.value?.events);
    const baseRevision = Math.max(0, Math.floor(Number(parsed.value?.base_revision) || 0));
    const now = Date.now();
    let write;
    if (baseRevision === 0) {
      write = await env.DB.prepare(
        'INSERT OR IGNORE INTO user_snapshots (user_id, payload_json, revision, updated_at) VALUES (?1, ?2, 1, ?3)'
      ).bind(auth.user.id, JSON.stringify(snapshot), now).run();
    } else {
      write = await env.DB.prepare(
        `UPDATE user_snapshots SET payload_json = ?1, revision = revision + 1, updated_at = ?2
          WHERE user_id = ?3 AND revision = ?4`
      ).bind(JSON.stringify(snapshot), now, auth.user.id, baseRevision).run();
    }
    if (!write.meta?.changes) return json({ error: 'revision_conflict', ...(await readState(env, auth.user.id)) }, 409);

    if (events.length) {
      await env.DB.batch(events.map(event => env.DB.prepare(
        `INSERT OR IGNORE INTO user_play_events
          (event_id, user_id, game_id, category, score, duration_ms, played_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
      ).bind(event.eventId, auth.user.id, event.gameId, event.category, event.score, event.durationMs, event.timestamp, now)));
    }
    return json({ ok: true, ...(await readState(env, auth.user.id)) });
  } catch {
    return json({ error: 'service_unavailable' }, 503);
  }
}

export const _test = { cleanSnapshot, cleanEvents };
