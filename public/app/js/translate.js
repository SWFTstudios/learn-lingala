// Translate & dictionary: instant matches from the course (verified, offline),
// AI translation on demand (Claude), voice input in the learner's language,
// and the full phrasebook to browse when the box is empty.

import { COURSE, ITEMS, UNIT_BY_ID } from './course.js';
import { isLearned } from './srs.js';
import { normalize } from './answer.js';
import { api } from './api.js';
import * as store from './store.js';
import { t, getLang, gloss, langName, langInText, unitText, aiError, LANGS } from './i18n.js';
import { icon } from './icons.js';

const RECENT_KEY = 'll-recent-translations';
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let toLingala = true; // direction: base language → Lingala
let query = '';
let filter = 'all';
let lastResult = null;

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

function loadRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecent(entry) {
  const list = [entry, ...loadRecent().filter((r) => normalize(r.source) !== normalize(entry.source))].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Not critical.
  }
}

export const clearRecent = () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Nothing stored.
  }
};

// --- Course dictionary search ------------------------------------------------------

export function searchCourse(text, limit = 6) {
  const q = normalize(text);
  if (!q) return [];
  const scored = [];
  for (const item of ITEMS) {
    const fields = [normalize(item.lg), normalize(gloss(item)), ...(item.alt || []).map(normalize)];
    let score = 0;
    for (const f of fields) {
      if (f === q) score = Math.max(score, 3);
      else if (f.startsWith(q) || f.split(' ').some((w) => w === q)) score = Math.max(score, 2);
      else if (f.includes(q)) score = Math.max(score, 1);
    }
    if (score) scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.item.lg.length - b.item.lg.length).slice(0, limit).map((s) => s.item);
}

function dictRow(item) {
  const learned = isLearned(store.getCard(item.id));
  return `
    <li class="dict-row">
      <span class="dict-main">
        <span class="dict-lg" lang="ln">${esc(item.lg)}</span>
        <span class="dict-gloss">${esc(gloss(item))}</span>
      </span>
      <span class="dict-tags">
        ${item.local ? `<span class="badge badge-local">${t('badge.local')}</span>` : ''}
        ${learned ? `<span class="badge badge-done">${icon('check')} ${t('badge.learned')}</span>` : ''}
        <a class="dict-unit" href="#/unit/${item.unit}">${esc(unitText(UNIT_BY_ID.get(item.unit)).title)}</a>
      </span>
    </li>`;
}

function phraseList() {
  const q = normalize(query);
  const groups = COURSE.map((u) => {
    const rows = u.items.filter(
      (i) =>
        (filter !== 'local' || i.local) &&
        (filter !== 'learned' || isLearned(store.getCard(i.id))) &&
        (!q || normalize(i.lg).includes(q) || normalize(gloss(i)).includes(q)),
    );
    return rows.length
      ? `<h3 class="dict-group">${u.emoji} ${esc(unitText(u).title)}</h3><ul class="dict-list">${rows.map((i) => dictRow({ ...i, unit: u.id })).join('')}</ul>`
      : '';
  }).join('');
  return groups || `<p class="muted">${t('phr.none')}</p>`;
}

// --- AI result ---------------------------------------------------------------------

function resultHtml(r) {
  const lgSide = r.direction === 'to-lingala';
  return `
    <section class="ai-card" aria-live="polite">
      <div class="ai-head">
        <span class="eyebrow">${icon('sparkle')} ${t('tr.ai')}</span>
        <span class="confidence conf-${r.confidence}">${t(`tr.conf.${r.confidence}`)}</span>
      </div>
      <div class="ai-main">
        <p class="ai-translation" ${lgSide ? 'lang="ln"' : ''}>${esc(r.translation)}</p>
        <button type="button" class="icon-btn copy-btn" data-copy="${esc(r.translation)}" aria-label="${t('tr.copy')}">${icon('copy')}</button>
      </div>
      ${r.note ? `<p class="ai-note">${esc(r.note)}</p>` : ''}
      ${
        r.breakdown.length
          ? `<h4>${t('tr.breakdown')}</h4><div class="breakdown">${r.breakdown
              .map((b) => `<span class="bd"><b lang="ln">${esc(b.word)}</b><small>${esc(b.meaning)}</small></span>`)
              .join('')}</div>`
          : ''
      }
      ${
        r.alternatives.length
          ? `<h4>${t('tr.alternatives')}</h4><ul class="alts">${r.alternatives
              .map((a) => `<li><span ${lgSide ? 'lang="ln"' : ''}>${esc(a.text)}</span><small>${esc(a.note)}</small></li>`)
              .join('')}</ul>`
          : ''
      }
      ${
        r.example?.lg
          ? `<h4>${t('tr.example')}</h4><blockquote class="example"><span lang="ln">${esc(r.example.lg)}</span><small>${esc(r.example.gloss)}</small></blockquote>`
          : ''
      }
      <p class="ai-foot">${t('tr.aiNote')}</p>
    </section>`;
}

