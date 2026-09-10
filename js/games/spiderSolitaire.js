/**
 * NGS Arcade · Spider Solitaire — 1-suit (easy) or 4-suit (hard).
 *
 * Two decks, 10 tableau columns, 5 stock deals of 10 cards each, and
 * 8 foundation slots that accept a complete K→A run.
 *
 * Rules:
 *   - 1-suit: any card stacks on any card one higher.
 *   - 4-suit: same suit only.
 *   - Empty column accepts any single card or movable run.
 *   - Click a face-up card, then click a destination column.
 *   - A complete K→A run auto-moves to a foundation when it sits alone on a column.
 *   - Deal a new row of 10 from the stock when stock is non-empty.
 *
 * Pure helpers (no DOM):
 *   - newDeck(mode)
 *   - dealInitial(mode)
 *   - movableRun(column) — longest valid run from the bottom of the column
 *   - canStack(card, onTop, mode)
 *   - applyMove(state, move)
 *   - checkAutoFoundations(state, mode)
 *   - isWon(state)
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-6xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { s: '♠', red: false, name: 'spade' },
  { s: '♥', red: true,  name: 'heart' },
  { s: '♦', red: true,  name: 'diamond' },
  { s: '♣', red: false, name: 'club' }
];

export function newDeck(mode) {
  const deck = [];
  if (mode === '1-suit') {
    for (let d = 0; d < 8; d++) {
      for (const r of RANKS) deck.push({ r, v: RANKS.indexOf(r) + 1, s: '♠', red: false, up: false });
    }
  } else {
    for (let d = 0; d < 2; d++) {
      for (const suit of SUITS) {
        for (const r of RANKS) deck.push({ r, v: RANKS.indexOf(r) + 1, s: suit.s, red: suit.red, up: false });
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function dealInitial(mode) {
  const deck = newDeck(mode);
  const tableau = Array.from({ length: 10 }, () => []);
  // 4 columns of 6 face-down, 6 columns of 5 face-down, then 1 face-up on each
  for (let c = 0; c < 10; c++) {
    const count = c < 4 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const card = deck.pop();
      card.up = false;
      tableau[c].push(card);
    }
    const top = tableau[c].pop();
    top.up = true;
    tableau[c].push(top);
  }
  return { tableau, stock: deck, foundations: Array.from({ length: 8 }, () => []) };
}

/** Longest movable run at the bottom of `column`. */
export function movableRun(column) {
  if (!column.length) return [];
  const out = [];
  for (let i = column.length - 1; i >= 0; i--) {
    const card = column[i];
    if (!card.up) break; // can't include face-down cards
    if (out.length === 0) {
      out.push(card);
    } else {
      const above = out[out.length - 1];
      if (card.v === above.v + 1) out.push(card);
      else break;
    }
  }
  return out.reverse();
}

/** Can `card` legally stack on `onTop`? In 1-suit, any suit; in 4-suit, same suit. */
export function canStack(card, onTop, mode) {
  if (!onTop) return true; // empty column
  if (!onTop.up) return false;
  if (mode === '1-suit') return onTop.v === card.v + 1;
  return onTop.s === card.s && onTop.v === card.v + 1;
}

/** Apply a move to a state. Returns a new state.
 *  move: { fromCol, count, toCol }  — move `count` cards from `fromCol` to `toCol`
 *  If count is 0, deal a stock row.
 */
export function applyMove(state, move, mode) {
  const tableau = state.tableau.map(col => col.slice());
  const stock = state.stock.slice();
  const foundations = state.foundations.map(f => f.slice());

  if (move.deal) {
    // Deal 10 cards face-up, one to each of the first 10 columns
    for (let c = 0; c < 10; c++) {
      if (stock.length === 0) break;
      const card = stock.pop();
      card.up = true;
      tableau[c].push(card);
    }
    return { tableau, stock, foundations };
  }

  const from = tableau[move.fromCol];
  if (!from || move.count <= 0 || move.count > from.length) return state;
  // Check the run is movable
  const run = from.slice(from.length - move.count);
  for (let i = 1; i < run.length; i++) {
    if (!run[i].up || run[i].v !== run[i - 1].v + 1) return state;
    if (mode === '4-suit' && run[i].s !== run[i - 1].s) return state;
  }
  const first = run[0];
  const target = tableau[move.toCol];
  const onTop = target.length ? target[target.length - 1] : null;
  if (!canStack(first, onTop, mode)) return state;
  // Apply
  from.length = from.length - move.count;
  for (const c of run) target.push(c);
  // Flip new top of source if face-down
  if (from.length && !from[from.length - 1].up) from[from.length - 1].up = true;
  return { tableau, stock, foundations };
}

