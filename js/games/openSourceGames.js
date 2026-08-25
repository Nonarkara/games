/**
 * Open-source arcade adaptations.
 *
 * Breakout: adapted from Ania Kubow's `kubowania/breakout` (MIT).
 * Pong: adapted from Jake Gordon's `jakesgordon/javascript-pong` (MIT).
 * Sudoku Sprint: puzzle set + play loop after studying `robatron/sudoku.js` (MIT).
 * Fifteen Puzzle: play loop after studying `imshubhamsingh/15-puzzle` (MIT).
 *
 * The renderers and mobile controls are original to NGS. The sources
 * are credited in-game and in CREDITS.md as required by the Ongard Move.
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { showResult } from '../ui.js';

export function paddleEnglish(ballX, paddleX, paddleWidth) {
  const half = paddleWidth / 2;
  return Math.max(-1, Math.min(1, (ballX - (paddleX + half)) / half));
}

export function pongIntercept(ballY, paddleY, paddleHeight) {
  const half = paddleHeight / 2;
  return Math.max(-1, Math.min(1, (ballY - (paddleY + half)) / half));
}

function gameFrame({ title, subtitle, score, high, credit, canvasId }) {
  return `
    <section class="oss-game" aria-label="${title}">
      <header class="oss-game__header">
        <div>
          <p class="oss-game__eyebrow">OPEN-SOURCE ARCADE ADAPTATION</p>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <div class="oss-game__score" aria-live="polite">
          <span>SCORE <b id="oss-score">${score}</b></span>
          <span>HIGH <b id="oss-high">${high}</b></span>
        </div>
      </header>
      <div class="oss-game__screen">
        <canvas id="${canvasId}" width="640" height="420"></canvas>
        <button class="oss-game__serve" id="oss-serve" type="button">START ROUND</button>
      </div>
      <div class="oss-game__controls">
        <span>KEYS: ARROWS / A D</span>
        <span>TOUCH: DRAG ON SCREEN</span>
        <a href="${credit.url}" target="_blank" rel="noopener">SOURCE: ${credit.name} · MIT</a>
      </div>
    </section>`;
}

export function renderArcadeBreakout(container, onClose) {
  // PLAY AGAIN re-runs this renderer; drop the previous round's window key
  // handlers so stale preventDefaults and paddle state cannot stack.
  if (renderArcadeBreakout._releaseKeys) renderArcadeBreakout._releaseKeys();
  const credit = { name: 'ANIA KUBOW / BREAKOUT', url: 'https://github.com/kubowania/breakout' };
  let score = 0;
  let high = StorageService.getHighScore('arcade-breakout');
  let running = false;
  let over = false;
  let raf = 0;

  container.innerHTML = gameFrame({
    title: 'BREAKOUT 1976',
    subtitle: 'Clear the wall. Shape the rebound.',
    score, high, credit, canvasId: 'breakout-canvas'
  });

  const canvas = container.querySelector('#breakout-canvas');
  const ctx = canvas.getContext('2d');
  const serve = container.querySelector('#oss-serve');
  const keys = new Set();
  const paddle = { x: 255, y: 384, w: 130, h: 12, speed: 8 };
  const ball = { x: 320, y: 365, r: 7, dx: 4.1, dy: -4.1 };
  const brickRows = 5;
  const brickCols = 9;
  const bricks = Array.from({ length: brickRows * brickCols }, (_, index) => ({
    row: Math.floor(index / brickCols), col: index % brickCols, alive: true
  }));

  function updateScore() {
    high = Math.max(high, score);
    container.querySelector('#oss-score').textContent = score;
    container.querySelector('#oss-high').textContent = high;
  }

  function resetBall() {
    ball.x = paddle.x + paddle.w / 2;
    ball.y = paddle.y - 12;
    ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4.1;
    ball.dy = -4.1;
  }

  function draw() {
    ctx.fillStyle = '#111018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#d8d4ca';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    for (const brick of bricks) {
      if (!brick.alive) continue;
      const x = 20 + brick.col * 68;
      const y = 34 + brick.row * 27;
      ctx.fillStyle = brick.row === 0 ? '#A8322B' : brick.row < 3 ? '#26243F' : '#8f8b80';
      ctx.fillRect(x, y, 62, 19);
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#f6f5f2';
    ctx.fill();

    ctx.strokeStyle = 'rgba(246,245,242,.12)';
    ctx.setLineDash([2, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 210);
    ctx.lineTo(640, 210);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function finish(won) {
    if (over) return;
    over = true;
    running = false;
    cancelAnimationFrame(raf);
    showResult({
      container,
      title: won ? 'WALL CLEARED' : 'BALL LOST',
      message: won ? 'You kept the rally alive long enough to open every lane.' : 'Read the exit angle earlier on the next serve.',
      score,
      gameId: 'arcade-breakout',
      tone: won ? 'win' : 'over',
      onRestart: () => renderArcadeBreakout(container, onClose),
      onClose
    });
  }

  function collideBricks() {
    for (const brick of bricks) {
      if (!brick.alive) continue;
      const x = 20 + brick.col * 68;
      const y = 34 + brick.row * 27;
      if (ball.x + ball.r > x && ball.x - ball.r < x + 62 && ball.y + ball.r > y && ball.y - ball.r < y + 19) {
        brick.alive = false;
        ball.dy *= -1;
        score += 10 + (brickRows - brick.row) * 2;
        updateScore();
        soundFx.playCoin();
        if (bricks.every(item => !item.alive)) finish(true);
        return;
      }
    }
  }

  function tick() {
    if (!running || over) return;
    if (keys.has('ArrowLeft') || keys.has('a')) paddle.x -= paddle.speed;
    if (keys.has('ArrowRight') || keys.has('d')) paddle.x += paddle.speed;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, paddle.x));

    ball.x += ball.dx;
    ball.y += ball.dy;
    if (ball.x - ball.r <= 0 || ball.x + ball.r >= canvas.width) ball.dx *= -1;
    if (ball.y - ball.r <= 0) ball.dy = Math.abs(ball.dy);

    if (ball.dy > 0 && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w) {
      const english = paddleEnglish(ball.x, paddle.x, paddle.w);
      ball.dx = english * 6.2;
      ball.dy = -Math.max(3.6, 6.2 - Math.abs(ball.dx) * 0.24);
      ball.y = paddle.y - ball.r;
      soundFx.playClick();
    }

    collideBricks();
    if (ball.y - ball.r > canvas.height) return finish(false);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.w, x - paddle.w / 2));
    if (!running) resetBall();
    draw();
  }

  const onKeydown = event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === ' ' && !running) serve.click();
  };
  const onKeyup = event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('keyup', onKeyup);
  renderArcadeBreakout._releaseKeys = () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  };
  canvas.addEventListener('pointermove', event => movePaddle(event.clientX));
  canvas.addEventListener('pointerdown', event => {
    movePaddle(event.clientX);
    if (!running) serve.click();
  });
  serve.onclick = () => {
    if (running || over) return;
    running = true;
    serve.hidden = true;
    soundFx.playClick();
    raf = requestAnimationFrame(tick);
  };

  resetBall();
  draw();
}

export function renderArcadePong(container, onClose) {
  // Same restart-stacking fix as Breakout above.
  if (renderArcadePong._releaseKeys) renderArcadePong._releaseKeys();
  const credit = { name: 'JAKE GORDON / JAVASCRIPT-PONG', url: 'https://github.com/jakesgordon/javascript-pong' };
  let playerScore = 0;
  let cpuScore = 0;
  let running = false;
  let over = false;
  let raf = 0;
  const high = StorageService.getHighScore('arcade-pong');

  container.innerHTML = gameFrame({
    title: 'PONG 1972',
    subtitle: 'First to seven. Read the angle before the line.',
    score: '0–0', high, credit, canvasId: 'pong-canvas'
  });

  const canvas = container.querySelector('#pong-canvas');
  const ctx = canvas.getContext('2d');
  const serve = container.querySelector('#oss-serve');
  const keys = new Set();
  const player = { x: 22, y: 165, w: 12, h: 90 };
  const cpu = { x: 606, y: 165, w: 12, h: 90 };
  const ball = { x: 320, y: 210, r: 7, dx: -5, dy: 2.2 };

  function scoreText() {
    container.querySelector('#oss-score').textContent = `${playerScore}–${cpuScore}`;
    container.querySelector('#oss-high').textContent = Math.max(high, playerScore * 100 - cpuScore * 25);
  }

  function resetBall(direction) {
    ball.x = 320;
    ball.y = 210;
    ball.dx = direction * 5;
    ball.dy = (Math.random() * 4) - 2;
  }

  function draw() {
    ctx.fillStyle = '#111018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(246,245,242,.28)';
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(320, 0);
    ctx.lineTo(320, 420);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f6f5f2';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#8f8b80';
    ctx.fillRect(cpu.x, cpu.y, cpu.w, cpu.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#A8322B';
    ctx.fill();
    ctx.font = '600 42px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(246,245,242,.16)';
    ctx.fillText(playerScore, 270, 64);
    ctx.fillText(cpuScore, 370, 64);
  }

  function finish() {
    if (over) return;
    over = true;
    running = false;
    cancelAnimationFrame(raf);
    const won = playerScore >= 7;
    // First to seven against ceiling 21: a 7-0 sweep is the perfect game.
    const score = Math.max(0, playerScore * 3 - cpuScore);
    showResult({
      container,
      title: won ? 'MATCH WON' : 'CPU WINS',
      message: `${playerScore}–${cpuScore}. ${won ? 'Your anticipation held.' : 'Move on the forecast, not the arrival.'}`,
      score,
      gameId: 'arcade-pong',
      tone: won ? 'win' : 'over',
      onRestart: () => renderArcadePong(container, onClose),
      onClose
    });
  }

  function hitPaddle(paddle, fromLeft) {
    const overlapX = fromLeft
      ? ball.x - ball.r <= paddle.x + paddle.w && ball.x > paddle.x
      : ball.x + ball.r >= paddle.x && ball.x < paddle.x + paddle.w;
    const overlapY = ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h;
    if (!overlapX || !overlapY) return false;
    const angle = pongIntercept(ball.y, paddle.y, paddle.h);
    ball.dx = (fromLeft ? 1 : -1) * Math.min(8.2, Math.abs(ball.dx) + 0.22);
    ball.dy = angle * 6.4;
    ball.x = fromLeft ? paddle.x + paddle.w + ball.r : paddle.x - ball.r;
    soundFx.playClick();
    return true;
  }

  function tick() {
    if (!running || over) return;
    if (keys.has('ArrowUp') || keys.has('w')) player.y -= 7;
    if (keys.has('ArrowDown') || keys.has('s')) player.y += 7;
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

    const cpuTarget = ball.y - cpu.h / 2;
    cpu.y += Math.max(-4.25, Math.min(4.25, cpuTarget - cpu.y));
    cpu.y = Math.max(0, Math.min(canvas.height - cpu.h, cpu.y));

    ball.x += ball.dx;
    ball.y += ball.dy;
    if (ball.y - ball.r <= 0 || ball.y + ball.r >= canvas.height) ball.dy *= -1;
    if (ball.dx < 0) hitPaddle(player, true);
    else hitPaddle(cpu, false);

    if (ball.x + ball.r < 0) {
      cpuScore++;
      scoreText();
      soundFx.playHit();
      if (cpuScore >= 7) return finish();
      resetBall(1);
    } else if (ball.x - ball.r > canvas.width) {
      playerScore++;
      scoreText();
      soundFx.playCoin();
      if (playerScore >= 7) return finish();
      resetBall(-1);
    }

    draw();
    raf = requestAnimationFrame(tick);
  }

  function movePaddle(clientY) {
    const rect = canvas.getBoundingClientRect();
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    player.y = Math.max(0, Math.min(canvas.height - player.h, y - player.h / 2));
    draw();
  }

  const onKeydown = event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === ' ' && !running) serve.click();
  };
  const onKeyup = event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('keyup', onKeyup);
  renderArcadePong._releaseKeys = () => {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('keyup', onKeyup);
  };
  canvas.addEventListener('pointermove', event => movePaddle(event.clientY));
  canvas.addEventListener('pointerdown', event => {
    movePaddle(event.clientY);
    if (!running) serve.click();
  });
  serve.textContent = 'SERVE';
  serve.onclick = () => {
    if (running || over) return;
    running = true;
    serve.hidden = true;
    soundFx.playClick();
    raf = requestAnimationFrame(tick);
  };

  draw();
}

/* ===========================================================================
 * SUDOKU SPRINT — small boards, clock, one clean round
 * Puzzle construction studied from robatron/sudoku.js (MIT). Boards below
 * are authored for NGS; the solver library is not bundled.
 * ======================================================================== */
