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
import { checkWinner, findWinningMove, minimaxMove, easyMove, LINES } from './ticTacToe.js';
import { resolveRPS, predictCPU, CHOICES } from './rockPaperScissors.js';
import { generatePattern, checkPattern } from './memoryMatrix.js';
import { numberWord, rollPro } from './mentalMathPro.js';
import { toThai, fromThai, rollThai } from './mentalMathThai.js';
import { STROOP_COLORS, makeColorMarchRound } from './eduGames.js';
import {
  GOALS_TO_WIN,
  MAX_KICK,
  MOVE_FIELD,
  MOVE_GK,
  PITCH,
  applyKick,
  clampMove,
  closestTo,
  createMatch,
  isOffside,
  kickTravel,
  matchScore,
  otherTeam,
  pickCpuKick,
  pickCpuMove,
  possessionPreview,
  powerForAim,
  aimFromPointer,
  placeTeam,
  resolveKick,
  skipMove
} from './paperSoccer.js';

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

// ── Tic-Tac-Toe: win detection, minimax unbeatability, easy-mode logic ──
// All 8 winning lines are distinct
assert.equal(LINES.length, 8);
assert.equal(new Set(LINES.map(l => l.join(','))).size, 8, 'winning lines must be unique');

// Horizontal win
assert.equal(checkWinner(['X','X','X', null,null,null, null,null,null]), 'X');
// Diagonal win
assert.equal(checkWinner(['O',null,null, null,'O',null, null,null,'O']), 'O');
// Draw
assert.equal(checkWinner(['X','O','X','O','X','O','O','X','O']), 'draw');
// Ongoing
assert.equal(checkWinner(['X','O',null,null,null,null,null,null,null]), null);

// findWinningMove detects an immediate win
assert.equal(findWinningMove(['X','X',null, 'O','O',null, null,null,null], 'X'), 2);

// Minimax must be unbeatable: AI playing 'O' against a two-X threat must defend
const threat = ['X','X',null, null,null,null, null,null,null];
const defense = minimaxMove(threat, 'O');
assert.equal(defense, 2, 'minimax must block a two-in-a-row threat');

// Easy mode also blocks immediate threats
const easyDefense = easyMove(threat, 'O');
assert.equal(easyDefense, 2, 'easy mode must block an immediate win');

// Easy mode takes a win when available
const winMove = easyMove(['O','O',null, null,null,null, null,null,null], 'O');
assert.equal(winMove, 2, 'easy mode must take an immediate win');

// ── Rock-Paper-Scissors: resolution + AI prediction ──
assert.equal(resolveRPS('rock','scissors'), 'win');
assert.equal(resolveRPS('paper','rock'), 'win');
assert.equal(resolveRPS('scissors','paper'), 'win');
assert.equal(resolveRPS('rock','paper'), 'lose');
assert.equal(resolveRPS('rock','rock'), 'draw');

// predictCPU returns a valid choice
assert.ok(CHOICES.includes(predictCPU([])));
assert.ok(CHOICES.includes(predictCPU(['rock','rock','rock'])));

// Heavy rock history → CPU should counter with paper (deterministically over many calls)
let paperCount = 0;
for (let i = 0; i < 1000; i++) {
  if (predictCPU(['rock','rock','rock','rock','rock']) === 'paper') paperCount++;
}
assert.ok(paperCount > 400, 'CPU should mostly counter rock-heavy history with paper');

// ── Memory Matrix: pattern generation + checking ──
const pattern4 = generatePattern(4, 3); // 4×4, 3 lit cells
assert.equal(pattern4.size, 3, 'pattern should have exactly 3 cells');
assert.ok([...pattern4].every(i => i >= 0 && i < 16), 'cells must be in bounds');

// Perfect match
const check = checkPattern([0, 1, 2], new Set([0, 1, 2]));
assert.equal(check.correct, 3);
assert.equal(check.missed, 0);
assert.equal(check.wrong, 0);

// One wrong, one missed
const check2 = checkPattern([0, 3, 2], new Set([0, 1, 2]));
assert.equal(check2.correct, 2);
assert.equal(check2.wrong, 1);
assert.equal(check2.missed, 1);

// Duplicate taps should not count as correct
const check3 = checkPattern([0, 0, 1], new Set([0, 1]));
assert.equal(check3.correct, 2, 'duplicates collapse to one');

assert.equal(STROOP_COLORS.some(c => c.name === 'AMBER'), false, 'Thai players need ORANGE, not AMBER');
assert.ok(STROOP_COLORS.some(c => c.name === 'ORANGE'));
assert.equal(new Set(STROOP_COLORS.map(c => c.name)).size, STROOP_COLORS.length);
assert.equal(new Set(STROOP_COLORS.map(c => c.hex)).size, STROOP_COLORS.length);

