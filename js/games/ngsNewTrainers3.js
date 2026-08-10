/**
 * Dr Non — Non-Gaming System · Trainer Suite III
 * Three more research-grade cognitive tasks added 2026-08-10.
 *
 *   WCST (Card Sorting, lite)  → Berg 1948 · cognitive flexibility
 *   Tower of London           → Shallice 1982 · planning
 *   Reading the Mind in Eyes  → Baron-Cohen 2001 · social cognition
 *
 * WCST and ToL close the set-shifting and planning gaps. RMIE adds
 * Theory-of-Mind — the only social-cognition task in the suite.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

/* ===========================================================================
 * 1. WCST (lite) — Berg 1948
 * Sort cards by a hidden rule (color, shape, or count). The rule changes
 * after every 5 correct sorts. Your job: figure out the rule, sort,
 * notice the change, adapt. Tests cognitive flexibility / set-shifting.
 * ======================================================================== */

function makeWCSTCard(color, shape, count) {
  // color: red|green|blue
  // shape: circle|triangle|star
  // count: 1|2|3
  return { color, shape, count };
}

const WCST_COLORS = ['red', 'green', 'blue'];
const WCST_SHAPES = ['circle', 'triangle', 'star'];
const WCST_COUNTS = [1, 2, 3];

function drawWCSTCard(svg, card, ox, oy, size = 60) {
  const colorMap = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6' };
  const cx = ox + size / 2;
  const cy = oy + size / 2;
  const r = 7;
  for (let i = 0; i < card.count; i++) {
    const x = ox + 6 + (i % 3) * (size / 3 - 2) + 5;
    const y = oy + 6 + Math.floor(i / 3) * 18;
    if (card.shape === 'circle') {
      svg.insertAdjacentHTML('beforeend', `<circle cx="${x + r}" cy="${y + r}" r="${r}" fill="${colorMap[card.color]}" stroke="#fbbf24" stroke-width="1"/>`);
    } else if (card.shape === 'triangle') {
      svg.insertAdjacentHTML('beforeend', `<polygon points="${x},${y + 16} ${x + r * 2},${y + 16} ${x + r},${y + 2}" fill="${colorMap[card.color]}" stroke="#fbbf24" stroke-width="1"/>`);
    } else {
      const points = [];
      for (let p = 0; p < 5; p++) {
        const a = (Math.PI / 2) + (p * 2 * Math.PI) / 5;
        const px = x + r + r * Math.cos(a);
        const py = y + r + r * Math.sin(a);
        points.push(`${px},${py}`);
      }
      svg.insertAdjacentHTML('beforeend', `<polygon points="${points.join(' ')}" fill="${colorMap[card.color]}" stroke="#fbbf24" stroke-width="1"/>`);
    }
  }
  // Border in the card's color
  svg.insertAdjacentHTML('beforeend', `<rect x="${ox}" y="${oy}" width="${size}" height="${size}" fill="none" stroke="${colorMap[card.color]}" stroke-width="2"/>`);
}

function makeDeck() {
  const deck = [];
  for (const color of WCST_COLORS) {
    for (const shape of WCST_SHAPES) {
      for (const count of WCST_COUNTS) {
        deck.push(makeWCSTCard(color, shape, count));
      }
    }
  }
  return deck;
}

const RULES = ['color', 'shape', 'count'];

