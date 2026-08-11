import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyToLMove, minimumToLMoves, prepareEyesTrial, TOL_CAPACITIES, wcstBucketFor } from './ngsNewTrainers3.js';
import {
  WAREHOUSE_LEVELS,
  lightsSolved,
  makeLightsPuzzle,
  moveWarehouse,
  nextStopDelay,
  parseWarehouse,
  scoreStopSignal,
  toggleLights,
  warehouseSolved
} from './ngsExpansionSuite.js';

// WCST: every dimension maps to the stable reference cards without exposing the rule.
const probe = { color: 'green', shape: 'star', count: 1 };
assert.equal(wcstBucketFor(probe, 'color'), 1);
assert.equal(wcstBucketFor(probe, 'shape'), 2);
assert.equal(wcstBucketFor(probe, 'count'), 0);

// Tower of London: capacity, not ball size, governs legal moves; every target has a finite par.
const tolStart = [['red', 'green'], ['blue'], []];
assert.deepEqual(TOL_CAPACITIES, [3, 2, 1]);
assert.deepEqual(applyToLMove(tolStart, 0, 2), [['red'], ['blue'], ['green']]);
assert.equal(applyToLMove([[], ['red', 'blue'], ['green']], 2, 1), null, 'full peg must reject a move');
assert.equal(minimumToLMoves(tolStart, [['blue', 'green'], ['red'], []]), 7);

// The schematic social-inference drill must not teach "first answer is correct."
const eyes = prepareEyesTrial({ word: 'PLAYFUL', options: ['PLAYFUL', 'SERIOUS', 'ANGRY', 'CONFUSED'] }, () => 0);
assert.notEqual(eyes.correct, 0);
assert.equal(eyes.options[eyes.correct], 'PLAYFUL');

// Stop-signal staircase moves toward ~50% successful inhibition and remains bounded.
assert.equal(nextStopDelay(250, true), 300);
assert.equal(nextStopDelay(250, false), 200);
assert.equal(nextStopDelay(500, true), 500);
assert.equal(nextStopDelay(100, false), 100);
assert.equal(scoreStopSignal({ goCorrect: 18, goErrors: 0, stopSuccess: 6, stopFails: 0 }), 150);

function warehouseKey(state) {
  return `${state.player}|${[...state.crates].sort().join(';')}`;
}

function canSolveWarehouse(source) {
  const start = parseWarehouse(source);
  assert.equal(start.crates.size, start.goals.size, 'each warehouse needs one goal per crate');
  const queue = [start];
  const seen = new Set([warehouseKey(start)]);
  while (queue.length) {
    const state = queue.shift();
    if (warehouseSolved(state)) return true;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const next = moveWarehouse(state, dr, dc);
      if (!next) continue;
      const key = warehouseKey(next);
      if (!seen.has(key)) { seen.add(key); queue.push(next); }
    }
  }
  return false;
}

WAREHOUSE_LEVELS.forEach((source, i) => assert.ok(canSolveWarehouse(source), `warehouse room ${i + 1} must be solvable`));

// Lights Out is reversible and generated boards carry a valid solving press set.
for (const size of [3, 4, 5]) {
  const blank = Array(size * size).fill(false);
  const once = toggleLights(blank, size, Math.floor(size * size / 2));
  assert.deepEqual(toggleLights(once, size, Math.floor(size * size / 2)), blank, 'a press must be its own inverse');
  const presses = [0, Math.floor(size * size / 2), size * size - 1];
  const puzzle = makeLightsPuzzle(size, presses);
  let solved = puzzle.board;
  presses.forEach(index => { solved = toggleLights(solved, size, index); });
  assert.ok(lightsSolved(solved), `${size}x${size} generated puzzle must be solvable`);
}

// Type Rush signs the board with WPM—the metric named in its UI—not a hidden composite.
const curatedSource = readFileSync(new URL('./curatedGames.js', import.meta.url), 'utf8');
const typeRushSource = curatedSource.split('export function renderTypeRush')[1].split('export function renderSlide2048')[0];
assert.match(typeRushSource, /score:\s*wpm[,\n]/);
assert.doesNotMatch(typeRushSource, /score:\s*wpm\s*\*/);

console.log('mechanics: WCST secrecy, ToL rules, eye-option shuffle, stop staircase, warehouse reachability, Lights Out parity, and WPM scoring passed');
