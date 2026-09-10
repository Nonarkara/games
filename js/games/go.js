/**
 * NGS Logic Suite · Go — 9×9 / 11×11 / 13×13 / 19×19 with three difficulty
 * levels (beginner = random; intermediate = 1-ply heuristic; pro = shallow
 * alphabeta with a teaching-grade evaluator). "Pro" is tuned to play solidly
 * enough to teach the opening, life-and-death, and territory — not to challenge
 * a tournament engine.
 *
 * Board: `size × size` array. 'B' = black, 'W' = white, null = empty.
 * Black plays first.
 *
 * Pure helpers (no DOM):
 *   - newBoard(size)
 *   - neighbors(size, r, c)
 *   - groupAt(board, r, c)             → { stones: [[r,c]…], liberties: [[r,c]…] }
 *   - placeStone(board, r, c, side)     → { board, captured: number } | null
 *   - isLegalMove(board, r, c, side, prevBoard?)
 *   - generateMoves(board, side, prevBoard?)
 *   - scorePosition(board)
 *   - bestMove(board, side, level, prevBoard?)
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-5xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

export function newBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function neighbors(size, r, c) {
  const out = [];
  if (r > 0) out.push([r - 1, c]);
  if (r < size - 1) out.push([r + 1, c]);
  if (c > 0) out.push([r, c - 1]);
  if (c < size - 1) out.push([r, c + 1]);
  return out;
}

/** Return the connected group of the same color at (r, c), plus its empty neighbors. */
export function groupAt(board, r, c) {
  const size = board.length;
  const color = board[r][c];
  if (!color) return { stones: [], liberties: [] };
  const stones = [];
  const libertiesSet = new Set();
  const visited = new Set();
  const stack = [[r, c]];
  while (stack.length) {
    const [cr, cc] = stack.pop();
    const key = cr * size + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    if (board[cr][cc] === color) {
      stones.push([cr, cc]);
      for (const [nr, nc] of neighbors(size, cr, cc)) {
        const nk = nr * size + nc;
        if (board[nr][nc] === null && !libertiesSet.has(nk)) libertiesSet.add(nk);
        else if (board[nr][nc] === color) stack.push([nr, nc]);
      }
    }
  }
  const liberties = Array.from(libertiesSet).map(k => [Math.floor(k / size), k % size]);
  return { stones, liberties };
}

/** Try to place a stone at (r, c) for `side`. Returns { board, captured } or null if illegal. */
export function placeStone(board, r, c, side, prevBoard = null) {
  const size = board.length;
  if (board[r][c] !== null) return null;
  const opp = side === 'B' ? 'W' : 'B';
  const nb = board.map(row => row.slice());
  nb[r][c] = side;
  let captured = 0;
  // Capture opponent groups with no liberties
  for (const [nr, nc] of neighbors(size, r, c)) {
    if (nb[nr][nc] === opp) {
      const g = groupAt(nb, nr, nc);
      if (g.liberties.length === 0) {
        for (const [sr, sc] of g.stones) { nb[sr][sc] = null; captured++; }
      }
    }
  }
  // Suicide check
  const myGroup = groupAt(nb, r, c);
  if (myGroup.liberties.length === 0) return null;
  // Ko check
  if (prevBoard && boardsEqual(nb, prevBoard)) return null;
  return { board: nb, captured };
}

export function boardsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) if (a[r][c] !== b[r][c]) return false;
  }
  return true;
}

/** All legal moves for `side` (including pass). `prevBoard` for ko. */
export function generateMoves(board, side, prevBoard = null) {
  const moves = [{ pass: true }];
  const size = board.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (placeStone(board, r, c, side, prevBoard) !== null) {
        moves.push({ pass: false, r, c });
      }
    }
  }
  return moves;
}

export function isLegalMove(board, r, c, side, prevBoard = null) {
  return placeStone(board, r, c, side, prevBoard) !== null;
}

/** Simple territory scoring. Counts stones + surrounded empty regions.
 *  Komi (white bonus) of 6.5 added to white's score. */
