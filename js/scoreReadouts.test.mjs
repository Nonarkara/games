import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainScore, hasScoreProfile, isNewPersonalBest, resultMark } from './scoreReadouts.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('];')[0];
const gameIds = [...catalogBlock.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);

const skip = new Set(['about-dr-non', 'rom-loader', 'ai-sandbox']);
const missing = gameIds.filter(id => !hasScoreProfile(id));
assert.deepEqual(missing, [], `games missing score profile: ${missing.join(', ')}`);

const dualLow = explainScore('dual-n-back', 20);
assert.equal(dualLow.band, 'rough');
assert.match(dualLow.feel, /square|letter|two turns/i);
assert.match(dualLow.tip, /accuracy|two-back|stable/i);
assert.equal(dualLow.showScale, true);
assert.match(dualLow.range, /Rough/);

const dualHigh = explainScore('dual-n-back', 200);
assert.equal(dualHigh.band, 'sharp');
assert.match(dualHigh.feel, /strong|sharp|clean|heavy/i);

const digitCold = explainScore('digit-span', 0);
assert.equal(digitCold.band, 'rough');
const digitSolid = explainScore('digit-span', 7);
assert.equal(digitSolid.band, 'solid');
const digitSharp = explainScore('digit-span', 9);
assert.equal(digitSharp.band, 'sharp');

const corsiWarm = explainScore('corsi-blocks', 4);
assert.equal(corsiWarm.band, 'warming');
const palaceSolid = explainScore('memory-palace', 5);
assert.equal(palaceSolid.band, 'solid');

const backwardSolid = explainScore('backward-span', 5);
assert.equal(backwardSolid.band, 'solid');
const reactionClean = explainScore('reaction-gate', 400);
assert.equal(reactionClean.band, 'sharp');

const aim = explainScore('aim-trainer', 160);
assert.ok(['warming', 'solid', 'sharp'].includes(aim.band));
assert.match(aim.skill, /hand|aim|calibration|reaction/i);

// Bands tuned to each game's actual score range — without these, the
// eight games below would fall through to defaultCuts(100) and their
// "rough/warming/solid/sharp" labels would mean nothing.
assert.equal(explainScore('asteroids', 50).band, 'rough');
assert.equal(explainScore('asteroids', 250).band, 'warming');
assert.equal(explainScore('asteroids', 500).band, 'solid');
assert.equal(explainScore('asteroids', 750).band, 'sharp');
assert.equal(explainScore('frogger', 50).band, 'rough');
assert.equal(explainScore('frogger', 200).band, 'warming');
assert.equal(explainScore('frogger', 300).band, 'solid');
assert.equal(explainScore('frogger', 450).band, 'sharp');
assert.equal(explainScore('connect-four', 0).band, 'rough');
assert.equal(explainScore('connect-four', 70).band, 'warming');
assert.equal(explainScore('connect-four', 120).band, 'solid');
assert.equal(explainScore('connect-four', 180).band, 'sharp');
assert.equal(explainScore('solitaire', 100).band, 'rough');
assert.equal(explainScore('solitaire', 400).band, 'warming');
assert.equal(explainScore('solitaire', 600).band, 'solid');
assert.equal(explainScore('solitaire', 750).band, 'sharp');
assert.equal(explainScore('word-guess', 0).band, 'rough');
assert.equal(explainScore('word-guess', 40).band, 'warming');
assert.equal(explainScore('word-guess', 80).band, 'solid');
assert.equal(explainScore('word-guess', 120).band, 'sharp');
assert.equal(explainScore('mate-in-one', 0).band, 'rough');
assert.equal(explainScore('mate-in-one', 60).band, 'warming');
assert.equal(explainScore('mate-in-one', 120).band, 'solid');
assert.equal(explainScore('mate-in-one', 200).band, 'sharp');
assert.equal(explainScore('ear-trainer', 0).band, 'rough');
assert.equal(explainScore('ear-trainer', 40).band, 'warming');
assert.equal(explainScore('ear-trainer', 80).band, 'solid');
assert.equal(explainScore('ear-trainer', 120).band, 'sharp');
assert.equal(explainScore('morse-code', 0).band, 'rough');
assert.equal(explainScore('morse-code', 40).band, 'warming');
assert.equal(explainScore('morse-code', 80).band, 'solid');
assert.equal(explainScore('morse-code', 120).band, 'sharp');

