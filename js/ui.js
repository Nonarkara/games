/**
 * OmniArcade - Shared UI Toolkit (Storybook Edition)
 * GameSession: the architectural fix for ALL games.
 *   - Wraps setInterval/setTimeout/requestAnimationFrame/addEventListener
 *   - One teardown() kills every stray timer, listener, and animation frame
 *   - Games don't need to change — they just work.
 */
import { soundFx } from './audio.js';
import { StorageService } from './storage.js';

export class ScopedKeyboard {
  constructor() {
    this._map = new Map();
    this._active = true;
    this._bound = (e) => this._handle(e);
    window.addEventListener('keydown', this._bound);
    this._session = GameSession.active;
    if (this._session) this._session._track('keydown', this._bound);
  }
  on(handlers) { for (const [k, fn] of Object.entries(handlers)) this._map.set(k, fn); return this; }
  _handle(e) {
    if (!this._active) return;
    const fn = this._map.get(e.key);
    if (fn) { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault(); fn(e); }
  }
  destroy() {
    this._active = false;
    if (this._bound) { window.removeEventListener('keydown', this._bound); this._bound = null; }
    this._map.clear();
  }
}

export function runGameLoop(fn, fps = 40) {
  let id = setInterval(fn, 1000 / fps);
  const onVis = () => { clearInterval(id); if (!document.hidden) id = setInterval(fn, 1000 / fps); };
  document.addEventListener('visibilitychange', onVis);
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
}

/* ===========================================================================
 * GameSession — activate around game.renderer(); teardown kills everything.
 * Works for ALL games without editing them.
 * ========================================================================== */
export class GameSession {
  constructor() {
    this._timers = new Set();      // setInterval IDs
    this._timeouts = new Set();    // setTimeout IDs
    this._rafIds = new Set();      // requestAnimationFrame IDs
    this._listeners = [];          // {type, fn, el}
    this._orig = {};
    GameSession.active = this;
    this._install();
  }
  _install() {
    const s = this;
    this._orig.setInterval = window.setInterval;
    this._orig.setTimeout = window.setTimeout;
    this._orig.clearInterval = window.clearInterval;
    this._orig.clearTimeout = window.clearTimeout;
    this._orig.raf = window.requestAnimationFrame;
    this._orig.craf = window.cancelAnimationFrame;
    this._orig.ael = window.addEventListener;

    window.setInterval = function(...a) { const id = s._orig.setInterval.apply(window, a); s._timers.add(id); return id; };
    window.setTimeout = function(...a) { const id = s._orig.setTimeout.apply(window, a); s._timeouts.add(id); return id; };
    // .call(window, …) is required — native timer functions throw
    // "Illegal invocation" when called unbound from module (strict) code.
    window.clearInterval = function(id) { s._timers.delete(id); s._orig.clearInterval.call(window, id); };
    window.clearTimeout = function(id) { s._timeouts.delete(id); s._orig.clearTimeout.call(window, id); };
    window.requestAnimationFrame = function(cb) { const id = s._orig.raf.call(window, cb); s._rafIds.add(id); return id; };
    window.cancelAnimationFrame = function(id) { s._rafIds.delete(id); s._orig.craf.call(window, id); };
    window.addEventListener = function(type, fn, opts) {
      s._listeners.push({ type, fn, el: window, opts });
      s._orig.ael.call(window, type, fn, opts);
    };
  }
  _track(type, fn) { this._listeners.push({ type, fn, el: window }); }

  teardown() {
    this._timers.forEach(id => this._orig.clearInterval.call(window, id));
    this._timeouts.forEach(id => this._orig.clearTimeout.call(window, id));
    this._rafIds.forEach(id => this._orig.craf.call(window, id));
    this._listeners.forEach(({ type, fn, el }) => el.removeEventListener(type, fn));
    this._timers.clear(); this._timeouts.clear(); this._rafIds.clear(); this._listeners = [];
    // Restore originals so the rest of the app works normally.
    window.setInterval = this._orig.setInterval;
    window.setTimeout = this._orig.setTimeout;
    window.clearInterval = this._orig.clearInterval;
    window.clearTimeout = this._orig.clearTimeout;
    window.requestAnimationFrame = this._orig.raf;
    window.cancelAnimationFrame = this._orig.craf;
    window.addEventListener = this._orig.ael;
    GameSession.active = null;
  }
}
GameSession.active = null;

/* ===========================================================================
 * showResult — polished result overlay (Play Again / Close).
 * Now triggers session teardown BEFORE restart so no timers leak.
 * ========================================================================== */
