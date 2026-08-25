/**
 * Dr Non — Non-Gaming System · Arcade Hall II
 * Four canonical cabinets added 2026-08-11. The ARCADE wing was thin and
 * missing the titles anyone would name if asked to list an arcade.
 *
 *   Asteroids      → Atari 1979 · rotation + thrust + screen wrap
 *   Frogger        → Konami 1981 · lane timing under a clock
 *   Connect Four   → minimax + alpha-beta · the floor's first real OPPONENT
 *   Klondike       → the most-played computer game ever shipped
 *
 * Connect Four matters beyond the game: every other cartridge is you
 * against a clock or your own last score. This is the first one that
 * thinks back.
 *
 * Renderer contract: (container, onClose). Every loop/interval is torn
 * down on close — GameSession also traps them, but each game cleans up
 * after itself so it is airtight standalone.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

const head = (icon, title, sub) => `
  <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
    <div class="flex items-center gap-3">
      <span class="text-3xl text-amber-400">${icon}</span>
      <div>
        <h2 class="text-xl font-black text-amber-400 tracking-wider">${title}</h2>
        <p class="text-[10px] text-amber-500/80 uppercase">${sub}</p>
      </div>
    </div>
    <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
  </div>`;

const AMBER = '#f59e0b';
const INK = '#e6edf3';

/* ===========================================================================
 * 1. ASTEROIDS — Atari 1979
 * Rotate, thrust, fire. Rocks split large → medium → small. Screen wraps
 * on both axes, which is the whole feel of the original.
 * ======================================================================== */
