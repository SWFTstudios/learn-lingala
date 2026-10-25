// Runs a learning session: renders each exercise, checks answers, re-queues
// mistakes, then grades every card through the SRS scheduler.

import { ITEM_BY_ID, UNIT_BY_ID, LEVEL_BY_ID, levelItems } from './course.js';
import { checkTyped, normalize } from './answer.js';
import { choices, replyChoices, tiles, acceptedAnswers, shuffle, CHECKPOINT_PASS } from './lesson.js';
import { schedule, newCard, isLearned } from './srs.js';
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

// --- Shared bits --------------------------------------------------------------

function bubble(line, { reveal = false } = {}) {
  return `
    <button type="button" class="bubble bubble-${line.who} ${reveal ? 'revealed' : ''}">
      <span class="bubble-who">${line.who === 'you' ? 'You' : 'Them'}</span>
      <span class="bubble-lg" lang="ln">${esc(line.lg)}</span>
      <span class="bubble-en">${esc(line.en)}</span>
    </button>`;
}

function wireBubbles(el) {
  el.querySelectorAll('.bubble').forEach((b) => b.addEventListener('click', () => b.classList.toggle('revealed')));
}

function choiceList(options, render) {
  return `<div class="options">${options
    .map((o, i) => `<button type="button" class="option" data-key="${i}"><span class="key">${i + 1}</span>${render(o)}</button>`)
    .join('')}</div>`;
}

// A multiple-choice exercise over `options`, where `isRight(option)` marks the answer.
function choiceExercise({ html, options, render, isRight, answer, sub }) {
  let picked = null;
  return {
    html: html + choiceList(options, render),
    mount(el, setReady) {
      el.querySelectorAll('.option').forEach((btn) =>
        btn.addEventListener('click', () => {
          el.querySelectorAll('.option').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          picked = options[Number(btn.dataset.key)];
          setReady(true);
        }),
      );
      wireBubbles(el);
    },
    key(k, el) {
      el.querySelectorAll('.option')[Number(k) - 1]?.click();
    },
    check(el) {
      el.querySelectorAll('.option').forEach((b) => {
        const o = options[Number(b.dataset.key)];
        b.disabled = true;
        if (isRight(o)) b.classList.add('correct');
        else if (o === picked) b.classList.add('wrong');
      });
      return { ok: !!picked && isRight(picked), answer, sub };
    },
  };
}