assert.equal(explainScore('paper-soccer', 0).band, 'rough');
assert.equal(explainScore('paper-soccer', 1).band, 'warming');
assert.equal(explainScore('paper-soccer', 2).band, 'solid');
assert.equal(explainScore('paper-soccer', 3).band, 'sharp');

assert.equal(explainScore('about-dr-non', 1), null);
assert.equal(explainScore('aim-trainer', null), null);

// A score of 0 is a cold start, never a personal best — including the
// first run, when the stored high is still 0. Snake and Flappy both land here.
assert.equal(explainScore('cyber-snake', 0).band, 'rough');
assert.equal(explainScore('flappy-bird', 0).band, 'rough');
assert.doesNotMatch(`${explainScore('cyber-snake', 0).title} ${explainScore('flappy-bird', 0).title}`, /best/i);
assert.equal(isNewPersonalBest(0, 0), false);
assert.equal(isNewPersonalBest(undefined, 0), false);
assert.equal(isNewPersonalBest(null, 0), false);
assert.equal(isNewPersonalBest(0, 1), true);
assert.equal(isNewPersonalBest(10, 10), false);
assert.equal(isNewPersonalBest(10, 9), false);
assert.equal(isNewPersonalBest(40, 41), true);

assert.equal(resultMark('win', 10), '✓');
assert.equal(resultMark('win', 0), '•');
assert.equal(resultMark('over', 0), '✕');
assert.equal(resultMark('over', 40), '✕');
assert.equal(resultMark('draw', 0), '•');
assert.equal(resultMark('win', 20, 'rough'), '•');
assert.equal(resultMark('win', 30, 'warming'), '•');
assert.equal(resultMark('win', 10, 'rough'), '•');
assert.equal(resultMark('win', 15, 'warming'), '•');
assert.equal(resultMark('win', 80, 'solid'), '✓');
assert.equal(resultMark('win', 100, 'sharp'), '✓');
assert.equal(resultMark('over', 20, 'rough'), '✕');
assert.equal(explainScore('periodic-quest', 20).band, 'rough');
assert.equal(explainScore('periodic-quest', 30).band, 'rough');
assert.equal(explainScore('periodic-quest', 80).band, 'solid');
assert.equal(explainScore('stroop-match-pro', 10).band, 'rough');
assert.equal(explainScore('ride-the-bus', 15).band, 'warming');

for (const id of ['connect-four', 'go', 'chess', 'checkers', 'reversi', 'tic-tac-toe']) {
  const card = explainScore(id, 0);
  assert.equal(card.showScale, false, `${id} hides the rough/warming scale`);
  assert.equal(card.range, '');
  assert.ok(card.tip && card.tip.length > 12, `${id} has a coaching tip`);
}
assert.match(explainScore('connect-four', 0).tip, /centre/i);
assert.match(explainScore('chess', 0).tip, /opponent/i);

const breakoutLow = explainScore('arcade-breakout', 50);
assert.equal(breakoutLow.band, 'rough');
assert.match(breakoutLow.feel, /paddle|rebound/i);
assert.doesNotMatch(breakoutLow.feel, /window was already gone/);

const capitalLow = explainScore('capital-quiz', 20);
assert.equal(capitalLow.band, 'rough');
assert.match(capitalLow.feel, /capital|country|region/i);
assert.equal(explainScore('capital-quiz', 100).band, 'sharp');

console.log(`score readouts: ${gameIds.filter(id => !skip.has(id)).length} playable games covered`);