export function renderAsteroids(container, onClose) {
  start();

  function start() {
    const W = 460, H = 340;
    let ship, rocks, bullets, score, lives, over, raf = null, tick = 0;
    const keys = { left: false, right: false, thrust: false };

    function reset(full) {
      ship = { x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, cool: 0, safe: 90 };
      bullets = [];
      if (full) { score = 0; lives = 3; over = false; rocks = []; spawnWave(4); }
    }

    function spawnWave(n) {
      for (let i = 0; i < n; i++) {
        // Spawn away from the ship so a wave never kills you instantly.
        let x, y;
        do { x = Math.random() * W; y = Math.random() * H; }
        while (Math.hypot(x - W / 2, y - H / 2) < 110);
        rocks.push(makeRock(x, y, 3));
      }
    }

    function makeRock(x, y, size) {
      const speed = (4 - size) * 0.35 + 0.35;
      const dir = Math.random() * Math.PI * 2;
      // Irregular silhouette — a circle reads as a ball, not a rock.
      const pts = [];
      const n = 9;
      for (let i = 0; i < n; i++) pts.push(0.72 + Math.random() * 0.5);
      return { x, y, vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed, size, r: size * 11, pts, spin: (Math.random() - 0.5) * 0.03, rot: 0 };
    }

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🪨', 'ASTEROIDS', 'Atari 1979 · rotate, thrust, fire')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          ← → rotate · ↑ thrust · SPACE fire. The screen wraps: fly off one edge, arrive at the other.
          Big rocks split into smaller, faster ones.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>SCORE <span id="as-score" class="text-amber-400 text-base">0</span></div>
          <div>ROCKS <span id="as-rocks" class="text-white text-base">0</span></div>
          <div>SHIPS <span id="as-lives" class="text-white text-base">▲▲▲</span></div>
        </div>
        <canvas id="as-cv" width="${W}" height="${H}" class="block mx-auto bg-black border border-amber-500/40" style="max-width:100%;height:auto"></canvas>
        <div class="grid grid-cols-4 gap-2 mt-3">
          <button id="as-l" class="axiom-dpad-btn py-3">◀ TURN</button>
          <button id="as-t" class="axiom-dpad-btn py-3">▲ THRUST</button>
          <button id="as-r" class="axiom-dpad-btn py-3">TURN ▶</button>
          <button id="as-f" class="axiom-dpad-btn py-3">● FIRE</button>
        </div>
      </div>`;

    const cv = container.querySelector('#as-cv');
    const ctx = cv.getContext('2d');
    const scoreEl = container.querySelector('#as-score');
    const rocksEl = container.querySelector('#as-rocks');
    const livesEl = container.querySelector('#as-lives');

    const wrap = (v, max) => (v < 0 ? v + max : v >= max ? v - max : v);

    function fire() {
      if (over || ship.cool > 0 || bullets.length >= 5) return;
      bullets.push({ x: ship.x + Math.cos(ship.a) * 12, y: ship.y + Math.sin(ship.a) * 12,
                     vx: Math.cos(ship.a) * 6 + ship.vx, vy: Math.sin(ship.a) * 6 + ship.vy, life: 60 });
      ship.cool = 8;
      soundFx.playClick();
    }

    function loseShip() {
      lives--;
      livesEl.innerText = '▲'.repeat(Math.max(0, lives)) || '—';
      soundFx.playHit();
      if (lives <= 0) return end();
      reset(false);
    }

    function step() {
      tick++;
      if (keys.left) ship.a -= 0.075;
      if (keys.right) ship.a += 0.075;
      if (keys.thrust) { ship.vx += Math.cos(ship.a) * 0.13; ship.vy += Math.sin(ship.a) * 0.13; }
      ship.vx *= 0.99; ship.vy *= 0.99;
      ship.x = wrap(ship.x + ship.vx, W); ship.y = wrap(ship.y + ship.vy, H);
      if (ship.cool > 0) ship.cool--;
      if (ship.safe > 0) ship.safe--;

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x = wrap(b.x + b.vx, W); b.y = wrap(b.y + b.vy, H);
        if (--b.life <= 0) bullets.splice(i, 1);
      }

      rocks.forEach(r => {
        r.x = wrap(r.x + r.vx, W); r.y = wrap(r.y + r.vy, H); r.rot += r.spin;
      });

      // bullet → rock (backwards so splices are safe)
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        for (let ri = rocks.length - 1; ri >= 0; ri--) {
          const b = bullets[bi], r = rocks[ri];
          if (!b || !r) continue;
          if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
            bullets.splice(bi, 1);
            rocks.splice(ri, 1);
            score += (4 - r.size) * 20;
            scoreEl.innerText = score;
            soundFx.playHit();
            if (r.size > 1) {
              rocks.push(makeRock(r.x, r.y, r.size - 1));
              rocks.push(makeRock(r.x, r.y, r.size - 1));
            }
            break;
          }
        }
      }

      // rock → ship
      if (ship.safe <= 0) {
        for (const r of rocks) {
          if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 7) { loseShip(); break; }
        }
      }

      if (!over && rocks.length === 0) {
        soundFx.playWin();
        score += 100;
        scoreEl.innerText = score;
        spawnWave(Math.min(8, 4 + Math.floor(score / 500)));
      }
      rocksEl.innerText = rocks.length;
      draw();
    }

    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5;

      rocks.forEach(r => {
        ctx.beginPath();
        r.pts.forEach((p, i) => {
          const ang = r.rot + (i / r.pts.length) * Math.PI * 2;
          const px = r.x + Math.cos(ang) * r.r * p, py = r.y + Math.sin(ang) * r.r * p;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.closePath(); ctx.stroke();
      });

      ctx.fillStyle = INK;
      bullets.forEach(b => ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3));

      if (!over && (ship.safe <= 0 || Math.floor(tick / 5) % 2)) {
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(ship.x + Math.cos(ship.a) * 13, ship.y + Math.sin(ship.a) * 13);
        ctx.lineTo(ship.x + Math.cos(ship.a + 2.5) * 10, ship.y + Math.sin(ship.a + 2.5) * 10);
        ctx.lineTo(ship.x + Math.cos(ship.a - 2.5) * 10, ship.y + Math.sin(ship.a - 2.5) * 10);
        ctx.closePath(); ctx.stroke();
        if (keys.thrust && Math.floor(tick / 3) % 2) {
          ctx.strokeStyle = AMBER;
          ctx.beginPath();
          ctx.moveTo(ship.x - Math.cos(ship.a) * 9, ship.y - Math.sin(ship.a) * 9);
          ctx.lineTo(ship.x - Math.cos(ship.a) * 16, ship.y - Math.sin(ship.a) * 16);
          ctx.stroke();
        }
      }
    }

    function end() {
      over = true;
      stop();
      showResult({
        container,
        title: score >= 800 ? 'BELT CLEARED' : 'SHIP LOST',
        message: `${score} points. Rocks split when hit — the small ones move fastest and are worth the most. Thrust is momentum, not steering: you stop by turning around and burning back.`,
        score,
        gameId: 'asteroids',
        tone: score >= 800 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      kb.destroy();
      if (renderAsteroids._releaseKeys) renderAsteroids._releaseKeys();
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowLeft: () => { keys.left = true; }, ArrowRight: () => { keys.right = true; },
      ArrowUp: () => { keys.thrust = true; }, ' ': () => fire()
    });
    const onUp = (e) => {
      if (e.key === 'ArrowLeft') keys.left = false;
      if (e.key === 'ArrowRight') keys.right = false;
      if (e.key === 'ArrowUp') keys.thrust = false;
    };
    window.addEventListener('keyup', onUp);
    // Restart path re-runs start(); release the previous listener first.
    if (renderAsteroids._releaseKeys) renderAsteroids._releaseKeys();
    renderAsteroids._releaseKeys = () => window.removeEventListener('keyup', onUp);

    const hold = (el, on, off) => {
      el.onmousedown = on; el.onmouseup = off; el.onmouseleave = off;
      el.ontouchstart = (e) => { e.preventDefault(); on(); };
      el.ontouchend = (e) => { e.preventDefault(); off(); };
    };
    hold(container.querySelector('#as-l'), () => keys.left = true, () => keys.left = false);
    hold(container.querySelector('#as-r'), () => keys.right = true, () => keys.right = false);
    hold(container.querySelector('#as-t'), () => keys.thrust = true, () => keys.thrust = false);
    container.querySelector('#as-f').onclick = fire;

    container.querySelector('#close-game-btn').onclick = () => {
      stop(); renderAsteroids._releaseKeys(); onClose();
    };

    reset(true);
    rocksEl.innerText = rocks.length;   // paint before the first frame
    draw();
    const loop = () => { if (over) return; step(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
}

/* ===========================================================================
 * 2. FROGGER — Konami 1981
 * Cross five lanes of traffic. Each safe crossing scores and speeds the
 * road up. Three lives, one clock.
 * ======================================================================== */
export function renderFrogger(container, onClose) {
  start();

  function start() {
    const COLS = 11, ROWS = 8, CELL = 40;
    const W = COLS * CELL, H = ROWS * CELL;
    let frog, lanes, score, lives, crossings, over, raf = null, speedMul;

    // Row 0 is the goal bank, row 7 the start bank, and row 4 is the MEDIAN —
    // a safe strip with no traffic. Playtesting without it was brutal: six
    // dense lanes back-to-back left a blind crossing at roughly 0.5%, and even
    // careful play had nowhere to stand and read the next gap. The original
    // arcade game has a median for exactly this reason.
    const MEDIAN_ROW = 4;
    function buildLanes() {
      lanes = [];
      for (let r = 1; r <= 6; r++) {
        if (r === MEDIAN_ROW) continue;
        const dir = r % 2 === 0 ? 1 : -1;
        const speed = (0.7 + Math.random() * 0.9) * speedMul * dir;
        const gap = 4 + Math.floor(Math.random() * 2);
        const cars = [];
        for (let i = 0; i < Math.ceil(COLS / gap); i++) cars.push(i * gap * CELL + Math.random() * 20);
        lanes.push({ row: r, speed, cars, len: CELL * 1.6 });
      }
    }

    function reset(full) {
      frog = { c: Math.floor(COLS / 2), r: ROWS - 1 };
      if (full) { score = 0; lives = 3; crossings = 0; over = false; speedMul = 1; buildLanes(); }
    }

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🐸', 'FROGGER', 'Konami 1981 · cross the road, mind the gaps')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Arrow keys or the pad below. Reach the far bank — every crossing scores and the traffic gets faster.
          The green strip in the middle is safe: wait there and read the next gap. Touch a car and you lose a frog.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
          <div>SCORE <span id="fr-score" class="text-amber-400 text-base">0</span></div>
          <div>CROSSED <span id="fr-cross" class="text-white text-base">0</span></div>
          <div>FROGS <span id="fr-lives" class="text-white text-base">🐸🐸🐸</span></div>
        </div>
        <canvas id="fr-cv" width="${W}" height="${H}" class="block mx-auto bg-black border border-amber-500/40" style="max-width:100%;height:auto"></canvas>
        <div class="grid grid-cols-3 gap-2 mt-3 max-w-[260px] mx-auto">
          <div></div><button id="fr-u" class="axiom-dpad-btn py-3">▲</button><div></div>
          <button id="fr-l" class="axiom-dpad-btn py-3">◀</button>
          <button id="fr-d" class="axiom-dpad-btn py-3">▼</button>
          <button id="fr-r" class="axiom-dpad-btn py-3">▶</button>
        </div>
      </div>`;

    const cv = container.querySelector('#fr-cv');
    const ctx = cv.getContext('2d');
    const scoreEl = container.querySelector('#fr-score');
    const crossEl = container.querySelector('#fr-cross');
    const livesEl = container.querySelector('#fr-lives');

    function move(dc, dr) {
      if (over) return;
      frog.c = Math.max(0, Math.min(COLS - 1, frog.c + dc));
      frog.r = Math.max(0, Math.min(ROWS - 1, frog.r + dr));
      soundFx.playClick();
      if (frog.r === 0) {
        crossings++; score += 100;
        speedMul = Math.min(2.6, speedMul + 0.18);
        buildLanes();
        scoreEl.innerText = score; crossEl.innerText = crossings;
        soundFx.playCoin();
        reset(false);
      }
    }

    function hit() {
      lives--;
      livesEl.innerText = '🐸'.repeat(Math.max(0, lives)) || '—';
      soundFx.playHit();
      if (lives <= 0) return end();
      reset(false);
    }

    function step() {
      lanes.forEach(l => {
        l.cars = l.cars.map(x => {
          let nx = x + l.speed;
          if (nx > W + l.len) nx = -l.len;
          if (nx < -l.len) nx = W + l.len;
          return nx;
        });
      });

      const lane = lanes.find(l => l.row === frog.r);
      if (lane) {
        const fx = frog.c * CELL + CELL / 2;
        for (const cx of lane.cars) {
          if (fx > cx && fx < cx + lane.len) { hit(); break; }
        }
      }
      draw();
    }

    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      // banks + median — the safe rows read green so the eye finds them
      ctx.fillStyle = '#12331f';
      ctx.fillRect(0, 0, W, CELL);
      ctx.fillRect(0, (ROWS - 1) * CELL, W, CELL);
      ctx.fillRect(0, MEDIAN_ROW * CELL, W, CELL);
      // lane rules
      ctx.strokeStyle = 'rgba(230,237,243,0.14)';
      for (let r = 1; r <= 6; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke();
      }
      // cars
      lanes.forEach(l => {
        ctx.fillStyle = l.speed > 0 ? AMBER : '#f85149';
        l.cars.forEach(cx => ctx.fillRect(cx, l.row * CELL + 7, l.len, CELL - 14));
      });
      // goal markers
      ctx.fillStyle = 'rgba(245,158,11,0.35)';
      for (let c = 0; c < COLS; c += 2) ctx.fillRect(c * CELL + 8, 8, CELL - 16, CELL - 16);
      // frog
      ctx.fillStyle = '#3fb950';
      ctx.fillRect(frog.c * CELL + 8, frog.r * CELL + 8, CELL - 16, CELL - 16);
      ctx.fillStyle = '#0a0e14';
      ctx.fillRect(frog.c * CELL + 14, frog.r * CELL + 14, 4, 4);
      ctx.fillRect(frog.c * CELL + CELL - 18, frog.r * CELL + 14, 4, 4);
    }

    function end() {
      over = true; stop();
      showResult({
        container,
        title: crossings >= 5 ? 'ROAD MASTERED' : 'FLATTENED',
        message: `${crossings} crossing${crossings === 1 ? '' : 's'} for ${score} points. Each crossing rebuilds the road faster — the gaps stop lining up and you have to move on the beat instead of on the gap.`,
        score,
        gameId: 'frogger',
        tone: crossings >= 5 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } kb.destroy(); }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowUp: () => move(0, -1), ArrowDown: () => move(0, 1),
      ArrowLeft: () => move(-1, 0), ArrowRight: () => move(1, 0)
    });
    container.querySelector('#fr-u').onclick = () => move(0, -1);
    container.querySelector('#fr-d').onclick = () => move(0, 1);
    container.querySelector('#fr-l').onclick = () => move(-1, 0);
    container.querySelector('#fr-r').onclick = () => move(1, 0);
    container.querySelector('#close-game-btn').onclick = () => { stop(); onClose(); };

    reset(true);
    draw();                              // paint before the first frame
    const loop = () => { if (over) return; step(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
}

/* ===========================================================================
 * 3. CONNECT FOUR — minimax with alpha-beta pruning
 * The first cartridge on this floor that plays back. Depth 5 search with a
 * window-scoring heuristic: good enough to punish a careless move, beatable
 * with a real plan.
 * ======================================================================== */
export function renderConnectFour(container, onClose) {
  start();

  function start() {
    const COLS = 7, ROWS = 6, HUMAN = 1, AI = 2, DEPTH = 5;
    let board, turn, over, wins = 0, moves = 0, thinking = false;

    const fresh = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));

    const valid = (b, c) => b[0][c] === 0;
    const dropRow = (b, c) => { for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === 0) return r; return -1; };

    function winnerAt(b, p) {
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== p) continue;
        for (const [dr, dc] of dirs) {
          let n = 1;
          while (n < 4) {
            const nr = r + dr * n, nc = c + dc * n;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
            n++;
          }
          if (n === 4) return [[r, c], [r + dr, c + dc], [r + dr * 2, c + dc * 2], [r + dr * 3, c + dc * 3]];
        }
      }
      return null;
    }

    const full = b => b[0].every(v => v !== 0);

    function scoreWindow(w, p) {
      const opp = p === AI ? HUMAN : AI;
      const me = w.filter(v => v === p).length;
      const them = w.filter(v => v === opp).length;
      const empty = w.filter(v => v === 0).length;
      if (me === 4) return 10000;
      if (me === 3 && empty === 1) return 60;
      if (me === 2 && empty === 2) return 8;
      if (them === 3 && empty === 1) return -80;   // block harder than we build
      return 0;
    }

    function evaluate(b, p) {
      let s = 0;
      // centre control is worth real tempo in Connect Four
      for (let r = 0; r < ROWS; r++) if (b[r][3] === p) s += 6;
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of dirs) {
          const er = r + dr * 3, ec = c + dc * 3;
          if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
          const w = [0, 1, 2, 3].map(i => b[r + dr * i][c + dc * i]);
          s += scoreWindow(w, p);
        }
      }
      return s;
    }

    function minimax(b, depth, alpha, beta, maximizing) {
      const aiWin = winnerAt(b, AI), huWin = winnerAt(b, HUMAN);
      if (aiWin) return [null, 100000 + depth];
      if (huWin) return [null, -100000 - depth];
      if (full(b) || depth === 0) return [null, evaluate(b, AI)];

      // search centre-out: better pruning, and it plays more naturally
      const order = [3, 2, 4, 1, 5, 0, 6].filter(c => valid(b, c));
      let best = order[0], val = maximizing ? -Infinity : Infinity;

      for (const c of order) {
        const r = dropRow(b, c);
        b[r][c] = maximizing ? AI : HUMAN;
        const [, sc] = minimax(b, depth - 1, alpha, beta, !maximizing);
        b[r][c] = 0;
        if (maximizing ? sc > val : sc < val) { val = sc; best = c; }
        if (maximizing) alpha = Math.max(alpha, val); else beta = Math.min(beta, val);
        if (alpha >= beta) break;
      }
      return [best, val];
    }

    function render(highlight) {
      const hl = new Set((highlight || []).map(([r, c]) => `${r},${c}`));
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🔴', 'CONNECT FOUR', 'Minimax opponent · it is actually thinking')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Drop a disc into any column. Four in a row — any direction — wins.
            The machine searches five moves ahead, so a careless drop gets punished.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>YOU <span class="text-amber-400 text-base">${wins}</span></div>
            <div id="c4-status" class="text-white">${over ? 'ROUND OVER' : thinking ? 'THINKING…' : 'YOUR MOVE'}</div>
            <div>MOVES <span class="text-white text-base">${moves}</span></div>
          </div>
          <div class="grid grid-cols-7 gap-1 mb-2">
            ${Array.from({ length: COLS }, (_, c) => `
              <button class="c4-col axiom-dpad-btn text-xs" style="min-height:44px" data-c="${c}" ${over || thinking || !valid(board, c) ? 'disabled' : ''}>▼</button>`).join('')}
          </div>
          <div class="grid grid-cols-7 gap-1 bg-zinc-950 border border-amber-500/40 p-2">
            ${board.map((row, r) => row.map((v, c) => {
              const on = hl.has(`${r},${c}`);
              const fill = v === HUMAN ? '#f59e0b' : v === AI ? '#e6edf3' : 'transparent';
              const brd = on ? '#3fb950' : 'rgba(245,158,11,0.3)';
              return `<div class="aspect-square flex items-center justify-center" style="border:1px solid ${brd}">
                ${v ? `<span style="display:block;width:74%;aspect-ratio:1;background:${fill};border-radius:50%"></span>` : ''}
              </div>`;
            }).join('')).join('')}
          </div>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.c4-col').forEach(b => {
        b.onclick = () => humanMove(parseInt(b.dataset.c, 10));
      });
    }

    function humanMove(c) {
      if (over || thinking || !valid(board, c)) return;
      const r = dropRow(board, c);
      board[r][c] = HUMAN;
      moves++;
      soundFx.playClick();
      const w = winnerAt(board, HUMAN);
      if (w) { wins++; return finish('YOU WIN', w, true); }
      if (full(board)) return finish('DRAW', null, false);

      thinking = true;
      render();
      // Yield a frame so THINKING… paints before the search blocks.
      setTimeout(() => {
        const [col] = minimax(board, DEPTH, -Infinity, Infinity, true);
        const ar = dropRow(board, col ?? board[0].findIndex((_, i) => valid(board, i)));
        const ac = col ?? board[0].findIndex((_, i) => valid(board, i));
        if (ar >= 0) board[ar][ac] = AI;
        moves++;
        thinking = false;
        soundFx.playHit();
        const aw = winnerAt(board, AI);
        if (aw) return finish('MACHINE WINS', aw, false);
        if (full(board)) return finish('DRAW', null, false);
        render();
      }, 40);
    }

    function finish(title, line, won) {
      over = true;
      render(line);
      setTimeout(() => {
        showResult({
          container,
          title,
          message: won
            ? `Beaten in ${moves} moves. It searched five plies with alpha-beta pruning and centre-first ordering — you out-planned an actual search tree.`
            : `${moves} moves. It looks five moves ahead and values blocking above building, so the trap is usually set two moves before you see it. Watch the centre column.`,
          score: won ? Math.max(10, 200 - moves * 4) : 0,
          gameId: 'connect-four',
          tone: won ? 'win' : 'over',
          onRestart: () => { board = fresh(); over = false; moves = 0; render(); },
          onClose
        });
      }, 650);
    }

    board = fresh(); turn = HUMAN; over = false;
    render();
  }
}

