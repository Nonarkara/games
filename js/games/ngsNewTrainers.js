/**
 * Dr Non — Non-Gaming System · New Trainer Suite
 * Phase 5 (2026-08-10). Three research-grade cognitive tasks added to the
 * TRAIN wing. Each is mapped to its original paper and a stack tag.
 *
 *   Trail Making Test    → Reitan 1958 (Part B is the classic task-switch)
 *   Mental Rotation      → Shepard & Metzler 1971 (spatial transformation)
 *   Iowa Gambling Task   → Bechara et al. 1994 (somatic-marker risk learning)
 *
 * Renderer contract: each takes (container, onClose) and self-mounts inside
 * the existing modal. End-of-round calls showResult() with the gameId so
 * the leaderboard path picks it up.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. TRAIL MAKING TEST — Reitan 1958
 * Part A: 1 → 2 → 3 → ... → N. Part B: 1 → A → 2 → B → 3 → C alternating.
 * Score = time to complete both parts. Errors reset the trail to that point
 * (so errors cost real time, not just a count). Server score is inverted
 * so higher is better: 600 - seconds_taken (clamped 0..600).
 * ======================================================================== */
export function renderTrailMaking(container, onClose) {
  start('A');
  function start(part, partASeconds) {
    const N = part === 'A' ? 8 : 6;            // 1..N for A; 1..N + A..N for B
    const labels = part === 'A'
      ? Array.from({ length: N }, (_, i) => String(i + 1))
      : Array.from({ length: N * 2 }, (_, i) => i % 2 === 0 ? String(i / 2 + 1) : String.fromCharCode(65 + (i - 1) / 2));
    let targetIdx = 0;
    let errors = 0;
    let startedAt = 0;
    let timer = null;
    let positions = [];

    function placeDots() {
      const W = 480, H = 320;
      const placed = [];
      const tries = 200;
      for (let i = 0; i < labels.length; i++) {
        for (let t = 0; t < tries; t++) {
          const x = 30 + Math.random() * (W - 60);
          const y = 30 + Math.random() * (H - 60);
          const ok = placed.every(p => Math.hypot(p.x - x, p.y - y) > 48);
          if (ok) { placed.push({ x, y }); break; }
          if (t === tries - 1) placed.push({ x: 30 + Math.random() * (W - 60), y: 30 + Math.random() * (H - 60) });
        }
      }
      return placed;
    }

    function render() {
      // Positions and the clock are fixed per part (set in start) — a trail
      // you can plan across is the whole task. Re-randomising per click and
      // restarting the timer made the final time measure only the last click.
      const phase = part;
      const target = labels[targetIdx];
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🔗</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">TRAIL MAKING — PART ${phase}</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">${phase === 'A' ? 'CLICK 1 → 2 → 3 → ... IN ORDER' : 'CLICK 1 → A → 2 → B → 3 → C ALTERNATING'}</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TARGET: <span class="text-amber-400 text-base">${target}</span></div>
            <div>STEP: <span class="text-white text-base">${targetIdx + 1}/${labels.length}</span></div>
            <div>ERRORS: <span class="text-red-500 text-base">${errors}</span></div>
          </div>
          <div class="relative bg-zinc-900 border border-amber-500/60" style="width:480px;max-width:100%;height:320px;margin:0 auto" id="tmt-canvas">
            <svg viewBox="0 0 480 320" style="width:100%;height:100%">
              ${positions.map((p, i) => `
                <g class="tmt-dot" data-idx="${i}" style="cursor:pointer">
                  <circle cx="${p.x}" cy="${p.y}" r="18" fill="${i < targetIdx ? '#22c55e' : i === targetIdx ? '#f59e0b' : '#1f2937'}" stroke="#fbbf24" stroke-width="2"/>
                  <text x="${p.x}" y="${p.y + 5}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="14" fill="${i < targetIdx ? '#ffffff' : '#f59e0b'}">${labels[i]}</text>
                </g>`).join('')}
            </svg>
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.tmt-dot').forEach(d => {
        d.onclick = () => onDot(parseInt(d.dataset.idx, 10));
      });
    }

    function onDot(idx) {
      if (idx !== targetIdx) {
        errors++;
        soundFx.playHit();
        render();
        return;
      }
      soundFx.playCoin();
      targetIdx++;
      if (targetIdx >= labels.length) {
        const elapsed = (performance.now() - startedAt) / 1000;
        if (part === 'A') {
          // Continue into Part B
          renderPartIntro('B', elapsed);
        } else {
          endGame(elapsed);
        }
        return;
      }
      render();
    }

    function renderPartIntro(next, prevTime) {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black text-amber-400 tracking-wider">PART A DONE — ${prevTime.toFixed(1)}s</h2></div>
          </div>
          <p class="text-zinc-200 text-sm mb-4">Part A complete in ${prevTime.toFixed(1)}s with ${errors} error${errors === 1 ? '' : 's'}. Part B alternates numbers and letters. Click continue when ready.</p>
          <button id="tmt-continue" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">CONTINUE TO PART B →</button>
        </div>`;
      container.querySelector('#tmt-continue').onclick = () => start('B', prevTime);
    }

    function endGame(extra) {
      // Total trail time = Part A + Part B. Part A used to be dropped here,
      // which flattened the score toward the ceiling no matter how slow the
      // first half went.
      const totalSeconds = (partASeconds || 0) + extra;
      // For a single score: server treats lower-time-better; we send seconds, the leaderboard can invert
      clearTimeout(timer);
      const score = Math.max(0, Math.round(600 - totalSeconds));
      const message = `Total: ${totalSeconds.toFixed(1)}s. Errors: ${errors}.`;
      showResult({ container, title: 'TRAIL COMPLETE', message, score, gameId: 'trail-making', tone: 'win', onRestart: () => start('A'), onClose });
    }
    positions = placeDots();
    startedAt = performance.now();
    render();
  }
}

/* ===========================================================================
 * 2. MENTAL ROTATION — Shepard & Metzler 1971 (2D, 4 orientations)
 * Two shapes side by side. Decide SAME (one is rotated) or MIRROR (reflected).
 * 20 trials, 8s per trial. Score = max(0, correct*10 - wrong*5).
 * ======================================================================== */
export function renderMentalRotation(container, onClose) {
  start();
  function start() {
    const TRIALS = 20;
    const TIME_PER_TRIAL = 8000;
    let trial = 0, correct = 0, wrong = 0;
    let current = null;   // set after SHAPES exists — makeTrial() reads it
    let trialTimer = null;
    let gameTimer = null;

    // A shape is an array of unit-cell offsets, e.g. [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1}]
    // Chiral shapes ONLY. A mirror-symmetric shape (O, T, I) reflects onto a
    // rotation of itself, which makes a MIRROR trial visually identical to a
    // SAME trial — the correct answer would be undecidable.
    const SHAPES = [
      [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1}],     // L
      [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1}],     // J
      [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1}],     // S
      [{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:2,y:0}],     // Z
      [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:0,y:1}],   // long L (pentomino)
      [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:2},{x:2,y:2}],   // W staircase (pentomino)
    ];
    function rotate(shape, k) {
      let s = shape;
      for (let i = 0; i < k; i++) s = s.map(p => ({ x: -p.y, y: p.x }));
      return normalize(s);
    }
    function reflect(shape) {
      return normalize(shape.map(p => ({ x: -p.x, y: p.y })));
    }
    function normalize(shape) {
      const minX = Math.min(...shape.map(p => p.x));
      const minY = Math.min(...shape.map(p => p.y));
      return shape.map(p => ({ x: p.x - minX, y: p.y - minY })).sort((a, b) => a.y - b.y || a.x - b.x);
    }
    function renderShape(svg, shape, ox, oy, color) {
      const cells = shape.map(p => `<rect x="${ox + p.x * 20}" y="${oy + p.y * 20}" width="18" height="18" fill="${color}" stroke="#fbbf24" stroke-width="1.5"/>`).join('');
      svg.insertAdjacentHTML('beforeend', cells);
    }

    function makeTrial() {
      const base = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const k = [1, 2, 3][Math.floor(Math.random() * 3)];     // 90/180/270 deg
      const isMirror = Math.random() < 0.5;
      // Mirror trials are ALSO rotated — otherwise "looks unrotated" would
      // leak the answer and the task stops measuring rotation at all.
      const other = isMirror ? rotate(reflect(base), k) : rotate(base, k);
      return { base, other, isMirror };
    }

    function render() {
      const elapsed = trial * 0;
      const remaining = TRIALS - trial;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">↻</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">MENTAL ROTATION</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">SAME = RIGHT IS ROTATED · MIRROR = RIGHT IS FLIPPED</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-white text-base">${trial + 1}/${TRIALS}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
            <div>WRONG: <span class="text-red-500 text-base">${wrong}</span></div>
            <div>LEFT: <span class="text-amber-400 text-base">${remaining}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-4 mb-4 flex justify-around" style="min-height:200px">
            <svg viewBox="0 0 140 100" width="140" height="100" id="mr-left"></svg>
            <div class="text-amber-400 text-3xl font-black self-center">?</div>
            <svg viewBox="0 0 140 100" width="140" height="100" id="mr-right"></svg>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button id="mr-same" class="py-4 border-2 border-amber-500 text-amber-400 font-black tracking-widest text-sm hover:bg-amber-500 hover:text-black">SAME</button>
            <button id="mr-mirror" class="py-4 border-2 border-amber-500 text-amber-400 font-black tracking-widest text-sm hover:bg-amber-500 hover:text-black">MIRROR</button>
          </div>
        </div>`;
      const left = container.querySelector('#mr-left');
      const right = container.querySelector('#mr-right');
      renderShape(left, current.base, 14, 8, '#22d3ee');
      renderShape(right, current.other, 14, 8, '#f472b6');
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(trialTimer); clearTimeout(gameTimer); onClose(); };
      container.querySelector('#mr-same').onclick = () => answer(false);
      container.querySelector('#mr-mirror').onclick = () => answer(true);
      clearTimeout(trialTimer);
      trialTimer = setTimeout(() => answer(null), TIME_PER_TRIAL);
    }

    function answer(saidMirror) {
      clearTimeout(trialTimer);
      if (saidMirror === null) {
        wrong++; soundFx.playHit();
      } else if (saidMirror === current.isMirror) {
        correct++; soundFx.playCoin();
      } else {
        wrong++; soundFx.playHit();
      }
      trial++;
      if (trial >= TRIALS) return endGame();
      current = makeTrial();
      render();
    }

    function endGame() {
      clearTimeout(trialTimer);
      clearTimeout(gameTimer);
      const score = Math.max(0, correct * 10 - wrong * 5);
      showResult({ container, title: 'ROTATION COMPLETE', message: `${correct} correct · ${wrong} wrong`, score, gameId: 'mental-rotation', tone: 'win', onRestart: start, onClose });
    }
    current = makeTrial();
    render();
  }
}

