/**
 * Dr Non — Non-Gaming System · Trainer Suite II
 * Four more research-grade cognitive tasks added 2026-08-10.
 *
 *   CRT (Cognitive Reflection)    → Frederick 2005 · System 1 vs System 2
 *   Raven's Matrices (lite)       → Raven 1936 · fluid intelligence gF
 *   Sternberg Memory Scanning     → Sternberg 1966 · serial memory model
 *   Approximate Number System     → Halberda 2008 · number sense
 *
 * These fill the cognitive-coverage gaps from Phase 5/6: fluid reasoning,
 * reflection, memory scanning, and number sense were not yet represented
 * in the TRAIN wing. Each ships with a stack tag, a per-game paper link,
 * and a server-side ceiling in functions/api/leaderboard.js.
 *
 * Renderer contract: each takes (container, onClose) and self-mounts inside
 * the existing modal. End-of-round calls showResult() with the gameId so
 * the leaderboard path picks it up.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. COGNITIVE REFLECTION TEST — Frederick 2005
 * Three problems with a System-1 lure and a System-2 correct answer.
 * Score = how many you get RIGHT. The "aha" of CRT is in the reveal.
 * ======================================================================== */

const CRT_QUESTIONS = [
  {
    prompt: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?',
    options: ['$0.10', '$0.05', '$0.15', '$0.01'],
    correct: 1,
    lure: '$0.10',
    right: '$0.05',
    why: 'If the ball were $0.10, the bat would be $1.10, totalling $1.20. The ball is $0.05, the bat $1.05, totalling $1.10. The $1.00 difference is preserved.'
  },
  {
    prompt: 'Lily pads double in area every day. If it takes 48 days for the pads to cover a lake, how long does it take to cover half the lake?',
    options: ['24 days', '47 days', '12 days', '36 days'],
    correct: 1,
    lure: '24 days',
    right: '47 days',
    why: 'If the lake is fully covered on day 48, and the area doubles every day, then half-covered was the day before — day 47. The intuitive "half the time" answer is wrong because growth is exponential, not linear.'
  },
  {
    prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
    options: ['100 minutes', '5 minutes', '20 minutes', '1 minute'],
    correct: 1,
    lure: '100 minutes',
    right: '5 minutes',
    why: 'Each machine makes 1 widget in 5 minutes. 100 machines making 100 widgets in parallel still takes 5 minutes. The intuition confuses the per-machine rate with the system total.'
  },
  {
    prompt: 'In a race you overtake the runner in second place. What place are you in now?',
    options: ['First', 'Second', 'Third', 'Last'],
    correct: 1,
    lure: 'First',
    right: 'Second',
    why: 'You took the second-place runner\'s spot, so you are second — the first-place runner is still ahead. The intuition leaps straight to first.'
  }
];