/** Check each column for a complete K→A run and auto-move to a foundation. */
export function checkAutoFoundations(state, mode) {
  let s = {
    tableau: state.tableau.map(c => c.slice()),
    stock: state.stock.slice(),
    foundations: state.foundations.map(f => f.slice())
  };
  let moved = false;
  for (let c = 0; c < s.tableau.length; c++) {
    const col = s.tableau[c];
    if (col.length < 13) continue;
    // Check the bottom 13 cards are a complete K→A run, all same suit in 4-suit mode
    const run = col.slice(col.length - 13);
    // run[0] is the deepest (oldest dealt, K), run[12] is the top (most recent, A).
    let ok = run[0].v === 13; // K at the bottom of the run
    for (let i = 1; i < run.length; i++) {
      if (run[i].v !== run[i - 1].v - 1) { ok = false; break; }
      if (mode === '4-suit' && run[i].s !== run[i - 1].s) { ok = false; break; }
    }
    if (!ok) continue;
    // Find an empty foundation slot
    const slot = s.foundations.findIndex(f => f.length === 0);
    if (slot < 0) continue;
    s.foundations[slot] = run;
    col.length = col.length - 13;
    moved = true;
    if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }
  return { state: s, moved };
}

export function isWon(state) {
  return state.foundations.every(f => f.length === 13) && state.foundations.length > 0;
}

