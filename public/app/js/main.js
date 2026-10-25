// App shell: hash routing and the non-lesson screens.

import { LEVELS, LEVEL_BY_ID, UNIT_BY_ID, COURSE, ITEMS } from './course.js';
import { isLearned, isMastered, recall } from './srs.js';
import { normalize } from './answer.js';
import {
  buildLesson, buildDueReview, buildConversation, buildCheckpoint,
  currentUnit, unitProgress, levelProgress, dueItems, daysToLevel,
} from './lesson.js';
import { runSession } from './player.js';
import { api } from './api.js';
import * as store from './store.js';

const app = document.getElementById('app');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CONVERSATIONAL = 'conversations'; // the level that marks "conversational"

let config = { turnstileSiteKey: null };
let stopSession = null;

// --- Layout -------------------------------------------------------------------

function shell(active, content) {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const pct = Math.min(100, Math.round((xp / goal) * 100));
  const s = store.streak();
  const u = store.user();
  const due = dueItems(store.getCard).length;
  const tab = (key, href, icon, label, extra = '') =>
    `<a href="${href}" class="${active === key ? 'active' : ''}"><span aria-hidden="true">${icon}</span>${label}${extra}</a>`;
  return `
    <header class="topbar">
      <a href="/" class="brand">Learn<span>Lingala</span></a>
      <div class="topbar-stats">
        <span class="chip ${s ? 'chip-fire' : ''}" title="Day streak">🔥 ${s}</span>
        <span class="chip" title="Today's XP toward your daily goal">
          <span class="ring" style="--p:${pct}"></span>${xp}/${goal} XP
        </span>
      </div>
    </header>
    <main class="screen">${content}</main>
    <nav class="tabbar" aria-label="Main">
      ${tab('learn', '#/', '📚', 'Learn')}
      ${tab('review', '#/review', '🔁', 'Review', due ? `<b class="dot">${due}</b>` : '')}
      ${tab('phrases', '#/phrases', '🗂️', 'Phrases')}
      ${tab('account', '#/account', u ? '👤' : '☁️', u ? 'Account' : 'Save')}
    </nav>`;
}

