// Runs a learning session: renders each exercise, checks answers, re-queues
// mistakes, then grades every card through the SRS scheduler.

import { ITEM_BY_ID, UNIT_BY_ID, LEVEL_BY_ID, levelItems } from './course.js';
import { checkTyped, normalize } from './answer.js';
import { choices, replyChoices, tiles, acceptedAnswers, shuffle, CHECKPOINT_PASS } from './lesson.js';
import { schedule, newCard, isLearned } from './srs.js';
import { getCard, putCards, addXp } from './store.js';
import { t, gloss, itemNote, itemTip, unitText, dialogueText, drillText } from './i18n.js';
import { icon, unitIcon } from './icons.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- Feedback sounds (tiny WebAudio tones, no files to download) --------------

let audio;
function tone(freqs) {
  try {
    audio ??= new AudioContext();
    let time = audio.currentTime;
    for (const f of freqs) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain).connect(audio.destination);
      osc.start(time);
      osc.stop(time + 0.16);
      time += 0.09;
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

// A dialogue line with its translation in the learner's language.
const lineWithGloss = (unitId, index) => {
  const line = UNIT_BY_ID.get(unitId).dialogue.lines[index];
  return { ...line, gloss: dialogueText(UNIT_BY_ID.get(unitId)).lines[index] };
};

function bubble(line, { reveal = false } = {}) {
  return `
    <button type="button" class="bubble bubble-${line.who} ${reveal ? 'revealed' : ''}">
      <span class="bubble-who">${line.who === 'you' ? t('who.you') : t('who.them')}</span>
      <span class="bubble-lg" lang="ln">${esc(line.lg)}</span>
      <span class="bubble-en">${esc(line.gloss)}</span>
    </button>`;
}

function wireBubbles(el) {
  el.querySelectorAll('.bubble').forEach((b) => b.addEventListener('click', () => b.classList.toggle('revealed')));
}

const label = (text, extra = '') => `<div class="ex-label">${extra}${text}</div>`;

function choiceList(options, render) {
  return `<div class="options">${options
    .map((o, i) => `<button type="button" class="option" data-key="${i}"><span class="key">${i + 1}</span><span class="option-text">${render(o)}</span></button>`)
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
             spellcheck="false" enterkeyhint="done" placeholder="${t('ex.placeholder')}" aria-label="${t('ex.placeholder')}">
      <div class="special-keys">
        <button type="button" class="key-btn" data-ch="ɛ">ɛ</button>
        <button type="button" class="key-btn" data-ch="ɔ">ɔ</button>
        <span class="hint">${t('ex.accentHint')}</span>
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
    html: `${header}
      <div class="speak-cue">${icon('speak')}</div>
      <p class="speak-instr">${t('ex.sayAloud')}</p>
      <div class="speak-answer" hidden>
        <div class="speak-lg" lang="ln">${esc(answer)}</div>
        ${extra}
      </div>`,
    actionLabel: t('ex.showAnswer'),
    mount(el, setReady) {
      setReady(true);
    },
    check(el, ask) {
      el.querySelector('.speak-answer').hidden = false;
      el.querySelector('.speak-instr').textContent = t('ex.likeThis');
      return ask().then((ok) => ({ ok, answer, sub, selfGraded: true }));
    },
  };
}

const tipHtml = (tip) => (tip ? `<div class="local-tip"><strong>${t('ex.localTip')}</strong> ${tip}</div>` : '');

// --- Exercises ----------------------------------------------------------------

function notesStep(step) {
  const unit = UNIT_BY_ID.get(step.unitId);
  const text = unitText(unit);
  return {
    auto: true,
    html: `
      ${label(t('ex.newUnit', { title: esc(text.title) }))}
      <h2 class="ex-title">${unitIcon(unit)} <span lang="ln">${esc(unit.lg)}</span></h2>
      <div class="notes">${text.intro}</div>`,
  };
}

function dialogueStep(step) {
  const unit = UNIT_BY_ID.get(step.unitId);
  const d = dialogueText(unit);
  return {
    auto: true,
    html: `
      ${label(t('ex.conversation', { title: esc(d.title) }))}
      <p class="setting">${esc(d.setting)}</p>
      <p class="hint">${t('ex.readAloud')}</p>
      <div class="chat">${unit.dialogue.lines.map((_, i) => bubble(lineWithGloss(step.unitId, i))).join('')}</div>`,
    mount: wireBubbles,
  };
}

function introStep(item) {
  const note = itemNote(item);
  return {
    auto: true,
    html: `
      ${label(t('ex.learnThis'), `<span class="badge">${t('ex.new')}</span>${item.local ? `<span class="badge badge-local">${t('badge.local')}</span>` : ''}`)}
      <div class="intro-card">
        <div class="intro-lg" lang="ln">${esc(item.lg)}</div>
        <div class="intro-en">${esc(gloss(item))}</div>
        ${note ? `<div class="intro-note">${note}</div>` : ''}
      </div>
      ${tipHtml(itemTip(item))}`,
  };
}

function mcStep(item, reverse) {
  return choiceExercise({
    html: `
      ${label(reverse ? t('ex.howSay') : t('ex.whatMeans'))}
      <div class="prompt ${reverse ? '' : 'prompt-lg'}" ${reverse ? '' : 'lang="ln"'}>${esc(reverse ? gloss(item) : item.lg)}</div>`,
    options: choices(item, reverse ? 'lg' : gloss),
    render: (o) => (reverse ? `<span lang="ln">${esc(o.lg)}</span>` : esc(gloss(o))),
    isRight: (o) => o.id === item.id,
    answer: reverse ? item.lg : gloss(item),
    sub: `${gloss(item)} = ${item.lg}`,
  });
}

function replyStep(step) {
  const unit = UNIT_BY_ID.get(step.unitId);
  const answer = lineWithGloss(step.unitId, step.line);
  const context = [];
  for (let i = Math.max(0, step.line - 2); i < step.line; i++) context.push(lineWithGloss(step.unitId, i));
  return choiceExercise({
    html: `
      ${label(t('ex.yourTurn'))}
      <p class="setting">${esc(dialogueText(unit).setting)}</p>
      <div class="chat">${context.map((l) => bubble(l)).join('') || `<p class="hint">${t('ex.youStart')}</p>`}</div>
      <p class="hint">${t('ex.hint', { text: esc(answer.gloss) })}</p>`,
    options: replyChoices(step.unitId, step.line),
    render: (o) => `<span lang="ln">${esc(o.lg)}</span>`,
    isRight: (o) => normalize(o.lg) === normalize(answer.lg),
    answer: answer.lg,
    sub: answer.gloss,
  });
}

function tilesStep(item) {
  const bank = tiles(item);
  const chosen = [];
  return {
    html: `
      ${label(t('ex.build'))}
      <div class="prompt">${esc(gloss(item))}</div>
      <div class="tile-answer" aria-label="${t('ex.yourAnswer')}"></div>
      <div class="tile-bank"></div>`,
    mount(el, setReady) {
      const answerEl = el.querySelector('.tile-answer');
      const bankEl = el.querySelector('.tile-bank');
      const draw = () => {
        answerEl.innerHTML = chosen
          .map((tl) => `<button type="button" class="tile" lang="ln" data-key="${tl.key}">${esc(tl.word)}</button>`)
          .join('');
        bankEl.innerHTML = bank
          .map((tl) => {
            const used = chosen.includes(tl);
            return `<button type="button" class="tile ${used ? 'used' : ''}" lang="ln" data-key="${tl.key}" ${used ? 'disabled' : ''}>${esc(tl.word)}</button>`;
          })
          .join('');
        setReady(chosen.length > 0);
      };
      answerEl.addEventListener('click', (e) => {
        const key = e.target.closest('.tile')?.dataset.key;
        if (key == null) return;
        chosen.splice(chosen.findIndex((tl) => String(tl.key) === key), 1);
        draw();
      });
      bankEl.addEventListener('click', (e) => {
        const key = e.target.closest('.tile:not(.used)')?.dataset.key;
        if (key == null) return;
        chosen.push(bank.find((tl) => String(tl.key) === key));
        draw();
      });
      draw();
    },
    check(el) {
      el.querySelectorAll('.tile').forEach((b) => (b.disabled = true));
      const got = normalize(chosen.map((tl) => tl.word).join(' '));
      return { ok: acceptedAnswers(item).some((a) => normalize(a) === got), answer: item.lg, sub: gloss(item) };
    },
  };
}

function typeStep(item) {
  return typedExercise({
    header: `${label(t('ex.type'))}<div class="prompt">${esc(gloss(item))}</div>`,
    accepted: acceptedAnswers(item),
    answer: item.lg,
    sub: gloss(item),
  });
}

function transformStep(item) {
  const d = drillText(item);
  return typedExercise({
    header: `
      ${label(t('ex.drill'))}
      <div class="drill">
        <div class="drill-from"><span lang="ln">${esc(item.drill.from)}</span><small>${esc(d.fromEn)}</small></div>
        <div class="drill-cue">→ ${esc(d.cue)}</div>
      </div>`,
    accepted: acceptedAnswers(item),
    answer: item.lg,
    sub: gloss(item),
  });
}

function speakStep(item) {
  return speakExercise({
    header: `${label(t('ex.speak'))}<div class="prompt">${esc(gloss(item))}</div>`,
    answer: item.lg,
    sub: gloss(item),
    extra: tipHtml(itemTip(item)),
  });
}

function speakLineStep(step) {
  const line = lineWithGloss(step.unitId, step.line);
  const prev = step.line > 0 ? lineWithGloss(step.unitId, step.line - 1) : null;
  return speakExercise({
    header: `
      ${label(t('ex.roleplay'))}
      <div class="chat">${prev ? bubble(prev, { reveal: true }) : ''}</div>
      <div class="prompt">${esc(line.gloss)}</div>`,
    answer: line.lg,
    sub: line.gloss,
  });
}

function matchStep(step, onMistake) {
  const items = step.itemIds.map((id) => ITEM_BY_ID.get(id));
  const left = shuffle(items);
  const right = shuffle(items);
  return {
    auto: 'when-done',
    html: `
      ${label(t('ex.warmup'))}
      <div class="match">
        <div class="match-col">${left.map((i) => `<button type="button" class="tile match-tile" lang="ln" data-side="l" data-id="${i.id}">${esc(i.lg)}</button>`).join('')}</div>
        <div class="match-col">${right.map((i) => `<button type="button" class="tile match-tile" data-side="r" data-id="${i.id}">${esc(gloss(i))}</button>`).join('')}</div>
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

const PRAISE = ['Malamu!', 'Kitoko!', 'Malamu mingi!', 'Ya solo!', 'Ebongi!'];

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
        <button type="button" class="icon-btn quit" aria-label="${t('ex.quit')}">${icon('close')}</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar"></div></div>
        <span class="combo" aria-live="polite"></span>
      </header>
      <main class="session-body"></main>
      <footer class="session-foot">
        <div class="session-foot-inner">
          <div class="feedback" aria-live="assertive"></div>
          <button type="button" class="btn btn-primary btn-block action" disabled>${t('btn.check')}</button>
        </div>
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
    if (index === 0 || confirm(t('ex.quitConfirm'))) {
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
      action.textContent = t('btn.continue');
      action.disabled = false;
      current.mount?.(body);
      return;
    }
    if (current.auto === 'when-done') {
      phase = 'continue';
      action.textContent = t('btn.continue');
      action.disabled = true;
      current.mount(body, (ready) => (action.disabled = !ready));
      return;
    }
    action.textContent = current.actionLabel || t('btn.check');
    action.disabled = true;
    current.mount?.(body, setReady);
  }

  // Self-grading buttons for speaking exercises.
  function askSelfGrade() {
    phase = 'waiting';
    action.hidden = true;
    feedback.innerHTML = `
      <div class="self-grade">
        <button type="button" class="btn btn-secondary" data-ok="0">${icon('close')} ${t('ex.notQuite')}</button>
        <button type="button" class="btn btn-primary" data-ok="1">${icon('check')} ${t('ex.saidIt')}</button>
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
      feedback.innerHTML = outcome.typo
        ? `<div class="fb-title">${icon('check')} ${t('ex.almost')}</div><div class="feedback-sub"><span lang="ln">${esc(outcome.answer)}</span></div>`
        : `<div class="fb-title">${icon('check')} <span lang="ln">${PRAISE[Math.floor(Math.random() * PRAISE.length)]}</span></div>
           ${outcome.selfGraded ? '' : `<div class="feedback-sub">${esc(outcome.sub || '')}</div>`}`;
    } else {
      r.mistakes++;
      combo = 0;
      if (!outcome.selfGraded) soundWrong();
      foot.classList.add('bad');
      feedback.innerHTML = outcome.selfGraded
        ? `<div class="fb-title">${t('ex.keepPractising')}</div><div class="feedback-sub">${esc(outcome.sub || '')}</div>`
        : `<div class="fb-title">${icon('close')} ${t('ex.correct')}</div>
           <div class="fb-answer" lang="ln">${esc(outcome.answer)}</div>
           <div class="feedback-sub">${esc(outcome.sub || '')}</div>`;
      // Ask again a few steps later — retrieval right after an error is where learning happens.
      if (!session.noRequeue) queue.splice(Math.min(queue.length, index + 3), 0, { ...step });
    }
    comboEl.innerHTML = combo >= 3 ? `${icon('flame')} ${combo}` : '';
    action.textContent = t('btn.continue');
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
