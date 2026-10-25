import assert from 'node:assert/strict';
const KEY = 'ngs_data_v1', LEGACY = 'omni_arcade_data_v1', FLAG = 'ngs_migrated_v2';
const warn = console.warn;
const warnings = [];
console.warn = (...args) => warnings.push(args);
let storage, blocked = false, quota = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem(key) { if (blocked) throw new Error('storage denied'); return storage.get(key) ?? null; },
  setItem(key, value) { if (blocked || quota) throw new Error('storage denied'); storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
} });
const reset = entries => { storage = new Map(entries); blocked = false; quota = false; };
const freshService = async () => (await import(`./storage.js?fixture=${Math.random()}`)).StorageService;

reset([[KEY, JSON.stringify({ highScores: { sudoku: 900 }, gamesPlayed: 8 })], [LEGACY, JSON.stringify({ highScores: { sudoku: 100 }, gamesPlayed: 1 })]]);
let service = await freshService();
assert.equal(service.getHighScore('sudoku'), 900, 'stale legacy data must not overwrite newer canonical progress');

reset([[LEGACY, JSON.stringify({ highScores: { sudoku: 200 }, leaderboards: { sudoku: [{ i: 'ABCDE', s: 200, d: '2026-01-01' }] } })]]);
service = await freshService(); quota = true;
service.getData();
assert.ok(storage.has(LEGACY), 'quota failure must retain the only copy of legacy progress');
assert.ok(!storage.has(FLAG), 'failed migration must remain retryable');
quota = false;
assert.equal(service.getHighScore('sudoku'), 200);
assert.equal(service.getLeaderboard('sudoku')[0].i, 'ABCD');
assert.equal(storage.get(FLAG), '1');
assert.ok(!storage.has(LEGACY), 'old key may be removed only after a successful copy');

reset([[FLAG, '1'], [KEY, JSON.stringify({ highScores: { sudoku: 700 }, gamesPlayed: 3, favorites: ['sudoku'] })]]);
service = await freshService();
assert.equal(service.getHighScore('sudoku'), 700);
blocked = true;
assert.equal(service.getHighScore('sudoku'), 700, 'transient read failure must retain the last good data');
service.updateHighScore('sudoku', 800);
assert.equal(service.getHighScore('sudoku'), 800, 'current-page progress remains playable when storage is blocked');
const detached = service.getData(); detached.highScores.sudoku = 0; detached.favorites.push('other');
assert.equal(service.getHighScore('sudoku'), 800, 'a returned fallback must not alias the stored snapshot');
assert.deepEqual(service.getData().favorites, ['sudoku']);
assert.equal(service.saveData(service.getData()), false, 'blocked persistence must report failure');

reset([[FLAG, '1'], [KEY, JSON.stringify({ highScores: { sudoku: 500 } })]]);
service = await freshService();
assert.equal(service.getHighScore('sudoku'), 500);
quota = true;
service.updateHighScore('sudoku', 600);
assert.equal(service.getHighScore('sudoku'), 600, 'readable stale storage must not erase a failed write');
quota = false;
assert.equal(service.saveData(service.getData()), true);
assert.equal((await freshService()).getHighScore('sudoku'), 600, 'a later successful save persists pending progress');

reset([[FLAG, '1']]);
service = await freshService(); blocked = true;
const empty = service.getData(); empty.highScores.sudoku = 123; empty.favorites.push('sudoku');
assert.equal(service.getHighScore('sudoku'), 0, 'default data must not be shared between failed reads');
assert.deepEqual(service.getData().favorites, []);

reset([[FLAG, '1'], [KEY, JSON.stringify({ highScores: { sudoku: 'bad', 'digit-span': 7 }, gamesPlayed: 'bad' })]]);
service = await freshService();
assert.equal(service.getHighScore('digit-span'), 7, 'valid fields survive a partially damaged save');
assert.equal(service.getHighScore('sudoku'), 0);
assert.equal(service.getData().gamesPlayed, 0);
const savedRaw = storage.get(KEY);
const circular = {}; circular.self = circular;
for (const invalid of [null, [], 'text', circular]) {
  assert.equal(service.saveData(invalid), false);
  assert.equal(storage.get(KEY), savedRaw, 'invalid writes must not replace the existing save');
}
for (const raw of ['null', '[]', '{broken']) {
  storage.set(KEY, raw);
  assert.equal(service.getHighScore('digit-span'), 7, 'malformed root retains the last good snapshot');
}
assert.ok(warnings.length > 0, 'storage failures are reported');
console.warn = warn;
console.log('Guest storage: migration preserves newer/only copies; blocked writes retain detached session progress; damaged fields recover');
