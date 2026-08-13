/**
 * NGS Logic Suite · three mechanics not otherwise represented on the floor.
 * Pure helpers are exported so the rules can be tested without a browser.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ------------------------------------------------------------------------
 * NONOGRAM — clues are run lengths; every row and column constrains the grid.
 * --------------------------------------------------------------------- */
export const NONOGRAM_PUZZLES = [
  { name: 'ARROW', cells: ['00100', '01100', '11111', '01100', '00100'] },
  { name: 'CUP', cells: ['10001', '10001', '10001', '01110', '00100'] },
  { name: 'KEY', cells: ['01100', '10010', '01100', '00110', '00111'] },
  { name: 'SPACE INVADER', cells: ['10101', '11111', '01010', '10101', '10001'] }
];

export function nonogramClues(rows) {
  const runs = line => {
    const result = [];
    let run = 0;
    for (const cell of line) {
      if (cell === '1') run++;
      else if (run) { result.push(run); run = 0; }
    }
    if (run) result.push(run);
    return result.length ? result : [0];
  };
  const columns = rows[0].split('').map((_, column) => rows.map(row => row[column]).join(''));
  return { rows: rows.map(runs), columns: columns.map(runs) };
}

export function nonogramSolved(state, rows) {
  return rows.every((row, y) => [...row].every((cell, x) => (state[y * row.length + x] === 1) === (cell === '1')));
}

export function renderNonogram(container, onClose) {
  const puzzles = shuffled(NONOGRAM_PUZZLES).slice(0, 3);
  let round = 0, state = [], moves = 0, hints = 0, total = 0, locked = false;

  function startRound() {
    state = Array(25).fill(0);
    moves = 0; hints = 0; locked = false;
    draw();
  }

  function draw() {
    const puzzle = puzzles[round];
    const clues = nonogramClues(puzzle.cells);
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">NONOGRAM</h2><p class="text-[10px] text-amber-500/80 uppercase">NUMBERS SAY HOW MANY FILLED CELLS RUN TOGETHER</p></div>${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold"><span>PICTURE <b class="text-amber-400">${round + 1}/3</b></span><span>MOVES <b class="text-white">${moves}</b></span><span>HINTS <b class="text-white">${hints}</b></span></div>
        <div class="ng-nonogram mx-auto" style="display:grid;grid-template-columns:72px repeat(5,minmax(42px,56px));grid-template-rows:72px repeat(5,minmax(42px,56px));width:max-content;max-width:100%">
          <div></div>
          ${clues.columns.map(clue => `<div class="flex items-end justify-center pb-2 text-xs font-black text-amber-400">${clue.join('<br>')}</div>`).join('')}
          ${puzzle.cells.map((row, y) => `<div class="flex items-center justify-end pr-3 text-xs font-black text-amber-400">${clues.rows[y].join(' ')}</div>${[...row].map((_, x) => {
            const value = state[y * 5 + x];
            return `<button data-cell="${y * 5 + x}" class="border border-zinc-600 text-xl font-black ${value === 1 ? 'bg-amber-400 text-black' : 'bg-zinc-950 text-zinc-500'}" aria-label="Row ${y + 1}, column ${x + 1}, ${value === 1 ? 'filled' : value === 2 ? 'marked empty' : 'unknown'}">${value === 1 ? '' : value === 2 ? '×' : ''}</button>`;
          }).join('')}`).join('')}
        </div>
        <p class="mt-4 text-[11px] leading-relaxed text-zinc-400">Tap once to fill, twice to mark empty, three times to clear. Separate numbers mean separate runs with at least one gap.</p>
        <div class="grid grid-cols-2 gap-2 mt-3"><button id="ng-hint" class="py-3 border-2 border-amber-500 text-amber-400 text-xs">REVEAL ONE CELL</button><button id="ng-reset" class="py-3 border-2 border-zinc-600 text-zinc-300 text-xs">RESET GRID</button></div>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelectorAll('[data-cell]').forEach(button => button.onclick = () => tap(Number(button.dataset.cell)));
    container.querySelector('#ng-reset').onclick = startRound;
    container.querySelector('#ng-hint').onclick = hint;
  }

  function tap(index) {
    if (locked) return;
    state[index] = (state[index] + 1) % 3;
    moves++;
    soundFx.playClick();
    check();
  }

  function hint() {
    if (locked) return;
    const answer = puzzles[round].cells.join('');
    const index = state.findIndex((value, i) => (value === 1) !== (answer[i] === '1'));
    if (index < 0) return;
    state[index] = answer[index] === '1' ? 1 : 2;
    hints++;
    check();
  }

  function check() {
    if (!nonogramSolved(state, puzzles[round].cells)) return draw();
    locked = true;
    total += Math.max(40, 160 - moves * 2 - hints * 20);
    soundFx.playCoin();
    draw();
    setTimeout(() => {
      round++;
      if (round < puzzles.length) return startRound();
      showResult({ container, title: 'PICTURES FOUND', message: 'You solved three grids by crossing row clues with column clues.', score: total, gameId: 'nonogram', tone: 'win', onRestart: () => renderNonogram(container, onClose), onClose });
    }, 500);
  }

  startRound();
}

