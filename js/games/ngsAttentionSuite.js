/**
 * Dr Non — Non-Gaming System · Attention & Complex-Span Suite
 * Phase 6 (2026-08-10). Three lab tasks that fill real gaps in the TRAIN wing.
 *
 *   Posner Cueing    → Posner 1980 (covert spatial attention orienting)
 *   Change Blindness → Rensink 1997 (flicker paradigm, attention to change)
 *   Operation Span   → Turner & Engle 1989 (complex span: hold + process)
 *
 * None duplicates an existing cartridge: Posner measures the *cost* of an
 * invalid cue (not raw reaction like Aim Trainer), Change Blindness tests
 * change detection across an interruption (not visual search in clutter),
 * and Operation Span interleaves a processing task with storage (unlike
 * Digit Span, which is pure storage).
 *
 * Renderer contract: (container, onClose), self-mounts in the modal, ends
 * via showResult({ gameId }) so the leaderboard path picks it up.
 * Every interval/timeout is cleared on close — GameSession also traps them,
 * but each game cleans up after itself so it is airtight standalone.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

const head = (icon, title, sub) => `
  <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
    <div class="flex items-center gap-3">
      <span class="text-3xl text-amber-400">${icon}</span>
      <div>
        <h2 class="text-xl font-black text-amber-400 tracking-wider">${title}</h2>
        <p class="text-[10px] text-amber-500/80 uppercase">${sub}</p>
      </div>
    </div>
    <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
  </div>`;

/* ===========================================================================
 * 1. POSNER CUEING — Posner 1980
 * A cue flashes left or right, then the target appears. 75% of cues are
 * valid. The measure is the cueing effect: invalid-RT minus valid-RT. A
 * positive effect means attention really did move to the cued side.
 * ======================================================================== */
