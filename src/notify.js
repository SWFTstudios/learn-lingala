// Newsletter and reminder preferences, phone verification for text reminders
// (Pro), unsubscribe links, and the scheduled job that sends what's due.

import { HttpError } from './http.js';
import { sha256Hex } from './crypto.js';
import { takeDailyQuota } from './claude.js';
import { emailEnabled, sendEmail, appUrl, wotdEmail, reminderEmail, unsubHeaders, htmlPage, mt } from './mail.js';
import { smsEnabled, sendSms, cleanPhone } from './sms.js';
import { nextOccurrence, localDate, validTimeZone, validClock } from './time.js';
import { wordOfTheDay } from '../public/app/js/wotd.js';

const WOTD_TIME = '08:00';
const CHANNELS = ['off', 'email', 'sms'];
const CODE_TTL = 10 * 60_000;
const MAX_CODE_ATTEMPTS = 5;
export const DAILY_SMS_CAP = 8; // codes + reminders per learner per day
const BATCH = 100; // sends per job run, per kind

const randomHex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function ensurePrefs(db, userId) {
  await db.prepare('INSERT OR IGNORE INTO notify_prefs (user_id, unsub_token) VALUES (?, ?)').bind(userId, randomHex(16)).run();
  return db.prepare('SELECT * FROM notify_prefs WHERE user_id = ?').bind(userId).first();
}

const maskPhone = (p) => (p ? `••• ••• ${p.slice(-4)}` : null);

export async function getPrefs(env, user) {
  const p = await ensurePrefs(env.DB, user.id);
  return {
    emailEnabled: emailEnabled(env),
    smsEnabled: smsEnabled(env),
    emailVerified: !!user.email_verified_at,
    plan: user.plan || 'free',
    timezone: p.timezone,
    wotdEmail: !!p.wotd_email,
    newsEmail: !!p.news_email,
    proWaitlist: !!p.pro_waitlist,
    remindChannel: p.remind_channel,
    remindTime: p.remind_time,
    remindSkipDone: !!p.remind_skip_done,
    phone: maskPhone(p.phone),
    phoneVerified: !!(p.phone && p.phone_verified_at),
  };
}

export async function updatePrefs(env, user, body) {
  const p = await ensurePrefs(env.DB, user.id);
  const next = { ...p };

  if (body.timezone !== undefined) {
    if (!validTimeZone(body.timezone)) throw new HttpError(400, 'Unknown time zone.');
    next.timezone = body.timezone;
  }
  if (body.wotdEmail !== undefined) {
    if (body.wotdEmail && !emailEnabled(env)) throw new HttpError(503, 'email-off');
    next.wotd_email = body.wotdEmail ? 1 : 0;
  }
  if (body.newsEmail !== undefined) next.news_email = body.newsEmail ? 1 : 0;
  if (body.proWaitlist !== undefined) next.pro_waitlist = body.proWaitlist ? 1 : 0;
  if (body.remindTime !== undefined) {
    if (!validClock(body.remindTime)) throw new HttpError(400, 'Pick a time on the quarter hour.');
    next.remind_time = body.remindTime;
  }
  if (body.remindSkipDone !== undefined) next.remind_skip_done = body.remindSkipDone ? 1 : 0;
  if (body.remindChannel !== undefined) {
    if (!CHANNELS.includes(body.remindChannel)) throw new HttpError(400, 'Unknown reminder channel.');
    if (body.remindChannel === 'email' && !emailEnabled(env)) throw new HttpError(503, 'email-off');
    if (body.remindChannel === 'sms') {
      if (user.plan !== 'pro') throw new HttpError(403, 'pro-only');
      if (!smsEnabled(env)) throw new HttpError(503, 'sms-off');
      if (!p.phone_verified_at) throw new HttpError(409, 'phone-unverified');
    }
    next.remind_channel = body.remindChannel;
  }

  const now = Date.now();
  next.wotd_next_at = next.wotd_email ? nextOccurrence(WOTD_TIME, next.timezone, now) : null;
  next.remind_next_at = next.remind_channel !== 'off' ? nextOccurrence(next.remind_time, next.timezone, now) : null;

  await env.DB.prepare(
    `UPDATE notify_prefs SET timezone = ?, wotd_email = ?, wotd_next_at = ?, news_email = ?, pro_waitlist = ?,
       remind_channel = ?, remind_time = ?, remind_skip_done = ?, remind_next_at = ? WHERE user_id = ?`,
  )
    .bind(next.timezone, next.wotd_email, next.wotd_next_at, next.news_email, next.pro_waitlist,
      next.remind_channel, next.remind_time, next.remind_skip_done, next.remind_next_at, user.id)
    .run();
  return getPrefs(env, user);
}

