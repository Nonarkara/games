/**
 * NGS Logic Suite · Chess — full rules + alphabeta AI.
 *
 * Board: 8×8 array. null = empty. White uppercase ('K','Q','R','B','N','P'),
 * black lowercase ('k','q','r','b','n','p'). a1 is bottom-left from white's view.
 *
 * Pure helpers (no DOM) are exported for testing:
 *   - initialBoard()
 *   - generateMoves(board, side, opts?)
 *   - makeMove(board, move) → newBoard
 *   - inCheck(board, side)
 *   - gameStatus(board, side)  → 'playing' | 'checkmate' | 'stalemate'
 *   - evaluate(board)
 *   - bestMove(board, side, depth)
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-2xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/* Piece values — the standard textbook numbers. */
const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/* Simple piece-square tables for the positional bonus. From white's view,
 * rank 0 = white's back rank, rank 7 = black's back rank. We mirror for black. */
const PST_PAWN = [
  0,  0,  0,  0,  0,  0,  0,  0,
 50, 50, 50, 50, 50, 50, 50, 50,
 10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];
const PST_KNIGHT = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50
];
const PST_BISHOP = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20
];
const PST_ROOK = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];
const PST_QUEEN = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20
];
const PST_KING_MID = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];
const PST = { p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN, k: PST_KING_MID };

export function initialBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = back[c];
    b[1][c] = 'p';
    b[6][c] = 'P';
    b[7][c] = back[c].toUpperCase();
  }
  return b;
}

const isWhite = p => p && p === p.toUpperCase();
const isBlack = p => p && p === p.toLowerCase();
const isOwn = (p, side) => side === 'w' ? isWhite(p) : isBlack(p);
const pieceType = p => p && p.toLowerCase();

/** Algebraic helpers. */
export function sqName(r, c) { return FILES[c] + (8 - r); }
export function parseSq(s) {
  if (!s || s.length < 2) return null;
  const c = FILES.indexOf(s[0].toLowerCase());
  const r = 8 - parseInt(s[1], 10);
  if (c < 0 || r < 0 || r > 7) return null;
  return [r, c];
}

/** Pseudo-legal moves (ignoring king-in-check). Caller is responsible for legality. */
function pseudoMoves(board, r, c, opts = {}) {
  const piece = board[r][c];
  if (!piece) return [];
  const side = isWhite(piece) ? 'w' : 'b';
  const moves = [];
  const opp = side === 'w' ? isBlack : isWhite;
  const t = pieceType(piece);
  const inBounds = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;

  const push = (rr, cc, opts2 = {}) => {
    if (!inBounds(rr, cc)) return false;
    const target = board[rr][cc];
    if (target && !opp(target)) return false;
    moves.push({ from: [r, c], to: [rr, cc], capture: !!target, ...opts2 });
    return !target; // can keep sliding if empty
  };

  if (t === 'p') {
    const dir = side === 'w' ? -1 : 1;
    const startRow = side === 'w' ? 6 : 1;
    const promoRow = side === 'w' ? 0 : 7;
    // single step
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      const opts3 = (r + dir === promoRow) ? { promotion: 'q' } : {};
      moves.push({ from: [r, c], to: [r + dir, c], capture: false, ...opts3 });
      // double step
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push({ from: [r, c], to: [r + 2 * dir, c], capture: false, doubleStep: true });
      }
    }
    // captures
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (target && opp(target)) {
        const opts3 = (nr === promoRow) ? { promotion: 'q' } : {};
        moves.push({ from: [r, c], to: [nr, nc], capture: true, ...opts3 });
      }
    }
    // en passant — destination is the en passant target itself
    if (opts.enPassantTarget) {
      const [er, ec] = opts.enPassantTarget;
      if (er === r + dir && Math.abs(ec - c) === 1) {
        moves.push({ from: [r, c], to: [er, ec], capture: true, enPassant: true });
      }
    }
  } else if (t === 'n') {
    const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of deltas) push(r + dr, c + dc);
  } else if (t === 'b' || t === 'r' || t === 'q') {
    const dirs = [];
    if (t === 'b' || t === 'q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (t === 'r' || t === 'q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ from: [r, c], to: [nr, nc], capture: false });
        } else {
          if (opp(target)) moves.push({ from: [r, c], to: [nr, nc], capture: true });
          break;
        }
        nr += dr; nc += dc;
      }
    }
  } else if (t === 'k') {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      push(r + dr, c + dc);
    }
    // Castling: only if no castling rights stripped and no check / no through-check / no dest-attack
    if (opts.castling && !inCheck(board, side)) {
      const rights = opts.castling[side];
      const back = side === 'w' ? 7 : 0;
      if (r === back && c === 4) {
        // kingside
        if (rights.kingside && !board[back][5] && !board[back][6]
            && !squareAttacked(board, back, 5, side === 'w' ? 'b' : 'w')
            && !squareAttacked(board, back, 6, side === 'w' ? 'b' : 'w')) {
          moves.push({ from: [r, c], to: [back, 6], capture: false, castle: 'k' });
        }
        // queenside
        if (rights.queenside && !board[back][1] && !board[back][2] && !board[back][3]
            && !squareAttacked(board, back, 3, side === 'w' ? 'b' : 'w')
            && !squareAttacked(board, back, 2, side === 'w' ? 'b' : 'w')) {
          moves.push({ from: [r, c], to: [back, 2], capture: false, castle: 'q' });
        }
      }
    }
  }
  return moves;
}

