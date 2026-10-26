// Study cards: flip cards with a word-by-word breakdown, the phrase in context,
// look-alikes to keep apart, memory strength, and the learner's own notes and
// memory hooks. A study session asks "how sure are you?" before each flip
// (pretesting + confidence) and gives confident mistakes extra attention
// (the hypercorrection effect). Ratings feed the same spaced-repetition schedule.

import { ITEMS, ITEM_BY_ID, UNIT_BY_ID, COURSE } from './course.js';
import { schedule, newCard, isLearned, isMastered, recall, DAY } from './srs.js';
import { dueItems, shuffle } from './lesson.js';
import { normalize, levenshtein } from './answer.js';
import { breakdown } from './breakdown.js';
import { api } from './api.js';
import * as store from './store.js';
import { t, tn, getLang, gloss, itemNote, itemTip, unitText, dialogueText, aiError } from './i18n.js';
import { icon, unitIcon } from './icons.js';

export const TRICKY_LAPSES = 3; // missed this often after learning it: a "leech"
const DECK_SIZE = 20;
const CONFIDENCE = ['none', 'think', 'sure'];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Decks ---------------------------------------------------------------------------

const learned = (getCard) => ITEMS.filter((i) => isLearned(getCard(i.id)));

export function deckItems(deck, getCard, now = Date.now(), rand = Math.random) {
  if (deck.startsWith('unit:')) return shuffle(UNIT_BY_ID.get(deck.slice(5))?.items.map((i) => ITEM_BY_ID.get(i.id)) ?? [], rand);
  switch (deck) {
    case 'due':
      return shuffle(dueItems(getCard, now), rand).slice(0, DECK_SIZE);
    case 'weak':
      return learned(getCard)
        .filter((i) => !isMastered(getCard(i.id)) && recall(getCard(i.id), now) < 0.85)
        .sort((a, b) => recall(getCard(a.id), now) - recall(getCard(b.id), now))
        .slice(0, DECK_SIZE);
    case 'tricky':
      return shuffle(learned(getCard).filter((i) => (getCard(i.id).lapses ?? 0) >= TRICKY_LAPSES), rand).slice(0, DECK_SIZE);
    case 'recent':
      return learned(getCard)
        .sort((a, b) => (getCard(b.id).last ?? 0) - (getCard(a.id).last ?? 0))
        .slice(0, DECK_SIZE);
    case 'all':
      return shuffle(learned(getCard), rand).slice(0, 30);
    default:
      return [];
  }
}

export const DECKS = ['due', 'weak', 'tricky', 'recent', 'all'];

// --- Card content -------------------------------------------------------------------

// Other course phrases that look or sound alike (easy to mix up).
export function lookAlikes(item, limit = 3) {
  const a = normalize(item.lg);
  if (a.length < 3) return [];
  return ITEMS.filter((o) => o.id !== item.id)
    .map((o) => ({ o, d: levenshtein(a, normalize(o.lg)) }))
    .filter(({ o, d }) => d > 0 && d <= Math.max(1, Math.floor(a.length / 4)) && normalize(o.lg) !== a)
    .sort((x, y) => x.d - y.d)
    .slice(0, limit)
    .map(({ o }) => o);
}

// Lines from the course conversations that use the phrase.
export function contextLines(item, limit = 2) {
  const words = normalize(item.lg).split(' ');
  const out = [];
  for (const unit of COURSE) {
    if (!unit.dialogue) continue;
    unit.dialogue.lines.forEach((line, i) => {
      const lw = normalize(line.lg).split(' ');
      const at = lw.findIndex((_, j) => words.every((w, k) => lw[j + k] === w));
      if (at >= 0 && out.length < limit && normalize(line.lg) !== words.join(' ')) out.push({ unit, i, line });
    });
  }
  return out;
}

function whenText(due, now = Date.now()) {
  const days = (due - now) / DAY;
  if (days <= 0) return t('when.now');
  if (days < 1) return t('when.today');
  if (days < 2) return t('when.tomorrow');
  return tn('when.days', Math.round(days));
}

