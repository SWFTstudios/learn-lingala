// Live chat practice: a scenario picker and a text-message conversation with a
// Claude-powered Lingala speaker. Conversations are kept on this device only.

import { SCENARIOS, SCENARIO_BY_ID } from './chat-scenarios.js';
import { LEVELS } from './course.js';
import { api } from './api.js';
import * as store from './store.js';
import { t, getLang, scenarioText, aiError } from './i18n.js';
import { icon } from './icons.js';

const KEY = 'll-chat-v1';
const XP_PER_MESSAGE = 2;
const XP_MISSION = 10;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loadChats() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function saveChats(chats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    // Storage full or blocked: the chat still works for this visit.
  }
}

export function clearChats() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

const levelIndex = (id) => LEVELS.findIndex((l) => l.id === id);
const levelLabel = (id) => (id ? t('chat.levelPlus', { n: levelIndex(id) + 1 }) : t('chat.anyLevel'));

// --- Picker -------------------------------------------------------------------

export function chatPickerHtml({ aiEnabled, signedIn, currentLevelId }) {
  const chats = loadChats();
  const current = levelIndex(currentLevelId);
  const notice = !navigator.onLine
    ? `<div class="notice">${icon('offline')}<span>${t('chat.offline')}</span></div>`
    : aiEnabled === false
      ? `<div class="notice">${icon('chat')}<span>${t('chat.off')}</span></div>`
      : aiEnabled && !signedIn
        ? `<a href="#/account" class="notice notice-cta">${icon('lock')}<span><strong>${t('chat.signinTitle')}</strong> ${t('chat.signinBody')}</span></a>`
        : '';

  return `
    <header class="page-head">
      <p class="eyebrow">${icon('sparkle')} ${t('chat.eyebrow')}</p>
      <h1>${t('chat.title')}</h1>
      <p class="lede">${t('chat.sub')}</p>
    </header>
    ${notice}
    <div class="scenarios">
      ${SCENARIOS.map((s) => {
        const text = scenarioText(s);
        const started = chats[s.id]?.messages?.length;
        const stretch = s.level && levelIndex(s.level) > current;
        const locked = aiEnabled !== true || !signedIn;
        return `
          <a href="${locked ? '#/chat' : `#/chat/${s.id}`}" class="scenario ${locked ? 'locked' : ''}" ${locked ? 'aria-disabled="true"' : ''}>
            <span class="scenario-avatar" aria-hidden="true">${s.emoji}</span>
            <span class="scenario-text">
              <span class="scenario-title">${esc(s.partner)}<span class="scenario-role">${esc(text.title)}</span></span>
              <span class="scenario-mission">${text.mission ? `${icon('target')} ${esc(text.mission)}` : esc(t('chat.freeTalk'))}</span>
              <span class="scenario-meta">
                <span class="badge ${stretch ? 'badge-stretch' : 'badge-local'}">${levelLabel(s.level)}${stretch ? ` · ${t('chat.stretch')}` : ''}</span>
                ${chats[s.id]?.missionDone ? `<span class="badge badge-done">${icon('check')} ${t('chat.missionDone')}</span>` : started ? `<span class="badge badge-muted">${t('chat.inProgress')}</span>` : ''}
              </span>
            </span>
            <span class="scenario-go">${icon('forward')}</span>
          </a>`;
      }).join('')}
    </div>
    <p class="footnote">${t('chat.footnote')}</p>`;
}

// --- Conversation ---------------------------------------------------------------

function feedbackHtml(fb) {
  if (!fb) return '';
  if (fb.verdict === 'great') return `<div class="fb fb-great">${icon('check')} <span><strong>${t('fb.great')}</strong> ${esc(fb.note)}</span></div>`;
  const label = fb.verdict === 'ok' ? t('fb.ok') : t('fb.fix');
  return `<div class="fb fb-${fb.verdict}">${icon('sparkle')} <span>${label} <strong lang="ln">${esc(fb.corrected)}</strong>
    <span class="fb-note">${esc(fb.note)}</span></span></div>`;
}

function messageHtml(m) {
  if (m.role === 'assistant') {
    return `<button type="button" class="bubble bubble-them">
      <span class="bubble-lg" lang="ln">${esc(m.text)}</span>
      <span class="bubble-en">${esc(m.en || '')}</span></button>`;
  }
  return `<div class="msg-you"><div class="bubble bubble-you"><span class="bubble-lg" lang="ln">${esc(m.text)}</span></div>
    ${feedbackHtml(m.feedback)}</div>`;
}

