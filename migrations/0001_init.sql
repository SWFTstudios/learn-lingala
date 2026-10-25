-- Learn Lingala schema. Every statement is idempotent: the Worker also runs
-- this file on cold start, so a fresh database works without a manual migration.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  daily_goal INTEGER NOT NULL DEFAULT 20,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One row per (user, flashcard): the spaced-repetition state.
CREATE TABLE IF NOT EXISTS cards (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  due INTEGER NOT NULL,
  interval REAL NOT NULL,
  ease REAL NOT NULL,
  reps INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  last_review INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, card_id)
);

-- XP is recorded as idempotent events so retries and multiple devices never double count.
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS xp_events_user_day ON xp_events(user_id, day);