function weeksText(days) {
  if (days <= 0) return 'now';
  if (days < 14) return `in about ${days} day${days === 1 ? '' : 's'}`;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `in about ${Math.round(days / 7)} weeks — around ${d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

const currentLevel = () => LEVEL_BY_ID.get(currentUnit(store.getCard).level);

// --- Screens ------------------------------------------------------------------

function unitRow(un, isCurrent) {
  const p = unitProgress(un, store.getCard);
  const mastered = un.items.filter((i) => isMastered(store.getCard(i.id))).length;
  return `
    <a href="#/unit/${un.id}" class="unit-row ${p.done ? 'done' : ''} ${isCurrent ? 'current' : ''}">
      <span class="unit-emoji" aria-hidden="true">${un.emoji}</span>
      <span class="unit-text">
        <span class="unit-title">${esc(un.title)} ${isCurrent ? '<span class="badge">Up next</span>' : ''}</span>
        <span class="unit-sub" lang="ln">${esc(un.lg)}${un.dialogue ? ' · 💬' : ''}</span>
        <span class="meter"><span style="width:${(p.learned / p.total) * 100}%"></span></span>
      </span>
      <span class="unit-count">${p.done ? (mastered === p.total ? '⭐' : '✓') : `${p.learned}/${p.total}`}</span>
    </a>`;
}

function pathCard() {
  const level = currentLevel();
  const idx = LEVELS.indexOf(level);
  const conversational = LEVELS.slice(0, LEVELS.findIndex((l) => l.id === CONVERSATIONAL) + 1).every(
    (l) => levelProgress(l.id, store.getCard).done,
  );
  const days = daysToLevel(CONVERSATIONAL, store.getCard, store.dailyGoal());
  return `
    <section class="card path">
      <div class="path-head">
        <span class="path-kicker">Your path to conversational</span>
        <a href="#/level/${level.id}" class="path-link">Level ${idx + 1} of ${LEVELS.length} →</a>
      </div>
      <div class="path-steps">
        ${LEVELS.map((l, i) => {
          const p = levelProgress(l.id, store.getCard);
          const state = p.done ? 'done' : l === level ? 'now' : '';
          return `<a href="#/level/${l.id}" class="path-step ${state}" title="${esc(l.title)}">
            <span class="path-dot">${p.done ? '✓' : i + 1}</span>
            <span class="path-name">${esc(l.title)}</span>
            <span class="path-bar"><span style="width:${(p.learned / p.total) * 100}%"></span></span>
          </a>`;
        }).join('')}
      </div>
      <p class="path-eta">${
        conversational
          ? "🎉 You've reached conversational level. Now sound like a local with <strong>Mwana mboka</strong>."
          : `At your ${store.dailyGoal()} XP/day goal, you'll finish <strong>Level 4 · Conversations</strong> ${weeksText(days)}.
             <a href="#/account">Change goal</a>`
      }</p>
    </section>`;
}

function homeScreen() {
  const unit = currentUnit(store.getCard);
  const prog = unitProgress(unit, store.getCard);
  const level = currentLevel();
  const due = dueItems(store.getCard).length;
  const learned = ITEMS.filter((i) => isLearned(store.getCard(i.id))).length;
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const u = store.user();
  const greeting = u?.displayName ? `Mbote, ${esc(u.displayName)}!` : 'Mbote!';

  const levels = LEVELS.map((l, i) => {
    const p = levelProgress(l.id, store.getCard);
    return `
      <details class="level" ${l === level ? 'open' : ''}>
        <summary>
          <span class="level-num ${p.done ? 'done' : ''}">${p.done ? '✓' : i + 1}</span>
          <span class="level-text">
            <span class="level-title">${esc(l.title)}</span>
            <span class="level-sub">${esc(l.subtitle)} · ${esc(l.cefr)}</span>
          </span>
          <span class="unit-count">${p.learned}/${p.total}</span>
        </summary>
        <div class="units">${l.units.map((id) => unitRow(UNIT_BY_ID.get(id), UNIT_BY_ID.get(id) === unit && !prog.done)).join('')}</div>
        <a href="#/level/${l.id}" class="level-more">Goals & checkpoint for this level →</a>
      </details>`;
  }).join('');

  return shell(
    'learn',
    `
    <section class="hello">
      <h1>${greeting}</h1>
      <p class="muted">${
        xp >= goal
          ? 'Daily goal done — malamu mingi! Extra practice now makes tomorrow easier.'
          : `${goal - xp} XP to today's goal. A lesson takes about 3 minutes.`
      }</p>
    </section>

    <a href="#/lesson/${unit.id}" class="hero-card">
      <span class="hero-emoji" aria-hidden="true">${unit.emoji}</span>
      <span class="hero-text">
        <span class="hero-kicker">${prog.done ? 'Practice' : learned ? 'Continue' : 'Start here'} · Level ${LEVELS.indexOf(level) + 1}</span>
        <span class="hero-title">${esc(unit.title)}</span>
        <span class="hero-sub">${prog.learned}/${prog.total} learned</span>
      </span>
      <span class="hero-go" aria-hidden="true">→</span>
    </a>

    ${
      due
        ? `<a href="#/session/review" class="review-card">
            <strong>🔁 ${due} ${due === 1 ? 'phrase is' : 'phrases are'} ready to review</strong>
            <span>Reviewing at the right moment locks them into long-term memory.</span>
          </a>`
        : ''
    }

    ${pathCard()}

    <section class="stats-row">
      <div class="stat"><b>${learned}</b><span>phrases learned</span></div>
      <div class="stat"><b>${ITEMS.filter((i) => isMastered(store.getCard(i.id))).length}</b><span>mastered</span></div>
      <div class="stat"><b>${store.totalXp()}</b><span>total XP</span></div>
    </section>

    ${
      !u && learned
        ? `<a href="#/account" class="save-banner">☁️ <span><strong>Save your progress.</strong> Create a free account to keep your streak and sync across devices.</span></a>`
        : ''
    }

    <h2 class="section-title">Course</h2>
    <div class="levels">${levels}</div>

    <p class="footnote">Reference guides: <a href="/alphabet.html">The alphabet</a> · <a href="/sentences.html">Sentence structure</a></p>`,
  );
}

function levelScreen(id) {
  const level = LEVEL_BY_ID.get(id);
  if (!level) return homeScreen();
  const idx = LEVELS.indexOf(level);
  const p = levelProgress(id, store.getCard);
  const next = level.units.map((u) => UNIT_BY_ID.get(u)).find((u) => !unitProgress(u, store.getCard).done);
  return shell(
    'learn',
    `
    <a href="#/" class="back">← Course</a>
    <p class="kicker">Level ${idx + 1} · ${esc(level.cefr)} · ${esc(level.weeks)}</p>
    <h1>${esc(level.title)}</h1>
    <p class="muted">${esc(level.subtitle)} · ${p.learned}/${p.total} phrases learned</p>
    <div class="meter meter-lg"><span style="width:${(p.learned / p.total) * 100}%"></span></div>

    <h2 class="section-title">By the end of this level you can…</h2>
    <ul class="can-do card">${level.canDo.map((c) => `<li class="${p.done ? 'done' : ''}">${esc(c)}</li>`).join('')}</ul>

    ${next ? `<a href="#/lesson/${next.id}" class="btn btn-primary btn-block">${p.learned ? 'Continue' : 'Start'}: ${esc(next.title)}</a>` : ''}

    <div class="card checkpoint-card">
      <strong>🎯 Level checkpoint</strong>
      <p class="muted small">${
        p.done
          ? 'Prove it: a mixed test of this level with no hints. Score 80% to earn the level badge.'
          : 'Already know some of this? Score 80% on a mixed test to skip ahead — everything in this level is added to your reviews.'
      }</p>
      <a href="#/checkpoint/${level.id}" class="btn btn-secondary btn-block">${p.done ? 'Take the checkpoint' : 'Test out of this level'}</a>
    </div>

    <h2 class="section-title">Units</h2>
    <div class="units">${level.units.map((u) => unitRow(UNIT_BY_ID.get(u), UNIT_BY_ID.get(u) === next)).join('')}</div>`,
  );
}

function strengthLabel(card) {
  if (!isLearned(card)) return ['new', 'New'];
  if (isMastered(card)) return ['mastered', 'Mastered'];
  const r = recall(card);
  if (r < 0.6) return ['weak', 'Needs review'];
  if (r < 0.85) return ['ok', 'Learning'];
  return ['strong', 'Strong'];
}

function wordRow(i, { strength = true } = {}) {
  const [cls, label] = strengthLabel(store.getCard(i.id));
  return `<li class="word">
    <span class="word-lg" lang="ln">${esc(i.lg)} ${i.local ? '<span class="badge badge-local">local</span>' : ''}</span>
    <span class="word-en">${esc(i.en)}</span>
    ${strength ? `<span class="strength strength-${cls}">${label}</span>` : ''}
  </li>`;
}

function chat(lines) {
  return `<div class="chat">${lines
    .map(
      (l) => `<button type="button" class="bubble bubble-${l.who}">
        <span class="bubble-who">${l.who === 'you' ? 'You' : 'Them'}</span>
        <span class="bubble-lg" lang="ln">${esc(l.lg)}</span>
        <span class="bubble-en">${esc(l.en)}</span></button>`,
    )
    .join('')}</div>`;
}

function unitScreen(id) {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) return homeScreen();
  const level = LEVEL_BY_ID.get(unit.level);
  const p = unitProgress(unit, store.getCard);
  return shell(
    'learn',
    `
    <a href="#/level/${level.id}" class="back">← Level ${LEVELS.indexOf(level) + 1} · ${esc(level.title)}</a>
    <h1 class="unit-h1"><span aria-hidden="true">${unit.emoji}</span> ${esc(unit.title)}</h1>
    <p class="muted"><span lang="ln">${esc(unit.lg)}</span> · ${p.learned}/${p.total} learned</p>
    <a href="#/lesson/${unit.id}" class="btn btn-primary btn-block">${p.done ? 'Practice this unit' : p.learned ? 'Continue lesson' : 'Start lesson'}</a>
    <h2 class="section-title">How it works</h2>
    <div class="notes card">${unit.intro}</div>
    ${
      unit.dialogue
        ? `<h2 class="section-title">💬 Conversation: ${esc(unit.dialogue.title)}</h2>
           <p class="muted small">${esc(unit.dialogue.setting)} Tap a line for the English.</p>
           ${chat(unit.dialogue.lines)}
           <a href="#/talk/${unit.id}" class="btn btn-secondary btn-block">🎭 Role-play this conversation</a>`
        : ''
    }
    <h2 class="section-title">Phrases</h2>
    <ul class="word-list">${unit.items.map((i) => wordRow(i)).join('')}</ul>`,
  );
}

function reviewScreen() {
  const due = dueItems(store.getCard);
  const cards = ITEMS.map((i) => store.getCard(i.id)).filter(isLearned);
  const buckets = { weak: 0, ok: 0, strong: 0, mastered: 0 };
  for (const c of cards) buckets[strengthLabel(c)[0]]++;
  const days = store.xpByDay();
  const week = [...Array(7)].map((_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - k));
    const xp = days[store.today(d)] || 0;
    const h = Math.min(100, Math.round((xp / store.dailyGoal()) * 100));
    return `<div class="day"><span class="day-bar"><span style="height:${h}%"></span></span>
      <span class="day-label">${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span></div>`;
  });
  const talkable = COURSE.filter((u) => u.dialogue && unitProgress(u, store.getCard).learned > 0);

  return shell(
    'review',
    `
    <h1>Review</h1>
    ${
      cards.length === 0
        ? `<div class="card empty"><p>Nothing to review yet. Finish your first lesson and your phrases will show up here, scheduled right before you'd forget them.</p>
           <a href="#/" class="btn btn-primary">Start learning</a></div>`
        : `<div class="card">
            <p class="big-number">${due.length}</p>
            <p class="muted">${due.length ? `phrase${due.length === 1 ? '' : 's'} due now` : 'Nothing due — you’re all caught up!'}</p>
            <a href="#/session/review" class="btn btn-primary btn-block">${due.length ? 'Start review' : 'Practice weakest phrases'}</a>
          </div>
          <h2 class="section-title">Memory strength</h2>
          <div class="strength-grid">
            <div class="sg sg-weak"><b>${buckets.weak}</b>Needs review</div>
            <div class="sg sg-ok"><b>${buckets.ok}</b>Learning</div>
            <div class="sg sg-strong"><b>${buckets.strong}</b>Strong</div>
            <div class="sg sg-mastered"><b>${buckets.mastered}</b>Mastered</div>
          </div>`
    }
    ${
      talkable.length
        ? `<h2 class="section-title">🎭 Practise conversations</h2>
           <div class="units">${talkable
             .map((u) => `<a href="#/talk/${u.id}" class="unit-row"><span class="unit-emoji">${u.emoji}</span>
               <span class="unit-text"><span class="unit-title">${esc(u.dialogue.title)}</span>
               <span class="unit-sub">${esc(u.title)}</span></span><span class="unit-count">→</span></a>`)
             .join('')}</div>`
        : ''
    }
    <h2 class="section-title">Last 7 days</h2>
    <div class="card week">${week.join('')}</div>
    <p class="footnote">How this works: each phrase is scheduled with spaced repetition. Get it right and the gap before
    the next review grows (1 day → 3 → a week → a month…). Miss it and it comes back sooner.</p>`,
  );
}

let phraseQuery = '';
let phraseFilter = 'all';

function phraseList() {
  const q = normalize(phraseQuery);
  const groups = COURSE.map((u) => {
    const rows = u.items.filter(
      (i) =>
        (phraseFilter !== 'local' || i.local) &&
        (phraseFilter !== 'learned' || isLearned(store.getCard(i.id))) &&
        (!q || normalize(i.lg).includes(q) || normalize(i.en).includes(q)),
    );
    return rows.length
      ? `<h3 class="phrase-group">${u.emoji} ${esc(u.title)}</h3><ul class="word-list">${rows.map((i) => wordRow(i, { strength: false })).join('')}</ul>`
      : '';
  }).join('');
  return groups || '<p class="muted">No phrases match.</p>';
}

function phrasesScreen() {
  return shell(
    'phrases',
    `
    <h1>Phrasebook</h1>
    <p class="muted">Every phrase in the course — search in English or Lingala.</p>
    <input type="search" id="phrase-search" class="search" placeholder="Search: hungry, taxi, mbote…" value="${esc(phraseQuery)}" aria-label="Search phrases">
    <div class="filters" role="group" aria-label="Filter">
      ${[['all', 'All'], ['local', '🇨🇩 Sounds local'], ['learned', 'Learned']]
        .map(([k, label]) => `<button type="button" class="filter ${phraseFilter === k ? 'active' : ''}" data-filter="${k}">${label}</button>`)
        .join('')}
    </div>
    <div id="phrase-list">${phraseList()}</div>`,
  );
}

function accountScreen(mode = 'signup') {
  const u = store.user();
  const goal = store.dailyGoal();
  const goalPicker = `
    <h2 class="section-title">Daily goal</h2>
    <div class="goal-picker" role="radiogroup" aria-label="Daily goal">
      ${[10, 20, 30, 50]
        .map(
          (g) => `<button type="button" role="radio" aria-checked="${g === goal}" class="goal ${g === goal ? 'selected' : ''}" data-goal="${g}">
            <b>${g} XP</b><span>${{ 10: 'Casual · ~5 min', 20: 'Regular · ~10 min', 30: 'Serious · ~15 min', 50: 'Intense · ~25 min' }[g]}</span></button>`,
        )
        .join('')}
    </div>
    <p class="muted small">At this pace you'll finish Level 4 · Conversations ${weeksText(daysToLevel(CONVERSATIONAL, store.getCard, goal))}.</p>`;

  if (u) {
    return shell(
      'account',
      `
      <h1>Account</h1>
      <div class="card">
        <p><strong>${esc(u.displayName || 'Learner')}</strong></p>
        <p class="muted">${esc(u.email)}</p>
        <p class="muted small" id="sync-status">${store.hasUnsynced() ? 'Changes waiting to sync…' : 'All progress synced ✓'}</p>
      </div>
      ${goalPicker}
      <button type="button" class="btn btn-secondary btn-block" id="signout">Sign out</button>
      <details class="danger-zone">
        <summary>Delete account</summary>
        <form id="delete-form" class="form">
          <p class="muted small">This permanently deletes your account and all progress.</p>
          <label>Confirm with your password<input type="password" name="password" required autocomplete="current-password"></label>
          <p class="form-error" role="alert"></p>
          <button class="btn btn-danger btn-block">Delete my account</button>
        </form>
      </details>`,
    );
  }

  const signup = mode === 'signup';
  return shell(
    'account',
    `
    <h1>${signup ? 'Save your progress' : 'Welcome back'}</h1>
    <p class="muted">${
      signup
        ? 'Your progress is saved on this device. Create a free account to keep your streak safe and learn on any device.'
        : 'Sign in to sync your progress.'
    }</p>
    <div class="seg" role="tablist">
      <a href="#/account/signup" role="tab" aria-selected="${signup}" class="${signup ? 'active' : ''}">Create account</a>
      <a href="#/account/login" role="tab" aria-selected="${!signup}" class="${signup ? '' : 'active'}">Sign in</a>
    </div>
    <form id="auth-form" class="form card" data-mode="${mode}" novalidate>
      ${signup ? '<label>Your name <span class="muted">(optional)</span><input name="displayName" autocomplete="given-name" maxlength="50"></label>' : ''}
      <label>Email<input type="email" name="email" required autocomplete="email" inputmode="email"></label>
      <label>Password<input type="password" name="password" required minlength="${signup ? 8 : 1}"
        autocomplete="${signup ? 'new-password' : 'current-password'}">
        ${signup ? '<span class="muted small">At least 8 characters.</span>' : ''}</label>
      <div id="turnstile"></div>
      <p class="form-error" role="alert"></p>
      <button class="btn btn-primary btn-block">${signup ? 'Create account' : 'Sign in'}</button>
    </form>
    ${goalPicker}`,
  );
}

// --- Screen behaviour ---------------------------------------------------------

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

function wireAccount() {
  const authForm = document.getElementById('auth-form');
  if (authForm) {
    loadTurnstile();
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = authForm.querySelector('.form-error');
      const btn = authForm.querySelector('button');
      const data = Object.fromEntries(new FormData(authForm));
      if (window.turnstile && turnstileWidget != null) data.turnstileToken = window.turnstile.getResponse(turnstileWidget);
      errEl.textContent = '';
      btn.disabled = true;
      try {
        const path = authForm.dataset.mode === 'signup' ? 'auth/signup' : 'auth/login';
        const { user } = await api(path, { method: 'POST', body: data });
        await store.signedIn(user).catch(() => {});
        location.hash = '#/';
      } catch (err) {
        errEl.textContent = err.message;
        if (window.turnstile && turnstileWidget != null) window.turnstile.reset(turnstileWidget);
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.querySelectorAll('.goal').forEach((b) =>
    b.addEventListener('click', async () => {
      await store.setGoal(Number(b.dataset.goal)).catch((err) => alert(err.message));
      render();
    }),
  );

  document.getElementById('signout')?.addEventListener('click', async () => {
    if (store.hasUnsynced() && !navigator.onLine && !confirm("You're offline and some progress hasn't synced. Sign out anyway?")) return;
    await store.signOut();
    location.hash = '#/';
  });

  const del = document.getElementById('delete-form');
  del?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!confirm('Delete your account and all progress permanently?')) return;
    try {
      await store.deleteAccount(new FormData(del).get('password'));
      location.hash = '#/';
    } catch (err) {
      del.querySelector('.form-error').textContent = err.message;
    }
  });
}