/** Has any move been made? Empty move state for "no progress possible" detection. */
export function noMovesLeft(state, mode) {
  // Generate every legal move and bail if any.
  for (let from = 0; from < 10; from++) {
    const col = state.tableau[from];
    if (!col.length) continue;
    const run = movableRun(col);
    for (let count = 1; count <= run.length; count++) {
      for (let to = 0; to < 10; to++) {
        if (to === from) continue;
        const m = { fromCol: from, count, toCol: to };
        const next = applyMove(state, m, mode);
        if (next !== state) return false;
      }
    }
  }
  return state.stock.length === 0;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderSpiderSolitaire(container, onClose) {
  start();

  function start() {
    let mode = '1-suit';        // '1-suit' | '4-suit'
    let state = dealInitial(mode);
    let sel = null;             // { fromCol, count } or null
    let moves = 0;
    let over = false;

    function rerenderAndCheck() {
      const r = checkAutoFoundations(state, mode);
      state = r.state;
      if (isWon(state) && !over) {
        over = true;
        setTimeout(() => {
          showResult({
            container, title: 'SPIDER CLEARED',
            message: `All 8 runs collected in ${moves} moves. ${mode === '1-suit' ? 'Try 4-suit if that felt easy.' : 'You earned the badge.'}`,
            gameId: 'spider-solitaire', score: Math.max(100, 1000 - moves * 3),
            tone: 'win',
            onRestart: () => start(), onClose
          });
        }, 350);
        return;
      }
      if (noMovesLeft(state, mode) && !over) {
        over = true;
        setTimeout(() => {
          showResult({
            container, title: 'NO MOVES',
            message: 'No legal moves remain and the stock is empty. New deal.',
            gameId: 'spider-solitaire', score: 100,
            tone: 'over',
            onRestart: () => start(), onClose
          });
        }, 350);
      }
    }

    function onCard(fromCol, idx) {
      if (over) return;
      const col = state.tableau[fromCol];
      if (!col.length) return;
      const run = movableRun(col);
      // idx is the visual position; the run must START at col.length - run.length
      const runStart = col.length - run.length;
      if (idx < runStart) return; // not part of the movable run
      const count = col.length - idx;

      if (sel) {
        if (sel.fromCol === fromCol) { sel = null; soundFx.playClick(); return render(); }
        const m = { fromCol: sel.fromCol, count: sel.count, toCol: fromCol };
        const next = applyMove(state, m, mode);
        if (next === state) {
          soundFx.playHit();
          sel = null;
          return render();
        }
        state = next;
        moves++;
        sel = null;
        soundFx.playClick();
        render();
        rerenderAndCheck();
        return;
      }
      sel = { fromCol, count };
      soundFx.playClick();
      render();
    }

    function onEmptyCol(toCol) {
      if (over || !sel) return;
      const m = { fromCol: sel.fromCol, count: sel.count, toCol };
      const next = applyMove(state, m, mode);
      if (next === state) { soundFx.playHit(); return; }
      state = next;
      moves++;
      sel = null;
      soundFx.playClick();
      render();
      rerenderAndCheck();
    }

    function onStock() {
      if (over || sel) return;
      if (state.stock.length === 0) return;
      const next = applyMove(state, { deal: true }, mode);
      state = next;
      moves++;
      soundFx.playCoin();
      render();
      rerenderAndCheck();
    }

    function onMode() {
      mode = mode === '1-suit' ? '4-suit' : '1-suit';
      state = dealInitial(mode);
      sel = null;
      moves = 0;
      over = false;
      render();
    }

    function render() {
      const cols = state.tableau.map((col, ci) => {
        const cards = col.map((c, i) => {
          const isLast = i === col.length - 1;
          const offset = isLast ? 'mb-2' : 'mb-[-58px]';
          const face = c.up;
          const red = c.red ? 'text-red-400' : 'text-zinc-100';
          const back = face ? `bg-zinc-900 border-amber-500/40 ${red}` : 'bg-amber-700 border-amber-700';
          return `<button data-card="${ci},${i}" aria-label="${c.r}${c.s}${face ? '' : ' face down'}"
            class="${back} ${offset} w-12 sm:w-16 h-16 sm:h-20 border-2 flex flex-col items-center justify-center font-black text-sm sm:text-lg select-none">
            ${face ? `${c.r}<span class="text-base sm:text-xl ${red}">${c.s}</span>` : '<span class="text-amber-900">◆</span>'}
          </button>`;
        }).join('');
        const emptyClick = col.length === 0
          ? `<button data-empty="${ci}" class="w-12 sm:w-16 h-16 sm:h-20 border-2 border-dashed border-amber-500/30 flex items-center justify-center text-amber-500/40 text-xs">+</button>`
          : '';
        const isSelCol = sel && sel.fromCol === ci;
        const ring = isSelCol ? 'ring-2 ring-amber-400' : '';
        return `<div data-col="${ci}" class="${ring} flex flex-col items-center gap-0 mr-2 last:mr-0 min-w-[3rem] sm:min-w-[4rem]">${cards}${emptyClick}</div>`;
      }).join('');

      const stockLabel = state.stock.length === 0
        ? '<span class="text-amber-500/40 text-xs">EMPTY</span>'
        : `<span class="text-amber-400 text-xs font-bold">${state.stock.length}</span>`;
      const stockBtn = state.stock.length === 0
        ? `<div class="w-12 sm:w-16 h-16 sm:h-20 border-2 border-amber-500/30 bg-zinc-900/30 flex items-center justify-center text-amber-500/30 text-xs">EMPTY</div>`
        : `<button data-stock class="w-12 sm:w-16 h-16 sm:h-20 border-2 border-amber-700 bg-amber-700 flex items-center justify-center text-amber-900 font-black">${stockLabel}</button>`;

      const foundations = state.foundations.map((f, i) => {
        const top = f[f.length - 1];
        if (!top) {
          return `<div data-found="${i}" class="w-12 sm:w-16 h-16 sm:h-20 border-2 border-amber-500/30 bg-zinc-900/30 flex items-center justify-center text-amber-500/30 text-xs">F${i + 1}</div>`;
        }
        const red = top.red ? 'text-red-400' : 'text-zinc-100';
        return `<div class="w-12 sm:h-16 sm:h-20 border-2 border-green-500/60 bg-zinc-900 flex flex-col items-center justify-center text-green-400 font-black text-lg">
          ${top.r}<span class="${red}">${top.s}</span>
        </div>`;
      }).join('');

      container.innerHTML = `
        <div class="${FRAME}">
          <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
            <div>
              <h2 class="text-xl font-black text-amber-400 tracking-wider">SPIDER SOLITAIRE</h2>
              <p class="text-[10px] text-amber-500/80 uppercase">${mode} · 10 columns · 5 deals · 8 foundations</p>
            </div>
            ${closeButton()}
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
            <span>MODE<br><button data-mode class="px-2 py-0.5 border border-amber-500 text-amber-400">${mode === '1-suit' ? '1-SUIT' : '4-SUIT'}</button></span>
            <span>MOVES<br><b class="text-amber-400 text-base">${moves}</b></span>
            <span>STOCK<br><b class="text-amber-400 text-base">${state.stock.length}</b></span>
          </div>
          <div class="flex flex-wrap gap-2 mb-4 items-center">
            <div class="mr-4">${stockBtn}</div>
            <div class="flex gap-1">${foundations}</div>
          </div>
          <div class="overflow-x-auto pb-4">
            <div class="flex flex-nowrap items-start pl-0">${cols}</div>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-zinc-400 text-center">
            Tap a face-up card to select a run, then tap a destination column. Empty columns accept anything. A complete K→A run auto-moves to a foundation. Click the stock to deal another row.
          </p>
        </div>`;

      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelector('[data-mode]').onclick = onMode;
      const stockEl = container.querySelector('[data-stock]');
      if (stockEl) stockEl.onclick = onStock;
      container.querySelectorAll('[data-card]').forEach(btn => {
        const [ci, idx] = btn.dataset.card.split(',').map(Number);
        btn.onclick = () => onCard(ci, idx);
      });
      container.querySelectorAll('[data-empty]').forEach(btn => {
        const ci = Number(btn.dataset.empty);
        btn.onclick = () => onEmptyCol(ci);
      });
    }

    render();
  }
}
