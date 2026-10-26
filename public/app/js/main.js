// App shell: layout, routing, onboarding and the non-lesson screens.

import { LEVELS, LEVEL_BY_ID, UNIT_BY_ID, COURSE, ITEMS } from './course.js';
import { isLearned, isMastered, recall } from './srs.js';
import {
  buildLesson, buildDueReview, buildConversation, buildCheckpoint,
  currentUnit, unitProgress, levelProgress, dueItems, daysToLevel,
} from './lesson.js';
import { runSession } from './player.js';
import { api } from './api.js';
import * as store from './store.js';
import { chatPickerHtml, mountChat, isScenario, clearChats } from './chat.js';
import { translateHtml, wireTranslate, clearRecent } from './translate.js';
import { t, tn, setLang, getLang, LANGS, gloss, unitText, levelText, dialogueText } from './i18n.js';
import { icon } from './icons.js';
import { installCardHtml, installSettingsHtml, promptInstall, dismissInstall, onInstallChange, initOfflineBanner } from './pwa.js';

const app = document.getElementById('app');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CONVERSATIONAL = 'conversations'; // the level that marks "conversational"
const MOTIVATIONS = ['travel', 'family', 'music', 'friends', 'work', 'curious'];
const GOALS = [10, 20, 30, 50];

let config = { turnstileSiteKey: null, aiEnabled: null }; // null = still loading
let stopSession = null;

setLang(store.baseLang() || (navigator.language || '').slice(0, 2));

// --- Small building blocks -------------------------------------------------------

const currentLevel = () => LEVEL_BY_ID.get(currentUnit(store.getCard).level);
const levelNumber = (level) => LEVELS.indexOf(level) + 1;

function ring(pct, size = 120, stroke = 10, inner = '') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `
    <div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fill" stroke-width="${stroke}"
          stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(1, pct))}"/>
      </svg>
      <div class="ring-inner">${inner}</div>
    </div>`;
}

function weekDots() {
  const days = store.xpByDay();
  return [...Array(7)]
    .map((_, k) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - k));
      const xp = days[store.today(d)] || 0;
      const met = xp >= store.dailyGoal();
      return `<span class="wday ${xp ? 'on' : ''} ${met ? 'met' : ''} ${k === 6 ? 'today' : ''}">
        <i>${xp ? icon(met ? 'check' : 'flame') : ''}</i><small>${d.toLocaleDateString(getLang(), { weekday: 'narrow' })}</small></span>`;
    })
    .join('');
}

function weeksText(days) {
  if (days <= 0) return t('pace.now');
  if (days < 14) return tn('pace.days', days);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return t('pace.weeks', { n: Math.round(days / 7), date: d.toLocaleDateString(getLang(), { month: 'long', year: 'numeric' }) });
}

// Daily goal, streak and path: the right rail on desktop, a strip on mobile.
function goalCard() {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const done = xp >= goal;
  return `
    <section class="panel goal-panel">
      ${ring(xp / goal, 92, 9, `<b>${xp}</b><small>/ ${goal} XP</small>`)}
      <div>
        <p class="panel-kicker">${t('rail.today')}</p>
        <p class="panel-title">${done ? t('rail.goalDone') : t('rail.goalLeft', { n: goal - xp })}</p>
        <a href="#/account" class="panel-link">${t('rail.changeGoal')}</a>
      </div>
    </section>`;
}

function streakCard() {
  const s = store.streak();
  return `
    <section class="panel streak-panel">
      <div class="streak-head">
        <span class="streak-flame ${s ? 'lit' : ''}">${icon('flame')}</span>
        <div><p class="panel-title">${tn('rail.streak', s)}</p><p class="muted small">${s ? t('rail.keepItUp') : t('rail.startStreak')}</p></div>
      </div>
      <div class="week">${weekDots()}</div>
    </section>`;
}

function pathCard() {
  const level = currentLevel();
  const conversational = LEVELS.slice(0, LEVELS.findIndex((l) => l.id === CONVERSATIONAL) + 1).every(
    (l) => levelProgress(l.id, store.getCard).done,
  );
  const days = daysToLevel(CONVERSATIONAL, store.getCard, store.dailyGoal());
  return `
    <section class="panel path-panel">
      <div class="panel-row">
        <p class="panel-kicker">${t('path.title')}</p>
        <a href="#/level/${level.id}" class="panel-link">${t('path.levelOf', { n: levelNumber(level), total: LEVELS.length })}</a>
      </div>
      <ol class="path">
        ${LEVELS.map((l, i) => {
          const p = levelProgress(l.id, store.getCard);
          const state = p.done ? 'done' : l === level ? 'now' : '';
          return `<li class="path-step ${state}"><a href="#/level/${l.id}">
            <span class="path-dot">${p.done ? icon('check') : i + 1}</span>
            <span class="path-name">${esc(levelText(l).title)}</span>
            <span class="path-bar"><span style="width:${(p.learned / p.total) * 100}%"></span></span></a></li>`;
        }).join('')}
      </ol>
      <p class="path-eta">${
        conversational
          ? t('path.reached')
          : t('path.eta', { goal: store.dailyGoal(), level: esc(levelText(LEVEL_BY_ID.get(CONVERSATIONAL)).title), when: weeksText(days) })
      }</p>
    </section>`;
}

