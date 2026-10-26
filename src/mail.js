// Email through Cloudflare Email Service (the `send_email` binding named EMAIL),
// plus the app's email templates in English and French.
//
// Email is optional: without the binding and an EMAIL_FROM sender address,
// emailEnabled() is false and the app hides email features.

import { HttpError } from './http.js';
import { breakdown } from '../public/app/js/breakdown.js';
import { setLang, gloss, itemNote, itemTip } from '../public/app/js/i18n.js';

export const emailEnabled = (env) => !!(env.EMAIL && env.EMAIL_FROM);

// Base URL for links in emails (also needed by the scheduled job, which has no request).
export const appUrl = (env, url) => String(env.APP_URL || url?.origin || '').replace(/\/$/, '');

// "Learn Lingala <hello@example.com>" → { name, email }
function sender(value) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  return m ? { name: m[1] || undefined, email: m[2] } : value.trim();
}

export async function sendEmail(env, { to, subject, html, text, headers }) {
  if (!emailEnabled(env)) throw new HttpError(503, 'email-off');
  try {
    return await env.EMAIL.send({ from: sender(env.EMAIL_FROM), to, subject, html, text, ...(headers ? { headers } : {}) });
  } catch (err) {
    console.error('Email send failed', err.code, err.message);
    throw new HttpError(502, 'email-failed');
  }
}

// --- Templates ---------------------------------------------------------------------

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, '');

const M = {
  en: {
    verifySubject: 'Confirm your email for Learn Lingala',
    verifyTitle: 'Confirm your email',
    verifyBody: 'Tap the button to confirm this is your address. It unlocks word-of-the-day emails, lesson reminders and password resets.',
    verifyBtn: 'Confirm my email',
    verifyIgnore: 'If you didn’t create a Learn Lingala account, you can ignore this email.',
    resetSubject: 'Reset your Learn Lingala password',
    resetTitle: 'Reset your password',
    resetBody: 'Someone (hopefully you) asked to reset the password for this account. The link works for one hour.',
    resetBtn: 'Choose a new password',
    resetIgnore: 'If you didn’t ask for this, ignore this email: your password won’t change.',
    wotdSubject: 'Word of the day: {lg}',
    wotdKicker: 'Lingala word of the day',
    wotdBreakdown: 'Word by word',
    wotdTip: 'Local tip',
    wotdBtn: 'Study this card',
    remindSubject: 'Mbote! Time for today’s Lingala',
    remindTitle: 'Five minutes of Lingala?',
    remindStreak: 'You’re on a {n}-day streak. Keep it going!',
    remindStart: 'A short lesson now keeps today’s phrases fresh.',
    remindDue: '{n} phrases are ready for review.',
    remindBtn: 'Start my lesson',
    footerWhy: 'You’re getting this because you turned it on in your Learn Lingala profile.',
    footerManage: 'Manage emails',
    footerUnsub: 'Unsubscribe',
    smsRemind: 'Mbote! Time for 5 minutes of Lingala{streak}: {url}',
    smsStreak: ' ({n}-day streak)',
    smsCode: 'Your Learn Lingala code is {code}. It expires in 10 minutes.',
  },
  fr: {
    verifySubject: 'Confirmez votre adresse e-mail — Learn Lingala',
    verifyTitle: 'Confirmez votre adresse e-mail',
    verifyBody: 'Touchez le bouton pour confirmer qu’il s’agit bien de votre adresse. Cela active le mot du jour, les rappels de leçon et la réinitialisation du mot de passe.',
    verifyBtn: 'Confirmer mon adresse',
    verifyIgnore: 'Si vous n’avez pas créé de compte Learn Lingala, ignorez cet e-mail.',
    resetSubject: 'Réinitialisez votre mot de passe Learn Lingala',
    resetTitle: 'Réinitialiser votre mot de passe',
    resetBody: 'Quelqu’un (vous, on l’espère) a demandé à réinitialiser le mot de passe de ce compte. Le lien est valable une heure.',
    resetBtn: 'Choisir un nouveau mot de passe',
    resetIgnore: 'Si vous n’avez rien demandé, ignorez cet e-mail : votre mot de passe ne changera pas.',
    wotdSubject: 'Mot du jour : {lg}',
    wotdKicker: 'Le mot lingala du jour',
    wotdBreakdown: 'Mot à mot',
    wotdTip: 'Astuce locale',
    wotdBtn: 'Étudier cette carte',
    remindSubject: 'Mbote ! C’est l’heure de votre lingala',
    remindTitle: 'Cinq minutes de lingala ?',
    remindStreak: 'Vous êtes sur une série de {n} jours. Continuez !',
    remindStart: 'Une courte leçon maintenant garde les phrases du jour bien fraîches.',
    remindDue: '{n} phrases sont prêtes à être révisées.',
    remindBtn: 'Commencer ma leçon',
    footerWhy: 'Vous recevez cet e-mail car vous l’avez activé dans votre profil Learn Lingala.',
    footerManage: 'Gérer les e-mails',
    footerUnsub: 'Se désabonner',
    smsRemind: 'Mbote ! C’est l’heure de 5 minutes de lingala{streak} : {url}',
    smsStreak: ' (série de {n} jours)',
    smsCode: 'Votre code Learn Lingala est {code}. Il expire dans 10 minutes.',
  },
};

