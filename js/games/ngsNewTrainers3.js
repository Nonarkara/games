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
const WCST_REFERENCE_CARDS = [
  makeWCSTCard('red', 'circle', 1),
  makeWCSTCard('green', 'triangle', 2),
  makeWCSTCard('blue', 'star', 3)
];

/** Return the reference-card bucket matching `card` under the hidden rule. */
export function wcstBucketFor(card, rule) {
  return WCST_REFERENCE_CARDS.findIndex(reference => reference[rule] === card[rule]);
}

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
    let correct = 0, wrong = 0, ruleChanges = 0;
    let lastWasWrong = false;
    let timer = null;
    const TRIALS = 24;
    let done = 0;
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
      WCST_REFERENCE_CARDS.forEach((reference, i) => {
        const b = document.createElement('button');
        b.className = 'py-3 border-2 border-amber-500 text-amber-400 font-black text-sm hover:bg-amber-500 hover:text-black';
        b.setAttribute('aria-label', `Sort with reference card ${i + 1}`);
        b.innerHTML = `<svg viewBox="0 0 60 60" width="64" height="64" style="margin:auto" data-reference="${i}"></svg><span class="block mt-2 text-[10px]">PILE ${i + 1}</span>`;
        drawWCSTCard(b.querySelector('svg'), reference, 0, 0, 60);
        b.onclick = () => answer(i, card);
        buckets.appendChild(b);
      });
    }
    function answer(bucketIndex, card) {
      const match = bucketIndex === wcstBucketFor(card, currentRule);
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

const TOL_BG = { red: '#ef4444', green: '#22c55e', blue: '#3b82f6' };
export const TOL_CAPACITIES = [3, 2, 1];

function cloneToL(pegs) {
  return pegs.map(stack => [...stack]);
}

function toLKey(pegs) {
  return pegs.map(stack => stack.join('')).join('|');
}

/** Apply one legal Tower of London move. Ball size is irrelevant; peg capacity is the constraint. */
export function applyToLMove(pegs, from, to) {
  if (from === to || !pegs[from]?.length || !pegs[to] || pegs[to].length >= TOL_CAPACITIES[to]) return null;
  const next = cloneToL(pegs);
  next[to].push(next[from].pop());
  return next;
}

/** Breadth-first shortest path, used both for honest par values and mechanics tests. */
export function minimumToLMoves(start, target) {
  const targetKey = toLKey(target);
  const seen = new Set([toLKey(start)]);
  const queue = [{ pegs: cloneToL(start), distance: 0 }];
  while (queue.length) {
    const { pegs, distance } = queue.shift();
    if (toLKey(pegs) === targetKey) return distance;
    for (let from = 0; from < 3; from++) {
      for (let to = 0; to < 3; to++) {
        const next = applyToLMove(pegs, from, to);
        if (!next) continue;
        const key = toLKey(next);
        if (!seen.has(key)) {
          seen.add(key);
          queue.push({ pegs: next, distance: distance + 1 });
        }
      }
    }
  }
  return Infinity;
}

function makeToLPuzzle() {
  // Standard three-ball Tower of London: pegs hold 3, 2, and 1 balls.
  // Unlike Tower of Hanoi, colored balls have no size-order restriction.
  const start = [['red', 'green'], ['blue'], []];
  const targets = [
    [['red'], ['green'], ['blue']],
    [['blue', 'green'], ['red'], []],
    [['green'], ['blue', 'red'], []],
    [['blue', 'red'], [], ['green']]
  ];
  const target = targets[Math.floor(Math.random() * targets.length)];
  return { start, target, par: minimumToLMoves(start, target) };
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
    let current = cloneToL(puzzle.start);
    let moves = 0, selected = null, puzzlesSolved = 0, puzzlesTotal = 0, totalScore = 0;
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
            <div>MOVES: <span class="text-white text-base">${moves}</span> · PAR ${puzzle.par}</div>
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
      const next = applyToLMove(current, selected, toPeg);
      if (!next) { soundFx.playHit(); selected = null; render(); return; }
      current = next;
      moves++;
      selected = null;
      soundFx.playCoin();
      if (isToLSolved(current, puzzle.target)) {
        totalScore += Math.max(10, 50 - Math.max(0, moves - puzzle.par) * 5);
        puzzlesSolved++;
        puzzlesTotal++;
        soundFx.playCoin();
        if (puzzlesTotal >= PUZZLES) { endGame(); return; }
        puzzle = makeToLPuzzle();
        current = cloneToL(puzzle.start);
        moves = 0;
      }
      render();
    }
    function endGame() {
      clearTimeout(timer);
      const score = totalScore;
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
  { eyes: '↗', word: 'PLAYFUL', options: ['PLAYFUL', 'SERIOUS', 'ANGRY', 'CONFUSED'] },
  { eyes: '↘', word: 'UPSET', options: ['UPSET', 'EXCITED', 'CALM', 'CURIOUS'] },
  { eyes: '←', word: 'INSISTENT', options: ['INSISTENT', 'BORED', 'SAD', 'DISTRACTED'] },
  { eyes: '→', word: 'PREOCCUPIED', options: ['PREOCCUPIED', 'HAPPY', 'AMUSED', 'CURIOUS'] },
  { eyes: '◠', word: 'REFLECTIVE', options: ['REFLECTIVE', 'EXCITED', 'ANGRY', 'DISTRACTED'] },
  { eyes: '◡', word: 'SAD', options: ['SAD', 'EXCITED', 'CONFIDENT', 'PLAYFUL'] },
  { eyes: '◜', word: 'SUSPICIOUS', options: ['SUSPICIOUS', 'CALM', 'FRIENDLY', 'CURIOUS'] },
  { eyes: '◝', word: 'DISTRACTED', options: ['DISTRACTED', 'FOCUSED', 'CURIOUS', 'AMUSED'] },
  { eyes: '↑', word: 'DOMINANT', options: ['DOMINANT', 'SUBMISSIVE', 'CALM', 'CURIOUS'] },
  { eyes: '↓', word: 'SUBMISSIVE', options: ['SUBMISSIVE', 'DOMINANT', 'ANGRY', 'PLAYFUL'] }
];

export function prepareEyesTrial(trial, random = Math.random) {
  const options = [...trial.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...trial, options, correct: options.indexOf(trial.word) };
}

export function renderMindEyes(container, onClose) {
  start();
  function start() {
    const trials = EYES_TRIALS.slice(0, 8).map(trial => prepareEyesTrial(trial));
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
              <div><h2 class="text-xl font-black text-amber-400 tracking-wider">MIND IN THE EYES · LITE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">SCHEMATIC SOCIAL-INFERENCE DRILL · NOT THE CLINICAL RMIE</p></div>
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