const rail = () => `<aside class="rail">${goalCard()}${streakCard()}${pathCard()}</aside>`;

// --- Layout ---------------------------------------------------------------------

const NAV = [
  ['learn', '#/', 'learn'],
  ['review', '#/review', 'review'],
  ['chat', '#/chat', 'chat'],
  ['translate', '#/translate', 'translate'],
  ['account', '#/account', 'user'],
];

function shell(active, content, { withRail = false } = {}) {
  const due = dueItems(store.getCard).length;
  const s = store.streak();
  const xp = store.todayXp();
  const u = store.user();
  const navLink = ([key, href, ic], cls) =>
    `<a href="${href}" class="${cls} ${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>
      ${icon(ic)}<span>${key === 'account' && !u ? t('nav.save') : t(`nav.${key}`)}</span>
      ${key === 'review' && due ? `<b class="dot">${due}</b>` : ''}</a>`;

  return `
    <div class="layout ${withRail ? 'has-rail' : ''}">
      <aside class="sidebar">
        <a href="#/" class="brand">${brandMark()}<span>Learn<b>Lingala</b></span></a>
        <nav class="side-nav" aria-label="${t('nav.main')}">${NAV.map((n) => navLink(n, 'side-link')).join('')}</nav>
        <div class="side-foot">
          <div class="side-stats">
            <span class="stat-pill ${s ? 'fire' : ''}">${icon('flame')} ${s}</span>
            <span class="stat-pill">${icon('bolt')} ${xp} XP</span>
          </div>
          ${u ? `<a href="#/account" class="side-user"><span class="avatar">${esc((u.displayName || u.email)[0].toUpperCase())}</span><span>${esc(u.displayName || u.email)}</span></a>` : ''}
        </div>
      </aside>
      <header class="topbar">
        <a href="#/" class="brand">${brandMark()}<span>Learn<b>Lingala</b></span></a>
        <div class="topbar-stats">
          <span class="stat-pill ${s ? 'fire' : ''}" title="${t('rail.streakTitle')}">${icon('flame')} ${s}</span>
          <span class="stat-pill" title="${t('rail.today')}">${icon('bolt')} ${xp}</span>
        </div>
      </header>
      <main class="screen" id="main">${content}</main>
      ${withRail ? rail() : ''}
      <nav class="tabbar" aria-label="${t('nav.main')}">${NAV.map((n) => navLink(n, 'tab')).join('')}</nav>
    </div>`;
}

const brandMark = () =>
  `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--brand)"/>
   <path d="M8 10.5h16a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-8l-4.5 3.5V21.5H8A2.5 2.5 0 0 1 5.5 19v-6A2.5 2.5 0 0 1 8 10.5z" fill="var(--on-brand)"/>
   <circle cx="24.5" cy="9" r="3.5" fill="var(--gold)"/></svg>`;

// --- Home -----------------------------------------------------------------------

function unitRow(un, isCurrent) {
  const p = unitProgress(un, store.getCard);
  const mastered = un.items.filter((i) => isMastered(store.getCard(i.id))).length;
  const text = unitText(un);
  return `
    <a href="#/unit/${un.id}" class="unit-row ${p.done ? 'done' : ''} ${isCurrent ? 'current' : ''}">
      ${ring(p.learned / p.total, 52, 5, `<span class="unit-emoji">${un.emoji}</span>`)}
      <span class="unit-text">
        <span class="unit-title">${esc(text.title)} ${isCurrent ? `<span class="badge badge-next">${t('home.upNext')}</span>` : ''}</span>
        <span class="unit-sub"><span lang="ln">${esc(un.lg)}</span>${un.dialogue ? ` · ${icon('chat')}` : ''}</span>
      </span>
      <span class="unit-count">${p.done ? (mastered === p.total ? icon('trophy') : icon('check')) : `${p.learned}/${p.total}`}</span>
    </a>`;
}

