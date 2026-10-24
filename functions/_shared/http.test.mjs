import assert from 'node:assert/strict';
import { readJson } from './http.js';
import { onRequestPost, onRequestGet } from '../api/leaderboard.js';

const request = (body, type = 'application/json') => new Request('https://games.test/api/session', {
  method: 'POST', headers: { 'content-type': type }, body
});
assert.deepEqual((await readJson(request('{"word":"ไทย"}'), 40)).value, { word: 'ไทย' });
assert.equal((await readJson(request('{}', 'application/json-invalid'))).response.status, 415);
assert.equal((await readJson(request('{'))).response.status, 400);
for (const body of ['null', '[]', 'true', '10', '"text"']) {
  const result = await readJson(request(body));
  assert.equal(result.response.status, 400, body);
  assert.equal((await result.response.json()).error, 'json_object_required');
}
assert.equal((await readJson(request('"ไทย"'), 5)).response.status, 413);
let cancelled = false;
let pulls = 0;
const stream = new ReadableStream({
  pull(controller) { pulls++; controller.enqueue(new Uint8Array(1024)); },
  cancel() { cancelled = true; }
});
const streamed = new Request('https://games.test/api/session', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half'
});
assert.equal((await readJson(streamed, 2048)).response.status, 413);
assert.ok(cancelled, 'oversized body must stop being read');
assert.ok(pulls <= 4, 'must reject before buffering the remaining body');
console.log('HTTP boundaries: exact JSON type, byte limits, stream cancellation passed');

const failingBoardDB = {
  prepare() {
    return {
      bind() { return this; },
      async run() { return { meta: { changes: 1 } }; },
      async all() { throw new Error('private database diagnostic'); }
    };
  }
};
const submitted = await onRequestPost({
  request: request(JSON.stringify({ game_id: 'stroop-match', initials: 'TEST', score: 10, session_id: 'a'.repeat(64) })),
  env: { DB: failingBoardDB }
});
assert.equal(submitted.status, 503);
assert.deepEqual(await submitted.json(), { error: 'service_unavailable' });
console.log('Leaderboard: database failures return a bounded generic response');

const noDatabase = { DB: { prepare() { throw new Error('invalid input reached database'); } } };
for (const score of [null, false, true, '10', [], [10], {}, 1.5, -1]) {
  const result = await onRequestPost({
    request: request(JSON.stringify({ game_id: 'stroop-match', initials: 'TEST', score, session_id: 'a'.repeat(64) })),
    env: noDatabase
  });
  assert.equal(result.status, 400, JSON.stringify(score));
  assert.equal((await result.json()).error, 'invalid_score');
}
for (const game_id of ['constructor', 'toString', '__proto__']) {
  const result = await onRequestGet({ request: new Request(`https://games.test/api/leaderboard?game_id=${game_id}`), env: noDatabase });
  assert.equal(result.status, 400, game_id);
  assert.equal((await result.json()).error, 'unknown_game');
}
console.log('Leaderboard: malformed score types and prototype names rejected before database access');