function wirePhrases() {
  const input = document.getElementById('phrase-search');
  const list = document.getElementById('phrase-list');
  input.addEventListener('input', () => {
    phraseQuery = input.value;
    list.innerHTML = phraseList();
  });
  document.querySelectorAll('.filter').forEach((b) =>
    b.addEventListener('click', () => {
      phraseFilter = b.dataset.filter;
      document.querySelectorAll('.filter').forEach((x) => x.classList.toggle('active', x === b));
      list.innerHTML = phraseList();
    }),
  );
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
      ? ['🏅', `Level ${LEVELS.indexOf(s.checkpoint.level) + 1} passed!`]
      : ['💪', 'Not quite yet'];
  }
  if (s.kind === 'conversation') return ['🎭', 'Conversation complete!'];
  return s.perfect ? ['🏆', 'Perfect lesson!'] : ['🎉', 'Lesson complete!'];
}

function summaryText(s) {
  if (s.checkpoint) {
    const { passed, level, testedOut } = s.checkpoint;
    if (!passed) return `You need 80% to pass <strong>${esc(level.title)}</strong>. Keep doing lessons and reviews — then try again.`;
    return testedOut
      ? `You tested out of <strong>${esc(level.title)}</strong>. ${testedOut} phrases were added to your reviews to lock them in.`
      : `You've proven you can handle <strong>${esc(level.title)}</strong>. Malamu mingi!`;
  }
  if (s.kind === 'conversation') return 'Role-playing real conversations is the fastest way to make phrases come out automatically.';
  return s.learned
    ? `You learned <strong>${s.learned}</strong> new ${s.learned === 1 ? 'phrase' : 'phrases'}${s.reviewed ? ` and reviewed ${s.reviewed}` : ''}. They'll come back right before you'd forget them.`
    : `You reviewed <strong>${s.reviewed}</strong> ${s.reviewed === 1 ? 'phrase' : 'phrases'}. They'll come back right before you'd forget them.`;
}