function homeScreen() {
  const unit = currentUnit(store.getCard);
  const prog = unitProgress(unit, store.getCard);
  const level = currentLevel();
  const due = dueItems(store.getCard).length;
  const learned = ITEMS.filter((i) => isLearned(store.getCard(i.id))).length;
  const u = store.user();
  const why = store.motivation();
  const name = u?.displayName ? `, ${esc(u.displayName)}` : '';

  const levels = LEVELS.map((l, i) => {
    const p = levelProgress(l.id, store.getCard);
    const text = levelText(l);
    return `
      <details class="level" ${l === level ? 'open' : ''}>
        <summary>
          <span class="level-num ${p.done ? 'done' : ''}">${p.done ? icon('check') : i + 1}</span>
          <span class="level-text">
            <span class="level-title">${esc(text.title)}</span>
            <span class="level-sub">${esc(text.subtitle)} · ${esc(l.cefr)}</span>
          </span>
          <span class="level-count">${p.learned}/${p.total}</span>
          <span class="chev">${icon('forward')}</span>
        </summary>
        <div class="units">${l.units.map((id) => unitRow(UNIT_BY_ID.get(id), UNIT_BY_ID.get(id) === unit && !prog.done)).join('')}</div>
        <a href="#/level/${l.id}" class="level-more">${t('home.levelMore')} ${icon('forward')}</a>
      </details>`;
  }).join('');

  return shell(
    'learn',
    `
    <section class="hello">
      <p class="eyebrow">${why ? t(`mot.line.${why}`) : t('home.eyebrow')}</p>
      <h1><span lang="ln">Mbote</span>${name}!</h1>
    </section>

    <div class="mobile-only today-strip">
      ${ring(store.todayXp() / store.dailyGoal(), 54, 6, `<small>${store.todayXp()}</small>`)}
      <div><b>${store.todayXp() >= store.dailyGoal() ? t('rail.goalDone') : t('rail.goalLeft', { n: store.dailyGoal() - store.todayXp() })}</b>
        <span>${tn('rail.streak', store.streak())}</span></div>
    </div>

    <a href="#/lesson/${unit.id}" class="hero">
      <span class="hero-art" aria-hidden="true">${unit.emoji}</span>
      <span class="hero-body">
        <span class="hero-kicker">${prog.done ? t('home.practice') : learned ? t('home.continue') : t('home.start')} · ${t('home.level', { n: levelNumber(level) })}</span>
        <span class="hero-title">${esc(unitText(unit).title)}</span>
        <span class="hero-meter"><span style="width:${(prog.learned / prog.total) * 100}%"></span></span>
        <span class="hero-sub">${t('home.learnedOf', { n: prog.learned, total: prog.total })} · ${t('home.minutes')}</span>
      </span>
      <span class="hero-cta">${icon('play')}</span>
    </a>

    ${
      due
        ? `<a href="#/session/review" class="callout callout-review">${icon('review')}
            <span><strong>${tn('home.due', due)}</strong><small>${t('home.dueSub')}</small></span>${icon('forward')}</a>`
        : ''
    }

    <div class="quick-grid">
      <a href="#/chat" class="quick quick-chat">${icon('chat')}<strong>${t('home.chatTitle')}</strong><small>${t('home.chatSub')}</small></a>
      <a href="#/translate" class="quick quick-tr">${icon('translate')}<strong>${t('home.trTitle')}</strong><small>${t('home.trSub')}</small></a>
    </div>

    ${learned || u ? installCardHtml() : ''}

    <div class="mobile-only">${pathCard()}</div>

    ${
      !u && learned
        ? `<a href="#/account" class="callout callout-save">${icon('lock')}<span><strong>${t('home.saveTitle')}</strong><small>${t('home.saveSub')}</small></span>${icon('forward')}</a>`
        : ''
    }

    <h2 class="section-title">${t('home.course')}</h2>
    <div class="levels">${levels}</div>

    <div class="stats-row">
      <div class="stat"><b>${learned}</b><span>${t('stat.learned')}</span></div>
      <div class="stat"><b>${ITEMS.filter((i) => isMastered(store.getCard(i.id))).length}</b><span>${t('stat.mastered')}</span></div>
      <div class="stat"><b>${store.totalXp()}</b><span>${t('stat.xp')}</span></div>
    </div>`,
    { withRail: true },
  );
}

// --- Level & unit ------------------------------------------------------------------

function levelScreen(id) {
  const level = LEVEL_BY_ID.get(id);
  if (!level) return homeScreen();
  const text = levelText(level);
  const p = levelProgress(id, store.getCard);
  const next = level.units.map((u) => UNIT_BY_ID.get(u)).find((u) => !unitProgress(u, store.getCard).done);
  return shell(
    'learn',
    `
    <a href="#/" class="back">${icon('back')} ${t('common.course')}</a>
    <header class="page-head level-head">
      <p class="eyebrow">${t('home.level', { n: levelNumber(level) })} · ${esc(level.cefr)} · ${esc(text.weeks)}</p>
      <h1>${esc(text.title)}</h1>
      <p class="lede">${esc(text.subtitle)} · ${t('home.learnedOf', { n: p.learned, total: p.total })}</p>
      <div class="meter meter-lg"><span style="width:${(p.learned / p.total) * 100}%"></span></div>
    </header>

    <section class="card">
      <h2 class="card-title">${t('level.canDo')}</h2>
      <ul class="can-do">${text.canDo.map((c) => `<li class="${p.done ? 'done' : ''}">${icon(p.done ? 'check' : 'target')}<span>${esc(c)}</span></li>`).join('')}</ul>
    </section>

    ${next ? `<a href="#/lesson/${next.id}" class="btn btn-primary btn-block">${icon('play')} ${p.learned ? t('common.continue') : t('common.start')}: ${esc(unitText(next).title)}</a>` : ''}

    <section class="card checkpoint-card">
      <div class="checkpoint-icon">${icon('trophy')}</div>
      <div>
        <h2 class="card-title">${t('level.checkpoint')}</h2>
        <p class="muted">${p.done ? t('level.checkpointDone') : t('level.checkpointSkip')}</p>
        <a href="#/checkpoint/${level.id}" class="btn btn-secondary">${p.done ? t('level.takeCheckpoint') : t('level.testOut')}</a>
      </div>
    </section>

    <h2 class="section-title">${t('level.units')}</h2>
    <div class="units">${level.units.map((u) => unitRow(UNIT_BY_ID.get(u), UNIT_BY_ID.get(u) === next)).join('')}</div>`,
  );
}