function breakdownHtml(item) {
  const { words, patterns } = breakdown(item.lg);
  return `
    <ol class="wbd">${words
      .map(
        (w) => `<li class="bd-word">
          <span class="bd-lg" lang="ln">${esc(w.word)}</span>
          ${w.pieces
            ? `<span class="bd-pieces">${w.pieces
                .map((p) => `<span class="bd-piece bd-${p.kind}"><b lang="ln">${esc(p.m)}</b>${p.g ? `<small>${esc(p.g)}</small>` : ''}</span>`)
                .join('<span class="bd-dot" aria-hidden="true">·</span>')}</span>`
            : ''}
          <span class="bd-gloss">${esc(w.gloss ?? '…')}</span>
          ${w.verb && w.verb !== normalize(w.word) ? `<span class="bd-meta">${t('card.from', { verb: `<b lang="ln">${esc(w.verb)}</b>` })}</span>` : ''}
          ${w.plural ? `<span class="bd-meta">${t('card.plural', { word: `<b lang="ln">${esc(w.plural)}</b>` })}</span>` : ''}
          ${w.singular ? `<span class="bd-meta">${t('card.singular', { word: `<b lang="ln">${esc(w.singular)}</b>` })}</span>` : ''}
        </li>`,
      )
      .join('')}</ol>
    ${patterns.map((p) => `<p class="bd-pattern">${icon('sparkle')}<span>${t(`bd.pat.${p}`)}</span></p>`).join('')}`;
}

// Everything on the back of a card (also the standalone card page).
export function cardBodyHtml(item, { aiEnabled = null, signedIn = false, links = true } = {}) {
  const card = store.getCard(item.id);
  const note = store.getNote(item.id) ?? { text: '', hook: '' };
  const n = itemNote(item);
  const tip = itemTip(item);
  const ctx = contextLines(item);
  const alike = lookAlikes(item);
  const tricky = (card?.lapses ?? 0) >= TRICKY_LAPSES;
  const r = isLearned(card) ? Math.round(recall(card) * 100) : null;

  return `
    <section class="cb-section">
      <h3 class="cb-title">${icon('search')} ${t('card.breakdown')}</h3>
      ${breakdownHtml(item)}
      ${n ? `<p class="cb-note">${n}</p>` : ''}
      ${tip ? `<p class="local-tip"><strong>${t('card.tip')}</strong>${tip}</p>` : ''}
    </section>

    ${
      ctx.length
        ? `<section class="cb-section">
            <h3 class="cb-title">${icon('chat')} ${t('card.context')}</h3>
            ${ctx
              .map(({ unit, i, line }) => `<div class="cb-context">
                <span class="bubble-lg" lang="ln">${esc(line.lg)}</span>
                <span class="muted small">${esc(dialogueText(unit).lines[i])} · ${esc(unitText(unit).title)}</span></div>`)
              .join('')}
          </section>`
        : ''
    }

    ${
      alike.length
        ? `<section class="cb-section">
            <h3 class="cb-title">${icon('swap')} ${t('card.confuse')}</h3>
            <ul class="cb-alike">${alike
              .map((o) => {
                const inner = `<b lang="ln">${esc(o.lg)}</b><span>${esc(gloss(o))}</span>`;
                return `<li>${links ? `<a href="#/card/${o.id}">${inner}</a>` : `<span>${inner}</span>`}</li>`;
              })
              .join('')}</ul>
          </section>`
        : ''
    }

    <section class="cb-section">
      <h3 class="cb-title">${icon('bolt')} ${t('card.strength')}</h3>
      ${
        r == null
          ? `<p class="muted small">${t('card.strengthNew')}</p>`
          : `<div class="cb-meter"><span style="width:${r}%"></span></div>
             <p class="muted small">${t('card.strengthLine', { pct: r, when: whenText(card.due) })}</p>`
      }
      ${tricky ? `<p class="cb-tricky">${icon('target')}<span><b>${t('card.tricky')}</b> ${tn('card.trickyTip', card.lapses)}</span></p>` : ''}
    </section>

    <section class="cb-section cb-mine" data-item="${item.id}">
      <h3 class="cb-title">${icon('book')} ${t('card.notes')}<span class="cb-saved" aria-live="polite"></span></h3>
      <textarea class="cb-notes" rows="3" maxlength="${store.NOTE_MAX}" placeholder="${t('card.notesPh')}" aria-label="${t('card.notes')}">${esc(note.text)}</textarea>
      <label class="cb-hook-label">${icon('sparkle')} ${t('card.hook')}
        <textarea class="cb-hook" rows="2" maxlength="${store.HOOK_MAX}" placeholder="${t('card.hookPh')}">${esc(note.hook)}</textarea></label>
      ${
        aiEnabled === false
          ? ''
          : signedIn
            ? `<button type="button" class="btn btn-secondary btn-sm cb-hook-ai">${icon('sparkle')} ${t('card.hookAi')}</button>`
            : `<a href="#/account" class="muted small cb-hook-signin">${icon('lock')} ${t('card.hookSignin')}</a>`
      }
      <div class="cb-hook-out" hidden></div>
      <p class="muted small cb-hook-why">${t('card.hookWhy')}</p>
    </section>`;
}

