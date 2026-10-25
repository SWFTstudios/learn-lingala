// Learn Lingala API Worker. Static files in public/ are served by Workers
// Static Assets; only /api/* requests reach this code (see wrangler.jsonc).

import schemaSql from '../migrations/0001_init.sql';
import { HttpError, json, readJson, checkOrigin, clientIp, getCookie, rateLimit } from './http.js';
import { hashPassword, verifyPassword, burnPasswordCheck, newSessionToken, sha256Hex } from './crypto.js';

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
    `SELECT u.id, u.email, u.display_name, u.daily_goal, u.password_hash, s.token_hash
       FROM sessions s JOIN users u ON u.id = s.user_id
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
  return { id: u.id, email: u.email, displayName: u.display_name, dailyGoal: u.daily_goal };
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
    daily_goal: 20,
  };
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, display_name, daily_goal, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(user.id, email, await hashPassword(password), user.display_name, user.daily_goal, Date.now())
    .run();

  return json({ user: publicUser(user) }, 201, { 'Set-Cookie': await startSession(env, url, user.id) });
}

async function login(request, env, url) {
  const ip = clientIp(request);
  await rateLimit(env.AUTH_LIMITER, `auth:${ip}`);
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  await verifyTurnstile(env, body.turnstileToken, ip);

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
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
  if (cards.length > 1000 || events.length > 1000) throw new HttpError(413, 'Too many items in one sync.');

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
  if (writes.length) await env.DB.batch(writes);

  const [cardRows, dayRows] = await env.DB.batch([
    env.DB.prepare(
      'SELECT card_id, due, interval, ease, reps, lapses, last_review, updated_at FROM cards WHERE user_id = ?',
    ).bind(user.id),
    env.DB.prepare(
      'SELECT day, SUM(xp) AS xp FROM xp_events WHERE user_id = ? GROUP BY day ORDER BY day DESC LIMIT 400',
    ).bind(user.id),
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
      return json({ turnstileSiteKey: env.TURNSTILE_SECRET_KEY ? env.TURNSTILE_SITE_KEY || null : null });
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
};