function strengthLabel(card) {
  if (!isLearned(card)) return ['new', t('str.new')];
  if (isMastered(card)) return ['mastered', t('str.mastered')];
  const r = recall(card);
  if (r < 0.6) return ['weak', t('str.weak')];
  if (r < 0.85) return ['ok', t('str.ok')];
  return ['strong', t('str.strong')];
}

function wordRow(i) {
  const [cls, label] = strengthLabel(store.getCard(i.id));
  return `<li class="word">
    <span class="word-main"><span class="word-lg" lang="ln">${esc(i.lg)}</span>
    <span class="word-en">${esc(gloss(i))}</span></span>
    ${i.local ? `<span class="badge badge-local">${t('badge.local')}</span>` : ''}
    <span class="strength strength-${cls}">${label}</span>
  </li>`;
}

function unitScreen(id) {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) return homeScreen();
  const level = LEVEL_BY_ID.get(unit.level);
  const text = unitText(unit);
  const p = unitProgress(unit, store.getCard);
  const d = unit.dialogue && dialogueText(unit);
  return shell(
    'learn',
    `
    <a href="#/level/${level.id}" class="back">${icon('back')} ${t('home.level', { n: levelNumber(level) })} · ${esc(levelText(level).title)}</a>
    <header class="page-head unit-head">
      <span class="unit-hero-emoji" aria-hidden="true">${unit.emoji}</span>
      <div>
        <h1>${esc(text.title)}</h1>
        <p class="lede"><span lang="ln">${esc(unit.lg)}</span> · ${t('home.learnedOf', { n: p.learned, total: p.total })}</p>
      </div>
    </header>
    <a href="#/lesson/${unit.id}" class="btn btn-primary btn-block">${icon('play')} ${p.done ? t('unit.practice') : p.learned ? t('unit.continue') : t('unit.start')}</a>
    <h2 class="section-title">${t('unit.how')}</h2>
    <div class="notes card">${text.intro}</div>
    ${
      d
        ? `<h2 class="section-title">${t('unit.conversation', { title: esc(d.title) })}</h2>
           <p class="muted small">${esc(d.setting)} ${t('unit.tapLine')}</p>
           <div class="chat">${unit.dialogue.lines
             .map(
               (l, i) => `<button type="button" class="bubble bubble-${l.who}">
                 <span class="bubble-who">${l.who === 'you' ? t('who.you') : t('who.them')}</span>
                 <span class="bubble-lg" lang="ln">${esc(l.lg)}</span>
                 <span class="bubble-en">${esc(d.lines[i])}</span></button>`,
             )
             .join('')}</div>
           <a href="#/talk/${unit.id}" class="btn btn-secondary btn-block">${icon('chat')} ${t('unit.roleplay')}</a>`
        : ''
    }
    <h2 class="section-title">${t('unit.phrases')}</h2>
    <ul class="word-list">${unit.items.map(wordRow).join('')}</ul>`,
  );
}

// --- Review -----------------------------------------------------------------------

function reviewScreen() {
  const due = dueItems(store.getCard);
  const cards = ITEMS.map((i) => store.getCard(i.id)).filter(isLearned);
  const buckets = { weak: 0, ok: 0, strong: 0, mastered: 0 };
  for (const c of cards) buckets[strengthLabel(c)[0]]++;
  const talkable = COURSE.filter((u) => u.dialogue && unitProgress(u, store.getCard).learned > 0);

  return shell(
    'review',
    `
    <header class="page-head">
      <p class="eyebrow">${icon('review')} ${t('review.eyebrow')}</p>
      <h1>${t('review.title')}</h1>
      <p class="lede">${t('review.sub')}</p>
    </header>
    ${
      cards.length === 0
        ? `<section class="card empty">${icon('review', 'empty-icon')}<p>${t('review.empty')}</p>
           <a href="#/" class="btn btn-primary">${t('review.startLearning')}</a></section>`
        : `<section class="card review-hero">
            ${ring(cards.length ? 1 - due.length / cards.length : 1, 116, 10, `<b>${due.length}</b><small>${t('review.due')}</small>`)}
            <div>
              <p class="panel-title">${due.length ? tn('review.dueNow', due.length) : t('review.caughtUp')}</p>
              <p class="muted">${due.length ? t('review.dueSub') : t('review.caughtUpSub')}</p>
              <a href="#/session/review" class="btn btn-primary">${icon('play')} ${due.length ? t('review.start') : t('review.practiceWeak')}</a>
            </div>
          </section>
          <h2 class="section-title">${t('review.strength')}</h2>
          <div class="strength-grid">
            <div class="sg sg-weak"><b>${buckets.weak}</b>${t('str.weak')}</div>
            <div class="sg sg-ok"><b>${buckets.ok}</b>${t('str.ok')}</div>
            <div class="sg sg-strong"><b>${buckets.strong}</b>${t('str.strong')}</div>
            <div class="sg sg-mastered"><b>${buckets.mastered}</b>${t('str.mastered')}</div>
          </div>`
    }
    ${
      talkable.length
        ? `<h2 class="section-title">${t('review.conversations')}</h2>
           <div class="units">${talkable
             .map((u) => `<a href="#/talk/${u.id}" class="unit-row"><span class="unit-emoji solo">${u.emoji}</span>
               <span class="unit-text"><span class="unit-title">${esc(dialogueText(u).title)}</span>
               <span class="unit-sub">${esc(unitText(u).title)}</span></span><span class="unit-count">${icon('forward')}</span></a>`)
             .join('')}</div>`
        : ''
    }
    <p class="footnote">${t('review.how')}</p>`,
    { withRail: true },
  );
}

