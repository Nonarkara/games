/**
 * Daily-use trainers: short rounds, one rule, TAP TO START.
 *   Reaction Gate  → Dinges 1997 psychomotor vigilance (simple RT)
 *   One-Back       → Kirchner 1958 N-back, N=1 on-ramp to Dual N-Back
 *   Oddball        → Squires 1975 rare-target detection
 *   Backward Span  → Miller 1956 / Baddeley, digits in reverse
 *
 * Scoring helpers are exported so the conservation laws can be tested
 * without a browser.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult, attachReady } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';

export function scoreReactionGate({ hits, falseStarts, trials = 20 }) {
  return Math.max(0, hits * 20 - falseStarts * 15 + Math.max(0, trials - hits - falseStarts) * 0);
}

export function isOneBackMatch(previous, current) {
  return previous !== null && previous === current;
}

export function reverseDigits(digits) {
  return [...digits].reverse();
}

export function scoreOddball({ hits, falseAlarms, misses }) {
  return Math.max(0, hits * 20 - falseAlarms * 18 - misses * 8);
}

function closeButton() {
  return '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';
}

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* --------------------------------------------------------------------------
 * REACTION GATE — wait for amber, then tap. Early taps are misses.
 * --------------------------------------------------------------------- */
export function renderReactionGate(container, onClose) {
  start();

  function start() {
    const TRIALS = 20;
    let t = 0, hits = 0, falseStarts = 0, reactions = [];
    let waiting = false, armed = false, shownAt = 0, waitTimer = null, over = false;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">REACTION GATE</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Wait for amber. Tap. Early taps miss · Dinges 1997</p>
          </div>${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>TRIAL <b id="rg-trial" class="text-white">0</b> / ${TRIALS}</span>
          <span>HITS <b id="rg-hits" class="text-amber-400">0</b></span>
          <span>EARLY <b id="rg-fa" class="text-white">0</b></span>
        </div>
        <button id="rg-stage" type="button" class="w-full h-[220px] bg-zinc-950 border border-amber-500/40 flex items-center justify-center text-2xl font-black tracking-widest text-zinc-500" aria-label="Tap when amber">WAIT</button>
        <p class="mt-3 text-[11px] leading-relaxed text-zinc-400">Do nothing until the box turns amber. Then tap it as soon as you see the colour change.</p>
      </div>`;

    const stage = container.querySelector('#rg-stage');
    const trialEl = container.querySelector('#rg-trial');
    const hitsEl = container.querySelector('#rg-hits');
    const faEl = container.querySelector('#rg-fa');

    function paint(text, color, bg) {
      stage.textContent = text;
      stage.style.color = color;
      stage.style.background = bg;
    }

    function nextTrial() {
      if (over) return;
      if (t >= TRIALS) return finish();
      t++;
      trialEl.textContent = t;
      waiting = true;
      armed = false;
      paint('WAIT', '#71717a', '#09090b');
      const delay = 1200 + Math.floor(Math.random() * 2800);
      waitTimer = setTimeout(() => {
        if (over) return;
        waiting = false;
        armed = true;
        shownAt = performance.now();
        paint('TAP', '#1a1206', '#f59e0b');
        soundFx.playClick();
      }, delay);
    }

    function tap() {
      if (over) return;
      if (waiting) {
        waiting = false;
        clearTimeout(waitTimer);
        falseStarts++;
        faEl.textContent = falseStarts;
        soundFx.playHit();
        paint('TOO EARLY', '#e6edf3', '#09090b');
        setTimeout(nextTrial, 700);
        return;
      }
      if (!armed) return;
      armed = false;
      const rt = Math.round(performance.now() - shownAt);
      if (rt < 80) {
        falseStarts++;
        faEl.textContent = falseStarts;
        soundFx.playHit();
        paint('ANTICIPATED', '#e6edf3', '#09090b');
      } else {
        hits++;
        reactions.push(rt);
        hitsEl.textContent = hits;
        soundFx.playCoin();
        paint(`${rt} MS`, '#f59e0b', '#09090b');
      }
      setTimeout(nextTrial, 700);
    }

    function finish() {
      over = true;
      clearTimeout(waitTimer);
      const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
      const score = scoreReactionGate({ hits, falseStarts, trials: TRIALS });
      showResult({
        container,
        title: falseStarts === 0 && hits >= 16 ? 'CLEAN GATE' : 'SESSION COMPLETE',
        message: `${hits} hits · ${falseStarts} early taps · average ${avg || '—'}ms. The skill is waiting, then moving — not guessing.`,
        score,
        gameId: 'reaction-gate',
        tone: falseStarts === 0 && hits >= 16 ? 'win' : 'over',
        onRestart: start,
        onClose
      });
    }

    stage.onclick = tap;
    container.querySelector('#close-game-btn').onclick = () => {
      over = true; clearTimeout(waitTimer); onClose();
    };
    attachReady(container.firstElementChild, nextTrial);
  }
}

/* --------------------------------------------------------------------------
 * ONE-BACK — N=1 position match. On-ramp to Dual N-Back.
 * --------------------------------------------------------------------- */
export function renderOneBack(container, onClose) {
  start();

  function start() {
    const TRIALS = 20;
    const seq = [];
    for (let i = 0; i < TRIALS; i++) {
      let pos = Math.floor(Math.random() * 9);
      if (i > 0 && Math.random() < 0.35) pos = seq[i - 1];
      seq.push(pos);
    }

    let t = -1, hits = 0, falseAlarms = 0, misses = 0, claimed = false, timer = null, score = 0;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">ONE-BACK</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Same square as last turn? Tap MATCH · Kirchner 1958</p>
          </div>${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>TRIAL <b id="ob-trial" class="text-white">0</b> / ${TRIALS}</span>
          <span>SCORE <b id="ob-score" class="text-amber-400">0</b></span>
        </div>
        <div class="grid grid-cols-3 gap-2 max-w-[264px] mx-auto mb-4">
          ${Array.from({ length: 9 }, (_, i) => `<div class="ob-cell aspect-square bg-zinc-900 border border-amber-500/30" data-i="${i}"></div>`).join('')}
        </div>
        <button id="ob-match" type="button" class="axiom-dpad-btn w-full py-4">MATCH — SAME AS LAST</button>
        <p class="mt-3 text-[11px] leading-relaxed text-zinc-400">Do nothing if the lit square moved. Tap MATCH only when it stayed put.</p>
      </div>`;

    const cells = [...container.querySelectorAll('.ob-cell')];
    const scoreEl = container.querySelector('#ob-score');
    const trialEl = container.querySelector('#ob-trial');

    function claim() {
      if (t < 1) return;
      if (claimed) return;
      claimed = true;
      if (isOneBackMatch(seq[t - 1], seq[t])) {
        hits++; score += 15; soundFx.playCoin();
      } else {
        falseAlarms++; score = Math.max(0, score - 5); soundFx.playHit();
      }
      scoreEl.textContent = score;
    }

    function step() {
      if (t >= 0) {
        if (t >= 1 && !claimed && isOneBackMatch(seq[t - 1], seq[t])) misses++;
      }
      t++;
      if (t >= TRIALS) return finish();
      claimed = false;
      trialEl.textContent = t + 1;
      cells.forEach(cell => cell.classList.remove('bg-amber-500'));
      cells[seq[t]].classList.add('bg-amber-500');
      timer = setTimeout(step, 1800);
    }

    function finish() {
      clearTimeout(timer);
      kb.destroy();
      const total = hits + falseAlarms + misses;
      const acc = total ? Math.round((hits / total) * 100) : 0;
      showResult({
        container,
        title: acc >= 70 ? 'HOLDING THE LAST SQUARE' : 'SESSION COMPLETE',
        message: `${hits} hits · ${falseAlarms} false alarms · ${misses} missed matches. This is Dual N-Back with one square and one turn — the same muscle, less load.`,
        score,
        gameId: 'one-back',
        tone: acc >= 70 ? 'win' : 'over',
        onRestart: start,
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({ m: claim, M: claim, ' ': claim });
    container.querySelector('#ob-match').onclick = claim;
    container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); kb.destroy(); onClose(); };
    attachReady(container.firstElementChild, step);
  }
}

/* --------------------------------------------------------------------------
 * ODDBALL — tap only the rare target.
 * --------------------------------------------------------------------- */
export function renderOddball(container, onClose) {
  start();

  function start() {
    const TRIALS = 24;
    const TARGETS = Math.round(TRIALS * 0.25);
    const seq = shuffled([
      ...Array(TARGETS).fill('TARGET'),
      ...Array(TRIALS - TARGETS).fill('STANDARD')
    ]);

    let t = -1, hits = 0, falseAlarms = 0, misses = 0, armed = false, timer = null, over = false;

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">ODDBALL</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Tap the diamond. Ignore the square · Squires 1975</p>
          </div>${closeButton()}
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>TRIAL <b id="od-trial" class="text-white">0</b> / ${TRIALS}</span>
          <span>HITS <b id="od-hits" class="text-amber-400">0</b></span>
          <span>FALSE <b id="od-fa" class="text-white">0</b></span>
        </div>
        <button id="od-stage" type="button" class="w-full h-[220px] bg-zinc-950 border border-amber-500/40 flex items-center justify-center" aria-label="Tap only the diamond">
          <span id="od-glyph" class="text-6xl text-zinc-600">·</span>
        </button>
        <p class="mt-3 text-[11px] leading-relaxed text-zinc-400">Most flashes are a square. Tap only when you see a diamond.</p>
      </div>`;

    const stage = container.querySelector('#od-stage');
    const glyph = container.querySelector('#od-glyph');
    const trialEl = container.querySelector('#od-trial');
    const hitsEl = container.querySelector('#od-hits');
    const faEl = container.querySelector('#od-fa');

    function respond() {
      if (!armed || over) return;
      armed = false;
      if (seq[t] === 'TARGET') {
        hits++; hitsEl.textContent = hits; soundFx.playCoin();
      } else {
        falseAlarms++; faEl.textContent = falseAlarms; soundFx.playHit();
      }
    }

    function step() {
      if (t >= 0 && armed && seq[t] === 'TARGET') misses++;
      t++;
      if (t >= TRIALS) return finish();
      armed = true;
      trialEl.textContent = t + 1;
      const target = seq[t] === 'TARGET';
      glyph.textContent = target ? '◆' : '■';
      glyph.style.color = target ? '#f59e0b' : '#52525b';
      timer = setTimeout(step, 900);
    }

    function finish() {
      over = true;
      clearTimeout(timer);
      const score = scoreOddball({ hits, falseAlarms, misses });
      showResult({
        container,
        title: falseAlarms === 0 && hits >= TARGETS - 1 ? 'RARE TARGET HELD' : 'SESSION COMPLETE',
        message: `${hits} / ${TARGETS} diamonds · ${falseAlarms} false taps · ${misses} missed. The work is ignoring the common flash.`,
        score,
        gameId: 'oddball',
        tone: falseAlarms === 0 && hits >= TARGETS - 1 ? 'win' : 'over',
        onRestart: start,
        onClose
      });
    }

    stage.onclick = respond;
    container.querySelector('#close-game-btn').onclick = () => { over = true; clearTimeout(timer); onClose(); };
    attachReady(container.firstElementChild, step);
  }
}

/* --------------------------------------------------------------------------
 * BACKWARD SPAN — same keypad as Digit Span, digits reversed.
 * --------------------------------------------------------------------- */
export function renderBackwardSpan(container, onClose) {
  start();

  function start() {
    let span = 2, peak = 0, lives = 3, phase = 'idle';
    let target = [], typed = [];

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">BACKWARD SPAN</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Type the digits in reverse · Miller 1956</p>
          </div>${closeButton()}
        </div>
        <p class="text-amber-500/80 text-[10px] uppercase text-center mb-3">Watch the digits. Type them back last-to-first. Span grows on success.</p>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <span>SPAN <b id="bs-span" class="text-amber-400">2</b></span>
          <span>PEAK <b id="bs-peak" class="text-white">0</b></span>
          <span>LIVES <b id="bs-lives" class="text-white">3</b></span>
        </div>
        <div id="bs-display" class="font-mono-hud h-[100px] flex items-center justify-center text-5xl font-black tracking-widest text-amber-400 bg-zinc-950 border border-amber-500/40 mb-4" style="font-family:'JetBrains Mono',monospace">—</div>
        <div id="bs-input" class="font-mono-hud h-12 flex items-center justify-center text-2xl font-bold tracking-widest text-white mb-4 min-h-[44px]" style="font-family:'JetBrains Mono',monospace">&nbsp;</div>
        <div class="grid grid-cols-5 gap-2 max-w-[280px] mx-auto">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button class="bs-key axiom-dpad-btn" data-n="${n}">${n}</button>`).join('')}
        </div>
        <div class="flex justify-center gap-2 mt-3">
          <button id="bs-clear" class="axiom-dpad-btn">CLEAR</button>
          <button id="bs-enter" class="axiom-dpad-btn">ENTER</button>
        </div>
      </div>`;

    const display = container.querySelector('#bs-display');
    const inputEl = container.querySelector('#bs-input');
    const spanEl = container.querySelector('#bs-span');
    const peakEl = container.querySelector('#bs-peak');
    const livesEl = container.querySelector('#bs-lives');

    function paintInput() {
      inputEl.innerText = typed.length ? typed.join('') : (phase === 'input' ? '_' : '\u00a0');
    }

    function nextRound() {
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
      const want = reverseDigits(target);
      const ok = typed.length === want.length && typed.every((d, i) => d === want[i]);
      if (ok) {
        peak = Math.max(peak, span);
        peakEl.textContent = peak;
        span = Math.min(8, span + 1);
        spanEl.textContent = span;
        soundFx.playCoin();
        nextRound();
      } else {
        lives--;
        livesEl.textContent = lives;
        soundFx.playHit();
        if (lives <= 0) {
          kb.destroy();
          showResult({
            container,
            title: peak >= 5 ? 'REVERSE HOLD' : 'CAPACITY CHECK',
            message: peak
              ? `Peak reverse span ${peak}. Reversing the string is harder than repeating it — that extra step is working memory, not just echo.`
              : 'No reverse span cleared. Watch once, say the digits backward out loud, then type.',
            score: peak,
            gameId: 'backward-span',
            tone: peak >= 5 ? 'win' : 'over',
            onRestart: start,
            onClose
          });
          return;
        }
        span = Math.max(2, span - 1);
        spanEl.textContent = span;
        nextRound();
      }
    }

    container.querySelectorAll('.bs-key').forEach(btn => {
      btn.onclick = () => {
        if (phase !== 'input' || typed.length >= span) return;
        typed.push(parseInt(btn.dataset.n, 10));
        paintInput();
        soundFx.playClick();
      };
    });
    container.querySelector('#bs-clear').onclick = () => { typed = []; paintInput(); };
    container.querySelector('#bs-enter').onclick = submit;

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
    attachReady(container.firstElementChild, nextRound);
  }
}
