/**
 * NGS Logic Suite · Tic-Tac-Toe — the most basic strategy game.
 * Pure helpers are exported so the rules can be tested without a browser.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

/** @returns {'X'|'O'|'draw'|null} winner, or null if game ongoing */
export function checkWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? 'draw' : null;
}

/** If the given player can win in one move, return the cell index. */
export function findWinningMove(board, player) {
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const test = [...board];
    test[i] = player;
    if (checkWinner(test) === player) return i;
  }
  return null;
}

/**
 * Minimax: returns the optimal move for `player` (assumes opponent plays optimally).
 * Player is 'X' (human), 'O' is the AI.
 */
export function minimaxMove(board, aiPlayer = 'O') {
  const human = aiPlayer === 'O' ? 'X' : 'O';
  let bestScore = -Infinity;
  let bestMove = null;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    const test = [...board];
    test[i] = aiPlayer;
    const score = minimax(test, 0, false, aiPlayer, human);
    if (score > bestScore || (score === bestScore && Math.random() < 0.3)) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax(board, depth, isMaximizing, aiPlayer, humanPlayer) {
  const result = checkWinner(board);
  if (result === aiPlayer) return 10 - depth;
  if (result === humanPlayer) return depth - 10;
  if (result === 'draw') return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = aiPlayer;
      best = Math.max(best, minimax(board, depth + 1, false, aiPlayer, humanPlayer));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i]) continue;
      board[i] = humanPlayer;
      best = Math.min(best, minimax(board, depth + 1, true, aiPlayer, humanPlayer));
      board[i] = null;
    }
    return best;
  }
}

/** Easy mode: block if human threatens, win if possible, otherwise random. */
export function easyMove(board, aiPlayer = 'O') {
  const human = aiPlayer === 'O' ? 'X' : 'O';
  const win = findWinningMove(board, aiPlayer);
  if (win !== null) return win;
  const block = findWinningMove(board, human);
  if (block !== null) return block;
  const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}

export function renderTicTacToe(container, onClose) {
  let board = Array(9).fill(null);
  let playerWins = 0, cpuWins = 0, draws = 0;
  let hardMode = false;
  let locked = false;

  function reset() { board = Array(9).fill(null); locked = false; draw(); }

  function draw() {
    const winner = checkWinner(board);
    const winningLine = winner && winner !== 'draw' ? LINES.find(([a, b, c]) => board[a] === winner && board[b] === winner && board[c] === winner) : null;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">TIC-TAC-TOE</h2><p class="text-[10px] text-amber-500/80 uppercase">PLACE THREE IN A ROW</p></div>
          ${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold text-center">
          <span>YOU (X)<br><b class="text-green-400">${playerWins}</b></span>
          <span>DRAWS<br><b class="text-zinc-400">${draws}</b></span>
          <span>CPU (O)<br><b class="text-red-400">${cpuWins}</b></span>
        </div>
        <div class="grid grid-cols-3 gap-2 max-w-[300px] mx-auto">
          ${board.map((cell, i) => {
            const isWinning = winningLine && winningLine.includes(i);
            return `<button data-cell="${i}" class="aspect-square min-h-[80px] border-2 ${isWinning ? 'border-green-400 bg-green-400/20' : 'border-amber-500/60 bg-zinc-950'} text-4xl font-black flex items-center justify-center ${cell === 'X' ? 'text-green-400' : cell === 'O' ? 'text-red-400' : 'text-zinc-700'}" ${cell || locked ? 'disabled' : ''} aria-label="Cell ${i + 1}, ${cell || 'empty'}">${cell || ''}</button>`;
          }).join('')}
        </div>
        <p class="mt-4 text-[11px] leading-relaxed text-zinc-400 text-center">
          ${winner === 'X' ? 'You won! Starting next round…' : winner === 'O' ? 'CPU wins. Starting next round…' : winner === 'draw' ? 'Draw. Starting next round…' : locked ? 'CPU is thinking…' : 'Tap an empty cell to place X.'}
        </p>
        <div class="flex items-center justify-center gap-3 mt-3">
          <span class="text-[10px] text-zinc-500 uppercase">Mode</span>
          <button id="ttt-mode" class="px-3 py-1 border border-amber-500 text-amber-400 text-xs">${hardMode ? 'HARD (UNBEATABLE)' : 'EASY'}</button>
        </div>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelector('#ttt-mode').onclick = () => {
      hardMode = !hardMode;
      playerWins = 0; cpuWins = 0; draws = 0;
      reset();
    };
    if (!locked && !winner) {
      container.querySelectorAll('[data-cell]:not([disabled])').forEach(btn => {
        btn.onclick = () => playerMove(Number(btn.dataset.cell));
      });
    }
  }

  function playerMove(i) {
    if (board[i] || locked) return;
    board[i] = 'X';
    soundFx.playClick();
    const winner = checkWinner(board);
    if (winner) return endRound(winner);
    locked = true;
    draw();
    setTimeout(cpuMove, 450);
  }

  function cpuMove() {
    const move = hardMode ? minimaxMove(board, 'O') : easyMove(board, 'O');
    if (move !== null) board[move] = 'O';
    soundFx.playHit();
    const winner = checkWinner(board);
    if (winner) return endRound(winner);
    locked = false;
    draw();
  }

  function endRound(winner) {
    locked = true;
    if (winner === 'X') { playerWins++; soundFx.playCoin(); }
    else if (winner === 'O') { cpuWins++; soundFx.playGameOver(); }
    else { draws++; }
    draw();
    setTimeout(() => {
      const total = playerWins + cpuWins + draws;
      if (total >= 5) {
        const score = playerWins * 100;
        const title = playerWins > cpuWins ? 'STRATEGY WIN' : playerWins === cpuWins ? 'EVEN MATCH' : 'CPU HOLDS';
        showResult({
          container, title, message: `${playerWins}–${cpuWins}–${draws} across five rounds. In hard mode, perfect play means at best a draw — the lesson is detecting the pattern.`,
          score, gameId: 'tic-tac-toe', tone: playerWins >= cpuWins ? 'win' : 'over',
          onRestart: () => renderTicTacToe(container, onClose), onClose
        });
      } else {
        reset();
      }
    }, 1200);
  }

  reset();
}