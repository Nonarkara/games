/**
 * Dr Non — Non-Gaming System · Mental Math Pro
 *
 * The same 45-second arithmetic sprint as Mental Math, but the operands
 * and operations are spelled out in English words. The cognitive load
 * shifts from "do the math" to "parse the words, then do the math" —
 * "twenty-one minus sixteen" has to round-trip through your language
 * centre before the number centre can touch it. That extra hop is
 * the whole point: the same operation feels 30% slower when it has to
 * be read, and that slowdown is what the drill trains against.
 *
 * Examples:
 *   twenty-one minus sixteen =   → 5
 *   five times eight =            → 40
 *   forty-seven =                  → 47   (no operation, just the parse)
 *   thirteen plus twenty-nine =    → 42
 *
 * Pure helpers are exported so the mechanics test exercises the same
 * code path the live game runs.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>';

const NUMBER_WORDS = {
  0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
  11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
  16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen',
  20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
  60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety'
};

const OP_WORDS = { '+': 'plus', '-': 'minus', '×': 'times' };

/** 0–99 in English words. Two-digit numbers hyphenate per the house style. */
export function numberWord(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new Error(`numberWord: out of range ${n}`);
  if (n <= 20) return NUMBER_WORDS[n];
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return ones === 0 ? NUMBER_WORDS[tens] : `${NUMBER_WORDS[tens]}-${NUMBER_WORDS[ones]}`;
}

function wordToNumber(w) {
  // Reverse lookup for the test suite. Not used by the live renderer.
  for (const [k, v] of Object.entries(NUMBER_WORDS)) {
    if (v === w) return Number(k);
  }
  // Hyphenated form: "twenty-one" → 21
  const m = w.match(/^(\w+)-(\w+)$/);
  if (m) {
    const tens = Object.entries(NUMBER_WORDS).find(([, v]) => v === m[1]);
    const ones = Object.entries(NUMBER_WORDS).find(([, v]) => v === m[2]);
    if (tens && ones) return Number(tens[0]) + Number(ones[0]);
  }
  return null;
}

/**
 * Roll a problem. ~25% are "name this number" (no operation, just the
 * read-and-type round trip) to keep the parse-only failure mode alive.
 */
export function rollPro(rand = Math.random) {
  if (rand() < 0.25) {
    const n = 1 + Math.floor(rand() * 99);
    return { question: `${numberWord(n)} =`, answer: n, kind: 'read' };
  }
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(rand() * 3)];
  let a, b, answer;
  if (op === '+') {
    a = 2 + Math.floor(rand() * 48);
    b = 2 + Math.floor(rand() * 48);
    answer = a + b;
  } else if (op === '-') {
    a = 12 + Math.floor(rand() * 38);
    b = 2 + Math.floor(rand() * Math.max(1, a - 1));
    answer = a - b;
  } else {
    a = 2 + Math.floor(rand() * 11);
    b = 2 + Math.floor(rand() * 11);
    answer = a * b;
  }
  return {
    question: `${numberWord(a)} ${OP_WORDS[op]} ${numberWord(b)} =`,
    answer,
    kind: 'arith'
  };
}

export function renderMentalMathPro(container, onClose) {
  start();

  function start() {
    const DURATION = 45;
    let score = 0, correct = 0, wrong = 0, left = DURATION, over = false;
    let problem = rollPro(), typed = '';
    let countdown = null;

    function roll() {
      problem = rollPro();
      typed = '';
      paint();
    }

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">MENTAL MATH PRO</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Parse the words · 45-second sprint</p>
          </div>
          ${closeButton()}
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE <span id="mmp-score" class="text-amber-400 text-base">0</span></div>
          <div><span id="mmp-time" class="text-white text-base">${DURATION}</span>s</div>
          <div>OK <span id="mmp-ok" class="text-white">0</span> · X <span id="mmp-bad" class="text-white">0</span></div>
        </div>
        <div id="mmp-q" class="text-center text-2xl font-black text-white tracking-wider mb-4 min-h-[64px] flex items-center justify-center leading-tight"></div>
        <div id="mmp-a" class="text-center text-3xl font-bold text-amber-400 tracking-[0.2em] mb-4 h-12 min-h-[44px]">_</div>
        <div class="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="mmp-key axiom-dpad-btn" data-n="${n}">${n}</button>`).join('')}
          <button class="mmp-key axiom-dpad-btn" data-n="clear">C</button>
          <button class="mmp-key axiom-dpad-btn" data-n="0">0</button>
          <button class="mmp-key axiom-dpad-btn" data-n="enter">↵</button>
        </div>
      </div>
    `;

    const qEl = container.querySelector('#mmp-q');
    const aEl = container.querySelector('#mmp-a');
    const scoreEl = container.querySelector('#mmp-score');
    const okEl = container.querySelector('#mmp-ok');
    const badEl = container.querySelector('#mmp-bad');

    function paint() {
      qEl.innerText = problem.question;
      aEl.innerText = typed.length ? typed : '_';
    }

    function submit() {
      if (over || !typed.length) return;
      const n = parseInt(typed, 10);
      if (n === problem.answer) {
        correct++; score += 10; okEl.innerText = correct; soundFx.playCoin();
      } else {
        wrong++; score = Math.max(0, score - 3); badEl.innerText = wrong; soundFx.playHit();
      }
      scoreEl.innerText = score;
      roll();
    }

    container.querySelectorAll('.mmp-key').forEach(btn => {
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
      container.querySelector('#mmp-time').innerText = left;
      if (left <= 0) {
        over = true;
        clearInterval(countdown);
        kb.destroy();
        showResult({
          container,
          title: correct >= 16 ? 'WORDS CLEAR' : 'SPRINT DONE',
          message: `${correct} parsed · ${wrong} wrong in 45s. The slowdown is the read — once "twenty-one" stops costing you a beat, the arithmetic behind it gets faster too.`,
          score,
          gameId: 'mental-math-pro',
          tone: correct >= 16 ? 'win' : 'over',
          onRestart: () => start(),
          onClose
        });
      }
    }, 1000);

    container.querySelector('#close-game-btn').onclick = () => {
      clearInterval(countdown);
      kb.destroy();
      onClose();
    };

    paint();
  }
}
