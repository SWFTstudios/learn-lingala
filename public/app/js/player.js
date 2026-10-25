// Runs a learning session: renders each exercise, checks answers, re-queues
// mistakes, then grades every card through the SRS scheduler.

import { ITEM_BY_ID, UNIT_BY_ID } from './course.js';
import { checkTyped, normalize } from './answer.js';
import { choices, tiles, acceptedAnswers, shuffle } from './lesson.js';
import { schedule, newCard } from './srs.js';
import { getCard, putCards, addXp } from './store.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Feedback sounds (tiny WebAudio tones, no files to download) --------------

let audio;
function tone(freqs) {
  try {
    audio ??= new AudioContext();
    let t = audio.currentTime;
    for (const f of freqs) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.16);
      t += 0.09;
    }
  } catch {
    // Audio unavailable; feedback is still visual.
  }
}
const soundRight = () => tone([660, 880]);
const soundWrong = () => {
  tone([220, 180]);
  navigator.vibrate?.(80);
};

// --- Exercises ----------------------------------------------------------------
// Each returns { html, mount(el, setReady), check() → {ok, typo?, answer} }
// or { html, mount, auto: true } for steps that need no checking.

function notesStep(step) {
  const unit = UNIT_BY_ID.get(step.unitId);
  return {
    auto: true,
    html: `
      <div class="ex-label">New unit · ${esc(unit.title)}</div>
      <h2 class="ex-title">${unit.emoji} ${esc(unit.lg)}</h2>
      <div class="notes">${unit.intro}</div>`,
  };
}

function introStep(item) {
  return {
    auto: true,
    html: `
      <div class="ex-label"><span class="badge">New</span> Learn this</div>
      <div class="intro-card">
        <div class="intro-lg" lang="ln">${esc(item.lg)}</div>
        <div class="intro-en">${esc(item.en)}</div>
        ${item.note ? `<div class="intro-note">${item.note}</div>` : ''}
      </div>`,
  };
}

function mcStep(item, reverse) {
  const opts = choices(item, reverse ? 'lg' : 'en');
  let picked = null;
  return {
    html: `
      <div class="ex-label">${reverse ? 'How do you say this in Lingala?' : 'What does this mean?'}</div>
      <div class="prompt ${reverse ? '' : 'prompt-lg'}" ${reverse ? '' : 'lang="ln"'}>${esc(reverse ? item.en : item.lg)}</div>
      <div class="options">
        ${opts
          .map(
            (o, i) => `<button type="button" class="option" data-id="${o.id}" ${reverse ? 'lang="ln"' : ''}>
              <span class="key">${i + 1}</span>${esc(reverse ? o.lg : o.en)}</button>`,
          )
          .join('')}
      </div>`,
    mount(el, setReady) {
      el.querySelectorAll('.option').forEach((btn) =>
        btn.addEventListener('click', () => {
          el.querySelectorAll('.option').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          picked = btn.dataset.id;
          setReady(true);
        }),
      );
    },
    key(k, el) {
      const btn = el.querySelectorAll('.option')[Number(k) - 1];
      btn?.click();
    },
    check(el) {
      el.querySelectorAll('.option').forEach((b) => {
        b.disabled = true;
        if (b.dataset.id === item.id) b.classList.add('correct');
        else if (b.dataset.id === picked) b.classList.add('wrong');
      });
      return { ok: picked === item.id, answer: reverse ? item.lg : item.en };
    },
  };
}

function tilesStep(item) {
  const bank = tiles(item);
  const chosen = [];
  return {
    html: `
      <div class="ex-label">Build this in Lingala</div>
      <div class="prompt">${esc(item.en)}</div>
      <div class="tile-answer" aria-label="Your answer"></div>
      <div class="tile-bank"></div>`,
    mount(el, setReady) {
      const answerEl = el.querySelector('.tile-answer');
      const bankEl = el.querySelector('.tile-bank');
      const draw = () => {
        answerEl.innerHTML = chosen
          .map((t) => `<button type="button" class="tile" lang="ln" data-key="${t.key}">${esc(t.word)}</button>`)
          .join('');
        bankEl.innerHTML = bank
          .map((t) => {
            const used = chosen.includes(t);
            return `<button type="button" class="tile ${used ? 'used' : ''}" lang="ln" data-key="${t.key}" ${used ? 'disabled' : ''}>${esc(t.word)}</button>`;
          })
          .join('');
        setReady(chosen.length > 0);
      };
      answerEl.addEventListener('click', (e) => {
        const key = e.target.closest('.tile')?.dataset.key;
        if (key == null) return;
        chosen.splice(chosen.findIndex((t) => String(t.key) === key), 1);
        draw();
      });
      bankEl.addEventListener('click', (e) => {
        const key = e.target.closest('.tile:not(.used)')?.dataset.key;
        if (key == null) return;
        chosen.push(bank.find((t) => String(t.key) === key));
        draw();
      });
      draw();
    },
    check(el) {
      el.querySelectorAll('.tile').forEach((b) => (b.disabled = true));
      const got = normalize(chosen.map((t) => t.word).join(' '));
      return { ok: acceptedAnswers(item).some((a) => normalize(a) === got), answer: item.lg };
    },
  };
}

