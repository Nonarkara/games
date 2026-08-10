/**
 * Guards the server-side score allowlist against drift.
 *
 * Why this test exists: GAME_MAX in leaderboard.js is a hand-maintained map.
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

const fnSource = readFileSync(new URL('./leaderboard.js', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');

const maxBlock = fnSource.split('const GAME_MAX = {')[1].split('};')[0];
const allowed = new Set([...maxBlock.matchAll(/'([^']+)'\s*:/g)].map(m => m[1]));

const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];
const entries = [...catalogBlock.matchAll(/\{\s*id:\s*'([^']+)'[^}]*?wing:\s*'([^']+)'/g)]
  .map(m => ({ id: m[1], wing: m[2] }));

assert.ok(entries.length > 40, `expected a full catalog, parsed ${entries.length}`);

const scoring = entries.filter(e => e.wing !== 'meta');
const missing = scoring.filter(e => !allowed.has(e.id)).map(e => e.id);
assert.deepEqual(missing, [], `games missing a GAME_MAX ceiling (scores would be rejected as unknown_game): ${missing.join(', ')}`);

// Every ceiling must be a positive finite number, or a valid score can never pass.
for (const [, id, raw] of maxBlock.matchAll(/'([^']+)'\s*:\s*([0-9_]+)/g)) {
  const n = Number(raw.replace(/_/g, ''));
  assert.ok(Number.isFinite(n) && n > 0, `ceiling for ${id} must be a positive number, got ${raw}`);
}

// Ceilings that no longer map to a catalog entry are dead weight — flag them.
const catalogIds = new Set(entries.map(e => e.id));
const orphans = [...allowed].filter(id => !catalogIds.has(id));
assert.deepEqual(orphans, [], `GAME_MAX has ceilings for games not in the catalog: ${orphans.join(', ')}`);

console.log(`leaderboard allowlist: ${scoring.length} scoring games, all with ceilings`);