export function renderWCST(container, onClose) {
  start();
  function start() {
    const deck = makeDeck();
    let currentRule = RULES[Math.floor(Math.random() * RULES.length)];
    let ruleStreak = 0;
    let correct = 0, wrong = 0, totalTrials = 0, ruleChanges = 0;
    let detectedChanges = 0;
    let lastWasWrong = false;
    let timer = null;
    const TRIALS = 24;
    let done = 0;
    function matchesRule(card, rule) {
      // For demo: bucket cards by the rule's value
      return true; // we'll determine match by the chosen bucket
    }
    function next() {
      if (done >= TRIALS) { endGame(); return; }
      const card = deck[Math.floor(Math.random() * deck.length)];
      render(card);
    }
    function render(card) {
      done++;
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🃏</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">CARD SORTING</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">SORT BY THE HIDDEN RULE · IT WILL CHANGE</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-amber-400 text-base">${done}/${TRIALS}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
            <div>WRONG: <span class="text-red-500 text-base">${wrong}</span></div>
          </div>
          <div class="flex justify-center mb-4">
            <svg viewBox="0 0 60 60" width="80" height="80" id="wcst-card"></svg>
          </div>
          <div class="text-amber-400 text-xs text-center mb-3">SORT INTO A BUCKET BELOW</div>
          <div class="grid grid-cols-3 gap-3" id="wcst-buckets"></div>
          <div class="text-center text-zinc-500 text-[10px] mt-3">${lastWasWrong ? '⚠ WRONG — RULE MAY HAVE CHANGED' : ''}</div>
        </div>`;
      drawWCSTCard(container.querySelector('#wcst-card'), card, 0, 0, 60);
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      const buckets = container.querySelector('#wcst-buckets');
      const labels = { color: ['RED', 'GREEN', 'BLUE'], shape: ['CIRCLES', 'TRIANGLES', 'STARS'], count: ['1', '2', '3'] };
      const keys = currentRule === 'color' ? WCST_COLORS : currentRule === 'shape' ? WCST_SHAPES : WCST_COUNTS;
      keys.forEach((k, i) => {
        const b = document.createElement('button');
        b.className = 'py-4 border-2 border-amber-500 text-amber-400 font-black text-sm hover:bg-amber-500 hover:text-black';
        b.textContent = labels[currentRule][i];
        b.onclick = () => answer(k, card);
        buckets.appendChild(b);
      });
    }
    function answer(choice, card) {
      const match = currentRule === 'color' ? choice === card.color : currentRule === 'shape' ? choice === card.shape : choice === String(card.count);
      totalTrials++;
      if (match) { correct++; ruleStreak++; soundFx.playCoin(); lastWasWrong = false; }
      else { wrong++; ruleStreak = 0; soundFx.playHit(); lastWasWrong = true; }
      // After 5 correct in a row, change the rule
      if (ruleStreak >= 5) {
        ruleStreak = 0;
        ruleChanges++;
        const others = RULES.filter(r => r !== currentRule);
        currentRule = others[Math.floor(Math.random() * others.length)];
      }
      next();
    }
    function endGame() {
      clearTimeout(timer);
      const score = correct * 10;
      showResult({ container, title: 'SORT COMPLETE', message: `${correct} / ${TRIALS} correct · rule changed ${ruleChanges} times.`, score, gameId: 'wcst', tone: 'over', onRestart: start, onClose });
    }
    next();
  }
}

/* ===========================================================================
 * 2. TOWER OF LONDON — Shallice 1982
 * Three pegs, three colored balls. Move balls to match the target
 * configuration in the fewest moves. Tests planning.
 * ======================================================================== */

const TOL_COLORS = ['red', 'green', 'blue'];
const TOL_BG = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6' };

function makeToLPuzzle() {
  // Start: balls all on peg 0 stacked (red bottom, green mid, blue top)
  const start = { 0: ['red', 'green', 'blue'], 1: [], 2: [] };
  // Target: balls distributed across pegs
  const targets = [
    { 0: ['red', 'green'], 1: ['blue'], 2: [] },
    { 0: ['red'], 1: ['blue'], 2: ['green'] },
    { 0: ['green'], 1: ['red', 'blue'], 2: [] },
    { 0: ['blue'], 1: ['red'], 2: ['green'] }
  ];
  const target = targets[Math.floor(Math.random() * targets.length)];
  return { start, target };
}

function drawTower(svg, pegs, ox, oy) {
  const baseY = oy + 120;
  for (let p = 0; p < 3; p++) {
    const px = ox + 30 + p * 50;
    // Peg
    svg.insertAdjacentHTML('beforeend', `<line x1="${px}" y1="${oy + 20}" x2="${px}" y2="${baseY}" stroke="#fbbf24" stroke-width="2"/>`);
    // Base
    svg.insertAdjacentHTML('beforeend', `<line x1="${px - 20}" y1="${baseY}" x2="${px + 20}" y2="${baseY}" stroke="#fbbf24" stroke-width="2"/>`);
    // Balls (bottom up)
    const stack = pegs[p] || [];
    for (let b = 0; b < stack.length; b++) {
      const by = baseY - (b + 1) * 18;
      svg.insertAdjacentHTML('beforeend', `<circle cx="${px}" cy="${by - 9}" r="9" fill="${TOL_BG[stack[b]]}" stroke="#fbbf24" stroke-width="1"/>`);
    }
  }
}

function isToLValid(pegs) {
  // A larger ball cannot have a smaller ball on top
  const order = { red: 0, green: 1, blue: 2 };
  for (const p of [0, 1, 2]) {
    const stack = pegs[p] || [];
    for (let i = 1; i < stack.length; i++) {
      if (order[stack[i - 1]] > order[stack[i]]) return false;
    }
  }
  return true;
}

function isToLSolved(pegs, target) {
  for (let p = 0; p < 3; p++) {
    if (JSON.stringify(pegs[p] || []) !== JSON.stringify(target[p] || [])) return false;
  }
  return true;
}

export function renderTowerOfLondon(container, onClose) {
  start();
  function start() {
    let puzzle = makeToLPuzzle();
    let current = JSON.parse(JSON.stringify(puzzle.start));
    let moves = 0, selected = null, puzzlesSolved = 0, puzzlesTotal = 0;
    let timer = null;
    const PUZZLES = 4;
    function render() {
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">🗼</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">TOWER OF LONDON</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">MATCH THE TARGET IN THE FEWEST MOVES</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>PUZZLE: <span class="text-amber-400 text-base">${puzzlesTotal + 1}/${PUZZLES}</span></div>
            <div>SOLVED: <span class="text-green-400 text-base">${puzzlesSolved}</span></div>
            <div>MOVES: <span class="text-white text-base">${moves}</span></div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div class="text-amber-400 text-xs text-center mb-2">CURRENT</div>
              <svg viewBox="0 0 180 130" width="100%" id="tol-current"></svg>
            </div>
            <div>
              <div class="text-amber-400 text-xs text-center mb-2">TARGET</div>
              <svg viewBox="0 0 180 130" width="100%" id="tol-target"></svg>
            </div>
          </div>
          <div class="text-amber-400 text-xs mb-2">${selected !== null ? `SELECTED: PEG ${selected + 1}` : 'TAP A PEG TO SELECT A BALL'}</div>
          <div class="grid grid-cols-3 gap-3">
            <button class="tol-peg py-6 border-2 ${selected === 0 ? 'border-amber-400 bg-amber-500/20' : 'border-amber-500'} text-amber-400 font-black text-base hover:bg-amber-500 hover:text-black" data-peg="0">PEG 1</button>
            <button class="tol-peg py-6 border-2 ${selected === 1 ? 'border-amber-400 bg-amber-500/20' : 'border-amber-500'} text-amber-400 font-black text-base hover:bg-amber-500 hover:text-black" data-peg="1">PEG 2</button>
            <button class="tol-peg py-6 border-2 ${selected === 2 ? 'border-amber-400 bg-amber-500/20' : 'border-amber-500'} text-amber-400 font-black text-base hover:bg-amber-500 hover:text-black" data-peg="2">PEG 3</button>
          </div>
        </div>`;
      drawTower(container.querySelector('#tol-current'), current, 0, 0);
      drawTower(container.querySelector('#tol-target'), puzzle.target, 0, 0);
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.tol-peg').forEach(b => b.onclick = () => move(parseInt(b.dataset.peg, 10)));
    }
    function move(toPeg) {
      if (selected === null) {
        if ((current[toPeg] || []).length > 0) { selected = toPeg; soundFx.playClick(); render(); }
        return;
      }
      if (selected === toPeg) { selected = null; render(); return; }
      // Move top ball from selected to toPeg
      const fromStack = current[selected];
      if (fromStack.length === 0) { selected = null; render(); return; }
      const ball = fromStack[fromStack.length - 1];
      const toStack = current[toPeg] || [];
      // Check rule: cannot place larger ball on smaller
      const order = { red: 0, green: 1, blue: 2 };
      if (toStack.length > 0 && order[toStack[toStack.length - 1]] < order[ball]) {
        soundFx.playHit(); return; // invalid move
      }
      fromStack.pop();
      toStack.push(ball);
      current[toPeg] = toStack;
      current[selected] = fromStack;
      moves++;
      selected = null;
      soundFx.playCoin();
      if (isToLSolved(current, puzzle.target)) {
        puzzlesSolved++;
        puzzlesTotal++;
        soundFx.playCoin();
        if (puzzlesTotal >= PUZZLES) { endGame(); return; }
        puzzle = makeToLPuzzle();
        current = JSON.parse(JSON.stringify(puzzle.start));
        moves = 0;
      }
      render();
    }
    function endGame() {
      clearTimeout(timer);
      const score = Math.max(0, puzzlesSolved * 50 - (puzzlesTotal - puzzlesSolved) * 20);
      showResult({ container, title: 'TOWERS COMPLETE', message: `${puzzlesSolved} / ${PUZZLES} puzzles solved.`, score, gameId: 'tower-london', tone: 'over', onRestart: start, onClose });
    }
    render();
  }
}

