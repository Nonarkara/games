/**
 * NGS Logic Suite · Checkers — American 8×8 rules with mandatory captures,
 * kinging on the last row, multi-jumps, and an alphabeta AI.
 *
 * Board: 8×8 array. Only dark squares are used. Light squares stay null forever.
 * Pieces: lowercase 'r'/'b' (red/black men), uppercase 'R'/'B' (kings).
 * Red moves first (rows 5–7), black moves second (rows 0–2).
 *
 * Pure helpers (no DOM) for testing:
 *   - initialBoard()
 *   - generateMoves(board, side)
 *   - applyMove(board, move) → newBoard
 *   - gameStatus(board, side) → 'playing' | 'red-wins' | 'black-wins' | 'draw'
 *   - evaluate(board)
 *   - bestMove(board, side, depth)
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-2xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

const SIZE = 8;

/* Square (r, c) is playable iff (r + c) is odd — the dark squares. */
const isDark = (r, c) => (r + c) % 2 === 1;

/** Initial setup. Red on rows 5–7, black on rows 0–2. */
export function initialBoard() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < SIZE; c++)
      if (isDark(r, c)) b[r][c] = 'b';
  for (let r = 5; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (isDark(r, c)) b[r][c] = 'r';
  return b;
}

const isRed = p => p === 'r' || p === 'R';
const isBlack = p => p === 'b' || p === 'B';
const isKing = p => p === 'R' || p === 'B';
const isOwn = (p, side) => side === 'r' ? isRed(p) : isBlack(p);

/** All legal moves for `side` from a position. Captures are mandatory. */
export function generateMoves(board, side) {
  const captures = [];
  const slides = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c];
    if (!p || !isOwn(p, side)) continue;
    const dirs = kingDirs(p, side);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      const target = board[nr][nc];
      if (target && !isOwn(target, side)) {
        // capture
        const lr = nr + dr, lc = nc + dc;
        if (lr < 0 || lr >= SIZE || lc < 0 || lc >= SIZE) continue;
        if (board[lr][lc]) continue;
        captures.push({ from: [r, c], to: [lr, lc], capture: [nr, nc], path: [[r, c], [lr, lc]] });
      } else if (!target) {
        slides.push({ from: [r, c], to: [nr, nc], path: [[r, c], [nr, nc]] });
      }
    }
  }
  // If any capture exists anywhere, only captures are legal (mandatory)
  // AND must be the MAXIMUM capture length on the board (longest-jump rule)
  if (captures.length) {
    const maxLen = Math.max(...captures.map(m => m.path.length));
    // We need multi-jumps; generate them recursively.
    return expandCaptures(board, side);
  }
  return slides;
}

function kingDirs(p, side) {
  if (isKing(p)) return [[-1,-1],[-1,1],[1,-1],[1,1]];
  return side === 'r' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
}

/** Expand single capture moves into full multi-jump sequences, picking only the longest. */
function expandCaptures(board, side) {
  const allComplete = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c];
    if (!p || !isOwn(p, side)) continue;
    extendJumps(board, side, r, c, p, [[r, c]], [], allComplete);
  }
  if (!allComplete.length) return [];
  // Longest-jump rule: keep only the moves with the maximum path length.
  // BUT in American checkers the rule is: a player MUST take the maximum number
  // of pieces in a single turn. So we keep only the longest paths.
  const maxLen = Math.max(...allComplete.map(m => m.path.length));
  return allComplete.filter(m => m.path.length === maxLen);
}

function extendJumps(board, side, r, c, piece, path, captures, out) {
  let any = false;
  const dirs = kingDirs(piece, side);
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
    const target = board[nr][nc];
    if (!target || isOwn(target, side)) continue;
    const lr = nr + dr, lc = nc + dc;
    if (lr < 0 || lr >= SIZE || lc < 0 || lc >= SIZE) continue;
    if (board[lr][lc]) continue;
    if (captures.some(([cr, cc]) => cr === nr && cc === nc)) continue; // can't recapture same piece
    any = true;
    // Apply this jump on a board copy
    const nb = board.map(row => row.slice());
    nb[r][c] = null;
    nb[nr][nc] = null;
    // Kinging on the last row of the destination
    let landing = piece;
    if (!isKing(piece)) {
      if (side === 'r' && lr === 0) landing = 'R';
      if (side === 'b' && lr === SIZE - 1) landing = 'B';
    }
    nb[lr][lc] = landing;
    extendJumps(nb, side, lr, lc, landing, [...path, [lr, lc]], [...captures, [nr, nc]], out);
  }
  if (!any) {
    out.push({ from: path[0], to: path[path.length - 1], path, captures });
  }
}