export const mt = (lang, key, vars = {}) =>
  (M[lang]?.[key] ?? M.en[key]).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const button = (href, label) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#0a8458;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;font-size:16px">${esc(label)}</a>`;

function layout({ lang, title, body, footer = '' }) {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0b1510">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
  <p style="margin:0 0 18px;font-weight:800;font-size:18px;color:#0b1510">Learn <span style="color:#0a8458">Lingala</span></p>
  <div style="background:#ffffff;border:1px solid #e0e6df;border-radius:20px;padding:28px 24px">${body}</div>
  ${footer ? `<p style="font-size:12px;line-height:1.6;color:#64716a;margin:18px 4px 0">${footer}</p>` : ''}
</div></body></html>`;
}

function footerFor(lang, base, unsubUrl) {
  return {
    html: `${esc(mt(lang, 'footerWhy'))}<br><a href="${esc(base)}/app/#/account" style="color:#64716a">${esc(mt(lang, 'footerManage'))}</a> · <a href="${esc(unsubUrl)}" style="color:#64716a">${esc(mt(lang, 'footerUnsub'))}</a>`,
    text: `${mt(lang, 'footerWhy')}\n${mt(lang, 'footerManage')}: ${base}/app/#/account\n${mt(lang, 'footerUnsub')}: ${unsubUrl}`,
  };
}

// Headers that let mail apps show a one-click "Unsubscribe" (required by Gmail and Yahoo).
export const unsubHeaders = (unsubUrl) => ({
  'List-Unsubscribe': `<${unsubUrl}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
});

function actionEmail(lang, { subject, title, body, btn, href, note }) {
  return {
    subject,
    html: layout({
      lang,
      title: subject,
      body: `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">${esc(title)}</h1>
        <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#2f3c35">${esc(body)}</p>
        <p style="margin:0 0 22px">${button(href, btn)}</p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#64716a">${esc(note)}<br><span style="word-break:break-all">${esc(href)}</span></p>`,
    }),
    text: `${title}\n\n${body}\n\n${btn}: ${href}\n\n${note}`,
  };
}

export const verifyEmail = (lang, href) =>
  actionEmail(lang, {
    subject: mt(lang, 'verifySubject'),
    title: mt(lang, 'verifyTitle'),
    body: mt(lang, 'verifyBody'),
    btn: mt(lang, 'verifyBtn'),
    href,
    note: mt(lang, 'verifyIgnore'),
  });

export const resetEmail = (lang, href) =>
  actionEmail(lang, {
    subject: mt(lang, 'resetSubject'),
    title: mt(lang, 'resetTitle'),
    body: mt(lang, 'resetBody'),
    btn: mt(lang, 'resetBtn'),
    href,
    note: mt(lang, 'resetIgnore'),
  });

