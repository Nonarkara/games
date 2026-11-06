/**
 * Six Chambers — the probability model.
 *
 * The whole lesson lives in nextProbability(): with the cylinder spun each
 * pull the chance never moves, and without a spin a safe pull makes the NEXT
 * pull more dangerous. Almost every player has this backwards, so the two
 * modes are asserted separately and against each other.
 *
 * Fractions are compared exactly, never as floats — 1/3 and 2/6 are the same
 * answer, and a player who says "2 out of 6" is right.
 */
import assert from 'node:assert/strict';
import {
  CHAMBER_COUNT, MAX_PULLS, MODES,
  reduce, formatProbability, nextProbability,
  reachableProbabilities, createCylinder, createRun,
} from './six-chambers.js';

const eq = (a, b) => assert.equal(a.n, b.n) && assert.equal(a.d, b.d);
const frac = (n, d) => ({ n, d });

/**
 * A random that plays a fixed script, then repeats its last value.
 *
 * The script below builds a cylinder with ONE squib, NOT spun, whose squib
 * sits in the sixth chamber. So the first five pulls are safe and the sixth
 * finds the squib. That is the whole fixture — everything else is derived.
 *
 *   call 1  loaded  = 1 + floor(0 * 3)   = 1 squib
 *   call 2  spin    = 0.9 < 0.5 ? no    = 'never'
 *   call 3  shuffle i=5, j=0            = the squib swaps to chamber 6
 *   calls 4-7 shuffle i=4,3,2,1, j=i    = identity, squib stays put
 */
