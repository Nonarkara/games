/**
 * Paper Soccer — table soccer as a tactical placement game.
 *
 * The weighted-disc table game, run on rules instead of physics. Aim where you
 * point, hold to load the flick, release. The ball slides flat in a straight
 * line and the first disc that line touches stops it, so the gap between
 * defenders is the whole game. The nearest man to where it stops snaps onto
 * it and his side is on the ball; then that side runs one player and the other
 * side answers with one, before the next flick. You then run one man toward it and the
 * other side runs one, positioning for what comes next. First to three. One
 * seat vs the machine, or two seats on a landscape pad.
 */

import { soundFx } from '../audio.js';
import { attachReady, showResult } from '../ui.js';

export const PITCH = Object.freeze({
  length: 105,
  width: 68,
  goalWidth: 16
});

export const MAX_KICK = 56;

// The picture is the rule. The ball rolls flat along the grass in a straight
// line, and it is stopped when its disc touches a body's disc — so these two
// radii are what the renderer draws AND what the physics tests. They used to
// disagree twice over: the drawn body was 3.1 while only 3.4 from the centre
// line blocked, and the ball was drawn lofting up to 16 units into the air on
// every kick, which is why shots read as sailing over a defender's head into
// the net. Nothing leaves the ground any more.
export const BODY_R = 1.6;    // an outfield disc, as drawn
export const BALL_R = 0.95;   // the ball, as drawn
// A man covers more grass than his base: legs, reach, a stuck-out boot. Tying
// the block to the drawn disc forced a choice between discs too fat to see
// past with 22 of them on the pitch, and discs so small that nothing was ever
// intercepted — at BODY_R 1.6 the interception rate was flatly 0%. So the
// cover is its own number, and it is DRAWN on the pitch the moment you start
// aiming: shown, not hidden in a constant.
export const COVER_R = 2.35;
export const BLOCK_RADIUS = COVER_R + BALL_R;     // ball meets the cover
export const GK_REACH = BLOCK_RADIUS + 2.0;       // a keeper's standing reach
// ...and he sets himself as the ball comes from further out. A shot from the
// halfway line gives him all the time in the world; one from the six-yard box
// gives him none. This is what makes working the ball upfield the point of the
// game instead of a formality — without it a full-weight flick from the centre
// spot simply goes in, which is exactly what it did.
export const GK_SET_PER_UNIT = 0.09;

/** How much of the mouth this keeper covers against a shot struck from `from`. */
export function keeperReach(from, keeper) {
  return GK_REACH + dist(from, keeper) * GK_SET_PER_UNIT;
}
export const POWER_CEILING = 1.12;
export const OVER_EXTRA = 10;
export const MOVE_FIELD = 18;
export const MOVE_GK = 14;
export const MIN_SEP = 2.6;
export const CANCEL_RADIUS = 3.5; // Drag within this radius of the ball to cancel kick
export const GOALS_TO_WIN = 3;
export const CHARGE_MS = 1050;

/**
 * Table Soccer audio synthesizer: tactile wooden flicks, plastic disc clacks,
 * ringing metallic woodwork chimes, and cushion bank thuds.
 */
export function playTableSound(type) {
  if (soundFx?.muted) return;
  soundFx?.init?.();
  const audio = soundFx?.ctx;
  if (!audio) return;
  const now = audio.currentTime;
  const vol = soundFx.volume || 0.3;

  try {
    if (type === 'flick') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.04);
      gain.gain.setValueAtTime(0.28 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'clack') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
      gain.gain.setValueAtTime(0.32 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'woodwork') {
      [520, 1040, 1560].forEach((freq, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime((0.35 / (i + 1)) * vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      });
    } else if (type === 'bank') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);
      gain.gain.setValueAtTime(0.35 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'screamer') {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
      gain.gain.setValueAtTime(0.25 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'whistle') {
      soundFx.playWhistle?.();
    }
  } catch {}
}

export const FORMATIONS = Object.freeze({
  '4-4-2': Object.freeze([
    { n: 1, depth: 0.055 },
    { n: 4, depth: 0.20 },
    { n: 4, depth: 0.355 },
    { n: 2, depth: 0.47 }
  ]),
  '4-3-3': Object.freeze([
    { n: 1, depth: 0.055 },
    { n: 4, depth: 0.20 },
    { n: 3, depth: 0.35 },
    { n: 3, depth: 0.47 }
  ]),
  '3-5-2': Object.freeze([
    { n: 1, depth: 0.055 },
    { n: 3, depth: 0.20 },
    { n: 5, depth: 0.35 },
    { n: 2, depth: 0.47 }
  ])
});

export const FORMATION_NAMES = Object.freeze(Object.keys(FORMATIONS));

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function otherTeam(team) {
  return team === 'red' ? 'blue' : 'red';
}

export function allPlayers(state) {
  return state.red.concat(state.blue);
}

export function teamOf(state, team) {
  return team === 'red' ? state.red : state.blue;
}

export function findPlayer(state, id) {
  return allPlayers(state).find(player => player.id === id) || null;
}

/**
 * How far this player can travel in one turn. A circle, not a ray: the point
 * of the move is to FIND SPACE. A runner who can only slide along straight
 * lines can never get free of a defender who simply stands still — and if
 * nobody can get free, nobody can be picked out, and the killer pass never
 * exists. Speed is the only limit on where inside that circle you land.
 */
export function moveRadius(player) {
  return player.role === 'gk' ? MOVE_GK : MOVE_FIELD;
}

export function goalMouthY() {
  const y0 = (PITCH.width - PITCH.goalWidth) / 2;
  return { y0, y1: y0 + PITCH.goalWidth };
}

export function inMouth(y) {
  const { y0, y1 } = goalMouthY();
  return y >= y0 && y <= y1;
}

export function keeperSpot(team) {
  return team === 'red'
    ? { x: 6, y: PITCH.width / 2 }
    : { x: PITCH.length - 6, y: PITCH.width / 2 };
}

export function closestTo(point, players) {
  let best = null;
  let bestD = Infinity;
  for (const player of players) {
    const d = dist(point, player);
    if (d < bestD) {
      best = player;
      bestD = d;
    }
  }
  return { player: best, dist: bestD };
}

function spreadX(count) {
  const margin = 10;
  if (count <= 1) return [PITCH.width / 2];
  const span = PITCH.width - margin * 2;
  return Array.from({ length: count }, (_, i) => margin + (span * i) / (count - 1));
}

export function placeTeam(team, formationName = '4-4-2') {
  const rows = FORMATIONS[formationName] || FORMATIONS['4-4-2'];
  const ownGoal = team === 'red' ? 0 : PITCH.length;
  const dir = team === 'red' ? 1 : -1;
  const players = [];
  let n = 0;
  for (const row of rows) {
    const x = ownGoal + dir * row.depth * PITCH.length;
    for (const y of spreadX(row.n)) {
      players.push({
        id: `${team}-${n}`,
        num: n === 0 ? 1 : n + 1,
        team,
        role: n === 0 ? 'gk' : 'field',
        x,
        y
      });
      n += 1;
    }
  }
  return players;
}

export function createMatch(redShape = '4-4-2', blueShape = '4-4-2') {
  const state = {
    redShape,
    blueShape,
    red: placeTeam('red', redShape),
    blue: placeTeam('blue', blueShape),
    ball: { x: PITCH.length / 2, y: PITCH.width / 2 },
    score: { red: 0, blue: 0 },
    phase: 'kick',
    possession: 'red',
    possessorId: null,
    kickingTeam: 'red',
    winner: null,
    log: 'KICK OFF'
  };
  return resetKickoff(state, 'red');
}

export function refreshPossession(state) {
  const { player } = closestTo(state.ball, allPlayers(state));
  state.possession = player.team;
  state.possessorId = player.id;
  return player;
}

export function resetKickoff(state, kickingTeam) {
  state.red = placeTeam('red', state.redShape);
  state.blue = placeTeam('blue', state.blueShape);
  // Dead centre. The offset existed so the nearest-man calculation favoured
  // the kicking team; the taker is named outright below, so it is just a ball
  // sitting off the spot.
  state.ball = { x: PITCH.length / 2, y: PITCH.width / 2 };
  state.phase = 'kick';
  state.kickingTeam = kickingTeam;
  state.winner = null;
  // The man taking the kickoff stands over the ball, exactly as he does after
  // every other restart. Leaving him a stride behind it made the first move of
  // the match a pass back to yourself from a player who was not on the ball.
  const taker = closestTo(state.ball, teamOf(state, kickingTeam)).player;
  state.possession = kickingTeam;
  state.possessorId = taker.id;
  taker.x = state.ball.x;
  taker.y = state.ball.y;
  return state;
}

/**
 * An attacker is offside if they are in the opponent half, ahead of the
 * ball, and ahead of the second-last opponent (the keeper is usually last).
 */