/* ===========================================================================
 * 3. READING THE MIND IN THE EYES (lite) — Baron-Cohen 2001
 * Schematic eyes show an expression. Pick the best-matching word.
 * Tests Theory of Mind / social cognition.
 * ======================================================================== */

const EYES_TRIALS = [
  { eyes: '↗', word: 'PLAYFUL', options: ['PLAYFUL', 'SERIOUS', 'ANGRY', 'CONFUSED'], correct: 0 },
  { eyes: '↘', word: 'UPSET', options: ['UPSET', 'EXCITED', 'CALM', 'CURIOUS'], correct: 0 },
  { eyes: '←', word: 'INSISTENT', options: ['INSISTENT', 'BORED', 'SAD', 'DISTRACTED'], correct: 0 },
  { eyes: '→', word: 'PREOCCUPIED', options: ['PREOCCUPIED', 'HAPPY', 'AMUSED', 'CURIOUS'], correct: 0 },
  { eyes: '◠', word: 'REFLECTIVE', options: ['REFLECTIVE', 'EXCITED', 'ANGRY', 'DISTRACTED'], correct: 0 },
  { eyes: '◡', word: 'SAD', options: ['SAD', 'EXCITED', 'CONFIDENT', 'PLAYFUL'], correct: 0 },
  { eyes: '◜', word: 'SUSPICIOUS', options: ['SUSPICIOUS', 'CALM', 'FRIENDLY', 'CURIOUS'], correct: 0 },
  { eyes: '◝', word: 'DISTRACTED', options: ['DISTRACTED', 'FOCUSED', 'CURIOUS', 'AMUSED'], correct: 0 },
  { eyes: '↑', word: 'DOMINANT', options: ['DOMINANT', 'SUBMISSIVE', 'CALM', 'CURIOUS'], correct: 0 },
  { eyes: '↓', word: 'SUBMISSIVE', options: ['SUBMISSIVE', 'DOMINANT', 'ANGRY', 'PLAYFUL'], correct: 0 }
];