const SUDOKU_BOARDS = [
  {
    size: 4,
    puzzle: [
      1, 0, 0, 4,
      0, 0, 1, 0,
      0, 3, 0, 0,
      2, 0, 0, 3
    ],
    solution: [
      1, 2, 3, 4,
      3, 4, 1, 2,
      4, 3, 2, 1,
      2, 1, 4, 3
    ]
  },
  {
    size: 4,
    puzzle: [
      0, 2, 0, 0,
      0, 0, 0, 1,
      4, 0, 0, 0,
      0, 0, 3, 0
    ],
    solution: [
      1, 2, 4, 3,
      3, 4, 2, 1,
      4, 3, 1, 2,
      2, 1, 3, 4
    ]
  },
  {
    size: 4,
    puzzle: [
      0, 0, 2, 0,
      3, 0, 0, 0,
      0, 0, 0, 1,
      0, 4, 0, 0
    ],
    solution: [
      4, 1, 2, 3,
      3, 2, 1, 4,
      2, 3, 4, 1,
      1, 4, 3, 2
    ]
  }
];

export function renderSudokuSprint(container, onClose) {
  const credit = { name: 'ROBATRON / SUDOKU.JS', url: 'https://github.com/robatron/sudoku.js' };
  const board = SUDOKU_BOARDS[Math.floor(Math.random() * SUDOKU_BOARDS.length)];
  const { size, puzzle, solution } = board;
  const cells = puzzle.slice();
  const fixed = puzzle.map(v => v !== 0);
  let selected = -1;
  let score = 0;
  let high = StorageService.getHighScore('sudoku-sprint');
  let startedAt = performance.now();
  let mistakes = 0;

  container.innerHTML = `
    <section class="oss-game" aria-label="Sudoku Sprint">
      <header class="oss-game__header">
        <div>
          <p class="oss-game__eyebrow">OPEN-SOURCE PUZZLE STUDY</p>
          <h2>SUDOKU SPRINT</h2>
          <p>${size}×${size} board. Fill every cell. No guessing required.</p>
        </div>
        <div class="oss-game__score" aria-live="polite">
          <span>EMPTY <b id="su-empty">${cells.filter(v => !v).length}</b></span>
          <span>HIGH <b id="su-high">${high}</b></span>
        </div>
      </header>
      <div class="sudoku-board" style="--n:${size}" role="grid" aria-label="Sudoku grid">
        ${cells.map((v, i) => `
          <button type="button" class="sudoku-cell ${fixed[i] ? 'is-fixed' : ''}" data-i="${i}" aria-label="cell ${i + 1}">
            ${v || ''}
          </button>`).join('')}
      </div>
      <div class="sudoku-pad" role="group" aria-label="Digits">
        ${Array.from({ length: size }, (_, n) => `<button type="button" class="sudoku-digit" data-n="${n + 1}">${n + 1}</button>`).join('')}
        <button type="button" class="sudoku-digit" data-n="0">CLR</button>
      </div>
      <div class="oss-game__controls">
        <span>TAP A CELL, THEN A DIGIT</span>
        <a href="${credit.url}" target="_blank" rel="noopener">SOURCE STUDY: ${credit.name} · MIT</a>
      </div>
    </section>`;

  const emptyEl = container.querySelector('#su-empty');

  function paint() {
    container.querySelectorAll('.sudoku-cell').forEach((btn, i) => {
      btn.textContent = cells[i] || '';
      btn.classList.toggle('is-selected', i === selected);
      btn.classList.toggle('is-wrong', !fixed[i] && cells[i] !== 0 && cells[i] !== solution[i]);
    });
    emptyEl.textContent = cells.filter(v => !v).length;
  }

  function place(n) {
    if (selected < 0 || fixed[selected]) return;
    cells[selected] = n;
    if (n !== 0 && n !== solution[selected]) {
      mistakes++;
      soundFx.playHit();
    } else if (n !== 0) {
      soundFx.playClick();
    }
    paint();
    if (cells.every((v, i) => v === solution[i])) {
      const secs = (performance.now() - startedAt) / 1000;
      score = Math.max(50, Math.round(1200 - secs * 8 - mistakes * 40));
      high = Math.max(high, score);
      showResult({
        container,
        title: mistakes === 0 ? 'CLEAN GRID' : 'SOLVED',
        message: `${secs.toFixed(1)}s · ${mistakes} mistake${mistakes === 1 ? '' : 's'}. Constraint satisfaction under a clock.`,
        score,
        gameId: 'sudoku-sprint',
        tone: mistakes === 0 ? 'win' : 'over',
        onRestart: () => renderSudokuSprint(container, onClose),
        onClose
      });
    }
  }

  container.querySelectorAll('.sudoku-cell').forEach(btn => {
    btn.onclick = () => {
      selected = parseInt(btn.dataset.i, 10);
      paint();
    };
  });
  container.querySelectorAll('.sudoku-digit').forEach(btn => {
    btn.onclick = () => place(parseInt(btn.dataset.n, 10));
  });
  paint();
}

