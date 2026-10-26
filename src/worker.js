// Learn Lingala API Worker. Static files in public/ are served by Workers
// Static Assets; only /api/* requests reach this code (see wrangler.jsonc).

import initSql from '../migrations/0001_init.sql';
import chatSql from '../migrations/0002_chat.sql';
import settingsSql from '../migrations/0003_settings.sql';
import studySql from '../migrations/0004_study.sql';
import notifySql from '../migrations/0005_notify.sql';
import { HttpError, json, readJson, checkOrigin, clientIp, getCookie, rateLimit } from './http.js';
import { hashPassword, verifyPassword, burnPasswordCheck, newSessionToken, sha256Hex } from './crypto.js';
import { chatTurn } from './chat.js';
import { translate } from './translate.js';
import { memoryHook } from './hook.js';
import { ITEM_BY_ID } from '../public/app/js/course.js';
import { emailEnabled, sendEmail, appUrl, verifyEmail, resetEmail } from './mail.js';
import { smsEnabled } from './sms.js';
import { getPrefs, updatePrefs, startPhone, verifyPhone, removePhone, unsubscribe, runScheduled } from './notify.js';

const schemaSql = `${initSql}\n${chatSql}\n${settingsSql}\n${studySql}\n${notifySql}`;
const BASE_LANGS = ['en', 'fr'];

const SESSION_COOKIE = 'll_session';
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

// --- Schema bootstrap ---------------------------------------------------------

let schemaReady;
function ensureSchema(db) {
  schemaReady ??= db
    .batch(
      schemaSql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => db.prepare(s)),
    )
    .catch((err) => {
      schemaReady = undefined;
      throw err;
    });
  return schemaReady;
}

// --- Sessions -----------------------------------------------------------------

function sessionCookie(url, token, maxAgeSeconds) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

async function startSession(env, url, userId) {
  const token = newSessionToken();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * DAY_MS)
    .run();
  return sessionCookie(url, token, SESSION_DAYS * 86_400);
}

async function currentUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.daily_goal, u.password_hash, s.token_hash, us.base_lang,
            a.email_verified_at, a.plan
       FROM sessions s JOIN users u ON u.id = s.user_id
       LEFT JOIN user_settings us ON us.user_id = u.id
       LEFT JOIN account_status a ON a.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256Hex(token), Date.now())
    .first();
}

async function requireUser(request, env) {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'Not signed in');
  return user;
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    dailyGoal: u.daily_goal,
    baseLang: u.base_lang || null,
    emailVerified: !!u.email_verified_at,
    plan: u.plan || 'free',
  };
}

const cleanBaseLang = (v) => (BASE_LANGS.includes(v) ? v : null);

function saveBaseLang(env, userId, lang) {
  return env.DB.prepare(
    'INSERT INTO user_settings (user_id, base_lang) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET base_lang = excluded.base_lang',
  )
    .bind(userId, lang)
    .run();
}

// --- Validation ---------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GOALS = [10, 20, 30, 50];

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.');
  return email;
}

function cleanPassword(value) {
  const password = String(value || '');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  if (password.length > 200) throw new HttpError(400, 'Password is too long.');
  return password;
}

function cleanName(value) {
  const name = String(value || '').trim().slice(0, 50);
  return name || null;
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET_KEY) return; // Turnstile is optional; enabled by setting the secret.
  if (!token) throw new HttpError(400, 'Please complete the verification check.');
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET_KEY);
  form.append('response', token);
  form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const outcome = await res.json();
  if (!outcome.success) throw new HttpError(403, 'Verification failed — please try again.');
}

const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Limits match NOTE_MAX / HOOK_MAX in public/app/js/store.js.
function validNote(n) {
  return (
    n &&
    typeof n.id === 'string' &&
    ITEM_BY_ID.has(n.id) &&
    typeof n.text === 'string' && n.text.length <= 1000 &&
    typeof n.hook === 'string' && n.hook.length <= 400 &&
    num(n.updatedAt, 0, 1e14)
  );
}

