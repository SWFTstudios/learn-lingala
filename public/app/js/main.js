// App shell: hash routing and the non-lesson screens.

import { UNITS, UNIT_BY_ID, ITEMS } from './course.js';
import { isLearned, isMastered, recall } from './srs.js';
import { buildLesson, buildDueReview, currentUnit, unitProgress, dueItems } from './lesson.js';
import { runSession } from './player.js';
import { api } from './api.js';
import * as store from './store.js';

const app = document.getElementById('app');
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let config = { turnstileSiteKey: null };
let stopSession = null;

// --- Layout -------------------------------------------------------------------

function shell(active, content) {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const pct = Math.min(100, Math.round((xp / goal) * 100));
  const s = store.streak();
  const u = store.user();
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
      <a href="#/" class="${active === 'learn' ? 'active' : ''}"><span aria-hidden="true">📚</span>Learn</a>
      <a href="#/review" class="${active === 'review' ? 'active' : ''}"><span aria-hidden="true">🔁</span>Review${
        dueItems(store.getCard).length ? `<b class="dot">${dueItems(store.getCard).length}</b>` : ''
      }</a>
      <a href="#/account" class="${active === 'account' ? 'active' : ''}"><span aria-hidden="true">${u ? '👤' : '☁️'}</span>${
        u ? 'Account' : 'Save progress'
      }</a>
    </nav>`;
}

// --- Screens ------------------------------------------------------------------

function homeScreen() {
  const unit = currentUnit(store.getCard);
  const prog = unitProgress(unit, store.getCard);
  const due = dueItems(store.getCard).length;
  const learned = ITEMS.filter((i) => isLearned(store.getCard(i.id))).length;
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const u = store.user();
  const greeting = u?.displayName ? `Mbote, ${esc(u.displayName)}!` : 'Mbote!';

  const units = UNITS.map((un, idx) => {
    const p = unitProgress(un, store.getCard);
    const mastered = un.items.filter((i) => isMastered(store.getCard(i.id))).length;
    const isCurrent = un === unit && !p.done;
    return `
      <a href="#/unit/${un.id}" class="unit-row ${p.done ? 'done' : ''} ${isCurrent ? 'current' : ''}">
        <span class="unit-emoji" aria-hidden="true">${un.emoji}</span>
        <span class="unit-text">
          <span class="unit-title">${idx + 1}. ${esc(un.title)} ${isCurrent ? '<span class="badge">Up next</span>' : ''}</span>
          <span class="unit-sub" lang="ln">${esc(un.lg)}</span>
          <span class="meter"><span style="width:${(p.learned / p.total) * 100}%"></span></span>
        </span>
        <span class="unit-count">${p.done ? (mastered === p.total ? '⭐' : '✓') : `${p.learned}/${p.total}`}</span>
      </a>`;
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
        <span class="hero-kicker">${prog.done ? 'Practice' : learned ? 'Continue' : 'Start here'}</span>
        <span class="hero-title">${esc(unit.title)}</span>
        <span class="hero-sub">${prog.learned}/${prog.total} learned</span>
      </span>
      <span class="hero-go" aria-hidden="true">→</span>
    </a>

    ${
      due
        ? `<a href="#/session/review" class="review-card">
            <strong>🔁 ${due} ${due === 1 ? 'word is' : 'words are'} ready to review</strong>
            <span>Reviewing at the right moment locks words into long-term memory.</span>
          </a>`
        : ''
    }

    <section class="stats-row">
      <div class="stat"><b>${learned}</b><span>words learned</span></div>
      <div class="stat"><b>${ITEMS.filter((i) => isMastered(store.getCard(i.id))).length}</b><span>mastered</span></div>
      <div class="stat"><b>${store.totalXp()}</b><span>total XP</span></div>
    </section>

    ${
      !u && learned
        ? `<a href="#/account" class="save-banner">☁️ <span><strong>Save your progress.</strong> Create a free account to keep your streak and sync across devices.</span></a>`
        : ''
    }

    <h2 class="section-title">Course</h2>
    <div class="units">${units}</div>

    <p class="footnote">Want the reference guides? <a href="/alphabet.html">The alphabet</a> · <a href="/sentences.html">Sentence structure</a></p>`,
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

function unitScreen(id) {
  const unit = UNIT_BY_ID.get(id);
  if (!unit) return homeScreen();
  const p = unitProgress(unit, store.getCard);
  const words = unit.items
    .map((i) => {
      const [cls, label] = strengthLabel(store.getCard(i.id));
      return `<li class="word">
        <span class="word-lg" lang="ln">${esc(i.lg)}</span>
        <span class="word-en">${esc(i.en)}</span>
        <span class="strength strength-${cls}">${label}</span>
      </li>`;
    })
    .join('');
  return shell(
    'learn',
    `
    <a href="#/" class="back">← Course</a>
    <h1 class="unit-h1"><span aria-hidden="true">${unit.emoji}</span> ${esc(unit.title)}</h1>
    <p class="muted" lang="ln">${esc(unit.lg)} · ${p.learned}/${p.total} learned</p>
    <a href="#/lesson/${unit.id}" class="btn btn-primary btn-block">${p.done ? 'Practice this unit' : p.learned ? 'Continue lesson' : 'Start lesson'}</a>
    <h2 class="section-title">How it works</h2>
    <div class="notes card">${unit.intro}</div>
    <h2 class="section-title">Words &amp; phrases</h2>
    <ul class="word-list">${words}</ul>`,
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

  return shell(
    'review',
    `
    <h1>Review</h1>
    ${
      cards.length === 0
        ? `<div class="card empty"><p>Nothing to review yet. Finish your first lesson and your words will show up here, scheduled for review right before you'd forget them.</p>
           <a href="#/" class="btn btn-primary">Start learning</a></div>`
        : `<div class="card">
            <p class="big-number">${due.length}</p>
            <p class="muted">${due.length ? `word${due.length === 1 ? '' : 's'} due now` : 'Nothing due — you’re all caught up!'}</p>
            <a href="#/session/review" class="btn btn-primary btn-block">${due.length ? 'Start review' : 'Practice weakest words'}</a>
          </div>
          <h2 class="section-title">Memory strength</h2>
          <div class="strength-grid">
            <div class="sg sg-weak"><b>${buckets.weak}</b>Needs review</div>
            <div class="sg sg-ok"><b>${buckets.ok}</b>Learning</div>
            <div class="sg sg-strong"><b>${buckets.strong}</b>Strong</div>
            <div class="sg sg-mastered"><b>${buckets.mastered}</b>Mastered</div>
          </div>`
    }
    <h2 class="section-title">Last 7 days</h2>
    <div class="card week">${week.join('')}</div>
    <p class="footnote">How this works: each word is scheduled with spaced repetition. Get it right and the gap before
    the next review grows (1 day → 3 → a week → a month…). Miss it and it comes back sooner.</p>`,
  );
}

function accountScreen(mode = 'signup') {
  const u = store.user();
  if (u) {
    const goal = store.dailyGoal();
    return shell(
      'account',
      `
      <h1>Account</h1>
      <div class="card">
        <p><strong>${esc(u.displayName || 'Learner')}</strong></p>
        <p class="muted">${esc(u.email)}</p>
        <p class="muted small" id="sync-status">${store.hasUnsynced() ? 'Changes waiting to sync…' : 'All progress synced ✓'}</p>
      </div>
      <h2 class="section-title">Daily goal</h2>
      <div class="goal-picker" role="radiogroup" aria-label="Daily goal">
        ${[10, 20, 30, 50]
          .map(
            (g) => `<button type="button" role="radio" aria-checked="${g === goal}" class="goal ${g === goal ? 'selected' : ''}" data-goal="${g}">
              <b>${g} XP</b><span>${{ 10: 'Casual', 20: 'Regular', 30: 'Serious', 50: 'Intense' }[g]}</span></button>`,
          )
          .join('')}
      </div>
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
    </form>`,
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

function showSummary(s) {
  const goal = store.dailyGoal();
  const xp = store.todayXp();
  const goalJustHit = xp >= goal && xp - s.xp < goal;
  app.innerHTML = `
    <div class="summary">
      <div class="summary-emoji" aria-hidden="true">${s.perfect ? '🏆' : '🎉'}</div>
      <h1>${s.perfect ? 'Perfect lesson!' : 'Lesson complete!'}</h1>
      ${goalJustHit ? `<p class="goal-hit">Daily goal reached · 🔥 ${store.streak()} day streak</p>` : ''}
      <div class="summary-stats">
        <div class="stat"><b>+${s.xp}</b><span>XP</span></div>
        <div class="stat"><b>${s.accuracy}%</b><span>accuracy</span></div>
        <div class="stat"><b>${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, '0')}</b><span>time</span></div>
      </div>
      <p class="muted">${
        s.learned
          ? `You learned <strong>${s.learned}</strong> new ${s.learned === 1 ? 'item' : 'items'}${s.reviewed ? ` and reviewed ${s.reviewed}` : ''}.`
          : `You reviewed <strong>${s.reviewed}</strong> ${s.reviewed === 1 ? 'item' : 'items'}.`
      } They'll come back right before you'd forget them.</p>
      ${
        !store.user()
          ? `<a href="#/account" class="save-banner">☁️ <span><strong>Don't lose this.</strong> Create a free account to save your progress.</span></a>`
          : ''
      }
      <button type="button" class="btn btn-primary btn-block" id="summary-continue">Continue</button>
    </div>`;
  document.getElementById('summary-continue').addEventListener('click', goHome);
}

// Replace (not push) the lesson URL so the back button doesn't restart the lesson.
function goHome() {
  history.replaceState(null, '', '#/');
  render();
}

// --- Router -------------------------------------------------------------------

function render() {
  if (stopSession) return; // don't redraw underneath a running lesson
  const [, route = '', arg] = location.hash.split('/');
  document.body.classList.remove('in-session');

  if (route === 'lesson' && UNIT_BY_ID.has(arg)) return startSession(buildLesson(arg, store.getCard));
  if (route === 'session' && arg === 'review') {
    const session = buildDueReview(store.getCard);
    if (session.steps.length) return startSession(session);
    location.hash = '#/review';
    return;
  }

  app.innerHTML =
    route === 'unit' ? unitScreen(arg)
    : route === 'review' ? reviewScreen()
    : route === 'account' ? accountScreen(arg === 'login' ? 'login' : 'signup')
    : homeScreen();

  if (route === 'account') wireAccount();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  if (stopSession) endSession(); // back button during a lesson leaves it
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
  if (!stopSession) render();
});
api('config')
  .then((c) => (config = c))
  .catch(() => {});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
}