export function renderPosnerCueing(container, onClose) {
  start();

  function start() {
    const TRIALS = 24;
    let trial = 0;
    let phase = 'idle';          // idle | cue | target | done
    let targetSide = null;
    let cueValid = true;
    let shownAt = 0;
    const validRT = [], invalidRT = [];
    let errors = 0;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; };
    const clearAll = () => { timers.forEach(clearTimeout); timers.clear(); };

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('👁', 'POSNER CUEING', 'Covert attention · Posner 1980')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          Keep your eyes on the centre cross. A box flashes, then a dot appears.
          Press ← or → for the side the DOT is on — not the box. Most flashes predict correctly; some lie.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>TRIAL <span id="pc-trial" class="text-white">0</span> / ${TRIALS}</div>
          <div>CUE EFFECT <span id="pc-eff" class="text-amber-400">—</span></div>
          <div>ERRORS <span id="pc-err" class="text-white">0</span></div>
        </div>
        <div class="relative bg-zinc-950 border border-amber-500/40 h-[200px] flex items-center justify-center gap-16">
          <div id="pc-left"  class="w-20 h-20 border-2 border-zinc-700 flex items-center justify-center"></div>
          <div class="text-amber-400 text-3xl font-black select-none">+</div>
          <div id="pc-right" class="w-20 h-20 border-2 border-zinc-700 flex items-center justify-center"></div>
        </div>
        <p id="pc-status" class="text-center text-amber-500/80 text-[11px] uppercase mt-3">Press SPACE to begin</p>
        <div class="flex justify-center gap-3 mt-3">
          <button id="pc-l" class="axiom-dpad-btn px-8 py-3">← LEFT</button>
          <button id="pc-r" class="axiom-dpad-btn px-8 py-3">RIGHT →</button>
        </div>
      </div>`;

    const L = container.querySelector('#pc-left');
    const R = container.querySelector('#pc-right');
    const status = container.querySelector('#pc-status');

    const clearBoxes = () => {
      [L, R].forEach(b => { b.className = 'w-20 h-20 border-2 border-zinc-700 flex items-center justify-center'; b.innerHTML = ''; });
    };

    function nextTrial() {
      if (trial >= TRIALS) return end();
      trial++;
      container.querySelector('#pc-trial').innerText = trial;
      phase = 'cue';
      clearBoxes();
      status.innerText = 'WATCH';
      const cueSide = Math.random() < 0.5 ? 'L' : 'R';
      cueValid = Math.random() < 0.75;
      targetSide = cueValid ? cueSide : (cueSide === 'L' ? 'R' : 'L');
      const cueBox = cueSide === 'L' ? L : R;
      cueBox.className = 'w-20 h-20 border-2 border-amber-400 flex items-center justify-center';
      later(() => {
        clearBoxes();
        // Stimulus-onset asynchrony: 100–300ms, the window where the effect lives
        later(() => {
          phase = 'target';
          const t = targetSide === 'L' ? L : R;
          t.innerHTML = '<span class="block w-7 h-7 bg-amber-400" style="border-radius:50%"></span>';
          shownAt = performance.now();
          status.innerText = 'RESPOND';
          // Miss deadline: ignoring a target used to freeze the round forever.
          later(() => {
            if (phase !== 'target') return;
            phase = 'idle';
            errors++;
            container.querySelector('#pc-err').innerText = errors;
            soundFx.playHit();
            status.innerText = 'MISSED';
            clearBoxes();
            later(nextTrial, 500);
          }, 2000);
        }, 100 + Math.random() * 200);
      }, 120);
    }

    function respond(side) {
      if (phase !== 'target') return;
      phase = 'idle';
      const rt = Math.round(performance.now() - shownAt);
      if (side === targetSide) {
        (cueValid ? validRT : invalidRT).push(rt);
        soundFx.playCoin();
      } else {
        errors++;
        container.querySelector('#pc-err').innerText = errors;
        soundFx.playHit();
      }
      const mv = mean(validRT), mi = mean(invalidRT);
      if (validRT.length && invalidRT.length) {
        container.querySelector('#pc-eff').innerText = `${Math.round(mi - mv)}ms`;
      }
      clearBoxes();
      status.innerText = '…';
      later(nextTrial, 500);
    }

    const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

    function end() {
      phase = 'done';
      clearAll();
      kb.destroy();
      const mv = Math.round(mean(validRT)), mi = Math.round(mean(invalidRT));
      const effect = mi - mv;
      // Score rewards speed and a real (positive) cueing effect; errors cost.
      const score = Math.max(0, Math.round((700 - mv) + Math.max(0, effect) * 2 - errors * 25));
      showResult({
        container,
        title: effect > 0 ? 'ATTENTION MOVED' : 'SESSION COMPLETE',
        message: `Valid cue ${mv}ms · invalid cue ${mi}ms · cueing effect ${effect}ms with ${errors} error${errors === 1 ? '' : 's'}. A positive effect is the cost of re-orienting after a cue points the wrong way — Posner's original finding.`,
        score,
        gameId: 'posner-cueing',
        tone: effect > 0 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    const kb = new ScopedKeyboard();
    kb.on({
      ArrowLeft: () => respond('L'),
      ArrowRight: () => respond('R'),
      ' ': () => { if (phase === 'idle' && trial === 0) nextTrial(); }
    });
    container.querySelector('#pc-l').onclick = () => (trial === 0 && phase === 'idle') ? nextTrial() : respond('L');
    container.querySelector('#pc-r').onclick = () => (trial === 0 && phase === 'idle') ? nextTrial() : respond('R');
    container.querySelector('#close-game-btn').onclick = () => { clearAll(); kb.destroy(); onClose(); };
  }
}

/* ===========================================================================
 * 2. CHANGE BLINDNESS — Rensink 1997 (flicker paradigm)
 * A grid alternates with a blank. One cell differs between the two versions.
 * Without the blank you would see it instantly; with it, the motion signal
 * that normally captures attention is destroyed.
 * ======================================================================== */