/* ===========================================================================
 * 3. IOWA GAMBLING TASK — Bechara et al. 1994
 * 4 decks. A/B: big reward but bigger punishment (disadvantageous).
 *         C/D: small reward but smaller punishment (advantageous).
 * 40 trials. Score = net profit (cents of $). A learning curve, not a reaction.
 * ======================================================================== */
export function renderIowaGambling(container, onClose) {
  start();
  function start() {
    const TRIALS = 40;
    // Each deck is a function: returns { win, loss } per draw
    // Net over any 10 draws: A = -250, B = -250, C = +250, D = +250
    // (Bechara 1994 schedules: A/C lose across five cards per ten, B/D in
    // one lump. The old ranges charged A/C every single draw, which made A
    // catastrophic (-200/draw) and C a wash instead of advantageous.)
    const DECKS = [
      { id: 'A', label: 'DECK A', win: 100, lossCycle: [0, 150, 0, 0, 150, 0, 150, 0, 300, 500], color: '#ef4444' },
      { id: 'B', label: 'DECK B', win: 100, lossEvery: 10, lossAmount: 1250, color: '#f59e0b' },
      { id: 'C', label: 'DECK C', win:  50, lossCycle: [0, 25, 0, 75, 0, 25, 0, 50, 0, 75], color: '#22c55e' },
      { id: 'D', label: 'DECK D', win:  50, lossEvery: 10, lossAmount:  250, color: '#3b82f6' }
    ];
    let trial = 0, net = 0, history = [];
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    let timer = null;
    let lastResult = null;

    function draw(deck) {
      const win = deck.win;
      let loss = 0;
      if (deck.lossEvery > 0) {
        // Lose the lump sum every Nth draw
        if ((counts[deck.id] + 1) % deck.lossEvery === 0) loss = deck.lossAmount;
      } else if (deck.lossCycle) {
        loss = deck.lossCycle[counts[deck.id] % deck.lossCycle.length];
      }
      const delta = win - loss;
      net += delta;
      counts[deck.id]++;
      history.push({ deck: deck.id, win, loss, delta, net });
      lastResult = { deck, win, loss, delta };
      if (delta > 0) soundFx.playCoin(); else soundFx.playHit();
    }

    function render() {
      const remaining = TRIALS - trial;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">♠</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">IOWA GAMBLING TASK</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">40 TRIALS · SOME DECKS ARE BETTER THAN OTHERS · LEARN WHICH</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-white text-base">${trial + 1}/${TRIALS}</span></div>
            <div>NET: <span class="${net >= 0 ? 'text-green-400' : 'text-red-500'} text-base">$${net.toLocaleString()}</span></div>
            <div>LEFT: <span class="text-amber-400 text-base">${remaining}</span></div>
          </div>
          ${lastResult ? `
            <div class="bg-zinc-900 border border-amber-500/60 p-3 mb-4 text-center">
              <div class="text-zinc-400 text-xs">LAST DRAW · ${lastResult.deck.label}</div>
              <div class="text-lg font-black ${lastResult.delta >= 0 ? 'text-green-400' : 'text-red-500'}">
                +$${lastResult.win}${lastResult.loss > 0 ? ' / -$' + lastResult.loss : ''}
                <span class="text-zinc-400 text-sm">= ${lastResult.delta >= 0 ? '+' : ''}$${lastResult.delta}</span>
              </div>
            </div>` : '<div class="bg-zinc-900 border border-amber-500/30 p-3 mb-4 text-center text-zinc-500 text-xs">PICK A DECK TO START</div>'}
          <div class="grid grid-cols-4 gap-2 mb-3">
            ${DECKS.map(d => `
              <button class="igt-deck py-8 border-2 font-black text-2xl" style="border-color:${d.color};color:${d.color}" data-deck="${d.id}">
                ${d.id}
                <div class="text-[10px] font-normal opacity-60">${counts[d.id]} picks</div>
              </button>`).join('')}
          </div>
          <div class="text-center text-zinc-500 text-[10px]">TWO DECKS ARE GOOD · TWO DECKS ARE BAD · FIGURE OUT WHICH</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.igt-deck').forEach(b => b.onclick = () => onPick(b.dataset.deck));
    }

    function onPick(id) {
      const deck = DECKS.find(d => d.id === id);
      draw(deck);
      trial++;
      if (trial >= TRIALS) {
        clearTimeout(timer);
        setTimeout(() => endGame(), 800);
        return;
      }
      render();
    }

    function endGame() {
      // Score: net profit, shifted +1000 so it's always non-negative
      // and the server's GAME_MAX can be 2000 (range -1000..+1000).
      const score = Math.max(0, net + 1000);
      const c = counts;
      const goodPicks = c.C + c.D;
      const msg = `Net $${net.toLocaleString()} · ${goodPicks}/40 from good decks (C+D)`;
      showResult({ container, title: 'TASK COMPLETE', message: msg, score, gameId: 'iowa-gambling', tone: net > 0 ? 'win' : 'over', onRestart: start, onClose });
    }
    render();
  }
}