// Color March: spelling alone determines the answer; every ink cue conflicts.
for (let seed = 0; seed < 100; seed++) {
  let state = seed + 1;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const march = makeColorMarchRound(random);
  assert.notEqual(march.target.name, march.promptInk.name, 'target word must wear misleading ink');
  assert.equal(march.options.filter(option => option.word.name === march.target.name).length, 1, 'one option must spell the target');
  assert.equal(new Set(march.options.map(option => option.word.name)).size, STROOP_COLORS.length, 'answer words must be unique');
  assert.equal(new Set(march.options.map(option => option.ink.name)).size, STROOP_COLORS.length, 'answer inks must be fully mixed');
  assert.ok(march.options.every(option => option.word.name !== option.ink.name), 'every answer word must wear the wrong ink');
  const answer = march.options.find(option => option.word.name === march.target.name);
  assert.notEqual(answer.ink.name, march.promptInk.name, 'correct spelling must not match the target ink');
  assert.notEqual(march.options.find(option => option.ink.name === march.promptInk.name).word.name, march.target.name, 'matching the target ink must be a decoy');
}

// ── Mental Math Pro: numberWord is the drill's read hop. The word for n
// must round-trip back to n so the live renderer's question is unambiguous
// to anyone who can read English. Hyphenation follows the house style
// ("twenty-one", not "twenty one").
for (let n = 0; n <= 99; n++) {
  const w = numberWord(n);
  assert.ok(typeof w === 'string' && w.length > 0, `numberWord(${n}) must be a non-empty string`);
  if (n <= 20) {
    const expected = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'][n];
    assert.equal(w, expected, `numberWord(${n}) should be "${expected}", got "${w}"`);
  } else if (n % 10 === 0) {
    assert.ok(!w.includes('-'), `${n} should not hyphenate: "${w}"`);
  } else {
    assert.ok(w.includes('-'), `${n} should hyphenate: "${w}"`);
  }
}

// rollPro: every roll must produce a valid question with the right answer.
// Seeded random — fixed seed reproduces the same question twice (no
// Date.now leakage).
for (let seed = 0; seed < 200; seed++) {
  let s = seed + 1;
  const random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const p = rollPro(random);
  assert.ok(p.question.endsWith(' ='), `question must end with " =", got "${p.question}"`);
  assert.ok(p.answer === Math.trunc(p.answer), 'answer must be a whole number');
  if (p.kind === 'read') {
    // Pure-read round: the question is just "<word> =", and the answer
    // is the integer the word names.
    assert.ok(p.answer >= 1 && p.answer <= 99, `read answer should be 1–99, got ${p.answer}`);
    assert.equal(p.question, `${numberWord(p.answer)} =`);
  } else {
    // Arithmetic round: parse the word operands and the operator, then
    // confirm rollPro's answer matches the math.
    const m = p.question.match(/^([a-z\-]+) (plus|minus|times) ([a-z\-]+) =$/);
    assert.ok(m, `arithmetic question malformed: "${p.question}"`);
    const a = parseSpelledNumber(m[1]);
    const b = parseSpelledNumber(m[3]);
    assert.ok(a !== null && b !== null, `could not parse "${m[1]}" or "${m[3]}"`);
    const op = { plus: a + b, minus: a - b, times: a * b }[m[2]];
    assert.equal(p.answer, op, `${a} ${m[2]} ${b} should be ${op}, rollPro said ${p.answer}`);
    assert.ok(a >= 0 && b >= 0, 'operands must be non-negative');
  }
}

// ── Mental Math Thai: Thai ↔ Arabic round-trip. U+0E50..U+0E59 is the
// standard Thai decimal block; toThai / fromThai must be a clean bijection.
assert.equal(toThai(0), '๐');
assert.equal(toThai(9), '๙');
assert.equal(toThai(10), '๑๐');
assert.equal(toThai(23), '๒๓');
assert.equal(toThai(144), '๑๔๔');
assert.equal(toThai(49), '๔๙');
for (let n = 0; n < 1000; n++) {
  assert.equal(fromThai(toThai(n)), n, `toThai/fromThai round-trip failed for ${n}`);
}
// Every Thai digit must be the right codepoint.
for (let d = 0; d <= 9; d++) {
  assert.equal(toThai(d).codePointAt(0), 0x0E50 + d, `digit ${d} should be U+0E5${d.toString(16).toUpperCase()}`);
}