export function mountChat(root, scenarioId, { onExit }) {
  const s = SCENARIO_BY_ID.get(scenarioId);
  const text = scenarioText(s);
  const chats = loadChats();
  const chat = (chats[scenarioId] ??= { messages: [], suggestions: [], missionDone: false });
  let sending = false;

  root.innerHTML = `
    <div class="chat-app">
      <header class="chat-head">
        <button type="button" class="icon-btn chat-back" aria-label="${t('common.back')}">${icon('back')}</button>
        <span class="chat-avatar" aria-hidden="true">${s.emoji}</span>
        <span class="chat-who"><strong>${esc(s.partner)}</strong><span class="chat-status"><i class="online"></i>${esc(text.title)}</span></span>
        <button type="button" class="chat-reset" aria-label="${t('chat.newChat')}">${icon('plus')}<span>${t('chat.newChat')}</span></button>
      </header>
      <div class="chat-log" aria-live="polite">
        <div class="chat-intro">
          <p class="setting">${esc(text.setting)}</p>
          ${text.mission ? `<div class="mission ${chat.missionDone ? 'done' : ''}">${icon('target')} <span><strong>${t('chat.mission')}</strong> ${esc(text.mission)}</span></div>` : ''}
          <p class="hint">${t('chat.tapHint', { name: esc(s.partner) })}</p>
        </div>
        <div class="chat-messages"></div>
      </div>
      <footer class="chat-foot">
        <div class="chat-foot-inner">
          <div class="chat-suggest"></div>
          <p class="chat-error" role="alert"></p>
          <form class="chat-compose">
            <button type="button" class="key-btn" data-ch="ɛ">ɛ</button>
            <button type="button" class="key-btn" data-ch="ɔ">ɔ</button>
            <input class="chat-input" lang="ln" autocomplete="off" autocapitalize="sentences" spellcheck="false"
                   enterkeyhint="send" maxlength="400" placeholder="${t('chat.placeholder')}" aria-label="${t('chat.placeholder')}">
            <button class="chat-send" aria-label="${t('chat.send')}">${icon('send')}</button>
          </form>
        </div>
      </footer>
    </div>`;

  const log = root.querySelector('.chat-log');
  const list = root.querySelector('.chat-messages');
  const suggest = root.querySelector('.chat-suggest');
  const input = root.querySelector('.chat-input');
  const errorEl = root.querySelector('.chat-error');
  const sendBtn = root.querySelector('.chat-send');

  const opener = { role: 'assistant', text: s.opener.lg, en: text.opener };

  function draw() {
    list.innerHTML = [opener, ...chat.messages].map(messageHtml).join('') +
      (sending ? `<div class="bubble bubble-them typing" aria-label="${esc(t('chat.typing', { name: s.partner }))}"><span></span><span></span><span></span></div>` : '') +
      (chat.missionDone && s.mission ? `<div class="mission-done">${icon('trophy')} ${t('chat.missionComplete')}</div>` : '');
    suggest.innerHTML = (sending ? [] : chat.suggestions)
      .map((x, i) => `<button type="button" class="suggest-chip" data-i="${i}" title="${esc(x.en)}"><span lang="ln">${esc(x.lg)}</span><small>${esc(x.en)}</small></button>`)
      .join('');
    sendBtn.disabled = sending;
    log.scrollTop = log.scrollHeight;
  }

  list.addEventListener('click', (e) => e.target.closest('.bubble-them')?.classList.toggle('revealed'));
  suggest.addEventListener('click', (e) => {
    const chip = e.target.closest('.suggest-chip');
    if (!chip) return;
    input.value = chat.suggestions[Number(chip.dataset.i)].lg;
    input.focus();
  });
  root.querySelectorAll('.key-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const { selectionStart: a, selectionEnd: z, value } = input;
      input.value = value.slice(0, a) + b.dataset.ch + value.slice(z);
      input.setSelectionRange(a + 1, a + 1);
      input.focus();
    }),
  );
  root.querySelector('.chat-back').addEventListener('click', onExit);
  root.querySelector('.chat-reset').addEventListener('click', () => {
    if (chat.messages.length && !confirm(t('chat.resetConfirm', { name: s.partner }))) return;
    chat.messages = [];
    chat.suggestions = [];
    chat.missionDone = false;
    saveChats(chats);
    root.querySelector('.mission')?.classList.remove('done');
    draw();
  });

  root.querySelector('.chat-compose').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message || sending) return;
    errorEl.textContent = '';
    const mine = { role: 'user', text: message };
    chat.messages.push(mine);
    input.value = '';
    sending = true;
    draw();
    try {
      const res = await api('chat', {
        method: 'POST',
        body: { scenario: s.id, lang: getLang(), messages: chat.messages.map((m) => ({ role: m.role, text: m.text })) },
      });
      mine.feedback = res.feedback;
      chat.messages.push({ role: 'assistant', text: res.reply, en: res.translation });
      chat.suggestions = res.suggestions;
      store.addXp(XP_PER_MESSAGE);
      if (res.mission_complete && s.mission && !chat.missionDone) {
        chat.missionDone = true;
        store.addXp(XP_MISSION);
        root.querySelector('.mission')?.classList.add('done');
      }
    } catch (err) {
      // Put the message back so nothing typed is lost.
      chat.messages.pop();
      input.value = message;
      if (err.status === 401) errorEl.innerHTML = t('chat.signinAgain');
      else errorEl.textContent = aiError(err);
    } finally {
      sending = false;
      saveChats(chats);
      draw();
      input.focus();
    }
  });

  draw();
  setTimeout(() => input.focus(), 50);
  return () => saveChats(chats);
}

export const isScenario = (id) => SCENARIO_BY_ID.has(id);