export function isOffside(player, opponents, ball) {
  const halfway = PITCH.length / 2;
  if (player.team === 'red') {
    if (player.x <= halfway) return false;
    const xs = opponents.map(o => o.x).sort((a, b) => b - a);
    const secondLast = xs[1] ?? xs[0];
    return player.x > secondLast && player.x > ball.x;
  }
  if (player.x >= halfway) return false;
  const xs = opponents.map(o => o.x).sort((a, b) => a - b);
  const secondLast = xs[1] ?? xs[0];
  return player.x < secondLast && player.x < ball.x;
}

export function kickTravel(power) {
  const p = Math.max(0, Math.min(Number(power) || 0, POWER_CEILING));
  const base = Math.min(p, 1) * MAX_KICK;
  const extra = p > 1 ? OVER_EXTRA * ((p - 1) / (POWER_CEILING - 1)) : 0;
  return base + extra;
}

export function kickDestination(ball, angle, power) {
  const travel = kickTravel(power);
  return {
    x: ball.x + Math.cos(angle) * travel,
    y: ball.y + Math.sin(angle) * travel
  };
}

function xAt(a, b, xLine) {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-9) return null;
  const t = (xLine - a.x) / dx;
  if (t <= 0 || t > 1) return null;
  return { x: xLine, y: a.y + t * (b.y - a.y), t };
}

function yAt(a, b, yLine) {
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1e-9) return null;
  const t = (yLine - a.y) / dy;
  if (t <= 0 || t > 1) return null;
  return { x: a.x + t * (b.x - a.x), y: yLine, t };
}

function clipSideline(a, b) {
  const hit = b.y < 0 ? yAt(a, b, 0) : yAt(a, b, PITCH.width);
  if (hit) {
    return {
      x: Math.min(PITCH.length - 0.4, Math.max(0.4, hit.x)),
      y: hit.y
    };
  }
  return {
    x: Math.min(PITCH.length, Math.max(0, b.x)),
    y: Math.min(PITCH.width, Math.max(0, b.y))
  };
}

/** Nearest point on segment a→b to p, with how far along the segment it sits. */
function nearestOnSegment(a, b, p) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return { t: 0, gap: dist(a, p), point: { x: a.x, y: a.y } };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { t, gap: dist(point, p), point };
}

/**
 * The first opponent whose reach covers the kick line.
 *
 * Without this the ball passed through every body on the pitch, so any aim
 * inside the posts from within MAX_KICK was an unstoppable goal — the centre
 * spot is 52.5 from goal and MAX_KICK is 56, which is why the machine could
 * kick off and score, three times, without ever being challenged.
 */
export function firstBlocker(ball, dest, defenders = []) {
  let best = null;
  for (const defender of defenders) {
    const reach = defender.role === 'gk' ? keeperReach(ball, defender) : BLOCK_RADIUS;
    const near = nearestOnSegment(ball, dest, defender);
    // t<=0.04 is a defender standing on the kicker, not one in the lane.
    if (near.t <= 0.04 || near.gap > reach) continue;
    if (!best || near.t < best.t) best = { ...near, player: defender };
  }
  return best;
}

/**
 * Can this shot beat the man in front of it? A deterministic block means a
 * defender standing in the lane is an unbeatable wall, which is why shots
 * never went in. A struck ball past a half-committed defender does go
 * through in the real game. Power does most of the work; catching him at the
 * edge of his reach does the rest. The keeper is exempt — he is meant to be
 * the last line, and a leaky keeper reads as a bug, not as drama.
 */
export function resolveKick(ball, dest, power, defenders = [], options = {}) {
  const tableSoccer = Boolean(options.tableSoccer);
  const allowBank = options.bank !== false;
  const over = power > 1;

  // 1. Table soccer sideline cushion reflection (bank shots)
  const yLine = dest.y < 0 ? 0 : (dest.y > PITCH.width ? PITCH.width : null);
  const hitCushion = allowBank && yLine !== null && Math.abs(dest.x - ball.x) >= 2
    ? yAt(ball, dest, yLine)
    : null;

  if (hitCushion && hitCushion.t > 0.04 && hitCushion.t < 0.98 && hitCushion.x >= 0 && hitCushion.x <= PITCH.length) {
    // Check if the initial path from ball to cushion is blocked
    const leg1Block = firstBlocker(ball, hitCushion, defenders);
    if (leg1Block && leg1Block.t < 1) {
      if (tableSoccer && power >= 0.65 && leg1Block.player.role !== 'gk') {
        const ang = Math.atan2(leg1Block.point.y - ball.y, leg1Block.point.x - ball.x);
        return {
          kind: 'deflect',
          dest: {
            x: Math.max(2, Math.min(PITCH.length - 2, leg1Block.point.x + Math.cos(ang + 0.6) * 4)),
            y: Math.max(2, Math.min(PITCH.width - 2, leg1Block.point.y + Math.sin(ang + 0.6) * 4))
          },
          by: leg1Block.player.id,
          point: leg1Block.point
        };
      }
      return {
        kind: leg1Block.player.role === 'gk' ? 'save' : 'block',
        dest: leg1Block.point,
        to: leg1Block.player.team,
        by: leg1Block.player.id
      };
    }
    // Reflected leg off the wooden rail
    const dx = dest.x - hitCushion.x;
    const dy = -(dest.y - hitCushion.y);
    const distRem = Math.hypot(dx, dy) * 0.9;
    const refDest = {
      x: hitCushion.x + (dx / (Math.hypot(dx, dy) || 1)) * distRem,
      y: hitCushion.y + (dy / (Math.hypot(dx, dy) || 1)) * distRem
    };
    const leg2 = resolveKick(hitCushion, refDest, power * (1 - hitCushion.t), defenders, { ...options, bank: false });
    return {
      ...leg2,
      bounce: { x: hitCushion.x, y: hitCushion.y },
      bank: true
    };
  }

  // 2. Direct path raycast
  const block = firstBlocker(ball, dest, defenders);
  const atRedLine = ball.x > 0 ? xAt(ball, dest, 0) : null;
  const atBlueLine = ball.x < PITCH.length ? xAt(ball, dest, PITCH.length) : null;
  const exitT = atRedLine?.t ?? atBlueLine?.t ?? 1;

  if (block && block.t < exitT) {
    if (tableSoccer && power >= 0.65) {
      if (block.player.role === 'gk') {
        const reboundX = block.player.team === 'red' ? 9 : PITCH.length - 9;
        const reboundY = block.point.y + (block.point.y < 34 ? 6 : -6);
        return {
          kind: 'parry',
          dest: { x: reboundX, y: Math.max(4, Math.min(PITCH.width - 4, reboundY)) },
          by: block.player.id,
          point: block.point
        };
      }
      const ang = Math.atan2(block.point.y - ball.y, block.point.x - ball.x);
      return {
        kind: 'deflect',
        dest: {
          x: Math.max(2, Math.min(PITCH.length - 2, block.point.x + Math.cos(ang + 0.6) * 4.5)),
          y: Math.max(2, Math.min(PITCH.width - 2, block.point.y + Math.sin(ang + 0.6) * 4.5))
        },
        by: block.player.id,
        point: block.point
      };
    }
    return {
      kind: block.player.role === 'gk' ? 'save' : 'block',
      dest: block.point,
      to: block.player.team,
      by: block.player.id
    };
  }

  const { y0, y1 } = goalMouthY();
  const atRed = ball.x > 0 ? xAt(ball, dest, 0) : null;
  if (atRed) {
    // Upright post or crossbar hit
    if (tableSoccer && ((atRed.y >= y0 - 1.2 && atRed.y < y0) || (atRed.y > y1 && atRed.y <= y1 + 1.2) || (power > 1.0 && power <= 1.08 && inMouth(atRed.y)))) {
      const postY = atRed.y < 34 ? y0 : y1;
      return {
        kind: 'woodwork',
        post: { x: 0, y: postY },
        dest: { x: 10 + (atRed.y % 3), y: postY + (postY < 34 ? 7 : -7) },
        against: 'red'
      };
    }
    if (inMouth(atRed.y)) {
      if (over) return { kind: 'over', dest: keeperSpot('red'), keeperTeam: 'red' };
      return { kind: 'goal', scorer: 'blue', dest: atRed };
    }
    return { kind: 'goal-kick', dest: keeperSpot('red'), to: 'red' };
  }

  const atBlue = ball.x < PITCH.length ? xAt(ball, dest, PITCH.length) : null;
  if (atBlue) {
    // Upright post or crossbar hit
    if (tableSoccer && ((atBlue.y >= y0 - 1.2 && atBlue.y < y0) || (atBlue.y > y1 && atBlue.y <= y1 + 1.2) || (power > 1.0 && power <= 1.08 && inMouth(atBlue.y)))) {
      const postY = atBlue.y < 34 ? y0 : y1;
      return {
        kind: 'woodwork',
        post: { x: PITCH.length, y: postY },
        dest: { x: PITCH.length - (10 + (atBlue.y % 3)), y: postY + (postY < 34 ? 7 : -7) },
        against: 'blue'
      };
    }
    if (inMouth(atBlue.y)) {
      if (over) return { kind: 'over', dest: keeperSpot('blue'), keeperTeam: 'blue' };
      return { kind: 'goal', scorer: 'red', dest: atBlue };
    }
    return { kind: 'goal-kick', dest: keeperSpot('blue'), to: 'blue' };
  }

  if (dest.y < 0 || dest.y > PITCH.width) {
    return { kind: 'throw-in', dest: clipSideline(ball, dest) };
  }
  if (dest.x < 0 || dest.x > PITCH.length) {
    const to = dest.x < 0 ? 'red' : 'blue';
    return { kind: 'goal-kick', dest: keeperSpot(to), to };
  }
  return { kind: 'play', dest: { x: dest.x, y: dest.y } };
}

