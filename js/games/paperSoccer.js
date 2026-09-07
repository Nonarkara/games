/**
 * Paper Soccer — two people, one pad, the childhood table game.
 *
 * A3-ish pitch, eleven men a side, a flat disc. You flick the disc, then
 * you may relocate one man; then your opponent does the same. Whoever is
 * closest to the ball plays next. First to three goals.
 *
 * This is turn-based table soccer, not a physics FIFA clone:
 *   hold to charge a pass → release to flick
 *   one run each after the ball stops
 *   closest player owns the next flick
 *   offside is a placement rule (you cannot park a man beyond the
 *   second-last opponent)
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

/* ===========================================================================
 * Renderer — landscape two-seat board.
 * Red sits on the left short edge, blue on the right. Hold to charge a
 * flick; after the disc stops, each side gets one run.
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
  let state = createMatch(redShape, blueShape);
  let started = false;
  let selectedId = null;
  let charge = null;
  let flying = null;
  let raf = 0;
  let canvas;
  let ctx;
  let map = { left: 0, top: 0, scale: 1 };

  function mount() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center px-3 pt-3 pb-2 border-b border-amber-500/40">
          <div>
            <h2 class="text-sm font-black text-amber-400 tracking-wider">PAPER SOCCER</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Two seats · first to three</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
        </div>
        <div class="ps-board">
          <button type="button" class="ps-skip ps-skip-red" hidden>SKIP</button>
          <canvas class="ps-pitch" width="1100" height="640"></canvas>
          <button type="button" class="ps-skip ps-skip-blue" hidden>SKIP</button>
        </div>
        <div class="ps-setup" id="ps-setup">
          <p class="ps-setup-lead">Sit on the two short sides of a landscape pad. Red is left, blue is right.</p>
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
    const padX = 54;
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
      if (!started || flying || state.winner || state.phase === 'over') return;
      event.preventDefault();
      const pt = pointerInfo(event);
      if (state.phase === 'kick') {
        if (dist(pt, state.ball) > 10) return;
        if (event.pointerId != null && el.setPointerCapture) el.setPointerCapture(event.pointerId);
        charge = { from: { ...state.ball }, at: pt, start: performance.now(), power: 0 };
        return;
      }
      const team = state.phase === 'move-self' ? state.kickingTeam : otherTeam(state.kickingTeam);
      const near = closestTo(pt, teamOf(state, team));
      if (near.player && near.dist <= 5) selectedId = near.player.id;
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
        const power = Math.max(0.14, Math.min(POWER_CEILING, (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING));
        let angle = Math.atan2(charge.at.y - state.ball.y, charge.at.x - state.ball.x);
        if (dist(charge.at, state.ball) < 1.2) {
          angle = state.possession === 'red' ? 0 : Math.PI;
        }
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
        charge = null;
        soundFx.playHit();
        return;
      }
      if (selectedId && (state.phase === 'move-self' || state.phase === 'move-opp')) {
        applyMove(state, selectedId, pt);
        selectedId = null;
        soundFx.playClick();
        syncSkip();
        if (state.phase === 'over' || state.winner) endMatch();
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function onSkip(team) {
    if (!started || flying) return;
    if (state.phase === 'move-self' && team === state.kickingTeam) skipMove(state);
    else if (state.phase === 'move-opp' && team === otherTeam(state.kickingTeam)) skipMove(state);
    selectedId = null;
    syncSkip();
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
    redBtn.hidden = mover !== 'red';
    blueBtn.hidden = mover !== 'blue';
  }

  function endMatch() {
    cancelAnimationFrame(raf);
    const winner = state.winner === 'red' ? 'RED' : 'BLUE';
    showResult({
      container,
      title: `${winner} WINS`,
      message: `Red ${state.score.red} – Blue ${state.score.blue}. First to three. Closest player to the disc plays it.`,
      score: matchScore(state),
      gameId: 'paper-soccer',
      tone: 'win',
      onRestart: () => renderPaperSoccer(container, onClose),
      onClose
    });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (charge) {
      charge.power = Math.min(POWER_CEILING, (performance.now() - charge.start) / CHARGE_MS * POWER_CEILING);
    }
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

  function drawCharge() {
    if (!charge) return;
    const from = toScreen(state.ball);
    const to = toScreen(charge.at);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    const barW = 120;
    const barH = 10;
    const x = from.x - barW / 2;
    const y = from.y - 28;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x, y, barW, barH);
    ctx.strokeStyle = DIM;
    ctx.strokeRect(x, y, barW, barH);
    ctx.fillStyle = charge.power > 1 ? '#e6edf3' : AMBER;
    ctx.fillRect(x, y, Math.min(barW, (charge.power / POWER_CEILING) * barW), barH);
    const mark = barW / POWER_CEILING;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + mark, y);
    ctx.lineTo(x + mark, y + barH);
    ctx.stroke();
  }

  function drawSeats() {
    const prompt = !started
      ? 'PICK A SHAPE'
      : flying
        ? 'BALL MOVING'
        : state.phase === 'kick'
          ? `${state.possession.toUpperCase()} · HOLD THE DISC`
          : state.phase === 'move-self'
            ? `${state.kickingTeam.toUpperCase()} · MOVE ONE`
            : state.phase === 'move-opp'
              ? `${otherTeam(state.kickingTeam).toUpperCase()} · MOVE ONE`
              : 'MATCH OVER';

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
