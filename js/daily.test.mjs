/**
 * Today's Five guard.
 *
 * The pick has to be the same for everyone on a given day (or comparing notes
 * is meaningless), different tomorrow (or it is not a daily), and never put an
 * 18+ cart on the front page unasked.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dailyFive, dayNumber, dailyLabel, DAILY_COUNT } from './daily.js';

const appSource = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalog = appSource.split('const gamesCatalog = [')[1].split('\n];')[0]
  .split('\n').filter(l => /^\s*\{\s*id:/.test(l))
  .map(line => {
    const pick = k => (line.match(new RegExp(`${k}: ['"]([^'"]+)['"]`)) || [])[1] || '';
    return { id: pick('id'), title: pick('title'), wing: pick('wing'), age: pick('age') };
  });

assert.ok(catalog.length > 90, `expected the full catalog, parsed ${catalog.length}`);

/* 1. Deterministic within a day — two people must get the same five. */
const a = dailyFive(catalog, 20000);
const b = dailyFive(catalog, 20000);
assert.deepEqual(a.map(g => g.id), b.map(g => g.id), 'the same day must give the same five');
assert.equal(a.length, DAILY_COUNT);

/* 2. Five distinct, real cartridges. */
const ids = new Set(catalog.map(g => g.id));
assert.equal(new Set(a.map(g => g.id)).size, DAILY_COUNT, 'no cart twice in one day');
a.forEach(g => assert.ok(ids.has(g.id), `${g.id} is not in the catalog`));

/* 3. It actually rotates. A "daily" that repeats is a static list. */
let changed = 0;
for (let d = 20000; d < 20030; d++) {
  const today = dailyFive(catalog, d).map(g => g.id).join(',');
  const tomorrow = dailyFive(catalog, d + 1).map(g => g.id).join(',');
  if (today !== tomorrow) changed++;
}
assert.equal(changed, 30, 'every day must differ from the next');

/* 4. Over a month it must reach widely, or it is five favourites wearing a
      date. */
const month = new Set();
for (let d = 20000; d < 20030; d++) dailyFive(catalog, d).forEach(g => month.add(g.id));
assert.ok(month.size >= 60, `a month should surface plenty of the floor, got ${month.size}`);

/* 5. Never an 18+ cart. This strip appears without being asked for, and the
      drinking games are something you should have to go and find. */
for (let d = 20000; d < 20120; d++) {
  for (const g of dailyFive(catalog, d)) {
    assert.notEqual(g.age, '18+', `${g.id} is 18+ and must never be in the daily pick`);
    assert.notEqual(g.wing, 'meta', `${g.id} is not playable`);
  }
}

/* 6. Spread across rooms — five trainers in a row reads as homework. */
let mixedDays = 0;
for (let d = 20000; d < 20030; d++) {
  if (new Set(dailyFive(catalog, d).map(g => g.wing)).size >= 3) mixedDays++;
}
assert.ok(mixedDays >= 28, `most days should span three or more rooms, got ${mixedDays}/30`);

/* 7. dayNumber turns over at local midnight, not UTC. */
const lateTonight = new Date(2026, 8, 28, 23, 30);
const earlyTomorrow = new Date(2026, 8, 29, 0, 30);
assert.equal(dayNumber(lateTonight) + 1, dayNumber(earlyTomorrow), 'the day must turn at local midnight');
assert.equal(dayNumber(new Date(2026, 8, 28, 1, 0)), dayNumber(lateTonight), 'one local day is one number');
assert.ok(dailyLabel(lateTonight).includes('SEPTEMBER'), 'label names the month');

console.log(`daily: ${DAILY_COUNT} carts a day, deterministic, rotating, ${month.size} of ${catalog.length} reached in a month`);
