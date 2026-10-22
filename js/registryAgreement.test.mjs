// Registry-agreement guard: every keyed registry must describe real carts.
//
// Each registry has its own test proving it has no GAPS — every cart has a
// guide, a score band, a preview scene. None of them checked the other
// direction. A cart deleted from the catalog leaves a live entry behind in
// half a dozen maps, every gap-test still passes, and the entry becomes
// unreachable debt that nobody can find because nothing names it.
//
// This is the check the upstream gamedev skill catalog calls "router
// coverage": a skill that exists but is not reachable from the router is not
// done. Same failure, same remedy — assert both directions.
//
// Contract per registry:
//   · no ORPHANS — every key is a real catalog id
//   · no GAPS   — every playable catalog id is present
//
// A registry may legitimately exclude the meta-wing entry that is not a
// playable cart; those are listed with a reason rather than silently skipped.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAIN_GUIDES } from './brainGuides.js';
import { SEARCH_ALIASES } from './searchAliases.js';
import { GAME_MAX } from '../functions/_shared/games.js';
import { PREVIEW_MAP } from './gamePreviews.js';
import { SCORE_CUTS } from './scoreReadouts.js';

const root = new URL('..', import.meta.url).pathname;

// ── The truth ────────────────────────────────────────────────────────────────
const appSource = readFileSync(join(root, 'js/app.js'), 'utf8');
const catalog = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];
const rows = [...catalog.matchAll(/\{ id: '([^']+)'[^\n]*?wing: '([^']+)'/g)]
  .map(match => ({ id: match[1], wing: match[2] }));
const catalogIds = new Set(rows.map(row => row.id));
const playable = rows.filter(row => row.wing !== 'meta').map(row => row.id);

// ── Registries, keyed by cartridge id ────────────────────────────────────────
// Every registry is now read by IMPORTING it. Two of them (the preview MAP and
// the score CUTS) used to be scraped from source with a regex, on the stated
// ground that they were not importable — they were; they just were not
// exported. The scraper could not see a double-quoted key ("ghost-game": …),
// so an orphan written in Prettier/JSON style passed every run. Probed with a
// planted orphan in each of the five registries, 2 of 7 variants slipped
// through, both of them that parser. An import cannot have a blind spot about
// quoting.
// FAMILY is deliberately absent: it is keyed by skill family (memory, speed,
// reasoning), not by cartridge, so it is shared vocabulary rather than a
// per-cart registry. A map only belongs in this list if a cart id is its key.
const REGISTRIES = [
  { name: 'BRAIN_GUIDES',  keys: Object.keys(BRAIN_GUIDES),  source: 'js/brainGuides.js' },
  { name: 'SEARCH_ALIASES', keys: Object.keys(SEARCH_ALIASES), source: 'js/searchAliases.js' },
  { name: 'GAME_MAX',      keys: Object.keys(GAME_MAX),      source: 'functions/_shared/games.js', exclude: ['about-dr-non'] },
  { name: 'preview MAP',   keys: Object.keys(PREVIEW_MAP), source: 'js/gamePreviews.js' },
  { name: 'CUTS',          keys: Object.keys(SCORE_CUTS), source: 'js/scoreReadouts.js', exclude: ['about-dr-non'] },
];

// ── Assert, both directions ──────────────────────────────────────────────────
const problems = [];

for (const registry of REGISTRIES) {
  const excluded = new Set(registry.exclude || []);
  const expected = playable.filter(id => !excluded.has(id));

  const orphans = [...new Set(registry.keys)].filter(key => !catalogIds.has(key));
  const missing = expected.filter(id => !registry.keys.includes(id));

  if (orphans.length) {
    problems.push(`${registry.name} (${registry.source}) has ${orphans.length} orphan key(s) that match no cartridge: ${orphans.join(', ')}`);
  }
  if (missing.length) {
    problems.push(`${registry.name} (${registry.source}) is missing ${missing.length} cartridge(s): ${missing.join(', ')}`);
  }
}

if (problems.length) {
  assert.fail(
    `the keyed registries do not agree with the catalog:\n${problems.map(p => '  ' + p).join('\n')}\n\n` +
    `A cart deleted from js/app.js leaves its entries behind here. Remove the entry ` +
    `with the cart, or add the cart.`
  );
}

console.log(`registry agreement: ${REGISTRIES.length} registries × ${catalogIds.size} catalog ids — no orphans, no gaps`);
for (const registry of REGISTRIES) {
  const excluded = registry.exclude || [];
  console.log(`  ${registry.name.padEnd(16)} ${String(registry.keys.length).padStart(4)} keys  ${excluded.length ? `(excludes ${excluded.join(', ')})` : ''}`);
}