// --- Page --------------------------------------------------------------------------

export function translateHtml({ aiEnabled }) {
  const base = langName(getLang());
  const signedIn = !!store.user();
  const recent = loadRecent();
  return `
    <header class="page-head">
      <p class="eyebrow">${icon('book')} ${t('tr.eyebrow')}</p>
      <h1>${t('tr.title')}</h1>
      <p class="lede">${t('tr.sub')}</p>
    </header>

    <section class="translator card">
      <div class="tr-dir">
        <span class="tr-lang">${toLingala ? esc(base) : 'Lingala'}</span>
        <button type="button" class="icon-btn tr-swap" aria-label="${t('tr.swap')}">${icon('swap')}</button>
        <span class="tr-lang">${toLingala ? 'Lingala' : esc(base)}</span>
      </div>
      <div class="tr-input-wrap">
        <textarea id="tr-input" class="tr-input" rows="2" maxlength="200" ${toLingala ? '' : 'lang="ln"'}
          placeholder="${toLingala ? t('tr.placeholderBase', { lang: esc(langInText(getLang())) }) : t('tr.placeholderLn')}"
          aria-label="${t('tr.title')}">${esc(query)}</textarea>
        <div class="tr-tools">
          <button type="button" class="icon-btn tr-clear" aria-label="${t('tr.clear')}" ${query ? '' : 'hidden'}>${icon('close')}</button>
          <button type="button" class="mic-btn" aria-label="${t('tr.speak')}" ${toLingala && SpeechRecognition ? '' : 'disabled'}>${icon('mic')}</button>
        </div>
      </div>
      <p class="tr-status" role="status">${
        !SpeechRecognition ? t('tr.micUnsupported') : toLingala ? '' : t('tr.micLn', { lang: esc(langInText(getLang())) })
      }</p>
      <div class="tr-actions">
        ${
          aiEnabled === false
            ? ''
            : signedIn
              ? `<button type="button" class="btn btn-primary tr-go" ${query ? '' : 'disabled'}>${icon('sparkle')} ${t('tr.translate')}</button>`
              : `<a href="#/account" class="btn btn-secondary">${icon('lock')} ${t('tr.signin')}</a>`
        }
      </div>
    </section>

    <div id="tr-results">${resultsHtml()}</div>

    ${
      recent.length && !query
        ? `<section class="recent"><h2 class="section-title">${t('tr.recent')}</h2><ul class="dict-list">${recent
            .map(
              (r) => `<li class="dict-row recent-row" data-q="${esc(r.source)}"><span class="dict-main"><span class="dict-gloss">${esc(r.source)}</span>
              <span class="dict-lg" ${r.direction === 'to-lingala' ? 'lang="ln"' : ''}>${esc(r.translation)}</span></span>${icon('forward')}</li>`,
            )
            .join('')}</ul></section>`
        : ''
    }

    <section class="browse" ${query ? 'hidden' : ''}>
      <h2 class="section-title">${t('tr.browse')}</h2>
      <div class="filters" role="group">
        ${[['all', t('phr.all')], ['local', t('phr.local')], ['learned', t('phr.learned')]]
          .map(([k, label]) => `<button type="button" class="filter ${filter === k ? 'active' : ''}" data-filter="${k}">${label}</button>`)
          .join('')}
      </div>
      <div id="phrase-list">${phraseList()}</div>
    </section>`;
}

