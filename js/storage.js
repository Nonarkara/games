/**
 * Dr Non — Non-Gaming System · Local Storage & Persistence Service
 *
 * Storage keys:
 *   STORAGE_KEY   — current canonical key (`ngs_data_v1`)
 *   LEGACY_KEY    — pre-rebrand key (`omni_arcade_data_v1`), one-time migrate
 *   MIGRATION_KEY — flag (`ngs_migrated_v2`) so the legacy migration only runs once
 *
 * Initial policy: 4 letters, uppercased, [A-Z0-9]. 5-letter legacy entries
 * get sliced to 4 on migration (no rank reshuffle — order preserved, only
 * the initials string shortens). If the legacy key is missing or malformed,
 * we start clean with `defaultData`.
 *
 * Server: submitScore also fires a fire-and-forget POST to /api/session +
 * /api/leaderboard so the score lands on the global board. localStorage is
 * always the source of truth for the local UI; the server is the durable
 * cross-user record. Failures are silent.
 */

const STORAGE_KEY   = 'ngs_data_v1';
const LEGACY_KEY    = 'omni_arcade_data_v1';
const MIGRATION_KEY = 'ngs_migrated_v2';
const INITIALS_LEN  = 4;

const defaultData = {
  highScores: {
    'cyber-tetris': 0,
    'cyber-pacman': 0,
    'math-safari': 0,
    'memory-match': 0,
    'word-search': 0,
    'cyber-snake': 0,
    'space-defender': 0,
    'neon-breakout': 0,
    'cyber-pong': 0,
    'flappy-bird': 0,
    'tower-stacker': 0,
    'minesweeper': 0,
    '2048-fusion': 0,
    'trivia-master': 0,
    'cyber-blackjack': 1000,
    'stroop-match': 0,
    'simon-seq': 0,
    'anagram-scramble': 0,
    'word-builder': 0,
    'periodic-quest': 0,
    'capital-quiz': 0,
    'number-chain': 0,
    'tower-hanoi': 0,
    'pattern-breaker': 0,
    'reflex-matrix': 0,
    'type-rush': 0,
    'slide-2048': 0,
    'cipher-breaker': 0,
    'ai-sandbox': 0,
    'trail-making': 0,
    'mental-rotation': 0,
    'iowa-gambling': 0,
    'posner-cueing': 0,
    'change-blindness': 0,
    'operation-span': 0,
    'kings-cup': 0,
    'never-have-i': 0,
    'most-likely': 0,
    'chimp-test': 0,
    'calibration': 0,
    'monty-hall': 0,
    'cog-reflection': 0,
    'raven-matrices': 0,
    'sternberg': 0,
    'number-sense': 0,
    'wcst': 0,
    'tower-london': 0,
    'mind-eyes': 0,
    'ride-the-bus': 0,
    'power-hour': 0,
    'buzz-21': 0,
    'truth-or-dare': 0,
    'higher-lower': 0,
    'two-truths': 0
  },
  favorites: [],
  gamesPlayed: 0,
  theme: 'cyber', // 'cyber' | 'retro' | 'light'
  customGames: []
};

/**
 * Run the v1 → v2 migration exactly once.
 * - Reads LEGACY_KEY if present
 * - Slices any 5-letter initials on leaderboard entries to 4
 * - Writes STORAGE_KEY
 * - Removes LEGACY_KEY
 * - Sets MIGRATION_KEY so this never runs again
 *
 * Idempotent + non-throwing. Any error → fresh `defaultData` and the flag
 * still gets set so the user is not stuck retrying.
 */