export function renderCognitiveReflection(container, onClose) {
  start();
  function start() {
    const TRIALS = 3;
    const questions = CRT_QUESTIONS.slice(0, TRIALS);
    let trial = 0, correct = 0;
    let timer = null;

    function render() {
      const q = questions[trial];
      const allDone = trial >= TRIALS;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">⚖</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">COGNITIVE REFLECTION</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">The first guess is usually wrong · pause, then tap</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>QUESTION: <span class="text-amber-400 text-base">${Math.min(trial + 1, TRIALS)}/${TRIALS}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
            <div>SCORE: <span class="text-white text-base">${correct * 10}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-6 mb-6">
            <p class="text-zinc-100 text-base leading-relaxed">${q.prompt}</p>
          </div>
          ${allDone ? '' : `
          <div class="grid grid-cols-2 gap-3">
            ${q.options.map((opt, i) => `
              <button class="crt-opt py-4 border-2 border-amber-500 text-amber-400 font-black text-base hover:bg-amber-500 hover:text-black" data-idx="${i}">${opt}</button>
            `).join('')}
          </div>`}
          ${allDone ? `<button id="crt-done" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">SEE RESULTS</button>` : ''}
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.crt-opt').forEach(b => b.onclick = () => answer(parseInt(b.dataset.idx, 10)));
      const done = container.querySelector('#crt-done');
      if (done) done.onclick = () => endGame();
    }

    function answer(idx) {
      const q = questions[trial];
      if (idx === q.correct) { correct++; soundFx.playCoin(); }
      else { soundFx.playHit(); }
      // Show the reveal for this question
      trial++;
      const right = idx === q.correct;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black ${right ? 'text-green-400' : 'text-red-500'} tracking-wider">${right ? '✓ CORRECT' : '✕ LURED'}</h2></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-4 mb-4 text-sm text-zinc-200">${q.why}</div>
          <div class="bg-amber-500/10 border border-amber-500/60 p-3 mb-4 text-center">
            <div class="text-amber-400 text-xs">LURE → ${q.lure}   ·   ANSWER → ${q.right}</div>
          </div>
          <button id="crt-next" class="w-full py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">${trial >= TRIALS ? 'SEE RESULTS' : 'NEXT QUESTION →'}</button>
        </div>`;
      container.querySelector('#crt-next').onclick = () => { if (trial >= TRIALS) endGame(); else render(); };
    }

    function endGame() {
      clearTimeout(timer);
      const score = correct * 10;
      const message = `${correct} / ${TRIALS} reflection-correct. The CRT measures whether System 2 catches the lure.`;
      showResult({ container, title: 'REFLECTION COMPLETE', message, score, gameId: 'cog-reflection', tone: correct >= 2 ? 'win' : 'over', onRestart: start, onClose });
    }
    render();
  }
}

/* ===========================================================================
 * 2. RAVEN'S MATRICES (lite) — Raven 1936
 * 3x3 pattern grids, one cell missing, pick from 6 options.
 * Eight trials, ascending difficulty. Tests fluid intelligence gF.
 * Patterns: rotation, color, count, layering.
 * ======================================================================== */

function makeRavenTrial(level) {
  // Build a 3x3 grid where each row follows a transformation rule.
  // Three rule families: rotation, count+1, color.
  const family = level < 3 ? 'count' : level < 6 ? 'rotation' : 'color';
  const grid = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (family === 'count') {
        // Each row: number of shapes increases left to right
        grid.push({ row: r, col: c, count: c + 1 + r, color: '#22d3ee' });
      } else if (family === 'rotation') {
        // Each row: shape rotates by some angle each step
        const angle = c * 60 + r * 30;
        grid.push({ row: r, col: c, angle, color: '#f472b6' });
      } else {
        // Each row: color shifts in a hue progression
        const hues = ['#22d3ee', '#facc15', '#f472b6'];
        grid.push({ row: r, col: c, color: hues[c], count: 2 + (r % 2) });
      }
    }
  }
  // The missing cell is the bottom-right (r=2, c=2)
  const answer = grid[8];
  grid[8] = null; // mark missing
  // Generate 5 distractor options. Offsets skip zero — a decoy identical to
  // the answer used to sit at i=2 and got scored wrong by identity.
  const distractors = [];
  const COUNT_OFFSETS = [-2, -1, 1, 2, 3];
  for (let i = 0; i < 5; i++) {
    const variant = { ...answer };
    if (family === 'count') variant.count = Math.max(1, answer.count + COUNT_OFFSETS[i]);
    if (family === 'rotation') variant.angle = (answer.angle + (i + 1) * 45) % 360;
    if (family === 'color') variant.color = ['#22d3ee', '#facc15', '#f472b6', '#a78bfa', '#34d399'][i % 5];
    distractors.push(variant);
  }
  const options = [answer, ...distractors].sort(() => Math.random() - 0.5);
  return { family, grid, answer, options };
}

function drawCell(svg, cell, ox, oy, size = 56) {
  if (!cell) return;
  const cx = ox + size / 2;
  const cy = oy + size / 2;
  if (cell.count != null) {
    // Draw N dots in centered rows of three. Counts past 4 used to draw
    // nothing, so the correct option rendered as an empty box.
    const n = Math.min(9, cell.count);
    const radius = 4;
    const perRow = 3;
    const stepX = 13;
    const stepY = 12;
    const rows = Math.ceil(n / perRow);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const colInRow = i % perRow;
      const inRow = Math.min(perRow, n - row * perRow);
      const x = cx - ((inRow - 1) * stepX) / 2 + colInRow * stepX;
      const y = cy - ((rows - 1) * stepY) / 2 + row * stepY;
      svg.insertAdjacentHTML('beforeend', `<circle cx="${x}" cy="${y}" r="${radius}" fill="${cell.color}"/>`);
    }
  } else if (cell.angle != null) {
    // Draw a triangle rotated by angle
    const r = 16;
    const a = (cell.angle * Math.PI) / 180;
    const p1x = cx + r * Math.cos(a);
    const p1y = cy + r * Math.sin(a);
    const p2x = cx + r * Math.cos(a + (2 * Math.PI) / 3);
    const p2y = cy + r * Math.sin(a + (2 * Math.PI) / 3);
    const p3x = cx + r * Math.cos(a + (4 * Math.PI) / 3);
    const p3y = cy + r * Math.sin(a + (4 * Math.PI) / 3);
    svg.insertAdjacentHTML('beforeend', `<polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}" fill="${cell.color}" stroke="#facc15" stroke-width="1"/>`);
  }
}

