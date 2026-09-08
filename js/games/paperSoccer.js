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
export const BODY_R = 3.1;    // an outfield disc, as drawn
export const BALL_R = 1.35;   // the ball, as drawn
export const BLOCK_RADIUS = BODY_R + BALL_R;      // two discs touching
export const GK_REACH = BLOCK_RADIUS + 2.0;       // keepers dive, so they cover more
export const POWER_CEILING = 1.12;
export const OVER_EXTRA = 10;
export const MOVE_FIELD = 18;
export const MOVE_GK = 14;
export const MIN_SEP = 2.6;
export const GOALS_TO_WIN = 3;
export const CHARGE_MS = 1050;

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
  state.ball = {
    x: PITCH.length / 2 + (kickingTeam === 'red' ? -1.2 : 1.2),
    y: PITCH.width / 2
  };
  state.phase = 'kick';
  state.kickingTeam = kickingTeam;
  state.winner = null;
  refreshPossession(state);
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
    const reach = defender.role === 'gk' ? GK_REACH : BLOCK_RADIUS;
    const near = nearestOnSegment(ball, dest, defender);
    // t<=0.04 is a defender standing on the kicker, not one in the lane.
    if (near.t <= 0.04 || near.gap > reach) continue;
    if (!best || near.t < best.t) best = { ...near, player: defender };
  }
  return best;
}

