/**
 * OmniArcade — Trainer Suite (Console Edition)
 * Research-anchored trainers, each mapped to a citation in PROTOCOL:
 *   Dual N-Back     → Jaeggi et al. 2008 (working memory)
 *   Schulte Table   → classic attention/peripheral-scan drill
 *   Aim Trainer     → Dye/Green/Bavelier 2009 (processing speed)
 *   Go / No-Go      → Verbruggen & Logan 2008 (response inhibition)
 *   Digit Span      → Miller 1956 / Baddeley working-memory capacity
 *   Mental Math     → arithmetic fluency under time pressure
 *   Visual Search   → Green & Bavelier selective attention paradigm
 *   Corsi Blocks    → visuospatial working memory (Corsi 1972)
 *   Memory Palace   → method of loci (Yates 1966 / classical mnemonic)
 *   Flanker         → Eriksen selective attention / interference
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. DUAL N-BACK — position + letter, 2-back
 * ======================================================================== */
export function renderDualNBack(container, onClose) {
  start();

  function start() {
    const N = 2, TRIALS = 22, MS = 2400;
    const LETTERS = ['B', 'K', 'M', 'R', 'S', 'T', 'H', 'D'];
    // Build the sequence with forced matches so a session always has signal.
    const seq = [];
    for (let t = 0; t < TRIALS; t++) {
      let pos = Math.floor(Math.random() * 9);
      let let_ = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      if (t >= N) {
        if (Math.random() < 0.3) pos = seq[t - N].pos;
        if (Math.random() < 0.3) let_ = seq[t - N].let;
      }
      seq.push({ pos, let: let_ });
    }

    let t = -1, score = 0, hits = 0, falseAlarms = 0, misses = 0;
    let claimedPos = false, claimedLet = false;
    let timer = null;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">🧠</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">DUAL N-BACK</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">The Jaeggi working-memory task · N = ${N}</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>

        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Watch the square and the letter. If the POSITION repeats the one from ${N} steps back, press P.
          If the LETTER repeats, press L. Both can be true at once.
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>TRIAL <span id="nb-trial" class="text-white">0</span> / ${TRIALS}</div>
          <div>SCORE <span id="nb-score" class="text-amber-400">0</span></div>
        </div>

        <div class="grid grid-cols-3 gap-2 max-w-[264px] mx-auto mb-3">
          ${Array.from({ length: 9 }, (_, i) => `<div class="nb-cell aspect-square bg-zinc-900 border border-amber-500/30" data-i="${i}"></div>`).join('')}
        </div>
        <div id="nb-letter" class="text-center text-4xl font-black text-white h-12 mb-3">&nbsp;</div>

        <div class="flex justify-center gap-3">
          <button id="nb-pos" class="axiom-dpad-btn px-6 py-3">P · POSITION MATCH</button>
          <button id="nb-let" class="axiom-dpad-btn px-6 py-3">L · LETTER MATCH</button>
        </div>
      </div>
    `;

    const cells = [...container.querySelectorAll('.nb-cell')];
    const letterEl = container.querySelector('#nb-letter');
    const scoreEl = container.querySelector('#nb-score');
    const trialEl = container.querySelector('#nb-trial');

    function claim(kind) {
      if (t < N) return; // lead-in trials score nothing
      const already = kind === 'pos' ? claimedPos : claimedLet;
      if (already) return;
      const isMatch = kind === 'pos' ? seq[t].pos === seq[t - N].pos : seq[t].let === seq[t - N].let;
      if (kind === 'pos') claimedPos = true; else claimedLet = true;
      if (isMatch) { hits++; score += 15; soundFx.playCoin(); }
      else { falseAlarms++; score = Math.max(0, score - 5); soundFx.playHit(); }
      scoreEl.innerText = score;
    }

    function step() {
      // Before advancing, count any un-claimed matches from the trial that just ended.
      if (t >= N) {
        if (!claimedPos && seq[t].pos === seq[t - N].pos) misses++;
        if (!claimedLet && seq[t].let === seq[t - N].let) misses++;
      }
      t++;
      if (t >= TRIALS) return end();
      claimedPos = false; claimedLet = false;
      trialEl.innerText = t + 1;
      cells.forEach(c => c.classList.remove('bg-amber-500'));
      cells[seq[t].pos].classList.add('bg-amber-500');
      letterEl.innerText = seq[t].let;
      timer = setTimeout(step, MS);
    }

    function end() {
      clearTimeout(timer);
      kb.destroy();
      const total = hits + falseAlarms + misses;
      const acc = total ? Math.round((hits / total) * 100) : 0;
      showResult({
        container,
        title: acc >= 70 ? 'SHARP MEMORY' : 'SESSION COMPLETE',
        message: `${hits} hits · ${falseAlarms} false alarms · ${misses} missed matches · ${acc}% accuracy. The task gets easier with days, not minutes — that is the training effect.`,
        score,
        gameId: 'dual-n-back',
        tone: acc >= 70 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({ p: () => claim('pos'), P: () => claim('pos'), l: () => claim('let'), L: () => claim('let') });
    container.querySelector('#nb-pos').onclick = () => claim('pos');
    container.querySelector('#nb-let').onclick = () => claim('let');
    container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); kb.destroy(); onClose(); };

    step();
  }
}

/* ===========================================================================
 * 2. SCHULTE TABLE — find 1→25 as fast as your peripheral vision allows
 * ======================================================================== */
export function renderSchulteTable(container, onClose) {
  start();

  function start() {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    let next = 1, startedAt = null, errors = 0, tick = null;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">🔢</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">SCHULTE TABLE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Attention-field drill · eyes on the center, find with the periphery</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>

        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Tap 1 → 25 in order, fast. Classic drill: keep your eyes fixed on the center cell and let peripheral vision find the numbers.
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>FIND <span id="sch-next" class="text-amber-400 text-base">1</span></div>
          <div><span id="sch-time" class="text-white text-base">0.0</span>s</div>
          <div>ERRORS <span id="sch-err" class="text-white">0</span></div>
        </div>

        <div class="grid grid-cols-5 gap-1.5 max-w-[360px] mx-auto">
          ${nums.map(n => `<button class="sch-cell aspect-square min-h-[44px] bg-zinc-900 border border-amber-500/30 text-xl font-bold text-white hover:border-amber-400" data-n="${n}">${n}</button>`).join('')}
        </div>
      </div>
    `;

    const timeEl = container.querySelector('#sch-time');

    container.querySelectorAll('.sch-cell').forEach(btn => {
      btn.onclick = () => {
        const n = parseInt(btn.dataset.n, 10);
        if (startedAt === null) {
          startedAt = performance.now();
          tick = setInterval(() => { timeEl.innerText = ((performance.now() - startedAt) / 1000).toFixed(1); }, 100);
        }
        if (n !== next) {
          errors++;
          container.querySelector('#sch-err').innerText = errors;
          soundFx.playHit();
          return;
        }
        soundFx.playClick();
        btn.classList.remove('bg-zinc-900', 'text-white');
        btn.classList.add('bg-amber-500', 'text-black');
        next++;
        if (next > 25) return end();
        container.querySelector('#sch-next').innerText = next;
      };
    });

    function end() {
      clearInterval(tick);
      const secs = (performance.now() - startedAt) / 1000;
      // Sub-25s is a strong adult time on a 5x5; errors cost 2s each.
      const score = Math.max(0, Math.round((60 - secs - errors * 2) * 10));
      showResult({
        container,
        title: secs < 25 ? 'FAST EYES' : 'TABLE CLEARED',
        message: `${secs.toFixed(1)}s with ${errors} error${errors === 1 ? '' : 's'}. Under 25 seconds is a strong adult time; under 40 is average.`,
        score,
        gameId: 'schulte-table',
        tone: secs < 25 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelector('#close-game-btn').onclick = () => { clearInterval(tick); onClose(); };
  }
}

/* ===========================================================================
 * 3. AIM TRAINER — 30 seconds of targets, reaction time recorded
 * ======================================================================== */
export function renderAimTrainer(container, onClose) {
  start();

  function start() {
    const DURATION = 30;
    let score = 0, hitCount = 0, missCount = 0, reactions = [];
    let shownAt = null, left = DURATION, countdown = null, over = false;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div class="flex items-center gap-3">
            <span class="text-3xl text-amber-400">🎯</span>
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">AIM TRAINER</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Hand-eye speed drill · 30 seconds</p>
            </div>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>

        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Hit the amber target as fast as it appears. Empty clicks cost points. 30 seconds on the clock.
        </div>

        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE <span id="aim-score" class="text-amber-400 text-base">0</span></div>
          <div><span id="aim-time" class="text-white text-base">${DURATION}</span>s</div>
          <div>AVG <span id="aim-avg" class="text-white">—</span></div>
        </div>

        <div id="aim-arena" class="relative bg-zinc-950 border border-amber-500/40 h-[340px] cursor-crosshair overflow-hidden">
          <button id="aim-target" class="absolute w-11 h-11 bg-amber-500 hover:bg-amber-400" style="border-radius:50%;display:none" aria-label="target"></button>
        </div>
      </div>
    `;

    const arena = container.querySelector('#aim-arena');
    const target = container.querySelector('#aim-target');
    const scoreEl = container.querySelector('#aim-score');
    const avgEl = container.querySelector('#aim-avg');

    function placeTarget() {
      const w = arena.clientWidth - 44, h = arena.clientHeight - 44;
      target.style.left = `${Math.random() * w}px`;
      target.style.top = `${Math.random() * h}px`;
      target.style.display = 'block';
      shownAt = performance.now();
    }

    target.onclick = (e) => {
      e.stopPropagation();
      if (over) return;
      const rt = Math.round(performance.now() - shownAt);
      reactions.push(rt);
      hitCount++;
      score += 10;
      scoreEl.innerText = score;
      avgEl.innerText = `${Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)}ms`;
      soundFx.playCoin();
      placeTarget();
    };

    arena.onclick = () => {
      if (over) return;
      missCount++;
      score = Math.max(0, score - 2);
      scoreEl.innerText = score;
      soundFx.playHit();
    };

    countdown = setInterval(() => {
      left--;
      container.querySelector('#aim-time').innerText = left;
      if (left <= 0) end();
    }, 1000);

    function end() {
      over = true;
      clearInterval(countdown);
      target.style.display = 'none';
      const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
      showResult({
        container,
        title: avg && avg < 600 ? 'QUICK HANDS' : 'TIME',
        message: `${hitCount} hits, ${missCount} misses · average reaction ${avg}ms. Habitual action-game players average under 600ms on tasks like this.`,
        score,
        gameId: 'aim-trainer',
        tone: avg && avg < 600 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelector('#close-game-btn').onclick = () => { clearInterval(countdown); onClose(); };
    placeTarget();
  }
}

/* ===========================================================================
 * 4. GO / NO-GO — press on GO, withhold on NO-GO
 * ======================================================================== */
export function renderGoNoGo(container, onClose) {
  start();

  function start() {
    const TRIALS = 36, MS = 900, GAP = 450;
    // ~25% no-go — enough to punish impulsivity without boredom.
    const seq = Array.from({ length: TRIALS }, (_, i) => (i % 4 === 0 ? 'NOGO' : 'GO'));
    for (let i = seq.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [seq[i], seq[j]] = [seq[j], seq[i]];
    }

    let t = -1, hits = 0, falseAlarms = 0, misses = 0, reactions = [];
    let armed = false, shownAt = 0, timer = null, gapTimer = null;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">GO / NO-GO</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Response inhibition · Verbruggen &amp; Logan 2008</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Tap or press SPACE on GO. Do nothing on NO-GO. False starts cost more than slow hits.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>TRIAL <span id="gng-trial" class="text-white">0</span> / ${TRIALS}</div>
          <div>HITS <span id="gng-hits" class="text-amber-400">0</span></div>
          <div>FA <span id="gng-fa" class="text-white">0</span></div>
        </div>
        <button id="gng-stage" class="w-full h-[220px] bg-zinc-950 border border-amber-500/40 flex items-center justify-center text-4xl font-black tracking-widest text-amber-400" aria-label="respond">
          READY
        </button>
      </div>
    `;

    const stage = container.querySelector('#gng-stage');
    const hitsEl = container.querySelector('#gng-hits');
    const faEl = container.querySelector('#gng-fa');
    const trialEl = container.querySelector('#gng-trial');

    function respond() {
      if (!armed) return;
      armed = false;
      const kind = seq[t];
      if (kind === 'GO') {
        hits++;
        reactions.push(Math.round(performance.now() - shownAt));
        hitsEl.innerText = hits;
        soundFx.playCoin();
        stage.innerText = 'HIT';
      } else {
        falseAlarms++;
        faEl.innerText = falseAlarms;
        soundFx.playHit();
        stage.innerText = 'FALSE START';
      }
    }

    function advance() {
      clearTimeout(timer);
      clearTimeout(gapTimer);
      if (t >= 0 && armed && seq[t] === 'GO') {
        misses++;
        armed = false;
      } else if (t >= 0 && armed && seq[t] === 'NOGO') {
        armed = false;
      }
      t++;
      if (t >= TRIALS) return end();
      trialEl.innerText = t + 1;
      stage.innerText = '·';
      gapTimer = setTimeout(() => {
        stage.innerText = seq[t];
        stage.style.color = seq[t] === 'GO' ? '#f59e0b' : '#e6edf3';
        armed = true;
        shownAt = performance.now();
        timer = setTimeout(advance, MS);
      }, GAP);
    }

    function end() {
      clearTimeout(timer);
      clearTimeout(gapTimer);
      kb.destroy();
      const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
      const score = Math.max(0, hits * 12 - falseAlarms * 18 - misses * 8);
      const clean = falseAlarms === 0 && misses <= 2;
      showResult({
        container,
        title: clean ? 'INHIBITION LOCKED' : 'SESSION COMPLETE',
        message: `${hits} hits · ${falseAlarms} false starts · ${misses} misses · avg GO ${avg || '—'}ms. The hard skill is withholding, not pressing.`,
        score,
        gameId: 'go-nogo',
        tone: clean ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({ ' ': respond });
    stage.onclick = respond;
    container.querySelector('#close-game-btn').onclick = () => {
      clearTimeout(timer); clearTimeout(gapTimer); kb.destroy(); onClose();
    };
    advance();
  }
}

/* ===========================================================================
 * 5. DIGIT SPAN — hear/see digits, repeat them back
 * ======================================================================== */
export function renderDigitSpan(container, onClose) {
  start();

  function start() {
    let span = 3, score = 0, lives = 3, round = 0;
    let phase = 'idle'; // show | input
    let target = [];
    let typed = [];

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">DIGIT SPAN</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Working-memory capacity · Miller 1956</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Watch the digits. When they clear, type them back in order. Span grows on success.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SPAN <span id="ds-span" class="text-amber-400 text-base">3</span></div>
          <div>SCORE <span id="ds-score" class="text-white">0</span></div>
          <div>LIVES <span id="ds-lives" class="text-white">3</span></div>
        </div>
        <div id="ds-display" class="h-[100px] flex items-center justify-center text-5xl font-black tracking-[0.35em] text-amber-400 bg-zinc-950 border border-amber-500/40 mb-4">—</div>
        <div id="ds-input" class="h-12 flex items-center justify-center text-2xl font-bold tracking-[0.3em] text-white mb-4 min-h-[44px]">&nbsp;</div>
        <div class="grid grid-cols-5 gap-2 max-w-[280px] mx-auto">
          ${[1,2,3,4,5,6,7,8,9,0].map(n => `<button class="ds-key axiom-dpad-btn" data-n="${n}">${n}</button>`).join('')}
        </div>
        <div class="flex justify-center gap-2 mt-3">
          <button id="ds-clear" class="axiom-dpad-btn">CLEAR</button>
          <button id="ds-enter" class="axiom-dpad-btn">ENTER</button>
        </div>
      </div>
    `;

    const display = container.querySelector('#ds-display');
    const inputEl = container.querySelector('#ds-input');
    const spanEl = container.querySelector('#ds-span');
    const scoreEl = container.querySelector('#ds-score');
    const livesEl = container.querySelector('#ds-lives');

    function paintInput() {
      inputEl.innerText = typed.length ? typed.join('') : (phase === 'input' ? '_' : '\u00a0');
    }

    function nextRound() {
      round++;
      target = Array.from({ length: span }, () => Math.floor(Math.random() * 10));
      typed = [];
      phase = 'show';
      paintInput();
      let i = 0;
      display.innerText = '';
      const flash = () => {
        if (i >= target.length) {
          display.innerText = '…';
          phase = 'input';
          paintInput();
          return;
        }
        display.innerText = String(target[i]);
        i++;
        setTimeout(() => {
          display.innerText = '';
          setTimeout(flash, 180);
        }, 650);
      };
      flash();
    }

    function submit() {
      if (phase !== 'input') return;
      const ok = typed.length === target.length && typed.every((d, i) => d === target[i]);
      if (ok) {
        score += span * 10;
        scoreEl.innerText = score;
        span = Math.min(9, span + 1);
        spanEl.innerText = span;
        soundFx.playCoin();
        nextRound();
      } else {
        lives--;
        livesEl.innerText = lives;
        soundFx.playHit();
        if (lives <= 0) {
          kb.destroy();
          showResult({
            container,
            title: span >= 7 ? 'SPAN SOLID' : 'CAPACITY CHECK',
            message: `Peak span ${span}. Miller's "magical number seven" is the classic adult average — going past 7 under load is strong.`,
            score,
            gameId: 'digit-span',
            tone: span >= 7 ? 'win' : 'over',
            onRestart: () => start(),
            onClose
          });
          return;
        }
        span = Math.max(3, span - 1);
        spanEl.innerText = span;
        nextRound();
      }
    }

    container.querySelectorAll('.ds-key').forEach(btn => {
      btn.onclick = () => {
        if (phase !== 'input' || typed.length >= span) return;
        typed.push(parseInt(btn.dataset.n, 10));
        paintInput();
        soundFx.playClick();
      };
    });
    container.querySelector('#ds-clear').onclick = () => { typed = []; paintInput(); };
    container.querySelector('#ds-enter').onclick = submit;

    const kb = new ScopedKeyboard();
    const digitHandlers = {};
    for (let d = 0; d <= 9; d++) {
      digitHandlers[String(d)] = () => {
        if (phase !== 'input' || typed.length >= span) return;
        typed.push(d);
        paintInput();
      };
    }
    digitHandlers.Enter = submit;
    digitHandlers.Backspace = () => { typed.pop(); paintInput(); };
    kb.on(digitHandlers);

    container.querySelector('#close-game-btn').onclick = () => { kb.destroy(); onClose(); };
    nextRound();
  }
}