function resultsHtml() {
  if (!query.trim()) return '';
  const matches = searchCourse(query);
  return `
    ${lastResult && normalize(lastResult.source) === normalize(query) ? resultHtml(lastResult) : ''}
    <section class="dict-results">
      <h2 class="section-title">${icon('check')} ${t('tr.fromCourse')}</h2>
      ${matches.length ? `<ul class="dict-list">${matches.map(dictRow).join('')}</ul>` : `<p class="muted">${t('tr.noMatches')}</p>`}
    </section>`;
}

export function wireTranslate(root, { rerender }) {
  const input = root.querySelector('#tr-input');
  const results = root.querySelector('#tr-results');
  const status = root.querySelector('.tr-status');
  const go = root.querySelector('.tr-go');
  const mic = root.querySelector('.mic-btn');
  const clear = root.querySelector('.tr-clear');
  const browse = root.querySelector('.browse');
  let busy = false;

  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 220)}px`;
  };

  function refresh() {
    results.innerHTML = resultsHtml();
    if (go) go.disabled = busy || !query.trim();
    clear.hidden = !query;
    if (browse) browse.hidden = !!query;
    root.querySelector('.recent')?.toggleAttribute('hidden', !!query);
  }

  let timer;
  input.addEventListener('input', () => {
    query = input.value;
    autosize();
    clearTimeout(timer);
    timer = setTimeout(refresh, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      go?.click();
    }
  });
  clear.addEventListener('click', () => {
    query = '';
    lastResult = null;
    rerender();
  });
  root.querySelector('.tr-swap').addEventListener('click', () => {
    toLingala = !toLingala;
    rerender();
  });

  async function translateNow() {
    const text = query.trim();
    if (!text || busy || !go) return;
    busy = true;
    go.disabled = true;
    go.innerHTML = `<span class="spinner"></span> ${t('tr.translating')}`;
    status.textContent = '';
    try {
      const r = await api('translate', { method: 'POST', body: { text, lang: getLang() } });
      lastResult = { ...r, source: text };
      saveRecent({ source: text, translation: r.translation, direction: r.direction });
    } catch (err) {
      status.textContent = err.status === 401 ? t('chat.signinAgainText') : aiError(err);
    } finally {
      busy = false;
      go.innerHTML = `${icon('sparkle')} ${t('tr.translate')}`;
      refresh();
    }
  }
  go?.addEventListener('click', translateNow);

  results.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.innerHTML = icon('check');
      setTimeout(() => (btn.innerHTML = icon('copy')), 1500);
    } catch {
      // Clipboard blocked; nothing to do.
    }
  });

  root.querySelectorAll('.recent-row').forEach((row) =>
    row.addEventListener('click', () => {
      query = row.dataset.q;
      input.value = query;
      autosize();
      refresh();
      translateNow();
    }),
  );

  root.querySelectorAll('.filter').forEach((b) =>
    b.addEventListener('click', () => {
      filter = b.dataset.filter;
      root.querySelectorAll('.filter').forEach((x) => x.classList.toggle('active', x === b));
      root.querySelector('#phrase-list').innerHTML = phraseList();
    }),
  );

  // Voice input in the learner's language (browsers can't recognise Lingala yet).
  let recognition = null;
  mic?.addEventListener('click', () => {
    if (!SpeechRecognition) return;
    if (recognition) return recognition.stop();
    recognition = new SpeechRecognition();
    recognition.lang = LANGS[getLang()].speech;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      query = Array.from(e.results).map((r) => r[0].transcript).join('');
      input.value = query;
      autosize();
      refresh();
    };
    recognition.onerror = (e) => {
      status.textContent = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? t('tr.micDenied') : t('tr.micError');
    };
    recognition.onend = () => {
      recognition = null;
      mic.classList.remove('listening');
      if (status.textContent === t('tr.listening')) status.textContent = '';
      if (query.trim()) translateNow();
    };
    mic.classList.add('listening');
    status.textContent = t('tr.listening');
    recognition.start();
  });

  autosize();
  if (!query) setTimeout(() => input.focus(), 50);
}
