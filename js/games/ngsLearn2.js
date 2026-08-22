/**
 * Dr Non — Non-Gaming System · Learn Wing II
 * Four learning cartridges added 2026-08-11. LEARN was the thinnest wing
 * and had no ear at all — two of these are the first cartridges on the
 * floor you play with your hearing rather than your eyes.
 *
 *   Word Guess    → five letters, six tries, green/amber feedback
 *   Mate in One   → real tactical positions; find the mating move
 *   Ear Trainer   → name the musical interval (Web Audio, no samples)
 *   Morse Code    → decode the beeps; the alphabet that ran the 19th century
 *
 * Ear Trainer and Morse both drive soundFx.playTone directly, so they need
 * an unmuted device — each says so on screen rather than failing silently.
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

function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/* ===========================================================================
 * 1. WORD GUESS — five letters, six tries
 * Green = right letter, right place. Amber = right letter, wrong place.
 * Duplicate handling is the two-pass algorithm: exact matches are claimed
 * first, so a second 'E' only goes amber if an unclaimed 'E' remains.
 * ======================================================================== */
const WORD_ANSWERS = [
  'ARCADE','BRAIN','CHESS','CRANE','DRIFT','FLUTE','GHOST','GLIDE','HONEY','IVORY',
  'JOLLY','KNIFE','LEMON','LUCID','MANGO','MEDAL','NOBLE','OCEAN','PIXEL','PRISM',
  'QUIET','RIVER','ROBOT','SHARP','SOLAR','SPINE','STORM','TIGER','TOKEN','TRACE',
  'ULTRA','VIVID','WHALE','WOVEN','YACHT','ZEBRA','AMBER','BLAZE','CIVIC','DELTA'
];
const WORD_EXTRA_VALID = [
  'ADIEU','AUDIO','RAISE','SLATE','CRATE','TRAIN','HOUSE','MOUSE','PLANT','SHINE',
  'STONE','LIGHT','NIGHT','BREAD','CLOUD','DREAM','EARTH','FIELD','GRAPE','HEART'
];

