// Profile → Email & reminders: email confirmation, word of the day, news opt-in,
// lesson reminders by email or text (Pro), and phone verification.

import { api } from './api.js';
import * as store from './store.js';
import { t, notifyError } from './i18n.js';
import { icon } from './icons.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const deviceTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// "19:00" → "7:00 PM" (or "19:00") in the learner's locale.
function clockLabel(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
const CLOCKS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

const toggle = (name, on, disabled, title, sub) => `
  <label class="nt-row ${disabled ? 'disabled' : ''}">
    <span class="nt-text"><b>${title}</b><small>${sub}</small></span>
    <span class="switch"><input type="checkbox" data-pref="${name}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><i></i></span>
  </label>`;

function smsPanel(p) {
  if (p.plan !== 'pro') {
    return `<div class="nt-pro">
      <span class="nt-pro-icon">${icon('crown')}</span>
      <span class="nt-text"><b>${t('nt.proTitle')}</b><small>${t('nt.proSub')}</small></span>
      ${p.proWaitlist
        ? `<p class="nt-ok">${icon('check')}<span>${t('nt.proJoined')}</span></p>`
        : `<button type="button" class="btn btn-secondary btn-sm" data-action="waitlist">${t('nt.proJoin')}</button>`}
    </div>`;
  }
  if (!p.smsEnabled) return `<p class="muted small">${t('nt.smsOff')}</p>`;
  if (p.phoneVerified) {
    return `<p class="nt-ok">${icon('phone')}<span>${t('nt.phoneOk', { phone: esc(p.phone) })}</span>
      <button type="button" class="link-btn" data-action="remove-phone">${t('nt.phoneRemove')}</button></p>`;
  }
  return `<div class="nt-phone">
    <label>${t('nt.phone')}<input type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="${t('nt.phonePh')}"></label>
    <p class="muted small">${t('nt.phoneHint')}</p>
    <button type="button" class="btn btn-secondary btn-sm" data-action="send-code">${icon('phone')} ${t('nt.sendCode')}</button>
    <div class="nt-code" hidden>
      <label>${t('nt.code')}<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>
      <button type="button" class="btn btn-primary btn-sm" data-action="verify-code">${t('nt.verify')}</button>
    </div>
  </div>`;
}

export function notifyCardHtml(p, { notice = '' } = {}) {
  const u = store.user();
  const emailOff = !p.emailEnabled;
  return `
    <h2 class="card-title">${icon('bell')} ${t('nt.title')}<span class="nt-saved" aria-live="polite"></span></h2>
    ${notice}
    ${
      emailOff
        ? `<p class="muted small nt-status">${t('nt.emailOff')}</p>`
        : p.emailVerified
          ? `<p class="nt-ok nt-status">${icon('check')}<span>${t('nt.verified')} · ${esc(u?.email)}</span></p>`
          : `<div class="nt-verify">${icon('mail')}<span>${t('nt.unverified')}</span>
               <button type="button" class="btn btn-secondary btn-sm" data-action="resend">${t('nt.resend')}</button></div>`
    }
    ${toggle('wotdEmail', p.wotdEmail, emailOff, t('nt.wotd'), t('nt.wotdSub'))}
    ${toggle('newsEmail', p.newsEmail, emailOff, t('nt.news'), t('nt.newsSub'))}

    <div class="nt-remind">
      <span class="nt-text"><b>${t('nt.remind')}</b><small>${t('nt.remindSub')}</small></span>
      <div class="seg seg-sm" role="radiogroup" aria-label="${t('nt.remind')}">
        ${['off', 'email', 'sms']
          .map((c) => `<button type="button" role="radio" aria-checked="${p.remindChannel === c}" class="${p.remindChannel === c ? 'active' : ''}" data-channel="${c}"
            ${c === 'email' && emailOff ? 'disabled' : ''}>${t(`nt.ch.${c}`)}${c === 'sms' ? ` <span class="pro-tag">Pro</span>` : ''}</button>`)
          .join('')}
      </div>
      ${
        p.remindChannel !== 'off'
          ? `<label class="nt-time">${t('nt.time')}
               <select data-pref="remindTime">${CLOCKS.map((c) => `<option value="${c}" ${c === p.remindTime ? 'selected' : ''}>${clockLabel(c)}</option>`).join('')}</select></label>
             <p class="muted small">${t('nt.tz', { tz: esc(p.timezone) })}</p>
             <label class="nt-check"><input type="checkbox" data-pref="remindSkipDone" ${p.remindSkipDone ? 'checked' : ''}> ${t('nt.skip')}</label>
             ${p.remindChannel === 'email' && !p.emailVerified ? `<p class="nt-warn">${t('nt.needVerify')}</p>` : ''}`
          : ''
      }
      ${smsPanel(p)}
    </div>
    <p class="form-error nt-error" role="alert"></p>`;
}

// Fills #notify-card once preferences load, and keeps it in sync after each change.
export async function mountNotify(el, { notice = '' } = {}) {
  if (!el) return;
  let prefs;
  const error = (err) => {
    const box = el.querySelector('.nt-error');
    if (box) box.textContent = notifyError(err);
  };
  const draw = () => {
    el.innerHTML = notifyCardHtml(prefs, { notice });
    notice = '';
  };
  const saved = () => {
    const s = el.querySelector('.nt-saved');
    if (s) s.textContent = t('nt.saved');
  };
  const patch = async (body) => {
    try {
      prefs = await api('notify', { method: 'PATCH', body: { timezone: deviceTz(), ...body } });
      draw();
      saved();
    } catch (err) {
      draw();
      error(err);
    }
  };

  try {
    prefs = await api('notify');
  } catch (err) {
    el.innerHTML = `<p class="form-error">${esc(notifyError(err))}</p>`;
    return;
  }
  draw();
  // Keep the stored time zone current (people travel; reminders follow their phone's clock).
  if (prefs.timezone !== deviceTz()) patch({});

  el.addEventListener('change', (e) => {
    const name = e.target.dataset.pref;
    if (!name) return;
    patch({ [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  });
  el.addEventListener('click', async (e) => {
    const channel = e.target.closest('[data-channel]')?.dataset.channel;
    if (channel && channel !== prefs.remindChannel) return patch({ remindChannel: channel });
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    const btn = e.target.closest('button');
    btn.disabled = true;
    try {
      if (action === 'waitlist') await patch({ proWaitlist: true });
      if (action === 'resend') {
        await api('email/resend', { method: 'POST', body: {} });
        btn.replaceWith(Object.assign(document.createElement('b'), { textContent: t('nt.resent') }));
      }
      if (action === 'send-code') {
        const phone = el.querySelector('input[name=phone]').value;
        await api('phone/start', { method: 'POST', body: { phone } });
        el.querySelector('.nt-code').hidden = false;
        el.querySelector('.nt-error').textContent = t('nt.codeSent', { phone });
        el.querySelector('input[name=code]').focus();
      }
      if (action === 'verify-code') {
        prefs = await api('phone/verify', { method: 'POST', body: { code: el.querySelector('input[name=code]').value } });
        draw();
        await patch({ remindChannel: 'sms' });
      }
      if (action === 'remove-phone') {
        prefs = await api('phone/remove', { method: 'POST', body: {} });
        draw();
      }
    } catch (err) {
      error(err);
    } finally {
      if (btn.isConnected) btn.disabled = false;
    }
  });
}
