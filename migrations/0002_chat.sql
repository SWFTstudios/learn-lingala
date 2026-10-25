-- Daily chat message counts, for the per-user cost cap. Idempotent (also run by the Worker).

CREATE TABLE IF NOT EXISTS chat_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