export function renderWordGuess(container, onClose) {
  start();

  function start() {
    const TRIES = 6, LEN = 5;
    const answer = WORD_ANSWERS[Math.floor(Math.random() * WORD_ANSWERS.length)];
    const valid = new Set([...WORD_ANSWERS, ...WORD_EXTRA_VALID]);
    const guesses = [];
    let current = '', done = false, note = '';

    /** Two-pass scoring so duplicate letters behave correctly. */
    function scoreGuess(g) {
      const res = Array(LEN).fill('miss');
      const pool = {};
      for (let i = 0; i < LEN; i++) {
        if (g[i] === answer[i]) res[i] = 'hit';
        else pool[answer[i]] = (pool[answer[i]] || 0) + 1;
      }
      for (let i = 0; i < LEN; i++) {
        if (res[i] === 'hit') continue;
        if (pool[g[i]] > 0) { res[i] = 'near'; pool[g[i]]--; }
      }
      return res;
    }

    const letterState = () => {
      const st = {};
      guesses.forEach(({ g, r }) => g.split('').forEach((ch, i) => {
        const rank = { miss: 0, near: 1, hit: 2 };
        if (!(ch in st) || rank[r[i]] > rank[st[ch]]) st[ch] = r[i];
      }));
      return st;
    };

    function submit() {
      if (done) return;
      if (current.length !== LEN) { note = 'Needs five letters'; return render(); }
      if (!valid.has(current)) { note = `"${current}" is not in this word list`; return render(); }
      const r = scoreGuess(current);
      guesses.push({ g: current, r });
      const won = r.every(x => x === 'hit');
      current = ''; note = '';
      if (won) { soundFx.playWin(); return finish(true); }
      if (guesses.length >= TRIES) { soundFx.playGameOver(); return finish(false); }
      soundFx.playClick();
      render();
    }

    function finish(won) {
      done = true;
      render();
      setTimeout(() => showResult({
        container,
        title: won ? `SOLVED IN ${guesses.length}` : 'OUT OF TRIES',
        message: won
          ? `${answer} in ${guesses.length} guess${guesses.length === 1 ? '' : 'es'}. Opening with a word carrying three vowels and two common consonants collapses the field fastest.`
          : `The word was ${answer}. Amber means the letter lives somewhere else in the word — a repeated letter only turns amber if a copy is still unaccounted for.`,
        score: won ? (TRIES - guesses.length + 1) * 20 : 0,
        gameId: 'word-guess',
        tone: won ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      }), 500);
    }

    const cellStyle = s =>
      s === 'hit' ? 'background:#3fb950;color:#07130a;border-color:#3fb950'
      : s === 'near' ? 'background:#f59e0b;color:#1a1206;border-color:#f59e0b'
      : s === 'miss' ? 'background:#1b2430;color:#6b7785;border-color:#243041'
      : 'background:transparent;color:#e6edf3;border-color:rgba(245,158,11,0.35)';

    function render() {
      const rows = [];
      for (let i = 0; i < TRIES; i++) {
        const g = guesses[i];
        const typing = !g && i === guesses.length;
        rows.push(`<div class="grid grid-cols-5 gap-1.5">
          ${Array.from({ length: LEN }, (_, j) => {
            const ch = g ? g.g[j] : typing ? (current[j] || '') : '';
            const st = g ? g.r[j] : '';
            return `<div class="aspect-square flex items-center justify-center text-xl font-black" style="border:2px solid;${cellStyle(st)}">${ch}</div>`;
          }).join('')}
        </div>`);
      }
      const st = letterState();
      const keyRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🟩', 'WORD GUESS', 'Five letters · six tries · green is placed, amber is present')}
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>TRY <span class="text-white text-base">${Math.min(guesses.length + 1, TRIES)}</span> / ${TRIES}</div>
            <div id="wg-note" class="text-amber-400">${note || (done ? '' : 'TYPE A WORD')}</div>
          </div>
          <div class="grid gap-1.5 mb-3 max-w-[290px] mx-auto">${rows.join('')}</div>
          <div class="grid gap-1">
            ${keyRows.map(row => `
              <div class="flex justify-center gap-1">
                ${row.split('').map(ch => `
                  <button class="wg-key" data-k="${ch}" style="flex:1;max-width:34px;min-height:44px;border:1px solid rgba(245,158,11,0.3);font-size:12px;font-weight:700;${cellStyle(st[ch] || '')}">${ch}</button>`).join('')}
              </div>`).join('')}
            <div class="flex justify-center gap-1 mt-1">
              <button class="wg-key" data-k="ENTER" style="min-height:44px;padding:0 14px;border:1px solid #f59e0b;background:#f59e0b;color:#1a1206;font-size:11px;font-weight:700">ENTER</button>
              <button class="wg-key" data-k="DEL" style="min-height:44px;padding:0 14px;border:1px solid rgba(245,158,11,0.4);color:#e6edf3;font-size:11px;font-weight:700">⌫ DEL</button>
            </div>
          </div>
        </div>`;

      container.querySelector('#close-game-btn').onclick = () => { kb.destroy(); onClose(); };
      container.querySelectorAll('.wg-key').forEach(b => { b.onclick = () => key(b.dataset.k); });
    }

    function key(k) {
      if (done) return;
      if (k === 'ENTER') return submit();
      if (k === 'DEL') { current = current.slice(0, -1); note = ''; return render(); }
      if (/^[A-Z]$/.test(k) && current.length < LEN) { current += k; note = ''; render(); }
    }

    const kb = new ScopedKeyboard();
    kb.on({
      Enter: () => key('ENTER'), Backspace: () => key('DEL'),
      ...Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap(ch => [
        [ch, () => key(ch)], [ch.toLowerCase(), () => key(ch)]
      ]))
    });

    render();
  }
}

/* ===========================================================================
 * 2. MATE IN ONE — find the move that ends it
 * Real positions, verified by hand. Click the piece, then its square.
 * This is a puzzle book, not an engine: it knows the answer, not the rules.
 * ======================================================================== */
const MATE_PUZZLES = [
  {
    name: 'Back rank',
    // Rook swings to the eighth; the king's own pawns seal the escape.
    pieces: { a1: '♖', g8: '♚', f7: '♟', g7: '♟', h7: '♟', h1: '♔' },
    from: 'a1', to: 'a8',
    why: 'The pawns the king hid behind are now the walls of its cell — that is why it is called a back-rank mate.'
  },
  {
    name: 'Queen to the corner',
    pieces: { a1: '♕', b7: '♖', h8: '♚', h1: '♔' },
    from: 'a1', to: 'a8',
    why: 'The queen takes the eighth rank while the rook on b7 already owns the seventh. No flight square left.'
  },
  {
    name: 'Smothered',
    pieces: { f7: '♘', h8: '♚', g8: '♜', g7: '♟', h7: '♟', h1: '♔' },
    from: 'f7', to: 'f7',
    why: 'Philidor\'s smothered mate: the king is buried by its own rook and pawns, and only a knight can reach past them.',
    already: true
  },
  {
    name: 'Ladder',
    pieces: { a7: '♖', b1: '♖', h8: '♚', h1: '♔' },
    from: 'b1', to: 'b8',
    why: 'Two rooks climb like rungs — one seals the seventh, the other delivers on the eighth.'
  },
  {
    name: 'Queen and bishop',
    pieces: { h5: '♕', b1: '♗', h8: '♚', h1: '♔' },
    from: 'h5', to: 'h7',
    why: 'The queen lands next to the king because the bishop on b1 defends her all the way down the long diagonal.'
  },
  {
    name: 'Anastasia',
    pieces: { e7: '♖', h8: '♚', g7: '♟', h7: '♟', h1: '♔', d5: '♘' },
    from: 'e7', to: 'h7',
    why: 'The rook is immune on h7 because the knight covers the recapture — Anastasia\'s mate, named for a 1803 novel.'
  }
];

export function renderMateInOne(container, onClose) {
  start();

  function start() {
    const puzzles = shuffle(MATE_PUZZLES);
    let i = 0, solved = 0, tries = 0, sel = null, feedback = '';

    const FILES = 'abcdefgh', RANKS = '87654321';

    function render() {
      const p = puzzles[i];
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('♞', 'MATE IN ONE', 'White to move and mate · click the piece, then its square')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            White plays and mates immediately. ${p.already ? 'This one is already on the board — find the piece that delivers it and click it twice.' : 'Find the single move that ends the game.'}
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>PUZZLE <span class="text-white text-base">${i + 1}</span> / ${puzzles.length}</div>
            <div>SOLVED <span class="text-amber-400 text-base">${solved}</span></div>
            <div id="mio-fb" class="text-white">${feedback || p.name.toUpperCase()}</div>
          </div>
          <div class="mio-board grid grid-cols-8 mx-auto" style="max-width:352px;border:1px solid rgba(245,158,11,0.5)">
            ${RANKS.split('').map((rk, ri) => FILES.split('').map((fl, fi) => {
              const sq = fl + rk;
              const light = (ri + fi) % 2 === 0;
              const isSel = sel === sq;
              return `<button class="mio-sq aspect-square flex items-center justify-center" data-sq="${sq}"
                style="border:0;background:${isSel ? '#3fb950' : light ? '#2a3444' : '#161d2b'};font-size:22px;line-height:1;color:#e6edf3">${p.pieces[sq] || ''}</button>`;
            }).join('')).join('')}
          </div>
          <p class="text-center text-[10px] text-amber-500/70 uppercase mt-3">${sel ? `Selected ${sel.toUpperCase()} — now click the destination` : 'Click the piece that mates'}</p>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.mio-sq').forEach(b => { b.onclick = () => tap(b.dataset.sq); });
    }

    function tap(sq) {
      const p = puzzles[i];
      if (!sel) {
        if (!p.pieces[sq]) return;
        sel = sq; feedback = ''; return render();
      }
      const correct = sel === p.from && sq === p.to;
      tries++;
      if (correct) {
        solved++;
        soundFx.playCoin();
        feedback = 'MATE';
        sel = null;
        render();
        setTimeout(() => {
          alertWhy(p);
        }, 320);
      } else {
        soundFx.playHit();
        feedback = 'NOT MATE';
        sel = null;
        render();
      }
    }

    function alertWhy(p) {
      const frame = container.firstElementChild;   // the FRAME div render() built
      if (!frame || container.querySelector('#mio-next')) return;
      const wrap = document.createElement('div');
      wrap.className = 'mt-3 p-3';
      wrap.style.cssText = 'border:1px solid #3fb950;background:rgba(63,185,80,0.1)';
      wrap.innerHTML = `<p class="text-[11px] leading-relaxed" style="color:#e6edf3">${p.why}</p>
        <button id="mio-next" class="mt-3 w-full py-3 font-black text-xs tracking-widest" style="background:#f59e0b;color:#1a1206;border:0">
          ${i + 1 >= puzzles.length ? 'SEE RESULT' : 'NEXT PUZZLE'}</button>`;
      frame.appendChild(wrap);
      wrap.querySelector('#mio-next').onclick = () => {
        i++;
        if (i >= puzzles.length) return end();
        sel = null; feedback = ''; render();
      };
    }

    function end() {
      showResult({
        container,
        title: solved === puzzles.length ? 'ALL MATES FOUND' : 'SESSION COMPLETE',
        message: `${solved} of ${puzzles.length} solved in ${tries} attempt${tries === 1 ? '' : 's'}. Every one of these is a named pattern — once you have seen Anastasia's mate you start seeing it on real boards.`,
        score: solved * 30,
        gameId: 'mate-in-one',
        tone: solved >= puzzles.length - 1 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    render();
  }
}

/* ===========================================================================
 * 3. EAR TRAINER — name the interval
 * Two tones, ascending. Identify the distance. Pure Web Audio through the
 * existing soundFx.playTone — no samples, no assets.
 * ======================================================================== */
const INTERVALS = [
  { n: 0,  name: 'Unison',  hint: 'the same note twice' },
  { n: 2,  name: 'Major 2nd', hint: 'Happy Birthday, first step' },
  { n: 3,  name: 'Minor 3rd', hint: 'Greensleeves' },
  { n: 4,  name: 'Major 3rd', hint: 'When the Saints' },
  { n: 5,  name: 'Perfect 4th', hint: 'Here Comes the Bride' },
  { n: 7,  name: 'Perfect 5th', hint: 'Twinkle Twinkle' },
  { n: 9,  name: 'Major 6th', hint: 'NBC chime' },
  { n: 12, name: 'Octave', hint: 'Somewhere Over the Rainbow' }
];

export function renderEarTrainer(container, onClose) {
  start();

  function start() {
    const ROUNDS = 12;
    const BASE = 261.63; // middle C
    let round = 0, correct = 0, current = null, answered = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; };
    const clearAll = () => { timers.forEach(clearTimeout); timers.clear(); };

    const freq = semis => BASE * Math.pow(2, semis / 12);

    function playInterval() {
      if (!current) return;
      soundFx.init?.();
      // Root, then the interval above it — always ascending so the answer
      // is the distance, not the direction.
      soundFx.playTone(freq(current.root), 'sine', 0.55, 0.28, 0.01);
      later(() => soundFx.playTone(freq(current.root + current.iv.n), 'sine', 0.55, 0.28, 0.01), 650);
    }

    function newRound() {
      if (round >= ROUNDS) return end();
      round++;
      const iv = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
      current = { iv, root: -4 + Math.floor(Math.random() * 8) };
      answered = false;
      render();
      later(playInterval, 260);
    }

    function answer(n) {
      if (answered || !current) return;
      answered = true;
      const right = n === current.iv.n;
      if (right) { correct++; soundFx.playCoin(); } else { soundFx.playHit(); }
      render(right ? 'right' : 'wrong');
      later(newRound, 1150);
    }

    function render(state) {
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🎵', 'EAR TRAINER', 'Name the interval · two tones, always ascending')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Sound on. You will hear a note, then a second note above it. Name the distance between them.
            Replay as often as you like — the ear learns by repetition, not by pressure.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>ROUND <span class="text-white text-base">${round}</span> / ${ROUNDS}</div>
            <div>CORRECT <span class="text-amber-400 text-base">${correct}</span></div>
          </div>
          <div class="text-center mb-4">
            <button id="et-play" class="px-8 py-4 font-black text-sm tracking-widest" style="background:#f59e0b;color:#1a1206;border:0">▶ PLAY AGAIN</button>
          </div>
          ${state ? `<div class="p-3 mb-3 text-center text-xs font-black tracking-widest"
             style="border:1px solid ${state === 'right' ? '#3fb950' : '#f85149'};background:${state === 'right' ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)'};color:${state === 'right' ? '#3fb950' : '#f85149'}">
             ${state === 'right' ? 'CORRECT' : `IT WAS ${current.iv.name.toUpperCase()}`} · ${current.iv.hint}
           </div>` : ''}
          <div class="grid grid-cols-2 gap-2">
            ${INTERVALS.map(iv => `
              <button class="et-opt axiom-dpad-btn py-3 text-xs" data-n="${iv.n}" ${answered ? 'disabled' : ''}>${iv.name}</button>`).join('')}
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearAll(); onClose(); };
      container.querySelector('#et-play').onclick = playInterval;
      container.querySelectorAll('.et-opt').forEach(b => { b.onclick = () => answer(+b.dataset.n); });
    }

    function end() {
      clearAll();
      const pct = Math.round((correct / ROUNDS) * 100);
      showResult({
        container,
        title: pct >= 75 ? 'GOOD EAR' : 'SESSION COMPLETE',
        message: `${correct}/${ROUNDS} (${pct}%). Relative pitch is trainable at any age — absolute pitch mostly is not. Anchoring each interval to a song you already know is how musicians actually learn this.`,
        score: correct * 10,
        gameId: 'ear-trainer',
        tone: pct >= 75 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    newRound();
  }
}

/* ===========================================================================
 * 4. MORSE CODE — decode the beeps
 * Dit, dah, and the silence between. Plays the letter, you name it. The
 * pattern is shown after the answer so the alphabet is learnable in a sitting.
 * ======================================================================== */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..'
};
// Ordered easy → hard: single marks first, then two, then the long ones.
const MORSE_LADDER = ['E','T','I','A','N','M','S','U','R','D','K','G','O','H','V','F','L','P','J','B','X','C','Y','Z','Q','W'];

export function renderMorseCode(container, onClose) {
  start();

  function start() {
    const ROUNDS = 12;
    const DIT = 90, TONE = 620;
    let round = 0, correct = 0, letter = null, answered = false, playing = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; };
    const clearAll = () => { timers.forEach(clearTimeout); timers.clear(); };

    function playLetter() {
      if (!letter || playing) return;
      playing = true;
      soundFx.init?.();
      let t = 0;
      MORSE[letter].split('').forEach(mark => {
        const dur = mark === '.' ? DIT : DIT * 3;
        later(() => soundFx.playTone(TONE, 'square', dur / 1000, 0.22, 0.2), t);
        t += dur + DIT;                       // one dit of silence between marks
      });
      later(() => { playing = false; }, t + 60);
    }

    function newRound() {
      if (round >= ROUNDS) return end();
      round++;
      // Draw from a widening slice of the ladder so early rounds stay learnable.
      const span = Math.min(MORSE_LADDER.length, 6 + round * 2);
      letter = MORSE_LADDER[Math.floor(Math.random() * span)];
      answered = false;
      render();
      later(playLetter, 300);
    }

    function options() {
      const wrong = shuffle(MORSE_LADDER.filter(l => l !== letter)).slice(0, 5);
      return shuffle([letter, ...wrong]);
    }
    let opts = [];

    function answer(l) {
      if (answered) return;
      answered = true;
      const right = l === letter;
      if (right) { correct++; soundFx.playCoin(); } else { soundFx.playHit(); }
      render(right ? 'right' : 'wrong');
      later(newRound, 1250);
    }

    function render(state) {
      if (!answered && (!opts.length || !opts.includes(letter))) opts = options();
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('📻', 'MORSE CODE', 'Decode the beeps · short is a dit, long is a dah')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Sound on. One letter plays as short and long tones. Pick it below.
            The alphabet is ordered easiest first — E is one dit, T is one dah.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-3 text-xs font-bold">
            <div>ROUND <span class="text-white text-base">${round}</span> / ${ROUNDS}</div>
            <div>CORRECT <span class="text-amber-400 text-base">${correct}</span></div>
          </div>
          <div class="text-center mb-3">
            <button id="mc-play" class="px-8 py-4 font-black text-sm tracking-widest" style="background:#f59e0b;color:#1a1206;border:0">▶ REPLAY</button>
          </div>
          <div class="text-center text-3xl tracking-[0.4em] mb-3" style="color:${state ? '#e6edf3' : 'transparent'};min-height:40px">
            ${state ? MORSE[letter].replace(/\./g, '·').replace(/-/g, '—') : '·'}
          </div>
          ${state ? `<div class="p-3 mb-3 text-center text-xs font-black tracking-widest"
            style="border:1px solid ${state === 'right' ? '#3fb950' : '#f85149'};background:${state === 'right' ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)'};color:${state === 'right' ? '#3fb950' : '#f85149'}">
            ${state === 'right' ? 'CORRECT' : 'IT WAS'} — ${letter}
          </div>` : ''}
          <div class="grid grid-cols-3 gap-2">
            ${opts.map(l => `<button class="mc-opt axiom-dpad-btn py-4 text-lg font-black" data-l="${l}" ${answered ? 'disabled' : ''}>${l}</button>`).join('')}
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearAll(); onClose(); };
      container.querySelector('#mc-play').onclick = playLetter;
      container.querySelectorAll('.mc-opt').forEach(b => { b.onclick = () => answer(b.dataset.l); });
    }

    function end() {
      clearAll();
      const pct = Math.round((correct / ROUNDS) * 100);
      showResult({
        container,
        title: pct >= 75 ? 'OPERATOR' : 'SESSION COMPLETE',
        message: `${correct}/${ROUNDS} (${pct}%). Real operators never count dots — they learn each letter as a single rhythm, which is why the code survived a century of faster technology.`,
        score: correct * 10,
        gameId: 'morse-code',
        tone: pct >= 75 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    newRound();
  }
}