function showSummary(s) {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const goalJustHit = xp >= goal && xp - s.xp < goal;
  const [emoji, title] = summaryHeadline(s);
  app.innerHTML = `
    <div class="summary">
      <div class="summary-emoji" aria-hidden="true">${emoji}</div>
      <h1>${title}</h1>
      ${goalJustHit ? `<p class="goal-hit">Daily goal reached · 🔥 ${store.streak()} day streak</p>` : ''}
      <div class="summary-stats">
        <div class="stat"><b>+${s.xp}</b><span>XP</span></div>
        <div class="stat"><b>${s.accuracy}%</b><span>accuracy</span></div>
        <div class="stat"><b>${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, '0')}</b><span>time</span></div>
      </div>
      <p class="muted">${summaryText(s)}</p>
      ${
        !store.user()
          ? `<a href="#/account" class="save-banner">☁️ <span><strong>Don't lose this.</strong> Create a free account to save your progress.</span></a>`
          : ''
      }
      <button type="button" class="btn btn-primary btn-block" id="summary-continue">Continue</button>
    </div>`;
  document.getElementById('summary-continue').addEventListener('click', goHome);
}

// Replace (not push) the session URL so the back button doesn't restart it.
function goHome() {
  history.replaceState(null, '', '#/');
  render();
}

// --- Router -------------------------------------------------------------------

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

  app.innerHTML =
    route === 'unit' ? unitScreen(arg)
    : route === 'level' ? levelScreen(arg)
    : route === 'review' ? reviewScreen()
    : route === 'phrases' ? phrasesScreen()
    : route === 'account' ? accountScreen(arg === 'login' ? 'login' : 'signup')
    : homeScreen();

  if (route === 'account') wireAccount();
  if (route === 'phrases') wirePhrases();
  if (route === 'unit') wireBubbles();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  if (stopSession) endSession(); // back button during a session leaves it
  render();
});
store.subscribe(() => {
  const status = document.getElementById('sync-status');
  if (status) status.textContent = store.hasUnsynced() ? 'Changes waiting to sync…' : 'All progress synced ✓';
});

// Sync when the app is backgrounded or comes back online.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.sync({ keepalive: true }).catch(() => {});
});
window.addEventListener('online', () => store.sync().catch(() => {}));

render();
store.refreshUser().then(() => {
  if (!stopSession && !document.querySelector('.summary')) render();
});
api('config')
  .then((c) => (config = c))
  .catch(() => {});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
}
