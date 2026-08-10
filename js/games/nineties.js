/**
 * Dr Non — Non-Gaming System Labs — Blow Into The Cartridge
 * ------------------------------------------------------------------
 * Host mode. One screen, everyone shouts, score on paper.
 *
 * There is deliberately no in-app scoring, no player names, no turn
 * order. The app runs the deck; the humans run the game. That is the
 * whole design — anything else puts a phone between people who are
 * already in the same room.
 *
 * Drive it with one key: SPACE reveals, SPACE again moves on.
 * Questions live in nineties-questions.js. This file is just the flow.
 * ------------------------------------------------------------------
 */
import { decks } from './nineties-questions.js';
import { soundFx } from '../audio.js';
import { ScopedKeyboard, showResult } from '../ui.js';

const $ = (sel, root = document) => root.querySelector(sel);

// ponytail: local Fisher-Yates. Six lines beats coupling this file to
// labsGames.js, which shares nothing else with it.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TIMER_STEPS = [10, 20, 0]; // seconds; 0 = manual reveal only
const TOTAL = decks.reduce((n, d) => n + d.questions.length, 0);

export function renderBlowIntoTheCartridge(container, onClose) {
  const state = {
    timerIdx: 0,        // index into TIMER_STEPS
    asked: new Set(),   // question ids used this session — survives deck switches
    deck: null,         // active deck, or null on the picker
    queue: [],          // shuffled, unasked questions for the active selection
    current: null,
    played: 0,
    revealed: false,
    autoId: null        // pending auto-reveal timeout
  };

  // One keyboard for the whole game. Handlers read live state, so screens
  // don't each register their own listener.
  const kb = new ScopedKeyboard();
  kb.on({
    ' ': () => { if (state.deck) state.revealed ? next() : reveal(); },
    'n': () => { if (state.deck) next(); },
    'N': () => { if (state.deck) next(); },
    '0': () => start('mixed'),
    ...Object.fromEntries(decks.map((d, i) => [String(i + 1), () => start(d.id)]))
  });

  const secs = () => TIMER_STEPS[state.timerIdx];

  function clearAuto() {
    if (state.autoId) { clearTimeout(state.autoId); state.autoId = null; }
  }

  /* ---------------------------------------------------------------- picker */
  function renderPicker() {
    state.deck = null;
    clearAuto();
    const left = TOTAL - state.asked.size;
    container.innerHTML = `
      <div class="labs-modal labs-modal--host">
        <div class="labs-head">
          <button id="host-close" class="axiom-close-btn">✕ CLOSE</button>
          <div class="labs-eyebrow">🧪 LABS · HOST MODE</div>
          <h2 class="labs-title">Blow Into The Cartridge</h2>
          <p class="labs-sub">One screen. Everyone shouts. Score on paper. Pick a deck, or take the lot on shuffle — nothing repeats until it runs dry.</p>
        </div>

        <div class="labs-grid">
          ${decks.map((d, i) => {
            const done = d.questions.filter(q => state.asked.has(q.id)).length;
            return `
            <button class="labs-card labs-card--${d.color}" data-deck="${d.id}">
              <span class="labs-card-icon">${d.icon}</span>
              <span class="labs-card-title">${d.title}</span>
              <span class="labs-card-sub">${d.blurb}</span>
              <span class="labs-card-meta">${i + 1} · ${d.questions.length - done} left of ${d.questions.length}</span>
            </button>`;
          }).join('')}
          <button class="labs-card labs-card--mixed" data-deck="mixed">
            <span class="labs-card-icon">🎲</span>
            <span class="labs-card-title">Everything, shuffled</span>
            <span class="labs-card-sub">All six decks in one run. This is the all-night setting.</span>
            <span class="labs-card-meta">0 · ${left} left of ${TOTAL}</span>
          </button>
        </div>

        <div class="host-settings">
          <button class="host-timer-btn" id="host-timer">
            ⏱ ${secs() ? `${secs()}s per question` : 'No timer — reveal manually'}
          </button>
          ${state.asked.size ? `<button class="labs-back" id="host-reset">↺ reset the ${state.asked.size} already asked</button>` : ''}
        </div>

        <div class="labs-foot">
          <span class="labs-lock">🔒 PERSONAL · NOT ON THE PUBLIC GRID</span>
          <span class="labs-foot-meta">${TOTAL} questions · press 1-6 or 0</span>
        </div>
      </div>`;

    $('#host-close', container).onclick = onClose;
    $('#host-timer', container).onclick = () => {
      soundFx.playClick();
      state.timerIdx = (state.timerIdx + 1) % TIMER_STEPS.length;
      renderPicker();
    };
    const reset = $('#host-reset', container);
    if (reset) reset.onclick = () => { soundFx.playClick(); state.asked.clear(); state.played = 0; renderPicker(); };
    container.querySelectorAll('[data-deck]').forEach(btn => {
      btn.onclick = () => start(btn.dataset.deck);
    });
  }

  /* ----------------------------------------------------------------- round */
  function start(deckId) {
    soundFx.playClick();
    const chosen = deckId === 'mixed'
      ? { id: 'mixed', title: 'Everything', icon: '🎲', color: 'c-labs' }
      : decks.find(d => d.id === deckId);
    if (!chosen) return;

    const pool = (deckId === 'mixed' ? decks : [decks.find(d => d.id === deckId)])
      .flatMap(d => d.questions.map(q => ({ ...q, from: d.title })));

    state.deck = chosen;
    state.queue = shuffle(pool.filter(q => !state.asked.has(q.id)));
    if (!state.queue.length) return exhausted();
    next();
  }

  function next() {
    clearAuto();
    if (!state.queue.length) return exhausted();
    state.current = state.queue.shift();
    state.asked.add(state.current.id);
    state.played++;
    state.revealed = false;
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.current;
    const t = secs();
    container.innerHTML = `
      <div class="labs-modal labs-modal--host labs-modal--quiz">
        <div class="labs-head">
          <button id="host-close" class="axiom-close-btn">✕ CLOSE</button>
          <div class="host-meta">
            <span class="labs-eyebrow">${state.deck.icon} ${(q.from || state.deck.title).toUpperCase()}</span>
            <span class="host-count">Q ${state.played}</span>
          </div>
          <div class="host-timer-track"><div class="host-timer-fill" id="host-fill"></div></div>
        </div>

        <div class="host-question">${q.q}</div>

        <div class="labs-options host-options">
          ${q.options.map((opt, i) => `
            <div class="labs-option host-option" data-idx="${i}">
              <span class="labs-option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="labs-option-text">${opt}</span>
            </div>`).join('')}
        </div>

        <div class="host-fact" id="host-fact" hidden></div>

        <div class="labs-foot">
          <button class="labs-back" id="host-hub">← decks</button>
          <span class="labs-foot-meta" id="host-hint">${t ? 'Tap or SPACE to reveal early' : 'Tap or SPACE to reveal'}</span>
        </div>
      </div>`;

    $('#host-close', container).onclick = onClose;
    $('#host-hub', container).onclick = () => { soundFx.playClick(); renderPicker(); };

    // The whole card advances the game — this is a table, not a form.
    $('.labs-modal', container).onclick = (e) => {
      if (e.target.closest('#host-close, #host-hub')) return;
      state.revealed ? next() : reveal();
    };

    if (t) {
      const fill = $('#host-fill', container);
      fill.style.width = '100%';
      void fill.offsetWidth;                       // force reflow so the transition runs
      fill.style.transition = `width ${t}s linear`;
      fill.style.width = '0%';
      state.autoId = setTimeout(reveal, t * 1000);
    }
  }

  function reveal() {
    if (state.revealed) return;
    state.revealed = true;
    clearAuto();
    soundFx.playCoin();

    const fill = $('#host-fill', container);
    if (fill) { fill.style.transition = 'none'; fill.style.width = '0%'; }

    container.querySelectorAll('.host-option').forEach((el, i) => {
      if (i === state.current.correct) el.classList.add('is-correct');
      else el.classList.add('is-dimmed');
    });

    const fact = $('#host-fact', container);
    fact.textContent = state.current.fact;
    fact.hidden = false;

    const hint = $('#host-hint', container);
    if (hint) hint.textContent = state.queue.length
      ? `Tap or SPACE for the next one · ${state.queue.length} left`
      : 'Last one in this deck';
  }

  function exhausted() {
    clearAuto();
    const where = state.deck ? state.deck.title : 'the deck';
    showResult({
      container,
      title: 'Deck run dry',
      message: `${state.played} questions played from ${where}. Reshuffle to go again, or pick another deck.`,
      score: null,   // there is no score here — the paper has it
      tone: 'win',
      onRestart: () => {
        if (state.deck) state.deck.id === 'mixed'
          ? decks.forEach(d => d.questions.forEach(q => state.asked.delete(q.id)))
          : decks.find(d => d.id === state.deck.id)?.questions.forEach(q => state.asked.delete(q.id));
        state.played = 0;
        renderPicker();
      },
      onClose
    });
  }

  renderPicker();
  return () => kb.destroy();
}
