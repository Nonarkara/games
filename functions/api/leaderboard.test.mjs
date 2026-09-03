/**
 * Guards the server-side score allowlist against drift.
 *
 * Why this test exists: the shared GAME_MAX map is hand-maintained.
 * Adding a cartridge to gamesCatalog without adding it here makes the game
 * look fine locally — localStorage still records the score — while every
 * submission to the global board is silently rejected with `unknown_game`.
 * That is exactly what happened when Posner / Change Blindness / Operation
 * Span shipped. A missing ceiling is invisible in the UI, so it needs a test.
 *
 * `about-dr-non` is intentionally excluded: it is the meta wing (wing:'meta'),
 * not a scoring cartridge.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_MAX } from '../_shared/games.js';
import { INITIALS_RE } from '../../js/scoreGate.js';

const appSource = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');

const allowed = new Set(Object.keys(GAME_MAX));

const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];
const entries = [...catalogBlock.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?wing:\s*'([^']+)'/g)]
  .map(m => ({ id: m[1], wing: m[2] }));

assert.ok(entries.length > 40, `expected a full catalog, parsed ${entries.length}`);

const scoring = entries.filter(e => e.wing !== 'meta');
const missing = scoring.filter(e => !allowed.has(e.id)).map(e => e.id);
assert.deepEqual(missing, [], `games missing a GAME_MAX ceiling (scores would be rejected as unknown_game): ${missing.join(', ')}`);

// Every ceiling must be a positive finite number, or a valid score can never pass.
for (const [id, n] of Object.entries(GAME_MAX)) {
  assert.ok(Number.isFinite(n) && n > 0, `ceiling for ${id} must be a positive number, got ${n}`);
}

// Ceilings that no longer map to a catalog entry are dead weight — flag them.
const catalogIds = new Set(entries.map(e => e.id));
const orphans = [...allowed].filter(id => !catalogIds.has(id));
assert.deepEqual(orphans, [], `GAME_MAX has ceilings for games not in the catalog: ${orphans.join(', ')}`);

console.log(`leaderboard allowlist: ${scoring.length} scoring games, all with ceilings`);

/* ---------------------------------------------------------------------------
 * Client and server must agree on what a legal set of initials is.
 * storage.js caps at INITIALS_LEN but submits shorter strings verbatim, so a
 * server rule of "exactly N" silently drops real users' scores.
 * ------------------------------------------------------------------------ */
const storageSource = readFileSync(new URL('../../js/storage.js', import.meta.url), 'utf8');
const clientLen = Number(storageSource.match(/INITIALS_LEN\s*=\s*(\d+)/)?.[1]);
assert.ok(Number.isInteger(clientLen) && clientLen > 0, 'client INITIALS_LEN must be a positive integer');

const re = INITIALS_RE;
for (let n = 1; n <= clientLen; n++) {
  const sample = 'A'.repeat(n);
  assert.ok(re.test(sample), `server rejects ${n}-char initials ("${sample}") that the client can produce`);
}
assert.ok(!re.test('A'.repeat(clientLen + 1)), `server must reject initials longer than ${clientLen}`);
assert.ok(!re.test('a!'), 'server must reject non-alphanumeric initials');

console.log(`initials contract: client caps at ${clientLen}, server accepts 1–${clientLen}`);