/** Is square (r,c) attacked by `bySide`? bySide = 'w' or 'b'. */
function squareAttacked(board, r, c, bySide) {
  const opp = bySide === 'w' ? isWhite : isBlack;
  // Pawns
  const dir = bySide === 'w' ? 1 : -1; // pawn attacks from bySide's POV going toward opponent
  // If bySide is white, white pawn at (r+1, c-1) attacks (r, c); etc.
  for (const dc of [-1, 1]) {
    const pr = r - dir, pc = c - dc;
    if (pr >= 0 && pr < 8 && pc >= 0 && pc < 8) {
      const p = board[pr][pc];
      if (p && opp(p) && pieceType(p) === 'p') return true;
    }
  }
  // Knights
  const knightDeltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightDeltas) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    const p = board[nr][nc];
    if (p && opp(p) && pieceType(p) === 'n') return true;
  }
  // Sliding
  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const p = board[nr][nc];
        if (p) {
          if (opp(p)) {
            const t = pieceType(p);
            if (t === 'q') return true;
            if (t === 'r' && (dr === 0 || dc === 0)) return true;
            if (t === 'b' && dr !== 0 && dc !== 0) return true;
          }
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return false;
  };
  if (slide([[-1,-1],[-1,1],[1,-1],[1,1]])) return true;
  if (slide([[-1,0],[1,0],[0,-1],[0,1]])) return true;
  // King
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    const p = board[nr][nc];
    if (p && opp(p) && pieceType(p) === 'k') return true;
  }
  return false;
}

/** Return all legal moves for `side`. `opts` carries castling, en passant, and check flags. */
export function generateMoves(board, side, opts = {}) {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    if (side === 'w' ? !isWhite(p) : !isBlack(p)) continue;
    const moves = pseudoMoves(board, r, c, { ...opts, inCheck: inCheck(board, side) });
    for (const m of moves) {
      const nb = makeMove(board, m);
      if (!inCheck(nb, side)) out.push(m);
    }
  }
  return out;
}

/** Apply a move to a copy of the board. Does not validate legality. */
export function makeMove(board, move) {
  const nb = board.map(row => row.slice());
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = nb[fr][fc];
  nb[fr][fc] = null;
  if (move.enPassant) {
    // The captured pawn sits on the destination square and is overwritten
    // when we write the capturing piece below. No separate clear needed.
  }
  if (move.castle) {
    const back = isWhite(piece) ? 7 : 0;
    if (move.castle === 'k') { nb[back][5] = nb[back][7]; nb[back][7] = null; }
    else { nb[back][3] = nb[back][0]; nb[back][0] = null; }
  }
  if (move.promotion) {
    const promoteTo = isWhite(piece) ? move.promotion.toUpperCase() : move.promotion;
    nb[tr][tc] = promoteTo;
  } else {
    nb[tr][tc] = piece;
  }
  return nb;
}

