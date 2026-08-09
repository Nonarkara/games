/**
 * Open-source arcade adaptations.
 *
 * Breakout: adapted from Ania Kubow's `kubowania/breakout` (MIT).
 * Pong: adapted from Jake Gordon's `jakesgordon/javascript-pong` (MIT).
 *
 * The renderers and mobile controls are original to OmniArcade. The sources
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

  window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === ' ' && !running) serve.click();
  });
  window.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
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
    const score = Math.max(0, playerScore * 100 - cpuScore * 25);
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

  window.addEventListener('keydown', event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'w', 's', ' '].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === ' ' && !running) serve.click();
  });
  window.addEventListener('keyup', event => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
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
