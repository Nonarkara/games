/**
 * Pirate in a Tank — the barrel geometry.
 *
 * This file exists because the first version of this game was broken in a way
 * no eyeball test would catch: holeAtKnife() compared the angle wrongly and
 * returned the hole on the FAR SIDE of the barrel instead of the one facing
 * the blade. The game looked right and was unplayable — the knife could never
 * reach the deep hole.
 *
 * So the tests here pin the three things that must agree:
 *   holeFacing()  — where a hole points, as the renderer draws it
 *   holeAtKnife() — which hole the code says is at the blade
 *   the drawing    — a hole at the blade must sit in the MIDDLE of the face
 *
 * The last one is the regression that matters: the hole the logic picks has
 * to be the hole the player can see in the middle of the barrel.
 */
import assert from 'node:assert/strict';
import {
  HOLE_COUNT, DEPTHS, KNIFE_DEPTH, KNIFE_TOLERANCE,
  holeFacing, angleDelta, holeProjection, createBarrel, closeness,
} from './pirate-tank.js';

/**
 * Turn the barrel until this hole sits square on to the blade.
 *
 * turn() is RELATIVE — it is what the drag handler and the turn buttons
 * call — so a test that wants a hole brought to the blade has to turn by
 * the difference, not by an absolute number.
 */
function bringToBlade(barrel, hole) {
  barrel.turn((90 - hole.angle - barrel.rotation + 360) % 360);
  return barrel;
}

/* 1. A hole square on is a full circle; edge on it is a slit; past the far
   side it cannot be seen at all. */
{
  const square = holeProjection(0);
  assert.equal(square.visible, true);
  assert.equal(square.foreshorten, 1);
  assert.equal(square.width, 9, 'a square-on hole is its full width');
  assert.equal(square.height, 18);

  const edge = holeProjection(90);
  assert.equal(edge.visible, true, 'edge on is still visible');
  assert.ok(edge.width <= 1, `edge on must be a slit, got ${edge.width}`);
  assert.equal(edge.height, 18, 'a slit is still tall');

  const behind = holeProjection(180);
  assert.equal(behind.visible, false, 'a hole pointing away cannot be seen');
  assert.equal(holeProjection(91).visible, false, '91 is just past edge on');
  assert.equal(holeProjection(89).visible, true, '89 is just before edge on');
  assert.equal(holeProjection(270).visible, true, '270 is edge on, the same as -90');
  assert.equal(holeProjection(269).visible, false, '269 is one degree past edge on');
  assert.equal(holeProjection(360).visible, true, 'a full turn is back to square on');
  assert.equal(holeProjection(360).width, 9);
}

/* 2. Signed angle differences. */
assert.equal(angleDelta(0, 0), 0);
assert.equal(angleDelta(350, 10), -20, 'going from 10 to 350 is -20');
assert.equal(angleDelta(10, 350), 20);
assert.equal(angleDelta(180, 0), 180);
assert.equal(angleDelta(181, 0), -179, 'the wrap must not jump to +181');
assert.equal(angleDelta(0, 180), 180, 'the range is (-180, 180] — -180 is excluded');
assert.equal(angleDelta(-10, 350), 0, '-10 and 350 are the same heading');

/* 3. A hole's heading, and the 90-degree offset that puts angle 0 on the
   hole facing the viewer. */
assert.equal(holeFacing({ angle: 90 }, 0), 0, 'angle 90 faces the eye');
assert.equal(holeFacing({ angle: 0 }, 90), 0, 'turning by 90 brings angle 0 to the eye');
assert.equal(holeFacing({ angle: 0 }, 0), 270);
assert.equal(holeFacing({ angle: 0 }, -90), 180, 'a hole pointing away');
assert.equal(holeFacing({ angle: 0 }, 450), 0, 'turns past a full circle still work');

/* 4. A barrel has exactly one deep bore, and refuses nonsense. */
{
  for (let seed = 0; seed < 12; seed++) {
    const barrel = createBarrel({ random: () => (seed * 7 % 13) / 13 });
    assert.equal(barrel.holes.length, HOLE_COUNT);
    const deep = barrel.holes.filter(h => h.depth >= KNIFE_DEPTH);
    assert.equal(deep.length, 1, 'exactly one bore is deep enough');
    assert.equal(deep[0].depth, DEPTHS.deep);
    for (const hole of barrel.holes) {
      assert.ok(hole.depth === DEPTHS.shallow || hole.depth === DEPTHS.deep);
      assert.ok(hole.height >= 0 && hole.height <= 1, 'a hole must sit on the barrel');
    }
  }
  for (const bad of [0, 1, 2, -1, 2.5, NaN]) {
    assert.throws(() => createBarrel({ holeCount: bad, random: () => 0.5 }), RangeError);
  }
}

/* 5. Turning wraps the barrel around, both ways. */
{
  const barrel = createBarrel({ random: () => 0 });
  assert.equal(barrel.turn(360), 0);
  assert.equal(barrel.turn(-15), 345);
  assert.equal(barrel.turn(60), 45, 'turning past zero wraps the long way');
  assert.equal(barrel.turn(-45), 0);
}

