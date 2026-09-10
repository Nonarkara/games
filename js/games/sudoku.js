/**
 * NGS Logic Suite · Sudoku — fresh board on every play, four difficulty tiers.
 *
 * Generator: backtracking solver, then symmetric cell removal with a
 * uniqueness check that bails as soon as it finds two solutions. This
 * keeps "Easy" (~38 givens) snappy and "Expert" (~24 givens) honest
 * about whether the puzzle has exactly one answer.
 *
 * Pure helpers (no DOM) for testing:
 *   - newSolvedBoard()           → fully solved 9×9 board
 *   - isValidPlacement(board, r, c, n)
 *   - countSolutions(board, cap=2) → 1 or 2+
 *   - generatePuzzle(difficulty) → { puzzle, solution, givens }
 *
 * Difficulty bands (givens remaining):
 *   easy     38
 *   medium   32
 *   hard     28
 *   expert   24
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-2xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

const SIZE = 9;
const BOX = 3;

export const DIFFICULTY = {
  easy:   { label: 'EASY',   givens: 38, desc: '38 givens. Most rows can be filled by scanning the column.' },
  medium: { label: 'MEDIUM', givens: 32, desc: '32 givens. Pencil marks help.' },
  hard:   { label: 'HARD',   givens: 28, desc: '28 givens. Look for hidden pairs and box-line reductions.' },
  expert: { label: 'EXPERT', givens: 24, desc: '24 givens. Pure logic. The generator will reject non-unique puzzles.' }
};

/** Return a fresh solved 9×9 Sudoku board. */
export function newSolvedBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  // Seed the diagonal 3×3 boxes with shuffled 1-9 so the backtracker has variety.
  for (let box = 0; box < SIZE; box += BOX) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < BOX; i++) for (let j = 0; j < BOX; j++) {
      b[box + i][box + j] = digits[i * BOX + j];
    }
  }
  // Backtracking fill
  fillFrom(b, 0, 0);
  return b;
}

function fillFrom(b, r, c) {
  if (r === SIZE) return true;
  const [nr, nc] = c === SIZE - 1 ? [r + 1, 0] : [r, c + 1];
  if (b[r][c] !== 0) return fillFrom(b, nr, nc);
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const d of digits) {
    if (!isValidPlacement(b, r, c, d)) continue;
    b[r][c] = d;
    if (fillFrom(b, nr, nc)) return true;
    b[r][c] = 0;
  }
  return false;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Is digit `n` legal at (r, c) given the current state of `b`? */
export function isValidPlacement(b, r, c, n) {
  for (let i = 0; i < SIZE; i++) {
    if (b[r][i] === n && i !== c) return false;
    if (b[i][c] === n && i !== r) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let i = 0; i < BOX; i++) for (let j = 0; j < BOX; j++) {
    if (br + i === r && bc + j === c) continue;
    if (b[br + i][bc + j] === n) return false;
  }
  return true;
}

/** Count solutions of `b`, bailing after `cap` (so uniqueness check is fast). */
export function countSolutions(b, cap = 2) {
  const board = b.map(row => row.slice());
  let count = 0;
  function go() {
    if (count >= cap) return;
    // Find next empty
    let r = -1, c = -1;
    for (let i = 0; i < SIZE && r < 0; i++) for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) { r = i; c = j; break; }
    }
    if (r < 0) { count++; return; }
    for (let d = 1; d <= 9; d++) {
      if (!isValidPlacement(board, r, c, d)) continue;
      board[r][c] = d;
      go();
      board[r][c] = 0;
      if (count >= cap) return;
    }
  }
  go();
  return count;
}

/** Generate a fresh puzzle with exactly one solution.
 *  Tries to remove symmetric pairs of cells; if removal creates ambiguity,
 *  the cell is put back and another pair is tried. */
