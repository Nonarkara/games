/**
 * Dr Non — Non-Gaming System Casual & Friv Arcade Suite (Axiom Core Styled)
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { ScopedKeyboard, showResult } from '../ui.js';

/* ===========================================================================
 * 1. FLAPPY CYBER BIRD
 * ======================================================================== */
export function renderFlappyBird(container, onClose) {
  start();

  function start() {
    let score = 0;
    let high = StorageService.getHighScore('flappy-bird');
    let over = false;

    container.innerHTML = `
      <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">🐦</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">FLAPPY CYBER BIRD</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">FRIV CASUAL MODULE — TAP TO FLY</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE: <span id="bird-score" class="text-white text-base">0</span></div>
          <div>HIGH SCORE: <span id="bird-high" class="text-amber-400 text-base">${high}</span></div>
        </div>

        <div class="relative flex justify-center mb-4">
          <canvas id="flappy-canvas" width="360" height="400" class="w-full h-auto bg-black border border-amber-500/60 shadow-inner" style="max-width:360px"></canvas>
        </div>

        <button id="flap-btn" class="w-full py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg tracking-wider border border-amber-400">
          ⚡ TAP / FLAP WINGS (SPACEBAR)
        </button>
      </div>
    `;

    const canvas = container.querySelector('#flappy-canvas');
    const ctx = canvas.getContext('2d');

    let bird = { x: 50, y: 180, velocity: 0, gravity: 0.5, lift: -8, radius: 12 };
    let pipes = [];
    let frame = 0;

    function createPipe() {
      const gap = 120;
      const topHeight = Math.floor(Math.random() * (canvas.height - gap - 100)) + 40;
      pipes.push({ x: canvas.width, top: topHeight, bottom: topHeight + gap, passed: false });
    }

    function gameLoop() {
      if (over) return;
      frame++;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      bird.velocity += bird.gravity;
      bird.y += bird.velocity;

      if (bird.y + bird.radius >= canvas.height || bird.y - bird.radius <= 0) {
        return endGame();
      }

      if (frame % 80 === 0) createPipe();

      for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 2.5;

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(p.x, 0, 45, p.top);
        ctx.fillRect(p.x, p.bottom, 45, canvas.height - p.bottom);

        if (!p.passed && p.x + 45 < bird.x) {
          p.passed = true;
          soundFx.playCoin();
          score++;
          container.querySelector('#bird-score').innerText = score;
        }

        if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + 45) {
          if (bird.y - bird.radius < p.top || bird.y + bird.radius > p.bottom) {
            return endGame();
          }
        }

        if (p.x + 45 < 0) pipes.splice(i, 1);
      }

      // Bird with a little beak.
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(bird.x + 8, bird.y - 3, 8, 5);
      ctx.fillStyle = '#000';
      ctx.fillRect(bird.x + 2, bird.y - 5, 3, 3);
    }

    function flap() {
      if (over) return;
      soundFx.playJump();
      bird.velocity = bird.lift;
    }

    function endGame() {
      over = true;
      clearInterval(gameInterval);
      kb.destroy();
      showResult({
        container,
        title: 'BIRD DOWN',
        message: score >= 10 ? 'Smooth flying!' : 'Keep flapping!',
        score,
        gameId: 'flappy-bird',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({ ' ': flap, ArrowUp: flap });

    const closeBtn = container.querySelector('#close-game-btn');
    closeBtn.onclick = () => { clearInterval(gameInterval); kb.destroy(); onClose(); };

    const flapBtn = container.querySelector('#flap-btn');
    flapBtn.onclick = flap;
    canvas.onclick = flap;
    canvas.ontouchstart = (e) => { e.preventDefault(); flap(); };

    const gameInterval = setInterval(gameLoop, 1000 / 40);
  }
}

/* ===========================================================================
 * 2. MINESWEEPER PRO
 *    Fixes: recursive flood-fill on 0, right-click/long-press flags,
 *    reveal-all on loss, first-click safety (never lose on click 1).
 * ======================================================================== */
export function renderMinesweeper(container, onClose) {
  start();

  function start() {
    const rows = 8, cols = 8, minesCount = 10;
    let grid = [];
    let revealedCount = 0;
    let gameState = 'playing'; // 'playing' | 'won' | 'lost'
    let firstClick = true;
    let flagsLeft = minesCount;

    function buildBoard() {
      grid = [];
      for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
          grid[r][c] = { mine: false, revealed: false, flagged: false, count: 0 };
        }
      }
    }
    buildBoard();

    function plantMines(safeR, safeC) {
      // Never plant on (or adjacent to) the first-clicked cell.
      let planted = 0;
      while (planted < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        if (grid[r][c].mine) continue;
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        grid[r][c].mine = true;
        planted++;
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c].mine) continue;
          let cnt = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) cnt++;
            }
          }
          grid[r][c].count = cnt;
        }
      }
    }

    function floodReveal(r, c) {
      const stack = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        const cell = grid[cr][cc];
        if (cell.revealed || cell.flagged || cell.mine) continue;
        cell.revealed = true;
        revealedCount++;
        if (cell.count === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].revealed) {
                stack.push([nr, nc]);
              }
            }
          }
        }
      }
    }

    function reveal(r, c) {
      if (gameState !== 'playing') return;
      const cell = grid[r][c];
      if (cell.revealed || cell.flagged) return;

      if (firstClick) {
        firstClick = false;
        plantMines(r, c);
      }

      if (cell.mine) {
        cell.revealed = true;
        return loseGame();
      }

      floodReveal(r, c);
      soundFx.playClick();

      if (revealedCount === rows * cols - minesCount) {
        return winGame();
      }
      render();
    }

    function toggleFlag(r, c) {
      if (gameState !== 'playing') return;
      const cell = grid[r][c];
      if (cell.revealed) return;
      if (!cell.flagged && flagsLeft <= 0) return;
      cell.flagged = !cell.flagged;
      flagsLeft += cell.flagged ? -1 : 1;
      soundFx.playClick();
      render();
    }

    function loseGame() {
      gameState = 'lost';
      // Reveal all mines (honest end-state).
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          if (grid[r][c].mine) grid[r][c].revealed = true;
      render();
      setTimeout(() => {
        showResult({
          container,
          title: '💥 DETONATED',
          message: 'You stepped on a mine.',
          gameId: 'minesweeper',
          score: revealedCount * 10,
          onRestart: () => start(),
          onClose
        });
      }, 250);
    }

    function winGame() {
      gameState = 'won';
      soundFx.playWin();
      setTimeout(() => {
        showResult({
          container,
          title: 'FIELD SECURED',
          message: 'Every safe tile cleared.',
          gameId: 'minesweeper',
          score: 500,
          tone: 'win',
          onRestart: () => start(),
          onClose
        });
      }, 200);
    }

    function render() {
      const safeTiles = rows * cols - minesCount;
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-md mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">💣</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">MINESWEEPER PRO</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">GRID PROTOCOL [8×8 MATRIX]</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>🚩 FLAGS: <span id="mine-flags" class="text-amber-400">${flagsLeft}</span></div>
            <div>🟩 SAFE: <span class="text-white">${revealedCount}/${safeTiles}</span></div>
          </div>

          <div class="grid grid-cols-8 gap-1 p-3 bg-zinc-950 border border-amber-500/40 mb-4">
            ${grid.map((row, r) => row.map((cell, c) => {
              let content = '';
              let cls = 'mine-cell bg-zinc-900 border-zinc-700 hover:bg-amber-950 text-zinc-400';
              if (cell.revealed) {
                if (cell.mine) { content = '💣'; cls = 'bg-red-950 border-red-500 text-white'; }
                else if (cell.count > 0) { content = cell.count; cls = 'bg-black border-amber-500/40 text-amber-300'; }
                else { cls = 'bg-black border-zinc-800 text-zinc-600'; }
              } else if (cell.flagged) {
                content = '🚩'; cls = 'bg-zinc-900 border-amber-500/50';
              }
              return `<button class="${cls} mine-cell aspect-square flex items-center justify-center font-bold text-sm border transition" style="touch-action:manipulation" data-r="${r}" data-c="${c}">${content}</button>`;
            }).join('')).join('')}
          </div>

          <p class="text-[10px] text-zinc-500 text-center">LEFT-CLICK REVEAL · RIGHT-CLICK (OR LONG-PRESS) TO FLAG</p>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = () => onClose();

      let pressTimer = null, longPressed = false;

      container.querySelectorAll('.mine-cell').forEach(btn => {
        const r = parseInt(btn.dataset.r, 10);
        const c = parseInt(btn.dataset.c, 10);

        // Pointer events for touch: the old touchstart+preventDefault pair
        // suppressed the synthesized click, so a quick tap could never
        // reveal a tile on a phone. suppressClick de-dupes the click that
        // still follows our explicit pointer-driven reveal.
        let suppressClick = false;

        btn.onclick = () => {
          if (suppressClick) { suppressClick = false; return; }
          if (longPressed) { longPressed = false; return; }
          reveal(r, c);
        };

        btn.oncontextmenu = (e) => {
          e.preventDefault();
          toggleFlag(r, c);
        };

        btn.onpointerdown = (e) => {
          if (e.pointerType !== 'touch') return;
          longPressed = false;
          pressTimer = setTimeout(() => {
            longPressed = true;
            suppressClick = true;
            toggleFlag(r, c);
          }, 400);
        };
        btn.onpointerup = (e) => {
          if (e.pointerType !== 'touch') return;
          if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
          if (!longPressed) {
            suppressClick = true;
            reveal(r, c);
          }
        };
        btn.onpointerleave = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
        btn.onpointercancel = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      });
    }

    render();
  }
}