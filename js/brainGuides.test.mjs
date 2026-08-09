import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRAIN_GUIDES, TRANSFER_CAVEAT } from './brainGuides.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalogBlock = appSource.split('const gamesCatalog = [')[1].split('];')[0];
const gameIds = [...catalogBlock.matchAll(/\bid:\s*'([^']+)'/g)].map(match => match[1]);
const missing = gameIds.filter(id => !BRAIN_GUIDES[id]);

assert.deepEqual(missing, [], `missing brain guides: ${missing.join(', ')}`);
assert.equal(new Set(gameIds).size, gameIds.length, 'game IDs must be unique');
assert.match(TRANSFER_CAVEAT, /not promised/i, 'caveat must reject broad-transfer promises');

for (const id of gameIds) {
  const guide = BRAIN_GUIDES[id];
  for (const field of ['label', 'minutes', 'practice', 'why', 'tip']) {
    assert.ok(guide[field]?.trim(), `${id} is missing ${field}`);
  }
}

console.log(`brain guides: ${gameIds.length} games covered`);
