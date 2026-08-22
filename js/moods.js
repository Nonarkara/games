/**
 * Dr Non — Non-Gaming System · Mood picks
 *
 * Keyword search answers "I know what I want". QUICK HIT / PICK FOR ME /
 * SURPRISE answer "just start something". Neither answers the question a
 * visitor actually arrives with: "this is the head I am in right now."
 *
 * Each mood is an honest predicate over the catalog — no hidden weighting,
 * no engagement optimisation. A mood never excludes by played-state; the
 * picker that uses it prefers unplayed carts the same way SURPRISE does,
 * because discovery here stays non-coercive.
 *
 * Predicates read only catalog fields (wing, category, age, tags) and the
 * Brain Guide round length, so the module is pure data + functions and
 * runs in Node for the moods test.
 */
import { getBrainGuide } from './brainGuides.js';

/** Round length in whole minutes ('4–6 min' → 4). 0 when unknown. */
function minuteCount(game) {
  try {
    return Number.parseInt(getBrainGuide(game).minutes, 10) || 0;
  } catch (e) {
    return 0;
  }
}

const hasTag = (game, ...tags) =>
  Array.isArray(game.tags) && game.tags.some(t => tags.includes(t));

export const MOODS = [
  { id: 'quick',       label: 'QUICK FIX',   blurb: 'Round fits three minutes',  match: g => { const m = minuteCount(g); return m > 0 && m <= 3; } },
  { id: 'lock-in',     label: 'LOCK IN',     blurb: 'Research tasks, full focus', match: g => g.wing === 'train' },
  { id: 'nostalgia',   label: 'NOSTALGIA',   blurb: 'The carts you grew up on',  match: g => g.category === 'classics' || g.category === 'retro-vault' || g.id === 'blow-cartridge' },
  { id: 'fast-hands',  label: 'FAST HANDS',  blurb: 'Reflex, aim, timing',       match: g => hasTag(g, 'Reaction', 'Reflex', 'Timing', 'Coordination', 'Precision', 'Shooter') },
  { id: 'word-person', label: 'WORD PERSON', blurb: 'Words and vocabulary',      match: g => g.category === 'language' || hasTag(g, 'Words', 'Spelling', 'Vocabulary', 'Phonics') },
  { id: 'number-head', label: 'NUMBER HEAD', blurb: 'Logic and numbers',         match: g => g.category === 'math-logic' },
  { id: 'slow-burn',   label: 'SLOW BURN',   blurb: 'Longer, deeper sittings',   match: g => minuteCount(g) >= 4 && g.wing !== 'labs' },
  { id: 'party',       label: 'PARTY MODE',  blurb: 'Group play · drinking set is 18+', match: g => g.wing === 'labs' }
];

/** Mood by id, or null. */
export function moodById(id) {
  return MOODS.find(m => m.id === id) || null;
}

/** Every playable cartridge that fits the mood. */
export function gamesForMood(mood, catalog) {
  if (!mood) return [];
  return catalog.filter(g => g.wing !== 'meta' && mood.match(g));
}

/** Every mood a single cartridge fits (search haystack + card badges). */
export function moodsForGame(game) {
  if (game.wing === 'meta') return [];
  return MOODS.filter(m => m.match(game));
}