/** Apply a move. Promotes men to kings when they reach the back rank. */
export function applyMove(board, move) {
  const nb = board.map(row => row.slice());
  const [sr, sc] = move.from;
  const piece = nb[sr][sc];
  nb[sr][sc] = null;
  // Walk the path, removing captured pieces; the landing piece may be a king if it reached the back row
  let cur = piece;
  let lr = -1, lc = -1;
  for (let i = 1; i < move.path.length; i++) {
    const [pr, pc] = move.path[i - 1];
    const [tr, tc] = move.path[i];
    // Capture the piece that lies on the diagonal between pr,pc and tr,tc
    const dr = Math.sign(tr - pr), dc = Math.sign(tc - pc);
    const cr = pr + dr, cc = pc + dc;
    if (cr !== tr || cc !== tc) nb[cr][cc] = null;
    // Kinging check
    if (!isKing(cur)) {
      if (isRed(cur) && tr === 0) cur = 'R';
      if (isBlack(cur) && tr === SIZE - 1) cur = 'B';
    }
    lr = tr; lc = tc;
  }
  nb[lr][lc] = cur;
  return nb;
}

/** 'playing' | 'red-wins' | 'black-wins' | 'draw' for `side` to move. */
export function gameStatus(board, side) {
  // If the side to move has no pieces or no legal moves, they lose.
  const opp = side === 'r' ? 'b' : 'r';
  let ownCount = 0, oppCount = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c];
    if (!p) continue;
    if (isOwn(p, side)) ownCount++;
    else if (isOwn(p, opp)) oppCount++;
  }
  if (ownCount === 0) return side === 'r' ? 'black-wins' : 'red-wins';
  if (oppCount === 0) return side === 'r' ? 'red-wins' : 'black-wins';
  const moves = generateMoves(board, side);
  if (!moves.length) return side === 'r' ? 'black-wins' : 'red-wins';
  return 'playing';
}

/** Red-favored score. Kings worth 3x a man. Back-row presence adds a small bonus. */
export function evaluate(board) {
  let s = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const p = board[r][c];
    if (!p) continue;
    const v = isKing(p) ? 3 : 1;
    // advancement bonus: red going up, black going down
    if (isRed(p)) s += v + (SIZE - 1 - r) * 0.05;
    else s -= v + r * 0.05;
  }
  return s;
}

let _boardRef = null;
function orderMoves(moves) {
  return moves.slice().sort((a, b) => {
    const av = a.capture ? (a.path.length - 1) : 0;
    const bv = b.capture ? (b.path.length - 1) : 0;
    return bv - av;
  });
}