function validCard(c) {
  return (
    c &&
    typeof c.id === 'string' &&
    /^[a-z0-9-]{1,64}$/.test(c.id) &&
    num(c.due, 0, 1e14) &&
    num(c.interval, 0, 36_500) &&
    num(c.ease, 1, 5) &&
    Number.isInteger(c.reps) && num(c.reps, 0, 100_000) &&
    Number.isInteger(c.lapses) && num(c.lapses, 0, 100_000) &&
    (c.last == null || num(c.last, 0, 1e14)) &&
    num(c.updatedAt, 0, 1e14)
  );
}

function validXpEvent(e) {
  return (
    e &&
    typeof e.id === 'string' &&
    /^[A-Za-z0-9-]{8,64}$/.test(e.id) &&
    typeof e.day === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.day) &&
    Number.isInteger(e.xp) && num(e.xp, 0, 1000)
  );
}

// --- Routes -------------------------------------------------------------------

async function signup(request, env, url) {
  const ip = clientIp(request);
  await rateLimit(env.AUTH_LIMITER, `auth:${ip}`);
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  const password = cleanPassword(body.password);
  await verifyTurnstile(env, body.turnstileToken, ip);

  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first();
  if (exists) throw new HttpError(409, 'An account with that email already exists. Try signing in.');

  const user = {
    id: crypto.randomUUID(),
    email,
    display_name: cleanName(body.displayName),
    daily_goal: GOALS.includes(body.dailyGoal) ? body.dailyGoal : 20,
    base_lang: cleanBaseLang(body.baseLang) || 'en',
  };
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, daily_goal, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(user.id, email, await hashPassword(password), user.display_name, user.daily_goal, Date.now()),
    env.DB.prepare('INSERT INTO user_settings (user_id, base_lang) VALUES (?, ?)').bind(user.id, user.base_lang),
    env.DB.prepare("INSERT INTO account_status (user_id, plan) VALUES (?, 'free')").bind(user.id),
  ]);
  // Best effort: the account works without it, and the profile offers to resend.
  await sendVerification(env, url, user).catch(() => {});

  return json({ user: publicUser(user) }, 201, { 'Set-Cookie': await startSession(env, url, user.id) });
}

async function login(request, env, url) {
  const ip = clientIp(request);
  await rateLimit(env.AUTH_LIMITER, `auth:${ip}`);
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  await verifyTurnstile(env, body.turnstileToken, ip);

  const user = await env.DB.prepare(
    `SELECT u.*, us.base_lang, a.email_verified_at, a.plan FROM users u
       LEFT JOIN user_settings us ON us.user_id = u.id
       LEFT JOIN account_status a ON a.user_id = u.id
      WHERE u.email = ?`,
  )
    .bind(email)
    .first();
  if (!user) {
    await burnPasswordCheck(password);
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  if (!(await verifyPassword(password, user.password_hash))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  // Opportunistic cleanup of this user's expired sessions.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?').bind(user.id, Date.now()).run();

  return json({ user: publicUser(user) }, 200, { 'Set-Cookie': await startSession(env, url, user.id) });
}

// --- Email verification and password reset ----------------------------------------

const TOKEN_TTL = { verify: 7 * DAY_MS, reset: 60 * 60_000 };

async function issueEmailToken(env, userId, purpose) {
  const token = newSessionToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?').bind(userId, purpose),
    env.DB.prepare('INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)').bind(
      await sha256Hex(token),
      userId,
      purpose,
      Date.now() + TOKEN_TTL[purpose],
    ),
  ]);
  return token;
}

// Single use: the token is deleted whether or not it has expired.
async function takeEmailToken(env, token, purpose) {
  if (!token || token.length > 200) return null;
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare('SELECT user_id, expires_at FROM email_tokens WHERE token_hash = ? AND purpose = ?').bind(hash, purpose).first();
  if (!row) return null;
  await env.DB.prepare('DELETE FROM email_tokens WHERE token_hash = ?').bind(hash).run();
  return row.expires_at > Date.now() ? row.user_id : null;
}