function snapKeeperToBall(state, team) {
  const gk = teamOf(state, team).find(p => p.role === 'gk');
  if (!gk) return;
  gk.x = state.ball.x;
  gk.y = state.ball.y;
}

export function applyKick(state, angle, power, options = {}) {
  if (state.phase !== 'kick' || state.winner) return state;
  const kicker = findPlayer(state, state.possessorId);
  if (!kicker) return state;
  const kickingTeam = kicker.team;
  const opponents = teamOf(state, otherTeam(kickingTeam));
  const offsideIds = new Set(
    teamOf(state, kickingTeam)
      .filter(p => p.id !== kicker.id && isOffside(p, opponents, state.ball))
      .map(p => p.id)
  );

  const dest = kickDestination(state.ball, angle, power);
  const result = resolveKick(state.ball, dest, power, opponents, options);

  if (result.kind === 'woodwork') {
    state.ball = { ...result.dest };
    return takeOver(state, closestTo(state.ball, allPlayers(state)).player, 'DONK! OFF THE WOODWORK!');
  }

  if (result.kind === 'deflect') {
    state.ball = { ...result.dest };
    return takeOver(state, closestTo(state.ball, allPlayers(state)).player, 'PINBALL DEFLECTION!');
  }

  if (result.kind === 'parry') {
    state.ball = { ...result.dest };
    return takeOver(state, closestTo(state.ball, allPlayers(state)).player, 'HOWLER! SPILLED REBOUND!');
  }

  if (result.kind === 'block' || result.kind === 'save') {
    state.ball = { ...result.dest };
    return takeOver(state, findPlayer(state, result.by),
      result.kind === 'save' ? 'KEEPER SAVES' : 'INTERCEPTED');
  }

  if (result.kind === 'goal') {
    state.score[result.scorer] += 1;
    if (result.bank) {
      state.log = `${result.scorer.toUpperCase()} BANK GOAL! WHAT A TRICK SHOT!`;
    } else if (power >= 0.9) {
      state.log = `${result.scorer.toUpperCase()} ROCKET! WHAT A SCREAMER!`;
    } else {
      state.log = `${result.scorer.toUpperCase()} GOAL`;
    }
    if (state.score[result.scorer] >= GOALS_TO_WIN) {
      state.winner = result.scorer;
      state.phase = 'over';
      state.ball = result.dest;
      return state;
    }
    return resetKickoff(state, otherTeam(result.scorer));
  }

  if (result.kind === 'over' || result.kind === 'goal-kick') {
    const to = result.kind === 'over' ? result.keeperTeam : result.to;
    state.ball = { ...result.dest };
    snapKeeperToBall(state, to);
    return takeOver(state, teamOf(state, to).find(p => p.role === 'gk'),
      result.kind === 'over' ? 'OVERHIT · KEEPER COLLECTS' : 'GOAL KICK');
  }

  if (result.kind === 'throw-in') {
    state.ball = result.dest;
    return takeOver(state, closestTo(state.ball, opponents).player, 'THROW-IN');
  }

  // The ball stops; the nearest man on the pitch snaps onto it and his side
  // is on the ball.
  state.ball = result.dest;
  const claim = closestTo(state.ball, allPlayers(state)).player;
  if (claim.team === kickingTeam && offsideIds.has(claim.id)) {
    return takeOver(state, closestTo(state.ball, opponents).player, 'OFFSIDE');
  }
  const defaultLog = result.bank
    ? (claim.team === kickingTeam ? 'BANK PASS COMPLETED' : 'TURNOVER OFF THE CUSHION')
    : (claim.team === kickingTeam ? 'ON THE BALL' : 'TURNOVER');
  return takeOver(state, claim, defaultLog);
}

/**
 * Hand the ball to `player`: he snaps onto it, his side is in possession, and
 * his side gets the one move before the next kick. The single place a turn
 * changes hands, so the rule cannot drift between outcomes.
 */
function takeOver(state, player, log) {
  if (!player) return state;
  // Where he came from, so the board can walk him onto the ball instead of
  // snapping him there. The ball comes to rest, then someone goes and takes
  // it — that arrival is the tackle, and it should be something you watch.
  state.collect = (player.x !== state.ball.x || player.y !== state.ball.y)
    ? { id: player.id, from: { x: player.x, y: player.y } }
    : null;
  player.x = state.ball.x;
  player.y = state.ball.y;
  state.possession = player.team;
  state.possessorId = player.id;
  state.phase = 'move';
  state.log = log;
  return state;
}

function pullOnside(player, dest, opponents, ball) {
  if (!isOffside({ ...player, ...dest }, opponents, ball)) return dest;
  let lo = 0;
  let hi = 1;
  const from = { x: player.x, y: player.y };
  let best = { x: from.x, y: from.y };
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const trial = {
      x: from.x + (dest.x - from.x) * mid,
      y: from.y + (dest.y - from.y) * mid
    };
    if (isOffside({ ...player, ...trial }, opponents, ball)) hi = mid;
    else {
      best = trial;
      lo = mid;
    }
  }
  return best;
}

function separate(point, selfId, state) {
  let { x, y } = point;
  for (const other of allPlayers(state)) {
    if (other.id === selfId) continue;
    const d = Math.hypot(x - other.x, y - other.y);
    if (d >= MIN_SEP) continue;
    if (d > 1e-9) {
      const s = MIN_SEP / d;
      x = other.x + (x - other.x) * s;
      y = other.y + (y - other.y) * s;
    } else {
      // Dead centre on top of him. With free movement you can now aim at a
      // body exactly, and the old divide-by-zero guard just left the two
      // stacked. Nudge along the pitch's long axis so the result is stable.
      x = other.x + MIN_SEP;
      y = other.y;
    }
  }
  return {
    x: Math.min(PITCH.length, Math.max(0, x)),
    y: Math.min(PITCH.width, Math.max(0, y))
  };
}

export function clampMove(player, dest, state) {
  const from = { x: player.x, y: player.y };
  const dx = dest.x - from.x;
  const dy = dest.y - from.y;
  const want = Math.hypot(dx, dy);
  if (want < 1e-6) return { x: from.x, y: from.y };

  const ux = dx / want;
  const uy = dy / want;

  // Anywhere inside the speed circle is fair game. Nobody's body blocks the
  // PATH any more — a runner goes round a standing defender, which is what a
  // real one does. Bodies only stop you from LANDING on top of someone
  // (separate() below). Take the two rules together and a defence that never
  // moves can no longer wall off the pitch; it can only cover space.
  let tMax = Math.min(want, moveRadius(player));

  // Offside is the one line you still cannot run past. Binary-search the
  // furthest legal point on the way to where you asked for, testing the
  // fully-resolved position so a body nudge can't sneak you past the line.
  const opponents = teamOf(state, otherTeam(player.team));
  const at = t => separate({ x: from.x + ux * t, y: from.y + uy * t }, player.id, state);
  if (isOffside({ ...player, ...at(tMax) }, opponents, state.ball)) {
    let lo = 0;
    let hi = tMax;
    for (let step = 0; step < 20; step++) {
      const mid = (lo + hi) / 2;
      if (isOffside({ ...player, ...at(mid) }, opponents, state.ball)) hi = mid;
      else lo = mid;
    }
    tMax = lo;
  }

  return at(Math.max(0, tMax));
}

export function rayInfo(player, dest, state) {
  const from = { x: player.x, y: player.y };
  const target = clampMove(player, dest, state);
  const dx = dest.x - from.x;
  const dy = dest.y - from.y;
  const targetDist = Math.hypot(dx, dy);
  const actualDist = Math.hypot(target.x - from.x, target.y - from.y);
  const radius = moveRadius(player);
  let blockedBy = null;
  let reason = 'clear';

  if (actualDist + 0.15 < targetDist) {
    const opponents = teamOf(state, otherTeam(player.team));
    if (isOffside({ ...player, x: dest.x, y: dest.y }, opponents, state.ball)) {
      reason = 'offside';
    } else if (targetDist > radius + 0.15) {
      reason = 'range';
    } else {
      // Only thing left that can shorten a legal in-range move is another body
      // occupying the spot you asked for.
      for (const other of allPlayers(state)) {
        if (other.id === player.id) continue;
        if (Math.hypot(dest.x - other.x, dest.y - other.y) < MIN_SEP) {
          blockedBy = other;
          reason = 'occupied';
          break;
        }
      }
      if (!blockedBy) reason = 'boundary';
    }
  }

  return { from, dest, target, blockedBy, reason, actualDist, targetDist, radius };
}


