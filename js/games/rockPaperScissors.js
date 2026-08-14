/**
 * NGS Casual · Rock-Paper-Scissors — the simplest prediction game.
 * Pure helpers are exported so the rules can be tested without a browser.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

export const CHOICES = ['rock', 'paper', 'scissors'];

/** @returns {'win'|'lose'|'draw'} outcome for the player */
export function resolveRPS(player, cpu) {
  if (player === cpu) return 'draw';
  if (
    (player === 'rock' && cpu === 'scissors') ||
    (player === 'paper' && cpu === 'rock') ||
    (player === 'scissors' && cpu === 'paper')
  ) return 'win';
  return 'lose';
}

export const RPS_ICONS = { rock: '✊', paper: '✋', scissors: '✌' };

/**
 * Frequency-prediction AI: tracks the player's move history and counters
 * the most frequent move. On the first move, or 20% of the time, plays
 * randomly so the player can still win.
 */
export function predictCPU(history) {
  if (!history.length || Math.random() < 0.25) {
    return CHOICES[Math.floor(Math.random() * 3)];
  }
  const counts = { rock: 0, paper: 0, scissors: 0 };
  for (const move of history) counts[move]++;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  // Counter the player's most frequent move
  if (top === 'rock') return 'paper';
  if (top === 'paper') return 'scissors';
  return 'rock';
}

export function renderRockPaperScissors(container, onClose) {
  let playerScore = 0, cpuScore = 0, round = 0;
  const history = [];
  const TARGET = 5;
  let lastPlayer = null, lastCPU = null, lastResult = null, locked = false;

  function draw() {
    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">ROCK PAPER SCISSORS</h2><p class="text-[10px] text-amber-500/80 uppercase">FIRST TO ${TARGET} WINS</p></div>
          ${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold text-center">
          <span>YOU<br><b class="text-green-400 text-lg">${playerScore}</b></span>
          <span>ROUND<br><b class="text-amber-400 text-lg">${round}</b></span>
          <span>CPU<br><b class="text-red-400 text-lg">${cpuScore}</b></span>
        </div>
        <div class="flex justify-center items-center gap-8 mb-4 min-h-[80px]">
          <div class="text-center">
            <div class="text-5xl mb-1">${lastPlayer ? RPS_ICONS[lastPlayer] : '—'}</div>
            <div class="text-[10px] text-zinc-500">YOU</div>
          </div>
          <div class="text-amber-500 text-xl font-black">VS</div>
          <div class="text-center">
            <div class="text-5xl mb-1">${lastCPU ? RPS_ICONS[lastCPU] : '—'}</div>
            <div class="text-[10px] text-zinc-500">CPU</div>
          </div>
        </div>
        ${lastResult ? `<p class="text-center text-sm font-bold mb-4 ${lastResult === 'win' ? 'text-green-400' : lastResult === 'lose' ? 'text-red-400' : 'text-zinc-400'}">${lastResult === 'win' ? 'YOU WIN THIS ROUND' : lastResult === 'lose' ? 'CPU WINS' : 'DRAW'}</p>` : '<p class="text-center text-[11px] text-zinc-400 mb-4">Pick your throw. The CPU watches your habits.</p>'}
        <div class="grid grid-cols-3 gap-2">
          ${CHOICES.map(choice => `<button data-choice="${choice}" class="py-6 border-2 border-amber-500 text-amber-400 hover:bg-amber-400/10 flex flex-col items-center gap-2 ${locked ? 'opacity-40' : ''}" ${locked ? 'disabled' : ''}><span class="text-3xl">${RPS_ICONS[choice]}</span><span class="text-xs font-black uppercase">${choice}</span></button>`).join('')}
        </div>
        <p class="mt-4 text-[11px] leading-relaxed text-zinc-400 text-center">The CPU tracks your most frequent move and counters it. Vary your patterns to win.</p>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    if (!locked) {
      container.querySelectorAll('[data-choice]').forEach(btn => {
        btn.onclick = () => play(btn.dataset.choice);
      });
    }
  }

  function play(choice) {
    if (locked) return;
    locked = true;
    lastPlayer = choice;
    lastCPU = predictCPU(history);
    history.push(choice);
    lastResult = resolveRPS(choice, lastCPU);

    if (lastResult === 'win') { playerScore++; soundFx.playCoin(); }
    else if (lastResult === 'lose') { cpuScore++; soundFx.playHit(); }
    else { soundFx.playClick(); }

    round++;
    draw();

    setTimeout(() => {
      locked = false;
      if (playerScore >= TARGET || cpuScore >= TARGET) {
        const won = playerScore > cpuScore;
        showResult({
          container,
          title: won ? 'PATTERN MASTER' : 'CPU READ YOU',
          message: `${playerScore}–${cpuScore}. The CPU predicted your favourite move. Mixing your throws randomly is the game-theory-optimal strategy — but humans rarely do.`,
          score: playerScore * 20,
          gameId: 'rock-paper-scissors',
          tone: won ? 'win' : 'over',
          onRestart: () => renderRockPaperScissors(container, onClose),
          onClose
        });
        return;
      }
      lastPlayer = null; lastCPU = null; lastResult = null;
      draw();
    }, 1400);
  }

  draw();
}