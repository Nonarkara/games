/**
 * Shareable cartridge URLs. Opening a game writes ?game=<id>; loading that
 * URL opens it; the browser Back button returns to the floor.
 */

const GAME_ID_RE = /^[a-z0-9-]{1,64}$/;

export function gameQuery(gameId) {
  return `?game=${encodeURIComponent(gameId)}`;
}

export function gameIdFromSearch(search) {
  const id = new URLSearchParams(search.startsWith('?') ? search : `?${search}`).get('game');
  return id && GAME_ID_RE.test(id) ? id : null;
}