export function renderChangeBlindness(container, onClose) {
  start();

  function start() {
    const ROUNDS = 6, COLS = 6, ROWS = 4, N = COLS * ROWS;
    const PALETTE = ['#f59e0b', '#e6edf3', '#6b7785', '#3fb950', '#f85149', '#9aa7b5'];
    let round = 0, score = 0, found = 0;
    let gridA = [], changeIdx = 0, showingA = true;
    let flicker = null, startedAt = 0, roundTimer = null;
    const ROUND_MS = 20000;

    container.innerHTML = `
      <div class="${FRAME}">
        ${head('🫥', 'CHANGE BLINDNESS', 'Flicker paradigm · Rensink 1997')}
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
          One square keeps changing colour. The blank flash between frames hides the movement your eye would normally catch.
          Click the square that changes. 20 seconds per round.
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>ROUND <span id="cb-round" class="text-white">1</span> / ${ROUNDS}</div>
          <div>FOUND <span id="cb-found" class="text-amber-400">0</span></div>
          <div><span id="cb-time" class="text-white">20.0</span>s</div>
        </div>
        <div id="cb-grid" class="grid gap-1.5 bg-zinc-950 border border-amber-500/40 p-3"
             style="grid-template-columns:repeat(${COLS},1fr)"></div>
      </div>`;

    const gridEl = container.querySelector('#cb-grid');
    const timeEl = container.querySelector('#cb-time');

    function paint(cells) {
      gridEl.innerHTML = cells.map((c, i) =>
        `<button class="cb-cell aspect-square min-h-[44px] border border-zinc-800" data-i="${i}" style="background:${c}"></button>`
      ).join('');
      gridEl.querySelectorAll('.cb-cell').forEach(b => {
        b.onclick = () => guess(parseInt(b.dataset.i, 10));
      });
    }

    function blank() {
      gridEl.innerHTML = Array.from({ length: N }, () =>
        `<div class="aspect-square min-h-[44px] border border-zinc-900" style="background:#0a0e14"></div>`
      ).join('');
    }

    function newRound() {
      round++;
      if (round > ROUNDS) return end();
      container.querySelector('#cb-round').innerText = round;
      gridA = Array.from({ length: N }, () => PALETTE[Math.floor(Math.random() * PALETTE.length)]);
      changeIdx = Math.floor(Math.random() * N);
      const other = PALETTE.filter(c => c !== gridA[changeIdx]);
      const gridB = gridA.slice();
      gridB[changeIdx] = other[Math.floor(Math.random() * other.length)];
      showingA = true;
      startedAt = performance.now();

      clearInterval(flicker);
      // A → blank → B → blank → A …  (the blank is what makes this hard)
      let step = 0;
      flicker = setInterval(() => {
        step = (step + 1) % 4;
        if (step === 0) paint(gridA);
        else if (step === 1) blank();
        else if (step === 2) paint(gridB);
        else blank();
      }, 300);
      paint(gridA);

      clearInterval(roundTimer);
      roundTimer = setInterval(() => {
        const left = ROUND_MS - (performance.now() - startedAt);
        timeEl.innerText = Math.max(0, left / 1000).toFixed(1);
        if (left <= 0) { soundFx.playHit(); nextRound(false); }
      }, 100);
    }

    function guess(i) {
      if (i === changeIdx) {
        const secs = (performance.now() - startedAt) / 1000;
        score += Math.max(20, Math.round(200 - secs * 8));
        found++;
        container.querySelector('#cb-found').innerText = found;
        soundFx.playCoin();
        nextRound(true);
      } else {
        score = Math.max(0, score - 10);
        soundFx.playHit();
      }
    }

    function nextRound() {
      clearInterval(flicker); clearInterval(roundTimer);
      setTimeout(newRound, 350);
    }

    function end() {
      clearInterval(flicker); clearInterval(roundTimer);
      showResult({
        container,
        title: found >= 4 ? 'SHARP EYES' : 'SESSION COMPLETE',
        message: `${found} of ${ROUNDS} changes found. The blank frame wipes the motion cue your visual system normally uses — which is why a change in plain sight can stay invisible.`,
        score,
        gameId: 'change-blindness',
        tone: found >= 4 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    container.querySelector('#close-game-btn').onclick = () => {
      clearInterval(flicker); clearInterval(roundTimer); onClose();
    };
    newRound();
  }
}

/* ===========================================================================
 * 3. OPERATION SPAN — Turner & Engle 1989
 * Verify a simple equation (the processing load), then hold a letter (the
 * storage load). Recall the letters in order at the end of the set. Holding
 * while processing is the thing complex span measures that simple span cannot.
 * ======================================================================== */
export function renderOperationSpan(container, onClose) {
  start();

  function start() {
    const SETS = [3, 4, 5, 6];       // letters per set, growing
    const LETTERS = 'FHJKLNPQRSTY'.split('');
    let setIdx = 0, itemIdx = 0;
    let letters = [], mathHits = 0, mathTotal = 0, score = 0, recalled = 0, totalLetters = 0;
    let current = null;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; };
    const clearAll = () => { timers.forEach(clearTimeout); timers.clear(); };

    function shell(inner) {
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🧮', 'OPERATION SPAN', 'Complex span · Turner & Engle 1989')}
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>SET <span class="text-white">${Math.min(setIdx + 1, SETS.length)}</span> / ${SETS.length}</div>
            <div>MATH <span class="text-amber-400">${mathHits}/${mathTotal}</span></div>
            <div>RECALL <span class="text-amber-400">${recalled}/${totalLetters}</span></div>
          </div>
          ${inner}
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearAll(); onClose(); };
    }

    function makeEquation() {
      const a = 2 + Math.floor(Math.random() * 8);
      const b = 2 + Math.floor(Math.random() * 8);
      const op = Math.random() < 0.5 ? '+' : '×';
      const real = op === '+' ? a + b : a * b;
      const truthful = Math.random() < 0.5;
      const shown = truthful ? real : real + (Math.random() < 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 3));
      return { text: `${a} ${op} ${b} = ${shown}`, correct: truthful };
    }

    function askMath() {
      current = makeEquation();
      shell(`
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">Is this equation true? Then remember the letter that follows.</div>
        <div class="bg-zinc-950 border border-amber-500/40 py-10 text-center text-4xl font-black text-white mb-4">${current.text}</div>
        <div class="flex justify-center gap-3">
          <button id="os-t" class="axiom-dpad-btn px-10 py-3">TRUE</button>
          <button id="os-f" class="axiom-dpad-btn px-10 py-3">FALSE</button>
        </div>`);
      container.querySelector('#os-t').onclick = () => answerMath(true);
      container.querySelector('#os-f').onclick = () => answerMath(false);
    }

    function answerMath(said) {
      mathTotal++;
      if (said === current.correct) { mathHits++; soundFx.playClick(); }
      else soundFx.playHit();
      showLetter();
    }

    function showLetter() {
      const L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      letters.push(L);
      shell(`
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">Remember this letter</div>
        <div class="bg-zinc-950 border border-amber-500/40 py-12 text-center text-6xl font-black text-amber-400 mb-4">${L}</div>`);
      later(() => {
        itemIdx++;
        if (itemIdx < SETS[setIdx]) askMath();
        else askRecall();
      }, 900);
    }

    function askRecall() {
      shell(`
        <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">Type the letters in the order they appeared</div>
        <form id="os-form" class="text-center">
          <input id="os-input" class="axiom-initials-input" style="width:12ch;letter-spacing:.3em"
                 maxlength="${SETS[setIdx]}" autocomplete="off" spellcheck="false" placeholder="${'·'.repeat(SETS[setIdx])}" />
          <div class="mt-4"><button type="submit" class="axiom-btn axiom-btn-primary px-8">SUBMIT</button></div>
        </form>`);
      const input = container.querySelector('#os-input');
      input.oninput = () => { input.value = input.value.toUpperCase().replace(/[^A-Z]/g, ''); };
      later(() => input.focus(), 30);
      container.querySelector('#os-form').onsubmit = (e) => {
        e.preventDefault();
        const given = input.value.split('');
        let hit = 0;
        letters.forEach((L, i) => { if (given[i] === L) hit++; });
        recalled += hit; totalLetters += letters.length;
        score += hit * 20 + (hit === letters.length ? 40 : 0);
        if (hit === letters.length) soundFx.playCoin(); else soundFx.playHit();
        setIdx++; itemIdx = 0; letters = [];
        if (setIdx >= SETS.length) end(); else askMath();
      };
    }

    function end() {
      clearAll();
      const acc = totalLetters ? Math.round((recalled / totalLetters) * 100) : 0;
      const mathAcc = mathTotal ? Math.round((mathHits / mathTotal) * 100) : 0;
      // Engle's rule: math accuracy under ~85% means storage was bought by
      // dropping the processing task, so the span score is not trustworthy.
      const honest = mathAcc >= 85;
      showResult({
        container,
        title: honest && acc >= 70 ? 'STRONG SPAN' : 'SESSION COMPLETE',
        message: `${recalled}/${totalLetters} letters (${acc}%) with ${mathAcc}% math accuracy. ${honest ? 'Math accuracy held, so the span score counts.' : 'Math accuracy under 85% — letters were held by neglecting the equations, which is exactly what complex span is designed to catch.'}`,
        score: honest ? score : Math.round(score * 0.5),
        gameId: 'operation-span',
        tone: honest && acc >= 70 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    askMath();
  }
}
