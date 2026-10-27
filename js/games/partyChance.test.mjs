import assert from 'node:assert/strict';
import { createRound } from './partyChance.js';
for (let players = 2; players <= 10; players++) {
  for (let trap = 0; trap < players * 3; trap++) {
    const round = createRound(players, () => (trap + .5) / (players * 3));
    for (let slot = 0; slot <= trap; slot++) {
      assert.equal(round.player, slot % players + 1);
      const result = round.pick(slot);
      assert.equal(result.lost, slot === trap);
      assert.equal(result.remaining, players * 3 - slot - 1);
      assert.equal(round.pick(slot), null, 'duplicate cannot consume another turn');
    }
    assert.equal(round.pick((trap + 1) % round.slots), null, 'round ends at first loss');
  }
}
for (const invalid of [0, 1, 11, 2.5, NaN]) assert.throws(() => createRound(invalid), RangeError);
const round = createRound(2, () => .99);
const reversed = createRound(3, () => 0);
for (const [turn, slot] of [8, 7, 6, 5, 4, 3, 2, 1, 0].entries()) {
  const result = reversed.pick(slot);
  assert.equal(result.player, turn % 3 + 1);
  assert.equal(result.lost, slot === 0);
}
for (const invalid of [-1, 6, 1.5, NaN]) assert.equal(round.pick(invalid), null);
assert.equal(round.remaining, 6);
console.log('party chance: every player count and losing position, wraparound, duplicates, invalid moves, terminal lock pass');