export function scorePosition(board) {
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  let black = 0, white = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c];
    if (p === 'B') black++;
    else if (p === 'W') white++;
    else if (!visited[r][c]) {
      // flood fill the empty region, see which colors border it
      const region = [];
      const borderColors = new Set();
      const stack = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        if (visited[cr][cc]) continue;
        visited[cr][cc] = true;
        if (board[cr][cc] === null) {
          region.push([cr, cc]);
          for (const [nr, nc] of neighbors(size, cr, cc)) {
            if (board[nr][nc] === null && !visited[nr][nc]) stack.push([nr, nc]);
            else if (board[nr][nc]) borderColors.add(board[nr][nc]);
          }
        }
      }
      if (borderColors.size === 1) {
        if (borderColors.has('B')) black += region.length;
        else if (borderColors.has('W')) white += region.length;
      }
    }
  }
  return { black, white: white + 6.5 };
}

/** Heuristic: a few hand-tuned features. White-favored (positive = white better). */
function heuristicScore(board) {
  const size = board.length;
  let s = 0;
  // Stone count
  let bStones = 0, wStones = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c];
    if (p === 'B') bStones++;
    else if (p === 'W') wStones++;
  }
  s += (wStones - bStones) * 1.0;
  // Liberty count
  let bLib = 0, wLib = 0;
  const seen = new Set();
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    const p = board[r][c];
    if (!p) continue;
    const k = r * size + c;
    if (seen.has(k)) continue;
    const g = groupAt(board, r, c);
    for (const [sr, sc] of g.stones) seen.add(sr * size + sc);
    if (p === 'B') bLib += g.liberties.length;
    else wLib += g.liberties.length;
  }
  s += (wLib - bLib) * 0.4;
  // Approximate territory: count empty intersections with only one color bordering
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
    if (visited[r][c] || board[r][c]) continue;
    const region = [];
    const colors = new Set();
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      if (visited[cr][cc]) continue;
      visited[cr][cc] = true;
      if (board[cr][cc] === null) {
        region.push([cr, cc]);
        for (const [nr, nc] of neighbors(size, cr, cc)) {
          if (board[nr][nc] === null && !visited[nr][nc]) stack.push([nr, nc]);
          else if (board[nr][nc]) colors.add(board[nr][nc]);
        }
      }
    }
    if (colors.size === 1) {
      const c2 = Array.from(colors)[0];
      s += c2 === 'W' ? region.length * 0.5 : -region.length * 0.5;
    }
  }
  return s;
}

function applyMoveToBoard(board, move, side) {
  if (move.pass) return board;
  const r = placeStone(board, move.r, move.c, side);
  return r ? r.board : board;
}

/** Pick the AI's move. level: 'beginner' | 'intermediate' | 'pro'. */
export function bestMove(board, side, level = 'intermediate', prevBoard = null) {
  const moves = generateMoves(board, side, prevBoard);
  if (moves.length === 1) return moves[0]; // only pass
  if (level === 'beginner') {
    // 30% pass when the board is mostly empty and there are many options
    const filled = board.flat().filter(x => x).length;
    if (filled < 4 && Math.random() < 0.05) return moves[0];
    const real = moves.slice(1);
    return real[Math.floor(Math.random() * real.length)];
  }
  if (level === 'intermediate') {
    // 1-ply heuristic: pick the move that maximizes heuristic after placement
    let best = moves[1], bestVal = -Infinity;
    for (const m of moves.slice(1)) {
      const nb = applyMoveToBoard(board, m, side);
      const v = heuristicScore(nb) * (side === 'W' ? 1 : -1);
      if (v > bestVal) { bestVal = v; best = m; }
    }
    return best;
  }
  // pro: 2-ply alphabeta with the same heuristic
  let best = moves[1], bestVal = -Infinity;
  for (const m of moves.slice(1)) {
    const nb = applyMoveToBoard(board, m, side);
    const v = alphabeta2(nb, 1, side === 'W' ? 'B' : 'W', -Infinity, Infinity);
    if (v > bestVal) { bestVal = v; best = m; }
  }
  return best;
}

