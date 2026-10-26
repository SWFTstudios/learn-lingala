-- Study cards: the learner's own notes and memory hooks per phrase, and the
-- daily quota for AI memory hooks. Idempotent (also run by the Worker).

CREATE TABLE IF NOT EXISTS item_notes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  text TEXT NOT NULL,
  hook TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS hook_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
