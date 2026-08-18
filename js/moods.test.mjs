/**
 * Guards the mood picker against dead buttons.
 *
 * Why this test exists: every mood is a predicate over the catalog, and the
 * UI renders one button per mood unconditionally. If a predicate matches
 * nothing — because a category was renamed, a tag was retyped, or the games
 * it pointed at were retired — the button still renders and still looks
 * inviting, but clicking it does nothing at all. `moodPick` returns early on
 * an empty pool, so there is no error, no console warning, and no visible
 * failure. A visitor just taps and the floor ignores them.
 *
 * That is the worst kind of bug in a space that is supposed to feel magical:
 * silent, invisible in review, and only ever discovered by a real person
 * being quietly let down. So the pools get asserted, not assumed.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOODS, moodById, gamesForMood, moodsForGame } from './moods.js';

/* Parse the catalog the way catalog.test.mjs does, but keep the fields the
   mood predicates actually read: wing, category, age, tags. */
const source = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const block = source.split('const gamesCatalog = [')[1].split('\n];')[0];

const catalog = block
  .split('\n')
  .filter(line => /^\s*\{\s*id:\s*'/.test(line))
  .map(line => {
    const pick = key => line.match(new RegExp(`\\b${key}:\\s*'((?:\\\\'|[^'])*)'`))?.[1];
    const tagsRaw = line.match(/\btags:\s*\[([^\]]*)\]/)?.[1] ?? '';
    return {
      id: pick('id'),
      title: pick('title'),
      wing: pick('wing'),
      category: pick('category'),
      age: pick('age'),
      tags: [...tagsRaw.matchAll(/'((?:\\'|[^'])*)'/g)].map(m => m[1].replace(/\\'/g, "'"))
    };
  });

assert.ok(catalog.length >= 80, `expected the full floor, parsed ${catalog.length}`);
const playable = catalog.filter(g => g.wing !== 'meta');

/* --- shape ------------------------------------------------------------- */
const ids = MOODS.map(m => m.id);
assert.equal(new Set(ids).size, ids.length, `duplicate mood ids: ${ids.join(', ')}`);
const labels = MOODS.map(m => m.label);
assert.equal(new Set(labels).size, labels.length, `duplicate mood labels: ${labels.join(', ')}`);

for (const mood of MOODS) {
  assert.ok(mood.id?.trim(), 'every mood needs an id');
  assert.ok(mood.label?.trim(), `${mood.id} needs a label`);
  assert.ok(mood.blurb?.trim(), `${mood.id} needs a blurb`);
  assert.equal(typeof mood.match, 'function', `${mood.id} needs a match predicate`);
  assert.equal(moodById(mood.id), mood, `moodById('${mood.id}') must resolve`);
}
assert.equal(moodById('no-such-mood'), null, 'unknown mood id must resolve to null');

/* --- no dead buttons --------------------------------------------------- */
const sizes = {};
for (const mood of MOODS) {
  const pool = gamesForMood(mood, catalog);
  sizes[mood.label] = pool.length;
  assert.ok(
    pool.length > 0,
    `mood "${mood.label}" (${mood.id}) matches no cartridge — the button would render and do nothing`
  );
  assert.ok(
    pool.every(g => g.wing !== 'meta'),
    `mood "${mood.label}" must never offer a meta entry (About is not a game)`
  );
}
assert.deepEqual(gamesForMood(null, catalog), [], 'a null mood yields no games');

/* --- predicates must be total ------------------------------------------ */
for (const game of catalog) {
  for (const mood of MOODS) {
    assert.doesNotThrow(
      () => mood.match(game),
      `mood "${mood.label}" threw on ${game.id} — a predicate must handle every catalog shape`
    );
  }
}

/* --- meta is never moody ----------------------------------------------- */
for (const meta of catalog.filter(g => g.wing === 'meta')) {
  assert.deepEqual(moodsForGame(meta), [], `${meta.id} is meta and must carry no moods`);
}

/* --- coverage: report the carts no mood can reach ---------------------- */
const unreachable = playable.filter(g => moodsForGame(g).length === 0);
const covered = playable.length - unreachable.length;
const pct = Math.round((covered / playable.length) * 100);
assert.ok(
  pct >= 75,
  `only ${pct}% of playable carts are reachable by any mood; unreachable: ${unreachable.map(g => g.id).join(', ')}`
);

console.log(
  `moods: ${MOODS.length} moods, every pool non-empty, ${covered}/${playable.length} carts reachable (${pct}%)`
);
console.log(`  pools · ${Object.entries(sizes).map(([l, n]) => `${l}:${n}`).join(' · ')}`);
if (unreachable.length) {
  console.log(`  mood-unreachable (search/wings still find them): ${unreachable.map(g => g.id).join(', ')}`);
}