/** Who is on the clock during a move phase: the side on the ball, then the other. */
export function moverTeam(state) {
  if (state.phase === 'move') return state.possession;
  if (state.phase === 'move-opp') return otherTeam(state.possession);
  return null;
}

/**
 * The men a side may actually run this turn. The one standing on the ball is
 * holding it and cannot be run off it — the way to move the ball is to flick
 * it. The UI picks from this same list, because offering a man the rule then
 * refuses is how every drag came to do nothing at all.
 */
export function movablePlayers(state, team) {
  return teamOf(state, team).filter(p => p.id !== state.possessorId);
}

export function applyMove(state, playerId, dest) {
  if (state.winner) return state;
  const expected = moverTeam(state);
  if (!expected) return state;
  const player = findPlayer(state, playerId);
  if (!player || player.team !== expected) return state;
  if (!movablePlayers(state, expected).some(p => p.id === player.id)) return state;
  const next = clampMove(player, dest, state);
  player.x = next.x;
  player.y = next.y;
  return advanceMove(state);
}

export function skipMove(state) {
  if (!moverTeam(state)) return state;
  return advanceMove(state);
}

/**
 * The side on the ball runs one man, then the other side runs one — so a
 * defence can always answer the ball moving, which is the whole reason to
 * keep a body between it and your goal.
 */
function advanceMove(state) {
  if (state.phase === 'move') {
    state.phase = 'move-opp';
    state.log = `${otherTeam(state.possession).toUpperCase()} RUN`;
  } else {
    state.phase = 'kick';
    state.log = 'YOUR FLICK';
  }
  return state;
}

export function matchScore(state, team = 'red') {
  if (!state) return 0;
  if (state.winner === team) return GOALS_TO_WIN;
  return state.score?.[team] || 0;
}

/** Power so a drag lands on `at` when the pointer is within a full kick. */
export function powerForAim(ball, at) {
  const d = dist(ball, at);
  return Math.max(0.08, Math.min(POWER_CEILING, d / MAX_KICK));
}

export function aimFromPointer(ball, at) {
  const dx = at.x - ball.x;
  const dy = at.y - ball.y;
  if (Math.hypot(dx, dy) < 0.8) return null;
  return { angle: Math.atan2(dy, dx), power: powerForAim(ball, at) };
}

/**
 * How close a man can get to `dest` with one run. That leftover gap is
 * the possession race: smaller wins the next flick.
 */
export function collectDistance(player, dest, state) {
  const trial = { ...state, ball: dest };
  const after = clampMove(player, dest, trial);
  return dist(after, dest);
}

export function bestCollector(players, dest, state) {
  let best = null;
  let bestD = Infinity;
  for (const player of players) {
    const d = collectDistance(player, dest, state);
    if (d < bestD) {
      best = player;
      bestD = d;
    }
  }
  return { player: best, dist: bestD };
}

/**
 * Live read of a pass, under exactly the rule applyKick uses: the nearest man
 * on the pitch to where the ball stops snaps onto it. Straight-line distance,
 * no runs, no margin — so the badge on screen and the machine's plan and the
 * outcome are all the same computation.
 */
export function possessionPreview(state, dest, kickingTeam) {
  const us = closestTo(dest, teamOf(state, kickingTeam));
  const them = closestTo(dest, teamOf(state, otherTeam(kickingTeam)));
  return { claim: us.dist <= them.dist ? 'yours' : 'theirs', us, them };
}

export function goalTarget(team) {
  return team === 'red'
    ? { x: PITCH.length, y: PITCH.width / 2 }
    : { x: 0, y: PITCH.width / 2 };
}

/**
 * The machine:
 * 1. Checks if it has a clean shot inside the posts.
 * 2. Otherwise tests a fan of angles and powers, scoring each pass by:
 *    - Territory gained toward opponent goal
 *    - Guaranteed ownership (us closer than them)
 *    - Short distance for its own collector to reach
 */
export function pickCpuKick(state) {
  const team = state.possession;
  const ball = state.ball;
  const { y0, y1 } = goalMouthY();

  // The machine must respect bodies in the lane too — without `foes` it saw a
  // clean shot from anywhere inside MAX_KICK and took it every single kickoff.
  const foes = teamOf(state, otherTeam(team));

  const samples = Array.from({ length: 7 }, (_, i) => y0 + 1 + (i / 6) * (y1 - y0 - 2));
  for (const y of samples) {
    const goal = { x: team === 'red' ? PITCH.length : 0, y };
    const aim = aimFromPointer(ball, goal);
    if (!aim || aim.power > 1) continue;
    const dest = kickDestination(ball, aim.angle, aim.power);
    const result = resolveKick(ball, dest, aim.power, foes);
    if (result.kind === 'goal' && result.scorer === team) return aim;
  }

  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    for (const power of [0.22, 0.36, 0.5, 0.66, 0.84]) {
      const dest = kickDestination(ball, ang, power);
      const result = resolveKick(ball, dest, power, foes);
      if (result.kind === 'goal' && result.scorer === team) return { angle: ang, power };
      if (result.kind !== 'play') continue;
      const preview = possessionPreview(state, result.dest, team);
      // Losing the ball costs more than any amount of territory. Among passes
      // it keeps, prefer the one that gains ground — and charge a small toll
      // for shuffling the ball back and forth over the same grass.
      const toward = team === 'red' ? result.dest.x : PITCH.length - result.dest.x;
      const here = team === 'red' ? ball.x : PITCH.length - ball.x;
      const own = preview.claim === 'yours' ? 200 : 0;
      const score = own + (toward - here) * 1.4 - preview.us.dist * 0.4;
      if (score > bestScore) {
        bestScore = score;
        best = { angle: ang, power };
      }
    }
  }
  if (best) return best;
  const fallback = goalTarget(team);
  return aimFromPointer(ball, fallback) || { angle: team === 'red' ? 0 : Math.PI, power: 0.35 };
}

/** Pure CPU run: the man who can get closest to the disc, then go there. */
export function pickCpuMove(state) {
  const team = moverTeam(state);
  if (!team) return null;
  const mates = movablePlayers(state, team).filter(p => p.role !== 'gk');
  if (!mates.length) return null;
  const SPACE_WEIGHT = 0.6;
  const attacking = team === state.possession;
  const foes = teamOf(state, otherTeam(team));

  if (attacking) {
    // Offer a receiver. Prefer a man who ends up ahead of the ball with a
    // clear lane to it, but take the best available push either way — a
    // defence outnumbers you behind the ball, so refusing to move at all
    // until the lane is perfect is how an attack seizes up entirely.
    const goal = goalTarget(team);
    let best = null;
    let bestScore = -Infinity;
    for (const mate of mates) {
      // Sweep the whole reach circle, not just the line to goal. Getting FREE
      // is often sideways or even backwards, and a receiver nobody is marking
      // is what turns an ordinary ball into a killer pass. Sampling only the
      // goalward line is how an attack ends up permanently crowded.
      const reach = moveRadius(mate);
      for (let a = 0; a < 360; a += 30) {
        for (const frac of [0.45, 0.8, 1]) {
          const rad = a * Math.PI / 180;
          const landing = clampMove(mate, {
            x: mate.x + Math.cos(rad) * reach * frac,
            y: mate.y + Math.sin(rad) * reach * frac
          }, state);
          const open = !firstBlocker(state.ball, landing, foes);
          const gain = team === 'red' ? landing.x : PITCH.length - landing.x;
          // How much daylight has he got? An unmarked man is worth more than
          // a few metres of ground.
          const marker = foes.reduce((m, f) => Math.min(m, dist(f, landing)), Infinity);
          const space = Math.min(marker, 25);
          // ponytail: 0.6 is tuned, not guessed — 12-match self-play stays at
          // 36 goals / 0 deadlocks anywhere in 0.3-0.8, and collapses to 0
          // goals and a stalled ball at 1.6, where getting free outranks
          // getting forward and every attacker just runs to an empty corner.
          const score = gain + (open ? 45 : 0) + space * SPACE_WEIGHT - dist(state.ball, landing) * 0.25;
          if (score > bestScore) { bestScore = score; best = { playerId: mate.id, dest: landing }; }
        }
      }
    }
    return best;
  }

  // Defending: stand on the line between the ball and your own goal — the
  // shot is only on when that line is clear, so occupying it is the job.
  const own = goalTarget(otherTeam(team));
  let best = null;
  let bestGap = Infinity;
  for (const mate of mates) {
    for (const frac of [0.25, 0.4, 0.55, 0.7]) {
      const spot = {
        x: state.ball.x + (own.x - state.ball.x) * frac,
        y: state.ball.y + (own.y - state.ball.y) * frac
      };
      const landing = clampMove(mate, spot, state);
      const gap = dist(landing, spot);
      if (gap < bestGap) { bestGap = gap; best = { playerId: mate.id, dest: landing }; }
    }
  }
  return best;
}

/* ===========================================================================
 * Renderer — drag the disc to place a pass. A live mark says who would
 * own it after one run each. Default seat is you (red) vs the machine.
 * ======================================================================== */