// --- Chat & translate -----------------------------------------------------------------

const chatScreen = () =>
  shell('chat', chatPickerHtml({ aiEnabled: config.aiEnabled, signedIn: !!store.user(), currentLevelId: currentLevel().id }));

const translateScreen = () => shell('translate', translateHtml({ aiEnabled: config.aiEnabled }));

// --- Account ------------------------------------------------------------------------

function settingsHtml() {
  const goal = store.dailyGoal();
  return `
    <section class="card settings">
      <h2 class="card-title">${icon('globe')} ${t('acct.language')}</h2>
      <div class="seg lang-seg" role="radiogroup" aria-label="${t('acct.language')}">
        ${Object.entries(LANGS)
          .map(([id, l]) => `<button type="button" role="radio" aria-checked="${id === getLang()}" class="${id === getLang() ? 'active' : ''}" data-lang="${id}">${l.native}</button>`)
          .join('')}
      </div>
      <h2 class="card-title">${icon('target')} ${t('acct.goal')}</h2>
      <div class="goal-picker" role="radiogroup" aria-label="${t('acct.goal')}">
        ${GOALS.map(
          (g) => `<button type="button" role="radio" aria-checked="${g === goal}" class="goal ${g === goal ? 'selected' : ''}" data-goal="${g}">
            <b>${g} XP</b><span>${t(`goal.name.${g}`)} · ${t(`goal.${g}`)}</span></button>`,
        ).join('')}
      </div>
      <p class="muted small">${t('acct.pace', { level: esc(levelText(LEVEL_BY_ID.get(CONVERSATIONAL)).title), when: weeksText(daysToLevel(CONVERSATIONAL, store.getCard, goal)) })}</p>
      ${installSettingsHtml()}
    </section>`;
}

function accountScreen(mode = 'signup') {
  const u = store.user();
  if (u) {
    return shell(
      'account',
      `
      <header class="profile">
        <span class="avatar avatar-lg">${esc((u.displayName || u.email)[0].toUpperCase())}</span>
        <div>
          <h1>${esc(u.displayName || t('acct.learner'))}</h1>
          <p class="muted">${esc(u.email)}</p>
          <p class="sync" id="sync-status">${store.hasUnsynced() ? t('acct.syncing') : `${icon('check')} ${t('acct.synced')}`}</p>
        </div>
      </header>
      <div class="stats-row">
        <div class="stat"><b>${store.streak()}</b><span>${t('stat.streak')}</span></div>
        <div class="stat"><b>${ITEMS.filter((i) => isLearned(store.getCard(i.id))).length}</b><span>${t('stat.learned')}</span></div>
        <div class="stat"><b>${store.totalXp()}</b><span>${t('stat.xp')}</span></div>
      </div>
      ${settingsHtml()}
      <button type="button" class="btn btn-secondary btn-block" id="signout">${icon('logout')} ${t('acct.signout')}</button>
      <details class="danger-zone">
        <summary>${t('acct.delete')}</summary>
        <form id="delete-form" class="form">
          <p class="muted small">${t('acct.deleteWarn')}</p>
          <label>${t('acct.confirmPassword')}<input type="password" name="password" required autocomplete="current-password"></label>
          <p class="form-error" role="alert"></p>
          <button class="btn btn-danger btn-block">${t('acct.deleteBtn')}</button>
        </form>
      </details>`,
    );
  }

  const signup = mode === 'signup';
  return shell(
    'account',
    `
    <header class="page-head">
      <p class="eyebrow">${icon('lock')} ${t('acct.eyebrow')}</p>
      <h1>${signup ? t('acct.saveTitle') : t('acct.welcomeBack')}</h1>
      <p class="lede">${signup ? t('acct.saveSub') : t('acct.signinSub')}</p>
    </header>
    <div class="seg" role="tablist">
      <a href="#/account/signup" role="tab" aria-selected="${signup}" class="${signup ? 'active' : ''}">${t('acct.create')}</a>
      <a href="#/account/login" role="tab" aria-selected="${!signup}" class="${signup ? '' : 'active'}">${t('acct.signin')}</a>
    </div>
    <form id="auth-form" class="form card" data-mode="${mode}" novalidate>
      ${signup ? `<label>${t('acct.name')} <span class="muted">${t('acct.optional')}</span><input name="displayName" autocomplete="given-name" maxlength="50"></label>` : ''}
      <label>${t('acct.email')}<input type="email" name="email" required autocomplete="email" inputmode="email"></label>
      <label>${t('acct.password')}<input type="password" name="password" required minlength="${signup ? 8 : 1}"
        autocomplete="${signup ? 'new-password' : 'current-password'}">
        ${signup ? `<span class="muted small">${t('acct.passwordHint')}</span>` : ''}</label>
      <div id="turnstile"></div>
      <p class="form-error" role="alert"></p>
      <button class="btn btn-primary btn-block">${signup ? t('acct.create') : t('acct.signin')}</button>
    </form>
    ${settingsHtml()}`,
  );
}

