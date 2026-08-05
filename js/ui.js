/**
 * OmniArcade - Shared UI Toolkit (Axiom Core Edition)
 * Provides: scoped keyboard handling w/ guaranteed cleanup,
 *           in-modal Result Overlay (replaces alert()),
 *           modal UX helpers (ESC, backdrop, reduced-motion).
 */
import { soundFx } from './audio.js';
import { StorageService } from './storage.js';

/* ---------------------------------------------------------------------------
 * ScopedKeyboard — key listeners that NEVER leak across games.
 * Each game registers handlers; on close we remove the bound listener.
 * Usage:
 *   const kb = new ScopedKeyboard();
 *   kb.on({ ArrowLeft: () => move(-1), ' ': () => drop() });
 *   kb.destroy(); // on close
 * ------------------------------------------------------------------------- */
export class ScopedKeyboard {
  constructor() {
    this._map = new Map();
    this._active = true;
    this._bound = (e) => this._handle(e);
    window.addEventListener('keydown', this._bound);
  }

  on(handlers) {
    for (const [key, fn] of Object.entries(handlers)) {
      this._map.set(key, fn);
    }
    return this;
  }

  _handle(e) {
    if (!this._active) return;
    const fn = this._map.get(e.key);
    if (fn) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      fn(e);
    }
  }

  destroy() {
    this._active = false;
    if (this._bound) {
      window.removeEventListener('keydown', this._bound);
      this._bound = null;
    }
    this._map.clear();
  }
}

/* ---------------------------------------------------------------------------
 * runGameLoop — setInterval wrapper that pauses when the tab is hidden.
 * Returns a stop() fn.
 * ------------------------------------------------------------------------- */
export function runGameLoop(fn, fps = 40) {
  let id = setInterval(fn, 1000 / fps);
  const onVis = () => {
    clearInterval(id);
    if (!document.hidden) id = setInterval(fn, 1000 / fps);
  };
  document.addEventListener('visibilitychange', onVis);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVis);
  };
}

/* ---------------------------------------------------------------------------
 * showResult — the polished, honest replacement for alert().
 * Renders inside the game container (non-blocking), with:
 *   - title, message, final score
 *   - "NEW HIGH SCORE" badge when isNewHigh
 *   - Play Again (onRestart) + Close (onClose)
 *   - Enter/Escape handling, focus management
 * ------------------------------------------------------------------------- */
export function showResult({
  container,
  title = 'GAME OVER',
  message = '',
  score = null,
  gameId = null,
  onRestart = null,
  onClose = null,
  tone = 'over' // 'over' | 'win'
}) {
  let isNewHigh = false;
  if (gameId !== null && score !== null) {
    const res = StorageService.updateHighScore(gameId, score);
    isNewHigh = res.isNewHigh;
  }

  soundFx.play(tone === 'win' ? 'playWin' : 'playGameOver');

  const overlay = document.createElement('div');
  overlay.className = 'axiom-result-overlay';
  overlay.innerHTML = `
    <div class="axiom-result-card axiom-result-${tone}" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div class="axiom-result-glyph">${tone === 'win' ? '★' : '✕'}</div>
      <h3 id="result-title" class="axiom-result-title">${title}</h3>
      ${message ? `<p class="axiom-result-msg">${message}</p>` : ''}
      ${score !== null ? `
        <div class="axiom-result-score">
          <span class="axiom-result-score-label">FINAL SCORE</span>
          <span class="axiom-result-score-value">${score}</span>
        </div>` : ''}
      ${isNewHigh ? `<div class="axiom-result-high">▲ NEW HIGH SCORE</div>` : ''}
      <div class="axiom-result-actions">
        ${onRestart ? `<button class="axiom-btn axiom-btn-primary" id="result-restart">▶ PLAY AGAIN</button>` : ''}
        <button class="axiom-btn axiom-btn-ghost" id="result-close">✕ CLOSE</button>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  const close = () => {
    overlay.remove();
    if (onClose) onClose();
  };
  const restart = () => {
    overlay.remove();
    if (onRestart) onRestart();
  };

  const restartBtn = overlay.querySelector('#result-restart');
  const closeBtn = overlay.querySelector('#result-close');
  if (restartBtn) restartBtn.onclick = restart;
  if (closeBtn) closeBtn.onclick = close;

  const primary = restartBtn || closeBtn;
  if (primary) setTimeout(() => primary.focus(), 30);

  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      window.removeEventListener('keydown', onKey);
      if (restartBtn) restart(); else close();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.removeEventListener('keydown', onKey);
      close();
    }
  };
  window.addEventListener('keydown', onKey);
}

/* ---------------------------------------------------------------------------
 * bindModalUX — backdrop click + ESC to close, scroll lock while open.
 * Returns a release() fn to detach listeners.
 * ------------------------------------------------------------------------- */
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