function alphabeta(board, depth, alpha, beta, maximizing) {
  const side = maximizing ? 'r' : 'b';
  const status = gameStatus(board, side);
  if (status === 'red-wins') return maximizing ? 99999 + depth : -99999 - depth;
  if (status === 'black-wins') return maximizing ? -99999 - depth : 99999 + depth;
  if (depth === 0) return evaluate(board);
  _boardRef = board;
  const moves = orderMoves(generateMoves(board, side));
  if (!moves.length) return maximizing ? -99999 - depth : 99999 + depth;
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const v = alphabeta(nb, depth - 1, alpha, beta, false);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      const v = alphabeta(nb, depth - 1, alpha, beta, true);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function bestMove(board, side, depth = 6) {
  _boardRef = board;
  const moves = orderMoves(generateMoves(board, side));
  if (!moves.length) return null;
  let best = moves[0], bestVal = side === 'r' ? -Infinity : Infinity;
  for (const m of moves) {
    const nb = applyMove(board, m);
    const v = alphabeta(nb, depth - 1, -Infinity, Infinity, side === 'b');
    if (side === 'r' ? v > bestVal : v < bestVal) { bestVal = v; best = m; }
  }
  return best;
}

const PIECE_GLYPH = {
  r: { glyph: '●', color: 'text-red-400' },
  b: { glyph: '●', color: 'text-zinc-300' },
  R: { glyph: '◉', color: 'text-red-300' },
  B: { glyph: '◉', color: 'text-zinc-100' }
};

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderCheckers(container, onClose) {
  start();

  function start() {
    const DEPTH = 6;
    const HUMAN = 'r', CPU = 'b';
    let board = initialBoard();
    let turn = HUMAN;
    let selected = null;
    let legalForSel = [];
    let status = 'playing';
    let thinking = false;
    let capturesR = 0, capturesB = 0;
    let moveCount = 0;

    function legalFrom(r, c) {
      return generateMoves(board, turn).filter(m => m.from[0] === r && m.from[1] === c);
    }

    function doMove(m, byAI = false) {
      const capCount = m.captures ? m.captures.length : (m.capture ? 1 : 0);
      if (turn === HUMAN) capturesR += capCount; else capturesB += capCount;
      board = applyMove(board, m);
      moveCount++;
      turn = turn === HUMAN ? CPU : HUMAN;
      const st = gameStatus(board, turn);
      if (st === 'playing') status = 'playing';
      else if (st === 'red-wins') status = 'red-wins';
      else if (st === 'black-wins') status = 'black-wins';
      else status = 'draw';
      if (capCount) soundFx.playHit();
      else soundFx.playClick();
      if (byAI) soundFx.playCoin();
    }

    function onSquare(r, c) {
      if (thinking || status !== 'playing' || turn !== HUMAN) return;
      const piece = board[r][c];
      if (selected) {
        const m = legalForSel.find(x => x.to[0] === r && x.to[1] === c);
        if (m) {
          selected = null;
          legalForSel = [];
          doMove(m);
          render();
          if (status === 'playing') scheduleAI();
          else endGame();
          return;
        }
        if (piece && isOwn(piece, HUMAN)) {
          selected = [r, c];
          legalForSel = legalFrom(r, c);
          render();
        } else {
          selected = null;
          legalForSel = [];
          render();
        }
      } else {
        if (piece && isOwn(piece, HUMAN)) {
          selected = [r, c];
          legalForSel = legalFrom(r, c);
          render();
        }
      }
    }

    function scheduleAI() {
      thinking = true;
      render();
      setTimeout(() => {
        const m = bestMove(board, CPU, DEPTH);
        thinking = false;
        if (!m) { endGame(); return; }
        doMove(m, true);
        render();
        if (status !== 'playing') endGame();
      }, 300);
    }

    function endGame() {
      const playerWon = status === 'red-wins';
      const title = playerWon ? 'CROWNED' : status === 'black-wins' ? 'STRIPPED' : 'NO MOVES';
      const msg = playerWon
        ? `Red took the black king's last defender in ${moveCount} moves.`
        : status === 'black-wins' ? `Black strangled the red army in ${moveCount} moves.`
        : 'Stalemate — the board is locked.';
      setTimeout(() => {
        showResult({
          container, title, message: msg,
          gameId: 'checkers', score: playerWon ? 1000 : 200,
          tone: playerWon ? 'win' : 'over',
          onRestart: () => start(), onClose
        });
      }, 350);
    }

    function render() {
      const legalSet = new Set(legalForSel.map(m => `${m.to[0]},${m.to[1]}`));
      const selKey = selected ? `${selected[0]},${selected[1]}` : null;
      const cells = [];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const dark = isDark(r, c);
          const light = !dark;
          const key = `${r},${c}`;
          const isSel = key === selKey;
          const isLegal = legalSet.has(key);
          const piece = board[r][c];
          const glyph = piece ? PIECE_GLYPH[piece] : null;
          const bg = light ? 'bg-zinc-900/30' : 'bg-amber-950/40';
          if (light) {
            cells.push(`<div class="${bg} aspect-square"></div>`);
            continue;
          }
          const ring = isSel ? 'ring-2 ring-amber-400' : isLegal ? 'ring-1 ring-green-400/70' : '';
          const pieceColor = glyph ? glyph.color : '';
          const pieceText = glyph ? glyph.glyph : '';
          cells.push(`
            <button data-sq="${r},${c}" aria-label="square ${r},${c}${piece ? ' ' + (isKing(piece) ? 'king' : 'man') : ''}"
              class="${bg} ${ring} aspect-square flex items-center justify-center text-3xl sm:text-4xl select-none ${pieceColor}">
              ${isLegal && !piece ? `<span class="text-green-400/50 text-xs">●</span>` : ''}
              ${pieceText}
            </button>`);
        }
      }
      const statusText = thinking ? 'CPU THINKING…' : turn === HUMAN ? 'YOUR MOVE' : 'BLACK TO MOVE';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
            <div>
              <h2 class="text-xl font-black text-amber-400 tracking-wider">CHECKERS</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">American 8×8 · mandatory captures · alphabeta depth ${DEPTH}</p>
            </div>
            ${closeButton()}
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
            <span>YOU (R)<br><b class="text-red-300 text-base">${capturesB}</b></span>
            <span>MOVE ${moveCount}<br><b class="text-amber-400 text-base">${statusText}</b></span>
            <span>CPU (B)<br><b class="text-zinc-300 text-base">${capturesR}</b></span>
          </div>
          <div class="px-6">
            <div class="grid grid-cols-8 gap-0 mx-auto" style="max-width:520px">${cells.join('')}</div>
          </div>
          <p class="mt-3 text-[11px] leading-relaxed text-zinc-400 text-center">
            Men move forward only. Kings move both ways. Captures are <b>mandatory</b>, and you must take the maximum number of pieces in one turn. Reach the back row to be kinged.
          </p>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('button[data-sq]').forEach(btn => {
        btn.onclick = () => {
          const [r, c] = btn.dataset.sq.split(',').map(Number);
          onSquare(r, c);
        };
      });
    }

    render();
  }
}