export function renderRavenMatrices(container, onClose) {
  start();
  function start() {
    const TRIALS = 8;
    let trial = 0, correct = 0;
    let timer = null;
    const current = makeRavenTrial(0);

    function render() {
      const allDone = trial >= TRIALS;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">▦</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">RAVEN'S MATRICES</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">COMPLETE THE PATTERN · PICK THE MISSING CELL</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>PUZZLE: <span class="text-amber-400 text-base">${Math.min(trial + 1, TRIALS)}/${TRIALS}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
            <div>FAMILY: <span class="text-white text-base">${current.family.toUpperCase()}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-4 mb-4 mx-auto" style="width:228px;height:228px">
            <svg viewBox="0 0 180 180" width="180" height="180" id="rm-grid"></svg>
          </div>
          <div class="text-center text-amber-400 text-xs mb-2">↓ PICK THE MISSING CELL ↓</div>
          <div class="grid grid-cols-3 gap-2 mb-2" id="rm-options"></div>
        </div>`;
      const grid = container.querySelector('#rm-grid');
      const cellSize = 56;
      const missingAt = current.grid.findIndex(c => c == null);
      for (let i = 0; i < 9; i++) {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const ox = c * cellSize + 4;
        const oy = r * cellSize + 4;
        // Cell border
        grid.insertAdjacentHTML('beforeend', `<rect x="${ox}" y="${oy}" width="${cellSize - 4}" height="${cellSize - 4}" fill="none" stroke="#52525b" stroke-width="1"/>`);
        if (current.grid[i]) drawCell(grid, current.grid[i], ox, oy, cellSize);
        if (i === missingAt) {
          grid.insertAdjacentHTML('beforeend', `<text x="${ox + (cellSize - 4) / 2}" y="${oy + (cellSize - 4) / 2 + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="20" fill="#facc15">?</text>`);
        }
      }
      const opts = container.querySelector('#rm-options');
      current.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'rm-opt border-2 border-amber-500 p-2 hover:bg-amber-500/20';
        btn.dataset.idx = idx;
        btn.innerHTML = `<svg viewBox="0 0 56 56" width="56" height="56" style="display:block;margin:0 auto"></svg>`;
        opts.appendChild(btn);
        drawCell(btn.querySelector('svg'), opt, 0, 0, 56);
        btn.onclick = () => answer(idx);
      });
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
    }

    function answer(idx) {
      if (idx === current.options.indexOf(current.answer)) { correct++; soundFx.playCoin(); }
      else { soundFx.playHit(); }
      trial++;
      if (trial >= TRIALS) { endGame(); return; }
      const next = makeRavenTrial(trial);
      Object.assign(current, next);
      render();
    }

    function endGame() {
      clearTimeout(timer);
      const score = correct * 10;
      showResult({ container, title: 'MATRICES COMPLETE', message: `${correct} / ${TRIALS} patterns. gF sampled.`, score, gameId: 'raven-matrices', tone: correct >= 5 ? 'win' : 'over', onRestart: start, onClose });
    }
    render();
  }
}

/* ===========================================================================
 * 3. STERNBERG MEMORY SCANNING — Sternberg 1966
 * Memorize 3-5 letters briefly, then a probe letter appears.
 * Click YES (was in set) or NO (wasn't). 24 trials.
 * Score = correct * 10. Speed of correct taps could be layered in later.
 * ======================================================================== */

const STERN_LETTERS = ['A','B','C','D','E','F','G','H','J','K'];

