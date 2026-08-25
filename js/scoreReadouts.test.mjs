import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainScore, hasScoreProfile } from './scoreReadouts.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('];')[0];
const gameIds = [...catalogBlock.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);

const skip = new Set(['about-dr-non', 'rom-loader', 'ai-sandbox']);
const missing = gameIds.filter(id => !hasScoreProfile(id));
assert.deepEqual(missing, [], `games missing score profile: ${missing.join(', ')}`);

const dualLow = explainScore('dual-n-back', 20);
assert.equal(dualLow.band, 'rough');
assert.match(dualLow.feel, /drop|normal|load/i);
assert.match(dualLow.tip, /chunk|round|quiet/i);

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

assert.equal(explainScore('about-dr-non', 1), null);
assert.equal(explainScore('aim-trainer', null), null);

console.log(`score readouts: ${gameIds.filter(id => !skip.has(id)).length} playable games covered`);
