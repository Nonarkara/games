/**
 * Paper Soccer — table soccer as a tactical placement game.
 *
 * Drag the disc to the grass you want. After it stops, you run one man
 * toward it; then the other side runs one. Whoever can get closer owns
 * the next flick. First to three. One seat vs the machine, or two seats
 * on a landscape pad.
 */

import { soundFx } from '../audio.js';
import { attachReady, showResult } from '../ui.js';

export const PITCH = Object.freeze({
  length: 105,
  width: 68,
  goalWidth: 16
});

export const MAX_KICK = 56;
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

export function resolveKick(ball, dest, power) {
  const over = power > 1;
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
  const result = resolveKick(state.ball, dest, power);

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

  if (result.kind === 'over') {
    state.ball = { ...result.dest };
    snapKeeperToBall(state, result.keeperTeam);
    refreshPossession(state);
    state.phase = 'kick';
    state.log = 'OVER THE BAR';
    return state;
  }

  if (result.kind === 'goal-kick') {
    state.ball = { ...result.dest };
    snapKeeperToBall(state, result.to);
    refreshPossession(state);
    state.phase = 'kick';
    state.log = 'GOAL KICK';
    return state;
  }

  if (result.kind === 'throw-in') {
    state.ball = result.dest;
    const { player } = closestTo(state.ball, teamOf(state, otherTeam(kickingTeam)));
    state.possession = player.team;
    state.possessorId = player.id;
    state.phase = 'kick';
    state.log = 'THROW-IN';
    return state;
  }

  state.ball = result.dest;
  const nearest = closestTo(state.ball, allPlayers(state)).player;
  if (nearest.team === kickingTeam && offsideIds.has(nearest.id)) {
    const def = closestTo(state.ball, opponents).player;
    state.possession = def.team;
    state.possessorId = def.id;
    state.phase = 'kick';
    state.log = 'OFFSIDE';
    return state;
  }

  state.kickingTeam = kickingTeam;
  state.phase = 'move-self';
  state.log = nearest.team === kickingTeam ? 'KEEP GOING' : 'LOOSE BALL';
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

function finishMoves(state) {
  refreshPossession(state);
  state.phase = 'kick';
  const owner = findPlayer(state, state.possessorId);
  if (owner && owner.team !== state.kickingTeam) state.log = 'INTERCEPTION';
  else if (!state.log || state.log === 'KEEP GOING' || state.log === 'LOOSE BALL') {
    state.log = 'YOUR FLICK';
  }
  return state;
}

export function applyMove(state, playerId, dest) {
  if (state.winner) return state;
  const expected = state.phase === 'move-self'
    ? state.kickingTeam
    : state.phase === 'move-opp'
      ? otherTeam(state.kickingTeam)
      : null;
  if (!expected) return state;
  const player = findPlayer(state, playerId);
  if (!player || player.team !== expected) return state;
  const next = clampMove(player, dest, state);
  player.x = next.x;
  player.y = next.y;
  if (state.phase === 'move-self') {
    state.phase = 'move-opp';
    state.log = `${otherTeam(expected).toUpperCase()} MOVE`;
  } else {
    finishMoves(state);
  }
  return state;
}

export function skipMove(state) {
  if (state.phase === 'move-self') {
    state.phase = 'move-opp';
    state.log = `${otherTeam(state.kickingTeam).toUpperCase()} MOVE`;
    return state;
  }
  if (state.phase === 'move-opp') return finishMoves(state);
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
 * Live read of a pass: after both sides spend their one run toward the
 * landing, who is closer? 'yours' / 'theirs' / 'contested'.
 */
export function possessionPreview(state, dest, kickingTeam) {
  const us = bestCollector(teamOf(state, kickingTeam), dest, state);
  const them = bestCollector(teamOf(state, otherTeam(kickingTeam)), dest, state);
  let claim = 'contested';
  if (us.dist + 0.55 < them.dist) claim = 'yours';
  else if (them.dist + 0.55 < us.dist) claim = 'theirs';
  return { claim, us, them };
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

  const samples = Array.from({ length: 7 }, (_, i) => y0 + 1 + (i / 6) * (y1 - y0 - 2));
  for (const y of samples) {
    const goal = { x: team === 'red' ? PITCH.length : 0, y };
    const aim = aimFromPointer(ball, goal);
    if (!aim || aim.power > 1) continue;
    const dest = kickDestination(ball, aim.angle, aim.power);
    const result = resolveKick(ball, dest, aim.power);
    if (result.kind === 'goal' && result.scorer === team) return aim;
  }

  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2;
    for (const power of [0.22, 0.36, 0.5, 0.66, 0.84]) {
      const dest = kickDestination(ball, ang, power);
      const result = resolveKick(ball, dest, power);
      if (result.kind === 'goal' && result.scorer === team) return { angle: ang, power };
      if (result.kind !== 'play') continue;
      const preview = possessionPreview(state, result.dest, team);
      if (preview.claim === 'theirs') continue;
      const toward = team === 'red' ? result.dest.x : PITCH.length - result.dest.x;
      const own = preview.claim === 'yours' ? 16 : 0;
      const score = toward * 1.2 + own - preview.us.dist;
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
  const team = state.phase === 'move-self'
    ? state.kickingTeam
    : state.phase === 'move-opp'
      ? otherTeam(state.kickingTeam)
      : null;
  if (!team) return null;
  const { player } = bestCollector(teamOf(state, team), state.ball, state);
  if (!player) return null;
  return { playerId: player.id, dest: { x: state.ball.x, y: state.ball.y } };
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
    if (state.phase === 'move-self') return state.kickingTeam === 'red';
    if (state.phase === 'move-opp') return state.kickingTeam === 'blue';
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
              <p class="text-[10px] text-amber-500/80 uppercase">Place a pass · run to the disc · first to three</p>
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
          <p class="ps-setup-lead">Drag the disc to the grass you want. The live badge predicts ownership after one run each. Closest player flicks next.</p>
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
        const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
        onSkip(team);
        return;
      }
      if (key === 'Tab') {
        event.preventDefault();
        const mover = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
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
        if (selectedId && (state.phase === 'move-self' || state.phase === 'move-opp')) {
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

      const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
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
        const holdPower = (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING;
        const aim = aimFromPointer(state.ball, pt);
        charge = null;

        const isDragAim = aim && dist(state.ball, pt) >= 1.2;
        const power = isDragAim
          ? Math.min(POWER_CEILING, Math.max(0.14, aim.power))
          : Math.min(POWER_CEILING, Math.max(aim ? aim.power : 0, holdPower));

        if (!aim && power < 0.16) {
          draw();
          return;
        }
        const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
        startFlight(angle, Math.max(0.14, power));
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

  function startFlight(angle, power) {
    const dest = kickDestination(state.ball, angle, power);
    const preview = resolveKick(state.ball, dest, power);
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
    if (state.phase === 'move-self' && isHumanTurn()) selectCollector(state.kickingTeam);
    if (state.phase === 'move-opp' && isHumanTurn()) selectCollector(otherTeam(state.kickingTeam));
    maybeCpu();
  }

  function maybeCpu() {
    if (!vsCpu || cpuBusy || flying || celebration || charge || !started || state.winner) return;
    const cpuActs = (state.phase === 'kick' && state.possession === cpuTeam())
      || (state.phase === 'move-self' && state.kickingTeam === cpuTeam())
      || (state.phase === 'move-opp' && state.kickingTeam === humanTeam());
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
      if (isHumanTurn() && (state.phase === 'move-self' || state.phase === 'move-opp')) {
        const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
        selectCollector(team);
      }
      maybeCpu();
    }, wait);
  }

  function onSkip(team) {
    if (!started || flying || celebration || cpuBusy) return;
    if (!isHumanTurn()) return;
    if (state.phase === 'move-self' && team === state.kickingTeam) skipMove(state);
    else if (state.phase === 'move-opp' && team === otherTeam(state.kickingTeam)) skipMove(state);
    selectedId = null;
    afterHumanAct();
    draw();
  }

  function syncSkip() {
    const redBtn = container.querySelector('.ps-skip-red');
    const blueBtn = container.querySelector('.ps-skip-blue');
    if (!redBtn) return;
    const mover = state.phase === 'move-self'
      ? state.kickingTeam
      : state.phase === 'move-opp'
        ? otherTeam(state.kickingTeam)
        : null;
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
        const resolved = resolveKick(state.ball, dest, power);

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

        if (isHumanTurn() && (state.phase === 'move-self' || state.phase === 'move-opp')) {
          const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
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
    const r = Math.max(7, 3.1 * map.scale);
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

    // Goalkeeper amber border
    if (player.role === 'gk') {
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
    let lift = 0;
    if (flying) {
      const t = Math.min(1, (performance.now() - flying.start) / flying.ms);
      const arc = Math.sin(t * Math.PI);
      lift = arc * (flying.power > 1 ? 16 : Math.min(12, flying.power * 14)) * map.scale;
    }

    // Turf shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + (lift * 0.15), Math.max(3.5, 1.2 * map.scale), Math.max(2, 0.7 * map.scale), 0, 0, Math.PI * 2);
    ctx.fill();

    // 3D Ball
    const ballY = p.y - lift;
    const br = Math.max(5, 1.35 * map.scale);
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
    const holdPower = (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING;
    const aim = aimFromPointer(state.ball, charge.at);

    // Direct drag-to-place aim if dragged away from ball; hold-to-charge only if static touch
    const isDragAim = aim && dist(state.ball, charge.at) >= 1.2;
    const power = isDragAim
      ? Math.min(POWER_CEILING, Math.max(0.14, aim.power))
      : Math.min(POWER_CEILING, Math.max(aim ? aim.power : 0, holdPower));

    if (power < 0.1 && !aim) return null;
    const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
    const dest = kickDestination(state.ball, angle, Math.max(0.14, power));
    const resolved = resolveKick(state.ball, dest, Math.max(0.14, power));
    const preview = resolved.kind === 'play'
      ? possessionPreview(state, resolved.dest, state.possession)
      : null;
    return {
      power: Math.max(0.14, power),
      dest: resolved.dest,
      kind: resolved.kind,
      preview,
      scorer: resolved.scorer,
      isDragAim
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
    else if (live.kind === 'over') { ring = '#f87171'; label = 'OVER BAR'; }
    else if (live.preview) {
      if (live.preview.claim === 'yours') { ring = AMBER; label = 'YOU GET IT'; }
      else if (live.preview.claim === 'theirs') { ring = DIM; label = 'THEY GET IT'; }
      else { ring = INK; label = '50 / 50'; }

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
                ? `${state.possession.toUpperCase()}'S FLICK · DRAG TO PLACE PASS`
                : state.phase === 'move-self'
                  ? `${state.kickingTeam.toUpperCase()}'S RUN · TAP BALL OR DRAG PLAYER`
                  : state.phase === 'move-opp'
                    ? `${otherTeam(state.kickingTeam).toUpperCase()}'S RUN · TAP BALL OR DRAG PLAYER`
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
