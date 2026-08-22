/**
 * NGS Expansion Suite · 2026-08-11
 *
 * Three mechanics that were missing from the floor:
 * - Stop Signal: cancel an action already being prepared.
 * - Warehouse Push: irreversible spatial planning in the Sokoban tradition.
 * - Lights Out: parity and reversible state changes on a grid.
 *
 * Core state transitions are exported so mechanics—not only mounting—can be tested.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';

function closeButton() {
  return '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';
}

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* --------------------------------------------------------------------------
 * STOP SIGNAL
 * ----------------------------------------------------------------------- */

export function nextStopDelay(delay, stopped) {
  return Math.max(100, Math.min(500, delay + (stopped ? 50 : -50)));
}

export function scoreStopSignal({ goCorrect, goErrors, stopSuccess, stopFails }) {
  return Math.max(0, goCorrect * 5 + stopSuccess * 10 - goErrors * 5 - stopFails * 3);
}

export function renderStopSignal(container, onClose) {
  const TRIALS = 24;
  let timers = [];
  let trial = 0;
  let active = false;
  let responded = false;
  let direction = 'left';
  let isStop = false;
  let stopShown = false;
  let stopDelay = 250;
  let goCorrect = 0, goErrors = 0, stopSuccess = 0, stopFails = 0;
  const goTimes = [];
  let signalStartedAt = 0;
  const stopPlan = shuffled(Array.from({ length: TRIALS }, (_, i) => i < 6));

  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  };
  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const removeKeys = () => window.removeEventListener('keydown', onKey);
  const close = () => { clearTimers(); removeKeys(); onClose(); };

  container.innerHTML = `
    <div class="${FRAME}">
      <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
        <div><h2 class="text-xl font-black text-amber-400 tracking-wider">STOP SIGNAL</h2>
        <p class="text-[10px] text-amber-500/80 uppercase">START THE MOVE · CANCEL IT WHEN STOP APPEARS</p></div>
        ${closeButton()}
      </div>
      <div class="grid grid-cols-3 gap-1 bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-[10px] font-bold text-center">
        <div>TRIAL<br><span id="sst-trial" class="text-amber-400 text-base">0/${TRIALS}</span></div>
        <div>GO<br><span id="sst-go" class="text-green-400 text-base">0</span></div>
        <div>STOPS<br><span id="sst-stop" class="text-blue-400 text-base">0/0</span></div>
      </div>
      <div id="sst-screen" class="min-h-56 border-2 border-amber-500 flex flex-col items-center justify-center text-center bg-zinc-950">
        <div id="sst-signal" class="text-7xl text-amber-400">READY</div>
        <p id="sst-note" class="mt-5 text-xs text-zinc-400 max-w-sm px-4">Press the matching arrow quickly. On some trials it turns to STOP after the arrow appears—then withhold the press.</p>
      </div>
      <div class="grid grid-cols-2 gap-3 mt-4">
        <button class="sst-key py-5 border-2 border-amber-500 text-amber-400 font-black" data-dir="left">LEFT</button>
        <button class="sst-key py-5 border-2 border-amber-500 text-amber-400 font-black" data-dir="right">RIGHT</button>
      </div>
      <button id="sst-start" class="w-full mt-3 py-4 bg-amber-500 text-black font-black">START 24 TRIALS</button>
      <p class="mt-3 text-[10px] text-zinc-500">Adaptive stop delay aims for a useful mix of saves and escapes. Practice variant; not a diagnostic test.</p>
    </div>`;

  const signal = container.querySelector('#sst-signal');
  const note = container.querySelector('#sst-note');
  const screen = container.querySelector('#sst-screen');
  const updateStats = () => {
    container.querySelector('#sst-trial').textContent = `${Math.min(trial + 1, TRIALS)}/${TRIALS}`;
    container.querySelector('#sst-go').textContent = `${goCorrect}/${goCorrect + goErrors}`;
    container.querySelector('#sst-stop').textContent = `${stopSuccess}/${stopSuccess + stopFails}`;
  };

  function feedback(message, good) {
    active = false;
    signal.textContent = message;
    signal.className = `text-4xl ${good ? 'text-green-400' : 'text-red-500'}`;
    note.textContent = `STOP DELAY ${stopDelay} MS`;
    screen.style.borderColor = good ? '#22c55e' : '#ef4444';
    updateStats();
    later(nextTrial, 420);
  }

  function settleStop() {
    if (responded) return;
    stopSuccess++;
    stopDelay = nextStopDelay(stopDelay, true);
    trial++;
    feedback('HELD', true);
  }

  function respond(choice) {
    if (!active || responded) return;
    responded = true;
    clearTimers();
    if (isStop) {
      stopFails++;
      stopDelay = nextStopDelay(stopDelay, false);
      trial++;
      feedback(stopShown ? 'TOO LATE' : 'ESCAPED', false);
      return;
    }
    const correct = choice === direction;
    if (correct) {
      goCorrect++;
      goTimes.push(Date.now() - signalStartedAt);
    } else {
      goErrors++;
    }
    trial++;
    feedback(correct ? 'HIT' : 'WRONG KEY', correct);
  }

  function nextTrial() {
    clearTimers();
    if (trial >= TRIALS) {
      removeKeys();
      const score = scoreStopSignal({ goCorrect, goErrors, stopSuccess, stopFails });
      const mean = goTimes.length ? Math.round(goTimes.reduce((a, b) => a + b, 0) / goTimes.length) : 0;
      showResult({
        container,
        title: 'BRAKES CHECKED',
        message: `${goCorrect}/${goCorrect + goErrors} go hits · ${stopSuccess}/${stopSuccess + stopFails} stops held · mean go ${mean} ms.`,
        score,
        gameId: 'stop-signal',
        tone: 'over',
        onRestart: () => renderStopSignal(container, onClose),
        onClose
      });
      return;
    }
    active = false;
    responded = false;
    stopShown = false;
    signal.textContent = '+';
    signal.className = 'text-7xl text-zinc-500';
    note.textContent = 'FIXATE';
    screen.style.borderColor = '#f59e0b';
    updateStats();
    later(() => {
      direction = Math.random() < 0.5 ? 'left' : 'right';
      isStop = stopPlan[trial];
      active = true;
      signalStartedAt = Date.now();
      signal.textContent = direction === 'left' ? '←' : '→';
      signal.className = 'text-8xl text-amber-400';
      note.textContent = 'PRESS THE MATCHING DIRECTION';
      if (isStop) {
        later(() => {
          if (responded) return;
          stopShown = true;
          signal.textContent = 'STOP';
          signal.className = 'text-6xl text-red-500';
          note.textContent = 'DO NOT PRESS';
        }, stopDelay);
        later(settleStop, 900);
      } else {
        later(() => {
          if (responded) return;
          goErrors++;
          trial++;
          feedback('MISSED', false);
        }, 900);
      }
    }, 450);
  }

  function onKey(event) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      respond(event.key === 'ArrowLeft' ? 'left' : 'right');
    }
  }

  container.querySelector('#close-game-btn').onclick = close;
  container.querySelectorAll('.sst-key').forEach(button => {
    button.onclick = () => respond(button.dataset.dir);
  });
  container.querySelector('#sst-start').onclick = event => {
    event.currentTarget.remove();
    window.addEventListener('keydown', onKey);
    nextTrial();
  };
}

