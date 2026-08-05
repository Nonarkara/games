/**
 * OmniArcade - Retro Arcade Vault Suite (Axiom Core Styled)
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { ScopedKeyboard, showResult } from '../ui.js';

/* ===========================================================================
 * 1. RETRO CYBER SNAKE
 *    Fix: small input queue so two quick turns can't reverse into the neck.
 * ======================================================================== */
export function renderRetroSnake(container, onClose) {
  start();

  function start() {
    let score = 0;
    let high = StorageService.getHighScore('cyber-snake');
    let over = false;

    container.innerHTML = `
      <div class="relative bg-black border-2 border-amber-500 p-6 text-white max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] font-mono-hud">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">🐍</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">RETRO CYBER SNAKE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">SYSTEM PROTOCOL [GRID_SNAKE_V1] — NEON TRAIL</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn">✕ TERMINATE</button>
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE: <span id="snake-score" class="text-white text-base">0</span></div>
          <div>HIGH SCORE: <span id="snake-high" class="text-amber-400 text-base">${high}</span></div>
        </div>

        <div class="relative flex justify-center mb-4">
          <canvas id="snake-canvas" width="400" height="400" class="bg-black border border-amber-500/60 shadow-inner"></canvas>
        </div>

        <div class="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          <div></div>
          <button id="btn-up" class="axiom-dpad-btn">▲</button>
          <div></div>
          <button id="btn-left" class="axiom-dpad-btn">◀</button>
          <button id="btn-down" class="axiom-dpad-btn">▼</button>
          <button id="btn-right" class="axiom-dpad-btn">▶</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#snake-canvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const tileCount = canvas.width / gridSize;

    let snake = [{ x: 10, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 1, dy = 0;
    // Input queue: holds the NEXT direction, applied once per tick.
    // Rejects direct reversals against the *current* movement.
    let pendingDx = 1, pendingDy = 0;

    function placeFood() {
      let tries = 0;
      do {
        food = {
          x: Math.floor(Math.random() * tileCount),
          y: Math.floor(Math.random() * tileCount)
        };
        tries++;
      } while (tries < 50 && snake.some(s => s.x === food.x && s.y === food.y));
    }

    function queueTurn(nx, ny) {
      // Reject if reversing into current direction (the classic self-kill bug).
      if (nx === -dx && ny === -dy) return;
      pendingDx = nx;
      pendingDy = ny;
    }

    function gameLoop() {
      if (over) return;

      // Apply the queued turn for this tick.
      dx = pendingDx;
      dy = pendingDy;

      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return endGame();
      }
      for (let segment of snake) {
        if (segment.x === head.x && segment.y === head.y) {
          return endGame();
        }
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        soundFx.playCoin();
        score += 10;
        container.querySelector('#snake-score').innerText = score;
        placeFood();
      } else {
        snake.pop();
      }

      draw();
    }

    function draw() {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid.
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 1;
      for (let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // Food (glow).
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.fillRect(food.x * gridSize + 3, food.y * gridSize + 3, gridSize - 6, gridSize - 6);
      ctx.shadowBlur = 0;

      // Snake.
      snake.forEach((segment, idx) => {
        ctx.fillStyle = idx === 0 ? '#fbbf24' : '#f59e0b';
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    }

    function endGame() {
      over = true;
      clearInterval(gameInterval);
      kb.destroy();
      showResult({
        container,
        title: 'SNAKE TERMINATED',
        message: score >= high ? 'A new personal best!' : 'The trail caught up.',
        score,
        gameId: 'cyber-snake',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowUp: () => queueTurn(0, -1),
      ArrowDown: () => queueTurn(0, 1),
      ArrowLeft: () => queueTurn(-1, 0),
      ArrowRight: () => queueTurn(1, 0)
    });

    container.querySelector('#btn-up').onclick = () => queueTurn(0, -1);
    container.querySelector('#btn-down').onclick = () => queueTurn(0, 1);
    container.querySelector('#btn-left').onclick = () => queueTurn(-1, 0);
    container.querySelector('#btn-right').onclick = () => queueTurn(1, 0);

    const closeBtn = container.querySelector('#close-game-btn');
    closeBtn.onclick = () => { clearInterval(gameInterval); kb.destroy(); onClose(); };

    placeFood();
    draw();
    const gameInterval = setInterval(gameLoop, 110);
  }
}

/* ===========================================================================
 * 2. SPACE DEFENDER
 *    Fix: iterate bullets backward + single-pass collision so splice() can't
 *    skip bullets or aliens.
 * ======================================================================== */
export function renderSpaceDefender(container, onClose) {
  start();

  function start() {
    let score = 0;
    let high = StorageService.getHighScore('space-defender');
    let over = false;
    let won = false;

    container.innerHTML = `
      <div class="relative bg-black border-2 border-amber-500 p-6 text-white max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] font-mono-hud">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">👾</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">SPACE DEFENDER</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">RETRO VAULT [SPACE_INVADERS_8BIT]</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn">✕ TERMINATE</button>
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE: <span id="space-score" class="text-white text-base">0</span></div>
          <div>WAVE: <span id="space-wave" class="text-amber-400 text-base">1</span></div>
          <div>HIGH: <span id="space-high" class="text-amber-400 text-base">${high}</span></div>
        </div>

        <div class="relative flex justify-center mb-4">
          <canvas id="space-canvas" width="400" height="400" class="bg-black border border-amber-500/60 shadow-inner"></canvas>
        </div>

        <div class="flex justify-center gap-2">
          <button id="space-left" class="axiom-dpad-btn px-5 py-3">◀ LEFT</button>
          <button id="space-shoot" class="px-8 py-3 bg-amber-600 border border-amber-400 text-black hover:bg-amber-500 font-black text-base">🔥 FIRE</button>
          <button id="space-right" class="axiom-dpad-btn px-5 py-3">RIGHT ▶</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#space-canvas');
    const ctx = canvas.getContext('2d');

    let player = { x: 180, y: 360, width: 40, height: 20, speed: 8 };
    let bullets = [];
    let aliens = [];
    let moveRight = true;
    let wave = 1;
    let heldLeft = false, heldRight = false;

    function spawnWave() {
      aliens = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          aliens.push({ x: 30 + c * 55, y: 30 + r * 40, width: 35, height: 25, alive: true });
        }
      }
    }
    spawnWave();

    function gameLoop() {
      if (over || won) return;

      // Smooth horizontal movement from held keys/buttons.
      if (heldLeft && player.x > 10) player.x -= player.speed;
      if (heldRight && player.x < canvas.width - player.width - 10) player.x += player.speed;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Move + draw aliens.
      let changeDir = false;
      aliens.forEach(alien => {
        if (!alien.alive) return;
        if (moveRight) alien.x += 1; else alien.x -= 1;
        if (alien.x > canvas.width - 45 || alien.x < 10) changeDir = true;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
        // little invader face
        ctx.fillStyle = '#000';
        ctx.fillRect(alien.x + 8, alien.y + 8, 5, 5);
        ctx.fillRect(alien.x + alien.width - 13, alien.y + 8, 5, 5);
      });

      if (changeDir) {
        moveRight = !moveRight;
        aliens.forEach(alien => { alien.y += 10; });
      }

      // Move bullets.
      for (let i = 0; i < bullets.length; i++) bullets[i].y -= 7;

      // Collision: single pass, backward iteration so splice is safe.
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        let hit = false;
        for (let ai = 0; ai < aliens.length; ai++) {
          const a = aliens[ai];
          if (a.alive && b.x >= a.x && b.x <= a.x + a.width && b.y >= a.y && b.y <= a.y + a.height) {
            a.alive = false;
            hit = true;
            soundFx.playHit();
            score += 20;
            container.querySelector('#space-score').innerText = score;
            container.querySelector('#space-high').innerText = Math.max(high, score);
            break;
          }
        }
        if (hit || b.y < 0) bullets.splice(bi, 1);
      }

      // Draw bullets.
      ctx.fillStyle = '#fbbf24';
      bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 12));

      const activeAliens = aliens.filter(a => a.alive);

      // Win: wave cleared.
      if (activeAliens.length === 0) {
        won = true;
        clearInterval(gameInterval);
        kb.destroy();
        const finalScore = score;
        showResult({
          container,
          title: `WAVE ${wave} CLEARED`,
          message: 'All invaders destroyed. Onward!',
          score: finalScore,
          gameId: 'space-defender',
          tone: 'win',
          onRestart: () => start(),
          onClose
        });
        return;
      }

      // Lose: aliens reach the player.
      if (activeAliens.some(a => a.y + a.height >= player.y)) {
        over = true;
        clearInterval(gameInterval);
        kb.destroy();
        showResult({
          container,
          title: 'EARTH OVERRUN',
          message: 'The invaders landed.',
          score,
          gameId: 'space-defender',
          onRestart: () => start(),
          onClose
        });
        return;
      }

      // Draw player ship.
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillRect(player.x + 15, player.y - 10, 10, 10);
    }

    function fireBullet() {
      soundFx.playJump();
      bullets.push({ x: player.x + 18, y: player.y - 12 });
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowLeft: () => { heldLeft = true; },
      ArrowRight: () => { heldRight = true; },
      ' ': () => fireBullet()
    });
    // Release detection for smooth movement.
    const onUp = (e) => {
      if (e.key === 'ArrowLeft') heldLeft = false;
      if (e.key === 'ArrowRight') heldRight = false;
    };
    window.addEventListener('keyup', onUp);

    // Button hold for touch.
    const leftBtn = container.querySelector('#space-left');
    const rightBtn = container.querySelector('#space-right');
    leftBtn.onmousedown = () => { heldLeft = true; };
    leftBtn.onmouseup = () => { heldLeft = false; };
    leftBtn.onmouseleave = () => { heldLeft = false; };
    leftBtn.ontouchstart = (e) => { e.preventDefault(); heldLeft = true; };
    leftBtn.ontouchend = () => { heldLeft = false; };
    rightBtn.onmousedown = () => { heldRight = true; };
    rightBtn.onmouseup = () => { heldRight = false; };
    rightBtn.onmouseleave = () => { heldRight = false; };
    rightBtn.ontouchstart = (e) => { e.preventDefault(); heldRight = true; };
    rightBtn.ontouchend = () => { heldRight = false; };
    container.querySelector('#space-shoot').onclick = fireBullet;

    const closeBtn = container.querySelector('#close-game-btn');
    closeBtn.onclick = () => {
      clearInterval(gameInterval);
      kb.destroy();
      window.removeEventListener('keyup', onUp);
      onClose();
    };

    const gameInterval = setInterval(gameLoop, 1000 / 40);
  }
}