const ONE_SQUIB_LAST = [0, 0.9, 0, 0.9, 0.9, 0.9, 0.9];
function scripted(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/* 1. Fractions reduce to lowest terms. */
eq(reduce(2, 6), frac(1, 3));
eq(reduce(4, 6), frac(2, 3));
eq(reduce(6, 3), frac(2, 1));
eq(reduce(3, 3), frac(1, 1));
eq(reduce(0, 5), frac(0, 5));
eq(reduce(5, 0), frac(0, 1));

/* 2. Display format: fractions, whole numbers, and the empty case. */
assert.equal(formatProbability(frac(1, 6)), '1/6');
assert.equal(formatProbability(frac(2, 3)), '2/3');
assert.equal(formatProbability(frac(1, 1)), '1');
assert.equal(formatProbability(frac(3, 1)), '3');
assert.equal(formatProbability(null), '—');

/* 3. SPIN EACH PULL — the chance never moves, no matter how many survive. */
for (const loaded of [1, 2, 3]) {
  const first = nextProbability(loaded, 0, 'each');
  for (let pulls = 0; pulls <= CHAMBER_COUNT; pulls++) {
    eq(nextProbability(loaded, pulls, 'each'), first);
  }
}

/* 4. NO SPIN — a safe pull makes the next pull MORE dangerous.
   This is the lesson. If this block fails, the game is teaching the
   gambler's fallacy instead of inverting it. */
const climb = [];
for (let pulls = 0; pulls < CHAMBER_COUNT; pulls++) climb.push(nextProbability(1, pulls, 'never'));
eq(climb[0], frac(1, 6));
eq(climb[1], frac(1, 5));
eq(climb[2], frac(1, 4));
eq(climb[3], frac(1, 3));
eq(climb[4], frac(1, 2));
eq(climb[5], frac(1, 1));
for (let i = 1; i < climb.length; i++) {
  assert.ok(climb[i].n / climb[i].d > climb[i - 1].n / climb[i - 1].d,
    `the chance must rise after a safe pull: ${climb[i - 1].n}/${climb[i - 1].d} then ${climb[i].n}/${climb[i].d}`);
}
/* The unspun cylinder is never safer than the spun one at the same moment. */
for (let pulls = 0; pulls < CHAMBER_COUNT; pulls++) {
  const spun = nextProbability(1, pulls, 'each');
  const walked = nextProbability(1, pulls, 'never');
  assert.ok(walked.n / walked.d >= spun.n / spun.d, 'walking the cylinder is never safer than spinning it');
}

/* 5. Only real probabilities are offered as answers — no 0, and no 2-in-1. */
const chips = reachableProbabilities();
for (const p of chips) {
  assert.ok(p.n > 0, 'a chip with zero probability is not an answer');
  assert.ok(p.n <= p.d, `a chip above 1 is not a probability: ${p.n}/${p.d}`);
  eq(reduce(p.n, p.d), frac(p.n, p.d));
}
assert.ok(chips.length >= 8, `expected a real spread of answers, got ${chips.length}`);
for (let i = 1; i < chips.length; i++) {
  assert.ok(chips[i].n / chips[i].d >= chips[i - 1].n / chips[i - 1].d, 'chips must be sorted smallest first');
}
assert.ok(chips.some(p => p.n === 1 && p.d === 6), '1/6 must be offered');
assert.ok(chips.some(p => p.n === 1 && p.d === 1), 'certainty must be offered');

/* 6. A cylinder holds exactly the squibs it says, and refuses nonsense. */
for (const loaded of [1, 2, 3]) {
  const cyl = createCylinder({ loaded, spin: 'each', random: () => 0.5 });
  assert.equal(cyl.layout.length, CHAMBER_COUNT);
  assert.equal(cyl.layout.filter(Boolean).length, loaded, `a ${loaded}-squib cylinder must hold ${loaded} squibs`);
}
for (const bad of [0, 4, -1, 1.5, NaN]) {
  assert.throws(() => createCylinder({ loaded: bad, spin: 'each', random: () => 0.5 }), RangeError);
}
for (const bad of ['sometimes', '', null, 1]) {
  assert.throws(() => createCylinder({ loaded: 1, spin: bad, random: () => 0.5 }), RangeError);
}
assert.deepEqual(MODES, ['each', 'never']);

/* 7. Unspun, the cylinder walks one chamber at a time. */
{
  const cyl = createCylinder({ loaded: 1, spin: 'never', random: () => 0.5 });
  for (let i = 0; i < CHAMBER_COUNT; i++) {
    const result = cyl.pull();
    assert.equal(result.position, i, 'the cylinder must walk chambers in order');
  }
  assert.throws(() => cyl.pull(), /empty/, 'a spent cylinder cannot be pulled again');
}

/* 8. Spun, each pull stands alone — the chance before equals the chance after. */
{
  const cyl = createCylinder({ loaded: 1, spin: 'each', random: () => 0.5 });
  const before = cyl.probability;
  const result = cyl.pull();
  eq(result.probabilityBefore, before);
  eq(result.probabilityAfter, before);
}

/* 9. The fixture is what we think it is. If this drifts, every test below
   is measuring the wrong cylinder. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  assert.equal(run.setup.loaded, 1, 'the fixture must hold one squib');
  assert.equal(run.setup.spin, 'never', 'the fixture must not be spun');
  eq(run.probability, frac(1, 6));
  const seen = [];
  while (!run.ended) {
    const r = run.pull(run.cylinder.probability);
    seen.push(r.squib);
    if (seen.length > MAX_PULLS + 2) break;
  }
  assert.equal(seen.length, 6, 'five safe pulls, then the squib on the sixth');
  assert.deepEqual(seen, [false, false, false, false, false, true]);
}

/* 10. Scoring: +2 for a right answer, −1 for a wrong one, floored at zero. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  const first = run.pull(run.cylinder.probability);
  assert.equal(first.correct, true, 'stating the true chance must count as right');
  assert.equal(first.squib, false, 'the first pull must be safe');
  assert.equal(run.correct, 1);
  assert.equal(run.wrong, 0);
  assert.equal(run.score, 2);

  const second = run.pull({ n: 99, d: 100 });
  assert.equal(second.correct, false, 'a wrong fraction must count as wrong');
  assert.equal(run.correct, 1);
  assert.equal(run.wrong, 1);
  assert.equal(run.score, 1, 'a wrong answer costs one point');

  run.pull({ n: 99, d: 100 });
  assert.equal(run.score, 0);
  run.pull({ n: 99, d: 100 });
  assert.equal(run.score, 0, 'the score must never go below zero');
}

/* 11. An equivalent fraction is a right answer: 2/6 is 1/3. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  const truth = run.cylinder.probability;
  assert.equal(run.isCorrect({ n: truth.n * 2, d: truth.d * 2 }), true, '2/6 and 1/3 are the same answer');
  assert.equal(run.isCorrect({ n: truth.n + 1, d: truth.d }), false, 'a different fraction must be wrong');
  assert.equal(run.isCorrect(null), false, 'no statement cannot be right');
}

/* 12. The run ends when the squib is pulled. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  let pulls = 0;
  while (!run.ended) {
    run.pull(run.cylinder.probability);
    pulls++;
    assert.ok(pulls <= MAX_PULLS + 2, 'a run must not run away');
  }
  assert.equal(pulls, 6, 'the squib ends the run on the sixth pull');
}

/* 13. A run that survives ends at the pull ceiling. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST), maxPulls: 3 });
  run.begin();
  let pulls = 0;
  while (!run.ended) {
    run.pull(run.cylinder.probability);
    pulls++;
  }
  assert.equal(pulls, 3, 'the run must stop at the pull ceiling');
  assert.equal(run.stopped, false, 'hitting the ceiling is not stopping early');
}

/* 14. Stopping is always allowed and keeps the score. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  run.pull(run.cylinder.probability);
  const kept = run.score;
  run.stop();
  assert.equal(run.stopped, true);
  assert.equal(run.ended, true);
  assert.equal(run.score, kept, 'stopping must not change the score');
  assert.throws(() => run.pull(run.cylinder.probability), /over/, 'a stopped run cannot be pulled');
}

/* 15. The per-mode tally is what the end-of-run coaching is built from. */
{
  const run = createRun({ random: scripted(ONE_SQUIB_LAST) });
  run.begin();
  run.pull(run.cylinder.probability);
  run.pull({ n: 99, d: 100 });
  const modes = run.byMode();
  assert.equal(modes.each.n + modes.never.n, run.pulls, 'every pull belongs to a mode');
  assert.equal(modes.never.n, 2, 'this fixture is unspun');
  assert.equal(modes.never.right, 1, 'one of the two pulls was right');
  assert.equal(modes.each.n, 0);
}

/* 16. Which chambers have been pulled is RECORDED, not inferred from a count.
   Spun, the cylinder lands on a random chamber every time, so "the first N
   chambers" is the wrong answer — the renderer was showing chambers the
   player had never touched as opened, and hiding the ones they had. */
{
  // 0.9 x5 = identity shuffle, then 0.1 and 0.3 = chambers 0 and 1.
  const seq = [0.9, 0.9, 0.9, 0.9, 0.9, 0.1, 0.3];
  let i = 0;
  const cyl = createCylinder({ loaded: 1, spin: 'each', random: () => seq[i++] ?? 0.9 });
  assert.deepEqual(cyl.revealed, [false, false, false, false, false, false], 'nothing is open yet');
  const first = cyl.pull();
  const second = cyl.pull();
  assert.equal(first.position, 0);
  assert.equal(second.position, 1);
  assert.equal(cyl.revealed[0], true, 'the chamber that was pulled is open');
  assert.equal(cyl.revealed[1], true, 'so is the next one');
  assert.equal(cyl.revealed.filter(Boolean).length, 2, 'exactly the pulled chambers are open');
  for (const i of [2, 3, 4, 5]) assert.equal(cyl.revealed[i], false, `chamber ${i} was never pulled`);
}
{
  // Spun, the same chamber can come round twice. The open set must record
  // that honestly rather than counting two chambers open.
  const cyl = createCylinder({ loaded: 1, spin: 'each', random: () => 0.4 });
  cyl.pull(); cyl.pull();
  assert.equal(cyl.revealed.filter(Boolean).length, 1,
    'two pulls of the same chamber open one chamber, not two');
}
{
  // Unspun, the cylinder walks, so the open chambers are the first N.
  const cyl = createCylinder({ loaded: 1, spin: 'never', random: () => 0.5 });
  cyl.pull(); cyl.pull();
  assert.deepEqual(cyl.revealed, [true, true, false, false, false, false]);
}

console.log('six chambers: fractions reduce, spun pulls never move, unspun pulls always climb, chips are real probabilities, scoring holds the floor');