export function resolveKick(ball, dest, power, defenders = []) {
  const over = power > 1;
  const block = firstBlocker(ball, dest, defenders);
  const atRedLine = ball.x > 0 ? xAt(ball, dest, 0) : null;
  const atBlueLine = ball.x < PITCH.length ? xAt(ball, dest, PITCH.length) : null;
  const exitT = atRedLine?.t ?? atBlueLine?.t ?? 1;
  if (block && block.t < exitT) {
    return {
      kind: block.player.role === 'gk' ? 'save' : 'block',
      dest: block.point,
      to: block.player.team,
      by: block.player.id
    };
  }
  const atRed = ball.x > 0 ? xAt(ball, dest, 0) : null;
  if (atRed) {
    if (inMouth(atRed.y)) {
      if (over) return { kind: 'over', dest: keeperSpot('red'), keeperTeam: 'red' };
      return { kind: 'goal', scorer: 'blue', dest: atRed };
    }
    return { kind: 'goal-kick', dest: keeperSpot('red'), to: 'red' };
  }
  const atBlue = ball.x < PITCH.length ? xAt(ball, dest, PITCH.length) : null;
  if (atBlue) {
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

export function applyKick(state, angle, power) {
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
  const result = resolveKick(state.ball, dest, power, opponents);

  if (result.kind === 'block' || result.kind === 'save') {
    state.ball = { ...result.dest };
    return takeOver(state, findPlayer(state, result.by),
      result.kind === 'save' ? 'KEEPER SAVES' : 'INTERCEPTED');
  }

  if (result.kind === 'goal') {
    state.score[result.scorer] += 1;
    state.log = `${result.scorer.toUpperCase()} GOAL`;
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
  // is on the ball. No two-sided run race any more — where you place the pass
  // IS the decision, so a short one to your own man keeps the turn and a long
  // one that lands nearer a defender hands it over. Kick the ball a little way
  // into your own space and you snap to it again: that is the dribble.
  state.ball = result.dest;
  const claim = closestTo(state.ball, allPlayers(state)).player;
  if (claim.team === kickingTeam && offsideIds.has(claim.id)) {
    return takeOver(state, closestTo(state.ball, opponents).player, 'OFFSIDE');
  }
  return takeOver(state, claim, claim.team === kickingTeam ? 'ON THE BALL' : 'TURNOVER');
}

/**
 * Hand the ball to `player`: he snaps onto it, his side is in possession, and
 * his side gets the one move before the next kick. The single place a turn
 * changes hands, so the rule cannot drift between outcomes.
 */
function takeOver(state, player, log) {
  if (!player) return state;
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
    if (d < MIN_SEP && d > 1e-9) {
      const s = MIN_SEP / d;
      x = other.x + (x - other.x) * s;
      y = other.y + (y - other.y) * s;
    }
  }
  return {
    x: Math.min(PITCH.length, Math.max(0, x)),
    y: Math.min(PITCH.width, Math.max(0, y))
  };
}

export function clampMove(player, dest, state) {
  const radius = moveRadius(player);
  const from = { x: player.x, y: player.y };
  let x = dest.x;
  let y = dest.y;
  const d = dist(from, dest);
  if (d > radius && d > 1e-9) {
    const s = radius / d;
    x = from.x + (dest.x - from.x) * s;
    y = from.y + (dest.y - from.y) * s;
  }
  x = Math.min(PITCH.length, Math.max(0, x));
  y = Math.min(PITCH.width, Math.max(0, y));
  const opponents = teamOf(state, otherTeam(player.team));
  const onside = pullOnside(player, { x, y }, opponents, state.ball);
  const separated = separate(onside, player.id, state);
  const stretched = dist(from, separated);
  if (stretched > radius && stretched > 1e-9) {
    const s = radius / stretched;
    return {
      x: from.x + (separated.x - from.x) * s,
      y: from.y + (separated.y - from.y) * s
    };
  }
  return separated;
}

/** Who is on the clock during a move phase: the side on the ball, then the other. */
export function moverTeam(state) {
  if (state.phase === 'move') return state.possession;
  if (state.phase === 'move-opp') return otherTeam(state.possession);
  return null;
}

export function applyMove(state, playerId, dest) {
  if (state.winner) return state;
  const expected = moverTeam(state);
  if (!expected) return state;
  const player = findPlayer(state, playerId);
  if (!player || player.team !== expected) return state;
  // Never the man standing on the ball — he is holding it. Move a teammate
  // into space, then pass to him.
  if (player.id === state.possessorId) return state;
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
  const mates = teamOf(state, team).filter(p => p.id !== state.possessorId && p.role !== 'gk');
  if (!mates.length) return null;
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
      for (const frac of [0.2, 0.4, 0.7, 1]) {
        for (const spread of [0, -14, 14]) {
          const landing = clampMove(mate, {
            x: mate.x + (goal.x - mate.x) * frac,
            y: mate.y + (goal.y - mate.y) * frac + spread
          }, state);
          const open = !firstBlocker(state.ball, landing, foes);
          const gain = team === 'red' ? landing.x : PITCH.length - landing.x;
          const score = gain + (open ? 45 : 0) - dist(state.ball, landing) * 0.25;
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
  let canvas;
  let ctx;
  let map = { left: 0, top: 0, scale: 1, cssW: 640, cssH: 380 };

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
              <p class="text-[10px] text-amber-500/80 uppercase">Aim · hold · release · first to three</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
        </div>
        <div class="ps-board">
          <button type="button" class="ps-skip ps-skip-red" hidden title="Skip Red's run (or press S)">SKIP</button>
          <canvas class="ps-pitch" width="1100" height="640" aria-label="Paper Soccer Pitch"></canvas>
          <button type="button" class="ps-skip ps-skip-blue" hidden title="Skip Blue's run">SKIP</button>
        </div>
        <div class="ps-setup" id="ps-setup">
          <p class="ps-setup-lead">Table soccer, computed. Aim, hold to load the flick, release. The ball slides flat in a straight line and any disc in that line stops it — so find the gap. The nearest man to where it stops picks it up, then both sides run one player before the next flick.</p>
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
    window.removeEventListener('resize', resize);
    if (window._psKeyHandler) {
      window.removeEventListener('keydown', window._psKeyHandler);
      window._psKeyHandler = null;
    }
    onClose();
  }

  function bindKeyboard() {
    const handler = event => {
      if (!started || flying || celebration || cpuBusy || state.winner || state.phase === 'over') return;
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
      if (!started || flying || celebration || cpuBusy || state.winner || state.phase === 'over') return;
      if (!isHumanTurn()) return;
      event.preventDefault();
      const pt = pointerInfo(event);

      if (state.phase === 'kick') {
        if (dist(pt, state.ball) > 12) return;
        if (event.pointerId != null && el.setPointerCapture) {
          try { el.setPointerCapture(event.pointerId); } catch (e) {}
        }
        charge = { from: { ...state.ball }, at: pt, start: performance.now() };
        draw();
        return;
      }

      const team = moverTeam(state);
      const touchedPlayer = teamOf(state, team).find(p => dist(pt, p) <= 5);
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

      if (selectedId && dist(pt, state.ball) <= 6) {
        applyMove(state, selectedId, { ...state.ball });
        selectedId = null;
        soundFx.playClick();
        afterHumanAct();
        return;
      }

      if (selectedId) {
        applyMove(state, selectedId, pt);
        selectedId = null;
        soundFx.playClick();
        afterHumanAct();
      }
    };

    const move = event => {
      if (!started || flying || celebration || cpuBusy) return;
      const pt = pointerInfo(event);
      if (charge) {
        charge.at = pt;
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
        const pt = pointerInfo(event);
        const held = (performance.now() - charge.start) / CHARGE_MS;
        const aim = aimFromPointer(state.ball, pt);
        charge = null;

        // Point for direction, hold for power, release to strike. A tap that
        // never charged is a mis-touch, not a nudge.
        const power = Math.min(POWER_CEILING, held * POWER_CEILING);
        if (power < 0.14) {
          draw();
          return;
        }
        const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
        startFlight(angle, power);
        return;
      }

      if (activeDrag) {
        const pt = pointerInfo(event);
        const drag = activeDrag;
        activeDrag = null;
        if (drag.hasMoved) {
          applyMove(state, drag.player.id, pt);
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

  function selectCollector(team) {
    const { player } = bestCollector(teamOf(state, team), state.ball, state);
    selectedId = player?.id || null;
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

  function maybeCpu() {
    if (!vsCpu || cpuBusy || flying || celebration || charge || !started || state.winner) return;
    const cpuActs = (state.phase === 'kick' && state.possession === cpuTeam())
      || (moverTeam(state) === cpuTeam());
    if (!cpuActs) return;
    cpuBusy = true;
    const wait = state.phase === 'kick' ? 520 : 380;
    setTimeout(() => {
      cpuBusy = false;
      if (!started || state.winner || flying || celebration) return;
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
    const p = toScreen(player);
    const r = Math.max(7, BODY_R * map.scale);
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
      ctx.arc(0, 0, GK_REACH * map.scale, 0, Math.PI * 2);
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

    // Selected runner movement circle
    if (player.id === selectedId) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, moveRadius(player) * map.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // If currently dragging this player, draw line to clamped target
    if (activeDrag && activeDrag.player.id === player.id) {
      const clamped = clampMove(player, activeDrag.currentPt, state);
      const to = toScreen(clamped);
      ctx.strokeStyle = player.team === 'red' ? 'rgba(196,92,74,0.85)' : 'rgba(111,147,194,0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = AMBER;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 4, 0, Math.PI * 2);
      ctx.fill();
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
    const br = Math.max(5, BALL_R * map.scale);
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
    // Two separate jobs, so neither is guessing at the other: where you point
    // is the direction, how long you hold is the power. Nothing about the
    // distance you happen to drag feeds into how hard the ball is struck.
    const aim = aimFromPointer(state.ball, charge.at);
    const held = (performance.now() - charge.start) / CHARGE_MS;
    const power = Math.min(POWER_CEILING, Math.max(0.14, held * POWER_CEILING));
    const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
    const dest = kickDestination(state.ball, angle, Math.max(0.14, power));
    const resolved = resolveKick(state.ball, dest, Math.max(0.14, power), defendersNow());
    const preview = resolved.kind === 'play'
      ? possessionPreview(state, resolved.dest, state.possession)
      : null;
    return {
      power: Math.max(0.14, power),
      dest: resolved.dest,
      kind: resolved.kind,
      preview,
      scorer: resolved.scorer,
      // Who stops it, so the aim line can point at the body in the way
      // instead of leaving the player to guess why the pass died.
      stopper: resolved.by ? findPlayer(state, resolved.by) : null
    };
  }

  function drawCharge() {
    const live = liveAim();
    if (!live) return;
    const from = toScreen(state.ball);
    const to = toScreen(live.dest);

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
        const reach = (live.stopper.role === 'gk' ? GK_REACH : BLOCK_RADIUS) * map.scale;
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
                ? `${state.possession.toUpperCase()}'S FLICK · AIM, HOLD, RELEASE`
                : moverTeam(state)
                  ? `${moverTeam(state).toUpperCase()}'S RUN · DRAG A TEAMMATE INTO SPACE`
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