/* ===========================================================================
 * 6. MENTAL MATH — timed arithmetic fluency
 * ======================================================================== */
export function renderMentalMath(container, onClose) {
  start();

  function start() {
    const DURATION = 45;
    let score = 0, correct = 0, wrong = 0, left = DURATION, over = false;
    let a = 0, b = 0, op = '+', answer = 0, typed = '';
    let countdown = null;

    function roll() {
      const ops = ['+', '-', '×'];
      op = ops[Math.floor(Math.random() * ops.length)];
      if (op === '+') { a = 10 + Math.floor(Math.random() * 40); b = 10 + Math.floor(Math.random() * 40); answer = a + b; }
      else if (op === '-') { a = 20 + Math.floor(Math.random() * 50); b = 5 + Math.floor(Math.random() * (a - 5)); answer = a - b; }
      else { a = 3 + Math.floor(Math.random() * 9); b = 3 + Math.floor(Math.random() * 9); answer = a * b; }
      typed = '';
      paint();
    }

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">MENTAL MATH</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Arithmetic fluency · 45-second sprint</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE <span id="mm-score" class="text-amber-400 text-base">0</span></div>
          <div><span id="mm-time" class="text-white text-base">${DURATION}</span>s</div>
          <div>OK <span id="mm-ok" class="text-white">0</span> · X <span id="mm-bad" class="text-white">0</span></div>
        </div>
        <div id="mm-q" class="text-center text-4xl font-black text-white tracking-wider mb-3 h-14"></div>
        <div id="mm-a" class="text-center text-3xl font-bold text-amber-400 tracking-[0.2em] mb-4 h-12 min-h-[44px]">_</div>
        <div class="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="mm-key axiom-dpad-btn" data-n="${n}">${n}</button>`).join('')}
          <button class="mm-key axiom-dpad-btn" data-n="clear">C</button>
          <button class="mm-key axiom-dpad-btn" data-n="0">0</button>
          <button class="mm-key axiom-dpad-btn" data-n="enter">↵</button>
        </div>
      </div>
    `;

    const qEl = container.querySelector('#mm-q');
    const aEl = container.querySelector('#mm-a');
    const scoreEl = container.querySelector('#mm-score');
    const okEl = container.querySelector('#mm-ok');
    const badEl = container.querySelector('#mm-bad');

    function paint() {
      qEl.innerText = `${a} ${op} ${b}`;
      aEl.innerText = typed.length ? typed : '_';
    }

    function submit() {
      if (over || !typed.length) return;
      const n = parseInt(typed, 10);
      if (n === answer) {
        correct++; score += 10; okEl.innerText = correct; soundFx.playCoin();
      } else {
        wrong++; score = Math.max(0, score - 3); badEl.innerText = wrong; soundFx.playHit();
      }
      scoreEl.innerText = score;
      roll();
    }

    container.querySelectorAll('.mm-key').forEach(btn => {
      btn.onclick = () => {
        if (over) return;
        const k = btn.dataset.n;
        if (k === 'clear') { typed = ''; paint(); return; }
        if (k === 'enter') { submit(); return; }
        if (typed.length >= 4) return;
        typed += k;
        paint();
        soundFx.playClick();
      };
    });

    const kb = new ScopedKeyboard();
    const handlers = {};
    for (let d = 0; d <= 9; d++) {
      handlers[String(d)] = () => { if (over || typed.length >= 4) return; typed += String(d); paint(); };
    }
    handlers.Enter = submit;
    handlers.Backspace = () => { typed = typed.slice(0, -1); paint(); };
    kb.on(handlers);

    countdown = setInterval(() => {
      left--;
      container.querySelector('#mm-time').innerText = left;
      if (left <= 0) {
        over = true;
        clearInterval(countdown);
        kb.destroy();
        showResult({
          container,
          title: correct >= 18 ? 'FLUENT' : 'SPRINT DONE',
          message: `${correct} correct · ${wrong} wrong in 45s. Fluency is speed under accuracy pressure — not calculator avoidance as a lifestyle.`,
          score,
          gameId: 'mental-math',
          tone: correct >= 18 ? 'win' : 'over',
          onRestart: () => start(),
          onClose
        });
      }
    }, 1000);

    container.querySelector('#close-game-btn').onclick = () => { clearInterval(countdown); kb.destroy(); onClose(); };
    roll();
  }
}

/* ===========================================================================
 * 7. VISUAL SEARCH — find the odd target among distractors
 * ======================================================================== */
export function renderVisualSearch(container, onClose) {
  start();

  function start() {
    const ROUNDS = 16;
    let round = 0, score = 0, reactions = [], startedAt = 0;

    function paintRound() {
      round++;
      const size = Math.min(36, 12 + round * 2);
      const targetIdx = Math.floor(Math.random() * size);
      // Feature-search: target is rotated T among upright L distractors (or vice versa).
      const targetIsT = Math.random() < 0.5;
      const cells = Array.from({ length: size }, (_, i) => {
        const isTarget = i === targetIdx;
        const glyph = isTarget ? (targetIsT ? 'T' : 'L') : (targetIsT ? 'L' : 'T');
        const rot = isTarget ? (targetIsT ? 90 : 0) : (targetIsT ? 0 : 90);
        return `<button class="vs-cell" data-target="${isTarget ? '1' : '0'}" style="transform:rotate(${rot}deg)" aria-label="search item">${glyph}</button>`;
      });

      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div>
              <h2 class="text-2xl font-black text-amber-400 tracking-wider">VISUAL SEARCH</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Selective attention · Green &amp; Bavelier paradigm</p>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Find the odd letter — the one rotated differently from the rest. Distractors grow each round.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND <span class="text-white">${round}</span> / ${ROUNDS}</div>
            <div>SCORE <span id="vs-score" class="text-amber-400">${score}</span></div>
            <div>AVG <span id="vs-avg" class="text-white">${reactions.length ? Math.round(reactions.reduce((a,b)=>a+b,0)/reactions.length) : '—'}ms</span></div>
          </div>
          <div class="vs-grid">${cells.join('')}</div>
        </div>
      `;

      startedAt = performance.now();
      container.querySelectorAll('.vs-cell').forEach(btn => {
        btn.onclick = () => {
          const hit = btn.dataset.target === '1';
          if (hit) {
            const rt = Math.round(performance.now() - startedAt);
            reactions.push(rt);
            score += Math.max(5, 40 - Math.floor(rt / 50));
            soundFx.playCoin();
            if (round >= ROUNDS) {
              const avg = Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
              showResult({
                container,
                title: avg < 1200 ? 'SHARP SEARCH' : 'FIELD CLEARED',
                message: `Average find time ${avg}ms across ${ROUNDS} rounds. Action-game players tend to search cluttered fields faster without losing accuracy.`,
                score,
                gameId: 'visual-search',
                tone: avg < 1200 ? 'win' : 'over',
                onRestart: () => start(),
                onClose
              });
            } else {
              paintRound();
            }
          } else {
            score = Math.max(0, score - 5);
            container.querySelector('#vs-score').innerText = score;
            soundFx.playHit();
          }
        };
      });
      container.querySelector('#close-game-btn').onclick = onClose;
    }

    paintRound();
  }
}