/** Is the king of `side` currently in check? */
export function inCheck(board, side) {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    if (side === 'w' ? isWhite(p) : isBlack(p)) {
      if (pieceType(p) === 'k') { kr = r; kc = c; }
    }
  }
  if (kr < 0) return false; // king not found (shouldn't happen in legal play)
  return squareAttacked(board, kr, kc, side === 'w' ? 'b' : 'w');
}

/** 'playing' | 'checkmate' | 'stalemate' for `side` to move. */
export function gameStatus(board, side, opts = {}) {
  const moves = generateMoves(board, side, opts);
  if (moves.length) return 'playing';
  return inCheck(board, side) ? 'checkmate' : 'stalemate';
}

/** Material + positional evaluation. White-positive, black-negative. */
export function evaluate(board) {
  let s = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = board[r][c];
    if (!p) continue;
    const t = pieceType(p);
    const v = VALUES[t] || 0;
    if (isWhite(p)) {
      s += v + (PST[t] ? PST[t][r * 8 + c] : 0);
    } else {
      s -= v + (PST[t] ? PST[t][(7 - r) * 8 + c] : 0);
    }
  }
  return s;
}

function orderMoves(moves) {
  // captures first (MVV-LVA: victim value minus attacker value), then quiet
  return moves.slice().sort((a, b) => {
    const av = a.capture ? (VALUES[pieceType(boardAt(a.to))] || 0) - (VALUES[pieceType(boardAt(a.from))] || 0) / 10 : -1;
    const bv = b.capture ? (VALUES[pieceType(boardAt(b.to))] || 0) - (VALUES[pieceType(boardAt(b.from))] || 0) / 10 : -1;
    return bv - av;
  });
}
// Lightweight indirection so orderMoves can read board state via closures.
let _searchBoard = null;
function boardAt(sq) { return _searchBoard[sq[0]][sq[1]]; }

function alphabeta(board, depth, alpha, beta, maximizing) {
  const side = maximizing ? 'w' : 'b';
  const status = gameStatus(board, side);
  if (status === 'checkmate') return maximizing ? -99999 - depth : 99999 + depth;
  if (status === 'stalemate') return 0;
  if (depth === 0) return evaluate(board);
  _searchBoard = board;
  const moves = orderMoves(generateMoves(board, side));
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m);
      const v = alphabeta(nb, depth - 1, alpha, beta, false);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m);
      const v = alphabeta(nb, depth - 1, alpha, beta, true);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/** Pick the AI's best move for `side` at given depth. Returns a move object. */
export function bestMove(board, side, depth = 3) {
  _searchBoard = board;
  const moves = orderMoves(generateMoves(board, side));
  if (!moves.length) return null;
  let best = null;
  if (side === 'w') {
    let bestVal = -Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m);
      const v = alphabeta(nb, depth - 1, -Infinity, Infinity, false);
      if (v > bestVal || (v === bestVal && Math.random() < 0.3)) { bestVal = v; best = m; }
    }
  } else {
    let bestVal = Infinity;
    for (const m of moves) {
      const nb = makeMove(board, m);
      const v = alphabeta(nb, depth - 1, -Infinity, Infinity, true);
      if (v < bestVal || (v === bestVal && Math.random() < 0.3)) { bestVal = v; best = m; }
    }
  }
  return best;
}

