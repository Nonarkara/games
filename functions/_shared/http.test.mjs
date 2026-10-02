import assert from 'node:assert/strict';
import { readJson } from './http.js';
import { onRequestPost } from '../api/leaderboard.js';

const request = (body, type = 'application/json') => new Request('https://games.test/api/session', {
  method: 'POST', headers: { 'content-type': type }, body
});
assert.deepEqual((await readJson(request('{"word":"ไทย"}'), 40)).value, { word: 'ไทย' });
assert.equal((await readJson(request('{}', 'application/json-invalid'))).response.status, 415);
assert.equal((await readJson(request('{'))).response.status, 400);
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
