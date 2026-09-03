import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  escapeHtml,
  isSessionId,
  sanitizeBoard,
  scoreInRange
} from './scoreGate.js';
import { sameOrigin, readJson, json } from '../functions/_shared/http.js';

assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
assert.equal(escapeHtml(`a&b"c"'d`), 'a&amp;b&quot;c&quot;&#39;d');

assert.equal(isSessionId('a'.repeat(64)), true);
assert.equal(isSessionId('A'.repeat(64)), false, 'session ids are lowercase hex');
assert.equal(isSessionId('not-a-session'), false);
assert.equal(isSessionId('<script>'), false);

assert.deepEqual(
  sanitizeBoard([
    { i: 'PLUB', s: 80, d: '2026-08-24' },
    { i: '<img>', s: 1, d: '2026-08-24' },
    { i: 'AB', s: 3.5, d: '2026-08-24' },
    { i: 'OK', s: 10, d: 'not-a-date' },
    { i: 'zz', s: 4, d: '2026-09-03' },
    { i: 'DROP', s: 1, d: '2026-09-03' },
    { i: 'SIXTH', s: 1, d: '2026-09-03' }
  ]),
  [
    { i: 'PLUB', s: 80, d: '2026-08-24' },
    { i: 'ZZ', s: 4, d: '2026-09-03' },
    { i: 'DROP', s: 1, d: '2026-09-03' }
  ]
);

assert.equal(scoreInRange(100, 100), true);
assert.equal(scoreInRange(101, 100), false);
assert.equal(scoreInRange(-1, 100), false);
assert.equal(scoreInRange(1.5, 100), false);

const req = (origin, url = 'https://games.nonarkara.org/api/session') =>
  new Request(url, { headers: origin ? { origin } : {} });

assert.equal(sameOrigin(req('https://games.nonarkara.org'), 'https://games.nonarkara.org'), true);
assert.equal(sameOrigin(req('https://evil.example'), 'https://games.nonarkara.org'), false);
assert.equal(sameOrigin(req(null), 'https://games.nonarkara.org'), true, 'missing Origin allowed (non-browser)');
assert.equal(
  sameOrigin(req('https://fd2d2a22.games-bm7.pages.dev', 'https://fd2d2a22.games-bm7.pages.dev/api/session')),
  true
);

const big = await readJson(new Request('https://x.test', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{"game_id":"stroop-match"}'
}), 2048);
assert.equal(big.ok, true);
assert.equal(big.value.game_id, 'stroop-match');

const typed = await readJson(new Request('https://x.test', {
  method: 'POST',
  headers: { 'content-type': 'text/plain' },
  body: '{}'
}), 2048);
assert.equal(typed.ok, false);
assert.equal(typed.response.status, 415);

const parsed = json({ error: 'origin_rejected' }, 403);
assert.equal(parsed.status, 403);
assert.equal(parsed.headers.get('x-content-type-options'), 'nosniff');
assert.equal(parsed.headers.get('cache-control'), 'no-store');

const lb = readFileSync(new URL('../functions/api/leaderboard.js', import.meta.url), 'utf8');
assert.match(lb, /UPDATE sessions SET used = 1 WHERE session_id = \?1 AND used = 0/);
assert.match(lb, /isSessionId/);

const sess = readFileSync(new URL('../functions/api/session.js', import.meta.url), 'utf8');
assert.match(sess, /rateLimit/);
assert.doesNotMatch(sess, /CREATE TABLE/);

const migration = readFileSync(new URL('../migrations/0003_rate_limits.sql', import.meta.url), 'utf8');
assert.match(migration, /CREATE TABLE IF NOT EXISTS api_rate_limits/);

console.log('scoreGate: sanitizer, origin check, session-id shape, and atomic consume guard');
