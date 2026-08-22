import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paddleEnglish, pongIntercept, fifteenSolvable } from './openSourceGames.js';

assert.equal(paddleEnglish(50, 0, 100), 0, 'center hit should return straight');
assert.equal(paddleEnglish(0, 0, 100), -1, 'left edge should return full left');
assert.equal(paddleEnglish(100, 0, 100), 1, 'right edge should return full right');
assert.equal(paddleEnglish(500, 0, 100), 1, 'breakout angle must clamp');

assert.equal(pongIntercept(100, 50, 100), 0, 'paddle center should return zero');
assert.equal(pongIntercept(50, 50, 100), -1, 'paddle top should return up');
assert.equal(pongIntercept(150, 50, 100), 1, 'paddle bottom should return down');

assert.equal(fifteenSolvable([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0]), true, 'solved board is solvable');
assert.equal(fifteenSolvable([1,2,3,4,5,6,7,8,9,10,11,12,13,15,14,0]), false, 'single swap is unsolvable');

const credits = readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8');
assert.match(credits, /kubowania\/breakout[\s\S]*Ania Kubow[\s\S]*MIT/, 'Breakout credit must be preserved');
assert.match(credits, /jakesgordon\/javascript-pong[\s\S]*Jake Gordon[\s\S]*MIT/, 'Pong credit must be preserved');
assert.match(credits, /imshubhamsingh\/15-puzzle[\s\S]*MIT/, 'Fifteen credit must be preserved');

console.log('open-source arcade: physics + solvability + credit checks passed');