// Notes autosave and AI memory hooks.
export function wireCardBody(root) {
  const box = root.querySelector('.cb-mine');
  if (!box) return;
  const id = box.dataset.item;
  const notes = box.querySelector('.cb-notes');
  const hook = box.querySelector('.cb-hook');
  const saved = box.querySelector('.cb-saved');
  let timer;
  const save = () => {
    store.putNote(id, { text: notes.value, hook: hook.value });
    saved.textContent = t('card.saved');
    store.sync().catch(() => {});
  };
  for (const el of [notes, hook]) {
    el.addEventListener('input', () => {
      saved.textContent = '';
      clearTimeout(timer);
      timer = setTimeout(save, 600);
    });
    el.addEventListener('blur', () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        save();
      }
    });
  }

  const ai = box.querySelector('.cb-hook-ai');
  const out = box.querySelector('.cb-hook-out');
  ai?.addEventListener('click', async () => {
    ai.disabled = true;
    ai.innerHTML = `<span class="spinner"></span> ${t('card.hookThinking')}`;
    out.hidden = false;
    out.innerHTML = '';
    try {
      const r = await api('hook', { method: 'POST', body: { itemId: id, lang: getLang() } });
      out.innerHTML = `<p><b>${esc(r.keyword)}</b> — ${esc(r.hook)}</p>
        <button type="button" class="btn btn-primary btn-sm cb-hook-use">${icon('check')} ${t('card.hookUse')}</button>`;
      out.querySelector('.cb-hook-use').addEventListener('click', () => {
        hook.value = `${r.keyword} — ${r.hook}`.slice(0, store.HOOK_MAX);
        save();
        out.hidden = true;
      });
    } catch (err) {
      out.innerHTML = `<p class="form-error">${esc(err.status === 401 ? t('chat.signinAgainText') : aiError(err))}</p>`;
    } finally {
      ai.disabled = false;
      ai.innerHTML = `${icon('sparkle')} ${t('card.hookAgain')}`;
    }
  });
}

// --- Deck picker (on the Review screen) ----------------------------------------------

