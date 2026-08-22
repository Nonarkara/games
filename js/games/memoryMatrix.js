/**
 * NGS Trainer · Memory Matrix — simultaneous spatial pattern recall.
 * Unlike Corsi (path) or Simon (sequence), this tests parallel encoding
 * of multiple spatial locations at once.
 */
import { soundFx } from '../audio.js';
import { showResult, attachReady } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

/** Build a grid of `size`×`size` with `count` lit cells. No duplicates. */
export function generatePattern(size, count) {
  const total = size * size;
  const indices = [...Array(total).keys()];
  // Fisher-Yates shuffle, take first `count`
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, count));
}

/** Compare player's taps to the pattern. Returns { correct, missed, wrong } */
export function checkPattern(player, pattern) {
  const playerSet = new Set(player);
  let correct = 0, wrong = 0;
  for (const i of playerSet) {
    if (pattern.has(i)) correct++;
    else wrong++;
  }
  const missed = pattern.size - correct;
  return { correct, missed, wrong };
}

export function renderMemoryMatrix(container, onClose) {
  const GRID_SIZE = 4; // 4×4 = 16 cells
  const MAX_LIVES = 3;
  const MAX_ROUND = 10; // game ends at 8-cell mastery (round 11 hits 8 cells)
  let round = 1, score = 0, lives = MAX_LIVES;
  let pattern = new Set();
  let playerTaps = [];
  let phase = 'ready'; // 'ready' | 'show' | 'input' | 'result'
  let locked = false;

  function startRound() {
    const count = Math.min(3 + Math.floor((round - 1) / 2), 8); // 3..8 lit cells
    pattern = generatePattern(GRID_SIZE, count);
    playerTaps = [];
    phase = 'show';
    locked = true;
    draw();

    // Show pattern for 1.2s + 0.3s per cell, then hide
    const showDuration = 1200 + count * 300;
    setTimeout(() => {
      if (phase !== 'show') return;
      phase = 'input';
      locked = false;
      draw();
    }, showDuration);
  }

  function draw() {
    const cellCount = pattern.size;
    const showPhase = phase === 'show';
    const resultPhase = phase === 'result';

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">MEMORY MATRIX</h2><p class="text-[10px] text-amber-500/80 uppercase">REMEMBER THE LIT CELLS</p></div>
          ${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold text-center">
          <span>ROUND<br><b class="text-amber-400 text-lg">${round}</b></span>
          <span>CELLS<br><b class="text-white text-lg">${cellCount}</b></span>
          <span>SCORE<br><b class="text-green-400 text-lg">${score}</b></span>
          <span>LIVES<br><b class="text-red-400 text-lg">${'●'.repeat(lives)}${'○'.repeat(MAX_LIVES - lives)}</b></span>
        </div>
        <div class="grid mx-auto" style="grid-template-columns:repeat(${GRID_SIZE},1fr);max-width:320px;gap:6px">
          ${Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
            const isLit = showPhase && pattern.has(i);
            const isTapped = playerTaps.includes(i);
            const isCorrect = resultPhase && pattern.has(i);
            const isWrong = resultPhase && isTapped && !pattern.has(i);
            const isMissed = resultPhase && !isTapped && pattern.has(i);
            let cls = 'bg-zinc-950 border-amber-500/30';
            if (isLit) cls = 'bg-amber-400 border-amber-400';
            else if (isCorrect) cls = 'bg-green-400/60 border-green-400';
            else if (isWrong) cls = 'bg-red-400/40 border-red-400';
            else if (isMissed) cls = 'bg-amber-400/30 border-amber-400/50';
            else if (isTapped) cls = 'bg-amber-400/30 border-amber-400/60';
            return `<button data-cell="${i}" class="aspect-square ${cls} border-2 transition-colors duration-150" ${showPhase || locked || resultPhase ? 'disabled' : ''} aria-label="Cell ${i + 1}"></button>`;
          }).join('')}
        </div>
        <p class="mt-4 text-[11px] leading-relaxed text-zinc-400 text-center min-h-[20px]">
          ${showPhase ? ' memorise the lit cells…' : resultPhase ? (round > 1 ? 'Round complete!' : '') : phase === 'input' ? `Tap the ${cellCount} cells you saw. Tap again to undo.` : 'TAP TO START'}
        </p>
      </div>`;

    container.querySelector('#close-game-btn').onclick = onClose;

    if (phase === 'ready') {
      attachReady(container.firstElementChild, () => {
        startRound();
      });
    }

    if (phase === 'input') {
      container.querySelectorAll('[data-cell]').forEach(btn => {
        btn.onclick = () => {
          const i = Number(btn.dataset.cell);
          const idx = playerTaps.indexOf(i);
          if (idx >= 0) playerTaps.splice(idx, 1);
          else playerTaps.push(i);
          soundFx.playClick();
          draw();
          // Auto-submit when enough taps placed
          if (playerTaps.length === pattern.size) {
            submitAnswer();
          }
        };
      });
    }

    if (resultPhase) {
      container.querySelectorAll('[data-cell]').forEach(btn => btn.disabled = true);
    }
  }

  function submitAnswer() {
    locked = true;
    phase = 'result';
    const { correct, missed, wrong } = checkPattern(playerTaps, pattern);
    const perfect = missed === 0 && wrong === 0;

    if (perfect) {
      score += round * 20;
      soundFx.playCoin();
    } else {
      lives--;
      soundFx.playHit();
      // Partial credit: 50% if mostly right
      if (correct >= pattern.size - 1 && wrong <= 1) score += round * 5;
    }

    draw();

    setTimeout(() => {
      if (lives <= 0 || round >= MAX_ROUND) {
        gameOver();
        return;
      }
      if (perfect) round++;
      startRound();
    }, 2000);
  }

  function gameOver() {
    showResult({
      container,
      title: 'PATTERN BROKEN',
      message: `You reached round ${round} and scored ${score}. Your spatial workspace held ${Math.min(3 + Math.floor((round - 1) / 2), 8)} cells at peak — that's parallel encoding, not sequential.`,
      score,
      gameId: 'memory-matrix',
      tone: 'over',
      onRestart: () => renderMemoryMatrix(container, onClose),
      onClose
    });
  }

  // Initial state: ready gate
  phase = 'ready';
  draw();
}