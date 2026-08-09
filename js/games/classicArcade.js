/**
 * OmniArcade - Classic Arcade Legends Suite & Custom File Inspector
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { ScopedKeyboard, showResult } from '../ui.js';

/* ===========================================================================
 * 1. CYBER TETRIS
 * ======================================================================== */
export function renderCyberTetris(container, onClose) {
  start();

  function start() {
    let score = 0;
    let linesCleared = 0;
    let level = 1;
    let high = StorageService.getHighScore('cyber-tetris');

    container.innerHTML = `
      <section class="oss-game tetris-play" aria-label="Cyber Tetris">
        <header class="oss-game__header">
          <div>
            <p class="oss-game__eyebrow">CLASSIC WELL · 10×20</p>
            <h2>CYBER TETRIS</h2>
            <p>Rotate, stack, clear. The well is fully on screen — every row counts.</p>
          </div>
          <div class="oss-game__score" aria-live="polite">
            <span>SCORE <b id="tetris-score">0</b></span>
            <span>HIGH <b id="tetris-high">${high}</b></span>
            <span>LINES <b id="tetris-lines">0</b></span>
            <span>LEVEL <b id="tetris-level">1</b></span>
          </div>
        </header>
        <div class="tetris-stage">
          <canvas id="tetris-canvas" width="240" height="480" aria-label="Tetris playfield"></canvas>
          <div class="tetris-pad" role="group" aria-label="Tetris controls">
            <button type="button" id="t-left">LEFT</button>
            <button type="button" id="t-rotate">ROTATE</button>
            <button type="button" id="t-right">RIGHT</button>
            <button type="button" id="t-drop">DROP</button>
          </div>
        </div>
        <div class="oss-game__controls">
          <span>ARROWS MOVE · UP ROTATE · SPACE HARD DROP</span>
          <button type="button" id="close-game-btn">EXIT</button>
        </div>
      </section>
    `;

    const canvas = container.querySelector('#tetris-canvas');
    const ctx = canvas.getContext('2d');
    // Conservation: canvas pixels must equal the well. 10×20 × 24px = 240×480.
    // The old 400px height let rows 17–20 draw below the visible surface.
    const COLS = 10, ROWS = 20, BLOCK_SIZE = 24;
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    const SHAPES = [
      [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
      [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[0,1,1],[1,1,0]], [[1,1,0],[0,1,1]]
    ];
    // Axiom Play palette — identity blue, move red, warm neutrals. No rainbow defaults.
    const COLORS = ['#26243F', '#A8322B', '#6f6c63', '#0039A6', '#996633', '#8f8b80', '#191712'];

    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    let currentPiece = getRandomPiece();
    let dropAccumulator = 0;
    let lastTime = performance.now();
    let over = false;

    function getRandomPiece() {
      const idx = Math.floor(Math.random() * SHAPES.length);
      return { shape: SHAPES[idx], color: COLORS[idx], x: 3, y: 0 };
    }

    function draw() {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]) {
            ctx.fillStyle = board[r][c];
            ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        }
      }
      if (currentPiece) {
        ctx.fillStyle = currentPiece.color;
        currentPiece.shape.forEach((row, r) => {
          row.forEach((value, c) => {
            if (value) {
              ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (currentPiece.y + r) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
          });
        });
      }
    }

    function collide(piece, offset) {
      const { shape, x, y } = piece;
      const dx = offset.x || 0, dy = offset.y || 0;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const nx = x + c + dx, ny = y + r + dy;
            if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board[ny][nx])) return true;
          }
        }
      }
      return false;
    }

    function merge() {
      currentPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
          if (value && currentPiece.y + r >= 0) {
            board[currentPiece.y + r][currentPiece.x + c] = currentPiece.color;
          }
        });
      });
    }

    function clearLines() {
      let lines = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(0));
          lines++;
          r++;
        }
      }
      if (lines > 0) {
        soundFx.playCoin();
        linesCleared += lines;
        score += lines * 100 * level;
        level = 1 + Math.floor(linesCleared / 10);
        container.querySelector('#tetris-score').innerText = score;
        container.querySelector('#tetris-lines').innerText = linesCleared;
        container.querySelector('#tetris-level').innerText = level;
      }
    }

    function softDrop() {
      if (!collide(currentPiece, { y: 1 })) {
        currentPiece.y++;
      } else {
        lockPiece();
      }
      draw();
    }

    function lockPiece() {
      merge();
      clearLines();
      currentPiece = getRandomPiece();
      if (collide(currentPiece, { y: 0 })) {
        over = true;
        endGame();
      }
    }

    function move(dir) {
      if (!collide(currentPiece, { x: dir })) {
        soundFx.playClick();
        currentPiece.x += dir;
        draw();
      }
    }

    function rotate() {
      const shape = currentPiece.shape;
      const rotated = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
      const prev = currentPiece.shape;
      currentPiece.shape = rotated;
      if (collide(currentPiece, { x: 0 })) {
        currentPiece.shape = prev;
      } else {
        soundFx.playClick();
        draw();
      }
    }

    function hardDrop() {
      while (!collide(currentPiece, { y: 1 })) currentPiece.y++;
      lockPiece();
      draw();
    }

    function endGame() {
      stopLoop();
      kb.destroy();
      showResult({
        container,
        title: 'STACK OVERFLOW',
        message: 'The well is full.',
        score,
        gameId: 'cyber-tetris',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowDown: () => softDrop(),
      ArrowUp: () => rotate(),
      ' ': () => hardDrop()
    });

    container.querySelector('#t-left').onclick = () => move(-1);
    container.querySelector('#t-right').onclick = () => move(1);
    container.querySelector('#t-rotate').onclick = rotate;
    container.querySelector('#t-drop').onclick = hardDrop;

    function loop(now) {
      if (over) return;
      const dt = now - lastTime;
      lastTime = now;
      dropAccumulator += dt;
      const interval = Math.max(80, 600 - (level - 1) * 60);
      if (dropAccumulator >= interval) {
        dropAccumulator = 0;
        softDrop();
      }
      draw();
    }
    let rafId = null;
    const tick = (now) => { if (over) return; loop(now); rafId = requestAnimationFrame(tick); };
    rafId = requestAnimationFrame(tick);
    function stopLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

    const onVis = () => {
      if (document.hidden) { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
      else if (!over && !rafId) { lastTime = performance.now(); rafId = requestAnimationFrame(tick); }
    };
    document.addEventListener('visibilitychange', onVis);

    const closeBtn = container.querySelector('#close-game-btn');
    closeBtn.onclick = () => {
      stopLoop();
      kb.destroy();
      document.removeEventListener('visibilitychange', onVis);
      onClose();
    };
  }
}