export function studyDecksHtml() {
  const counts = Object.fromEntries(DECKS.map((d) => [d, deckItems(d, store.getCard).length]));
  const [asked = 0, right = 0] = store.calibration().sure ?? [];
  const front = store.studyFront();
  return `
    <h2 class="section-title">${icon('book')} ${t('study.title')}</h2>
    <p class="muted small study-sub">${t('study.sub')}</p>
    <div class="decks">${DECKS.map(
      (d) => `<a href="${counts[d] ? `#/study/${d}` : '#/review'}" class="deck deck-${d} ${counts[d] ? '' : 'empty'}" ${counts[d] ? '' : 'aria-disabled="true"'}>
        <span class="deck-n">${counts[d]}</span><span class="deck-name">${t(`study.deck.${d}`)}</span><small>${t(`study.deckSub.${d}`)}</small></a>`,
    ).join('')}</div>
    <div class="study-opts">
      <span class="muted small">${t('study.front')}</span>
      <div class="seg seg-sm study-front" role="radiogroup" aria-label="${t('study.front')}">
        ${['ln', 'base', 'mix'].map((f) => `<button type="button" role="radio" aria-checked="${f === front}" class="${f === front ? 'active' : ''}" data-front="${f}">${t(`study.front.${f}`)}</button>`).join('')}
      </div>
    </div>
    <p class="calib">${icon('target')} <span>${asked >= 5 ? t('study.calib', { pct: Math.round((right / asked) * 100) }) : t('study.calibNone')}</span></p>
    <details class="why">
      <summary>${t('study.why')}</summary>
      <ul>${['pretest', 'hyper', 'hook', 'notes', 'confuse', 'spacing'].map((k) => `<li>${t(`study.sci.${k}`)}</li>`).join('')}</ul>
    </details>`;
}

export function wireStudyDecks(root, rerender) {
  root.querySelectorAll('.study-front [data-front]').forEach((b) =>
    b.addEventListener('click', () => {
      store.setStudyFront(b.dataset.front);
      rerender();
    }),
  );
}

// --- Study session --------------------------------------------------------------------