const markVerified = (env, userId) =>
  env.DB.prepare(
    `INSERT INTO account_status (user_id, email_verified_at) VALUES (?, ?)
     ON CONFLICT (user_id) DO UPDATE SET email_verified_at = COALESCE(account_status.email_verified_at, excluded.email_verified_at)`,
  )
    .bind(userId, Date.now())
    .run();

async function sendVerification(env, url, user) {
  if (!emailEnabled(env)) return false;
  const token = await issueEmailToken(env, user.id, 'verify');
  const mail = verifyEmail(user.base_lang, `${appUrl(env, url)}/api/email/verify?token=${token}`);
  await sendEmail(env, { to: user.email, ...mail });
  return true;
}

// Link from the email: confirm, then open the profile.
async function confirmEmail(env, url) {
  const userId = await takeEmailToken(env, url.searchParams.get('token'), 'verify');
  if (userId) await markVerified(env, userId);
  return Response.redirect(`${url.origin}/app/#/account/${userId ? 'verified' : 'verify-failed'}`, 302);
}

async function resendVerification(request, env, url) {
  const user = await requireUser(request, env);
  await rateLimit(env.AUTH_LIMITER, `verify:${user.id}`);
  if (user.email_verified_at) return json({ ok: true, alreadyVerified: true });
  if (!emailEnabled(env)) throw new HttpError(503, 'email-off');
  await sendVerification(env, url, user);
  return json({ ok: true });
}

// Always answers the same way, so it can't be used to find out who has an account.
async function forgotPassword(request, env, url) {
  await rateLimit(env.AUTH_LIMITER, `auth:${clientIp(request)}`);
  if (!emailEnabled(env)) throw new HttpError(503, 'email-off');
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  const user = await env.DB.prepare(
    'SELECT u.id, u.email, us.base_lang FROM users u LEFT JOIN user_settings us ON us.user_id = u.id WHERE u.email = ?',
  )
    .bind(email)
    .first();
  if (user) {
    const token = await issueEmailToken(env, user.id, 'reset');
    // The token travels in the URL fragment, so it never reaches server logs.
    await sendEmail(env, { to: user.email, ...resetEmail(user.base_lang, `${appUrl(env, url)}/app/#/reset/${token}`) }).catch(() => {});
  }
  return json({ ok: true });
}

async function resetPassword(request, env, url) {
  await rateLimit(env.AUTH_LIMITER, `auth:${clientIp(request)}`);
  const body = await readJson(request);
  const password = cleanPassword(body.password);
  const userId = await takeEmailToken(env, String(body.token || ''), 'reset');
  if (!userId) throw new HttpError(400, 'reset-expired');
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId), // sign out everywhere else
  ]);
  await markVerified(env, userId); // they proved they can read this inbox
  const user = await env.DB.prepare(
    `SELECT u.*, us.base_lang, a.email_verified_at, a.plan FROM users u
       LEFT JOIN user_settings us ON us.user_id = u.id
       LEFT JOIN account_status a ON a.user_id = u.id
      WHERE u.id = ?`,
  )
    .bind(userId)
    .first();
  return json({ user: publicUser(user) }, 200, { 'Set-Cookie': await startSession(env, url, userId) });
}

async function logout(request, env, url) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(url, '', 0) });
}

async function updateMe(request, env) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  if (body.dailyGoal !== undefined) {
    if (!GOALS.includes(body.dailyGoal)) throw new HttpError(400, 'Invalid daily goal.');
    user.daily_goal = body.dailyGoal;
  }
  if (body.displayName !== undefined) user.display_name = cleanName(body.displayName);
  await env.DB.prepare('UPDATE users SET daily_goal = ?, display_name = ? WHERE id = ?')
    .bind(user.daily_goal, user.display_name, user.id)
    .run();
  if (body.baseLang !== undefined) {
    user.base_lang = cleanBaseLang(body.baseLang);
    if (!user.base_lang) throw new HttpError(400, 'Unsupported language.');
    await saveBaseLang(env, user.id, user.base_lang);
  }
  return json({ user: publicUser(user) });
}

