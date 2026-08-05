/**
 * OmniArcade - Kids & Educational Game Suite (Axiom Core Styled)
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { showResult } from '../ui.js';

/* ===========================================================================
 * 1. MATH SAFARI RUSH
 * ======================================================================== */
export function renderMathSafari(container, onClose) {
  start();

  function start() {
    let score = 0;
    let lives = 3;
    let high = StorageService.getHighScore('math-safari');
    let currentProblem = generateProblem();

    function generateProblem() {
      const ops = ['+', '-', '×'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b, answer;
      if (op === '+') {
        a = Math.floor(Math.random() * 15) + 1;
        b = Math.floor(Math.random() * 15) + 1;
        answer = a + b;
      } else if (op === '-') {
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
      } else {
        a = Math.floor(Math.random() * 9) + 1;
        b = Math.floor(Math.random() * 9) + 1;
        answer = a * b;
      }
      const choices = [answer];
      while (choices.length < 3) {
        const wrong = answer + (Math.floor(Math.random() * 7) - 3);
        if (wrong > 0 && !choices.includes(wrong)) choices.push(wrong);
      }
      choices.sort(() => Math.random() - 0.5);
      return { a, op, b, answer, choices };
    }

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border-2 border-amber-500 p-6 text-white max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] font-mono-hud">
          <div class="flex justify-between items-center mb-6 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🧮</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">MATH SAFARI RUSH</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">EDUCAPLAY MODULE — SPEED ARITHMETIC REACTION</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-4 mb-6 text-xs font-bold">
            <div>SCORE: <span id="math-score" class="text-white text-lg">${score}</span></div>
            <div>HIGH SCORE: <span class="text-amber-400 text-lg">${high}</span></div>
            <div>LIVES: <span id="math-lives" class="text-red-500 text-lg">${'❤️'.repeat(lives)}</span></div>
          </div>

          <div id="math-display" class="bg-zinc-900 border border-amber-500/60 p-8 text-center mb-6">
            <div class="text-amber-500 text-xs mb-2">SOLVE EQUATION TO LEAP</div>
            <div class="text-5xl font-extrabold text-white tracking-widest my-2">${currentProblem.a} ${currentProblem.op} ${currentProblem.b} = ?</div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            ${currentProblem.choices.map(choice => `
              <button class="math-choice-btn py-5 text-2xl font-bold bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/50 transition shadow-lg" data-choice="${choice}">
                ${choice}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = onClose;

      container.querySelectorAll('.math-choice-btn').forEach(btn => {
        btn.onclick = (e) => {
          const val = parseInt(e.target.dataset.choice, 10);
          if (val === currentProblem.answer) {
            soundFx.playCoin();
            score += 10;
            currentProblem = generateProblem();
            render();
          } else {
            soundFx.playHit();
            lives--;
            if (lives <= 0) {
              showResult({
                container,
                title: 'OUT OF LIVES',
                message: 'The safari ends here.',
                score,
                gameId: 'math-safari',
                onRestart: () => start(),
                onClose
              });
            } else {
              currentProblem = generateProblem();
              render();
            }
          }
        };
      });
    }

    render();
  }
}

/* ===========================================================================
 * 2. MEMORY MATCH MANIA
 * ======================================================================== */
export function renderMemoryMatch(container, onClose) {
  start();

  function start() {
    const icons = ['🦁', '🐯', '🐼', '🐨', '🦊', '🦒', '🐘', '🦩'];
    let cards = [...icons, ...icons].sort(() => Math.random() - 0.5);
    let flipped = [];
    let matched = [];
    let moves = 0;
    let score = 0;
    let high = StorageService.getHighScore('memory-match');
    let lock = false;

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border-2 border-amber-500 p-6 text-white max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] font-mono-hud">
          <div class="flex justify-between items-center mb-6 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🧠</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">MEMORY MATCH MANIA</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">EDUCAPLAY MODULE — PATTERN MATCHING</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-4 mb-6 text-xs font-bold">
            <div>MOVES: <span class="text-amber-400">${moves}</span></div>
            <div>MATCHED: <span class="text-emerald-400">${matched.length / 2} / 8</span></div>
            <div>HIGH SCORE: <span class="text-amber-400">${high}</span></div>
          </div>

          <div class="grid grid-cols-4 gap-3">
            ${cards.map((icon, idx) => {
              const isFlipped = flipped.includes(idx) || matched.includes(idx);
              return `
                <button class="memory-card-btn aspect-square text-3xl flex items-center justify-center font-bold transition border ${isFlipped ? 'bg-amber-950 border-amber-400 text-white' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-500'}" data-idx="${idx}">
                  ${isFlipped ? icon : '❓'}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = onClose;

      container.querySelectorAll('.memory-card-btn').forEach(btn => {
        btn.onclick = () => {
          if (lock) return;
          const idx = parseInt(btn.dataset.idx, 10);
          if (flipped.length < 2 && !flipped.includes(idx) && !matched.includes(idx)) {
            soundFx.playClick();
            flipped.push(idx);
            render();

            if (flipped.length === 2) {
              lock = true;
              moves++;
              const [i1, i2] = flipped;
              if (cards[i1] === cards[i2]) {
                soundFx.playCoin();
                matched.push(i1, i2);
                flipped = [];
                score += 20;
                if (matched.length === cards.length) {
                  const bonus = Math.max(100 - moves * 5, 20);
                  const finalScore = score + bonus;
                  showResult({
                    container,
                    title: 'ALL MATCHED!',
                    message: `Solved in ${moves} moves. Bonus: +${bonus}`,
                    score: finalScore,
                    gameId: 'memory-match',
                    tone: 'win',
                    onRestart: () => start(),
                    onClose
                  });
                } else {
                  lock = false;
                  render();
                }
              } else {
                soundFx.playHit();
                setTimeout(() => {
                  flipped = [];
                  lock = false;
                  render();
                }, 800);
              }
            }
          }
        };
      });
    }

    render();
  }
}

/* ===========================================================================
 * 3. WORD SEARCH QUEST
 * ======================================================================== */
export function renderWordSearch(container, onClose) {
  start();

  function start() {
    const words = ['LION', 'TIGER', 'MATH', 'GAME', 'STAR'];
    const grid = [
      ['L', 'I', 'O', 'N', 'X'],
      ['T', 'I', 'G', 'E', 'R'],
      ['M', 'A', 'T', 'H', 'Z'],
      ['G', 'A', 'M', 'E', 'W'],
      ['S', 'T', 'A', 'R', 'K']
    ];
    let found = [];

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border-2 border-amber-500 p-6 text-white max-w-xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)] font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🔤</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">WORD SEARCH QUEST</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">EDUCAPLAY MODULE — VOCABULARY MATRIX</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn">✕ TERMINATE</button>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            ${words.map(w => `
              <span class="px-3 py-1 text-xs font-bold border ${found.includes(w) ? 'bg-amber-500 text-black border-amber-400 line-through' : 'bg-zinc-900 text-amber-300 border-amber-500/30'}">
                ${w}
              </span>
            `).join('')}
          </div>

          <div class="grid grid-cols-5 gap-2 mb-4 bg-zinc-950 p-4 border border-amber-500/40">
            ${grid.map((row, r) => row.map((char, c) => `
              <div class="aspect-square flex items-center justify-center bg-black border border-amber-500/40 text-xl font-extrabold text-amber-300">
                ${char}
              </div>
            `).join('')).join('')}
          </div>

          <div class="flex flex-wrap justify-center gap-2">
            ${words.map(w => `
              <button class="word-claim-btn px-3 py-2 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/40 text-xs font-bold transition ${found.includes(w) ? 'opacity-40 pointer-events-none' : ''}" data-word="${w}">
                CLAIM "${w}"
              </button>
            `).join('')}
          </div>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = onClose;

      container.querySelectorAll('.word-claim-btn').forEach(btn => {
        btn.onclick = (e) => {
          const w = e.target.dataset.word;
          if (!found.includes(w)) {
            soundFx.playCoin();
            found.push(w);
            if (found.length === words.length) {
              showResult({
                container,
                title: 'ALL WORDS FOUND!',
                message: 'Vocabulary mastered.',
                gameId: 'word-search',
                score: 100,
                tone: 'win',
                onRestart: () => start(),
                onClose
              });
            }
            render();
          }
        };
      });
    }

    render();
  }
}