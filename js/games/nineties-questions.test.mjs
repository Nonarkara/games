/**
 * Deck integrity check. Run: node js/games/nineties-questions.test.mjs
 *
 * The conservation law: every question has exactly one valid answer and one
 * fact, and no id appears twice. Break any of those and the night breaks at
 * 1am — a `correct` index out of range reveals nothing, and a duplicate id
 * makes the no-repeat set silently skip a question.
 */
import assert from 'node:assert/strict';
import { decks } from './nineties-questions.js';

const seen = new Set();
let total = 0;

assert.equal(decks.length, 6, 'expected 6 decks');

for (const deck of decks) {
  assert.ok(deck.id && deck.title && deck.icon && deck.color && deck.blurb,
    `deck "${deck.id}" is missing metadata`);
  assert.ok(deck.questions.length >= 40,
    `deck "${deck.id}" has ${deck.questions.length} questions, needs 40+`);

  for (const q of deck.questions) {
    const at = `${deck.id}/${q.id}`;
    assert.ok(q.id, `${at}: missing id`);
    assert.ok(!seen.has(q.id), `${at}: duplicate id`);
    seen.add(q.id);

    assert.ok(q.q && q.q.trim(), `${at}: empty question`);
    assert.equal(q.options.length, 4, `${at}: needs exactly 4 options`);
    q.options.forEach((o, i) => assert.ok(o && o.trim(), `${at}: option ${i} is empty`));
    assert.ok(new Set(q.options).size === 4, `${at}: duplicate options`);

    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3,
      `${at}: correct must be an integer 0-3, got ${q.correct}`);
    assert.ok(q.fact && q.fact.trim(), `${at}: missing fact — the fact is the point`);
    total++;
  }
}

console.log(`✓ ${decks.length} decks, ${total} questions, ${seen.size} unique ids — all valid`);
