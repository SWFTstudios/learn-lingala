-- Learner preferences and translation quota. Idempotent (also run by the Worker).

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  base_lang TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS translate_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
