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
import {
  MAKE_24_PUZZLES,
  NONOGRAM_PUZZLES,
  applyNimMove,
  combine24,
  nonogramClues,
  nonogramSolved,
  optimalNimMove
} from './ngsLogicSuite.js';
import {
  isOneBackMatch,
  reverseDigits,
  scoreOddball,
  scoreReactionGate
} from './ngsDailySuite.js';

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

// Nonogram clues must reproduce each answer, and filling the answer solves it.
for (const puzzle of NONOGRAM_PUZZLES) {
  const clues = nonogramClues(puzzle.cells);
  assert.equal(clues.rows.length, 5);
  assert.equal(clues.columns.length, 5);
  const state = [...puzzle.cells.join('')].map(cell => cell === '1' ? 1 : 2);
  assert.ok(nonogramSolved(state, puzzle.cells), `${puzzle.name} answer must satisfy its grid`);
  state[0] = state[0] === 1 ? 2 : 1;
  assert.ok(!nonogramSolved(state, puzzle.cells), `${puzzle.name} must reject a wrong cell`);
}

// An optimal Nim move always reaches xor zero when a winning move exists.
for (const heaps of [[3, 4, 5], [1, 5, 7], [2, 6, 7]]) {
  const move = optimalNimMove(heaps);
  const next = applyNimMove(heaps, move.heap, move.count);
  assert.ok(next, 'optimal Nim move must be legal');
  if (heaps.reduce((value, heap) => value ^ heap, 0)) {
    assert.equal(next.reduce((value, heap) => value ^ heap, 0), 0, 'winning Nim move must leave xor zero');
  }
}
assert.equal(applyNimMove([1, 2, 3], 0, 2), null, 'cannot remove more tokens than a heap holds');

// Every Make 24 puzzle is solvable using all numbers once.
function canMake24(values) {
  if (values.length === 1) return Math.abs(values[0] - 24) < 1e-9;
  for (let i = 0; i < values.length; i++) for (let j = 0; j < values.length; j++) {
    if (i === j) continue;
    const rest = values.filter((_, index) => index !== i && index !== j);
    for (const op of ['+', '−', '×', '÷']) {
      const value = combine24(values[i], op, values[j]);
      if (value !== null && Number.isFinite(value) && canMake24([...rest, value])) return true;
    }
  }
  return false;
}
MAKE_24_PUZZLES.forEach(numbers => assert.ok(canMake24(numbers), `Make 24 puzzle ${numbers.join(',')} must be solvable`));

assert.equal(scoreReactionGate({ hits: 20, falseStarts: 0 }), 400);
assert.equal(scoreReactionGate({ hits: 10, falseStarts: 4 }), 140);
assert.equal(isOneBackMatch(3, 3), true);
assert.equal(isOneBackMatch(3, 4), false);
assert.equal(isOneBackMatch(null, 0), false);
assert.deepEqual(reverseDigits([1, 4, 9]), [9, 4, 1]);
assert.equal(scoreOddball({ hits: 6, falseAlarms: 0, misses: 0 }), 120);
assert.equal(scoreOddball({ hits: 4, falseAlarms: 2, misses: 1 }), 36);

// Type Rush signs the board with WPM—the metric named in its UI—not a hidden composite.
const curatedSource = readFileSync(new URL('./curatedGames.js', import.meta.url), 'utf8');
const typeRushSource = curatedSource.split('export function renderTypeRush')[1].split('export function renderSlide2048')[0];
assert.match(typeRushSource, /score:\s*wpm[,\n]/);
assert.doesNotMatch(typeRushSource, /score:\s*wpm\s*\*/);

console.log('mechanics: trainers, warehouse, Lights Out, Nonogram, Nim, Make 24, and WPM scoring passed');
