/**
 * Dr Non — Non-Gaming System · Mental Math Thai
 *
 * Same 45-second arithmetic sprint, but the operands are written with
 * a mix of Thai (๐-๙) and Arabic (0-9) numerals. Both number systems
 * carry the same magnitude, so the math is identical to Mental Math —
 * the difficulty is the dual-reading. A line like "๒๓ + 16" has to be
 * parsed as "twenty-three plus sixteen" before any arithmetic kicks
 * in. That's the extra hop the drill is training.
 *
 * Examples:
 *   ๒๓ + 16 =     → 39
 *   ๔๒ × ๒ =      → 84
 *   45 − ๒๐ =      → 25
 *   ๑๒ × ๑๒ =     → 144
 *
 * Thai–Arabic mapping is the standard U+0E50–U+0E59 block; conversion
 * is a one-character swap per digit, so a "translation" check on
 * the test side is just a numeric round-trip.
 */
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>';

/** U+0E50 (THAI DIGIT ZERO) through U+0E59 (THAI DIGIT NINE). */
const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
const ARABIC_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Convert a non-negative integer to its Thai-numeral string. */
export function toThai(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`toThai: out of range ${n}`);
  return String(n).split('').map(d => THAI_DIGITS[+d]).join('');
}

/** Convert a string of Thai digits back to its integer value. */
export function fromThai(s) {
  if (typeof s !== 'string') throw new Error('fromThai: not a string');
  let out = '';
  for (const ch of s) {
    const i = THAI_DIGITS.indexOf(ch);
    if (i < 0) throw new Error(`fromThai: not a Thai digit "${ch}"`);
    out += ARABIC_DIGITS[i];
  }
  return Number(out);
}

/**
 * Roll a problem. Each operand independently picks Thai or Arabic,
 * so about half the lines are mixed-script. The op is always ASCII
 * (+, −, ×) — no Thai operators, the symbol itself is the cue.
 */
export function rollThai(rand = Math.random) {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(rand() * 3)];
  let a, b, answer;
  if (op === '+') {
    a = 5 + Math.floor(rand() * 45);  // 5–49
    b = 5 + Math.floor(rand() * 45);
    answer = a + b;
  } else if (op === '-') {
    a = 15 + Math.floor(rand() * 35);
    b = 2 + Math.floor(rand() * Math.max(1, a - 2));
    answer = a - b;
  } else {
    a = 2 + Math.floor(rand() * 11);
    b = 2 + Math.floor(rand() * 11);
    answer = a * b;
  }
  const aThai = rand() < 0.5;
  const bThai = rand() < 0.5;
  const aStr = aThai ? toThai(a) : String(a);
  const bStr = bThai ? toThai(b) : String(b);
  return {
    question: `${aStr} ${op} ${bStr} =`,
    answer,
    mixed: aThai !== bThai
  };
}

export function renderMentalMathThai(container, onClose) {
  start();

  function start() {
    const DURATION = 45;
    let score = 0, correct = 0, wrong = 0, left = DURATION, over = false;
    let problem = rollThai(), typed = '';
    let countdown = null;

    function roll() {
      problem = rollThai();
      typed = '';
      paint();
    }

    container.innerHTML = `
      <div class="${FRAME}">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">MENTAL MATH THAI</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Read both scripts · 45-second sprint</p>
          </div>
          ${closeButton()}
        </div>
        <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
          <div>SCORE <span id="mmt-score" class="text-amber-400 text-base">0</span></div>
          <div><span id="mmt-time" class="text-white text-base">${DURATION}</span>s</div>
          <div>OK <span id="mmt-ok" class="text-white">0</span> · X <span id="mmt-bad" class="text-white">0</span></div>
        </div>
        <div id="mmt-q" class="text-center text-3xl font-black text-white tracking-wider mb-4 min-h-[64px] flex items-center justify-center leading-tight"></div>
        <div id="mmt-a" class="text-center text-3xl font-bold text-amber-400 tracking-[0.2em] mb-4 h-12 min-h-[44px]">_</div>
        <div class="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="mmt-key axiom-dpad-btn" data-n="${n}">${n}</button>`).join('')}
          <button class="mmt-key axiom-dpad-btn" data-n="clear">C</button>
          <button class="mmt-key axiom-dpad-btn" data-n="0">0</button>
          <button class="mmt-key axiom-dpad-btn" data-n="enter">↵</button>
        </div>
      </div>
    `;

    const qEl = container.querySelector('#mmt-q');
    const aEl = container.querySelector('#mmt-a');
    const scoreEl = container.querySelector('#mmt-score');
    const okEl = container.querySelector('#mmt-ok');
    const badEl = container.querySelector('#mmt-bad');

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

    container.querySelectorAll('.mmt-key').forEach(btn => {
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
      container.querySelector('#mmt-time').innerText = left;
      if (left <= 0) {
        over = true;
        clearInterval(countdown);
        kb.destroy();
        showResult({
          container,
          title: correct >= 16 ? 'DUAL SCRIPT' : 'SPRINT DONE',
          message: `${correct} read · ${wrong} wrong in 45s. The ๐-๙ block is the same nine values as 0-9 — your brain just has to know that before the arithmetic can start.`,
          score,
          gameId: 'mental-math-thai',
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