/* --------------------------------------------------------------------------
 * WAREHOUSE PUSH
 * ----------------------------------------------------------------------- */

export const WAREHOUSE_LEVELS = [
`#####
# . #
# $ #
# @ #
#####`,
`#######
# . . #
# $ $ #
#  @  #
#######`,
`#######
#  .  #
#  $  #
#     #
# @   #
#######`
];

const cellKey = (row, col) => `${row},${col}`;

export function parseWarehouse(source) {
  const rows = source.split('\n');
  const state = { rows: rows.length, cols: Math.max(...rows.map(row => row.length)), walls: new Set(), goals: new Set(), crates: new Set(), player: null };
  rows.forEach((row, r) => [...row].forEach((cell, c) => {
    const key = cellKey(r, c);
    if (cell === '#') state.walls.add(key);
    if (cell === '.' || cell === '*' || cell === '+') state.goals.add(key);
    if (cell === '$' || cell === '*') state.crates.add(key);
    if (cell === '@' || cell === '+') state.player = key;
  }));
  return state;
}

function cloneWarehouse(state) {
  return { ...state, walls: new Set(state.walls), goals: new Set(state.goals), crates: new Set(state.crates) };
}

export function moveWarehouse(state, dr, dc) {
  const [r, c] = state.player.split(',').map(Number);
  const nextKey = cellKey(r + dr, c + dc);
  if (state.walls.has(nextKey)) return null;
  const next = cloneWarehouse(state);
  if (state.crates.has(nextKey)) {
    const beyond = cellKey(r + dr * 2, c + dc * 2);
    if (state.walls.has(beyond) || state.crates.has(beyond)) return null;
    next.crates.delete(nextKey);
    next.crates.add(beyond);
  }
  next.player = nextKey;
  return next;
}

export function warehouseSolved(state) {
  return state.crates.size === state.goals.size && [...state.crates].every(crate => state.goals.has(crate));
}

