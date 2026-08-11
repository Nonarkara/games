/**
 * Dr Non — Non-Gaming System AI Game Builder Studio (Axiom Core Styled)
 * Inspired by Tesana.ai — Prompt-to-Play Canvas Engine
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { ScopedKeyboard, showResult } from '../ui.js';

export function renderAIGameStudio(container, onClose) {
  let promptText = "A cyber runner dodging red laser beams and collecting golden stars";
  let playerSprite = "🐱";
  let obstacleSprite = "🔥";
  let itemSprite = "⭐";
  let gameSpeed = 5;

  let isPlaying = false;
  let score = 0;
  let high = StorageService.getHighScore('ai-sandbox');
  let gameInterval = null;
  let kb = null;

  const presets = [
    { title: "🐱 Cyber Cat Runner", prompt: "A neon cat dodging falling fireballs", player: "🐱", obs: "🔥", item: "🐟" },
    { title: "🥷 Ninja Laser Dodge", prompt: "A stealth ninja dodging laser traps", player: "🥷", obs: "⚡", item: "💎" },
    { title: "🚀 Astro Rocket Collector", prompt: "A rocket dodging space asteroids", player: "🚀", obs: "☄️", item: "⭐" },
    { title: "🐸 Bouncy Frog Safari", prompt: "A frog leaping past spikes for flies", player: "🐸", obs: "🌵", item: "🦟" }
  ];

  function fullCleanup() {
    if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    if (kb) { kb.destroy(); kb = null; }
  }

  function renderUI() {
    container.innerHTML = `
      <div class="relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-2xl mx-auto font-mono-hud">
        <div class="flex justify-between items-center gap-2 mb-6 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-3xl text-amber-400">🤖</span>
            <div class="min-w-0">
              <h2 class="text-base sm:text-2xl font-black text-amber-400 tracking-wider">AI GAME BUILDER</h2>
              <p class="text-[9px] text-amber-500/80 uppercase">PROMPT SANDBOX · RULES TO PLAY</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
        </div>

        ${!isPlaying ? `
          <div class="bg-zinc-950 border border-amber-500/40 p-5 mb-6">
            <label class="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              ✨ PROMPT YOUR CUSTOM GAME IDEA:
            </label>
            <div class="flex flex-col sm:flex-row gap-2 mb-4">
              <input id="ai-prompt-input" type="text" value="${promptText}" class="w-full bg-black border border-amber-500/60 px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400" placeholder="e.g. A cyber knight dodging falling meteors..." />
              <button id="ai-generate-btn" class="w-full sm:w-auto px-4 sm:px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-xs uppercase whitespace-nowrap shadow-lg">
                ⚡ BUILD & PLAY
              </button>
            </div>

            <div class="text-xs font-bold text-zinc-400 mb-2">CHOOSE AN AI PRESET:</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${presets.map((p, idx) => `
                <button class="ai-preset-btn p-3 bg-zinc-900 hover:bg-amber-950 border border-zinc-800 hover:border-amber-500 text-left transition flex items-center gap-3" data-idx="${idx}">
                  <span class="text-2xl">${p.player}</span>
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-amber-400">${p.title}</div>
                    <div class="text-[10px] text-zinc-400 truncate">${p.prompt}</div>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950 p-4 border border-amber-500/40 mb-6 text-xs">
            <div>
              <span class="text-zinc-400 block mb-1">HERO AVATAR:</span>
              <input id="param-player" type="text" value="${playerSprite}" class="w-full bg-black border border-zinc-700 p-2 text-center text-lg" />
            </div>
            <div>
              <span class="text-zinc-400 block mb-1">HAZARD:</span>
              <input id="param-obs" type="text" value="${obstacleSprite}" class="w-full bg-black border border-zinc-700 p-2 text-center text-lg" />
            </div>
            <div>
              <span class="text-zinc-400 block mb-1">STAR REWARD:</span>
              <input id="param-item" type="text" value="${itemSprite}" class="w-full bg-black border border-zinc-700 p-2 text-center text-lg" />
            </div>
          </div>
        ` : `
          <div class="flex flex-wrap justify-between items-center gap-3 bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>SCORE: <span id="ai-score" class="text-white text-base">0</span></div>
            <div>HIGH SCORE: <span id="ai-high" class="text-amber-400 text-base">${high}</span></div>
            <button id="ai-stop-btn" class="px-3 py-1 bg-zinc-900 border border-amber-500/40 text-amber-400 hover:bg-amber-900 text-xs">⚙️ REDESIGN</button>
          </div>

          <div class="relative flex justify-center mb-4">
            <canvas id="ai-canvas" width="500" height="320" class="w-full h-auto bg-black border border-amber-500/60 shadow-inner" style="max-width:500px;aspect-ratio:25/16"></canvas>
          </div>

          <div class="flex justify-center">
            <button id="ai-jump-btn" class="w-full py-4 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg tracking-wider border border-amber-400">
              🚀 JUMP / LEAP (SPACEBAR)
            </button>
          </div>
        `}
      </div>
    `;

    container.querySelector('#close-game-btn').onclick = () => {
      fullCleanup();
      onClose();
    };

    if (!isPlaying) {
      container.querySelector('#ai-generate-btn').onclick = () => {
        promptText = container.querySelector('#ai-prompt-input').value;
        playerSprite = container.querySelector('#param-player').value || "🐱";
        obstacleSprite = container.querySelector('#param-obs').value || "🔥";
        itemSprite = container.querySelector('#param-item').value || "⭐";
        soundFx.playWin();
        isPlaying = true;
        renderUI();
        startCanvasEngine();
      };

      container.querySelectorAll('.ai-preset-btn').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.dataset.idx, 10);
          const p = presets[idx];
          promptText = p.prompt;
          playerSprite = p.player;
          obstacleSprite = p.obs;
          itemSprite = p.item;
          soundFx.playWin();
          isPlaying = true;
          renderUI();
          startCanvasEngine();
        };
      });
    } else {
      container.querySelector('#ai-stop-btn').onclick = () => {
        fullCleanup();
        isPlaying = false;
        renderUI();
      };
    }
  }

  function startCanvasEngine() {
    const canvas = container.querySelector('#ai-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let hero = { x: 50, y: 220, vy: 0, gravity: 0.8, isJumping: false };
    let obstacles = [];
    let items = [];
    let frame = 0;
    score = 0;
    let ended = false;

    function jump() {
      if (!hero.isJumping && !ended) {
        soundFx.playJump();
        hero.vy = -14;
        hero.isJumping = true;
      }
    }

    function gameLoop() {
      if (ended) return;
      frame++;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 260, canvas.width, 60);

      hero.vy += hero.gravity;
      hero.y += hero.vy;

      if (hero.y >= 220) {
        hero.y = 220;
        hero.vy = 0;
        hero.isJumping = false;
      }

      if (frame % 90 === 0) {
        obstacles.push({ x: canvas.width, y: 225, size: 30 });
      }

      if (frame % 70 === 0) {
        items.push({ x: canvas.width, y: Math.floor(Math.random() * 120) + 100, size: 25, collected: false });
      }

      obstacles.forEach((obs) => {
        obs.x -= gameSpeed;
        ctx.font = '28px sans-serif';
        ctx.fillText(obstacleSprite, obs.x, obs.y + 24);

        if (Math.abs(hero.x - obs.x) < 25 && Math.abs(hero.y - obs.y) < 25) {
          ended = true;
          fullCleanup();
          showResult({
            container,
            title: 'GAME OVER',
            message: `Prompt: "${promptText.slice(0, 48)}${promptText.length > 48 ? '…' : ''}"`,
            score,
            gameId: 'ai-sandbox',
            onRestart: () => { isPlaying = true; renderUI(); startCanvasEngine(); },
            onClose
          });
        }
      });

      items.forEach((item) => {
        if (item.collected) return;
        item.x -= gameSpeed;
        ctx.font = '24px sans-serif';
        ctx.fillText(itemSprite, item.x, item.y);

        if (Math.abs(hero.x - item.x) < 30 && Math.abs(hero.y - item.y) < 30) {
          item.collected = true;
          soundFx.playCoin();
          score += 15;
          if (score > high) high = score;
          const sEl = container.querySelector('#ai-score');
          const hEl = container.querySelector('#ai-high');
          if (sEl) sEl.innerText = score;
          if (hEl) hEl.innerText = high;
        }
      });

      obstacles = obstacles.filter(o => o.x > -40);
      items = items.filter(i => i.x > -40);

      ctx.font = '32px sans-serif';
      ctx.fillText(playerSprite, hero.x, hero.y + 30);
    }

    // FIX: use ScopedKeyboard so the listener is removed on close/restart.
    kb = new ScopedKeyboard();
    kb.on({ ' ': jump, ArrowUp: jump });

    const jumpBtn = container.querySelector('#ai-jump-btn');
    if (jumpBtn) jumpBtn.onclick = jump;
    canvas.onclick = jump;
    canvas.ontouchstart = (e) => { e.preventDefault(); jump(); };

    gameInterval = setInterval(gameLoop, 1000 / 40);
  }

  renderUI();
}
