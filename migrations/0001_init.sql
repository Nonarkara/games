-- migrations/0001_init.sql
-- NGS leaderboard schema. Two tables:
--   sessions: one-time tokens issued at submit time, expire in 5 minutes,
--             marked used after a successful score insert.
--   scores:   the top-5 leaderboard per game. UNIQUE(session_id) prevents
--             a single session from writing two scores.
--
-- The server also enforces per-game max scores (in functions/api/leaderboard.js)
-- and rate limits the session endpoint (1 per IP per 2s).

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  game_id    TEXT NOT NULL,
  issued_at  INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_game ON sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS scores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id     TEXT NOT NULL,
  initials    TEXT NOT NULL,
  score       INTEGER NOT NULL,
  date        TEXT NOT NULL,
  session_id  TEXT NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game_id, score DESC);

-- Hashed client key + last-seen timestamp. session.js and leaderboard.js
-- share this table. Raw IPs are never stored.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash     TEXT PRIMARY KEY,
  last_seen_at INTEGER NOT NULL
);