/** Count inversions on the 15-puzzle permutation (blank excluded). Even = solvable. */
export function fifteenSolvable(order) {
  let inv = 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i] === 0) continue;
    for (let j = i + 1; j < order.length; j++) {
      if (order[j] !== 0 && order[i] > order[j]) inv++;
    }
  }
  const blankRowFromBottom = 4 - Math.floor(order.indexOf(0) / 4);
  return blankRowFromBottom % 2 === 0 ? inv % 2 === 1 : inv % 2 === 0;
}

function shuffleFifteen() {
  const order = Array.from({ length: 16 }, (_, i) => i);
  do {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (!fifteenSolvable(order) || order.every((v, i) => v === ((i + 1) % 16)));
  return order;
}

export function renderFifteenPuzzle(container, onClose) {
  const credit = { name: 'IMSHUBHAMSINGH / 15-PUZZLE', url: 'https://github.com/imshubhamsingh/15-puzzle' };
  let tiles = shuffleFifteen();
  let moves = 0;
  let high = StorageService.getHighScore('fifteen-puzzle');
  let startedAt = performance.now();

  container.innerHTML = `
    <section class="oss-game" aria-label="Fifteen Puzzle">
      <header class="oss-game__header">
        <div>
          <p class="oss-game__eyebrow">OPEN-SOURCE PUZZLE STUDY</p>
          <h2>FIFTEEN PUZZLE</h2>
          <p>Slide numbered tiles into order. Only the blank cell moves.</p>
        </div>
        <div class="oss-game__score" aria-live="polite">
          <span>MOVES <b id="fp-moves">0</b></span>
          <span>BEST <b id="fp-high">${high || '—'}</b></span>
        </div>
      </header>
      <div class="fifteen-board" role="grid" aria-label="Fifteen puzzle">
        ${tiles.map((v, i) => `
          <button type="button" class="fifteen-tile ${v === 0 ? 'is-blank' : ''}" data-i="${i}" aria-label="${v === 0 ? 'blank' : `tile ${v}`}">
            ${v || ''}
          </button>`).join('')}
      </div>
      <div class="oss-game__controls">
        <button type="button" id="fp-reshuffle">RESHUFFLE</button>
        <a href="${credit.url}" target="_blank" rel="noopener">SOURCE STUDY: ${credit.name} · MIT</a>
      </div>
    </section>`;

  const movesEl = container.querySelector('#fp-moves');

  function paint() {
    container.querySelectorAll('.fifteen-tile').forEach((btn, i) => {
      const v = tiles[i];
      btn.textContent = v || '';
      btn.classList.toggle('is-blank', v === 0);
      btn.setAttribute('aria-label', v === 0 ? 'blank' : `tile ${v}`);
    });
    movesEl.textContent = moves;
  }

  function tryMove(i) {
    const blank = tiles.indexOf(0);
    const br = Math.floor(blank / 4), bc = blank % 4;
    const r = Math.floor(i / 4), c = i % 4;
    if (Math.abs(br - r) + Math.abs(bc - c) !== 1) return;
    [tiles[blank], tiles[i]] = [tiles[i], tiles[blank]];
    moves++;
    soundFx.playClick();
    paint();
    if (tiles.every((v, idx) => v === ((idx + 1) % 16))) {
      const secs = (performance.now() - startedAt) / 1000;
      const score = Math.max(50, Math.round(2000 - moves * 12 - secs * 4));
      high = Math.max(high, score);
      showResult({
        container,
        title: moves <= 80 ? 'CLEAN PATH' : 'ORDER RESTORED',
        message: `${moves} moves · ${secs.toFixed(1)}s. Spatial planning under one empty cell.`,
        score,
        gameId: 'fifteen-puzzle',
        tone: moves <= 80 ? 'win' : 'over',
        onRestart: () => renderFifteenPuzzle(container, onClose),
        onClose
      });
    }
  }

  container.querySelectorAll('.fifteen-tile').forEach(btn => {
    btn.onclick = () => tryMove(parseInt(btn.dataset.i, 10));
  });
  container.querySelector('#fp-reshuffle').onclick = () => {
    tiles = shuffleFifteen();
    moves = 0;
    startedAt = performance.now();
    paint();
  };
  paint();
}
