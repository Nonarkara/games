/**
 * Search discoverability guard.
 *
 * Born from a real failure: the colour game shipped as "Stroop Match" and
 * was unfindable, because search was matching perfectly against copy that
 * never said "colour". Working search over the wrong vocabulary is still a
 * dead end, so the vocabulary itself needs a test.
 *
 * Mirrors the matcher in app.js#filteredGames exactly. If that changes,
 * change this with it.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEARCH_ALIASES } from './searchAliases.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('\n];')[0];

// Parse one object literal per catalog line — the catalog is one game per line.
const games = catalogBlock.split('\n')
  .filter(l => /^\s*\{\s*id:/.test(l))
  .map(line => {
    const pick = (k) => (line.match(new RegExp(`${k}:\\s*'((?:[^'\\\\]|\\\\.)*)'`)) || [])[1] || '';
    const tags = (line.match(/tags:\s*\[([^\]]*)\]/) || [])[1] || '';
    return {
      id: pick('id'), title: pick('title'), desc: pick('desc'),
      domain: pick('domain'), code: pick('code'), paper: pick('paper'),
      tags: tags.replace(/['"]/g, ' ')
    };
  });

assert.ok(games.length > 80, `expected the full catalog, parsed ${games.length}`);

const words = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const squash = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const hayFor = g => [g.title, g.desc, g.domain, g.code, g.tags, g.paper,
                     (SEARCH_ALIASES[g.id] || []).join(' ')].join(' ');

function search(q) {
  const qw = words(q), qs = squash(q);
  return games.filter(g => {
    const hay = hayFor(g);
    return qw.split(' ').every(t => words(hay).includes(t)) || squash(hay).includes(qs);
  }).map(g => g.id);
}

/* 1. Every alias key must name a real game — a typo'd id is a silent dead end. */
const ids = new Set(games.map(g => g.id));
const orphans = Object.keys(SEARCH_ALIASES).filter(id => !ids.has(id));
assert.deepEqual(orphans, [], `aliases for non-existent games: ${orphans.join(', ')}`);

/* 2. The queries a real person types must land on the right game. */
const MUST_FIND = [
  ['colour', 'stroop-match'], ['color', 'stroop-match'], ['red', 'stroop-match'],
  ['yellow', 'stroop-match'], ['ink', 'stroop-match'], ['orange', 'stroop-match'],
  ['colour match pro', 'stroop-match-pro'], ['white answers', 'stroop-match-pro'],
  ['color march', 'color-march-pro'], ['spells red', 'color-march-pro'],
  ['pacman', 'cyber-pacman'], ['pac-man', 'cyber-pacman'], ['pac man', 'cyber-pacman'],
  ['pong', 'arcade-pong'], ['solitaire', 'solitaire'], ['patience', 'solitaire'],
  ['wordle', 'word-guess'], ['chess', 'mate-in-one'], ['tetris', 'cyber-tetris'],
  ['space invaders', 'space-defender'], ['snake', 'cyber-snake'],
  ['maths', 'mental-math'], ['math', 'mental-math'], ['typing', 'type-rush'],
  ['sokoban', 'warehouse-push'], ['mastermind', 'pattern-breaker'],
  ['2048', 'slide-2048'], ['sudoku', 'sudoku-sprint'], ['minesweeper', 'minesweeper'],
  ['connect 4', 'connect-four'], ['four in a row', 'connect-four'],
  ['drinking', 'kings-cup'], ['noughts and crosses', 'tic-tac-toe'],
  ['music', 'ear-trainer'], ['morse', 'morse-code'], ['reaction time', 'reaction-gate'],
  ['tower london', 'tower-london'], ['london tower', 'tower-london'],  // order-free
  ['spot the difference', 'change-blindness'], ['iq test', 'raven-matrices'],
  ['picross', 'nonogram'], ['goat', 'monty-hall'], ['about', 'about-dr-non']
];

const failures = [];
for (const [query, expected] of MUST_FIND) {
  const hits = search(query);
  if (!hits.includes(expected)) failures.push(`"${query}" → ${hits.length ? hits.slice(0, 3).join(',') : 'NOTHING'} (wanted ${expected})`);
}
assert.deepEqual(failures, [], `unfindable:\n  ${failures.join('\n  ')}`);

/* 3. Every game must be reachable by its own title — no orphan cartridges. */
const unreachable = games.filter(g => !search(g.title).includes(g.id)).map(g => g.id);
assert.deepEqual(unreachable, [], `games not findable by their own title: ${unreachable.join(', ')}`);

/* 4. A term nobody has must return nothing, or the matcher is too loose. */
assert.equal(search('zzzqqq').length, 0, 'nonsense query should match nothing');

console.log(`search: ${games.length} games, ${MUST_FIND.length} real-world queries all land`);
