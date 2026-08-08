/**
 * OmniArcade — Trainer Suite (Console Edition)
 * Three research-anchored trainers, each mapped to a citation in the
 * portal's THE SCIENCE section:
 *   Dual N-Back    → Jaeggi et al. 2008 (working memory)
 *   Schulte Table  → classic attention/peripheral-scan drill
 *   Aim Trainer    → Dye/Green/Bavelier 2009 (processing speed, hand-eye)
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