export function renderSternberg(container, onClose) {
  start();
  function start() {
    const TRIALS = 24;
    let trial = 0, correct = 0, phase = 'show'; // 'show' | 'hide' | 'probe'
    let setSize = 3;
    let memSet = [];
    let probe = '';
    let probeWasIn = false;
    let timer = null;

    function nextTrial() {
      setSize = 3 + Math.floor(trial / 8); // 3, 3, 3, 4, 4, 4, 5, 5
      memSet = [];
      const used = new Set();
      while (memSet.length < setSize) {
        const c = STERN_LETTERS[Math.floor(Math.random() * STERN_LETTERS.length)];
        if (!used.has(c)) { used.add(c); memSet.push(c); }
      }
      probeWasIn = Math.random() < 0.5;
      if (probeWasIn) {
        probe = memSet[Math.floor(Math.random() * memSet.length)];
      } else {
        let p;
        do { p = STERN_LETTERS[Math.floor(Math.random() * STERN_LETTERS.length)]; }
        while (memSet.includes(p));
        probe = p;
      }
      trial++;
      phase = 'show';
      renderShow();
    }

    function renderShow() {
      const cellW = 320 / setSize;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">👁</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">STERNBERG SCAN</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Remember ${setSize} letters · then one letter will ask YES or NO</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-amber-400 text-base">${trial}/${TRIALS}</span></div>
            <div>SET: <span class="text-white text-base">${setSize}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-6 mb-4 flex justify-center items-center" style="min-height:120px">
            <div class="flex gap-3">${memSet.map(c => `<div class="text-5xl font-black text-amber-400" style="width:${cellW}px;text-align:center">${c}</div>`).join('')}</div>
          </div>
          <div class="text-center text-zinc-500 text-[10px]">MEMORIZE · LETTERS WILL HIDE IN 2s</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      clearTimeout(timer);
      timer = setTimeout(renderHide, 2000);
    }

    function renderHide() {
      phase = 'hide';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">👁</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">STERNBERG SCAN</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">Hold the letters · a YES / NO question is next</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-12 mb-4 text-center" style="min-height:200px">
            <div class="text-zinc-500 text-sm">hold…</div>
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      clearTimeout(timer);
      timer = setTimeout(renderProbe, 800);
    }

    function renderProbe() {
      phase = 'probe';
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">👁</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">STERNBERG SCAN</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">WAS <b>${probe}</b> IN THE LIST?</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-amber-400 text-base">${trial}/${TRIALS}</span></div>
            <div>SET: <span class="text-white text-base">${setSize}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 mb-4 text-center" style="min-height:200px">
            <div class="text-zinc-500 text-xs mb-3">THIS LETTER</div>
            <div class="text-7xl font-black text-amber-400">${probe}</div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button id="stern-yes" class="py-5 border-2 border-green-500 text-green-400 font-black tracking-widest text-base hover:bg-green-500 hover:text-black">YES · IN THE SET</button>
            <button id="stern-no" class="py-5 border-2 border-red-500 text-red-400 font-black tracking-widest text-base hover:bg-red-500 hover:text-black">NO · NOT IN SET</button>
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      const saidYes = (e) => answer(true);
      const saidNo = (e) => answer(false);
      container.querySelector('#stern-yes').onclick = saidYes;
      container.querySelector('#stern-no').onclick = saidNo;
    }

    function answer(saidYes) {
      clearTimeout(timer);
      if (saidYes === probeWasIn) { correct++; soundFx.playCoin(); }
      else { soundFx.playHit(); }
      if (trial >= TRIALS) { endGame(); return; }
      nextTrial();
    }

    function endGame() {
      clearTimeout(timer);
      const score = correct * 10;
      showResult({ container, title: 'SCAN COMPLETE', message: `${correct} / ${TRIALS} correct. Set size escalated 3 → 5.`, score, gameId: 'sternberg', tone: correct >= 18 ? 'win' : 'over', onRestart: start, onClose });
    }
    nextTrial();
  }
}

/* ===========================================================================
 * 4. APPROXIMATE NUMBER SYSTEM — Halberda 2008
 * Two clouds of dots side by side. Click the side with MORE dots.
 * Difficulty escalates: ratio starts at 10:9, narrows to 10:7.
 * 60 seconds, score = correct in time.
 * ======================================================================== */