function typeStep(item) {
  let started = 0;
  return {
    html: `
      <div class="ex-label">Type this in Lingala</div>
      <div class="prompt">${esc(item.en)}</div>
      <input class="type-input" lang="ln" autocomplete="off" autocapitalize="off" autocorrect="off"
             spellcheck="false" enterkeyhint="done" placeholder="Type your answer" aria-label="Your answer">
      <div class="special-keys">
        <button type="button" class="key-btn" data-ch="ɛ">ɛ</button>
        <button type="button" class="key-btn" data-ch="ɔ">ɔ</button>
        <span class="hint">Accents optional — plain e and o work too.</span>
      </div>`,
    mount(el, setReady) {
      const input = el.querySelector('.type-input');
      input.addEventListener('input', () => {
        started ||= Date.now();
        setReady(input.value.trim().length > 0);
      });
      el.querySelectorAll('.key-btn').forEach((b) =>
        b.addEventListener('click', () => {
          const { selectionStart: s, selectionEnd: e, value } = input;
          input.value = value.slice(0, s) + b.dataset.ch + value.slice(e);
          input.setSelectionRange(s + 1, s + 1);
          input.focus();
          input.dispatchEvent(new Event('input'));
        }),
      );
      setTimeout(() => input.focus(), 50);
    },
    check(el) {
      const input = el.querySelector('.type-input');
      input.disabled = true;
      const verdict = checkTyped(input.value, acceptedAnswers(item));
      const fast = started && Date.now() - started < 6000;
      input.classList.add(verdict === 'wrong' ? 'wrong' : 'correct');
      return { ok: verdict !== 'wrong', typo: verdict === 'typo', fast, answer: item.lg };
    },
  };
}

function matchStep(step, onMistake) {
  const items = step.itemIds.map((id) => ITEM_BY_ID.get(id));
  const left = shuffle(items);
  const right = shuffle(items);
  return {
    auto: 'when-done',
    html: `
      <div class="ex-label">Warm-up: tap the matching pairs</div>
      <div class="match">
        <div class="match-col">${left.map((i) => `<button type="button" class="tile match-tile" lang="ln" data-side="l" data-id="${i.id}">${esc(i.lg)}</button>`).join('')}</div>
        <div class="match-col">${right.map((i) => `<button type="button" class="tile match-tile" data-side="r" data-id="${i.id}">${esc(i.en)}</button>`).join('')}</div>
      </div>`,
    mount(el, setReady) {
      let sel = null;
      let matched = 0;
      el.querySelector('.match').addEventListener('click', (e) => {
        const btn = e.target.closest('.match-tile:not(.done)');
        if (!btn) return;
        if (!sel || sel.dataset.side === btn.dataset.side) {
          sel?.classList.remove('selected');
          sel = btn;
          btn.classList.add('selected');
          return;
        }
        if (sel.dataset.id === btn.dataset.id) {
          for (const b of [sel, btn]) {
            b.classList.remove('selected');
            b.classList.add('done');
            b.disabled = true;
          }
          soundRight();
          if (++matched === items.length) setReady(true);
        } else {
          onMistake(sel.dataset.id);
          onMistake(btn.dataset.id);
          soundWrong();
          for (const b of [sel, btn]) {
            b.classList.add('shake');
            setTimeout(() => b.classList.remove('shake', 'selected'), 400);
          }
        }
        sel = null;
      });
    },
  };
}

// --- Session runner -----------------------------------------------------------