// --- Phone verification (Pro) ---------------------------------------------------------

const codeHash = (userId, code) => sha256Hex(`${userId}:${code}`);

export async function startPhone(env, user, body) {
  if (user.plan !== 'pro') throw new HttpError(403, 'pro-only');
  if (!smsEnabled(env)) throw new HttpError(503, 'sms-off');
  const phone = cleanPhone(body.phone);
  await takeDailyQuota(env.DB, 'sms_usage', user.id, DAILY_SMS_CAP, 'sms-quota');
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  await env.DB.prepare(
    `INSERT INTO phone_codes (user_id, phone, code_hash, expires_at, attempts) VALUES (?, ?, ?, ?, 0)
     ON CONFLICT (user_id) DO UPDATE SET phone = excluded.phone, code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
  )
    .bind(user.id, phone, await codeHash(user.id, code), Date.now() + CODE_TTL)
    .run();
  await sendSms(env, phone, mt(user.base_lang, 'smsCode', { code }));
  return { ok: true };
}

export async function verifyPhone(env, user, body) {
  const row = await env.DB.prepare('SELECT * FROM phone_codes WHERE user_id = ?').bind(user.id).first();
  if (!row || row.expires_at < Date.now() || row.attempts >= MAX_CODE_ATTEMPTS) throw new HttpError(400, 'code-expired');
  if ((await codeHash(user.id, String(body.code || '').trim())) !== row.code_hash) {
    await env.DB.prepare('UPDATE phone_codes SET attempts = attempts + 1 WHERE user_id = ?').bind(user.id).run();
    throw new HttpError(400, 'code-wrong');
  }
  await ensurePrefs(env.DB, user.id);
  await env.DB.batch([
    env.DB.prepare('UPDATE notify_prefs SET phone = ?, phone_verified_at = ? WHERE user_id = ?').bind(row.phone, Date.now(), user.id),
    env.DB.prepare('DELETE FROM phone_codes WHERE user_id = ?').bind(user.id),
  ]);
  return getPrefs(env, user);
}

export async function removePhone(env, user) {
  await ensurePrefs(env.DB, user.id);
  await env.DB.prepare(
    `UPDATE notify_prefs SET phone = NULL, phone_verified_at = NULL,
       remind_channel = CASE remind_channel WHEN 'sms' THEN 'off' ELSE remind_channel END,
       remind_next_at = CASE remind_channel WHEN 'sms' THEN NULL ELSE remind_next_at END
     WHERE user_id = ?`,
  )
    .bind(user.id)
    .run();
  return getPrefs(env, user);
}

// --- Unsubscribe links ------------------------------------------------------------------

const LISTS = ['wotd', 'remind', 'news', 'all'];
export const unsubLink = (base, userId, token, list) =>
  `${base}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}&list=${list}`;

const UNSUB_TEXT = {
  en: {
    title: 'Unsubscribe', ask: { wotd: 'Stop the Lingala word-of-the-day emails?', remind: 'Stop lesson reminder emails?', news: 'Stop product news emails?', all: 'Stop all Learn Lingala emails?' },
    btn: 'Unsubscribe', done: 'You’re unsubscribed.', doneSub: 'You can turn emails back on any time in your profile.', bad: 'This link is not valid any more.', open: 'Open Learn Lingala',
  },
  fr: {
    title: 'Se désabonner', ask: { wotd: 'Arrêter les e-mails « mot du jour » ?', remind: 'Arrêter les rappels de leçon par e-mail ?', news: 'Arrêter les actualités par e-mail ?', all: 'Arrêter tous les e-mails Learn Lingala ?' },
    btn: 'Me désabonner', done: 'Vous êtes désabonné(e).', doneSub: 'Vous pouvez réactiver les e-mails à tout moment dans votre profil.', bad: 'Ce lien n’est plus valable.', open: 'Ouvrir Learn Lingala',
  },
};

export async function unsubscribe(request, env, url) {
  const userId = url.searchParams.get('u') || '';
  const token = url.searchParams.get('t') || '';
  const list = LISTS.includes(url.searchParams.get('list')) ? url.searchParams.get('list') : 'all';
  const row = await env.DB.prepare(
    'SELECT np.unsub_token, us.base_lang FROM notify_prefs np LEFT JOIN user_settings us ON us.user_id = np.user_id WHERE np.user_id = ?',
  )
    .bind(userId)
    .first();
  const lang = row?.base_lang === 'fr' ? 'fr' : 'en';
  const T = UNSUB_TEXT[lang];
  const base = appUrl(env, url);
  const p = (s, style = '') => `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;${style}">${s}</p>`;
  if (!row || !token || row.unsub_token !== token) {
    return htmlPage({ lang, title: T.title, body: p(T.bad) });
  }
  if (request.method !== 'POST') {
    // A page with a button (not an instant unsubscribe), so link scanners can't unsubscribe people.
    return htmlPage({
      lang,
      title: T.title,
      body: `<h1 style="margin:0 0 12px;font-size:22px">${T.title}</h1>${p(T.ask[list])}
        <form method="post"><button style="background:#0a8458;color:#fff;border:0;border-radius:999px;padding:12px 20px;font-size:16px;font-weight:700">${T.btn}</button></form>`,
    });
  }
  const sets = {
    wotd: 'wotd_email = 0, wotd_next_at = NULL',
    remind: "remind_channel = CASE remind_channel WHEN 'email' THEN 'off' ELSE remind_channel END, remind_next_at = CASE remind_channel WHEN 'email' THEN NULL ELSE remind_next_at END",
    news: 'news_email = 0',
    all: "wotd_email = 0, wotd_next_at = NULL, news_email = 0, remind_channel = CASE remind_channel WHEN 'email' THEN 'off' ELSE remind_channel END, remind_next_at = CASE remind_channel WHEN 'email' THEN NULL ELSE remind_next_at END",
  };
  await env.DB.prepare(`UPDATE notify_prefs SET ${sets[list]} WHERE user_id = ?`).bind(userId).run();
  return htmlPage({
    lang,
    title: T.done,
    body: `<h1 style="margin:0 0 12px;font-size:22px">${T.done}</h1>${p(T.doneSub, 'color:#2f3c35')}<p style="margin:0"><a href="${base}/app/#/account" style="color:#0a8458;font-weight:700">${T.open}</a></p>`,
  });
}

