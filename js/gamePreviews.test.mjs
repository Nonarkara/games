/**
 * Preview coverage guard.
 *
 * Why this test exists: previewHtmlFor() falls back to a generic
 * "▶ PLAY / +10" tile for any cartridge missing from its MAP. That fallback
 * is silent — the cart renders, the briefing looks complete, and the player
 * is shown a picture that teaches them nothing about the actual game. Six
 * cartridges shipped exactly that way before this file existed (the Mind Gym
 * six: verbal-fluency, digit-symbol, reversi, dots-boxes, flood-it,
 * peg-solitaire).
 *
 * The rule being protected: every cartridge in gamesCatalog must have an
 * explicit preview, OR be on the small allowlist of surfaces that legitimately
 * do not need one.
 *
 * The self-test at the bottom removes an entry from the map and requires this
 * file to fail. A check that cannot fail is decoration.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { previewTypeFor, previewHtmlFor } from './gamePreviews.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const previewSource = readFileSync(new URL('./gamePreviews.js', import.meta.url), 'utf8');

const catalog = appSource
  .split('const gamesCatalog = [')[1]
  .split('\n];')[0]
  .split('\n')
  .filter(line => /^\s*\{\s*id:/.test(line))
  .map(line => {
    const pick = key => (line.match(new RegExp(`${key}: ['"]([^'"]+)['"]`)) || [])[1] || '';
    return { id: pick('id'), title: pick('title') };
  });

assert.ok(catalog.length > 100, `expected the full catalog, parsed ${catalog.length}`);

/* 1. Every cartridge resolves to a real scene, never the generic fallback. */
const generic = catalog.filter(g => previewTypeFor(g.id) === 'generic');
assert.deepEqual(
  generic.map(g => g.id), [],
  `these cartridges show the generic PLAY tile instead of their own scene: ${generic.map(g => g.id).join(', ')}`
);

/* 2. The map must not carry entries for carts that no longer exist. */
const mappedIds = new Set(
  [...previewSource.split('const MAP = {')[1].split('\n};')[0].matchAll(/'([a-z0-9-]+)':/g)].map(m => m[1])
);
const catalogIds = new Set(catalog.map(g => g.id));
const orphans = [...mappedIds].filter(id => !catalogIds.has(id));
assert.deepEqual(orphans, [], `preview map has entries for carts not in the catalog: ${orphans.join(', ')}`);

/* 3. Every declared scene type actually exists in the scenes object. A typo'd
 *    type name would render an empty frame with no error. */
const declared = new Set(
  [...previewSource.split('const MAP = {')[1].split('\n};')[0].matchAll(/:\s*'([a-z0-9]+)'/g)].map(m => m[1])
);
const defined = new Set(
  [...previewSource.split('const scenes = {')[1].split('\n  };')[0].matchAll(/^\s{4}([a-z0-9]+):/gm)].map(m => m[1])
);
const undefinedTypes = [...declared].filter(t => !defined.has(t));
assert.deepEqual(undefinedTypes, [], `preview map names scenes that do not exist: ${undefinedTypes.join(', ')}`);

/* 4. Rendered output must be non-empty and carry the caption that teaches. */
for (const game of catalog) {
  const html = previewHtmlFor(game);
  assert.ok(html && html.length > 80, `${game.id} renders an empty preview`);
  assert.ok(/class="pv-cap"/.test(html), `${game.id} preview has no caption line`);
}

/* 5. Self-test — mutation check. Drop a real cartridge from the map and this
 *    file must go red. If it stays green the guard above is not a guard. */
{
  const mutated = previewSource.replace(/^\s*'chess':\s*'chess',?\s*$/m, '');
  assert.notEqual(mutated, previewSource, 'self-test failed to remove the chess entry — pattern drifted');
  const mutatedIds = new Set(
    [...mutated.split('const MAP = {')[1].split('\n};')[0].matchAll(/'([a-z0-9-]+)':/g)].map(m => m[1])
  );
  const wouldFail = catalog.map(g => g.id).filter(id => !mutatedIds.has(id));
  assert.ok(wouldFail.length > 0, 'a missing map entry must be detectable');
}

console.log(`previews: ${catalog.length} cartridges, every one with its own scene and caption`);