/* ===========================================================================
 * 8. CORSI BLOCKS — tap the sequence in order (visuospatial span)
 * ======================================================================== */
export function renderCorsiBlocks(container, onClose) {
  start();

  function start() {
    let span = 3, score = 0, lives = 3, phase = 'idle';
    let sequence = [], step = 0;

    const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">CORSI BLOCKS</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Visuospatial working memory · Corsi 1972</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Watch the blocks light up. Tap them back in the same order. Span grows on success.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SPAN <span id="cb-span" class="text-amber-400 text-base">3</span></div>
          <div>SCORE <span id="cb-score" class="text-white">0</span></div>
          <div>LIVES <span id="cb-lives" class="text-white">3</span></div>
        </div>
        <div id="cb-status" class="text-center text-xs text-amber-500/80 uppercase mb-3 h-5">WATCH</div>
        <div class="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
          ${Array.from({ length: 9 }, (_, i) =>
            `<button class="cb-cell aspect-square min-h-[56px] bg-zinc-900 border border-amber-500/30" data-i="${i}" aria-label="block ${i + 1}"></button>`
          ).join('')}
        </div>
      </div>
    `;

    const cells = [...container.querySelectorAll('.cb-cell')];
    const status = container.querySelector('#cb-status');
    const spanEl = container.querySelector('#cb-span');
    const scoreEl = container.querySelector('#cb-score');
    const livesEl = container.querySelector('#cb-lives');

    function flash(i, on) {
      cells[i].classList.toggle('bg-amber-500', on);
      cells[i].classList.toggle('bg-zinc-900', !on);
    }

    function playSequence() {
      phase = 'show';
      status.textContent = 'WATCH';
      sequence = [];
      const pool = Array.from({ length: 9 }, (_, i) => i);
      for (let i = 0; i < span; i++) {
        const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        sequence.push(pick);
      }
      let t = 0;
      const run = () => {
        if (t > 0) flash(sequence[t - 1], false);
        if (t >= sequence.length) {
          phase = 'input';
          step = 0;
          status.textContent = 'REPEAT';
          return;
        }
        flash(sequence[t], true);
        soundFx.playClick();
        t++;
        setTimeout(run, 650);
      };
      setTimeout(run, 400);
    }

    function fail() {
      lives--;
      livesEl.textContent = lives;
      soundFx.playHit();
      phase = 'idle';
      if (lives <= 0) {
        showResult({
          container,
          title: span >= 6 ? 'SPAN SOLID' : 'CAPACITY CHECK',
          message: `Peak span ${span}. Adult Corsi spans often land near 5–6. The skill is holding a spatial path, not guessing.`,
          score,
          gameId: 'corsi-blocks',
          tone: span >= 6 ? 'win' : 'over',
          onRestart: () => start(),
          onClose
        });
        return;
      }
      span = Math.max(3, span - 1);
      spanEl.textContent = span;
      setTimeout(playSequence, 600);
    }

    cells.forEach(btn => {
      btn.onclick = () => {
        if (phase !== 'input') return;
        const i = parseInt(btn.dataset.i, 10);
        flash(i, true);
        setTimeout(() => flash(i, false), 180);
        if (i !== sequence[step]) return fail();
        soundFx.playCoin();
        step++;
        if (step >= sequence.length) {
          score += span * 10;
          scoreEl.textContent = score;
          span = Math.min(9, span + 1);
          spanEl.textContent = span;
          phase = 'idle';
          status.textContent = 'GOOD';
          setTimeout(playSequence, 700);
        }
      };
    });

    container.querySelector('#close-game-btn').onclick = onClose;
    playSequence();
  }
}

/* ===========================================================================
 * 9. FLANKER — report the center arrow; ignore the flanks
 * ======================================================================== */
export function renderFlanker(container, onClose) {
  start();

  function start() {
    const TRIALS = 24;
    let t = 0, score = 0, correct = 0, wrong = 0, reactions = [];
    let shownAt = 0, target = '>', armed = false;

    const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">FLANKER</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Selective attention · Eriksen paradigm</p>
          </div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Report the CENTER arrow only. Congruent flanks feel easy. Incongruent flanks are the point.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>TRIAL <span id="fk-trial" class="text-white">0</span> / ${TRIALS}</div>
          <div>OK <span id="fk-ok" class="text-amber-400">0</span></div>
          <div>AVG <span id="fk-avg" class="text-white">—</span></div>
        </div>
        <div id="fk-stim" class="h-[120px] flex items-center justify-center text-5xl font-black tracking-[0.35em] text-amber-400 bg-zinc-950 border border-amber-500/40 mb-4">·</div>
        <div class="flex justify-center gap-3">
          <button id="fk-left" class="axiom-dpad-btn px-8 py-4 text-xl">◀ LEFT</button>
          <button id="fk-right" class="axiom-dpad-btn px-8 py-4 text-xl">RIGHT ▶</button>
        </div>
      </div>
    `;

    const stim = container.querySelector('#fk-stim');
    const trialEl = container.querySelector('#fk-trial');
    const okEl = container.querySelector('#fk-ok');
    const avgEl = container.querySelector('#fk-avg');

    function next() {
      if (t >= TRIALS) {
        kb.destroy();
        const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
        showResult({
          container,
          title: correct >= 20 ? 'CLEAN FILTER' : 'SESSION DONE',
          message: `${correct}/${TRIALS} correct · avg ${avg || '—'}ms. The cost of incongruent flanks is the classic interference signature.`,
          score,
          gameId: 'flanker',
          tone: correct >= 20 ? 'win' : 'over',
          onRestart: () => start(),
          onClose
        });
        return;
      }
      t++;
      trialEl.textContent = t;
      const congruent = Math.random() < 0.5;
      target = Math.random() < 0.5 ? '<' : '>';
      const flank = congruent ? target : (target === '<' ? '>' : '<');
      stim.textContent = `${flank}${flank}${target}${flank}${flank}`;
      armed = true;
      shownAt = performance.now();
    }

    function answer(dir) {
      if (!armed) return;
      armed = false;
      const ok = (dir === 'left' && target === '<') || (dir === 'right' && target === '>');
      const rt = Math.round(performance.now() - shownAt);
      if (ok) {
        correct++; score += Math.max(5, 40 - Math.floor(rt / 40));
        reactions.push(rt);
        okEl.textContent = correct;
        avgEl.textContent = `${Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)}ms`;
        soundFx.playCoin();
      } else {
        wrong++; score = Math.max(0, score - 6);
        soundFx.playHit();
      }
      stim.textContent = '·';
      setTimeout(next, 450);
    }

    const kb = new ScopedKeyboard();
    kb.on({ ArrowLeft: () => answer('left'), ArrowRight: () => answer('right'), a: () => answer('left'), d: () => answer('right') });
    container.querySelector('#fk-left').onclick = () => answer('left');
    container.querySelector('#fk-right').onclick = () => answer('right');
    container.querySelector('#close-game-btn').onclick = () => { kb.destroy(); onClose(); };
    setTimeout(next, 500);
  }
}