// rollThai: ~half the lines should be mixed-script (different systems
// for the two operands), and the math must match the Arabic parsing.
let mixedCount = 0;
for (let seed = 0; seed < 200; seed++) {
  let s = seed + 1;
  const random = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const p = rollThai(random);
  const m = p.question.match(/^([๐-๙0-9]+) ([+\-×]) ([๐-๙0-9]+) =$/);
  assert.ok(m, `Thai question malformed: "${p.question}"`);
  const a = fromMixedNumber(m[1]);
  const b = fromMixedNumber(m[3]);
  const op = { '+': a + b, '-': a - b, '×': a * b }[m[2]];
  assert.equal(p.answer, op, `Thai question ${p.question} should be ${op}, got ${p.answer}`);
  if (p.mixed) mixedCount++;
}
assert.ok(mixedCount > 60 && mixedCount < 140, `mixed-script ratio should be ~50%, got ${mixedCount}/200`);

function parseSpelledNumber(word) {
  // Reverse lookup for the test assertion above.
  const table = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  if (word in table) return table[word];
  const m = word.match(/^(\w+)-(\w+)$/);
  if (m && m[1] in table && m[2] in table && table[m[1]] >= 20) return table[m[1]] + table[m[2]];
  return null;
}

function fromMixedNumber(s) {
  // Mixed Thai/Arabic string → integer. fromThai only handles Thai;
  // ASCII digits pass through.
  let out = '';
  for (const ch of s) {
    if (ch >= '๐' && ch <= '๙') out += String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch));
    else if (ch >= '0' && ch <= '9') out += ch;
    else throw new Error(`bad digit: ${ch}`);
  }
  return Number(out);
}

const kickoff = createMatch('4-4-2', '4-4-2');
assert.equal(kickoff.red.length, 11);
assert.equal(kickoff.blue.length, 11);
assert.equal(kickoff.red[0].role, 'gk');
assert.equal(kickoff.blue[0].role, 'gk');
assert.equal(kickoff.phase, 'kick');
assert.equal(kickoff.possession, 'red');
assert.ok(kickoff.red.every(p => p.x < PITCH.length / 2), 'red starts in its own half');
assert.ok(kickoff.blue.every(p => p.x > PITCH.length / 2), 'blue starts in its own half');

assert.equal(placeTeam('red', '4-3-3').length, 11);
assert.equal(placeTeam('blue', '3-5-2').length, 11);

assert.ok(kickTravel(0.2) < kickTravel(0.9));
assert.ok(kickTravel(1) > 50);
assert.ok(kickTravel(1.12) > kickTravel(1));

const mid = { x: PITCH.length / 2, y: PITCH.width / 2 };
const longShot = resolveKick({ x: 54, y: 34 }, { x: 54 + MAX_KICK, y: 34 }, 1);
assert.equal(longShot.kind, 'goal', 'geometry alone still scores with nobody in the lane');
assert.equal(longShot.scorer, 'red');
const fromOwnHalf = resolveKick({ x: 48, y: 34 }, { x: 48 + MAX_KICK, y: 34 }, 1);
assert.equal(fromOwnHalf.kind, 'play');
const overBar = resolveKick({ x: 54, y: 34 }, { x: 54 + kickTravel(1.12), y: 34 }, 1.12);
assert.equal(overBar.kind, 'over');
assert.equal(overBar.keeperTeam, 'blue');

const throwIn = resolveKick(mid, { x: mid.x, y: mid.y + 80 }, 1);
assert.equal(throwIn.kind, 'throw-in');
assert.equal(throwIn.dest.y, PITCH.width);

// Bodies in the lane are what stopped "blue wins by three shots from the
// centre spot": a dead-centre blast now walks into the keeper's hands.
const halfway = createMatch();
const blaster = halfway.red.reduce((a, b) => (a.x > b.x ? a : b));
blaster.x = 54;
blaster.y = 34;
halfway.ball = { x: 54, y: 34 };
halfway.possessorId = blaster.id;
halfway.possession = 'red';
applyKick(halfway, 0, 1);
assert.equal(halfway.score.red, 0, 'the keeper saves a shot straight down the middle');
assert.equal(halfway.log, 'KEEPER SAVES');
assert.equal(halfway.possession, 'blue');

const scoring = createMatch();
const striker = scoring.red.reduce((a, b) => (a.x > b.x ? a : b));
striker.x = 96;
striker.y = 26;
scoring.ball = { x: 96, y: 26 };
scoring.possessorId = striker.id;
scoring.possession = 'red';
applyKick(scoring, 0, 0.6);
assert.equal(scoring.score.red, 1, 'a shot across the keeper from the corner of the box goes in');
assert.equal(scoring.phase, 'kick');
assert.equal(scoring.possession, 'blue', 'the side that conceded takes kickoff');

