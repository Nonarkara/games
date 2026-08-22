/**
 * Dr Non — Non-Gaming System Curated Learning & Coordination Suite
 *
 * Mechanic attributions (all MIT / public-domain, reimplemented in vanilla JS):
 *  - Pattern Breaker: adapted from `maxwellito/breaklock` (MIT) — Mastermind × pattern-lock
 *  - Type Rush: adapted from `ninest/typer` (MIT) & `knadh/wordpluck` (MIT) — typing fluency
 *  - Reflex Matrix: reaction-game genre (MIT repos: Sagar-Sharma-7/Reaction-Game, zoozf/TestYourReactions)
 *  - Slide 2048: classic public-domain sliding-tile mechanic
 *
 * Reimplemented for the Axiom Core architecture; no third-party code copied.
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { ScopedKeyboard, showResult } from '../ui.js';

/* ===========================================================================
 * 1. PATTERN BREAKER  (Deductive logic — adult mind)
 *    Adapted mechanic: maxwellito/breaklock (MIT)
 * ======================================================================== */
export function renderPatternBreaker(container, onClose) {
  start();

  function start() {
    const GRID = 3;
    const PATH_LEN = 4;
    let high = StorageService.getHighScore('pattern-breaker');
    let attempts = 0;
    const maxAttempts = 10;
    let history = [];
    let won = false;
    let over = false;
    let currentGuess = [];

    const hidden = generatePath();

    function neighbors(node) {
      const ns = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
          const nr = node.r + dr, nc = node.c + dc;
          if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) ns.push({ r: nr, c: nc });
        }
      }
      return ns;
    }

    function generatePath() {
      const path = [{ r: Math.floor(Math.random() * GRID), c: Math.floor(Math.random() * GRID) }];
      while (path.length < PATH_LEN) {
        const last = path[path.length - 1];
        const prev = path.length >= 2 ? path[path.length - 2] : null;
        const cand = neighbors(last).filter(n => !path.some(p => p.r === n.r && p.c === n.c));
        const valid = prev ? cand.filter(n => !(n.r === prev.r && n.c === prev.c)) : cand;
        const pool = valid.length > 0 ? valid : cand;
        if (pool.length === 0) return generatePath();
        path.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      return path;
    }

    function evaluate(guess) {
      let exact = 0, partial = 0;
      const hiddenUsed = new Array(PATH_LEN).fill(false);
      const guessUsed = new Array(PATH_LEN).fill(false);
      for (let i = 0; i < PATH_LEN; i++) {
        if (guess[i].r === hidden[i].r && guess[i].c === hidden[i].c) {
          exact++; hiddenUsed[i] = true; guessUsed[i] = true;
        }
      }
      for (let i = 0; i < PATH_LEN; i++) {
        if (guessUsed[i]) continue;
        for (let j = 0; j < PATH_LEN; j++) {
          if (hiddenUsed[j]) continue;
          if (guess[i].r === hidden[j].r && guess[i].c === hidden[j].c) {
            partial++; hiddenUsed[j] = true; break;
          }
        }
      }
      return { exact, partial };
    }

    function toggleNode(r, c) {
      if (over) return;
      const idx = currentGuess.findIndex(n => n.r === r && n.c === c);
      if (idx >= 0) {
        currentGuess = currentGuess.slice(0, idx);
        soundFx.playClick();
        render();
        return;
      }
      if (currentGuess.length > 0) {
        const last = currentGuess[currentGuess.length - 1];
        if (Math.abs(last.r - r) + Math.abs(last.c - c) !== 1) return;
      }
      if (currentGuess.length < PATH_LEN) {
        currentGuess.push({ r, c });
        soundFx.playClick();
        if (currentGuess.length === PATH_LEN) submitGuess();
        render();
      }
    }

    function submitGuess() {
      const { exact } = evaluate(currentGuess);
      attempts++;
      history.push({ guess: currentGuess.slice(), ...evaluate(currentGuess) });
      currentGuess = [];
      if (exact === PATH_LEN) {
        won = true; over = true;
        const score = Math.max(200 - attempts * 15, 40);
        soundFx.playWin();
        render();
        setTimeout(() => {
          showResult({
            container, title: 'PATH CRACKED', message: `Solved in ${attempts} attempts.`,
            score, gameId: 'pattern-breaker', tone: 'win',
            onRestart: () => start(), onClose
          });
        }, 400);
      } else if (attempts >= maxAttempts) {
        over = true;
        soundFx.playGameOver();
        render();
        setTimeout(() => {
          showResult({
            container, title: 'CIPHER LOCKED', message: 'The path stayed hidden. (Answer revealed.)',
            score: 0, gameId: 'pattern-breaker',
            onRestart: () => start(), onClose
          });
        }, 400);
      }
    }

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🔐</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">PATTERN BREAKER</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">DEDUCTIVE LOGIC — ADAPTED FROM BREAKLOCK (MIT)</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ATTEMPTS: <span class="text-amber-400">${attempts}/${maxAttempts}</span></div>
            <div>HIGH: <span class="text-amber-400">${high}</span></div>
          </div>

          <div class="flex gap-6">
            <div class="flex-shrink-0">
              <div class="grid grid-cols-3 gap-2 mb-3" style="width:180px">
                ${Array.from({length: GRID*GRID}).map((_, i) => {
                  const r = Math.floor(i / GRID), c = i % GRID;
                  const order = currentGuess.findIndex(n => n.r === r && n.c === c);
                  const isCur = order >= 0;
                  const isAns = over && !won && hidden.some(n => n.r === r && n.c === c);
                  return `<button class="pb-cell aspect-square flex items-center justify-center text-lg font-bold border transition ${isAns ? 'bg-emerald-700 border-emerald-400' : isCur ? 'bg-amber-600 border-amber-300 text-black' : 'bg-zinc-900 border-amber-500/30 hover:bg-amber-950'}" data-r="${r}" data-c="${c}">${isCur ? (order + 1) : isAns ? '✓' : ''}</button>`;
                }).join('')}
              </div>
              <div class="text-[10px] text-zinc-500 leading-relaxed">
                TAP ADJACENT CELLS<br/>
                TO BUILD A ${PATH_LEN}-NODE PATH<br/>
                <span class="text-amber-500">●</span> RIGHT POS &nbsp; <span class="text-zinc-400">◐</span> WRONG POS
              </div>
            </div>

            <div class="flex-1 overflow-y-auto" style="max-height:240px">
              <div class="text-xs text-amber-500 font-bold mb-2">GUESS LOG</div>
              ${history.length === 0 ? `<div class="text-xs text-zinc-600">No attempts yet.</div>` : history.map((h, i) => `
                <div class="flex items-center gap-2 mb-1 text-xs">
                  <span class="text-zinc-500 w-6">#${i+1}</span>
                  <div class="flex gap-1">
                    ${h.guess.map(n => `<span class="w-5 h-5 bg-zinc-800 border border-amber-500/30 flex items-center justify-center text-[9px]">${n.r*GRID+n.c+1}</span>`).join('')}
                  </div>
                  <span class="text-amber-400">●${h.exact}</span>
                  <span class="text-zinc-400">◐${h.partial}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.pb-cell').forEach(btn => {
        btn.onclick = () => toggleNode(parseInt(btn.dataset.r), parseInt(btn.dataset.c));
      });
    }

    render();
  }
}

/* ===========================================================================
 * 2. REFLEX MATRIX  (Hand-eye coordination — casual)
 * ======================================================================== */
export function renderReflexMatrix(container, onClose) {
  start();

  function start() {
    const GRID_N = 5;
    const CELLS = GRID_N * GRID_N;
    let score = 0;
    let high = StorageService.getHighScore('reflex-matrix');
    let wave = 1;
    let lives = 3;
    let active = [];
    let over = false;
    let nextSpawn = 0;
    let interval = null;

    function ttl() { return Math.max(700, 1600 - wave * 80); }
    function spawnGap() { return Math.max(400, 900 - wave * 30); }

    function spawn() {
      if (over) return;
      const occupied = new Set(active.map(a => a.id));
      let id, tries = 0;
      do { id = Math.floor(Math.random() * CELLS); tries++; } while (occupied.has(id) && tries < 30);
      if (occupied.has(id)) return;
      active.push({ id, spawnedAt: Date.now(), ttl: ttl() });
      render();
    }

    function tick() {
      if (over) return;
      const now = Date.now();
      const expired = active.filter(a => now - a.spawnedAt > a.ttl);
      if (expired.length) {
        active = active.filter(a => now - a.spawnedAt <= a.ttl);
        lives -= expired.length;
        soundFx.playHit();
        if (lives <= 0) return endGame();
        render();
      }
      if (now >= nextSpawn) {
        spawn();
        nextSpawn = now + spawnGap();
      }
    }

    function hit(id) {
      if (over) return;
      const idx = active.findIndex(a => a.id === id);
      if (idx < 0) return;
      const a = active[idx];
      const reactTime = Date.now() - a.spawnedAt;
      active.splice(idx, 1);
      const speedBonus = Math.max(1, Math.round((a.ttl - reactTime) / a.ttl * 10));
      score += 5 + speedBonus;
      if (score > high) high = score;
      soundFx.playCoin();
      const newWave = 1 + Math.floor(score / 100);
      if (newWave > wave) { wave = newWave; soundFx.playWin(); }
      render();
    }

    function endGame() {
      over = true;
      clearInterval(interval);
      showResult({
        container, title: 'REFLEX OVERLOAD', message: `Reached wave ${wave}.`,
        score, gameId: 'reflex-matrix',
        onRestart: () => start(), onClose
      });
    }

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">⚡</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">REFLEX MATRIX</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">HAND-EYE COORDINATION — REACTION TRAINING</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>WAVE: <span class="text-amber-400 text-base">${wave}</span></div>
            <div>LIVES: <span class="text-red-500 text-base">${'❤️'.repeat(Math.max(0,lives))}</span></div>
          </div>

          <div class="grid gap-1.5 mx-auto" style="grid-template-columns:repeat(${GRID_N},1fr);max-width:360px">
            ${Array.from({length: CELLS}).map((_, i) => {
              const a = active.find(x => x.id === i);
              return `<button class="rm-cell aspect-square border flex items-center justify-center transition ${a ? 'bg-amber-500 border-amber-300 animate-pulse' : 'bg-zinc-900 border-amber-500/20'}" data-id="${i}"></button>`;
            }).join('')}
          </div>
          <p class="text-[10px] text-zinc-500 text-center mt-4">TAP AMBER CELLS BEFORE THEY FADE · FASTER = MORE POINTS</p>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = () => { clearInterval(interval); onClose(); };
      container.querySelectorAll('.rm-cell').forEach(btn => {
        btn.onclick = () => hit(parseInt(btn.dataset.id));
      });
    }

    render();
    nextSpawn = Date.now() + 600;
    interval = setInterval(tick, 100);
  }
}

/* ===========================================================================
 * 3. TYPE RUSH  (Typing fluency — new skill category)
 *    Adapted mechanic: ninest/typer (MIT) & knadh/wordpluck (MIT)
 * ======================================================================== */
export function renderTypeRush(container, onClose) {
  start();

  function start() {
    const WORDS = ['quantum','cyber','matrix','neon','arcade','retro','pixel','vortex','laser','digital',
      'synth','protocol','circuit','console','joystick','glitch','render','binary','cipher','mainframe',
      'hologram','interface','algorithm','bandwidth','firewall','network','operator','satellite','terminal','vector'];
    const DURATION = 30;
    let high = StorageService.getHighScore('type-rush');
    let typed = 0;
    let correct = 0;
    let timeLeft = DURATION;
    let currentWord = pickWord();
    let inputValue = '';
    let over = false;
    let started = false;
    let timer = null;

    function pickWord() { return WORDS[Math.floor(Math.random() * WORDS.length)]; }

    function endGame() {
      over = true;
      clearInterval(timer);
      const wpm = Math.round((correct / 5) / (DURATION / 60));
      const acc = typed > 0 ? Math.round((correct / typed) * 100) : 0;
      showResult({
        container,
        title: 'TIME UP',
        message: `${wpm} WPM · ${acc}% accuracy · ${correct} chars correct`,
        score: wpm,
        gameId: 'type-rush',
        tone: 'win',
        onRestart: () => start(),
        onClose
      });
    }

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center gap-2 mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-3xl text-amber-400">⌨️</span>
              <div class="min-w-0">
                <h2 class="text-xl sm:text-2xl font-black text-amber-400 tracking-wider">TYPE RUSH</h2>
                <p class="text-[9px] text-amber-500/80 uppercase break-words">TYPING FLUENCY · TYPER/WORDPLUCK (MIT)</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>WPM: <span class="text-white text-base">${started ? Math.round((correct/5)/((DURATION-timeLeft||1)/60)) || 0 : 0}</span></div>
            <div>TIME: <span id="tr-time" class="text-amber-400 text-base">${timeLeft}s</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${high}</span></div>
          </div>

          <div class="bg-zinc-900 border border-amber-500/60 p-4 sm:p-8 text-center mb-6">
            <div class="text-amber-500 text-xs mb-3">${!started ? 'START TYPING TO BEGIN — 30 SECOND RUSH' : 'TYPE THE WORD'}</div>
            <div id="tr-word" class="text-2xl sm:text-4xl font-extrabold tracking-wider sm:tracking-widest break-all mb-2">
              ${currentWord.split('').map((ch, i) => {
                const got = inputValue[i];
                const cls = got === undefined ? 'text-zinc-600' : got === ch ? 'text-emerald-400' : 'text-red-500';
                return `<span class="${cls}">${ch}</span>`;
              }).join('')}
            </div>
          </div>

          <input id="type-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
            value="${inputValue}" class="w-full bg-black border border-amber-500/60 px-4 py-4 text-center text-2xl text-amber-200 focus:outline-none focus:border-amber-400 font-mono" />
          <p class="text-[10px] text-zinc-500 text-center mt-3">CHARS: ${typed} · CORRECT: ${correct}</p>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = () => { clearInterval(timer); onClose(); };
      const input = container.querySelector('#type-input');
      input.focus();
      input.oninput = (e) => {
        if (over) return;
        const val = e.target.value;
        if (!started) {
          started = true;
          timer = setInterval(() => {
            timeLeft--;
            const tEl = container.querySelector('#tr-time');
            if (tEl) tEl.innerText = timeLeft + 's';
            if (timeLeft <= 0) endGame();
          }, 1000);
        }
        if (val.length > inputValue.length) {
          const i = val.length - 1;
          typed++;
          if (val[i] === currentWord[i]) { correct++; soundFx.playClick(); }
          else { soundFx.playHit(); }
        }
        inputValue = val;
        if (val === currentWord) {
          soundFx.playCoin();
          inputValue = '';
          currentWord = pickWord();
          render();
          return;
        }
        const wordEl = container.querySelector('#tr-word');
        if (wordEl) {
          wordEl.innerHTML = currentWord.split('').map((ch, i) => {
            const got = inputValue[i];
            const cls = got === undefined ? 'text-zinc-600' : got === ch ? 'text-emerald-400' : 'text-red-500';
            return `<span class="${cls}">${ch}</span>`;
          }).join('');
        }
      };
    }

    render();
  }
}

/* ===========================================================================
 * 4. SLIDE 2048  (Spatial strategy — casual)
 *    Public-domain sliding-tile mechanic
 * ======================================================================== */
export function renderSlide2048(container, onClose) {
  start();

  function start() {
    const SIZE = 4;
    let board = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    let score = 0;
    let high = StorageService.getHighScore('slide-2048');
    let over = false;
    let won = false;
    let kb = null;

    function addTile() {
      const empty = [];
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (board[r][c] === 0) empty.push([r, c]);
      if (empty.length === 0) return false;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      board[r][c] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }

    addTile(); addTile();

    function slide(row) {
      let arr = row.filter(v => v !== 0);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i+1]) {
          arr[i] *= 2;
          score += arr[i];
          if (arr[i] === 2048 && !won) { won = true; }
          arr.splice(i+1, 1);
        }
      }
      while (arr.length < SIZE) arr.push(0);
      return arr;
    }

    function rotateLeft(m) {
      const n = m.length;
      const res = Array.from({length: n}, () => Array(n).fill(0));
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          res[n-1-c][r] = m[r][c];
      return res;
    }
    function rotateRight(m) {
      const n = m.length;
      const res = Array.from({length: n}, () => Array(n).fill(0));
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          res[c][n-1-r] = m[r][c];
      return res;
    }

    function boardsEqual(a, b) {
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (a[r][c] !== b[r][c]) return false;
      return true;
    }

    function move(dir) {
      if (over) return;
      const before = board.map(r => r.slice());
      if (dir === 'left')  board = board.map(slide);
      if (dir === 'right') board = board.map(r => slide(r.slice().reverse()).reverse());
      if (dir === 'up')    { board = rotateLeft(board); board = board.map(slide); board = rotateRight(board); }
      if (dir === 'down')  { board = rotateLeft(board); board = board.map(r => slide(r.slice().reverse()).reverse()); board = rotateRight(board); }

      if (!boardsEqual(before, board)) {
        addTile();
        soundFx.playClick();
        if (score > high) high = score;
        render();
        checkEnd();
      }
    }

    function hasMoves() {
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c] === 0) return true;
          if (c < SIZE-1 && board[r][c] === board[r][c+1]) return true;
          if (r < SIZE-1 && board[r][c] === board[r+1][c]) return true;
        }
      return false;
    }

    function checkEnd() {
      if (won) {
        over = true;
        soundFx.playWin();
        setTimeout(() => showResult({
          container, title: '2048 REACHED', message: 'You hit the target tile!',
          score, gameId: 'slide-2048', tone: 'win',
          onRestart: () => start(), onClose
        }), 300);
        return;
      }
      if (!hasMoves()) {
        over = true;
        soundFx.playGameOver();
        setTimeout(() => showResult({
          container, title: 'NO MOVES LEFT', message: `Final score ${score}.`,
          score, gameId: 'slide-2048',
          onRestart: () => start(), onClose
        }), 300);
      }
    }

    function tileColor(v) {
      const map = { 2:'bg-zinc-800 text-zinc-300', 4:'bg-zinc-700 text-zinc-200', 8:'bg-amber-900 text-amber-100',
        16:'bg-amber-800 text-amber-50', 32:'bg-amber-700 text-black', 64:'bg-amber-600 text-black',
        128:'bg-amber-500 text-black', 256:'bg-amber-400 text-black', 512:'bg-emerald-600 text-white',
        1024:'bg-emerald-500 text-black', 2048:'bg-emerald-400 text-black' };
      return map[v] || 'bg-fuchsia-700 text-white';
    }

    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-md mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🔢</span>
              <div>
                <h2 class="text-2xl font-black text-amber-400 tracking-wider">SLIDE 2048</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">SPATIAL STRATEGY — MERGE TO 2048</p>
              </div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ TERMINATE</button>
          </div>

          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${high}</span></div>
          </div>

          <div class="grid grid-cols-4 gap-2 p-3 bg-zinc-950 border border-amber-500/40 mb-4">
            ${board.flat().map(v => `
              <div class="aspect-square flex items-center justify-center text-2xl font-black border ${v === 0 ? 'bg-black border-zinc-800 text-transparent' : tileColor(v) + ' border-amber-500/30'}">${v || ''}</div>
            `).join('')}
          </div>

          <p class="text-[10px] text-zinc-500 text-center">ARROW KEYS OR SWIPE TO MERGE TILES</p>
        </div>
      `;

      container.querySelector('#close-game-btn').onclick = () => { if (kb) kb.destroy(); onClose(); };

      // Swipe support (use 'grid' name, NOT 'board', to avoid shadowing).
      const grid = container.querySelector('.grid.grid-cols-4');
      let tsx = 0, tsy = 0;
      grid.ontouchstart = (e) => { tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; };
      grid.ontouchend = (e) => {
        const dx = e.changedTouches[0].clientX - tsx;
        const dy = e.changedTouches[0].clientY - tsy;
        if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dx) > 30) move(dx > 0 ? 'right' : 'left'); }
        else { if (Math.abs(dy) > 30) move(dy > 0 ? 'down' : 'up'); }
      };
    }

    kb = new ScopedKeyboard();
    kb.on({
      ArrowLeft: () => move('left'),
      ArrowRight: () => move('right'),
      ArrowUp: () => move('up'),
      ArrowDown: () => move('down')
    });

    render(); // render AFTER kb is created so close handler can reference it
  }
}
