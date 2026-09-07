/**
 * Paper Soccer — table soccer as a placement game.
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
  const atRed = xAt(ball, dest, 0);
  if (atRed && ball.x > 0) {
    if (inMouth(atRed.y)) {
      if (over) return { kind: 'over', dest: keeperSpot('red'), keeperTeam: 'red' };
      return { kind: 'goal', scorer: 'blue', dest: atRed };
    }
    return { kind: 'goal-kick', dest: keeperSpot('red'), to: 'red' };
  }
  const atBlue = xAt(ball, dest, PITCH.length);
  if (atBlue && ball.x < PITCH.length) {
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

export function matchScore(state) {
  if (!state.winner) return 0;
  return GOALS_TO_WIN;
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
  return { us, them, claim, dest };
}

function goalTarget(team) {
  return {
    x: team === 'red' ? PITCH.length : 0,
    y: PITCH.width / 2
  };
}

/** Pure CPU kick: shoot if the mouth is on, else pass to grass we can own. */
export function pickCpuKick(state) {
  const team = state.possession;
  const ball = state.ball;
  const mouth = goalMouthY();
  const samples = [0.5, 0.35, 0.65, 0.22, 0.78].map(t => mouth.y0 + (mouth.y1 - mouth.y0) * t);
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
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2;
    for (const power of [0.2, 0.34, 0.48, 0.64, 0.8]) {
      const dest = kickDestination(ball, ang, power);
      const result = resolveKick(ball, dest, power);
      if (result.kind === 'goal' && result.scorer === team) return { angle: ang, power };
      if (result.kind !== 'play') continue;
      const preview = possessionPreview(state, result.dest, team);
      if (preview.claim === 'theirs') continue;
      const toward = team === 'red' ? result.dest.x : PITCH.length - result.dest.x;
      const own = preview.claim === 'yours' ? 14 : 0;
      const score = toward + own - preview.us.dist;
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

const FRAME = 'paper-soccer relative bg-black border border-amber-500/40 text-white font-mono-hud';
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
  let flying = null;
  let cpuBusy = false;
  let raf = 0;
  let canvas;
  let ctx;
  let map = { left: 0, top: 0, scale: 1 };

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
        <div class="flex justify-between items-center px-3 pt-3 pb-2 border-b border-amber-500/40">
          <div>
            <h2 class="text-sm font-black text-amber-400 tracking-wider">PAPER SOCCER</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Place a pass · run to the disc</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
        </div>
        <div class="ps-board">
          <button type="button" class="ps-skip ps-skip-red" hidden>SKIP</button>
          <canvas class="ps-pitch" width="1100" height="640"></canvas>
          <button type="button" class="ps-skip ps-skip-blue" hidden>SKIP</button>
        </div>
        <div class="ps-setup" id="ps-setup">
          <p class="ps-setup-lead">Drag the disc to the grass you want. After it lands, move one man onto it. Closest player flicks next.</p>
          <div class="ps-setup-row">
            <span>SEATS</span>
            <button type="button" class="ps-seat is-on" data-seat="cpu">YOU vs MACHINE</button>
            <button type="button" class="ps-seat" data-seat="two">TWO SEATS</button>
          </div>
          <div class="ps-setup-row">
            <span>RED SHAPE</span>
            ${FORMATION_NAMES.map(name => `<button type="button" class="ps-shape" data-team="red" data-shape="${name}">${name}</button>`).join('')}
          </div>
          <div class="ps-setup-row ps-setup-row-blue">
            <span>BLUE SHAPE</span>
            ${FORMATION_NAMES.map(name => `<button type="button" class="ps-shape" data-team="blue" data-shape="${name}">${name}</button>`).join('')}
          </div>
          <button type="button" class="ps-play" id="ps-play">PLAY THIS SHAPE</button>
        </div>
      </div>`;

    canvas = container.querySelector('.ps-pitch');
    canvas.style.touchAction = 'none';
    ctx = canvas.getContext('2d');
    container.querySelector('#close-game-btn').onclick = () => {
      cancelAnimationFrame(raf);
      onClose();
    };
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
    paintShapes();
    resize();
    draw();
    window.addEventListener('resize', resize);

    container.querySelector('#ps-play').onclick = () => {
      const setup = container.querySelector('#ps-setup');
      if (setup) setup.remove();
      state = createMatch(redShape, blueShape);
      draw();
      attachReady(container.querySelector('.ps-board'), () => {
        started = true;
        loop();
        maybeCpu();
      });
    };
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
    const padX = 78;
    const padY = 28;
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
      if (!started || flying || cpuBusy || state.winner || state.phase === 'over') return;
      if (!isHumanTurn()) return;
      event.preventDefault();
      const pt = pointerInfo(event);
      if (state.phase === 'kick') {
        if (dist(pt, state.ball) > 10) return;
        if (event.pointerId != null && el.setPointerCapture) el.setPointerCapture(event.pointerId);
        charge = { from: { ...state.ball }, at: pt, start: performance.now() };
        return;
      }
      const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
      if (selectedId && dist(pt, state.ball) <= 5) {
        applyMove(state, selectedId, { ...state.ball });
        selectedId = null;
        soundFx.playClick();
        afterHumanAct();
        return;
      }
      const near = closestTo(pt, teamOf(state, team));
      if (near.player && near.dist <= 5) {
        selectedId = near.player.id;
        if (event.pointerId != null && el.setPointerCapture) el.setPointerCapture(event.pointerId);
      }
    };
    const move = event => {
      if (!charge && !selectedId) return;
      event.preventDefault();
      const pt = pointerInfo(event);
      if (charge) charge.at = pt;
    };
    const up = event => {
      event.preventDefault();
      const pt = pointerInfo(event);
      if (charge && state.phase === 'kick') {
        const holdPower = (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING;
        const aim = aimFromPointer(state.ball, charge.at);
        charge = null;
        const power = Math.min(POWER_CEILING, Math.max(aim ? aim.power : 0, holdPower));
        if (!aim && power < 0.18) return;
        const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
        startFlight(angle, Math.max(0.14, power));
        return;
      }
      if (selectedId && (state.phase === 'move-self' || state.phase === 'move-opp')) {
        applyMove(state, selectedId, pt);
        selectedId = null;
        soundFx.playClick();
        afterHumanAct();
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
      ms: 280 + kickTravel(power) * 8,
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
    if (!vsCpu || cpuBusy || flying || charge || !started || state.winner) return;
    const cpuActs = (state.phase === 'kick' && state.possession === cpuTeam())
      || (state.phase === 'move-self' && state.kickingTeam === cpuTeam())
      || (state.phase === 'move-opp' && state.kickingTeam === humanTeam());
    if (!cpuActs) return;
    cpuBusy = true;
    const wait = state.phase === 'kick' ? 480 : 360;
    setTimeout(() => {
      cpuBusy = false;
      if (!started || state.winner || flying) return;
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
    if (!started || flying || cpuBusy) return;
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

  function endMatch() {
    cancelAnimationFrame(raf);
    const winner = state.winner === 'red' ? 'RED' : 'BLUE';
    showResult({
      container,
      title: `${winner} WINS`,
      message: vsCpu
        ? `Red ${state.score.red} – Blue ${state.score.blue}. Drag a pass onto grass your man can reach.`
        : `Red ${state.score.red} – Blue ${state.score.blue}. Closest player to the disc plays it.`,
      score: matchScore(state),
      gameId: 'paper-soccer',
      tone: 'win',
      onRestart: () => renderPaperSoccer(container, onClose),
      onClose
    });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (flying) {
      const t = Math.min(1, (performance.now() - flying.start) / flying.ms);
      const ease = 1 - (1 - t) * (1 - t);
      state.ball = {
        x: flying.from.x + (flying.to.x - flying.from.x) * ease,
        y: flying.from.y + (flying.to.y - flying.from.y) * ease
      };
      if (t >= 1) {
        const { angle, power, from } = flying;
        flying = null;
        state.ball = { ...from };
        applyKick(state, angle, power);
        syncSkip();
        if (state.phase === 'over' || state.winner) {
          draw();
          endMatch();
          return;
        }
        if (state.log === 'RED GOAL' || state.log === 'BLUE GOAL') soundFx.playCoin();
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
    ctx.fillStyle = '#07090d';
    ctx.fillRect(0, 0, w, h);

    const origin = toScreen({ x: 0, y: 0 });
    const pw = PITCH.length * map.scale;
    const ph = PITCH.width * map.scale;
    ctx.fillStyle = '#102016';
    ctx.fillRect(origin.x, origin.y, pw, ph);

    ctx.strokeStyle = 'rgba(245,158,11,0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(origin.x, origin.y, pw, ph);

    const mid = toScreen({ x: PITCH.length / 2, y: PITCH.width / 2 });
    ctx.beginPath();
    ctx.moveTo(mid.x, origin.y);
    ctx.lineTo(mid.x, origin.y + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mid.x, mid.y, 9.15 * map.scale, 0, Math.PI * 2);
    ctx.stroke();

    const boxW = 16.5 * map.scale;
    const boxH = 40.3 * map.scale;
    const boxY = toScreen({ x: 0, y: (PITCH.width - 40.3) / 2 }).y;
    ctx.strokeRect(origin.x, boxY, boxW, boxH);
    ctx.strokeRect(origin.x + pw - boxW, boxY, boxW, boxH);

    const { y0, y1 } = goalMouthY();
    const g0 = toScreen({ x: 0, y: y0 });
    const g1 = toScreen({ x: 0, y: y1 });
    const depth = 3.2 * map.scale;
    ctx.strokeStyle = AMBER;
    ctx.strokeRect(origin.x - depth, g0.y, depth, g1.y - g0.y);
    ctx.strokeRect(origin.x + pw, g0.y, depth, g1.y - g0.y);
  }

  function drawMan(player) {
    const p = toScreen(player);
    const r = Math.max(7, 3.1 * map.scale);
    const facing = player.team === 'red' ? 0 : Math.PI;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(facing);
    ctx.fillStyle = 'rgba(10,14,20,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.team === 'red' ? RED : BLUE;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(r * 0.15, 0);
    ctx.lineTo(-r * 0.55, -r * 0.7);
    ctx.lineTo(-r * 0.55, r * 0.7);
    ctx.closePath();
    ctx.fill();
    if (player.role === 'gk') {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.id === state.possessorId && state.phase === 'kick') {
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    const mover = state.phase === 'move-self'
      ? state.kickingTeam
      : state.phase === 'move-opp'
        ? otherTeam(state.kickingTeam)
        : null;
    if (mover && player.team === mover && player.id !== selectedId) {
      ctx.strokeStyle = 'rgba(245,158,11,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (player.id === selectedId) {
      ctx.strokeStyle = INK;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, moveRadius(player) * map.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawBall() {
    const p = toScreen(state.ball);
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(5, 1.35 * map.scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d2600';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function liveAim() {
    if (!charge) return null;
    const holdPower = (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING;
    const aim = aimFromPointer(state.ball, charge.at);
    const power = Math.min(POWER_CEILING, Math.max(aim ? aim.power : 0, holdPower));
    if (power < 0.1 && !aim) return null;
    const angle = aim ? aim.angle : (state.possession === 'red' ? 0 : Math.PI);
    const dest = kickDestination(state.ball, angle, Math.max(0.14, power));
    const resolved = resolveKick(state.ball, dest, Math.max(0.14, power));
    const preview = resolved.kind === 'play'
      ? possessionPreview(state, resolved.dest, state.possession)
      : null;
    return { power: Math.max(0.14, power), dest: resolved.dest, kind: resolved.kind, preview, scorer: resolved.scorer };
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
    let label = 'PLACE THE PASS';
    if (live.kind === 'goal') { ring = INK; label = 'ON TARGET'; }
    else if (live.kind === 'over') { ring = DIM; label = 'OVER THE BAR'; }
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
    const barH = 10;
    const x = from.x - barW / 2;
    const y = from.y - 28;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = DIM;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = live.power > 1 ? '#e6edf3' : AMBER;
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
          ? 'BALL MOVING'
          : cpuBusy
            ? 'MACHINE THINKING'
            : state.phase === 'kick'
              ? `${state.possession.toUpperCase()} · DRAG THE DISC`
              : state.phase === 'move-self'
                ? `${state.kickingTeam.toUpperCase()} · RUN TO THE DISC`
                : state.phase === 'move-opp'
                  ? `${otherTeam(state.kickingTeam).toUpperCase()} · RUN TO THE DISC`
                  : 'MATCH OVER')
      : 'PICK A SHAPE';

    ctx.fillStyle = AMBER;
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(22, map.cssH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`RED  ${state.score.red}`, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.translate(map.cssW - 22, map.cssH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`BLUE  ${state.score.blue}`, 0, 0);
    ctx.restore();

    ctx.fillStyle = INK;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(prompt, map.cssW / 2, 16);
    if (state.log) ctx.fillText(state.log, map.cssW / 2, map.cssH - 10);
  }

  function draw() {
    if (!ctx || !map.scale) return;
    drawPitch();
    for (const player of allPlayers(state)) drawMan(player);
    drawBall();
    drawCharge();
    drawSeats();
    syncSkip();
  }

  mount();
}