const sweep = createMatch();
sweep.score.red = 2;
const finisher = sweep.red.reduce((a, b) => (a.x > b.x ? a : b));
finisher.x = 96;
finisher.y = 26;
sweep.ball = { x: 96, y: 26 };
sweep.possessorId = finisher.id;
sweep.possession = 'red';
applyKick(sweep, 0, 0.6);
assert.equal(sweep.winner, 'red');
assert.equal(sweep.phase, 'over');
assert.equal(matchScore(sweep), GOALS_TO_WIN);

const loose = createMatch();
const passer = loose.red.concat(loose.blue).find(p => p.id === loose.possessorId);
const interceptor = closestTo({ x: 70, y: 20 }, loose.blue).player;
loose.ball = { x: passer.x, y: passer.y };
applyKick(loose, Math.atan2(interceptor.y - loose.ball.y, interceptor.x - loose.ball.x), 0.35);
if (loose.phase === 'move-self') {
  skipMove(loose);
  skipMove(loose);
  assert.equal(loose.phase, 'kick');
}

const parked = { id: 'red-x', team: 'red', role: 'field', x: 92, y: 34 };
const blueWall = placeTeam('blue', '4-4-2');
assert.equal(isOffside(parked, blueWall, { x: 60, y: 34 }), true);
assert.equal(isOffside({ ...parked, x: 50 }, blueWall, { x: 60, y: 34 }), false);

const mover = createMatch();
const runner = mover.red.find(p => p.role === 'field');
const far = clampMove(runner, { x: runner.x + 80, y: runner.y }, mover);
assert.ok(Math.hypot(far.x - runner.x, far.y - runner.y) <= MOVE_FIELD + 1e-6);
const gkSlide = clampMove(mover.red[0], { x: mover.red[0].x, y: mover.red[0].y + 40 }, mover);
assert.ok(Math.hypot(gkSlide.x - mover.red[0].x, gkSlide.y - mover.red[0].y) <= MOVE_GK + 1e-6);

const offsideRun = createMatch();
const forward = offsideRun.red.reduce((a, b) => (a.x > b.x ? a : b));
const illegal = clampMove(forward, { x: 100, y: 34 }, offsideRun);
assert.equal(isOffside({ ...forward, ...illegal }, offsideRun.blue, offsideRun.ball), false);

assert.equal(otherTeam('red'), 'blue');

const aim = aimFromPointer({ x: 10, y: 10 }, { x: 10 + MAX_KICK, y: 10 });
assert.ok(aim);
assert.ok(Math.abs(aim.power - 1) < 1e-6);
assert.ok(powerForAim({ x: 0, y: 0 }, { x: 10, y: 0 }) < powerForAim({ x: 0, y: 0 }, { x: 40, y: 0 }));

const race = createMatch();
const redNear = race.red.find(p => p.role === 'field');
redNear.x = 22;
redNear.y = 34;
const dest = { x: 24, y: 34 };
const yours = possessionPreview(race, dest, 'red');
assert.equal(yours.claim, 'yours');
const stealAt = { x: race.blue[0].x, y: race.blue[0].y };
const theirs = possessionPreview(race, stealAt, 'red');
assert.equal(theirs.claim, 'theirs');

const cpuState = createMatch();
cpuState.possession = 'blue';
cpuState.possessorId = cpuState.blue.reduce((a, b) => (a.x < b.x ? a : b)).id;
const cpuKick = pickCpuKick(cpuState);
assert.ok(cpuKick && Number.isFinite(cpuKick.angle) && cpuKick.power > 0);
cpuState.phase = 'move-opp';
cpuState.kickingTeam = 'red';
cpuState.ball = { x: 70, y: 34 };
const cpuRun = pickCpuMove(cpuState);
const redLoss = createMatch();
redLoss.score.red = 1;
redLoss.score.blue = 3;
redLoss.winner = 'blue';
assert.equal(matchScore(redLoss, 'red'), 1, 'Red gets credit for scored goals even in loss');
assert.equal(matchScore(redLoss, 'blue'), 3, 'Blue winner gets max 3 goals');

assert.equal(kickoff.red[0].num, 1, 'GK has squad number 1');
assert.equal(kickoff.red[1].num, 2, 'First outfield defender has squad number 2');
assert.equal(kickoff.red[10].num, 11, 'Last attacker has squad number 11');

console.log('mechanics: trainers, warehouse, Lights Out, Nonogram, Nim, Make 24, WPM scoring, Tic-Tac-Toe, RPS, Memory Matrix, Colour Match, Color March, Mental Math Pro, Mental Math Thai, and Paper Soccer passed');