// --- Onboarding -------------------------------------------------------------------

const ob = { step: 0, motivation: null, goal: 20 };

function onboardingScreen() {
  const steps = ['welcome', 'lang', 'why', 'goal', 'level'];
  const step = steps[ob.step];
  const progress = `<div class="ob-progress"><span style="width:${(ob.step / (steps.length - 1)) * 100}%"></span></div>`;
  const back = ob.step > 0 ? `<button type="button" class="icon-btn ob-back" aria-label="${t('common.back')}">${icon('back')}</button>` : '';

  const bodies = {
    welcome: `
      <div class="ob-hero">
        <div class="ob-mark">${brandMark()}</div>
        <p class="eyebrow">Mbote!</p>
        <h1>${t('ob.welcomeTitle')}</h1>
        <p class="lede">${t('ob.welcomeSub')}</p>
        <ul class="ob-points">
          <li>${icon('target')} ${t('ob.point1')}</li>
          <li>${icon('chat')} ${t('ob.point2')}</li>
          <li>${icon('flame')} ${t('ob.point3')}</li>
        </ul>
      </div>
      <div class="ob-actions">
        <button type="button" class="btn btn-primary btn-block" data-next>${t('ob.getStarted')}</button>
        <a href="#/account/login" class="btn btn-ghost btn-block" data-skip>${t('ob.haveAccount')}</a>
      </div>`,
    lang: `
      <h1>${t('ob.langTitle')}</h1>
      <p class="lede">${t('ob.langSub')}</p>
      <div class="ob-options">
        ${Object.entries(LANGS)
          .map(([id, l]) => `<button type="button" class="ob-option ${id === getLang() ? 'selected' : ''}" data-lang="${id}">
            <span class="ob-flag">${l.badge}</span><span><b>${l.native}</b><small>${l.hint}</small></span></button>`)
          .join('')}
      </div>
      <p class="muted small">${t('ob.moreLangs')}</p>`,
    why: `
      <h1>${t('ob.whyTitle')}</h1>
      <p class="lede">${t('ob.whySub')}</p>
      <div class="ob-options grid-2">
        ${MOTIVATIONS.map(
          (m) => `<button type="button" class="ob-option ${ob.motivation === m ? 'selected' : ''}" data-why="${m}">
            <span class="ob-flag">${t(`mot.icon.${m}`)}</span><span><b>${t(`mot.${m}`)}</b></span></button>`,
        ).join('')}
      </div>`,
    goal: `
      <h1>${t('ob.goalTitle')}</h1>
      <p class="lede">${t('ob.goalSub')}</p>
      <div class="ob-options">
        ${GOALS.map(
          (g) => `<button type="button" class="ob-option ${ob.goal === g ? 'selected' : ''}" data-goal="${g}">
            <span class="ob-flag">${g}</span><span><b>${t(`goal.name.${g}`)}</b><small>${t(`goal.${g}`)}</small></span></button>`,
        ).join('')}
      </div>
      <p class="muted small">${t('ob.goalPace', { when: weeksText(daysToLevel(CONVERSATIONAL, store.getCard, ob.goal)) })}</p>`,
    level: `
      <h1>${t('ob.levelTitle')}</h1>
      <p class="lede">${t('ob.levelSub')}</p>
      <div class="ob-options">
        <button type="button" class="ob-option" data-start="new"><span class="ob-flag">${icon('learn')}</span>
          <span><b>${t('ob.new')}</b><small>${t('ob.newSub')}</small></span></button>
        <button type="button" class="ob-option" data-start="some"><span class="ob-flag">${icon('trophy')}</span>
          <span><b>${t('ob.some')}</b><small>${t('ob.someSub')}</small></span></button>
      </div>`,
  };

  const nextDisabled = (step === 'why' && !ob.motivation) || step === 'level';
  return `
    <div class="onboard">
      <div class="ob-top">${back}${ob.step > 0 ? progress : ''}</div>
      <div class="ob-body ob-${step}">${bodies[step]}</div>
      ${
        step === 'welcome' || step === 'level'
          ? ''
          : `<div class="ob-foot"><button type="button" class="btn btn-primary btn-block" data-next ${nextDisabled ? 'disabled' : ''}>${t('btn.continue')}</button></div>`
      }
    </div>`;
}