/* 6. THE REGRESSION. Bring the deep bore square on to the blade and it must
   be the hole the code hands back — not the one opposite it. */
{
  const barrel = createBarrel({ random: () => 0 });
  const deep = barrel.holes[barrel.targetIndex];
  bringToBlade(barrel, deep);

  const atBlade = barrel.holeAtKnife(0);
  assert.ok(atBlade, 'a hole must be at the blade after the turn');
  assert.equal(atBlade.depth, KNIFE_DEPTH, 'the DEEP bore must be the one at the blade');
  assert.equal(atBlade.angle, deep.angle);

  /* And it must be the hole drawn in the MIDDLE of the barrel's face. The
     renderer puts a hole at cx + sin(facing) * rx, so the hole at the blade
     has to have a facing of (near) zero. This is the check that catches the
     original bug: the far-side hole had a facing of 180. */
  const facing = holeFacing(atBlade, barrel.rotation);
  assert.ok(Math.abs(Math.sin(facing * Math.PI / 180)) < 0.25,
    `the hole at the blade must sit in the middle of the face, its facing was ${facing}`);
  assert.ok(holeProjection(facing).visible, 'the hole at the blade must be visible');
  assert.ok(holeProjection(facing).width > 5, 'the hole at the blade must look square on');
}

/* 7. The knife goes home only in the deep bore. */
{
  const barrel = createBarrel({ random: () => 0 });
  const deep = barrel.holes[barrel.targetIndex];
  bringToBlade(barrel, deep);
  const result = barrel.insert(0);
  assert.equal(result.ok, true, 'the deep bore must accept the knife');
  assert.equal(result.reason, 'home');
  assert.equal(barrel.inserted, true);
}
{
  const barrel = createBarrel({ random: () => 0 });
  const shallow = barrel.holes.find(h => h.depth === DEPTHS.shallow);
  bringToBlade(barrel, shallow);
  const result = barrel.insert(0);
  assert.equal(result.ok, false, 'a shallow hole must refuse the knife');
  assert.equal(result.reason, 'too-shallow');
  assert.equal(barrel.inserted, false);
}
{
  /* Three holes, 120 degrees apart: there is a turn with nothing at the
     blade, and the knife must say so rather than guess. */
  const barrel = createBarrel({ holeCount: 3, random: () => 0 });
  barrel.turn(30);
  assert.equal(barrel.holeAtKnife(0), null, 'no hole should be at the blade');
  const result = barrel.insert(0);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'no-hole');
  assert.equal(barrel.inserted, false);
}

/* 8. Closeness: 0 nowhere, 0.5 at a shallow hole, 1 at the deep one. */
{
  const barrel = createBarrel({ random: () => 0 });
  const deep = barrel.holes[barrel.targetIndex];
  bringToBlade(barrel, deep);
  assert.equal(closeness(barrel, 0), 1);

  const shallow = barrel.holes.find(h => h.depth === DEPTHS.shallow);
  bringToBlade(barrel, shallow);
  assert.equal(closeness(barrel, 0), 0.5);

  const bare = createBarrel({ holeCount: 3, random: () => 0 });
  bare.turn(30);
  assert.equal(closeness(bare, 0), 0);
}

/* 9. Only one hole can be at the blade at a time — the holes are spread far
   enough apart that the tolerance window never catches two. A tolerance wide
   enough to swallow two would let the knife be offered a choice it cannot
   make, and would hand the player a free pass on the rotation. */
{
  const barrel = createBarrel({ holeCount: 3, random: () => 0 });
  for (let rotation = 0; rotation < 360; rotation++) {
    barrel.turn(1);
    const hits = barrel.holes.filter(h =>
      Math.abs(angleDelta(holeFacing(h, barrel.rotation), 0)) <= KNIFE_TOLERANCE);
    assert.ok(hits.length <= 1, `two holes claimed the blade at rotation ${barrel.rotation}`);
  }
}

/* 9b. The tolerance must be narrower than half the gap between two holes.
    This is the invariant the scan above can only check for the barrels it
    happens to build; stated directly it holds for every barrel. */
{
  for (let seed = 0; seed < 12; seed++) {
    const barrel = createBarrel({ random: () => (seed * 7 % 13) / 13 });
    const headings = barrel.holes.map(h => h.angle).sort((a, b) => a - b);
    let minGap = 360;
    for (let i = 0; i < headings.length; i++) {
      const next = headings[(i + 1) % headings.length];
      const gap = (next - headings[i] + 360) % 360;
      if (gap > 0 && gap < minGap) minGap = gap;
    }
    assert.ok(2 * KNIFE_TOLERANCE < minGap,
      `tolerance ${KNIFE_TOLERANCE} lets two holes share the blade (min gap ${minGap})`);
  }
}

/* 10. Every hole can be brought to the blade — the puzzle is always solvable
     by turning, for any barrel the game can produce. */
{
  for (let seed = 0; seed < 10; seed++) {
    const barrel = createBarrel({ random: () => (seed * 11 % 17) / 17 });
    const deep = barrel.holes[barrel.targetIndex];
    bringToBlade(barrel, deep);
    assert.equal(barrel.insert(0).ok, true, `barrel ${seed} must be solvable by turning`);
  }
}

console.log('pirate in a tank: projections, signed angles, one deep bore, and the hole at the blade is the one drawn in the middle');