async function deleteMe(request, env, url) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  if (!(await verifyPassword(String(body.password || ''), user.password_hash))) {
    throw new HttpError(401, 'Password is incorrect.');
  }
  // Explicit deletes rather than relying on foreign-key cascades.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM cards WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM xp_events WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM chat_usage WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM translate_usage WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM item_notes WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM email_tokens WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM notify_prefs WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM phone_codes WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sms_usage WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM account_status WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM hook_usage WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM user_settings WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(url, '', 0) });
}

// Two-way progress sync. The client sends cards it changed and XP events it
// has not yet uploaded; the newest version of each card wins. The response is
// the full server state, which the client adopts.
async function sync(request, env) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  const cards = Array.isArray(body.cards) ? body.cards : [];
  const events = Array.isArray(body.xpEvents) ? body.xpEvents : [];
  const notes = Array.isArray(body.notes) ? body.notes : [];
  if (cards.length > 1000 || events.length > 1000 || notes.length > 1000) throw new HttpError(413, 'Too many items in one sync.');

  const maxUpdated = Date.now() + DAY_MS; // tolerate clock skew, reject far-future stamps
  const writes = [];
  for (const c of cards) {
    if (!validCard(c) || c.updatedAt > maxUpdated) continue;
    writes.push(
      env.DB.prepare(
        `INSERT INTO cards (user_id, card_id, due, interval, ease, reps, lapses, last_review, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, card_id) DO UPDATE SET
           due = excluded.due, interval = excluded.interval, ease = excluded.ease,
           reps = excluded.reps, lapses = excluded.lapses, last_review = excluded.last_review,
           updated_at = excluded.updated_at
         WHERE excluded.updated_at > cards.updated_at`,
      ).bind(user.id, c.id, c.due, c.interval, c.ease, c.reps, c.lapses, c.last ?? null, c.updatedAt),
    );
  }
  const now = Date.now();
  for (const e of events) {
    if (!validXpEvent(e)) continue;
    writes.push(
      env.DB.prepare('INSERT OR IGNORE INTO xp_events (id, user_id, day, xp, created_at) VALUES (?, ?, ?, ?, ?)').bind(
        e.id,
        user.id,
        e.day,
        e.xp,
        now,
      ),
    );
  }
  for (const n of notes) {
    if (!validNote(n) || n.updatedAt > maxUpdated) continue;
    writes.push(
      env.DB.prepare(
        `INSERT INTO item_notes (user_id, item_id, text, hook, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, item_id) DO UPDATE SET text = excluded.text, hook = excluded.hook, updated_at = excluded.updated_at
         WHERE excluded.updated_at > item_notes.updated_at`,
      ).bind(user.id, n.id, n.text, n.hook, n.updatedAt),
    );
  }
  if (writes.length) await env.DB.batch(writes);

  const [cardRows, dayRows, noteRows] = await env.DB.batch([
    env.DB.prepare(
      'SELECT card_id, due, interval, ease, reps, lapses, last_review, updated_at FROM cards WHERE user_id = ?',
    ).bind(user.id),
    env.DB.prepare(
      'SELECT day, SUM(xp) AS xp FROM xp_events WHERE user_id = ? GROUP BY day ORDER BY day DESC LIMIT 400',
    ).bind(user.id),
    env.DB.prepare('SELECT item_id, text, hook, updated_at FROM item_notes WHERE user_id = ?').bind(user.id),
  ]);

  return json({
    cards: cardRows.results.map((r) => ({
      id: r.card_id,
      due: r.due,
      interval: r.interval,
      ease: r.ease,
      reps: r.reps,
      lapses: r.lapses,
      last: r.last_review,
      updatedAt: r.updated_at,
    })),
    days: dayRows.results.map((r) => ({ day: r.day, xp: r.xp })),
    acceptedEventIds: events.filter(validXpEvent).map((e) => e.id),
    notes: noteRows.results.map((r) => ({ id: r.item_id, text: r.text, hook: r.hook, updatedAt: r.updated_at })),
  });
}