const FRAME = 'paper-soccer relative bg-black border border-amber-500/40 text-white font-mono-hud select-none';
const RED = '#c45c4a';
const BLUE = '#6f93c2';
const AMBER = '#f59e0b';
const INK = '#e6edf3';
const DIM = '#6b7785';

export function renderPaperSoccer(container, onClose) {
  let redShape = '4-4-2';
  let blueShape = '4-4-2';
  let vsCpu = true;
  let state = createMatch(redShape, blueShape);
  let started = false;
  let selectedId = null;
  let charge = null;
  let activeDrag = null;
  let flying = null;
  let celebration = null;
  let cpuBusy = false;
  let raf = 0;
  let cpuRetry = 0;
  let collecting = null;
  let canvas;
  let ctx;
  let map = { left: 0, top: 0, scale: 1, cssW: 640, cssH: 380 };
  let shake = 0;
  let particles = [];

  function spawnParticles(x, y, color = '#f59e0b', count = 6) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.2 + Math.random() * 2.5;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1.0,
        color
      });
    }
  }

  function humanTeam() { return vsCpu ? 'red' : null; }
  function cpuTeam() { return vsCpu ? 'blue' : null; }
  function isHumanTurn() {
    if (!vsCpu) return true;
    if (state.phase === 'kick') return state.possession === 'red';
    if (state.phase === 'move' || state.phase === 'move-opp') return moverTeam(state) === 'red';
    return false;
  }

  function mount() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center px-3 pt-2.5 pb-2 border-b border-amber-500/40">
          <div class="flex items-center gap-3">
            <span class="text-xl text-amber-400" aria-hidden="true">⚽</span>
            <div>
              <h2 class="text-sm font-black text-amber-400 tracking-wider">PAPER SOCCER</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Point · hold for weight · release · first to three</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
        </div>
        <div class="ps-board">
          <button type="button" class="ps-skip ps-skip-red" hidden title="Skip Red's run (or press S)">SKIP</button>
          <button type="button" class="ps-cancel-kick" id="ps-cancel-kick" hidden title="Cancel kick (or press Esc)">✕ CANCEL</button>
          <canvas class="ps-pitch" width="1100" height="640" aria-label="Paper Soccer Pitch"></canvas>
          <button type="button" class="ps-skip ps-skip-blue" hidden title="Skip Blue's run">SKIP</button>
        </div>
        <div class="ps-setup" id="ps-setup">
          <p class="ps-setup-lead">Tactical soccer at chess speed. Each turn, move one runner anywhere inside his reach circle — how far his legs carry him in one turn. Go round a marker, drop into space, whatever gets him free; you just cannot finish standing on someone. Offside is strictly active. Then drag to set kick direction and distance (weight); drag back onto the ball or tap Cancel to abort safely without kicking. Find a man in space and the killer pass is on.</p>
          <div class="ps-setup-row">
            <span>SEATS</span>
            <button type="button" class="ps-seat is-on" data-seat="cpu">YOU vs MACHINE</button>
            <button type="button" class="ps-seat" data-seat="two">TWO SEATS (SHARED PAD)</button>
          </div>
          <div class="ps-setup-row">
            <span>RED SHAPE</span>
            ${FORMATION_NAMES.map(name => `<button type="button" class="ps-shape" data-team="red" data-shape="${name}">${name}</button>`).join('')}
          </div>
          <div class="ps-setup-row ps-setup-row-blue">
            <span>BLUE SHAPE</span>
            ${FORMATION_NAMES.map(name => `<button type="button" class="ps-shape" data-team="blue" data-shape="${name}">${name}</button>`).join('')}
          </div>
          <button type="button" class="ps-play" id="ps-play">KICK OFF MATCH</button>
        </div>
      </div>`;

    canvas = container.querySelector('.ps-pitch');
    canvas.style.touchAction = 'none';
    ctx = canvas.getContext('2d');
    container.querySelector('#close-game-btn').onclick = cleanupAndClose;
    container.querySelectorAll('.ps-seat').forEach(btn => {
      btn.onclick = () => {
        vsCpu = btn.dataset.seat === 'cpu';
        container.querySelectorAll('.ps-seat').forEach(b => b.classList.toggle('is-on', b === btn));
      };
    });
    container.querySelectorAll('.ps-shape').forEach(btn => {
      btn.onclick = () => {
        const team = btn.dataset.team;
        const shape = btn.dataset.shape;
        if (team === 'red') redShape = shape;
        else blueShape = shape;
        state = createMatch(redShape, blueShape);
        paintShapes();
        draw();
      };
    });
    container.querySelector('.ps-skip-red').onclick = () => onSkip('red');
    container.querySelector('.ps-skip-blue').onclick = () => onSkip('blue');
    const cancelKickBtn = container.querySelector('#ps-cancel-kick');
    if (cancelKickBtn) cancelKickBtn.onclick = () => { charge = null; draw(); };

    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (charge) { charge = null; draw(); }
      if (activeDrag) { activeDrag = null; draw(); }
    });

    bindPointer(canvas);
    bindKeyboard();
    paintShapes();
    resize();
    draw();
    window.addEventListener('resize', resize);

    container.querySelector('#ps-play').onclick = () => {
      const setup = container.querySelector('#ps-setup');
      if (setup) setup.remove();
      state = createMatch(redShape, blueShape);
      resize();
      draw();
      attachReady(container.querySelector('.ps-board'), () => {
        started = true;
        soundFx.playWhistle?.();
        loop();
        maybeCpu();
      });
    };
  }

  function cleanupAndClose() {
    cancelAnimationFrame(raf);
    clearTimeout(cpuRetry);
    window.removeEventListener('resize', resize);
    if (window._psKeyHandler) {
      window.removeEventListener('keydown', window._psKeyHandler);
      window._psKeyHandler = null;
    }
    onClose();
  }

  function bindKeyboard() {
    const handler = event => {
      if (!started || flying || celebration || collecting || cpuBusy || state.winner || state.phase === 'over') return;
      if (!isHumanTurn()) return;
      const key = event.key;
      if (key === 's' || key === 'S') {
        event.preventDefault();
        const team = moverTeam(state);
        onSkip(team);
        return;
      }
      if (key === 'Tab') {
        event.preventDefault();
        const mover = moverTeam(state);
        const mates = teamOf(state, mover).filter(p => p.role === 'field');
        const curIdx = mates.findIndex(p => p.id === selectedId);
        const nextIdx = (curIdx + 1) % mates.length;
        selectedId = mates[nextIdx].id;
        draw();
        return;
      }
      if (key === 'Escape') {
        event.preventDefault();
        if (charge) { charge = null; draw(); return; }
        if (activeDrag) { activeDrag = null; draw(); return; }
        if (selectedId) { selectedId = null; draw(); return; }
        return;
      }
      if (key === ' ' || key === 'Enter') {
        event.preventDefault();
        if (state.phase === 'kick') {
          const aim = pickCpuKick(state);
          if (aim) startFlight(aim.angle, aim.power);
          return;
        }
        if (selectedId && moverTeam(state)) {
          applyMove(state, selectedId, { ...state.ball });
          selectedId = null;
          soundFx.playClick();
          afterHumanAct();
        }
      }
    };
    if (window._psKeyHandler) window.removeEventListener('keydown', window._psKeyHandler);
    window._psKeyHandler = handler;
    window.addEventListener('keydown', handler);
  }

  function paintShapes() {
    container.querySelectorAll('.ps-shape').forEach(btn => {
      const on = (btn.dataset.team === 'red' ? redShape : blueShape) === btn.dataset.shape;
      btn.classList.toggle('is-on', on);
    });
  }

  function resize() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    const w = Math.max(320, wrap.clientWidth || 640);
    const h = Math.max(220, Math.min(w * 0.62, (window.innerHeight || 700) * 0.72));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padX = w < 540 ? 24 : 64;
    const padY = w < 540 ? 22 : 28;
    const scale = Math.min((w - padX * 2) / PITCH.length, (h - padY * 2) / PITCH.width);
    map = {
      left: (w - PITCH.length * scale) / 2,
      top: (h - PITCH.width * scale) / 2,
      scale,
      cssW: w,
      cssH: h
    };
  }

  function toScreen(pt) {
    return {
      x: map.left + pt.x * map.scale,
      y: map.top + pt.y * map.scale
    };
  }

  function toPitch(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * map.cssW;
    const y = ((clientY - rect.top) / rect.height) * map.cssH;
    return {
      x: (x - map.left) / map.scale,
      y: (y - map.top) / map.scale
    };
  }

  function pointerInfo(event) {
    const t = event.touches ? event.touches[0] || event.changedTouches[0] : event;
    return toPitch(t.clientX, t.clientY);
  }

  function bindPointer(el) {
    const down = event => {
      if (!started || flying || celebration || collecting || cpuBusy || state.winner || state.phase === 'over') return;
      if (!isHumanTurn()) return;
      event.preventDefault();
      const pt = pointerInfo(event);

      if (state.phase === 'kick') {
        if (event.pointerId != null && el.setPointerCapture) {
          try { el.setPointerCapture(event.pointerId); } catch (e) {}
        }
        const d = dist(state.ball, pt);
        const isCancel = d < CANCEL_RADIUS;
        const lock = aimFromPointer(state.ball, pt);
        charge = {
          from: { ...state.ball },
          at: pt,
          startPt: { x: pt.x, y: pt.y },
          angle: lock ? lock.angle : (state.possession === 'red' ? 0 : Math.PI),
          power: lock ? lock.power : 0.25,
          start: performance.now(),
          isCancel,
          hasDragged: false
        };
        draw();
        return;
      }

      const team = moverTeam(state);
      const touchedPlayer = movableMen(team).find(p => dist(pt, p) <= 5);
      if (touchedPlayer) {
        if (event.pointerId != null && el.setPointerCapture) {
          try { el.setPointerCapture(event.pointerId); } catch (e) {}
        }
        activeDrag = {
          player: touchedPlayer,
          startPt: { x: pt.x, y: pt.y },
          currentPt: { x: pt.x, y: pt.y },
          hasMoved: false
        };
        selectedId = touchedPlayer.id;
        draw();
        return;
      }

      const target = dist(pt, state.ball) <= 6 ? { ...state.ball } : pt;

      // Nothing picked up, and you tapped open grass: send whoever can get
      // there. The decision worth making is WHERE a man should be, not which
      // shirt runs — asking for both made two thirds of every match's taps
      // bookkeeping. Drag a specific man when you want that one.
      const runner = selectedId || bestCollector(movableMen(team), target, state).player?.id;
      if (!runner) return;

      const before = state.phase;
      applyMove(state, runner, target);
      if (state.phase === before) { draw(); return; }  // refused — still your run
      selectedId = null;
      soundFx.playClick();
      afterHumanAct();
    };

    const move = event => {
      if (!started || flying || celebration || collecting || cpuBusy) return;
      const pt = pointerInfo(event);
      if (charge) {
        charge.at = pt;
        if (dist(pt, charge.startPt) > 1.2) {
          charge.hasDragged = true;
        }
        const d = dist(state.ball, pt);
        if (d < CANCEL_RADIUS) {
          charge.isCancel = true;
        } else {
          charge.isCancel = false;
          const lock = aimFromPointer(state.ball, pt);
          if (lock) {
            charge.angle = lock.angle;
            charge.power = lock.power;
          }
        }
        draw();
        return;
      }
      if (activeDrag) {
        activeDrag.currentPt = pt;
        if (dist(activeDrag.startPt, pt) > 1.5) {
          activeDrag.hasMoved = true;
        }
        draw();
      }
    };

    const up = event => {
      if (event.pointerId != null && el.releasePointerCapture) {
        try { el.releasePointerCapture(event.pointerId); } catch (e) {}
      }

      if (charge) {
        const c = charge;
        charge = null;

        // Cancelled if inside cancel radius, or if explicitly marked cancel
        if (c.isCancel) {
          draw();
          return;
        }

        const d = dist(state.ball, c.at);
        if (d < CANCEL_RADIUS) {
          draw();
          return;
        }

        const power = Math.max(0.12, Math.min(POWER_CEILING, c.power));
        startFlight(c.angle, power);
        return;
      }

      if (activeDrag) {
        const pt = pointerInfo(event);
        const drag = activeDrag;
        activeDrag = null;
        if (drag.hasMoved) {
          const before = state.phase;
          applyMove(state, drag.player.id, pt);
          if (state.phase === before) { draw(); return; }  // refused — still your run
          selectedId = null;
          soundFx.playClick();
          afterHumanAct();
        } else {
          selectedId = drag.player.id;
          draw();
        }
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);

    // Double-click to shoot: full weight at the spot you hit. Holding a drag
    // to build weight is right for a measured pass and wrong for a shot you
    // have already decided on, so this is the fast path — same aim, no wind-up.
    el.addEventListener('dblclick', event => {
      if (!started || flying || celebration || collecting || cpuBusy || state.winner) return;
      if (state.phase !== 'kick' || !isHumanTurn()) return;
      event.preventDefault();
      const pt = pointerInfo(event);
      if (dist(state.ball, pt) < CANCEL_RADIUS) return;   // that is the cancel zone
      const lock = aimFromPointer(state.ball, pt);
      if (!lock) return;
      charge = null;
      startFlight(lock.angle, 1);
    });
  }

  /** Opponents of whoever is on the ball — the bodies a kick must beat. */
  function defendersNow() {
    const kicker = findPlayer(state, state.possessorId);
    return kicker ? teamOf(state, otherTeam(kicker.team)) : [];
  }

  function startFlight(angle, power) {
    const dest = kickDestination(state.ball, angle, power);
    const preview = resolveKick(state.ball, dest, power, defendersNow());
    flying = {
      from: { ...state.ball },
      to: preview.dest,
      start: performance.now(),
      ms: 280 + kickTravel(power) * 7.5,
      angle,
      power
    };
    soundFx.playHit();
  }

  const movableMen = team => movablePlayers(state, team);

  function selectCollector(team) {
    const men = movableMen(team);
    if (!men.length) { selectedId = null; return; }
    const { player } = bestCollector(men, state.ball, state);
    selectedId = player?.id || men[0].id;
  }

  function afterHumanAct() {
    syncSkip();
    if (state.phase === 'over' || state.winner) {
      endMatch();
      return;
    }
    if (moverTeam(state) && isHumanTurn()) selectCollector(moverTeam(state));
    maybeCpu();
  }

  /**
   * Come back once the ball has settled. Bailing outright here is what killed
   * matches: the flight only advances inside requestAnimationFrame, which the
   * browser stops for a backgrounded tab, while this timer keeps running. The
   * timer would fire mid-flight, see `flying`, return — and nothing ever
   * called it again. The machine had quietly resigned and the match was dead
   * with the player still waiting for it to move.
   */
  function cpuLater() {
    clearTimeout(cpuRetry);
    cpuRetry = setTimeout(maybeCpu, 140);
  }

  // Test hook. `?psdebug=1` exposes the live match so the play harness can
  // drive real matches in a real browser — the only way to find out whether
  // this is actually playable, rather than only whether the rules are sound.
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('psdebug')) {
    window.__psf = () => ({
      phase: state.phase, possession: state.possession, possessorId: state.possessorId,
      score: { ...state.score }, winner: state.winner, log: state.log,
      mover: moverTeam(state), started, flying: !!flying, cpuBusy, celebration: !!celebration,
      red: state.red.map(p => ({ id: p.id, x: p.x, y: p.y, role: p.role })),
      blue: state.blue.map(p => ({ id: p.id, x: p.x, y: p.y, role: p.role })),
      ball: { ...state.ball }, map: { ...map }
    });
    // What a good player would do from here — the harness plays red to the
    // same standard the machine plays blue, so a losing scoreline means the
    // game is unfair rather than that the harness is bad at it. Separate from
    // the state poll because the search is far too costly to run per frame.
    window.__psfHint = () => ({
      flick: state.phase === 'kick' ? pickCpuKick(state) : null,
      run: moverTeam(state) ? pickCpuMove(state) : null
    });
  }

  function maybeCpu() {
    if (!vsCpu || cpuBusy || !started || state.winner) return;
    if (collecting) { cpuLater(); return; }
    const cpuActs = (state.phase === 'kick' && state.possession === cpuTeam())
      || (moverTeam(state) === cpuTeam());
    if (!cpuActs) return;
    if (flying || celebration || charge) { cpuLater(); return; }
    cpuBusy = true;
    const wait = state.phase === 'kick' ? 520 : 380;
    setTimeout(() => {
      cpuBusy = false;
      if (!started || state.winner) return;
      if (flying || celebration || charge) { cpuLater(); return; }
      if (state.phase === 'kick' && state.possession === cpuTeam()) {
        const kick = pickCpuKick(state);
        if (kick) startFlight(kick.angle, kick.power);
        return;
      }
      const mv = pickCpuMove(state);
      if (mv) applyMove(state, mv.playerId, mv.dest);
      else skipMove(state);
      syncSkip();
      if (state.phase === 'over' || state.winner) {
        endMatch();
        return;
      }
      if (isHumanTurn() && moverTeam(state)) {
        const team = moverTeam(state);
        selectCollector(team);
      }
      maybeCpu();
    }, wait);
  }

  function onSkip(team) {
    if (!started || flying || celebration || cpuBusy) return;
    if (!isHumanTurn()) return;
    if (team === moverTeam(state)) skipMove(state);
    selectedId = null;
    afterHumanAct();
    draw();
  }

  function syncSkip() {
    const redBtn = container.querySelector('.ps-skip-red');
    const blueBtn = container.querySelector('.ps-skip-blue');
    const cancelBtn = container.querySelector('#ps-cancel-kick');
    if (cancelBtn) {
      cancelBtn.hidden = !charge;
    }
    if (!redBtn) return;
    const mover = moverTeam(state);
    redBtn.hidden = !(mover === 'red' && isHumanTurn());
    blueBtn.hidden = vsCpu || !(mover === 'blue' && isHumanTurn());
  }

  function triggerCelebration(scorer, onFinish) {
    soundFx.playWhistle?.();
    soundFx.playCoin?.();
    celebration = {
      scorer,
      until: performance.now() + 1300,
      onFinish
    };
  }

  function endMatch() {
    cancelAnimationFrame(raf);
    clearTimeout(cpuRetry);
    const winner = state.winner === 'red' ? 'RED' : 'BLUE';
    soundFx.playWin?.();
    showResult({
      container,
      title: `${winner} WINS THE MATCH`,
      message: vsCpu
        ? `Final: Red ${state.score.red} – Blue ${state.score.blue}. ${state.winner === 'red' ? 'Sharp passing and territory control.' : 'The machine controlled the lanes. Play again to claim the pitch.'}`
        : `Final: Red ${state.score.red} – Blue ${state.score.blue}. Clean table soccer.`,
      score: matchScore(state, 'red'),
      gameId: 'paper-soccer',
      tone: state.winner === 'red' ? 'win' : 'over',
      onRestart: () => renderPaperSoccer(container, onClose),
      onClose: cleanupAndClose
    });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    const now = performance.now();

    if (collecting && now - collecting.start >= collecting.ms) {
      collecting = null;
      maybeCpu();
    }

    if (celebration) {
      if (now >= celebration.until) {
        const finish = celebration.onFinish;
        celebration = null;
        if (finish) finish();
      }
      draw();
      return;
    }

    if (flying) {
      const t = Math.min(1, (now - flying.start) / flying.ms);
      const ease = 1 - (1 - t) * (1 - t);
      state.ball = {
        x: flying.from.x + (flying.to.x - flying.from.x) * ease,
        y: flying.from.y + (flying.to.y - flying.from.y) * ease
      };
      if (t >= 1) {
        const { angle, power, from } = flying;
        flying = null;
        state.ball = { ...from };
        const dest = kickDestination(state.ball, angle, power);
        const resolved = resolveKick(state.ball, dest, power, defendersNow());

        if (resolved.kind === 'goal') {
          state.score[resolved.scorer] += 1;
          state.ball = resolved.dest;
          state.log = `${resolved.scorer.toUpperCase()} GOAL`;

          if (state.score[resolved.scorer] >= GOALS_TO_WIN) {
            state.winner = resolved.scorer;
            state.phase = 'over';
            triggerCelebration(resolved.scorer, endMatch);
            return;
          }

          triggerCelebration(resolved.scorer, () => {
            resetKickoff(state, otherTeam(resolved.scorer));
            syncSkip();
            draw();
            maybeCpu();
          });
          return;
        }

        applyKick(state, angle, power);
        if (state.collect) {
          collecting = { ...state.collect, start: performance.now(), ms: 260 };
          state.collect = null;
          soundFx.playClick?.();
        }
        syncSkip();
        if (state.phase === 'over' || state.winner) {
          draw();
          endMatch();
          return;
        }

        if (isHumanTurn() && moverTeam(state)) {
          const team = moverTeam(state);
          selectCollector(team);
        }
        maybeCpu();
      }
    }
    draw();
  }

  function drawPitch() {
    const w = map.cssW;
    const h = map.cssH;
    ctx.fillStyle = '#06080c';
    ctx.fillRect(0, 0, w, h);

    const origin = toScreen({ x: 0, y: 0 });
    const pw = PITCH.length * map.scale;
    const ph = PITCH.width * map.scale;

    // Grass stripes
    const stripeCount = 10;
    const stripeW = pw / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0e1c13' : '#112217';
      ctx.fillRect(origin.x + i * stripeW, origin.y, stripeW, ph);
    }

    // Outer pitch boundary
    ctx.strokeStyle = 'rgba(245,158,11,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(origin.x, origin.y, pw, ph);

    // Halfway line & center circle
    const mid = toScreen({ x: PITCH.length / 2, y: PITCH.width / 2 });
    ctx.beginPath();
    ctx.moveTo(mid.x, origin.y);
    ctx.lineTo(mid.x, origin.y + ph);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mid.x, mid.y, 9.15 * map.scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Corner arcs
    const cornerR = 2.5 * map.scale;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, cornerR, 0, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x, origin.y + ph, cornerR, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x + pw, origin.y, cornerR, Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(origin.x + pw, origin.y + ph, cornerR, Math.PI, -Math.PI / 2);
    ctx.stroke();

    // 18-yard penalty boxes
    const boxW = 16.5 * map.scale;
    const boxH = 40.3 * map.scale;
    const boxY = toScreen({ x: 0, y: (PITCH.width - 40.3) / 2 }).y;
    ctx.strokeRect(origin.x, boxY, boxW, boxH);
    ctx.strokeRect(origin.x + pw - boxW, boxY, boxW, boxH);

    // 6-yard goal boxes
    const sBoxW = 5.5 * map.scale;
    const sBoxH = 18.3 * map.scale;
    const sBoxY = toScreen({ x: 0, y: (PITCH.width - 18.3) / 2 }).y;
    ctx.strokeRect(origin.x, sBoxY, sBoxW, sBoxH);
    ctx.strokeRect(origin.x + pw - sBoxW, sBoxY, sBoxW, sBoxH);

    // Penalty spots
    const spotR = toScreen({ x: 11, y: PITCH.width / 2 });
    const spotB = toScreen({ x: PITCH.length - 11, y: PITCH.width / 2 });
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(spotR.x, spotR.y, 2, 0, Math.PI * 2);
    ctx.arc(spotB.x, spotB.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Goal mouth nets & posts
    const { y0, y1 } = goalMouthY();
    const g0 = toScreen({ x: 0, y: y0 });
    const g1 = toScreen({ x: 0, y: y1 });
    const depth = 3.6 * map.scale;
    const gh = g1.y - g0.y;

    // Red Goal Net
    ctx.fillStyle = '#08140c';
    ctx.fillRect(origin.x - depth, g0.y, depth, gh);
    ctx.strokeStyle = 'rgba(245,158,11,0.25)';
    ctx.lineWidth = 1;
    for (let ny = g0.y + 4; ny < g1.y; ny += 5) {
      ctx.beginPath();
      ctx.moveTo(origin.x - depth, ny);
      ctx.lineTo(origin.x, ny);
      ctx.stroke();
    }
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(origin.x - depth, g0.y, depth, gh);

    // Blue Goal Net
    ctx.fillStyle = '#08140c';
    ctx.fillRect(origin.x + pw, g0.y, depth, gh);
    ctx.strokeStyle = 'rgba(245,158,11,0.25)';
    ctx.lineWidth = 1;
    for (let ny = g0.y + 4; ny < g1.y; ny += 5) {
      ctx.beginPath();
      ctx.moveTo(origin.x + pw, ny);
      ctx.lineTo(origin.x + pw + depth, ny);
      ctx.stroke();
    }
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(origin.x + pw, g0.y, depth, gh);
  }

  function drawMan(player) {
    // Mid-collection he is still on his way: the engine has already given him
    // the ball, the board shows him going to get it.
    let at = player;
    if (collecting && collecting.id === player.id) {
      const t = Math.min(1, (performance.now() - collecting.start) / collecting.ms);
      const ease = 1 - (1 - t) * (1 - t);
      at = {
        x: collecting.from.x + (player.x - collecting.from.x) * ease,
        y: collecting.from.y + (player.y - collecting.from.y) * ease
      };
    }
    const p = toScreen(at);
    const r = Math.max(5, BODY_R * map.scale);
    const facing = player.team === 'red' ? 0 : Math.PI;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Drop shadow
    ctx.fillStyle = 'rgba(4,6,10,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 2.5, r * 0.95, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Weighted Subbuteo base ring
    ctx.fillStyle = player.team === 'red' ? RED : BLUE;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner disc
    ctx.fillStyle = '#0a0e14';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    // Facing notch / arrow
    ctx.save();
    ctx.rotate(facing);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, 0);
    ctx.lineTo(-r * 0.45, -r * 0.5);
    ctx.lineTo(-r * 0.45, r * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Squad number / Role
    ctx.fillStyle = player.role === 'gk' ? AMBER : INK;
    ctx.font = `${Math.max(8, Math.round(r * 0.72))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.role === 'gk' ? '1' : String(player.num || ''), 0, 0);

    // Goalkeeper amber border, plus the dive he can actually reach. Drawing
    // the reach is the point: a save must be something you could see coming.
    if (player.role === 'gk') {
      ctx.strokeStyle = 'rgba(245,158,11,0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, keeperReach(state.ball, player) * map.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Possession pulsing aura
    if (player.id === state.possessorId && state.phase === 'kick') {
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (r + 4) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Selected runner pulsing ring
    if (player.id === selectedId) {
      const pulse = 1 + Math.sin(performance.now() * 0.01) * 0.12;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (r + 4) * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // If currently dragging this player, draw straight-line raycast beam
    if (activeDrag && activeDrag.player.id === player.id) {
      const ray = rayInfo(player, activeDrag.currentPt, state);
      const to = toScreen(ray.target);
      const cursor = toScreen(activeDrag.currentPt);

      // The reach circle IS the rule now, so draw it. Without it a player is
      // guessing how far the legs go, and "find space" is not a decision you
      // can make blind.
      ctx.strokeStyle = 'rgba(245,158,11,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ray.radius * map.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Run line to the spot you actually get.
      ctx.strokeStyle = player.team === 'red' ? 'rgba(239,68,68,0.9)' : 'rgba(56,189,248,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Target landing disc
      ctx.fillStyle = AMBER;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (ray.reason !== 'clear') {
        ctx.strokeStyle = 'rgba(248,113,113,0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(cursor.x, cursor.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f87171';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        let label = 'BLOCKED';
        if (ray.reason === 'range') label = 'OUT OF RANGE';
        else if (ray.reason === 'occupied') label = 'SPOT TAKEN';
        else if (ray.reason === 'offside') label = 'OFFSIDE LINE';
        ctx.fillText(label, to.x, to.y - 10);
      }
    }
  }

  function drawBall() {
    const p = toScreen(state.ball);

    // Turf shadow, tight under the ball — it is rolling, not flying.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, Math.max(3.5, 1.2 * map.scale), Math.max(2, 0.7 * map.scale), 0, 0, Math.PI * 2);
    ctx.fill();

    const ballY = p.y;
    const br = Math.max(4, BALL_R * map.scale);
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(p.x, ballY, br, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2b1900';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pentagon pattern dot
    ctx.fillStyle = '#0a0e14';
    ctx.beginPath();
    ctx.arc(p.x, ballY, br * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function liveAim() {
    if (!charge) return null;
    const power = charge.power != null ? charge.power : 0.25;
    const angle = charge.angle;
    const dest = kickDestination(state.ball, angle, power);
    const resolved = resolveKick(state.ball, dest, power, defendersNow());
    const preview = resolved.kind === 'play'
      ? possessionPreview(state, resolved.dest, state.possession)
      : null;
    return {
      power,
      dest: resolved.dest,
      kind: resolved.kind,
      preview,
      scorer: resolved.scorer,
      stopper: resolved.by ? findPlayer(state, resolved.by) : null,
      isCancel: Boolean(charge.isCancel)
    };
  }

  function drawCharge() {
    const live = liveAim();
    if (!live) return;
    const from = toScreen(state.ball);
    const to = toScreen(live.dest);

    // Cancel state rendering:
    if (live.isCancel) {
      ctx.save();
      const pulse = 1 + Math.sin(performance.now() * 0.015) * 0.08;
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(from.x, from.y, CANCEL_RADIUS * map.scale * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(248, 113, 113, 0.18)';
      ctx.beginPath();
      ctx.arc(from.x, from.y, CANCEL_RADIUS * map.scale * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f87171';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✕ RELEASE TO CANCEL', from.x, from.y - CANCEL_RADIUS * map.scale - 14);
      ctx.restore();
      return;
    }

    // Cancel guide circle around the ball (shows player where to drag back to abort)
    ctx.save();
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(from.x, from.y, CANCEL_RADIUS * map.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // The corridors, shown only while you are aiming: every man who could stop
    // this kick wears the grass he actually covers. Off-screen the rest of the
    // time, so 22 rings never clutter the board.
    ctx.save();
    ctx.strokeStyle = 'rgba(232,237,243,0.16)';
    ctx.fillStyle = 'rgba(232,237,243,0.05)';
    ctx.lineWidth = 1;
    for (const foe of defendersNow()) {
      const c = toScreen(foe);
      const rr = (foe.role === 'gk' ? keeperReach(state.ball, foe) : COVER_R) * map.scale;
      ctx.beginPath();
      ctx.arc(c.x, c.y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    let ring = AMBER;
    let label = 'PLACE PASS';
    if (live.kind === 'goal') { ring = '#4ade80'; label = 'ON TARGET'; }
    else if (live.kind === 'over') { ring = '#f87171'; label = 'TOO HARD'; }
    else if (live.kind === 'block' || live.kind === 'save') {
      ring = '#f87171';
      label = live.kind === 'save' ? 'KEEPER GETS IT' : 'BLOCKED';
      if (live.stopper) {
        const b = toScreen(live.stopper);
        const reach = (live.stopper.role === 'gk' ? keeperReach(state.ball, live.stopper) : BLOCK_RADIUS) * map.scale;
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, reach, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    else if (live.preview) {
      if (live.preview.claim === 'yours') { ring = AMBER; label = 'YOU GET IT'; }
      else if (live.preview.claim === 'theirs') { ring = DIM; label = 'THEY GET IT'; }
      else { ring = INK; label = '50 / 50 · THEY GET IT'; }

      if (live.preview.us.player) {
        const a = toScreen(live.preview.us.player);
        ctx.strokeStyle = 'rgba(245,158,11,0.55)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(to.x, to.y, Math.max(6, 1.8 * map.scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a0e14';
    ctx.stroke();

    ctx.fillStyle = INK;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, to.x, to.y - 14);

    const barW = 120;
    const barH = 8;
    const x = from.x - barW / 2;
    const y = from.y - 26;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = DIM;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = live.power > 1 ? '#f87171' : AMBER;
    ctx.fillRect(x, y, Math.min(barW, (live.power / POWER_CEILING) * barW), barH);
    const mark = barW / POWER_CEILING;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + mark, y);
    ctx.lineTo(x + mark, y + barH);
    ctx.stroke();

    // Quarter notches: something to aim the release at.
    ctx.strokeStyle = 'rgba(232,237,243,0.35)';
    for (let i = 1; i < 4; i++) {
      const nx = x + (mark * i) / 4;
      ctx.beginPath();
      ctx.moveTo(nx, y + barH * 0.4);
      ctx.lineTo(nx, y + barH);
      ctx.stroke();
    }

    // Name the dial.
    ctx.fillStyle = DIM;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('WEIGHT', x, y - 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = live.power > 1 ? '#f87171' : AMBER;
    ctx.fillText(`${Math.round((live.power / POWER_CEILING) * 100)}%`, x + barW, y - 4);
    ctx.textAlign = 'center';
  }

  function drawSeats() {
    const prompt = !container.querySelector('#ps-setup')
      ? (!started
        ? 'TAP TO START'
        : flying
          ? 'BALL IN FLIGHT...'
          : celebration
            ? `⚽ ${celebration.scorer.toUpperCase()} SCORED!`
            : cpuBusy
              ? 'MACHINE THINKING...'
              : state.phase === 'kick'
                ? (charge && charge.isCancel
                    ? '✕ RELEASE ON BALL TO CANCEL KICK'
                    : `${state.possession.toUpperCase()}'S KICK · DRAG FOR WEIGHT · DOUBLE-CLICK TO SHOOT`)
                : moverTeam(state)
                  ? `${moverTeam(state).toUpperCase()} TO MOVE · RUN ANYWHERE IN REACH · OFFSIDE LIVE`
                  : 'MATCH OVER')
      : 'CHOOSE FORMATION & KICK OFF';

    // Broadcast Top Scoreboard
    ctx.fillStyle = 'rgba(6,10,16,0.88)';
    ctx.fillRect(map.cssW / 2 - 95, 4, 190, 26);
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.strokeRect(map.cssW / 2 - 95, 4, 190, 26);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = RED;
    ctx.fillText(`RED ${state.score.red}`, map.cssW / 2 - 46, 18);

    ctx.fillStyle = AMBER;
    ctx.fillText('—', map.cssW / 2, 18);

    ctx.fillStyle = BLUE;
    ctx.fillText(`${state.score.blue} BLU`, map.cssW / 2 + 46, 18);

    // Status / instruction line below scoreboard
    ctx.fillStyle = INK;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(prompt, map.cssW / 2, 42);

    if (state.log && !celebration) {
      ctx.fillStyle = AMBER;
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillText(state.log, map.cssW / 2, map.cssH - 12);
    }
  }

  function drawCelebration() {
    if (!celebration) return;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, map.cssW, map.cssH);

    const midX = map.cssW / 2;
    const midY = map.cssH / 2;
    const pulse = 1 + Math.sin(performance.now() * 0.015) * 0.06;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.scale(pulse, pulse);

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(-140, -42, 280, 84);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.strokeRect(-140, -42, 280, 84);

    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = AMBER;
    ctx.fillText('⚽ GOAL! ⚽', 0, -14);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = celebration.scorer === 'red' ? RED : BLUE;
    ctx.fillText(`${celebration.scorer.toUpperCase()} SCORES!`, 0, 12);

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = INK;
    ctx.fillText(`Red ${state.score.red} — ${state.score.blue} Blue`, 0, 28);
    ctx.restore();
  }

  function draw() {
    if (!ctx || !map.scale) return;
    drawPitch();
    for (const player of allPlayers(state)) drawMan(player);
    drawBall();
    drawCharge();
    drawSeats();
    drawCelebration();
    syncSkip();
  }

  mount();
}
