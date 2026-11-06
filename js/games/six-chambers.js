/**
 * Dr Non — Non-Gaming System · Six Chambers
 *
 * A rubber toy revolver. Six chambers, some holding a squib that only makes
 * a click. Nothing is fired, ever — there is no gun drawn here, and the
 * training is arithmetic, not the weapon.
 *
 * WHAT IT TRAINS: calibration under partial information.
 *
 * The lesson is that the chance of the next pull is NOT constant, and that
 * most people have it exactly backwards.
 *
 *   SPIN EACH PULL — the cylinder is spun before every pull, so each pull
 *     stands alone. The chance stays at 1/6 (or 1/3, 1/2) forever, and a safe
 *     pull tells you NOTHING about the next one.
 *
 *   NO SPIN — the cylinder walks one chamber at a time. A safe pull means the
 *     squib is still out there among the chambers you have not reached yet,
 *     so the chance RISES: 1/6, then 1/5, then 1/4, then 1/3, then 1/2, then
 *     certain. Surviving more pulls without spinning makes each further pull
 *     MORE dangerous, not less. That is the gambler's fallacy inverted, and
 *     it is the reason the sixth pull is the one that kills.
 *
 * The player states the probability before every pull. The score rewards
 * being right and punishes being confidently wrong, so guessing is worse
 * than thinking.
 *
 * Every rule below is an exported pure function so it can be tested without a
 * browser. The renderer is a thin shell over them.
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud';

export const CHAMBER_COUNT = 6;
export const MAX_PULLS = 12;
export const MODES = ['each', 'never'];

/** Greatest common divisor — probabilities are compared as exact fractions. */
function gcd(a, b) {
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

/** Reduce a fraction to lowest terms. */
export function reduce(n, d) {
  if (d === 0) return { n: 0, d: 1 };
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  return { n: n / g, d: d / g };
}

/** Format a probability for display: 1/6, 1/3, 1. */
export function formatProbability(p) {
  if (!p) return '—';
  if (p.d === 1) return String(p.n);
  return `${p.n}/${p.d}`;
}

/**
 * The probability that the NEXT pull is a squib, given what the player knows.
 *
 * `pulls` is the number of pulls already made in this cylinder, all of them
 * safe — a squib ends the run, so no squib has been seen yet.
 *
 *   spin 'each'  — independent draws, the chance never moves.
 *   spin 'never' — the cylinder walks, so the squibs are concentrated in the
 *                  chambers not yet reached and the chance climbs.
 */
export function nextProbability(loaded, pulls, spin) {
  if (spin === 'each') return reduce(loaded, CHAMBER_COUNT);
  const remaining = CHAMBER_COUNT - pulls;
  if (remaining <= 0) return { n: 0, d: 1 };
  return reduce(loaded, remaining);
}

/**
 * Every probability a player can actually face, smallest first.
 *
 * Only real probabilities survive: strictly above zero and at most one. The
 * arithmetic can produce nonsense at the end of a cylinder — with two squibs
 * and one chamber left, "2 in 1" — but those states are unreachable, because
 * the squib would already have been pulled. Offering them as chips would put
 * a "2" and a "0" on the board next to real answers.
 */
export function reachableProbabilities() {
  const seen = new Map();
  for (const loaded of [1, 2, 3]) {
    for (const spin of MODES) {
      for (let pulls = 0; pulls <= CHAMBER_COUNT; pulls++) {
        const p = nextProbability(loaded, pulls, spin);
        if (p.n <= 0 || p.n > p.d) continue;
        seen.set(`${p.n}/${p.d}`, p);
      }
    }
  }
  return [...seen.values()].sort((a, b) => (a.n / a.d) - (b.n / b.d));
}

/** Fisher–Yates on a copy. */
function shuffle(items, random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One cylinder. Six chambers; `loaded` of them hold a squib.
 * The player is told how many squibs there are and which mode is in play,
 * but not where they sit.
 */
export function createCylinder({ loaded = 1, spin = 'each', random = Math.random } = {}) {
  if (!Number.isInteger(loaded) || loaded < 1 || loaded > 3) {
    throw new RangeError('a cylinder holds 1–3 squibs');
  }
  if (!MODES.includes(spin)) throw new RangeError(`spin must be one of ${MODES.join(', ')}`);
  const layout = shuffle(Array.from({ length: CHAMBER_COUNT }, (_, i) => i < loaded), random);
  let pulls = 0;
  let position = -1;
  // Which chambers have actually been pulled. It is not the same as
  // "the first N": spun each pull, the cylinder lands on a random chamber,
  // so the revealed set has to be recorded rather than inferred from a count.
  const revealed = new Array(CHAMBER_COUNT).fill(false);
  return {
    layout,
    loaded,
    spin,
    get pulls() { return pulls; },
    get position() { return position; },
    get revealed() { return revealed.slice(); },
    /** The chance the next pull is a squib, from the player's side of the glass. */
    get probability() { return nextProbability(loaded, pulls, spin); },
    /** Pull the trigger. Returns what the chamber held. */
    pull() {
      if (pulls >= CHAMBER_COUNT) throw new Error('this cylinder is empty');
      const before = this.probability;
      position = spin === 'each'
        ? Math.floor(random() * CHAMBER_COUNT)
        : (position + 1) % CHAMBER_COUNT;
      pulls++;
      revealed[position] = true;
      return { squib: layout[position], position, probabilityBefore: before, probabilityAfter: this.probability };
    }
  };
}

/**
 * The whole run: a fresh cylinder each time the last one is retired, up to
 * MAX_PULLS pulls, unless the player stops first.
 */
export function createRun({ random = Math.random, maxPulls = MAX_PULLS } = {}) {
  let cylinder = null;
  let setup = null;
  let correct = 0, wrong = 0, pulls = 0, ended = false, stopped = false;
  const history = [];

  function newCylinder() {
    const loaded = 1 + Math.floor(random() * 3);
    const spin = random() < 0.5 ? 'each' : 'never';
    setup = { loaded, spin };
    cylinder = createCylinder({ loaded, spin, random });
    return cylinder;
  }

  return {
    get setup() { return setup; },
    get cylinder() { return cylinder; },
    get probability() { return cylinder ? cylinder.probability : null; },
    get correct() { return correct; },
    get wrong() { return wrong; },
    get pulls() { return pulls; },
    get ended() { return ended; },
    get stopped() { return stopped; },
    /** +2 for a correct statement, −1 for a confident wrong one. Never below zero. */
    get score() { return Math.max(0, correct * 2 - wrong); },
    /** Is the stated probability the true one? */
    isCorrect(stated) {
      if (!cylinder || !stated) return false;
      const truth = cylinder.probability;
      return stated.n * truth.d === truth.n * stated.d;
    },
    begin() { if (!cylinder) newCylinder(); return cylinder; },
    /** Pull. Returns { squib, correct, probabilityBefore, probabilityAfter }. */
    pull(stated) {
      if (ended) throw new Error('the run is over');
      if (!cylinder) newCylinder();
      const wasCorrect = this.isCorrect(stated);
      const result = cylinder.pull();
      pulls++;
      if (wasCorrect) correct++; else wrong++;
      history.push({ mode: setup.spin, loaded: setup.loaded, correct: wasCorrect, probability: result.probabilityBefore });
      if (result.squib) {
        ended = true;
      } else if (pulls >= maxPulls) {
        ended = true;
      } else if (cylinder.pulls >= CHAMBER_COUNT) {
        newCylinder();
      }
      return { ...result, correct: wasCorrect };
    },
    /** Stop now and keep the score. Always allowed. */
    stop() { stopped = true; ended = true; },
    /** How the run went, per mode — the comparison that carries the lesson. */
    byMode() {
      const out = { each: { n: 0, right: 0 }, never: { n: 0, right: 0 } };
      for (const row of history) {
        out[row.mode].n++;
        if (row.correct) out[row.mode].right++;
      }
      return out;
    }
  };
}

const MODE_LABEL = { each: 'SPIN EACH PULL', never: 'NO SPIN' };

export function renderSixChambers(container, onClose) {
  const run = createRun();
  const options = reachableProbabilities();
  let stated = null;

  function chamberSvg() {
    const cyl = run.cylinder;
    const R = 52, cx = 70, cy = 62;
    const pts = Array.from({ length: CHAMBER_COUNT }, (_, i) => {
      const a = (Math.PI * 2 * i) / CHAMBER_COUNT - Math.PI / 2;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), i };
    });
    const revealed = cyl ? cyl.revealed : [];
    const cells = pts.map(p => {
      const isCurrent = cyl && cyl.position === p.i;
      const wasPulled = Boolean(revealed[p.i]);
      const squib = cyl ? cyl.layout[p.i] : false;
      // An unvisited chamber is a lit disc, a visited one is a hole, and the
      // squib is amber. All three have to be told apart on a black frame, so
      // none of them is allowed to be near-black.
      const fill = wasPulled ? (squib ? '#f59e0b' : '#0a0e14') : '#1c2433';
      const stroke = isCurrent ? '#f59e0b' : wasPulled ? '#64748b' : '#3d4a5c';
      const label = wasPulled && squib ? '!' : '';
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="13" fill="${fill}" stroke="${stroke}" stroke-width="${isCurrent ? 3 : 1.5}" />
        ${label ? `<text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="bold" fill="#0a0e14">${label}</text>` : ''}`;
    }).join('');
    const hammer = pts[0];
    return `<svg viewBox="0 0 140 124" width="140" height="124" role="img" aria-label="Cylinder with six chambers">
      <circle cx="${cx}" cy="${cy}" r="${R + 17}" fill="none" stroke="#334155" stroke-width="1.5" />
      ${cells}
      <path d="M${hammer.x} ${hammer.y - 16} l-6 -9 h12 z" fill="#f59e0b" />
    </svg>`;
  }

  function render() {
    const cyl = run.cylinder;
    const p = run.probability;
    const chips = options.map(opt => {
      const on = stated && stated.n === opt.n && stated.d === opt.d;
      return `<button type="button" data-p="${opt.n}/${opt.d}" class="px-2 py-3 border ${on ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-400'} text-xs font-bold min-h-[44px]">${formatProbability(opt)}</button>`;
    }).join('');

    container.innerHTML = `<div class="${FRAME}">
      <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl text-amber-400">◎</span>
          <div>
            <h2 class="text-xl font-black text-amber-400 tracking-wider">SIX CHAMBERS</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Bayesian updating · rubber toy</p>
          </div>
        </div>
        <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
      </div>

      <div class="bg-zinc-950 border border-amber-500/40 p-3 mb-4 text-xs font-bold flex justify-between">
        <div>PULLS <span class="text-white">${run.pulls}</span> / ${MAX_PULLS}</div>
        <div>RIGHT <span class="text-amber-400">${run.correct}</span></div>
        <div>WRONG <span class="text-zinc-400">${run.wrong}</span></div>
        <div>SCORE <span class="text-white">${run.score}</span></div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 items-center mb-4">
        <div class="shrink-0">${chamberSvg()}</div>
        <div class="flex-1 text-xs leading-relaxed">
          <p class="text-amber-400 font-bold uppercase mb-2">${cyl ? `${cyl.loaded} SQUIB${cyl.loaded > 1 ? 'S' : ''} · ${MODE_LABEL[cyl.spin]}` : 'READY'}</p>
          <p class="text-zinc-300 mb-2">${cyl && cyl.spin === 'never'
            ? 'The cylinder walks one chamber at a time. Every safe pull leaves the squib among the chambers you have not reached — so the chance goes UP.'
            : 'The cylinder is spun before every pull. Each pull stands alone, so the chance never moves and a safe pull tells you nothing.'}</p>
          <p class="text-zinc-400">Before you pull, say what the chance is.</p>
        </div>
      </div>

      <p class="text-[11px] text-amber-500/80 uppercase mb-2">Chance the next pull is a squib</p>
      <div class="grid grid-cols-5 gap-2 mb-4">${chips}</div>

      <div class="flex gap-3">
        <button id="pull-btn" class="flex-1 py-4 ${stated ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'} font-black tracking-widest text-sm min-h-[44px]" ${stated ? '' : 'disabled'}>PULL THE TRIGGER</button>
        <button id="stop-btn" class="px-4 py-4 border border-zinc-600 text-zinc-300 font-bold text-xs tracking-widest min-h-[44px]">STOP</button>
      </div>
      <p id="six-feedback" class="text-xs mt-3 min-h-[1.2em] text-zinc-400">${p ? `True chance right now: ${formatProbability(p)}` : ''}</p>
      <p class="text-[10px] text-zinc-500 mt-2">A rubber toy. The chambers hold a squib that only clicks — nothing fires, and no gun is drawn.</p>
    </div>`;

    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelectorAll('[data-p]').forEach(b => {
      b.onclick = () => {
        const [n, d] = b.dataset.p.split('/').map(Number);
        stated = { n, d };
        render();
      };
    });
    const pullBtn = container.querySelector('#pull-btn');
    pullBtn.onclick = () => {
      const result = run.pull(stated);
      stated = null;
      soundFx[result.squib ? 'playHit' : 'playCoin']();
      const feedback = container.querySelector('#six-feedback');
      if (result.squib) {
        feedback.textContent = `SQUIB — the click. Your statement was ${result.correct ? 'right' : 'wrong'}. The true chance was ${formatProbability(result.probabilityBefore)}.`;
        feedback.className = 'text-xs mt-3 min-h-[1.2em] text-amber-400';
      } else {
        feedback.textContent = `Empty chamber. ${result.correct ? 'Right.' : `Wrong — the chance was ${formatProbability(result.probabilityBefore)}.`} Next pull is now ${formatProbability(result.probabilityAfter)}.`;
        feedback.className = 'text-xs mt-3 min-h-[1.2em] text-zinc-300';
      }
      if (run.ended) finish();
      else render();
    };
    container.querySelector('#stop-btn').onclick = () => { run.stop(); finish(); };
  }

  function finish() {
    const modes = run.byMode();
    const rate = (m) => (m.n ? Math.round((m.right / m.n) * 100) : null);
    const eachRate = rate(modes.each), neverRate = rate(modes.never);
    const lines = [];
    if (eachRate !== null) lines.push(`SPIN EACH PULL: ${modes.each.right}/${modes.each.n} right (${eachRate}%) — the chance never moved, so a safe pull told you nothing about the next one.`);
    if (neverRate !== null) lines.push(`NO SPIN: ${modes.never.right}/${modes.never.n} right (${neverRate}%) — the chance climbed on every safe pull, and the climb is the whole point.`);
    const message = lines.join(' ')
      || 'A rubber toy cylinder. Nothing fires — the training is the arithmetic.';
    showResult({
      container,
      title: run.stopped ? 'STOPPED EARLY' : 'RUN ENDED',
      message,
      score: run.score,
      gameId: 'six-chambers',
      tone: run.score >= 12 ? 'win' : 'over',
      onRestart: () => renderSixChambers(container, onClose),
      onClose
    });
  }

  run.begin();
  render();
}