export function generatePuzzle(difficulty = 'medium') {
  const targetGivens = DIFFICULTY[difficulty]?.givens ?? 32;
  const solution = newSolvedBoard();
  // Build the list of 81/2 = 40 symmetric pairs (we keep pairs so the puzzle
  // is visually balanced), shuffle them.
  const pairs = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const mirror = (SIZE - 1 - r) * SIZE + (SIZE - 1 - c);
    if (mirror > i) pairs.push([i, mirror]);
  }
  // We want to keep `targetGivens` cells filled, i.e. remove (81 - targetGivens).
  // Each pair-removal removes 2 cells (unless i === mirror, which we never have here).
  const removalsNeeded = Math.floor((SIZE * SIZE - targetGivens) / 2);
  shuffle(pairs);
  const puzzle = solution.map(row => row.slice());
  let removed = 0;
  for (const [a, b] of pairs) {
    if (removed >= removalsNeeded) break;
    const ar = Math.floor(a / SIZE), ac = a % SIZE;
    const br = Math.floor(b / SIZE), bc = b % SIZE;
    const av = puzzle[ar][ac], bv = puzzle[br][bc];
    if (av === 0 || bv === 0) continue;
    puzzle[ar][ac] = 0;
    puzzle[br][bc] = 0;
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      // Put them back — this pair would create multiple solutions
      puzzle[ar][ac] = av;
      puzzle[br][bc] = bv;
    }
  }
  const givens = puzzle.flat().filter(v => v !== 0).length;
  return { puzzle, solution, givens, difficulty };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderSudoku(container, onClose) {
  start();

  function start(difficulty = 'medium') {
    let { puzzle, solution } = generatePuzzle(difficulty);
    const cells = puzzle.map(row => row.slice());
    const fixed = puzzle.map(v => v !== 0);
    let selected = -1;
    let mistakes = 0;
    let startedAt = performance.now();
    let over = false;

    function checkComplete() {
      for (let i = 0; i < SIZE * SIZE; i++) {
        if (cells[Math.floor(i / SIZE)][i % SIZE] !== solution[Math.floor(i / SIZE)][i % SIZE]) return false;
      }
      return true;
    }

    function endRound() {
      if (over) return;
      over = true;
      const secs = (performance.now() - startedAt) / 1000;
      const diff = DIFFICULTY[difficulty];
      const base = difficulty === 'easy' ? 600 : difficulty === 'medium' ? 800 : difficulty === 'hard' ? 1000 : 1200;
      const score = Math.max(50, Math.round(base - secs * 4 - mistakes * 60));
      const title = mistakes === 0 ? 'CLEAN GRID' : 'SOLVED';
      const msg = `${diff.label} solved in ${secs.toFixed(1)}s · ${mistakes} mistake${mistakes === 1 ? '' : 's'}. ${mistakes === 0 ? 'Zero wrong digits — that is the kind of grid that prints on a t-shirt.' : 'Most published Sudokus are solvable without guessing; the same applies here.'}`;
      showResult({
        container, title, message: msg,
        gameId: 'sudoku', score,
        tone: mistakes === 0 ? 'win' : 'over',
        onRestart: () => start(difficulty), onClose
      });
    }

    function place(n) {
      if (over || selected < 0) return;
      const r = Math.floor(selected / SIZE);
      const c = selected % SIZE;
      if (fixed[r * SIZE + c]) return;
      cells[r][c] = n;
      if (n !== 0 && n !== solution[r][c]) {
        mistakes++;
        soundFx.playHit();
      } else if (n !== 0) {
        soundFx.playClick();
      } else {
        soundFx.playClick();
      }
      paint();
      if (checkComplete()) endRound();
    }

    function paint() {
      container.querySelectorAll('.sdk-cell').forEach((btn, i) => {
        const r = Math.floor(i / SIZE);
        const c = i % SIZE;
        const v = cells[r][c];
        btn.textContent = v || '';
        const isSel = i === selected;
        const wrong = !fixed[i] && v !== 0 && v !== solution[r][c];
        const sameRowCol = selected >= 0 && (Math.floor(selected / SIZE) === r || (selected % SIZE) === c);
        const sameBox = selected >= 0 && (Math.floor(selected / BOX) * BOX === Math.floor(r / BOX) * BOX) && (Math.floor((selected % SIZE) / BOX) * BOX === Math.floor(c / BOX) * BOX);
        const peer = isSel ? false : (sameRowCol || sameBox);
        const sameVal = v !== 0 && selected >= 0 && v === cells[Math.floor(selected / SIZE)][selected % SIZE];
        btn.className = 'sdk-cell ' +
          (fixed[i] ? 'is-fixed ' : '') +
          (isSel ? 'is-selected ' : '') +
          (peer ? 'is-peer ' : '') +
          (sameVal ? 'is-same-val ' : '') +
          (wrong ? 'is-wrong ' : '');
      });
      const filled = cells.flat().filter(v => v !== 0).length;
      const el = container.querySelector('[data-filled]');
      if (el) el.textContent = filled;
      const me = container.querySelector('[data-mistakes]');
      if (me) me.textContent = mistakes;
    }

    function render() {
      const diff = DIFFICULTY[difficulty];
      const board = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const idx = r * SIZE + c;
          const thickTop = r % BOX === 0;
          const thickLeft = c % BOX === 0;
          const thickRight = c === SIZE - 1;
          const thickBottom = r === SIZE - 1;
          const v = cells[r][c];
          board.push(`<button type="button" class="sdk-cell ${fixed[idx] ? 'is-fixed' : ''}"
            data-i="${idx}"
            style="${thickTop ? 'border-top:2px solid #f59e0b;' : ''}${thickLeft ? 'border-left:2px solid #f59e0b;' : ''}${thickRight ? 'border-right:2px solid #f59e0b;' : ''}${thickBottom ? 'border-bottom:2px solid #f59e0b;' : ''}">${v || ''}</button>`);
        }
      }
      const pad = [];
      for (let n = 1; n <= 9; n++) pad.push(`<button type="button" class="sdk-digit" data-n="${n}">${n}</button>`);
      pad.push(`<button type="button" class="sdk-digit sdk-digit--clr" data-n="0">CLR</button>`);

      const elapsed = ((performance.now() - startedAt) / 1000).toFixed(0);

      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
            <div>
              <h2 class="text-xl font-black text-amber-400 tracking-wider">SUDOKU</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">${diff.label} · fresh board every play</p>
            </div>
            ${closeButton()}
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
            <span>FILLED<br><b data-filled class="text-amber-400 text-base">0</b><span class="text-amber-500/50 text-[10px]">/81</span></span>
            <span>MISTAKES<br><b data-mistakes class="text-red-400 text-base">0</b></span>
            <span>TIME<br><b data-time class="text-amber-400 text-base">${elapsed}s</b></span>
          </div>
          <div class="sdk-board" role="grid" aria-label="9×9 Sudoku">
            ${board.join('')}
          </div>
          <div class="sdk-pad" role="group" aria-label="Digits">
            ${pad.join('')}
          </div>
          <div class="flex flex-wrap gap-2 mt-3 justify-center">
            ${Object.keys(DIFFICULTY).map(d =>
              `<button type="button" data-diff="${d}" class="sdk-diff px-2 py-1 text-[10px] border ${d === difficulty ? 'border-amber-400 text-amber-400' : 'border-amber-500/30 text-amber-500/60'}">${DIFFICULTY[d].label}</button>`
            ).join('')}
            <button type="button" data-new class="sdk-diff px-2 py-1 text-[10px] border border-amber-500 text-amber-400">NEW PUZZLE</button>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-zinc-400 text-center">
            ${diff.desc} Tap a cell, then a digit. CLR clears. Bold lines are the 3×3 boxes.
          </p>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.sdk-cell').forEach(btn => {
        btn.onclick = () => {
          const i = Number(btn.dataset.i);
          if (over) return;
          if (fixed[i]) {
            soundFx.playHit();
          } else {
            selected = i;
            soundFx.playClick();
          }
          paint();
        };
      });
      container.querySelectorAll('.sdk-digit').forEach(btn => {
        btn.onclick = () => place(Number(btn.dataset.n));
      });
      container.querySelectorAll('[data-diff]').forEach(btn => {
        btn.onclick = () => start(btn.dataset.diff);
      });
      container.querySelector('[data-new]').onclick = () => start(difficulty);

      // Live timer — refresh the time chip every second.
      const timeEl = container.querySelector('[data-time]');
      if (timeEl && !over) {
        const tick = setInterval(() => {
          if (over) { clearInterval(tick); return; }
          timeEl.textContent = ((performance.now() - startedAt) / 1000).toFixed(0) + 's';
        }, 1000);
      }
      paint();
    }

    render();
  }
}