export function renderWarehousePush(container, onClose) {
  let level = 0;
  let state = parseWarehouse(WAREHOUSE_LEVELS[level]);
  let initial = cloneWarehouse(state);
  let history = [];
  let moves = 0;
  let totalScore = 0;
  let locked = false;

  const removeKeys = () => window.removeEventListener('keydown', onKey);
  const close = () => { removeKeys(); onClose(); };

  function draw() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">WAREHOUSE PUSH</h2>
          <p class="text-[10px] text-amber-500/80 uppercase">CRATES MOVE FORWARD · NEVER PULL</p></div>
          ${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>ROOM <b class="text-amber-400">${level + 1}/${WAREHOUSE_LEVELS.length}</b></span>
          <span>MOVES <b class="text-white">${moves}</b></span>
          <span>CRATES <b class="text-green-400">${[...state.crates].filter(c => state.goals.has(c)).length}/${state.goals.size}</b></span>
        </div>
        <div id="warehouse-board" class="grid gap-1 mx-auto bg-zinc-950 border border-amber-500/40 p-2" style="grid-template-columns:repeat(${state.cols},minmax(28px,48px));width:max-content;max-width:100%"></div>
        <div class="grid grid-cols-3 gap-2 mt-4 max-w-xs mx-auto">
          <span></span><button class="warehouse-key py-3 border-2 border-amber-500 text-amber-400" data-dr="-1" data-dc="0">UP</button><span></span>
          <button class="warehouse-key py-3 border-2 border-amber-500 text-amber-400" data-dr="0" data-dc="-1">LEFT</button>
          <button id="warehouse-undo" class="py-3 border-2 border-zinc-600 text-zinc-300">UNDO</button>
          <button class="warehouse-key py-3 border-2 border-amber-500 text-amber-400" data-dr="0" data-dc="1">RIGHT</button>
          <span></span><button class="warehouse-key py-3 border-2 border-amber-500 text-amber-400" data-dr="1" data-dc="0">DOWN</button><span></span>
        </div>
        <button id="warehouse-reset" class="w-full mt-3 py-3 border border-zinc-600 text-zinc-300 text-xs">RESET ROOM</button>
        <p class="mt-3 text-[10px] text-zinc-500">Planning lesson: a legal push can still create an unwinnable corner. Inspect the destination before committing.</p>
      </div>`;
    const board = container.querySelector('#warehouse-board');
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const key = cellKey(r, c);
        const cell = document.createElement('div');
        cell.className = 'aspect-square flex items-center justify-center border border-zinc-800 text-sm font-black';
        if (state.walls.has(key)) { cell.className += ' bg-zinc-700 text-zinc-400'; cell.textContent = '#'; }
        else if (state.crates.has(key)) { cell.className += state.goals.has(key) ? ' bg-green-700 text-white' : ' bg-amber-600 text-black'; cell.textContent = state.goals.has(key) ? 'X' : '$'; }
        else if (state.player === key) { cell.className += ' bg-blue-700 text-white'; cell.textContent = '@'; }
        else if (state.goals.has(key)) { cell.className += ' bg-zinc-900 text-green-400'; cell.textContent = '.'; }
        else { cell.className += ' bg-zinc-950'; }
        board.appendChild(cell);
      }
    }
    container.querySelector('#close-game-btn').onclick = close;
    container.querySelectorAll('.warehouse-key').forEach(button => {
      button.onclick = () => move(Number(button.dataset.dr), Number(button.dataset.dc));
    });
    container.querySelector('#warehouse-undo').onclick = undo;
    container.querySelector('#warehouse-reset').onclick = reset;
  }

  function move(dr, dc) {
    if (locked) return;
    const next = moveWarehouse(state, dr, dc);
    if (!next) { soundFx.playHit(); return; }
    history.push(cloneWarehouse(state));
    state = next;
    moves++;
    soundFx.playClick();
    if (warehouseSolved(state)) {
      locked = true;
      totalScore += Math.max(20, 200 - moves * 5);
      soundFx.playCoin();
      setTimeout(() => {
        level++;
        if (level >= WAREHOUSE_LEVELS.length) {
          removeKeys();
          showResult({ container, title: 'SHIFT COMPLETE', message: `All ${WAREHOUSE_LEVELS.length} rooms cleared without pulling a crate.`, score: totalScore, gameId: 'warehouse-push', tone: 'over', onRestart: () => renderWarehousePush(container, onClose), onClose });
          return;
        }
        state = parseWarehouse(WAREHOUSE_LEVELS[level]);
        initial = cloneWarehouse(state);
        history = [];
        moves = 0;
        locked = false;
        draw();
      }, 450);
      return;
    }
    draw();
  }

  function undo() {
    if (!history.length || locked) return;
    state = history.pop();
    moves = Math.max(0, moves - 1);
    draw();
  }

  function reset() {
    state = cloneWarehouse(initial);
    history = [];
    moves = 0;
    locked = false;
    draw();
  }

  function onKey(event) {
    const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!directions[event.key]) return;
    event.preventDefault();
    move(...directions[event.key]);
  }

  window.addEventListener('keydown', onKey);
  draw();
}

/* --------------------------------------------------------------------------
 * LIGHTS OUT
 * ----------------------------------------------------------------------- */

export function toggleLights(board, size, index) {
  const next = [...board];
  const row = Math.floor(index / size);
  const col = index % size;
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < size && c >= 0 && c < size) {
      const i = r * size + c;
      next[i] = !next[i];
    }
  }
  return next;
}

export function makeLightsPuzzle(size, pressIndices) {
  let board = Array(size * size).fill(false);
  const solution = Array(size * size).fill(false);
  for (const index of pressIndices) {
    board = toggleLights(board, size, index);
    solution[index] = !solution[index];
  }
  return { board, solution };
}

export function lightsSolved(board) {
  return board.every(light => !light);
}

export function renderLightsOut(container, onClose) {
  const SIZES = [3, 4, 5];
  let round = 0;
  let board, solution, originalBoard, originalSolution;
  let moves = 0, hints = 0, totalScore = 0, locked = false;

  function newRound() {
    const size = SIZES[round];
    const pressCount = [3, 5, 7][round];
    const presses = shuffled(Array.from({ length: size * size }, (_, i) => i)).slice(0, pressCount);
    ({ board, solution } = makeLightsPuzzle(size, presses));
    originalBoard = [...board];
    originalSolution = [...solution];
    moves = 0;
    hints = 0;
    locked = false;
    draw();
  }

  function draw() {
    const size = SIZES[round];
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">LIGHTS OUT</h2>
          <p class="text-[10px] text-amber-500/80 uppercase">ONE PRESS FLIPS A CROSS · DARKEN THE GRID</p></div>
          ${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>BOARD <b class="text-amber-400">${round + 1}/${SIZES.length}</b></span>
          <span>SIZE <b class="text-white">${size}X${size}</b></span>
          <span>MOVES <b class="text-green-400">${moves}</b></span>
        </div>
        <div id="lights-board" class="grid gap-2 mx-auto" style="grid-template-columns:repeat(${size},minmax(42px,64px));width:max-content;max-width:100%"></div>
        <div class="grid grid-cols-2 gap-2 mt-4">
          <button id="lights-hint" class="py-3 border-2 border-amber-500 text-amber-400 text-xs">REVEAL ONE PRESS</button>
          <button id="lights-reset" class="py-3 border-2 border-zinc-600 text-zinc-300 text-xs">RESET BOARD</button>
        </div>
        <p id="lights-note" class="mt-3 text-[10px] text-zinc-500">A press is its own inverse, and press order does not matter. This is parity disguised as a toy.</p>
      </div>`;
    const grid = container.querySelector('#lights-board');
    board.forEach((on, index) => {
      const button = document.createElement('button');
      button.className = `aspect-square border-2 font-black text-xs ${on ? 'bg-amber-400 border-amber-200 text-black' : 'bg-zinc-950 border-zinc-700 text-zinc-700'}`;
      button.textContent = on ? 'ON' : 'OFF';
      button.setAttribute('aria-label', `Light ${index + 1}, ${on ? 'on' : 'off'}`);
      button.onclick = () => press(index);
      grid.appendChild(button);
    });
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelector('#lights-reset').onclick = () => {
      board = [...originalBoard];
      solution = [...originalSolution];
      moves = 0;
      hints = 0;
      locked = false;
      draw();
    };
    container.querySelector('#lights-hint').onclick = hint;
  }

  function press(index) {
    if (locked) return;
    board = toggleLights(board, SIZES[round], index);
    solution[index] = !solution[index];
    moves++;
    soundFx.playClick();
    if (lightsSolved(board)) {
      locked = true;
      totalScore += Math.max(20, 200 - moves * 5 - hints * 20);
      soundFx.playCoin();
      setTimeout(() => {
        round++;
        if (round >= SIZES.length) {
          showResult({ container, title: 'GRID DARK', message: `Three boards solved in ${moves} moves on the final grid.`, score: totalScore, gameId: 'lights-out', tone: 'over', onRestart: () => renderLightsOut(container, onClose), onClose });
          return;
        }
        newRound();
      }, 450);
      return;
    }
    draw();
  }

  function hint() {
    const index = solution.findIndex(Boolean);
    if (index < 0) return;
    hints++;
    const button = container.querySelectorAll('#lights-board button')[index];
    if (button) {
      button.style.outline = '3px solid #3b82f6';
      button.style.outlineOffset = '2px';
    }
    container.querySelector('#lights-note').textContent = `Try cell ${index + 1}. The hint tracks the remaining parity, even after your moves.`;
  }

  newRound();
}