export function renderMindEyes(container, onClose) {
  start();
  function start() {
    const trials = EYES_TRIALS.slice(0, 8);
    let trial = 0, correct = 0;
    let timer = null;
    function next() {
      if (trial >= trials.length) { endGame(); return; }
      render();
    }
    function render() {
      const t = trials[trial];
      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-amber-400">⊙</span>
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">MIND IN THE EYES</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">PICK THE BEST WORD FOR THE EXPRESSION</p></div>
            </div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>TRIAL: <span class="text-amber-400 text-base">${trial + 1}/${trials.length}</span></div>
            <div>CORRECT: <span class="text-green-400 text-base">${correct}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-8 mb-4 text-center" style="min-height:180px">
            <div class="text-zinc-500 text-xs mb-3">EXPRESSION</div>
            <div class="flex justify-center items-center gap-4 mb-2">
              <div class="text-8xl text-amber-400">${t.eyes}</div>
              <div class="text-8xl text-amber-400" style="transform: scaleX(-1)">${t.eyes}</div>
            </div>
            <div class="text-zinc-600 text-[10px]">↑ ↑ ↑ ↑ ↑</div>
          </div>
          <div class="grid grid-cols-2 gap-3" id="eyes-opts"></div>
        </div>`;
      const opts = container.querySelector('#eyes-opts');
      t.options.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'eyes-opt py-4 border-2 border-amber-500 text-amber-400 font-black text-sm hover:bg-amber-500 hover:text-black';
        b.textContent = o;
        b.onclick = () => answer(i);
        opts.appendChild(b);
      });
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
    }
    function answer(idx) {
      if (idx === trials[trial].correct) { correct++; soundFx.playCoin(); }
      else { soundFx.playHit(); }
      trial++;
      next();
    }
    function endGame() {
      clearTimeout(timer);
      const score = correct * 10;
      showResult({ container, title: 'EMPATHY CHECK', message: `${correct} / ${trials.length} expressions identified.`, score, gameId: 'mind-eyes', tone: 'over', onRestart: start, onClose });
    }
    next();
  }
}