function migrateLegacyOnce() {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const legacy = JSON.parse(raw);
      // Slice any 5-letter initials on legacy leaderboard entries to 4
      if (legacy && legacy.leaderboards && typeof legacy.leaderboards === 'object') {
        for (const gameId of Object.keys(legacy.leaderboards)) {
          const board = legacy.leaderboards[gameId];
          if (Array.isArray(board)) {
            for (const entry of board) {
              if (entry && typeof entry.i === 'string') {
                entry.i = entry.i.slice(0, INITIALS_LEN);
              }
            }
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch (e) {
    // Corrupt legacy — start clean. Don't throw; the app must keep booting.
    console.warn('[NGS] legacy storage migration skipped:', e?.message || e);
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* noop */ }
  } finally {
    try { localStorage.setItem(MIGRATION_KEY, '1'); } catch { /* noop */ }
  }
}

export class StorageService {
  static getData() {
    try {
      migrateLegacyOnce();
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch (e) {
      console.warn('[NGS] LocalStorage access error:', e);
      return defaultData;
    }
  }

  static saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[NGS] LocalStorage save error:', e);
    }
  }

  static getHighScore(gameId) {
    const data = this.getData();
    return data.highScores[gameId] || 0;
  }

  static updateHighScore(gameId, score) {
    const data = this.getData();
    const currentHigh = data.highScores[gameId] || 0;
    if (score > currentHigh) {
      data.highScores[gameId] = score;
      data.gamesPlayed = (data.gamesPlayed || 0) + 1;
      this.saveData(data);
      return { isNewHigh: true, score };
    }
    data.gamesPlayed = (data.gamesPlayed || 0) + 1;
    this.saveData(data);
    return { isNewHigh: false, score: currentHigh };
  }

  static toggleFavorite(gameId) {
    const data = this.getData();
    const idx = data.favorites.indexOf(gameId);
    if (idx >= 0) {
      data.favorites.splice(idx, 1);
    } else {
      data.favorites.push(gameId);
    }
    this.saveData(data);
    return data.favorites.includes(gameId);
  }

  static isFavorite(gameId) {
    const data = this.getData();
    return data.favorites.includes(gameId);
  }

  static saveCustomGame(customGame) {
    const data = this.getData();
    data.customGames = data.customGames || [];
    data.customGames.unshift(customGame);
    this.saveData(data);
    return data.customGames;
  }

  static getCustomGames() {
    const data = this.getData();
    return data.customGames || [];
  }

  /* -------------------------------------------------------------------------
   * Leaderboards — top 5 per game, 4-letter initials, real persistence.
   * Shape: data.leaderboards[gameId] = [{ i: 'NON', s: 120, d: '2026-08-08' }]
   * ---------------------------------------------------------------------- */
  static getLeaderboard(gameId) {
    const data = this.getData();
    return (data.leaderboards && data.leaderboards[gameId]) || [];
  }

  static qualifiesForBoard(gameId, score) {
    if (!score || score <= 0) return false;
    const board = this.getLeaderboard(gameId);
    return board.length < 5 || score > board[board.length - 1].s;
  }

  static submitScore(gameId, initials, score) {
    const clean = (
      String(initials || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, INITIALS_LEN)
      || 'A'.repeat(INITIALS_LEN)
    );
    const data = this.getData();
    data.leaderboards = data.leaderboards || {};
    const board = data.leaderboards[gameId] || [];
    board.push({ i: clean, s: score, d: new Date().toISOString().slice(0, 10) });
    board.sort((a, b) => b.s - a.s);
    data.leaderboards[gameId] = board.slice(0, 5);
    data.lastInitials = clean;
    this.saveData(data);

    // Fire-and-forget the server-side leaderboard. localStorage is the
    // source of truth for the local UI; the server is the durable cross-user
    // record. Failures are silent (no UI blocking). On success, we cache
    // the server board so getLeaderboard() can prefer it next read.
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      this.submitScoreToServer(gameId, clean, score)
        .then(serverBoard => {
          if (serverBoard && Array.isArray(serverBoard) && serverBoard.length) {
            const d = this.getData();
            d.leaderboards = d.leaderboards || {};
            d.leaderboards[gameId] = serverBoard;
            this.saveData(d);
          }
        })
        .catch(() => { /* offline / rate-limited / 5xx — keep local board */ });
    }

    return data.leaderboards[gameId];
  }

  /**
   * Server-backed submit. Returns the server's top-5 board on success, or
   * null on any failure (offline, 4xx, 5xx, timeout). Never throws.
   * Two round-trips: POST /api/session → POST /api/leaderboard.
   */
  static async submitScoreToServer(gameId, initials, score) {
    if (typeof fetch === 'undefined') return null;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000);
      const sessRes = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ game_id: gameId }),
        signal: ctl.signal
      });
      if (!sessRes.ok) { clearTimeout(timer); return null; }
      const sess = await sessRes.json();
      const scoreRes = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, initials, score, session_id: sess.session_id }),
        signal: ctl.signal
      });
      clearTimeout(timer);
      if (!scoreRes.ok) return null;
      const result = await scoreRes.json();
      return Array.isArray(result.board) ? result.board : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Server-backed read. Returns the server's top-5 board for gameId, or
   * null on any failure. Never throws.
   */
  static async fetchLeaderboardFromServer(gameId) {
    if (typeof fetch === 'undefined') return null;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 5000);
      const res = await fetch(`/api/leaderboard?game_id=${encodeURIComponent(gameId)}`, {
        signal: ctl.signal
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.board) ? data.board : null;
    } catch (e) {
      return null;
    }
  }

  static getLastInitials() {
    return this.getData().lastInitials || '';
  }
}
