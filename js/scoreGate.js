/**
 * Score / board contract shared by the client and the Pages Functions.
 *
 * Conservation: a board row is initials + integer score + ISO date.
 * Anything else is dropped before it is stored or painted.
 */

export const SESSION_ID_RE = /^[a-f0-9]{64}$/;
export const INITIALS_RE = /^[A-Z0-9]{1,4}$/;
export const BOARD_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const GAME_ID_MAX = 64;

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export function isSessionId(value) {
  return SESSION_ID_RE.test(String(value || ''));
}

export function normalizeInitials(value) {
  return String(value || '').toUpperCase();
}

export function scoreInRange(score, max) {
  return Number.isSafeInteger(score) && score >= 0 && Number.isFinite(max) && score <= max;
}

export function sanitizeBoard(board) {
  if (!Array.isArray(board)) return [];
  const rows = [];
  for (const row of board) {
    if (rows.length >= 5) break;
    if (!row || typeof row !== 'object') continue;
    const i = normalizeInitials(row.i);
    if (!INITIALS_RE.test(i)) continue;
    const s = Number(row.s);
    if (!Number.isSafeInteger(s) || s < 0) continue;
    const d = String(row.d || '');
    if (!BOARD_DATE_RE.test(d)) continue;
    rows.push({ i, s, d });
  }
  return rows;
}
