/**
 * Dr Non — Non-Gaming System · Curiosity Suite
 * Phase 7 (2026-08-10). Three famous results you can argue about at a table —
 * each one braggable, each one with the original paper on the shelf.
 *
 *   Chimp Test   → Inoue & Matsuzawa 2007 (a chimpanzee outperforms humans
 *                  at masked numerical recall; the internet has been losing
 *                  to Ayumu ever since)
 *   Calibration  → Lichtenstein & Fischhoff 1977 (people who say they are
 *                  90% sure are right far less often — overconfidence made
 *                  measurable, the beating heart of the Kahneman shelf)
 *   Monty Hall   → Selvin 1975 / vos Savant 1990 (switching wins 2/3 of the
 *                  time; thousands of PhDs wrote in to insist otherwise)
 *
 * Renderer contract: (container, onClose), showResult({ gameId }) at the end.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

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

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===========================================================================
 * 1. CHIMP TEST — Inoue & Matsuzawa 2007
 * Digits flash in random cells, then hide behind blanks the instant you tap
 * the 1. Tap the rest in order from masked memory. Ayumu the chimpanzee does
 * this at 9 digits with ~80% accuracy after 210ms exposure.
 * ======================================================================== */
export function renderChimpTest(container, onClose) {
  start();

  function start() {
    const COLS = 6, ROWS = 5, MAX_TRIALS = 15; // 6 cols so phone cells stay ≥44px; cap keeps the ceiling finite
    let level = 4, lives = 3, trial = 0, score = 0, best = 0;
    let cells = [], nextNeeded = 1, masked = false;

    function newTrial() {
      if (trial >= MAX_TRIALS) return end();
      trial++;
      nextNeeded = 1;
      masked = false;
      // place `level` digits in distinct random cells
      const slots = shuffle(Array.from({ length: COLS * ROWS }, (_, i) => i)).slice(0, level);
      cells = slots.map((cell, i) => ({ cell, n: i + 1 }));
      render();
    }

    function render() {
      const byCell = new Map(cells.map(c => [c.cell, c]));
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🐵', 'CHIMP TEST', 'Masked numerical recall · Inoue & Matsuzawa 2007')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Memorise where the numbers sit. The moment you tap 1, the rest turn into blanks —
            finish the sequence from memory. Ayumu the chimpanzee manages 9.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>DIGITS <span class="text-amber-400 text-base">${level}</span></div>
            <div>LIVES <span class="text-red-500 text-base">${'●'.repeat(lives)}${'○'.repeat(3 - lives)}</span></div>
            <div>SCORE <span class="text-white text-base">${score}</span></div>
          </div>
          <div class="grid gap-1 bg-zinc-950 border border-amber-500/40 p-3" style="grid-template-columns:repeat(${COLS},1fr)">
            ${Array.from({ length: COLS * ROWS }, (_, i) => {
              const c = byCell.get(i);
              if (!c) return '<div class="aspect-square min-h-[40px]"></div>';
              const done = c.n < nextNeeded;
              const label = done ? '' : (masked ? '' : c.n);
              const cls = done
                ? 'bg-transparent'
                : (masked ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-amber-500 text-black');
              return `<button class="chimp-cell aspect-square min-h-[40px] text-lg font-black ${cls}" data-n="${c.n}" ${done ? 'disabled' : ''}>${label}</button>`;
            }).join('')}
          </div>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.chimp-cell').forEach(btn => {
        btn.onclick = () => {
          const n = parseInt(btn.dataset.n, 10);
          if (n !== nextNeeded) {
            lives--;
            soundFx.playHit();
            if (lives <= 0) return end();
            // failed trial: drop a level (floor 4), new layout
            level = Math.max(4, level - 1);
            return newTrial();
          }
          soundFx.playClick();
          if (nextNeeded === 1) masked = true;   // the Ayumu moment
          nextNeeded++;
          if (nextNeeded > level) {
            score += level * 10;
            best = Math.max(best, level);
            soundFx.playCoin();
            level = Math.min(9, level + 1);
            return newTrial();
          }
          render();
        };
      });
    }

    function end() {
      showResult({
        container,
        title: best >= 9 ? 'AYUMU LEVEL' : best >= 7 ? 'STRONG PRIMATE' : 'SESSION COMPLETE',
        message: `Best run: ${best} digits masked. Ayumu the chimpanzee holds 9 with ~80% accuracy from a 210ms glance — most humans plateau at 5–6 with unlimited study time. Brag accordingly.`,
        score,
        gameId: 'chimp-test',
        tone: best >= 7 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    newTrial();
  }
}

/* ===========================================================================
 * 2. CALIBRATION — Lichtenstein & Fischhoff 1977
 * Ten quantities. For each, give a LOW and HIGH bound you are 90% sure
 * contains the true value. A calibrated player traps ~9 of 10. Most people
 * trap 3–5 — that gap has a name, and it runs the world.
 * ======================================================================== */
const CALIB_QUESTIONS = [
  { q: 'Height of Mount Everest, in metres', a: 8849, unit: 'm' },
  { q: 'Year the Eiffel Tower was completed', a: 1889, unit: '' },
  { q: 'Average distance from Earth to the Moon, in kilometres', a: 384400, unit: 'km' },
  { q: 'Length of the Mekong River, in kilometres', a: 4350, unit: 'km' },
  { q: 'Number of bones in an adult human body', a: 206, unit: '' },
  { q: 'Year Gutenberg printed his first Bible', a: 1455, unit: '' },
  { q: 'Population of Japan, in millions', a: 124, unit: 'M' },
  { q: 'Boiling point of water at the top of Everest, in °C', a: 71, unit: '°C' },
  { q: 'Number of keys on a standard piano', a: 88, unit: '' },
  { q: 'Year the first email was sent', a: 1971, unit: '' },
  { q: 'Weight of the blue whale heart, in kilograms', a: 180, unit: 'kg' },
  { q: 'Number of official FIFA member associations', a: 211, unit: '' },
  { q: 'Depth of the Mariana Trench, in metres', a: 10935, unit: 'm' },
  { q: 'Year the Berlin Wall fell', a: 1989, unit: '' },
  { q: 'Speed of sound at sea level, in km/h', a: 1235, unit: 'km/h' }
];

export function renderCalibration(container, onClose) {
  start();

  function start() {
    const ROUNDS = 10;
    const qs = shuffle(CALIB_QUESTIONS).slice(0, ROUNDS);
    let i = 0, hits = 0, results = [];

    function ask() {
      const item = qs[i];
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('📏', 'CALIBRATION', '90% confidence intervals · Lichtenstein & Fischhoff 1977')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            Give a LOW and HIGH bound you are 90% sure contains the true value.
            Don't know it? Widen the range — that IS the skill. Narrow ranges you miss are overconfidence.
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>QUESTION <span class="text-white">${i + 1}</span> / ${ROUNDS}</div>
            <div>TRAPPED <span class="text-amber-400">${hits}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-6 mb-4 text-center">
            <div class="text-amber-400 text-lg font-black leading-snug">${item.q}</div>
          </div>
          <form id="cal-form" class="grid grid-cols-2 gap-3">
            <label class="text-[10px] text-amber-500/80 uppercase" style="min-width:0">Low bound
              <input id="cal-lo" type="number" step="any" inputmode="decimal" required
                     class="w-full mt-1 bg-zinc-950 border border-amber-500/40 text-white text-lg p-3 font-bold" style="min-width:0" />
            </label>
            <label class="text-[10px] text-amber-500/80 uppercase" style="min-width:0">High bound
              <input id="cal-hi" type="number" step="any" inputmode="decimal" required
                     class="w-full mt-1 bg-zinc-950 border border-amber-500/40 text-white text-lg p-3 font-bold" style="min-width:0" />
            </label>
            <button type="submit" class="col-span-2 py-4 bg-amber-500 text-black font-black tracking-widest text-sm hover:opacity-90">LOCK IT IN</button>
          </form>
          <div id="cal-reveal" class="mt-4" hidden></div>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      const form = container.querySelector('#cal-form');
      form.onsubmit = (e) => {
        e.preventDefault();
        const lo = parseFloat(container.querySelector('#cal-lo').value);
        const hi = parseFloat(container.querySelector('#cal-hi').value);
        if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return;
        const trapped = item.a >= lo && item.a <= hi;
        if (trapped) { hits++; soundFx.playCoin(); } else { soundFx.playHit(); }
        results.push({ q: item.q, a: item.a, lo, hi, trapped });
        const rev = container.querySelector('#cal-reveal');
        rev.hidden = false;
        rev.innerHTML = `
          <div class="border ${trapped ? 'border-green-500/60 bg-green-500/10' : 'border-red-500/60 bg-red-500/10'} p-4 text-center">
            <div class="text-xs ${trapped ? 'text-green-400' : 'text-red-400'} font-black tracking-widest mb-1">${trapped ? 'TRAPPED IT' : 'MISSED'}</div>
            <div class="text-white text-2xl font-black">${item.a.toLocaleString()}${item.unit ? ' ' + item.unit : ''}</div>
            <button id="cal-next" class="mt-3 px-8 py-3 bg-amber-500 text-black font-black text-xs tracking-widest">${i + 1 >= ROUNDS ? 'SEE VERDICT' : 'NEXT'}</button>
          </div>`;
        form.querySelectorAll('input,button').forEach(el => el.disabled = true);
        container.querySelector('#cal-next').onclick = () => { i++; i >= ROUNDS ? end() : ask(); };
      };
      setTimeout(() => container.querySelector('#cal-lo')?.focus(), 30);
    }

    function end() {
      const rate = hits * 10;
      // The verdict is the product: distance from the 90% you claimed.
      const verdict = hits >= 9
        ? 'Calibrated. Genuinely rare.'
        : hits >= 7
          ? `You claimed 90% and delivered ${rate}%. Mildly overconfident — better than most.`
          : `You claimed 90% and delivered ${rate}%. That gap is textbook overconfidence — the average untrained result is 40–60%. Wider intervals next time; being vague on purpose is the skill.`;
      showResult({
        container,
        title: hits >= 9 ? 'CALIBRATED' : 'OVERCONFIDENT',
        message: `${hits}/10 intervals trapped the truth. ${verdict}`,
        score: hits * 10,
        gameId: 'calibration',
        tone: hits >= 8 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    ask();
  }
}

/* ===========================================================================
 * 3. MONTY HALL — Selvin 1975 / vos Savant 1990
 * Three doors, one prize. You pick, the host opens a losing door, you choose:
 * stay or switch. Switching wins 2/3 of the time. Play 15 rounds and watch
 * the running tallies settle the argument the mail could not.
 * ======================================================================== */
export function renderMontyHall(container, onClose) {
  start();

  function start() {
    const ROUNDS = 15;
    let round = 0, wins = 0;
    const tally = { stay: { n: 0, w: 0 }, switch: { n: 0, w: 0 } };
    let prize = 0, picked = null, opened = null;

    function newRound() {
      round++;
      prize = Math.floor(Math.random() * 3);
      picked = null; opened = null;
      render('pick');
    }

    const DOOR = (i, state) => {
      const isOpen = opened === i && state !== 'reveal';
      const revealed = state === 'reveal';
      const label = revealed ? (i === prize ? '🏆' : '🐐') : (isOpen ? '🐐' : String(i + 1));
      const cls = revealed
        ? (i === prize ? 'border-amber-400 bg-amber-500/20' : 'border-zinc-700 bg-zinc-900 opacity-60')
        : isOpen
          ? 'border-zinc-700 bg-zinc-900 opacity-60'
          : picked === i
            ? 'border-amber-400 bg-amber-500/20'
            : 'border-zinc-600 bg-zinc-900 hover:border-amber-400';
      return `<button class="mh-door aspect-[2/3] border-2 ${cls} text-4xl font-black flex flex-col items-center justify-center gap-2" data-i="${i}" ${isOpen || revealed ? 'disabled' : ''}>
        <span>${label}</span>${picked === i && !revealed ? '<span class="text-[9px] text-amber-400 tracking-widest">YOUR PICK</span>' : ''}
      </button>`;
    };

    function render(state) {
      const stayRate = tally.stay.n ? Math.round((tally.stay.w / tally.stay.n) * 100) : null;
      const swRate = tally.switch.n ? Math.round((tally.switch.w / tally.switch.n) * 100) : null;
      container.innerHTML = `
        <div class="${FRAME}">
          ${head('🚪', 'MONTY HALL', 'Stay or switch · Selvin 1975 · vos Savant 1990')}
          <div class="text-amber-500/80 text-[10px] uppercase text-center mb-3">
            One door hides the prize. Pick one; the host — who knows where the prize is — opens a losing door.
            Then the only question that ever mattered: stay, or switch?
          </div>
          <div class="flex justify-between items-center bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold">
            <div>ROUND <span class="text-white">${round}</span> / ${ROUNDS}</div>
            <div>STAY <span class="text-white">${tally.stay.w}/${tally.stay.n}</span>${stayRate !== null ? ` <span class="text-zinc-500">(${stayRate}%)</span>` : ''}</div>
            <div>SWITCH <span class="text-amber-400">${tally.switch.w}/${tally.switch.n}</span>${swRate !== null ? ` <span class="text-zinc-500">(${swRate}%)</span>` : ''}</div>
          </div>
          <div class="grid grid-cols-3 gap-3 mb-4">${[0, 1, 2].map(i => DOOR(i, state)).join('')}</div>
          <div id="mh-controls" class="text-center"></div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      const controls = container.querySelector('#mh-controls');

      if (state === 'pick') {
        controls.innerHTML = '<p class="text-[11px] text-amber-500/80 uppercase">Pick a door</p>';
        container.querySelectorAll('.mh-door').forEach(d => {
          d.onclick = () => {
            picked = parseInt(d.dataset.i, 10);
            // Host opens a door that is neither the pick nor the prize
            const options = [0, 1, 2].filter(i => i !== picked && i !== prize);
            opened = options[Math.floor(Math.random() * options.length)];
            soundFx.playClick();
            render('decide');
          };
        });
      } else if (state === 'decide') {
        controls.innerHTML = `
          <p class="text-[11px] text-amber-500/80 uppercase mb-3">The host opened door ${opened + 1} — a goat. Now:</p>
          <div class="flex justify-center gap-3">
            <button id="mh-stay" class="axiom-dpad-btn px-8 py-3">STAY ON ${picked + 1}</button>
            <button id="mh-switch" class="axiom-dpad-btn px-8 py-3">SWITCH</button>
          </div>`;
        const finish = (choice) => {
          const finalDoor = choice === 'stay' ? picked : [0, 1, 2].find(i => i !== picked && i !== opened);
          const won = finalDoor === prize;
          tally[choice].n++;
          if (won) { tally[choice].w++; wins++; soundFx.playCoin(); } else { soundFx.playHit(); }
          picked = finalDoor;
          render('reveal');
          const c2 = container.querySelector('#mh-controls');
          c2.innerHTML = `
            <div class="border ${won ? 'border-green-500/60 bg-green-500/10' : 'border-red-500/60 bg-red-500/10'} p-3 mb-1">
              <span class="text-xs font-black tracking-widest ${won ? 'text-green-400' : 'text-red-400'}">${won ? 'PRIZE' : 'GOAT'} — you ${choice === 'stay' ? 'stayed' : 'switched'}</span>
            </div>
            <button id="mh-next" class="mt-2 px-8 py-3 bg-amber-500 text-black font-black text-xs tracking-widest">${round >= ROUNDS ? 'SEE THE MATH' : 'NEXT ROUND'}</button>`;
          container.querySelector('#mh-next').onclick = () => round >= ROUNDS ? end() : newRound();
        };
        container.querySelector('#mh-stay').onclick = () => finish('stay');
        container.querySelector('#mh-switch').onclick = () => finish('switch');
      }
    }

    function end() {
      const swRate = tally.switch.n ? Math.round((tally.switch.w / tally.switch.n) * 100) : 0;
      const stayRate = tally.stay.n ? Math.round((tally.stay.w / tally.stay.n) * 100) : 0;
      showResult({
        container,
        title: `${wins} / ${ROUNDS} PRIZES`,
        message: `Stay won ${stayRate}% (${tally.stay.w}/${tally.stay.n}); switch won ${swRate}% (${tally.switch.w}/${tally.switch.n}). The math says stay = 1/3, switch = 2/3 — your first pick was probably wrong, and the host's open door hands that probability to the other one. When vos Savant printed this in 1990, close to a thousand PhDs wrote in to tell her she was wrong. She was not.`,
        score: wins * 10,
        gameId: 'monty-hall',
        tone: wins >= 8 ? 'win' : 'over',
        onRestart: () => start(),
        onClose
      });
    }

    newRound();
  }
}