// --- Scheduled sends -------------------------------------------------------------------------

async function streakAndPractice(db, userId, today) {
  const rows = await db.prepare('SELECT day FROM xp_events WHERE user_id = ? AND xp > 0 GROUP BY day ORDER BY day DESC LIMIT 400').bind(userId).all();
  const days = new Set(rows.results.map((r) => r.day));
  let streak = 0;
  const d = new Date(`${today}T00:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1); // today not done yet: count up to yesterday
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return { streak, practisedToday: days.has(today) };
}

async function dueCount(db, userId, now) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM cards WHERE user_id = ? AND due <= ? AND reps + lapses > 0').bind(userId, now).first();
  return row?.n ?? 0;
}

export async function runScheduled(env, now = Date.now()) {
  const base = appUrl(env);
  const stats = { wotd: 0, email: 0, sms: 0, skipped: 0, failed: 0 };
  if (!base) {
    console.error('APP_URL is not set: scheduled emails and texts are paused');
    return stats;
  }

  // Word of the day (email only, verified addresses).
  if (emailEnabled(env)) {
    const due = await env.DB.prepare(
      `SELECT np.user_id, np.timezone, np.unsub_token, u.email, us.base_lang
         FROM notify_prefs np JOIN users u ON u.id = np.user_id
         JOIN account_status a ON a.user_id = np.user_id AND a.email_verified_at IS NOT NULL
         LEFT JOIN user_settings us ON us.user_id = np.user_id
        WHERE np.wotd_email = 1 AND np.wotd_next_at <= ? LIMIT ?`,
    )
      .bind(now, BATCH)
      .all();
    for (const r of due.results) {
      const lang = r.base_lang === 'fr' ? 'fr' : 'en';
      const unsubUrl = unsubLink(base, r.user_id, r.unsub_token, 'wotd');
      try {
        const mail = wotdEmail(lang, wordOfTheDay(localDate(r.timezone, now)), { base, unsubUrl });
        await sendEmail(env, { to: r.email, ...mail, headers: unsubHeaders(unsubUrl) });
        stats.wotd++;
      } catch {
        stats.failed++;
      }
      await env.DB.prepare('UPDATE notify_prefs SET wotd_next_at = ? WHERE user_id = ?')
        .bind(nextOccurrence(WOTD_TIME, r.timezone, now + 60_000), r.user_id)
        .run();
    }
  }

  // Lesson reminders (email, or text for Pro).
  const reminders = await env.DB.prepare(
    `SELECT np.*, u.email, us.base_lang, a.email_verified_at, a.plan
       FROM notify_prefs np JOIN users u ON u.id = np.user_id
       LEFT JOIN account_status a ON a.user_id = np.user_id
       LEFT JOIN user_settings us ON us.user_id = np.user_id
      WHERE np.remind_channel != 'off' AND np.remind_next_at <= ? LIMIT ?`,
  )
    .bind(now, BATCH)
    .all();
  for (const r of reminders.results) {
    const lang = r.base_lang === 'fr' ? 'fr' : 'en';
    try {
      const { streak, practisedToday } = await streakAndPractice(env.DB, r.user_id, localDate(r.timezone, now));
      const canSms = r.remind_channel === 'sms' && r.plan === 'pro' && r.phone && r.phone_verified_at && smsEnabled(env);
      const canEmail = r.email_verified_at && emailEnabled(env);
      if (r.remind_skip_done && practisedToday) {
        stats.skipped++;
      } else if (canSms) {
        await takeDailyQuota(env.DB, 'sms_usage', r.user_id, DAILY_SMS_CAP, 'sms-quota');
        const body = mt(lang, 'smsRemind', { streak: streak > 0 ? mt(lang, 'smsStreak', { n: streak }) : '', url: `${base}/app/` });
        await sendSms(env, r.phone, body);
        stats.sms++;
      } else if (canEmail) {
        // Text reminders fall back to email if the learner is no longer on Pro.
        const unsubUrl = unsubLink(base, r.user_id, r.unsub_token, 'remind');
        const mail = reminderEmail(lang, { streak, due: await dueCount(env.DB, r.user_id, now), base, unsubUrl });
        await sendEmail(env, { to: r.email, ...mail, headers: unsubHeaders(unsubUrl) });
        stats.email++;
      } else {
        stats.skipped++;
      }
    } catch {
      stats.failed++;
    }
    await env.DB.prepare('UPDATE notify_prefs SET remind_next_at = ? WHERE user_id = ?')
      .bind(nextOccurrence(r.remind_time, r.timezone, now + 60_000), r.user_id)
      .run();
  }
  if (stats.wotd + stats.email + stats.sms + stats.failed) console.log('Scheduled sends', JSON.stringify(stats));
  return stats;
}