export function runSession(root, session, { onExit, onFinish }) {
  const queue = session.steps.slice();
  const results = {}; // itemId → { mistakes, typo, fast, seen }
  const result = (id) => (results[id] ??= { mistakes: 0, typo: false, fast: true, tested: false });
  let index = 0;
  let correct = 0;
  let answered = 0;
  let combo = 0;
  const startedAt = Date.now();

  root.innerHTML = `
    <div class="session">
      <header class="session-top">
        <button type="button" class="icon-btn quit" aria-label="Quit lesson">✕</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar"></div></div>
        <span class="combo" aria-live="polite"></span>
      </header>
      <main class="session-body"></main>
      <footer class="session-foot">
        <div class="feedback" aria-live="assertive"></div>
        <button type="button" class="btn btn-primary btn-block action" disabled>Check</button>
      </footer>
    </div>`;

  const body = root.querySelector('.session-body');
  const foot = root.querySelector('.session-foot');
  const feedback = root.querySelector('.feedback');
  const action = root.querySelector('.action');
  const bar = root.querySelector('.progress-bar');
  const comboEl = root.querySelector('.combo');
  let current = null;
  let phase = 'answer'; // 'answer' | 'continue'

  root.querySelector('.quit').addEventListener('click', () => {
    if (index === 0 || confirm('Quit this lesson? Progress from this lesson will not be saved.')) {
      cleanup();
      onExit();
    }
  });

  function onKey(e) {
    if (e.key === 'Enter' && !action.disabled) {
      e.preventDefault();
      action.click();
    } else if (phase === 'answer' && /^[1-4]$/.test(e.key) && current?.key && document.activeElement?.tagName !== 'INPUT') {
      current.key(e.key, body);
    }
  }
  document.addEventListener('keydown', onKey);
  const cleanup = () => document.removeEventListener('keydown', onKey);

  function setReady(ready) {
    if (phase === 'answer') action.disabled = !ready;
  }

  function render() {
    const step = queue[index];
    bar.style.width = `${Math.round((index / queue.length) * 100)}%`;
    foot.className = 'session-foot';
    feedback.innerHTML = '';
    phase = 'answer';

    const item = step.itemId && ITEM_BY_ID.get(step.itemId);
    current =
      step.type === 'notes' ? notesStep(step)
      : step.type === 'intro' ? introStep(item)
      : step.type === 'mc' ? mcStep(item, false)
      : step.type === 'mc-rev' ? mcStep(item, true)
      : step.type === 'tiles' ? tilesStep(item)
      : step.type === 'type' ? typeStep(item)
      : matchStep(step, (id) => {
          result(id).mistakes += 1;
          result(id).tested = true;
        });

    body.innerHTML = `<div class="exercise">${current.html}</div>`;
    body.scrollTop = 0;
    if (current.auto === true) {
      phase = 'continue';
      action.textContent = 'Continue';
      action.disabled = false;
    } else if (current.auto === 'when-done') {
      phase = 'continue';
      action.textContent = 'Continue';
      action.disabled = true;
      current.mount(body, (ready) => (action.disabled = !ready));
      return;
    } else {
      action.textContent = 'Check';
      action.disabled = true;
    }
    current.mount?.(body, setReady);
  }

  function check() {
    const step = queue[index];
    const r = result(step.itemId);
    r.tested = true;
    const outcome = current.check(body);
    answered++;
    phase = 'continue';

    if (outcome.ok) {
      correct++;
      if (outcome.typo) r.typo = true;
      if (step.type === 'type' && !outcome.fast) r.fast = false;
      combo++;
      soundRight();
      foot.classList.add('good');
      const praise = ['Malamu!', 'Kitoko!', 'Malamu mingi!', 'Yes!'][Math.floor(Math.random() * 4)];
      feedback.innerHTML = outcome.typo
        ? `<strong>Almost!</strong> Watch the spelling: <span lang="ln">${esc(outcome.answer)}</span>`
        : `<strong>${praise}</strong>`;
    } else {
      r.mistakes++;
      combo = 0;
      soundWrong();
      foot.classList.add('bad');
      feedback.innerHTML = `<strong>Correct answer:</strong> <span lang="ln">${esc(outcome.answer)}</span>
        <div class="feedback-sub">${esc(ITEM_BY_ID.get(step.itemId).en)} = ${esc(ITEM_BY_ID.get(step.itemId).lg)}</div>`;
      // Ask again a few steps later — retrieval right after an error is where learning happens.
      queue.splice(Math.min(queue.length, index + 3), 0, { type: step.type, itemId: step.itemId });
    }
    comboEl.textContent = combo >= 3 ? `🔥 ${combo}` : '';
    action.textContent = 'Continue';
    action.disabled = false;
  }

  action.addEventListener('click', () => {
    if (phase === 'answer') return check();
    index++;
    if (index < queue.length) render();
    else finish();
  });

  function finish() {
    cleanup();
    const now = Date.now();
    const updated = [];
    const newIds = new Set(session.newIds);
    for (const id of session.itemIds) {
      const r = results[id];
      if (!r?.tested) continue;
      const grade = r.mistakes > 0 ? 0 : r.typo ? 1 : r.fast && !newIds.has(id) && (getCard(id)?.reps ?? 0) >= 2 ? 3 : 2;
      updated.push(schedule(getCard(id) || newCard(id, now), grade, now));
    }
    putCards(updated);

    const perfect = Object.values(results).every((r) => r.mistakes === 0);
    const xp = correct + 5 + (perfect ? 5 : 0);
    addXp(xp);

    onFinish({
      xp,
      perfect,
      accuracy: answered ? Math.round((correct / answered) * 100) : 100,
      learned: session.newIds.length,
      reviewed: session.itemIds.length - session.newIds.length,
      seconds: Math.round((now - startedAt) / 1000),
    });
  }

  render();
  return cleanup;
}