function alphabeta2(board, depth, side, alpha, beta) {
  if (depth === 0) return heuristicScore(board);
  const moves = generateMoves(board, side);
  if (moves.length === 1) return heuristicScore(board);
  if (side === 'W') {
    let best = -Infinity;
    for (const m of moves.slice(1)) {
      const nb = applyMoveToBoard(board, m, side);
      const v = alphabeta2(nb, depth - 1, 'B', alpha, beta);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves.slice(1)) {
      const nb = applyMoveToBoard(board, m, side);
      const v = alphabeta2(nb, depth - 1, 'W', alpha, beta);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderGo(container, onClose) {
  start();

  function start(size = 9, level = 'intermediate') {
    const SIZE = size;
    const LEVEL = level;
    let board = newBoard(SIZE);
    let turn = 'B';
    let passes = 0;
    let prevBoard = null;
    let captures = { B: 0, W: 0 };
    let thinking = false;
    let over = false;
    let moveCount = 0;
    let history = []; // for undo (one step)

    function place(r, c, byAI = false) {
      if (over || thinking) return;
      const result = placeStone(board, r, c, turn, prevBoard);
      if (!result) {
        soundFx.playHit();
        return;
      }
      const opp = turn === 'B' ? 'W' : 'B';
      captures[opp] += result.captured;
      prevBoard = board;
      history.push({ board: board, turn, passes, captures: { ...captures } });
      board = result.board;
      turn = opp;
      moveCount++;
      passes = 0;
      if (byAI) soundFx.playCoin();
      else soundFx.playClick();
      render();
      if (turn === 'W') scheduleAI();
    }

    function passMove() {
      if (over || thinking) return;
      prevBoard = board;
      history.push({ board, turn, passes, captures: { ...captures } });
      turn = turn === 'B' ? 'W' : 'B';
      moveCount++;
      passes++;
      soundFx.playClick();
      if (passes >= 2) endGame();
      else {
        render();
        if (turn === 'W') scheduleAI();
      }
    }

    function undo() {
      if (history.length === 0 || over) return;
      const last = history.pop();
      board = last.board;
      turn = last.turn;
      passes = last.passes;
      captures = last.captures;
      moveCount--;
      // Re-derive prevBoard from history
      prevBoard = history.length ? history[history.length - 1].board : null;
      soundFx.playClick();
      render();
    }

    function scheduleAI() {
      thinking = true;
      render();
      // Use a small delay so the player can see their move
      setTimeout(() => {
        const m = bestMove(board, 'W', LEVEL, prevBoard);
        thinking = false;
        if (!m) { endGame(); return; }
        if (m.pass) passMove();
        else place(m.r, m.c, true);
      }, 200);
    }

    function endGame() {
      over = true;
      const score = scorePosition(board);
      const title = score.white > score.black ? 'WHITE WINS' : 'BLACK WINS';
      const margin = Math.abs(score.white - score.black);
      const msg = `Final: Black ${score.black} – White ${score.white} (komi 6.5). Margin: ${margin.toFixed(1)}.`;
      setTimeout(() => {
        showResult({
          container, title, message: msg,
          gameId: 'go', score: score.white > score.black ? 1000 : 200,
          tone: score.white > score.black ? 'win' : 'over',
          onRestart: () => start(SIZE, LEVEL), onClose
        });
      }, 400);
    }

    function render() {
      // Build the board as a single SVG-like grid with cell click handlers
      const maxPx = SIZE <= 9 ? 440 : SIZE <= 13 ? 520 : 600;
      const cellPx = Math.floor(maxPx / (SIZE - 1));
      const boardPx = cellPx * (SIZE - 1);
      const cells = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const x = c * cellPx;
          const y = r * cellPx;
          const stone = board[r][c];
          let stoneSvg = '';
          if (stone === 'B') {
            stoneSvg = `<circle cx="${x}" cy="${y}" r="${cellPx * 0.42}" fill="#0a0a0a" stroke="#f59e0b" stroke-width="1.5"/>`;
          } else if (stone === 'W') {
            stoneSvg = `<circle cx="${x}" cy="${y}" r="${cellPx * 0.42}" fill="#f4f4f5" stroke="#f59e0b" stroke-width="1.5"/>`;
          }
          cells.push(`<g data-stone="${r},${c}" style="cursor:pointer">
            <rect x="${x - cellPx / 2}" y="${y - cellPx / 2}" width="${cellPx}" height="${cellPx}" fill="transparent" />
            ${stoneSvg}
          </g>`);
        }
      }
      // Build grid lines
      const lines = [];
      for (let i = 0; i < SIZE; i++) {
        lines.push(`<line x1="0" y1="${i * cellPx}" x2="${boardPx}" y2="${i * cellPx}" stroke="#a16207" stroke-width="1" />`);
        lines.push(`<line x1="${i * cellPx}" y1="0" x2="${i * cellPx}" y2="${boardPx}" stroke="#a16207" stroke-width="1" />`);
      }
      // Star points (hoshi) for 9x9, 13x13, 19x19
      const stars = [];
      const starCoords = SIZE === 9
        ? [[2,2],[2,6],[4,4],[6,2],[6,6]]
        : SIZE === 13
        ? [[3,3],[3,9],[6,6],[9,3],[9,9]]
        : SIZE === 19
        ? [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]]
        : [];
      for (const [sr, sc] of starCoords) {
        stars.push(`<circle cx="${sc * cellPx}" cy="${sr * cellPx}" r="3" fill="#a16207" />`);
      }

      const statusText = over ? 'GAME OVER' : thinking ? 'WHITE THINKING…' : turn === 'B' ? 'YOUR MOVE (B)' : 'WHITE TO MOVE';
      const levelLabel = LEVEL === 'beginner' ? 'BEGINNER' : LEVEL === 'intermediate' ? 'INTERMEDIATE' : 'PRO';

      // Header now carries size + level selectors so the player can change them mid-game
      // (each click restarts the game with the new settings).
      const sizeBtns = [9, 11, 13, 19].map(s =>
        `<button data-size="${s}" class="px-2 py-0.5 text-[10px] border ${SIZE === s ? 'border-amber-400 text-amber-400' : 'border-amber-500/30 text-amber-500/60'}">${s}×${s}</button>`
      ).join('');
      const levelBtns = ['beginner', 'intermediate', 'pro'].map(l =>
        `<button data-level="${l}" class="px-2 py-0.5 text-[10px] border ${LEVEL === l ? 'border-amber-400 text-amber-400' : 'border-amber-500/30 text-amber-500/60'}">${l.toUpperCase()}</button>`
      ).join('');

      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
            <div>
              <h2 class="text-xl font-black text-amber-400 tracking-wider">GO</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">${SIZE}×${SIZE} · ${levelLabel} · komi 6.5</p>
              <div class="flex gap-1 mt-1">${sizeBtns}</div>
              <div class="flex gap-1 mt-1">${levelBtns}</div>
            </div>
            ${closeButton()}
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
            <span>BLACK (YOU)<br><b class="text-amber-300 text-base">${captures.W}</b></span>
            <span>MOVE ${moveCount}<br><b class="text-amber-400 text-base">${statusText}</b></span>
            <span>WHITE (CPU)<br><b class="text-zinc-100 text-base">${captures.B}</b></span>
          </div>
          <div class="flex justify-center mb-3">
            <svg viewBox="-10 -10 ${boardPx + 20} ${boardPx + 20}" width="${boardPx + 20}" height="${boardPx + 20}" style="background:#1c1917;border:1px solid #a16207">
              ${lines.join('')}
              ${stars.join('')}
              ${cells.join('')}
            </svg>
          </div>
          <div class="flex flex-wrap gap-2 justify-center mb-2">
            <button data-act="pass" class="px-3 py-2 border border-amber-500 text-amber-400 text-xs font-bold">PASS</button>
            <button data-act="undo" class="px-3 py-2 border border-amber-500/40 text-amber-500/70 text-xs font-bold">UNDO</button>
            <button data-act="resign" class="px-3 py-2 border border-red-500/40 text-red-400 text-xs font-bold">RESIGN</button>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-zinc-400 text-center">
            ${LEVEL === 'beginner'
              ? 'Beginner: white plays a random legal move. Good for learning the rules.'
              : LEVEL === 'intermediate'
                ? 'Intermediate: white evaluates each legal move on territory, stones, and liberties, then picks the best.'
                : 'Pro: white searches two moves ahead with positional evaluation. Solid mid-strength — not a tournament engine.'}
          </p>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('[data-size]').forEach(btn => {
        btn.onclick = () => start(Number(btn.dataset.size), LEVEL);
      });
      container.querySelectorAll('[data-level]').forEach(btn => {
        btn.onclick = () => start(SIZE, btn.dataset.level);
      });
      container.querySelectorAll('[data-stone]').forEach(g => {
        g.onclick = () => {
          const [r, c] = g.dataset.stone.split(',').map(Number);
          place(r, c);
        };
      });
      container.querySelector('[data-act="pass"]').onclick = passMove;
      container.querySelector('[data-act="undo"]').onclick = undo;
      container.querySelector('[data-act="resign"]').onclick = () => {
        if (over) return;
        over = true;
        showResult({
          container, title: 'BLACK RESIGNS', message: 'You conceded the game.',
          gameId: 'go', score: 0, tone: 'over',
          onRestart: () => start(SIZE, LEVEL), onClose
        });
      };
    }

    render();
  }
}