function wireOnboarding() {
  const go = (delta) => {
    ob.step += delta;
    render();
  };
  app.querySelector('.ob-back')?.addEventListener('click', () => go(-1));
  app.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => go(1)));
  app.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => {
      setLang(b.dataset.lang);
      store.setBaseLang(b.dataset.lang).catch(() => {});
      render();
    }),
  );
  app.querySelectorAll('[data-why]').forEach((b) =>
    b.addEventListener('click', () => {
      ob.motivation = b.dataset.why;
      render();
    }),
  );
  app.querySelectorAll('[data-goal]').forEach((b) =>
    b.addEventListener('click', () => {
      ob.goal = Number(b.dataset.goal);
      render();
    }),
  );
  app.querySelectorAll('[data-start]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!store.baseLang()) store.setBaseLang(getLang()).catch(() => {});
      store.finishOnboarding({ motivation: ob.motivation, goal: ob.goal });
      location.hash = b.dataset.start === 'new' ? `#/lesson/${COURSE[0].id}` : `#/checkpoint/${LEVELS[0].id}`;
    }),
  );
}

const needsOnboarding = () => !store.onboarded() && !store.user() && store.allCards().length === 0;

// --- Screen behaviour -----------------------------------------------------------------

let turnstileWidget = null;

function loadTurnstile() {
  if (!config.turnstileSiteKey || !document.getElementById('turnstile')) return;
  const renderWidget = () => {
    turnstileWidget = window.turnstile.render('#turnstile', { sitekey: config.turnstileSiteKey });
  };
  if (window.turnstile) return renderWidget();
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  s.async = true;
  s.onload = renderWidget;
  document.head.appendChild(s);
}

function wireSettings() {
  document.querySelectorAll('.lang-seg [data-lang]').forEach((b) =>
    b.addEventListener('click', async () => {
      setLang(b.dataset.lang);
      refreshNetBar();
      await store.setBaseLang(b.dataset.lang).catch((err) => alert(err.message));
      render();
    }),
  );
  document.querySelectorAll('.goal').forEach((b) =>
    b.addEventListener('click', async () => {
      await store.setGoal(Number(b.dataset.goal)).catch((err) => alert(err.message));
      render();
    }),
  );
}

function wireAccount() {
  wireSettings();
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    loadTurnstile();
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = authForm.querySelector('.form-error');
      const btn = authForm.querySelector('button');
      const data = Object.fromEntries(new FormData(authForm));
      data.baseLang = getLang();
      data.dailyGoal = store.dailyGoal();
      if (window.turnstile && turnstileWidget != null) data.turnstileToken = window.turnstile.getResponse(turnstileWidget);
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const path = authForm.dataset.mode === 'signup' ? 'auth/signup' : 'auth/login';
        const { user } = await api(path, { method: 'POST', body: data });
        await store.signedIn(user).catch(() => {});
        setLang(store.baseLang());
        location.hash = '#/';
      } catch (err) {
        errEl.textContent = err.message;
        if (window.turnstile && turnstileWidget != null) window.turnstile.reset(turnstileWidget);
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.getElementById('signout')?.addEventListener('click', async () => {
    if (store.hasUnsynced() && !navigator.onLine && !confirm(t('acct.offlineSignout'))) return;
    await store.signOut();
    clearChats(); // conversations and recent translations are private to the learner
    clearRecent();
    location.hash = '#/';
  });

  const del = document.getElementById('delete-form');
  del?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm(t('acct.deleteConfirm'))) return;
    try {
      await store.deleteAccount(new FormData(del).get('password'));
      clearChats();
      clearRecent();
      location.hash = '#/';
    } catch (err) {
      del.querySelector('.form-error').textContent = err.message;
    }
  });
}

function wireBubbles() {
  document.querySelectorAll('.screen .bubble').forEach((b) => b.addEventListener('click', () => b.classList.toggle('revealed')));
}

function startSession(session) {
  document.body.classList.add('in-session');
  stopSession = runSession(app, session, {
    onExit: () => {
      endSession();
      goHome();
    },
    onFinish: (summary) => {
      stopSession = null;
      store.sync().catch(() => {});
      showSummary(summary);
    },
  });
}

function endSession() {
  stopSession?.();
  stopSession = null;
  document.body.classList.remove('in-session');
}

function summaryHeadline(s) {
  if (s.checkpoint) {
    return s.checkpoint.passed
      ? ['trophy', t('sum.levelPassed', { n: levelNumber(s.checkpoint.level) })]
      : ['target', t('sum.notYet')];
  }
  if (s.kind === 'conversation') return ['chat', t('sum.conversationDone')];
  return s.perfect ? ['trophy', t('sum.perfect')] : ['check', t('sum.done')];
}

function summaryText(s) {
  if (s.checkpoint) {
    const { passed, level, testedOut } = s.checkpoint;
    const title = esc(levelText(level).title);
    if (!passed) return t('sum.failCheckpoint', { level: title });
    return testedOut ? t('sum.testedOut', { level: title, n: testedOut }) : t('sum.proved', { level: title });
  }
  if (s.kind === 'conversation') return t('sum.conversationSub');
  const learned = s.learned ? tn('sum.learned', s.learned) : '';
  const reviewed = s.reviewed ? tn('sum.reviewed', s.reviewed) : '';
  return `${[learned, reviewed].filter(Boolean).join(' · ')}. ${t('sum.comeBack')}`;
}