function makeANS(ratio) {
  // ratio = 0.1 means 10:9 (easy). 0.3 means 10:7 (hard).
  const base = 12 + Math.floor(Math.random() * 6); // 12-17 dots in the bigger side
  const smaller = Math.max(2, Math.round(base * (1 - ratio)));
  const bigger = base;
  const leftIsBigger = Math.random() < 0.5;
  return {
    left: leftIsBigger ? bigger : smaller,
    right: leftIsBigger ? smaller : bigger,
    answer: leftIsBigger ? 'left' : 'right'
  };
}

function drawDots(svg, count, cx, cy) {
  const positions = [];
  const N = 80;
  let attempts = 0;
  while (positions.length < count && attempts < N * 5) {
    const x = cx - 40 + Math.random() * 80;
    const y = cy - 40 + Math.random() * 80;
    if (positions.every(p => Math.hypot(p.x - x, p.y - y) > 9)) positions.push({ x, y });
    attempts++;
  }
  for (const p of positions) {
    svg.insertAdjacentHTML('beforeend', `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#facc15"/>`);
  }
}

export function renderNumberSense(container, onClose) {
  start();
  function start() {
    const DURATION = 60000;
    const startTime = Date.now();
    let correct = 0, total = 0, ratio = 0.10;
    let timer = null, trialTimer = null;
    let current = makeANS(ratio);

    function render() {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, DURATION - elapsed);
      const allDone = remaining <= 0;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">●</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">NUMBER SENSE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">TAP THE SIDE WITH MORE DOTS · DO NOT COUNT</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TIME: <span class="text-amber-400 text-base">${Math.ceil(remaining / 1000)}s</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}/${total}</span></div>
            <div>ACC: <span class="text-white text-base">${total ? Math.round((correct / total) * 100) : 0}%</span></div>
          </div>
          <div class="flex justify-around bg-zinc-900 border border-amber-500/60 p-4 mb-4">
            <button id="ans-left" class="ans-side border-2 border-amber-500 hover:bg-amber-500/20" style="width:130px;height:130px">
              <svg viewBox="0 0 100 100" width="100" height="100" id="ans-left-svg"></svg>
              <div class="text-amber-400 text-xs font-black mt-1">LEFT</div>
            </button>
            <button id="ans-right" class="ans-side border-2 border-amber-500 hover:bg-amber-500/20" style="width:130px;height:130px">
              <svg viewBox="0 0 100 100" width="100" height="100" id="ans-right-svg"></svg>
              <div class="text-amber-400 text-xs font-black mt-1">RIGHT</div>
            </button>
          </div>
        </div>`;
      const ls = container.querySelector('#ans-left-svg');
      const rs = container.querySelector('#ans-right-svg');
      drawDots(ls, current.left, 50, 50);
      drawDots(rs, current.right, 50, 50);
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(trialTimer); clearInterval(timer); onClose(); };
      container.querySelector('#ans-left').onclick = () => answer('left');
      container.querySelector('#ans-right').onclick = () => answer('right');
      if (allDone) { endGame(); return; }
    }

    function answer(side) {
      total++;
      if (side === current.answer) {
        correct++;
        soundFx.playCoin();
        // Success shrinks the ratio gap (harder); a miss widens it. The
        // staircase used to run backwards, rewarding good play with an
        // easier task.
        ratio = Math.max(0.10, ratio - 0.015);
      } else {
        soundFx.playHit();
        ratio = Math.min(0.35, ratio + 0.02);
      }
      current = makeANS(ratio);
      render();
    }

    function tick() {
      const remaining = Math.max(0, DURATION - (Date.now() - startTime));
      if (remaining <= 0) { endGame(); return; }
      // Update just the timer cell without a full re-render
      const el = container.querySelector('.text-amber-400.text-base');
      if (el) el.textContent = `${Math.ceil(remaining / 1000)}s`;
    }

    function endGame() {
      clearTimeout(trialTimer);
      clearInterval(timer);
      const score = correct * 10;
      const acc = total ? Math.round((correct / total) * 100) : 0;
      showResult({ container, title: 'NUMBER SENSE COMPLETE', message: `${correct}/${total} correct · ${acc}% accuracy.`, score, gameId: 'number-sense', tone: acc >= 70 ? 'win' : 'over', onRestart: start, onClose });
    }
    render();
    timer = setInterval(tick, 250);
  }
}