const GLYPHS = { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙', k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderChess(container, onClose) {
  start();

  function start() {
    const DEPTH = 3;
    const WHITE = 'w', BLACK = 'b';
    let board = initialBoard();
    let turn = WHITE;
    let selected = null;       // [r, c]
    let legalForSel = [];      // legal moves for selected
    let status = 'playing';    // 'playing' | 'checkmate-w' | 'checkmate-b' | 'stalemate'
    let history = [];          // move log
    let thinking = false;
    let castling = { w: { kingside: true, queenside: true }, b: { kingside: true, queenside: true } };
    let enPassant = null;      // [r, c] of the square behind a double-step
    let capturesW = 0, capturesB = 0;

    function opts() {
      return { castling, enPassantTarget: enPassant, inCheck: inCheck(board, turn) };
    }

    function legalMovesFrom(r, c) {
      const all = generateMoves(board, turn, opts());
      return all.filter(m => m.from[0] === r && m.from[1] === c);
    }

    function applyMove(m, byAI = false) {
      const capture = !!board[m.to[0]][m.to[1]] || m.enPassant;
      if (capture) {
        if (turn === WHITE) capturesW++; else capturesB++;
      }
      // Update castling rights if king or rook moves (or rook captured)
      const piece = board[m.from[0]][m.from[1]];
      if (pieceType(piece) === 'k') castling[turn] = { kingside: false, queenside: false };
      if (pieceType(piece) === 'r') {
        const back = turn === WHITE ? 7 : 0;
        if (m.from[0] === back) {
          if (m.from[1] === 0) castling[turn].queenside = false;
          if (m.from[1] === 7) castling[turn].kingside = false;
        }
      }
      // Rook captured on its start square strips opponent's rights
      if (m.capture && !m.enPassant) {
        const opp = turn === WHITE ? BLACK : WHITE;
        const back = opp === WHITE ? 7 : 0;
        if (m.to[0] === back) {
          if (m.to[1] === 0) castling[opp].queenside = false;
          if (m.to[1] === 7) castling[opp].kingside = false;
        }
      }
      // En passant target
      if (m.doubleStep) enPassant = [(m.from[0] + m.to[0]) / 2, m.from[1]];
      else enPassant = null;
      // Apply
      board = makeMove(board, m);
      history.push(m);
      // Next turn
      turn = turn === WHITE ? BLACK : WHITE;
      const st = gameStatus(board, turn, opts());
      if (st === 'checkmate') status = turn === WHITE ? 'checkmate-w' : 'checkmate-b';
      else if (st === 'stalemate') status = 'stalemate';
      else status = 'playing';
      if (capture) soundFx.playHit();
      else soundFx.playClick();
      if (byAI) soundFx.playCoin();
    }

    function onSquare(r, c) {
      if (thinking || status !== 'playing' || turn !== WHITE) return;
      const piece = board[r][c];
      if (selected) {
        const m = legalForSel.find(x => x.to[0] === r && x.to[1] === c);
        if (m) {
          selected = null;
          legalForSel = [];
          applyMove(m);
          render();
          if (status === 'playing') scheduleAI();
          else endGame();
          return;
        }
        // clicked elsewhere — deselect or reselect own piece
        if (piece && isWhite(piece)) {
          selected = [r, c];
          legalForSel = legalMovesFrom(r, c);
          render();
        } else {
          selected = null;
          legalForSel = [];
          render();
        }
      } else {
        if (piece && isWhite(piece)) {
          selected = [r, c];
          legalForSel = legalMovesFrom(r, c);
          render();
        }
      }
    }

    function scheduleAI() {
      thinking = true;
      render();
      setTimeout(() => {
        const m = bestMove(board, BLACK, DEPTH);
        thinking = false;
        if (!m) { endGame(); return; }
        applyMove(m, true);
        render();
        if (status !== 'playing') endGame();
      }, 250);
    }

    function endGame() {
      const playerWon = status === 'checkmate-b';
      const drew = status === 'stalemate';
      const title = drew ? 'DRAW' : playerWon ? 'CHECKMATE — YOU WIN' : 'CHECKMATE — CPU WINS';
      const msg = drew
        ? 'No legal moves remain. Stalemate — count it as a draw.'
        : playerWon
          ? `You delivered mate in ${history.length} moves. The board held.`
          : `The CPU found mate in ${history.length} moves. Replay, swap sides, or change the opening.`;
      setTimeout(() => {
        showResult({
          container, title, message: msg,
          gameId: 'chess', score: playerWon ? 1000 : drew ? 400 : 100,
          tone: playerWon ? 'win' : drew ? 'over' : 'over',
          onRestart: () => start(), onClose
        });
      }, 350);
    }

    function render() {
      const legalSet = new Set(legalForSel.map(m => `${m.to[0]},${m.to[1]}`));
      const selKey = selected ? `${selected[0]},${selected[1]}` : null;
      const checkSq = (() => {
        if (status === 'playing' && inCheck(board, turn)) {
          for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && pieceType(p) === 'k' && (turn === WHITE ? isWhite(p) : isBlack(p))) return [r, c];
          }
        }
        return null;
      })();
      const inCheckKey = checkSq ? `${checkSq[0]},${checkSq[1]}` : null;
      const moveCount = Math.ceil(history.length / 2);

      const rows = [];
      for (let r = 0; r < 8; r++) {
        const cells = [];
        for (let c = 0; c < 8; c++) {
          const dark = (r + c) % 2 === 1;
          const key = `${r},${c}`;
          const isSel = key === selKey;
          const isLegal = legalSet.has(key);
          const isCheck = key === inCheckKey;
          const bgDark = dark ? 'bg-amber-950/40' : 'bg-zinc-900/40';
          const ring = isSel ? 'ring-2 ring-amber-400' : isLegal ? 'ring-1 ring-green-400/70' : isCheck ? 'ring-2 ring-red-500' : '';
          const piece = board[r][c];
          const glyph = piece ? GLYPHS[piece] : '';
          const pieceColor = piece ? (isWhite(piece) ? 'text-amber-200' : 'text-zinc-300') : 'text-zinc-700';
          cells.push(`
            <button data-sq="${r},${c}" aria-label="${sqName(r, c)}${piece ? ' ' + pieceType(piece) : ' empty'}"
              class="${bgDark} ${ring} aspect-square flex items-center justify-center text-3xl sm:text-4xl select-none ${pieceColor}">
              ${isLegal && !piece ? `<span class="text-green-400/50 text-xs">●</span>` : ''}
              ${glyph}
            </button>`);
        }
        rows.push(`<div class="grid grid-cols-8 gap-0">${cells.join('')}</div>`);
      }
      const labelsTop = FILES.map(f => `<div class="text-center text-[10px] text-amber-500/70">${f}</div>`).join('');
      const labelsSide = Array.from({ length: 8 }, (_, r) => `<div class="text-[10px] text-amber-500/70 flex items-center justify-center">${8 - r}</div>`).join('');

      const statusText = thinking
        ? 'CPU THINKING…'
        : status === 'checkmate-w' ? 'WHITE MATED'
        : status === 'checkmate-b' ? 'BLACK MATED'
        : status === 'stalemate' ? 'STALEMATE'
        : turn === WHITE ? 'YOUR MOVE' : 'BLACK TO MOVE';

      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
            <div>
              <h2 class="text-xl font-black text-amber-400 tracking-wider">CHESS</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Full rules · alphabeta depth ${DEPTH}</p>
            </div>
            ${closeButton()}
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
            <span>YOU (W)<br><b class="text-amber-300 text-base">${capturesB}</b></span>
            <span>MOVE ${moveCount}<br><b class="text-amber-400 text-base">${statusText}</b></span>
            <span>CPU (B)<br><b class="text-zinc-300 text-base">${capturesW}</b></span>
          </div>
          <div class="px-3 sm:px-6">
            <div class="grid grid-cols-8 gap-0 mb-0">${labelsTop}</div>
            <div class="grid grid-cols-[20px_1fr] gap-0">
              <div class="flex flex-col">${labelsSide}</div>
              <div>${rows.join('')}</div>
            </div>
            <div class="grid grid-cols-8 gap-0 mt-0">${labelsTop}</div>
          </div>
          <p class="mt-3 text-[11px] leading-relaxed text-zinc-400 text-center">
            Tap a white piece to see its moves (green dots), then tap a destination. The CPU searches ${DEPTH} plies with piece-square tables — solid mid-strength play.
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