async function handleApi(request, env, url) {
  if (!env.DB) throw new HttpError(503, 'Database is not configured.');
  if (request.method !== 'GET' && request.method !== 'HEAD') checkOrigin(request, url);
  await rateLimit(env.API_LIMITER, `api:${clientIp(request)}`);
  await ensureSchema(env.DB);

  const route = `${request.method} ${url.pathname}`;
  switch (route) {
    case 'GET /api/config':
      return json({
        turnstileSiteKey: env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY || null : null,
        chatEnabled: !!env.ANTHROPIC_API_KEY,
        aiEnabled: !!env.ANTHROPIC_API_KEY,
        emailEnabled: emailEnabled(env),
        smsEnabled: smsEnabled(env),
        // Ad banner: Google AdSense when both are set, otherwise the app shows its own promos.
        ads: env.ADSENSE_CLIENT && env.ADSENSE_SLOT ? { client: env.ADSENSE_CLIENT, slot: env.ADSENSE_SLOT } : null,
      });
    case 'GET /api/email/verify':
      return confirmEmail(env, url);
    case 'POST /api/email/resend':
      return resendVerification(request, env, url);
    case 'GET /api/email/unsubscribe':
    case 'POST /api/email/unsubscribe':
      return unsubscribe(request, env, url);
    case 'POST /api/auth/forgot':
      return forgotPassword(request, env, url);
    case 'POST /api/auth/reset':
      return resetPassword(request, env, url);
    case 'GET /api/notify':
      return json(await getPrefs(env, await requireUser(request, env)));
    case 'PATCH /api/notify':
      return json(await updatePrefs(env, await requireUser(request, env), await readJson(request, 4 * 1024)));
    case 'POST /api/phone/start': {
      const user = await requireUser(request, env);
      await rateLimit(env.AUTH_LIMITER, `phone:${user.id}`);
      return json(await startPhone(env, user, await readJson(request, 4 * 1024)));
    }
    case 'POST /api/phone/verify': {
      const user = await requireUser(request, env);
      await rateLimit(env.AUTH_LIMITER, `phone:${user.id}`);
      return json(await verifyPhone(env, user, await readJson(request, 4 * 1024)));
    }
    case 'POST /api/phone/remove':
      return json(await removePhone(env, await requireUser(request, env)));
    case 'POST /api/chat': {
      const user = await requireUser(request, env);
      await rateLimit(env.CHAT_LIMITER, `chat:${user.id}`);
      return json(await chatTurn(env, user, await readJson(request, 64 * 1024)));
    }
    case 'POST /api/translate': {
      const user = await requireUser(request, env);
      await rateLimit(env.TRANSLATE_LIMITER, `translate:${user.id}`);
      return json(await translate(env, user, await readJson(request, 8 * 1024)));
    }
    case 'POST /api/hook': {
      const user = await requireUser(request, env);
      await rateLimit(env.TRANSLATE_LIMITER, `hook:${user.id}`);
      return json(await memoryHook(env, user, await readJson(request, 4 * 1024)));
    }
    case 'POST /api/auth/signup':
      return signup(request, env, url);
    case 'POST /api/auth/login':
      return login(request, env, url);
    case 'POST /api/auth/logout':
      return logout(request, env, url);
    case 'GET /api/me': {
      const user = await currentUser(request, env);
      return json({ user: user ? publicUser(user) : null });
    }
    case 'PATCH /api/me':
      return updateMe(request, env);
    case 'DELETE /api/me':
      return deleteMe(request, env, url);
    case 'POST /api/sync':
      return sync(request, env);
    default:
      throw new HttpError(404, 'Not found');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env, url);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Something went wrong on our side. Please try again.' }, 500);
    }
  },

  // Cron Trigger (every 15 minutes, see wrangler.jsonc): word-of-the-day emails and lesson reminders.
  async scheduled(controller, env, ctx) {
    if (!env.DB) return;
    ctx.waitUntil(ensureSchema(env.DB).then(() => runScheduled(env, controller.scheduledTime || Date.now())));
  },
};