/* ===========================================================================
 * 4. KLONDIKE SOLITAIRE
 * Click a card, click where it goes. Draw-1 stock, standard rules:
 * tableau descends in alternating colours, foundations ascend by suit,
 * only a King fills an empty column.
 * ======================================================================== */
export function renderSolitaire(container, onClose) {
  start();

  function start() {
    const SUITS = [{ s: '♠', red: false }, { s: '♥', red: true }, { s: '♦', red: true }, { s: '♣', red: false }];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let stock, waste, foundations, tableau, sel, moves, over;

    function deal() {
      const deck = [];
      SUITS.forEach(({ s, red }) => RANKS.forEach((r, i) => deck.push({ r, s, red, v: i + 1, up: false })));
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      tableau = [];
      for (let c = 0; c < 7; c++) {
        const pile = deck.splice(0, c + 1);
        pile[pile.length - 1].up = true;
        tableau.push(pile);
      }
      stock = deck; waste = []; foundations = [[], [], [], []];
      sel = null; moves = 0; over = false;
    }

    const top = a => a[a.length - 1];

    function canStack(card, onto) {
      if (!onto) return card.r === 'K';           // empty column takes a King only
      return onto.up && onto.red !== card.red && onto.v === card.v + 1;
    }
    function canFound(card, f) {
      const t = top(f);
      if (!t) return card.v === 1;
      return t.s === card.s && card.v === t.v + 1;
    }

    function autoWinCheck() {
      if (foundations.every(f => f.length === 13)) {
        over = true;
        soundFx.playWin();
        showResult({
          container,
          title: 'SOLVED',
          message: `Cleared in ${moves} moves. Roughly 79% of Klondike deals are winnable — the rest are lost at the shuffle, not at the table.`,
          score: Math.max(50, 800 - moves * 2),
          gameId: 'solitaire',
          tone: 'win',
          onRestart: () => start(),
          onClose
        });
        return true;
      }
      return false;
    }

    function drawStock() {
      if (stock.length) {
        const c = stock.pop(); c.up = true; waste.push(c);
      } else if (waste.length) {
        stock = waste.reverse().map(c => ({ ...c, up: false })); waste = [];
      }
      moves++; sel = null; soundFx.playClick(); render();
    }

    // sel shape: {from:'waste'|'t'|'f', pile:number, idx:number}
    function pick(from, pile, idx) {
      if (over) return;
      const card = from === 'waste' ? top(waste) : from === 't' ? tableau[pile][idx] : top(foundations[pile]);
      if (!card || !card.up) return;
      if (sel && sel.from === from && sel.pile === pile && sel.idx === idx) { sel = null; return render(); }
      sel = { from, pile, idx };
      render();
    }

    function place(toKind, toPile) {
      if (!sel || over) return;
      let moving;
      if (sel.from === 'waste') moving = [top(waste)];
      else if (sel.from === 't') moving = tableau[sel.pile].slice(sel.idx);
      else moving = [top(foundations[sel.pile])];
      if (!moving.length || !moving[0]) { sel = null; return render(); }

      let ok = false;
      if (toKind === 'f') {
        ok = moving.length === 1 && canFound(moving[0], foundations[toPile]);
        if (ok) foundations[toPile].push(moving[0]);
      } else {
        ok = canStack(moving[0], top(tableau[toPile]));
        if (ok) tableau[toPile].push(...moving);
      }
      if (!ok) { soundFx.playHit(); sel = null; return render(); }

      // remove from source
      if (sel.from === 'waste') waste.pop();
      else if (sel.from === 't') {
        tableau[sel.pile].length = sel.idx;
        const t = top(tableau[sel.pile]);
        if (t && !t.up) { t.up = true; soundFx.playCoin(); }
      } else foundations[sel.pile].pop();

      moves++; sel = null; soundFx.playClick();
      if (!autoWinCheck()) render();
    }

    const cardFace = (c, selected) => `
      <span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;
        background:${c.up ? '#e6edf3' : '#1b2430'};
        border:1px solid ${selected ? '#3fb950' : c.up ? 'rgba(10,14,20,0.35)' : 'rgba(245,158,11,0.3)'};
        color:${c.red ? '#c2321f' : '#0a0e14'};font-weight:700;font-size:12px;letter-spacing:-0.02em">
        ${c.up ? c.r + c.s : ''}
      </span>`;

    function render() {
      const selKey = sel ? `${sel.from}-${sel.pile}-${sel.idx}` : '';
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🂡', 'KLONDIKE', 'Draw one · click a card, then click where it goes')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Tableau builds down in alternating colours. Foundations build up by suit from the Ace.
            Only a King moves into an empty column. Click the deck to draw.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>MOVES <span class="text-white text-base">${moves}</span></div>
            <div>HOME <span class="text-amber-400 text-base">${foundations.reduce((n, f) => n + f.length, 0)}/52</span></div>
            <div>STOCK <span class="text-white text-base">${stock.length}</span></div>
            <button id="sol-new-deal" style="border:1px solid rgba(245,158,11,0.5);color:#f59e0b;font-size:10px;font-weight:700;padding:4px 8px">NEW DEAL</button>
          </div>

          <div class="grid grid-cols-7 gap-1 mb-3">
            <button id="sol-stock" class="aspect-[2/3]" style="border:1px solid rgba(245,158,11,0.5);background:${stock.length ? '#1b2430' : 'transparent'};color:#f59e0b;font-size:10px;font-weight:700">
              ${stock.length ? 'DECK' : '↻'}
            </button>
            <button class="sol-pick aspect-[2/3]" data-from="waste" data-pile="0" data-idx="0" style="border:0;padding:0;background:transparent">
              ${waste.length ? cardFace(top(waste), selKey === 'waste-0-0') : '<span style="display:block;width:100%;height:100%;border:1px dashed rgba(245,158,11,0.3)"></span>'}
            </button>
            <div></div>
            ${foundations.map((f, i) => `
              <button class="sol-drop aspect-[2/3]" data-kind="f" data-pile="${i}" style="border:0;padding:0;background:transparent">
                ${f.length ? cardFace(top(f), false) : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border:1px dashed rgba(245,158,11,0.45);color:#f59e0b;font-size:14px">${SUITS[i].s}</span>`}
              </button>`).join('')}
          </div>

          <div class="grid grid-cols-7 gap-1 bg-zinc-950 border border-amber-500/40 p-2" style="min-height:210px;align-items:start">
            ${tableau.map((pile, c) => `
              <div class="flex flex-col gap-0.5">
                ${pile.length ? pile.map((card, i) => `
                  <button class="sol-pick" data-from="t" data-pile="${c}" data-idx="${i}"
                          style="border:0;padding:0;background:transparent;height:${i === pile.length - 1 ? 44 : 30}px">
                    ${cardFace(card, selKey === `t-${c}-${i}`)}
                  </button>`).join('') : ''}
                <button class="sol-drop" data-kind="t" data-pile="${c}"
                        style="border:1px dashed rgba(245,158,11,0.28);min-height:44px;color:#f59e0b;font-size:9px">${pile.length ? '' : 'K'}</button>
              </div>`).join('')}
          </div>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelector('#sol-new-deal').onclick = () => {
        // ~1 in 5 Klondike deals is unwinnable — a fresh deal beats a dead board.
        deal();
        render();
      };
      container.querySelector('#sol-stock').onclick = drawStock;
      container.querySelectorAll('.sol-pick').forEach(b => {
        b.onclick = () => pick(b.dataset.from, +b.dataset.pile, +b.dataset.idx);
      });
      container.querySelectorAll('.sol-drop').forEach(b => {
        b.onclick = () => place(b.dataset.kind, +b.dataset.pile);
      });
    }

    deal();
    render();
  }
}