/* ===========================================================================
 * 10. MEMORY PALACE — method of loci (encode walk → recall walk)
 * ======================================================================== */
const PALACE_LOCI = [
  { id: 'gate', label: 'GATE' },
  { id: 'hall', label: 'HALL' },
  { id: 'stove', label: 'STOVE' },
  { id: 'desk', label: 'DESK' },
  { id: 'stair', label: 'STAIR' },
  { id: 'bed', label: 'BED' }
];

const PALACE_ITEMS = [
  'KEY', 'COIN', 'BOOK', 'APPLE', 'LAMP', 'CAT',
  'SWORD', 'BOOT', 'MAP', 'RING', 'CUP', 'FISH',
  'CROWN', 'BELL', 'ROSE', 'OWL'
];

function pickItems(n) {
  const pool = PALACE_ITEMS.slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

export function renderMemoryPalace(container, onClose) {
  start();

  function start() {
    let span = 3;
    let score = 0;
    let lives = 3;
    let placed = [];
    let askIndex = 0;
    let phase = 'idle';
    let timers = [];

    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    container.innerHTML = `
      <section class="palace-game" aria-label="Memory Palace">
        <header class="palace-game__head">
          <div>
            <p>METHOD OF LOCI · YATES 1966</p>
            <h2>MEMORY PALACE</h2>
          </div>
          <div class="palace-game__stats">
            <span>SPAN <b id="mp-span">3</b></span>
            <span>SCORE <b id="mp-score">0</b></span>
            <span>LIVES <b id="mp-lives">3</b></span>
          </div>
        </header>
        <p class="palace-status" id="mp-status">WALK THE HOUSE. PLANT EACH OBJECT.</p>
        <div class="palace-map" id="mp-map" role="list">
          ${PALACE_LOCI.map(l => `
            <div class="palace-locus" data-locus="${l.id}" role="listitem">
              <small>${l.label}</small>
              <strong data-item>—</strong>
            </div>`).join('')}
        </div>
        <div class="palace-choices" id="mp-choices" hidden></div>
      </section>
    `;

    const status = container.querySelector('#mp-status');
    const spanEl = container.querySelector('#mp-span');
    const scoreEl = container.querySelector('#mp-score');
    const livesEl = container.querySelector('#mp-lives');
    const choices = container.querySelector('#mp-choices');
    const lociEls = [...container.querySelectorAll('.palace-locus')];

    function paintItems(show) {
      lociEls.forEach((el, i) => {
        const strong = el.querySelector('[data-item]');
        const hit = placed[i];
        strong.textContent = show && hit ? hit.item : '—';
        el.classList.toggle('is-lit', Boolean(show && hit));
        el.classList.remove('is-ask');
      });
    }

    function endRun(title, tone) {
      clearTimers();
      showResult({
        container,
        title,
        message: `Peak span ${span}. The palace is a route you re-enter — weird images stick harder than polite ones.`,
        score,
        gameId: 'memory-palace',
        tone,
        onRestart: () => start(),
        onClose
      });
    }

    function fail() {
      lives--;
      livesEl.textContent = lives;
      soundFx.playHit();
      if (lives <= 0) {
        endRun(span >= 5 ? 'PALACE STANDING' : 'ROUTE LOST', span >= 5 ? 'win' : 'over');
        return;
      }
      span = Math.max(3, span - 1);
      spanEl.textContent = span;
      status.textContent = 'MISS. WALK AGAIN.';
      timers.push(setTimeout(encodeWalk, 900));
    }

    function askNext() {
      if (askIndex >= placed.length) {
        score += span * 15;
        scoreEl.textContent = score;
        span = Math.min(PALACE_LOCI.length, span + 1);
        spanEl.textContent = span;
        soundFx.playCoin();
        status.textContent = 'CLEAN WALK. SPAN UP.';
        timers.push(setTimeout(encodeWalk, 900));
        return;
      }

      phase = 'recall';
      const target = placed[askIndex];
      paintItems(false);
      const el = lociEls[target.locus];
      el.classList.add('is-ask');
      status.textContent = `WHAT WAS AT THE ${PALACE_LOCI[target.locus].label}?`;

      const decoys = pickItems(3).filter(x => x !== target.item);
      while (decoys.length < 3) {
        const extra = PALACE_ITEMS[Math.floor(Math.random() * PALACE_ITEMS.length)];
        if (extra !== target.item && !decoys.includes(extra)) decoys.push(extra);
      }
      const options = [target.item, ...decoys.slice(0, 3)].sort(() => Math.random() - 0.5);
      choices.hidden = false;
      choices.innerHTML = options.map(o =>
        `<button type="button" class="palace-choice" data-item="${o}">${o}</button>`
      ).join('');

      choices.querySelectorAll('.palace-choice').forEach(btn => {
        btn.onclick = () => {
          if (phase !== 'recall') return;
          phase = 'idle';
          choices.querySelectorAll('.palace-choice').forEach(b => { b.disabled = true; });
          if (btn.dataset.item === target.item) {
            soundFx.playClick();
            askIndex++;
            timers.push(setTimeout(askNext, 350));
          } else {
            fail();
          }
        };
      });
    }

    function encodeWalk() {
      clearTimers();
      phase = 'encode';
      choices.hidden = true;
      choices.innerHTML = '';
      const items = pickItems(span);
      placed = items.map((item, i) => ({ locus: i, item }));
      paintItems(false);
      status.textContent = 'ENCODE — WATCH EACH LOCUS';
      let step = 0;

      const showStep = () => {
        if (step >= placed.length) {
          paintItems(false);
          status.textContent = 'RECALL — WALK THE HOUSE';
          askIndex = 0;
          timers.push(setTimeout(askNext, 500));
          return;
        }
        paintItems(false);
        const { locus, item } = placed[step];
        const el = lociEls[locus];
        el.classList.add('is-lit');
        el.querySelector('[data-item]').textContent = item;
        soundFx.playClick();
        status.textContent = `${PALACE_LOCI[locus].label} ← ${item}`;
        step++;
        timers.push(setTimeout(showStep, 1100));
      };
      timers.push(setTimeout(showStep, 400));
    }

    encodeWalk();
  }
}