export function showResult({ container, title = 'GAME OVER', message = '', score = null, gameId = null, onRestart = null, onClose = null, tone = 'over' }) {
  // Auto-record the score into the active session (set up by app.js#launchGame)
  // so analytics tracks the final number, not just the duration.
  if (score !== null && typeof container?._recordScore === 'function') {
    try { container._recordScore(score); } catch (e) { /* hook is optional */ }
  }

  let isNewHigh = false;
  if (gameId !== null && score !== null) {
    const res = StorageService.updateHighScore(gameId, score);
    isNewHigh = res.isNewHigh;
  }
  // soundFx has no generic play(name) dispatcher — call the method directly.
  soundFx[tone === 'win' ? 'playWin' : 'playGameOver']();

  const qualifies = gameId !== null && score !== null && StorageService.qualifiesForBoard(gameId, score);

  const boardHtml = () => {
    const board = gameId !== null ? StorageService.getLeaderboard(gameId) : [];
    if (!board.length) return '';
    return `
      <div class="axiom-board">
        <div class="axiom-board-title">TOP 5</div>
        ${board.map((e, n) => `
          <div class="axiom-board-row">
            <span class="axiom-board-rank">${n + 1}</span>
            <span class="axiom-board-initials">${e.i}</span>
            <span class="axiom-board-date">${e.d}</span>
            <span class="axiom-board-score">${e.s}</span>
          </div>`).join('')}
      </div>`;
  };

  const overlay = document.createElement('div');
  overlay.className = 'axiom-result-overlay';
  overlay.innerHTML = `
    <div class="axiom-result-card axiom-result-${tone}" role="dialog" aria-modal="true">
      <div class="axiom-result-glyph">${tone === 'win' ? '★' : '✓'}</div>
      <h3 class="axiom-result-title">${title}</h3>
      ${message ? `<p class="axiom-result-msg">${message}</p>` : ''}
      ${score !== null ? `<div class="axiom-result-score"><span class="axiom-result-score-label">FINAL SCORE</span><span class="axiom-result-score-value">${score}</span></div>` : ''}
      ${isNewHigh ? `<div class="axiom-result-high">▲ NEW HIGH SCORE</div>` : ''}
      ${qualifies ? `
        <form class="axiom-initials" id="initials-form">
          <label class="axiom-initials-label" for="initials-input">YOU MADE THE BOARD — SIGN IT</label>
          <div class="axiom-initials-row">
            <input id="initials-input" class="axiom-initials-input" maxlength="5" autocomplete="off"
                   spellcheck="false" placeholder="AAAAA" value="${StorageService.getLastInitials()}" />
            <button type="submit" class="axiom-btn axiom-btn-primary axiom-initials-submit">SIGN</button>
          </div>
        </form>` : ''}
      <div id="result-board">${qualifies ? '' : boardHtml()}</div>
      <div class="axiom-result-actions">
        ${onRestart ? `<button class="axiom-btn axiom-btn-primary" id="result-restart">▶ PLAY AGAIN</button>` : ''}
        <button class="axiom-btn axiom-btn-ghost" id="result-close">✕ CLOSE</button>
      </div>
    </div>`;
  container.appendChild(overlay);

  const form = overlay.querySelector('#initials-form');
  if (form) {
    const input = overlay.querySelector('#initials-input');
    input.oninput = () => { input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    form.onsubmit = (e) => {
      e.preventDefault();
      StorageService.submitScore(gameId, input.value, score);
      soundFx.playCoin();
      form.remove();
      overlay.querySelector('#result-board').innerHTML = boardHtml();
    };
  }

  const close = () => { overlay.remove(); if (onClose) onClose(); };
  const restart = () => { overlay.remove(); if (onRestart) onRestart(); };

  const rBtn = overlay.querySelector('#result-restart');
  const cBtn = overlay.querySelector('#result-close');
  if (rBtn) rBtn.onclick = restart;
  if (cBtn) cBtn.onclick = close;
  const primary = overlay.querySelector('#initials-input') || rBtn || cBtn;
  if (primary) setTimeout(() => primary.focus(), 30);
}

/* ===========================================================================
 * bindModalUX — backdrop + ESC close.
 * ========================================================================== */
export function bindModalUX(overlayEl, onClose) {
  let closed = false;
  const safeClose = () => { if (!closed) { closed = true; onClose(); } };
  const onBackdrop = (e) => { if (e.target === overlayEl) safeClose(); };
  const onKey = (e) => { if (e.key === 'Escape') safeClose(); };
  overlayEl.addEventListener('click', onBackdrop);
  window.addEventListener('keydown', onKey);
  document.body.classList.add('axiom-modal-open');
  return function release() {
    overlayEl.removeEventListener('click', onBackdrop);
    window.removeEventListener('keydown', onKey);
    document.body.classList.remove('axiom-modal-open');
  };
}