export function wotdEmail(lang, item, { base, unsubUrl }) {
  setLang(lang); // localized meaning, notes and breakdown below
  const meaning = gloss(item);
  const note = strip(itemNote(item));
  const tip = strip(itemTip(item));
  const { words } = breakdown(item.lg);
  const href = `${base}/app/#/card/${item.id}`;
  const foot = footerFor(lang, base, unsubUrl);
  const rows = words
    .map((w) => {
      const parts = w.pieces ? ` <span style="color:#64716a">(${w.pieces.map((p) => esc(p.m)).join('·')})</span>` : '';
      return `<tr><td style="padding:6px 12px 6px 0;font-weight:700;vertical-align:top">${esc(w.word)}${parts}</td><td style="padding:6px 0;color:#2f3c35">${esc(w.gloss ?? '')}</td></tr>`;
    })
    .join('');
  const subject = mt(lang, 'wotdSubject', { lg: item.lg });
  return {
    subject,
    html: layout({
      lang,
      title: subject,
      body: `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0a8458">${esc(mt(lang, 'wotdKicker'))}</p>
        <p style="margin:0;font-size:34px;font-weight:800;line-height:1.15;color:#0a8458">${esc(item.lg)}</p>
        <p style="margin:6px 0 20px;font-size:18px;color:#2f3c35">${esc(meaning)}</p>
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64716a">${esc(mt(lang, 'wotdBreakdown'))}</p>
        <table role="presentation" style="border-collapse:collapse;font-size:15px;margin:0 0 16px">${rows}</table>
        ${note ? `<p style="margin:0 0 14px;font-size:15px;color:#2f3c35">${esc(note)}</p>` : ''}
        ${tip ? `<p style="margin:0 0 18px;padding:12px 14px;border-radius:12px;background:#fef3d8;font-size:14px;line-height:1.5"><b>${esc(mt(lang, 'wotdTip'))}</b> ${esc(tip)}</p>` : ''}
        <p style="margin:0">${button(href, mt(lang, 'wotdBtn'))}</p>`,
      footer: foot.html,
    }),
    text: `${mt(lang, 'wotdKicker')}\n\n${item.lg}\n${meaning}\n\n${mt(lang, 'wotdBreakdown')}:\n${words
      .map((w) => `- ${w.word}: ${w.gloss ?? ''}`)
      .join('\n')}${note ? `\n\n${note}` : ''}${tip ? `\n\n${mt(lang, 'wotdTip')}: ${tip}` : ''}\n\n${mt(lang, 'wotdBtn')}: ${href}\n\n${foot.text}`,
  };
}

export function reminderEmail(lang, { streak, due, base, unsubUrl }) {
  const href = `${base}/app/`;
  const foot = footerFor(lang, base, unsubUrl);
  const lines = [streak > 0 ? mt(lang, 'remindStreak', { n: streak }) : mt(lang, 'remindStart')];
  if (due > 0) lines.push(mt(lang, 'remindDue', { n: due }));
  const subject = mt(lang, 'remindSubject');
  return {
    subject,
    html: layout({
      lang,
      title: subject,
      body: `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">${esc(mt(lang, 'remindTitle'))}</h1>
        ${lines.map((l) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.55;color:#2f3c35">${esc(l)}</p>`).join('')}
        <p style="margin:18px 0 0">${button(href, mt(lang, 'remindBtn'))}</p>`,
      footer: foot.html,
    }),
    text: `${mt(lang, 'remindTitle')}\n\n${lines.join('\n')}\n\n${mt(lang, 'remindBtn')}: ${href}\n\n${foot.text}`,
  };
}

// Simple branded page for links opened from an email (unsubscribe).
export function htmlPage({ lang = 'en', title, body }) {
  return new Response(layout({ lang, title, body }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
      'Cache-Control': 'no-store',
    },
  });
}
