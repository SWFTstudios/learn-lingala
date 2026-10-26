-- Email verification, password reset, newsletter and reminders, Pro plan, SMS.
-- Idempotent (also run by the Worker). New tables rather than ALTERs so the
-- statements can safely run on every cold start.

-- Account status: email verification and plan ('free' or 'pro').
CREATE TABLE IF NOT EXISTS account_status (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_verified_at INTEGER,
  plan TEXT NOT NULL DEFAULT 'free'
);

-- One-time links sent by email (verify address, reset password). Only the hash is stored.
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_tokens_user ON email_tokens(user_id);

-- Newsletter and reminder preferences. *_next_at are the next send times (UTC ms),
-- recomputed from the learner's local time and time zone.
CREATE TABLE IF NOT EXISTS notify_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  wotd_email INTEGER NOT NULL DEFAULT 0,
  wotd_next_at INTEGER,
  news_email INTEGER NOT NULL DEFAULT 0,
  pro_waitlist INTEGER NOT NULL DEFAULT 0,
  remind_channel TEXT NOT NULL DEFAULT 'off',
  remind_time TEXT NOT NULL DEFAULT '19:00',
  remind_skip_done INTEGER NOT NULL DEFAULT 1,
  remind_next_at INTEGER,
  phone TEXT,
  phone_verified_at INTEGER,
  unsub_token TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notify_wotd_next ON notify_prefs(wotd_next_at);
CREATE INDEX IF NOT EXISTS notify_remind_next ON notify_prefs(remind_next_at);

-- Phone verification codes (hashed), and how many texts each learner was sent today.
CREATE TABLE IF NOT EXISTS phone_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sms_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (user_id, day)
);