// A typed-answer exercise. `header` is the HTML above the input.
function typedExercise({ header, accepted, answer, sub }) {
  let started = 0;
  return {
    html: `${header}
      <input class="type-input" lang="ln" autocomplete="off" autocapitalize="off" autocorrect="off"
             spellcheck="false" enterkeyhint="done" placeholder="Type in Lingala" aria-label="Your answer">
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
      const verdict = checkTyped(input.value, accepted);
      input.classList.add(verdict === 'wrong' ? 'wrong' : 'correct');
      return { ok: verdict !== 'wrong', typo: verdict === 'typo', fast: started && Date.now() - started < 6000, answer, sub };
    },
  };
}

// Say it out loud, reveal, then grade yourself honestly.
function speakExercise({ header, answer, sub, extra = '' }) {
  return {
    selfGraded: true,
    html: `${header}
      <div class="speak-cue" aria-hidden="true">🗣️</div>
      <p class="speak-instr">Say it <strong>out loud</strong> before you check.</p>
      <div class="speak-answer" hidden>
        <div class="speak-lg" lang="ln">${esc(answer)}</div>
        ${extra}
      </div>`,
    actionLabel: 'Show answer',
    mount(el, setReady) {
      setReady(true);
    },
    check(el, ask) {
      el.querySelector('.speak-answer').hidden = false;
      el.querySelector('.speak-instr').textContent = 'Did you say it like this?';
      return ask().then((ok) => ({ ok, answer, sub, selfGraded: true }));
    },
  };
}

// --- Exercises ----------------------------------------------------------------

function notesStep(step) {
  const unit = UNIT_BY_ID.get(step.unitId);
  return {
    auto: true,
    html: `
      <div class="ex-label">New unit · ${esc(unit.title)}</div>
      <h2 class="ex-title">${unit.emoji} <span lang="ln">${esc(unit.lg)}</span></h2>
      <div class="notes">${unit.intro}</div>`,
  };
}

function dialogueStep(step) {
  const d = UNIT_BY_ID.get(step.unitId).dialogue;
  return {
    auto: true,
    html: `
      <div class="ex-label">Conversation · ${esc(d.title)}</div>
      <p class="setting">${esc(d.setting)}</p>
      <p class="hint">Read it out loud. Tap a line to see the English — try to guess first.</p>
      <div class="chat">${d.lines.map((l) => bubble(l)).join('')}</div>`,
    mount: wireBubbles,
  };
}

function introStep(item) {
  return {
    auto: true,
    html: `
      <div class="ex-label"><span class="badge">New</span> ${item.local ? '<span class="badge badge-local">Sounds local</span>' : ''} Learn this</div>
      <div class="intro-card">
        <div class="intro-lg" lang="ln">${esc(item.lg)}</div>
        <div class="intro-en">${esc(item.en)}</div>
        ${item.note ? `<div class="intro-note">${item.note}</div>` : ''}
      </div>
      ${item.tip ? `<div class="local-tip"><strong>🇨🇩 Local tip</strong> ${item.tip}</div>` : ''}`,
  };
}

function mcStep(item, reverse) {
  const field = reverse ? 'lg' : 'en';
  return choiceExercise({
    html: `
      <div class="ex-label">${reverse ? 'How do you say this in Lingala?' : 'What does this mean?'}</div>
      <div class="prompt ${reverse ? '' : 'prompt-lg'}" ${reverse ? '' : 'lang="ln"'}>${esc(reverse ? item.en : item.lg)}</div>`,
    options: choices(item, field),
    render: (o) => (reverse ? `<span lang="ln">${esc(o.lg)}</span>` : esc(o.en)),
    isRight: (o) => o.id === item.id,
    answer: reverse ? item.lg : item.en,
    sub: `${item.en} = ${item.lg}`,
  });
}

function replyStep(step) {
  const lines = UNIT_BY_ID.get(step.unitId).dialogue.lines;
  const answer = lines[step.line];
  const context = lines.slice(Math.max(0, step.line - 2), step.line);
  return choiceExercise({
    html: `
      <div class="ex-label">Your turn — what do you say?</div>
      <p class="setting">${esc(UNIT_BY_ID.get(step.unitId).dialogue.setting)}</p>
      <div class="chat">${context.map((l) => bubble(l)).join('') || '<p class="hint">You start the conversation.</p>'}</div>
      <p class="hint">Hint: ${esc(answer.en)}</p>`,
    options: replyChoices(step.unitId, step.line),
    render: (o) => `<span lang="ln">${esc(o.lg)}</span>`,
    isRight: (o) => normalize(o.lg) === normalize(answer.lg),
    answer: answer.lg,
    sub: answer.en,
  });
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
      return { ok: acceptedAnswers(item).some((a) => normalize(a) === got), answer: item.lg, sub: item.en };
    },
  };
}

function typeStep(item) {
  return typedExercise({
    header: `<div class="ex-label">Type this in Lingala</div><div class="prompt">${esc(item.en)}</div>`,
    accepted: acceptedAnswers(item),
    answer: item.lg,
    sub: item.en,
  });
}

function transformStep(item) {
  const d = item.drill;
  return typedExercise({
    header: `
      <div class="ex-label">Pattern drill — change the sentence</div>
      <div class="drill">
        <div class="drill-from"><span lang="ln">${esc(d.from)}</span><small>${esc(d.fromEn)}</small></div>
        <div class="drill-cue">→ ${esc(d.cue)}</div>
      </div>`,
    accepted: acceptedAnswers(item),
    answer: item.lg,
    sub: item.en,
  });
}

function speakStep(item) {
  return speakExercise({
    header: `<div class="ex-label">Speak</div><div class="prompt">${esc(item.en)}</div>`,
    answer: item.lg,
    sub: item.en,
    extra: item.tip ? `<div class="local-tip"><strong>🇨🇩</strong> ${item.tip}</div>` : '',
  });
}

function speakLineStep(step) {
  const d = UNIT_BY_ID.get(step.unitId).dialogue;
  const line = d.lines[step.line];
  const prev = d.lines[step.line - 1];
  return speakExercise({
    header: `
      <div class="ex-label">Role-play — say your line</div>
      <div class="chat">${prev ? bubble(prev, { reveal: true }) : ''}</div>
      <div class="prompt">${esc(line.en)}</div>`,
    answer: line.lg,
    sub: line.en,
  });
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

function exerciseFor(step, onMatchMistake) {
  const item = step.itemId && ITEM_BY_ID.get(step.itemId);
  switch (step.type) {
    case 'notes': return notesStep(step);
    case 'dialogue': return dialogueStep(step);
    case 'intro': return introStep(item);
    case 'mc': return mcStep(item, false);
    case 'mc-rev': return mcStep(item, true);
    case 'tiles': return tilesStep(item);
    case 'type': return typeStep(item);
    case 'transform': return transformStep(item);
    case 'speak': return speakStep(item);
    case 'reply': return replyStep(step);
    case 'speak-line': return speakLineStep(step);
    case 'match': return matchStep(step, onMatchMistake);
    default: throw new Error(`Unknown step type: ${step.type}`);
  }
}

// Results are tracked per card; dialogue lines without a card get their own key.
const resultKey = (step) => step.itemId || `line:${step.unitId}:${step.line}`;

// --- Session runner -----------------------------------------------------------

export function runSession(root, session, { onExit, onFinish }) {
  const queue = session.steps.slice();
  const results = {};
  const result = (key) => (results[key] ??= { mistakes: 0, typo: false, fast: true, tested: false });
  let index = 0;
  let correct = 0;
  let answered = 0;
  let combo = 0;
  const startedAt = Date.now();
  const isTest = session.kind === 'checkpoint';

  root.innerHTML = `
    <div class="session">
      <header class="session-top">
        <button type="button" class="icon-btn quit" aria-label="Quit">✕</button>
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
  let phase = 'answer'; // 'answer' | 'waiting' | 'continue'

  root.querySelector('.quit').addEventListener('click', () => {
    if (index === 0 || confirm('Quit now? Progress from this session will not be saved.')) {
      cleanup();
      onExit();
    }
  });

  function onKey(e) {
    if (e.key === 'Enter' && !action.disabled && !action.hidden) {
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
    action.hidden = false;
    phase = 'answer';

    current = exerciseFor(step, (id) => {
      result(id).mistakes += 1;
      result(id).tested = true;
    });

    body.innerHTML = `<div class="exercise">${current.html}</div>`;
    body.scrollTop = 0;
    if (current.auto === true) {
      phase = 'continue';
      action.textContent = 'Continue';
      action.disabled = false;
      current.mount?.(body);
      return;
    }
    if (current.auto === 'when-done') {
      phase = 'continue';
      action.textContent = 'Continue';
      action.disabled = true;
      current.mount(body, (ready) => (action.disabled = !ready));
      return;
    }
    action.textContent = current.actionLabel || 'Check';
    action.disabled = true;
    current.mount?.(body, setReady);
  }

  // Self-grading buttons for speaking exercises.
  function askSelfGrade() {
    phase = 'waiting';
    action.hidden = true;
    feedback.innerHTML = `
      <div class="self-grade">
        <button type="button" class="btn btn-secondary" data-ok="0">✗ Not quite</button>
        <button type="button" class="btn btn-primary" data-ok="1">✓ I said it</button>
      </div>`;
    return new Promise((resolve) =>
      feedback.querySelectorAll('[data-ok]').forEach((b) =>
        b.addEventListener('click', () => {
          action.hidden = false;
          resolve(b.dataset.ok === '1');
        }),
      ),
    );
  }

  async function check() {
    const step = queue[index];
    const r = result(resultKey(step));
    r.tested = true;
    action.disabled = true;
    const outcome = await current.check(body, askSelfGrade);
    answered++;
    phase = 'continue';

    if (outcome.ok) {
      correct++;
      if (outcome.typo) r.typo = true;
      if (step.type === 'type' && !outcome.fast) r.fast = false;
      combo++;
      if (!outcome.selfGraded) soundRight();
      foot.classList.add('good');
      const praise = ['Malamu!', 'Kitoko!', 'Malamu mingi!', 'Ya solo!', 'Ebongi!'][Math.floor(Math.random() * 5)];
      feedback.innerHTML = outcome.typo
        ? `<strong>Almost!</strong> Watch the spelling: <span lang="ln">${esc(outcome.answer)}</span>`
        : `<strong>${praise}</strong>${outcome.selfGraded ? '' : ` <span class="feedback-sub">${esc(outcome.sub || '')}</span>`}`;
    } else {
      r.mistakes++;
      combo = 0;
      if (!outcome.selfGraded) soundWrong();
      foot.classList.add('bad');
      feedback.innerHTML = `<strong>${outcome.selfGraded ? "Keep practising — it'll come back soon." : 'Correct answer:'}</strong>
        ${outcome.selfGraded ? '' : `<span lang="ln">${esc(outcome.answer)}</span>`}
        <div class="feedback-sub">${esc(outcome.sub || '')}</div>`;
      // Ask again a few steps later — retrieval right after an error is where learning happens.
      if (!session.noRequeue) queue.splice(Math.min(queue.length, index + 3), 0, { ...step });
    }
    comboEl.textContent = combo >= 3 ? `🔥 ${combo}` : '';
    action.textContent = 'Continue';
    action.disabled = false;
  }

  action.addEventListener('click', () => {
    if (phase === 'answer') return check();
    if (phase !== 'continue') return;
    index++;
    if (index < queue.length) render();
    else finish();
  });

  function finish() {
    cleanup();
    const now = Date.now();
    const score = answered ? correct / answered : 1;
    const passed = isTest && score >= CHECKPOINT_PASS;
    const updated = new Map();
    const newIds = new Set(session.newIds);

    for (const id of session.itemIds) {
      const r = results[id];
      if (!r?.tested) continue;
      const card = getCard(id);
      if (isTest && !isLearned(card) && !passed) continue; // a failed test doesn't add new cards
      const grade = r.mistakes > 0 ? 0 : r.typo ? 1 : r.fast && !newIds.has(id) && (card?.reps ?? 0) >= 2 ? 3 : 2;
      updated.set(id, schedule(card || newCard(id, now), grade, now));
    }
    // Testing out: everything else in the level joins your reviews, due soon to confirm it.
    let testedOut = 0;
    if (passed) {
      for (const item of levelItems(session.levelId)) {
        if (updated.has(item.id) || isLearned(getCard(item.id))) continue;
        updated.set(item.id, schedule(newCard(item.id, now), 1, now));
        testedOut++;
      }
    }
    putCards([...updated.values()]);

    const perfect = answered > 0 && correct === answered;
    const xp = correct + 5 + (perfect ? 5 : 0) + (passed ? 20 : 0);
    addXp(xp);

    onFinish({
      kind: session.kind,
      xp,
      perfect,
      accuracy: Math.round(score * 100),
      learned: session.newIds.length,
      reviewed: session.itemIds.length - session.newIds.length,
      seconds: Math.round((now - startedAt) / 1000),
      checkpoint: isTest ? { passed, level: LEVEL_BY_ID.get(session.levelId), testedOut } : null,
    });
  }

  render();
  return cleanup;
}
