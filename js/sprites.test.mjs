/**
 * Sprite guard.
 *
 * Pixel art authored as text is one miscounted character away from a
 * lopsided drawing, and a missing sprite leaves a cartridge with a hole
 * where its logo should be. Both are cheap to assert and invisible to
 * eyeball across 88 games.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPRITES, spriteFor } from './sprites.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const ids = appSource.split('const gamesCatalog = [')[1].split('\n];')[0]
  .split('\n').filter(l => /^\s*\{\s*id:/.test(l))
  .map(l => l.match(/id: '([^']+)'/)[1]);

assert.ok(ids.length > 80, `expected the full catalog, parsed ${ids.length}`);

/* 1. Every cartridge on the floor has a logo. No holes. */
const missing = ids.filter(id => !SPRITES[id]);
assert.deepEqual(missing, [], `games with no 8-bit logo: ${missing.join(', ')}`);

/* 2. Nothing is drawn for a game that does not exist. */
const orphans = Object.keys(SPRITES).filter(id => !ids.includes(id));
assert.deepEqual(orphans, [], `sprites for non-existent games: ${orphans.join(', ')}`);

/* 3. Every grid is exactly 12×12 — a short row skews the whole drawing. */
const LEGAL = new Set(['.', '#', '+', '-', 'r', 'b', 'g']);
const shape = [];
const chars = [];
for (const [id, grid] of Object.entries(SPRITES)) {
  if (grid.length !== 12) shape.push(`${id}: ${grid.length} rows`);
  grid.forEach((row, y) => {
    if (row.length !== 12) shape.push(`${id} row ${y}: ${row.length} cols "${row}"`);
    for (const ch of row) if (!LEGAL.has(ch)) chars.push(`${id} row ${y}: illegal "${ch}"`);
  });
}
assert.deepEqual(shape, [], `off-grid sprites:\n  ${shape.join('\n  ')}`);
assert.deepEqual(chars, [], `off-palette pixels:\n  ${chars.join('\n  ')}`);

/* 4. Colour is the one named exception, not a habit — see sprites.js header. */
const coloured = Object.entries(SPRITES)
  .filter(([, g]) => g.some(r => /[rbg]/.test(r))).map(([id]) => id);
assert.deepEqual(coloured, ['stroop-match'],
  `only stroop-match may use colour (§14 r1); found: ${coloured.join(', ')}`);

/* 5. A blank sprite renders nothing — catches an all-dots grid. */
const blank = Object.keys(SPRITES).filter(id => !/rect/.test(decodeURIComponent(spriteFor(id))));
assert.deepEqual(blank, [], `sprites that draw nothing: ${blank.join(', ')}`);

/* 6. The amber-ground variant must actually differ, or the hero sprite is
   invisible on the amber feature panel (§11.10) while looking fine in code. */
const sameOnAmber = Object.keys(SPRITES)
  .filter(id => spriteFor(id, 'ink') === spriteFor(id, 'amber'));
assert.deepEqual(sameOnAmber, [], `no ink variant, will vanish on amber: ${sameOnAmber.join(', ')}`);
assert.ok(!decodeURIComponent(spriteFor('cyber-pacman', 'ink')).includes('#f59e0b'),
  'the ink variant still paints amber on an amber ground');

console.log(`sprites: ${Object.keys(SPRITES).length} 8-bit logos, all 12×12 and on-palette`);
