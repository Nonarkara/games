-- Optional identity and cross-device progress. Google tokens are deliberately
-- not stored: the OAuth exchange establishes identity, then NGS issues its own
-- hashed, revocable session token.

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  google_sub   TEXT NOT NULL UNIQUE,
  email        TEXT,
  display_name TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash   TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS oauth_states (
  state_hash   TEXT PRIMARY KEY,
  verifier     TEXT NOT NULL,
  nonce        TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

CREATE TABLE IF NOT EXISTS user_snapshots (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  revision     INTEGER NOT NULL DEFAULT 0,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_play_events (
  event_id     TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id      TEXT NOT NULL,
  category     TEXT NOT NULL,
  score        INTEGER NOT NULL,
  duration_ms  INTEGER NOT NULL,
  played_at    INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_play_events_user_time ON user_play_events(user_id, played_at DESC);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_hash     TEXT PRIMARY KEY,
  last_seen_at INTEGER NOT NULL
);