export function mountStudy(root, deck, { onExit, aiEnabled, signedIn }) {
  const queue = deckItems(deck, store.getCard);
  const total = queue.length;
  const front = store.studyFront();
  const requeued = new Set();
  let idx = 0;
  let conf = null;
  let showBase = false;
  let right = 0;
  let graded = 0;
  let xp = 0;

  root.innerHTML = `
    <div class="study">
      <header class="study-head">
        <button type="button" class="icon-btn study-close" aria-label="${t('common.close')}">${icon('close')}</button>
        <div class="progress"><div class="progress-bar"></div></div>
        <span class="study-count"></span>
      </header>
      <main class="study-main"><div class="study-card"></div></main>
      <footer class="study-foot"><div class="study-foot-inner"></div></footer>
    </div>`;
  const cardEl = root.querySelector('.study-card');
  const foot = root.querySelector('.study-foot-inner');
  const bar = root.querySelector('.progress-bar');
  const count = root.querySelector('.study-count');
  const main = root.querySelector('.study-main');
  root.querySelector('.study-close').addEventListener('click', () => finish(true));

  const lg = (item) => `<span class="sc-lg" lang="ln">${esc(item.lg)}</span>`;
  const meaning = (item) => `<span class="sc-meaning">${esc(gloss(item))}</span>`;

  function showFront() {
    const item = queue[idx];
    conf = null;
    showBase = front === 'base' || (front === 'mix' && Math.random() < 0.5);
    bar.style.width = `${(Math.min(idx, total) / Math.max(total, 1)) * 100}%`;
    count.textContent = `${Math.min(idx + 1, queue.length)} / ${queue.length}`;
    const unit = UNIT_BY_ID.get(item.unit);
    cardEl.className = 'study-card is-front';
    cardEl.innerHTML = `
      <div class="sc-top">${unitIcon(unit, 'sm')}<span class="muted small">${esc(unitText(unit).title)}</span>
        ${item.local ? `<span class="badge badge-local">${t('badge.local')}</span>` : ''}</div>
      <p class="sc-ask">${showBase ? t('study.ask.base') : t('study.ask.ln')}</p>
      <div class="sc-face">${showBase ? meaning(item) : lg(item)}</div>
      <p class="sc-hint muted small">${t('study.confQ')}</p>`;
    foot.innerHTML = `<div class="conf-row">${CONFIDENCE.map(
      (c) => `<button type="button" class="btn conf conf-${c}" data-conf="${c}">${t(`study.conf.${c}`)}</button>`,
    ).join('')}</div>`;
    foot.querySelectorAll('[data-conf]').forEach((b) => b.addEventListener('click', () => flip(b.dataset.conf)));
    main.scrollTop = 0;
  }

  function flip(c) {
    conf = c;
    const item = queue[idx];
    cardEl.className = 'study-card is-back flipping';
    cardEl.innerHTML = `
      <div class="sc-answer">${lg(item)}${meaning(item)}</div>
      ${cardBodyHtml(item, { aiEnabled, signedIn, links: false })}`;
    wireCardBody(cardEl);
    foot.innerHTML = `
      <p class="grade-q muted small">${t('study.gradeQ')}</p>
      <div class="grade-row">${[0, 1, 2, 3]
        .map((g) => `<button type="button" class="btn grade grade-${g}" data-grade="${g}">${t(`study.grade.${g}`)}</button>`)
        .join('')}</div>`;
    foot.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => rate(Number(b.dataset.grade))));
    main.scrollTop = 0;
  }

  function rate(grade) {
    const item = queue[idx];
    const now = Date.now();
    store.putCards([schedule(store.getCard(item.id) || newCard(item.id, now), grade, now)]);
    store.recordConfidence(conf, grade > 0);
    graded++;
    if (grade > 0) {
      right++;
      xp++;
    } else if (!requeued.has(item.id)) {
      // Missed: it comes back later in this session. A confident miss comes back sooner.
      requeued.add(item.id);
      queue.splice(Math.min(queue.length, idx + (conf === 'sure' ? 3 : 5)), 0, item);
    }
    if (grade === 0 && conf === 'sure') return hypercorrect();
    next();
  }

  function hypercorrect() {
    foot.innerHTML = `<div class="hyper">${icon('sparkle')}<span><b>${t('study.hyperTitle')}</b> ${t('study.hyper')}</span></div>
      <button type="button" class="btn btn-primary btn-block">${t('common.continue')}</button>`;
    foot.querySelector('button').addEventListener('click', next);
  }

  function next() {
    idx++;
    if (idx >= queue.length) return finish(false);
    showFront();
  }

  function finish(early) {
    if (graded) {
      xp += early ? 0 : 3;
      if (xp) store.addXp(xp);
      store.sync().catch(() => {});
    }
    if (early || !graded) return onExit();
    const [asked = 0, ok = 0] = store.calibration().sure ?? [];
    bar.style.width = '100%';
    root.querySelector('.study-head').innerHTML = '';
    cardEl.className = 'study-card is-done';
    cardEl.innerHTML = `
      <div class="study-done">
        <span class="summary-badge">${icon('trophy')}</span>
        <h1>${t('study.done')}</h1>
        <p class="lede">${t('study.doneSub', { n: graded, right })}</p>
        <p class="xp-pill">${icon('bolt')} +${xp} XP</p>
        ${asked >= 5 ? `<p class="calib">${icon('target')} <span>${t('study.calib', { pct: Math.round((ok / asked) * 100) })}</span></p>` : ''}
      </div>`;
    foot.innerHTML = `<button type="button" class="btn btn-primary btn-block">${t('common.continue')}</button>`;
    foot.querySelector('button').addEventListener('click', onExit);
  }

  if (!total) {
    onExit();
    return () => {};
  }
  showFront();
  return () => {};
}

// --- Standalone card page ------------------------------------------------------------------

export function cardPageHtml(id, opts) {
  const item = ITEM_BY_ID.get(id);
  if (!item) return null;
  const unit = UNIT_BY_ID.get(item.unit);
  return `
    <a href="#/unit/${unit.id}" class="back">${icon('back')} ${esc(unitText(unit).title)}</a>
    <article class="card-page">
      <header class="cp-head">
        ${unitIcon(unit, 'lg')}
        <div>
          <h1 lang="ln">${esc(item.lg)}</h1>
          <p class="lede">${esc(gloss(item))}</p>
          ${item.local ? `<span class="badge badge-local">${t('badge.local')}</span>` : ''}
        </div>
      </header>
      ${cardBodyHtml(item, opts)}
      <a href="#/study/unit:${unit.id}" class="btn btn-secondary btn-block">${icon('book')} ${t('card.studyUnit')}</a>
    </article>`;
}