/* ------------------------------------------------------------------------
 * NIM — remove any positive number from one heap; taking the last wins.
 * --------------------------------------------------------------------- */
export function optimalNimMove(heaps) {
  const xor = heaps.reduce((value, heap) => value ^ heap, 0);
  if (xor) {
    for (let heap = 0; heap < heaps.length; heap++) {
      const target = heaps[heap] ^ xor;
      if (target < heaps[heap]) return { heap, count: heaps[heap] - target };
    }
  }
  const available = heaps.map((value, heap) => ({ value, heap })).filter(item => item.value > 0);
  return available.length ? { heap: available[0].heap, count: 1 } : null;
}

export function applyNimMove(heaps, heap, count) {
  if (!Number.isInteger(heap) || !Number.isInteger(count) || count < 1 || heap < 0 || heap >= heaps.length || count > heaps[heap]) return null;
  const next = [...heaps];
  next[heap] -= count;
  return next;
}

export function renderNim(container, onClose) {
  let match = 1, playerWins = 0, cpuWins = 0, heaps = [], selected = 0, locked = false, note = '';
  const setups = [[3, 4, 5], [1, 5, 7], [2, 6, 7]];

  function startMatch() { heaps = [...setups[(match - 1) % setups.length]]; selected = 0; locked = false; note = 'Choose one heap, then choose how many to take.'; draw(); }

  function draw() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3"><div><h2 class="text-xl font-black text-amber-400 tracking-wider">NIM</h2><p class="text-[10px] text-amber-500/80 uppercase">TAKE FROM ONE HEAP · TAKE THE LAST TOKEN TO WIN</p></div>${closeButton()}</div>
        <div class="grid grid-cols-3 gap-1 bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold text-center"><span>MATCH<br><b class="text-amber-400">${match}/3</b></span><span>YOU<br><b class="text-green-400">${playerWins}</b></span><span>CPU<br><b class="text-red-400">${cpuWins}</b></span></div>
        <div class="grid grid-cols-3 gap-2">
          ${heaps.map((count, index) => `<button data-heap="${index}" class="min-h-40 p-3 border-2 ${selected === index ? 'border-amber-400 bg-amber-400/10' : 'border-zinc-700 bg-zinc-950'}"><span class="block text-[10px] text-zinc-400 mb-3">HEAP ${index + 1}</span><span class="block text-2xl leading-relaxed text-amber-400">${'●'.repeat(count) || '—'}</span><b class="block mt-2 text-white">${count}</b></button>`).join('')}
        </div>
        <div class="grid grid-cols-4 gap-2 mt-3">${Array.from({ length: Math.max(1, heaps[selected]) }, (_, i) => `<button data-take="${i + 1}" class="min-h-12 border border-amber-500 text-amber-400 text-xs">TAKE ${i + 1}</button>`).join('')}</div>
        <p class="mt-4 min-h-10 text-[11px] leading-relaxed text-zinc-400">${note}</p>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelectorAll('[data-heap]').forEach(button => button.onclick = () => { if (!locked && heaps[button.dataset.heap] > 0) { selected = Number(button.dataset.heap); draw(); } });
    container.querySelectorAll('[data-take]').forEach(button => button.onclick = () => playerMove(Number(button.dataset.take)));
  }

  function playerMove(count) {
    if (locked) return;
    const next = applyNimMove(heaps, selected, count);
    if (!next) return;
    heaps = next;
    soundFx.playClick();
    if (!heaps.some(Boolean)) return finishMatch(true);
    locked = true; note = `You took ${count}. CPU is thinking…`; draw();
    setTimeout(() => {
      const move = optimalNimMove(heaps);
      heaps = applyNimMove(heaps, move.heap, move.count);
      selected = heaps.findIndex(Boolean);
      if (!heaps.some(Boolean)) return finishMatch(false);
      locked = false; note = `CPU took ${move.count} from heap ${move.heap + 1}. Your move.`; draw();
    }, 550);
  }

  function finishMatch(playerWon) {
    locked = true;
    if (playerWon) { playerWins++; soundFx.playCoin(); }
    else { cpuWins++; soundFx.playHit(); }
    note = playerWon ? 'You took the last token.' : 'CPU took the last token.';
    draw();
    setTimeout(() => {
      match++;
      if (match <= 3) return startMatch();
      showResult({ container, title: playerWins > cpuWins ? 'NIM MASTER' : 'CPU HOLDS THE EDGE', message: `${playerWins}–${cpuWins}. Winning positions make the heap sizes cancel in binary; the computer uses that invariant.`, score: playerWins * 100, gameId: 'nim', tone: playerWins > cpuWins ? 'win' : 'over', onRestart: () => renderNim(container, onClose), onClose });
    }, 650);
  }

  startMatch();
}