/* ===========================================================================
 * 2. CYBER PAC-MAN
 * ======================================================================== */
export function renderCyberPacman(container, onClose) {
  start();

  function start() {
    let score = 0;
    let high = StorageService.getHighScore('cyber-pacman');
    let dotsLeft = 0;
    let over = false;

    container.innerHTML = `
      <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-yellow-400">🟡</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">CYBER PAC-MAN</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">MAZE PROTOCOL [PAC_GHOST_AI] — EAT ALL DOTS</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE: <span id="pac-score" class="text-amber-400 font-extrabold text-base">0</span></div>
          <div id="pac-status" class="text-zinc-400">DOTS LEFT: <span id="pac-dots">0</span></div>
          <div>HIGH: <span id="pac-high" class="text-amber-400 font-extrabold text-base">${high}</span></div>
        </div>

        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">Arrow keys or the pad below to turn · eat every dot · avoid ghosts, or eat them during ⚡ power mode</div>

        <div class="relative flex justify-center mb-4">
          <canvas id="pac-canvas" width="360" height="360" class="bg-black border border-amber-500/60 shadow-inner"></canvas>
        </div>

        <div class="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          <div></div>
          <button id="p-up" class="axiom-dpad-btn">▲</button>
          <div></div>
          <button id="p-left" class="axiom-dpad-btn">◀</button>
          <button id="p-down" class="axiom-dpad-btn">▼</button>
          <button id="p-right" class="axiom-dpad-btn">▶</button>
        </div>
      </div>
    `;

    const canvas = container.querySelector('#pac-canvas');
    const ctx = canvas.getContext('2d');
    const TILE = 20;

    const MAZE_TEMPLATE = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,1,2,1,1,2,1,1,2,1,1,2,1],
      [1,3,1,1,2,1,1,2,1,1,2,1,1,2,1,1,3,1],
      [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,2,1,1,1,1,2,1,2,1,1,2,1],
      [1,2,2,2,2,1,2,2,1,1,2,2,1,2,2,2,2,1],
      [1,1,1,1,2,1,1,0,0,0,0,1,1,2,1,1,1,1],
      [0,0,0,1,2,1,0,0,0,0,0,0,1,2,1,0,0,0],
      [1,1,1,1,2,1,0,1,1,1,1,0,1,2,1,1,1,1],
      [1,2,2,2,2,2,2,1,1,1,1,2,2,2,2,2,2,1],
      [1,2,1,1,2,1,2,2,2,2,2,2,1,2,1,1,2,1],
      [1,3,2,1,2,1,2,1,1,1,1,2,1,2,1,2,3,1],
      [1,1,2,1,2,1,2,1,1,1,1,2,1,2,1,2,1,1],
      [1,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    const maze = MAZE_TEMPLATE.map(row => row.slice());
    const ROWS = maze.length, COLS = maze[0].length;
    const TUNNEL_ROWS = [8, 9];

    let pacman = { x: 9, y: 12, dirX: 0, dirY: 0, nextX: 0, nextY: 0 };
    let ghosts = [
      { x: 8, y: 8, color: '#ef4444', dirX: 1, dirY: 0, homeX: 8, homeY: 8 },
      { x: 9, y: 8, color: '#ec4899', dirX: -1, dirY: 0, homeX: 9, homeY: 8 },
      { x: 8, y: 9, color: '#06b6d4', dirX: 0, dirY: -1, homeX: 8, homeY: 9 }
    ];
    let frightTimer = 0;

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 2 || maze[r][c] === 3) dotsLeft++;
    container.querySelector('#pac-dots').innerText = dotsLeft;

    function isWall(x, y) {
      if (y < 0 || y >= ROWS) return true;
      if (x < 0 || x >= COLS) return TUNNEL_ROWS.includes(y) ? false : true;
      return maze[y][x] === 1;
    }

    function wrap(pos, max) {
      if (pos < 0) return max - 1;
      if (pos >= max) return 0;
      return pos;
    }

    function step() {
      if (over) return;

      if (pacman.nextX !== 0 || pacman.nextY !== 0) {
        const nx = pacman.x + pacman.nextX;
        const ny = pacman.y + pacman.nextY;
        if (!isWall(nx, ny)) { pacman.dirX = pacman.nextX; pacman.dirY = pacman.nextY; }
      }

      const tx = pacman.x + pacman.dirX;
      const ty = pacman.y + pacman.dirY;
      if (!isWall(tx, ty)) {
        pacman.x = wrap(tx, COLS);
        pacman.y = wrap(ty, ROWS);

        if (maze[pacman.y][pacman.x] === 2) {
          maze[pacman.y][pacman.x] = 0;
          soundFx.playCoin();
          score += 10;
          dotsLeft--;
        } else if (maze[pacman.y][pacman.x] === 3) {
          maze[pacman.y][pacman.x] = 0;
          soundFx.playWin();
          score += 50;
          dotsLeft--;
          frightTimer = 35;
        }
        updateHud();
      }

      if (dotsLeft <= 0) { over = true; return winGame(); }

      ghosts.forEach(g => {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        let possible = dirs.filter(d => {
          const nx = g.x + d.x, ny = g.y + d.y;
          if (!isWall(nx, ny)) return true;
          if (TUNNEL_ROWS.includes(ny) && (nx < 0 || nx >= COLS)) return true;
          return false;
        });
        if (possible.length === 0) possible = dirs;

        let chosen;
        if (frightTimer > 0) {
          chosen = possible.reduce((best, d) => {
            const dist = (g.x + d.x - pacman.x) ** 2 + (g.y + d.y - pacman.y) ** 2;
            const bestDist = (g.x + best.x - pacman.x) ** 2 + (g.y + best.y - pacman.y) ** 2;
            return dist > bestDist ? d : best;
          });
        } else {
          chosen = Math.random() < 0.6
            ? possible.reduce((best, d) => {
                const dist = (g.x + d.x - pacman.x) ** 2 + (g.y + d.y - pacman.y) ** 2;
                const bestDist = (g.x + best.x - pacman.x) ** 2 + (g.y + best.y - pacman.y) ** 2;
                return dist < bestDist ? d : best;
              })
            : possible[Math.floor(Math.random() * possible.length)];
        }
        g.x = wrap(g.x + chosen.x, COLS);
        g.y = wrap(g.y + chosen.y, ROWS);

        if (g.x === pacman.x && g.y === pacman.y) {
          if (frightTimer > 0) {
            soundFx.playWin();
            score += 200;
            g.x = g.homeX; g.y = g.homeY;
            updateHud();
          } else {
            over = true;
            loseGame();
          }
        }
      });

      if (frightTimer > 0) frightTimer--;
      draw();
    }

    function updateHud() {
      container.querySelector('#pac-score').innerText = score;
      if (score > high) high = score;
      container.querySelector('#pac-high').innerText = high;
      const status = container.querySelector('#pac-status');
      status.innerHTML = frightTimer > 0
        ? `<span class="text-cyan-400">⚡ POWER MODE (${frightTimer})</span>`
        : `DOTS LEFT: <span id="pac-dots">${dotsLeft}</span>`;
    }

    function draw() {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const v = maze[r][c];
          if (v === 1) {
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(c * TILE, r * TILE, TILE - 1, TILE - 1);
          } else if (v === 2) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(c * TILE + 10, r * TILE + 10, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (v === 3) {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(c * TILE + 10, r * TILE + 10, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = '#facc15';
      const cx = pacman.x * TILE + 10, cy = pacman.y * TILE + 10;
      const facing = pacman.dirX === -1 ? Math.PI : pacman.dirX === 1 ? 0 : pacman.dirY === -1 ? -Math.PI / 2 : Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, facing + 0.2, facing + Math.PI * 2 - 0.2);
      ctx.lineTo(cx, cy);
      ctx.fill();

      ghosts.forEach(g => {
        ctx.fillStyle = frightTimer > 0 ? '#3b82f6' : g.color;
        ctx.beginPath();
        ctx.arc(g.x * TILE + 10, g.y * TILE + 10, 8, Math.PI, 0);
        ctx.lineTo(g.x * TILE + 18, g.y * TILE + 18);
        ctx.lineTo(g.x * TILE + 10, g.y * TILE + 14);
        ctx.lineTo(g.x * TILE + 2, g.y * TILE + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(g.x * TILE + 5, g.y * TILE + 7, 3, 3);
        ctx.fillRect(g.x * TILE + 12, g.y * TILE + 7, 3, 3);
      });
    }

    function winGame() {
      clearInterval(gameInterval);
      kb.destroy();
      showResult({
        container,
        title: 'MAZE CLEARED',
        message: 'Every dot devoured. Ghosts bested.',
        score,
        gameId: 'cyber-pacman',
        tone: 'win',
        onRestart: () => start(),
        onClose
      });
    }

    function loseGame() {
      clearInterval(gameInterval);
      kb.destroy();
      showResult({
        container,
        title: 'CAUGHT',
        message: 'A ghost got you.',
        score,
        gameId: 'cyber-pacman',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowUp: () => { pacman.nextX = 0; pacman.nextY = -1; },
      ArrowDown: () => { pacman.nextX = 0; pacman.nextY = 1; },
      ArrowLeft: () => { pacman.nextX = -1; pacman.nextY = 0; },
      ArrowRight: () => { pacman.nextX = 1; pacman.nextY = 0; }
    });

    container.querySelector('#p-up').onclick = () => { pacman.nextX = 0; pacman.nextY = -1; };
    container.querySelector('#p-down').onclick = () => { pacman.nextX = 0; pacman.nextY = 1; };
    container.querySelector('#p-left').onclick = () => { pacman.nextX = -1; pacman.nextY = 0; };
    container.querySelector('#p-right').onclick = () => { pacman.nextX = 1; pacman.nextY = 0; };

    const closeBtn = container.querySelector('#close-game-btn');
    closeBtn.onclick = () => { clearInterval(gameInterval); kb.destroy(); onClose(); };

    draw();
    const gameInterval = setInterval(step, 180);
  }
}

/* ===========================================================================
 * 3. LOCAL FILE INSPECTOR (honest — no fake "emulator")
 * ======================================================================== */
export function renderRomLoader(container, onClose) {
  container.innerHTML = `
    <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-2xl mx-auto font-mono-hud">
      <div class="flex justify-between items-center mb-6 border-b border-amber-500/40 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl text-amber-400">💾</span>
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">LOCAL FILE INSPECTOR</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">PREVIEW HEADER METADATA OF YOUR LEGAL GAME BACKUPS</p>
          </div>
        </div>
        <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
      </div>

      <div class="bg-zinc-950 border border-dashed border-amber-500/60 p-8 text-center mb-6">
        <div class="text-4xl mb-3">📁</div>
        <h3 class="text-lg font-bold text-amber-400 mb-2">Select a Local Game File</h3>
        <p class="text-xs text-zinc-400 mb-4">Supports <code>.nes</code>, <code>.gb</code>, <code>.sfc</code>, <code>.swf</code>. This tool reads file metadata only — it does not run emulation.</p>
        <input id="rom-file-input" type="file" accept=".nes,.gb,.sfc,.swf" class="hidden" />
        <button id="select-rom-btn" class="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase tracking-wider">
          SELECT FILE FROM DISK
        </button>
      </div>

      <div id="inspector-output" class="hidden">
        <div class="flex justify-between items-center bg-zinc-900 p-3 text-xs border border-amber-500/40 mb-3">
          <span class="text-amber-400 font-bold" id="rom-name-label">FILE: —</span>
          <button id="clear-rom-btn" class="text-zinc-400 hover:text-amber-400 underline">REMOVE</button>
        </div>
        <div id="rom-meta" class="bg-black border border-amber-500/40 p-4 text-xs space-y-1"></div>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector('#close-game-btn');
  closeBtn.onclick = onClose;

  const input = container.querySelector('#rom-file-input');
  const output = container.querySelector('#inspector-output');
  const metaEl = container.querySelector('#rom-meta');

  container.querySelector('#select-rom-btn').onclick = () => input.click();
  container.querySelector('#clear-rom-btn').onclick = () => {
    output.classList.add('hidden');
    input.value = '';
  };

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    soundFx.playCoin();

    container.querySelector('#rom-name-label').innerText = `FILE: ${file.name}`;
    output.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = new Uint8Array(ev.target.result);
      let format = 'UNKNOWN';
      let notes = '';
      if (file.name.endsWith('.nes') && buf[0] === 0x4e && buf[1] === 0x45 && buf[2] === 0x53) {
        format = 'iNES ROM';
        notes = `PRG ROM: 0x${buf[4].toString(16)} · CHR ROM: 0x${buf[5].toString(16)} · Mapper: ${(buf[6] >> 4) | (buf[7] & 0xf0)}`;
      } else if (file.name.endsWith('.sfc') || file.name.endsWith('.smc')) {
        format = 'SNES/SFC image';
        notes = `Size: ${(file.size / 1024).toFixed(0)} KB`;
      } else if (file.name.endsWith('.gb')) {
        format = 'Game Boy ROM';
        notes = `Header title at 0x134`;
      } else if (file.name.endsWith('.swf')) {
        format = (buf[0] === 0x46 || buf[0] === 0x43 || buf[0] === 0x5a) ? 'Flash SWF' : 'Unrecognized SWF';
        notes = `Signature byte: 0x${buf[0].toString(16).toUpperCase()}`;
      }

      metaEl.innerHTML = `
        <div><span class="text-zinc-500">FORMAT:</span> <span class="text-amber-400 font-bold">${format}</span></div>
        <div><span class="text-zinc-500">FILE NAME:</span> <span class="text-white">${file.name}</span></div>
        <div><span class="text-zinc-500">SIZE:</span> <span class="text-white">${(file.size / 1024).toFixed(1)} KB</span></div>
        <div><span class="text-zinc-500">TYPE:</span> <span class="text-white">${file.type || 'application/octet-stream'}</span></div>
        ${notes ? `<div><span class="text-zinc-500">HEADER:</span> <span class="text-white">${notes}</span></div>` : ''}
        <div class="pt-2 mt-2 border-t border-amber-500/20 text-zinc-500 text-[10px]">
          ⓘ This inspector reads metadata only. It does not execute or emulate the file.
        </div>
      `;
    };
    reader.readAsArrayBuffer(file.slice(0, 512));
  };
}