function showSummary(s) {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const goalJustHit = xp >= goal && xp - s.xp < goal;
  const [ic, title] = summaryHeadline(s);
  app.innerHTML = `
    <div class="summary">
      <div class="summary-badge ${s.checkpoint && !s.checkpoint.passed ? 'muted' : ''}">${icon(ic)}</div>
      <h1>${title}</h1>
      ${goalJustHit ? `<p class="goal-hit">${icon('flame')} ${t('sum.goalHit', { n: store.streak() })}</p>` : ''}
      <div class="summary-stats">
        <div class="stat"><b>+${s.xp}</b><span>XP</span></div>
        <div class="stat"><b>${s.accuracy}%</b><span>${t('sum.accuracy')}</span></div>
        <div class="stat"><b>${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, '0')}</b><span>${t('sum.time')}</span></div>
      </div>
      <p class="muted">${summaryText(s)}</p>
      ${!store.user() ? `<a href="#/account" class="callout callout-save">${icon('lock')}<span><strong>${t('sum.saveTitle')}</strong><small>${t('home.saveSub')}</small></span>${icon('forward')}</a>` : ''}
      <button type="button" class="btn btn-primary btn-block" id="summary-continue">${t('btn.continue')}</button>
    </div>`;
  document.getElementById('summary-continue').addEventListener('click', goHome);
}

// Replace (not push) the session URL so the back button doesn't restart it.
function goHome() {
  history.replaceState(null, '', '#/');
  render();
}

// --- Router -----------------------------------------------------------------------

function render() {
  if (stopSession) return; // don't redraw underneath a running session
  const [, route = '', arg] = location.hash.split('/');
  document.body.classList.remove('in-session');

  if (route === 'lesson' && UNIT_BY_ID.has(arg)) return startSession(buildLesson(arg, store.getCard));
  if (route === 'talk' && UNIT_BY_ID.get(arg)?.dialogue) return startSession(buildConversation(arg, store.getCard));
  if (route === 'checkpoint' && LEVEL_BY_ID.has(arg)) return startSession(buildCheckpoint(arg));
  if (route === 'session' && arg === 'review') {
    const session = buildDueReview(store.getCard);
    if (session.steps.length) return startSession(session);
    location.hash = '#/review';
    return;
  }
  if (route === 'chat' && isScenario(arg) && config.aiEnabled && store.user()) {
    document.body.classList.add('in-session');
    stopSession = mountChat(app, arg, {
      onExit: () => {
        endSession();
        history.replaceState(null, '', '#/chat');
        render();
      },
    });
    return;
  }
  if (needsOnboarding() && route !== 'account') {
    document.body.classList.add('in-session');
    app.innerHTML = onboardingScreen();
    wireOnboarding();
    return;
  }

  app.innerHTML =
    route === 'unit' ? unitScreen(arg)
    : route === 'level' ? levelScreen(arg)
    : route === 'review' ? reviewScreen()
    : route === 'chat' ? chatScreen()
    : route === 'translate' || route === 'phrases' ? translateScreen()
    : route === 'account' ? accountScreen(arg === 'login' ? 'login' : 'signup')
    : homeScreen();

  if (route === 'account') wireAccount();
  if (route === 'translate' || route === 'phrases') wireTranslate(app, { rerender: render });
  if (route === 'unit') wireBubbles();
  document.title = `${t(`title.${route || 'learn'}`)} · Learn Lingala`;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  if (stopSession) endSession(); // back button during a session leaves it
  render();
});
store.subscribe(() => {
  const status = document.getElementById('sync-status');
  if (status) status.innerHTML = store.hasUnsynced() ? t('acct.syncing') : `${icon('check')} ${t('acct.synced')}`;
});

// Sync when the app is backgrounded or comes back online.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.sync({ keepalive: true }).catch(() => {});
});
window.addEventListener('online', () => {
  store.sync().catch(() => {});
  if (config.aiEnabled === null) loadConfig(); // it couldn't be fetched while offline
});
window.addEventListener('offline', () => {
  if (location.hash.split('/')[1] === 'chat' && !stopSession) render(); // show the offline notice
});

// Install the app: the card's buttons, and redraw when the browser says it can (or did) install.
const refreshNetBar = initOfflineBanner();
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-install]')) promptInstall();
  const close = e.target.closest('[data-install-dismiss]');
  if (close) {
    dismissInstall();
    close.closest('.install-card')?.remove();
  }
});
onInstallChange(() => {
  const route = location.hash.split('/')[1] || '';
  if (!stopSession && !document.querySelector('.summary, .onboard') && (route === '' || route === 'account')) render();
});

render();
store.refreshUser().then(() => {
  if (store.baseLang() && store.baseLang() !== getLang()) setLang(store.baseLang());
  if (!stopSession && !document.querySelector('.summary, .onboard')) render();
});
function loadConfig() {
  return api('config')
    .then((c) => {
      config = { ...c, aiEnabled: c.aiEnabled ?? c.chatEnabled };
      const route = location.hash.split('/')[1];
      if ((route === 'chat' || route === 'translate') && !stopSession) render(); // AI availability is now known
    })
    .catch((err) => {
      // Offline: leave it unknown and try again when the connection returns.
      if (err.status !== 0) config = { ...config, aiEnabled: false };
    });
}
loadConfig();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
}