/* ------------------------------------------------------------------------
 * MAKE 24 — combine four numbers with arithmetic; every number used once.
 * --------------------------------------------------------------------- */
export const MAKE_24_PUZZLES = [[1, 3, 4, 6], [2, 3, 4, 6], [3, 3, 8, 8], [1, 5, 5, 5], [1, 2, 3, 4], [2, 2, 7, 7]];

export function combine24(a, operator, b) {
  if (operator === '+') return a + b;
  if (operator === '−') return a - b;
  if (operator === '×') return a * b;
  if (operator === '÷' && b !== 0) return a / b;
  return null;
}

export function renderMake24(container, onClose) {
  const puzzles = shuffled(MAKE_24_PUZZLES).slice(0, 3);
  let round = 0, values = [], selected = null, operator = null, history = [], attempts = 0, score = 0, note = '';
  const label = value => Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();

  function startRound() { values = [...puzzles[round]]; selected = null; operator = null; history = []; attempts = 0; note = 'Pick a number, an operation, then another number.'; draw(); }

  function draw() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3"><div><h2 class="text-xl font-black text-amber-400 tracking-wider">MAKE 24</h2><p class="text-[10px] text-amber-500/80 uppercase">USE ALL FOUR NUMBERS · MAKE EXACTLY 24</p></div>${closeButton()}</div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold"><span>PUZZLE <b class="text-amber-400">${round + 1}/3</b></span><span>STEPS <b class="text-white">${history.length}</b></span><span>TRIES <b class="text-white">${attempts}</b></span></div>
        <div class="grid grid-cols-4 gap-2">${values.map((value, index) => `<button data-value="${index}" class="min-h-20 border-2 text-xl font-black ${selected === index ? 'border-green-400 text-green-400 bg-green-400/10' : 'border-amber-500 text-amber-400 bg-zinc-950'}">${label(value)}</button>`).join('')}</div>
        <div class="grid grid-cols-4 gap-2 mt-3">${['+', '−', '×', '÷'].map(op => `<button data-op="${op}" class="min-h-14 border-2 text-xl font-black ${operator === op ? 'border-green-400 text-green-400' : 'border-zinc-600 text-white'}">${op}</button>`).join('')}</div>
        <p class="mt-4 min-h-10 text-[11px] leading-relaxed text-zinc-400">${note}</p>
        <div class="grid grid-cols-2 gap-2"><button id="m24-undo" class="py-3 border-2 border-amber-500 text-amber-400 text-xs" ${history.length ? '' : 'disabled'}>UNDO STEP</button><button id="m24-reset" class="py-3 border-2 border-zinc-600 text-zinc-300 text-xs">NEW TRY</button></div>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelectorAll('[data-value]').forEach(button => button.onclick = () => pick(Number(button.dataset.value)));
    container.querySelectorAll('[data-op]').forEach(button => button.onclick = () => { if (selected !== null) { operator = button.dataset.op; note = `Now pick the number to ${operator === '÷' ? 'divide by' : 'combine with'}.`; draw(); } });
    container.querySelector('#m24-reset').onclick = () => { attempts++; values = [...puzzles[round]]; history = []; selected = null; operator = null; note = 'Reset. Try a different pair first.'; draw(); };
    container.querySelector('#m24-undo').onclick = undo;
  }

  function pick(index) {
    if (selected === null) { selected = index; note = 'Choose +, −, ×, or ÷.'; return draw(); }
    if (!operator) { selected = index; return draw(); }
    if (index === selected) { note = 'Choose a different number.'; return draw(); }
    const result = combine24(values[selected], operator, values[index]);
    if (result === null || !Number.isFinite(result)) { note = 'That division is not allowed.'; return draw(); }
    history.push([...values]);
    const keep = values.filter((_, i) => i !== selected && i !== index);
    values = [...keep, result];
    selected = null; operator = null;
    soundFx.playClick();
    if (values.length === 1) return finishTry();
    note = `${label(result)} goes back into the tray. Combine again.`;
    draw();
  }

  function undo() {
    if (!history.length) return;
    values = history.pop(); selected = null; operator = null; note = 'Step undone.'; draw();
  }

  function finishTry() {
    if (Math.abs(values[0] - 24) < 1e-9) {
      score += Math.max(40, 80 - attempts * 10);
      soundFx.playCoin();
      note = 'Exactly 24.'; draw();
      setTimeout(() => {
        round++;
        if (round < puzzles.length) return startRound();
        showResult({ container, title: 'TWENTY-FOUR', message: 'Three sets solved. Pair choice and operation order matter more than raw calculation speed.', score, gameId: 'make-24', tone: 'win', onRestart: () => renderMake24(container, onClose), onClose });
      }, 550);
    } else {
      attempts++;
      note = `${label(values[0])}, not 24. Undo the last step or start a new try.`;
      draw();
    }
  }

  startRound();
}
