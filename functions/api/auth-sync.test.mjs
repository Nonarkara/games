import assert from 'node:assert/strict';
import { _test as syncTest } from './sync.js';
import { cookieValue, secureCookie } from '../_shared/auth.js';

const snapshot = syncTest.cleanSnapshot({
  highScores: { 'digit-span': 9, unknown: 999, 'cyber-tetris': 9999999 },
  favorites: ['digit-span', 'digit-span', 'unknown'],
  favoriteStates: { 'digit-span': { value: false, updatedAt: 123 }, unknown: { value: true, updatedAt: 10 } },
  gamesPlayed: -4,
  lastInitials: '<BAD>'
});
assert.deepEqual(snapshot.favorites, []);
assert.deepEqual(snapshot.favoriteStates['digit-span'], { value: false, updatedAt: 123 });
assert.equal(snapshot.highScores['digit-span'], 9);
assert.equal(snapshot.highScores['cyber-tetris'], 999999);
assert.equal(snapshot.highScores.unknown, undefined);
assert.equal(snapshot.gamesPlayed, 0);
assert.equal(snapshot.lastInitials, '');

const goodEvent = {
  eventId: '12345678-1234-4234-9234-123456789abc',
  gameId: 'digit-span', category: 'memory-focus', score: 999,
  durationMs: 999999999, timestamp: Date.now()
};
const events = syncTest.cleanEvents([goodEvent, goodEvent, { ...goodEvent, eventId: 'short' }]);
assert.equal(events.length, 1, 'events must deduplicate and reject weak IDs');
assert.equal(events[0].score, 20, 'event scores must respect the game ceiling');
assert.equal(events[0].durationMs, 86400000, 'event durations must be bounded');

const cookie = secureCookie('__Host-test', 'secret token', 60);
assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
const request = new Request('https://games.nonarkara.org/', { headers: { cookie: '__Host-test=secret%20token; x=y' } });
assert.equal(cookieValue(request, '__Host-test'), 'secret token');

console.log('account sync: payload bounds, event dedupe, and secure cookies covered');
