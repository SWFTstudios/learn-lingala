import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalize, checkTyped } from '../public/app/js/answer.js';
import { schedule, newCard, DAY, MINUTE } from '../public/app/js/srs.js';
import { LEVELS, UNITS, COURSE, ITEMS, ITEM_BY_ID, levelItems } from '../public/app/js/course.js';
import {
  buildLesson, buildDueReview, buildConversation, buildCheckpoint, choices, replyChoices, tiles,
  currentUnit, reviewStepFor, daysToLevel, NEW_PER_LESSON,
} from '../public/app/js/lesson.js';
import { hasIcon } from '../public/app/js/icons.js';
import { breakdown, unknownWords } from '../public/app/js/breakdown.js';
import { deckItems, lookAlikes, contextLines, TRICKY_LAPSES } from '../public/app/js/study.js';

const noFuzz = () => 0.5;
const learnedCard = (id, now) => ({ ...newCard(id, now), reps: 2, interval: 3, last: now - 4 * DAY, due: now - DAY });

test('normalize ignores tones, open vowels, case and punctuation', () => {
  assert.equal(normalize('Matɔ́ndɔ mingi!'), 'matondo mingi');
  assert.equal(normalize('  Ozali   MALAMU? '), 'ozali malamu');
  assert.equal(normalize('Ɛɛ'), 'ee');
});

test('checkTyped accepts exact, alternative, and near-miss answers', () => {
  assert.equal(checkTyped('matondo', ['Matɔ́ndɔ']), 'correct');
  assert.equal(checkTyped('papa', ['tata', 'papa']), 'correct');
  assert.equal(checkTyped('matonda', ['Matɔ́ndɔ']), 'typo');
  assert.equal(checkTyped('lipa', ['mai']), 'wrong');
  assert.equal(checkTyped('ye', ['yo']), 'wrong', 'no typo allowance on short words');
  assert.equal(checkTyped('', ['mai']), 'wrong');
});

test('SRS: intervals grow with correct answers and reset on a miss', () => {
  const t0 = 1_000_000_000_000;
  let c = schedule(newCard('x', t0), 2, t0, noFuzz);
  assert.equal(c.interval, 1);
  assert.equal(c.due, t0 + DAY);
  c = schedule(c, 2, t0 + DAY, noFuzz);
  assert.equal(c.interval, 3);
  c = schedule(c, 2, t0 + 4 * DAY, noFuzz);
  assert.ok(c.interval > 7, `third interval should grow past a week, got ${c.interval}`);

  const missed = schedule(c, 0, t0 + 20 * DAY, noFuzz);
  assert.equal(missed.reps, 0);
  assert.equal(missed.lapses, 1);
  assert.equal(missed.due, t0 + 20 * DAY + 10 * MINUTE);
  assert.ok(missed.ease < c.ease);
});

test('course: levels cover every unit exactly once, ids unique and stable-shaped', () => {
  const inLevels = LEVELS.flatMap((l) => l.units);
  assert.equal(new Set(inLevels).size, inLevels.length, 'a unit appears in two levels');
  assert.deepEqual([...inLevels].sort(), UNITS.map((u) => u.id).sort());
  assert.equal(COURSE.length, UNITS.length);

  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate item id');
  for (const i of ITEMS) {
    assert.ok(i.lg && i.en, i.id);
    assert.match(i.id, /^[a-z0-9-]{1,64}$/);
    assert.ok(i.level && i.unit, i.id);
  }
  // English prompts must be unambiguous within a unit for typing exercises.
  for (const u of UNITS) {
    const ens = u.items.map((i) => normalize(i.en));
    assert.equal(new Set(ens).size, ens.length, `duplicate English in ${u.id}`);
  }
  for (const l of LEVELS) assert.ok(l.canDo.length >= 3, `${l.id} needs can-do goals`);
});

test('course: progress from the first version keeps working (item ids preserved)', () => {
  const v1 = ['g-mbote', 'g-limbisa', 'p-nkombo-ngai', 'f-kitoko', 'n-ntalo-boni', 'fd-ezali-elengi',
    'v-nakozonga', 'w-nasosoli-te', 'w-nasepeli', 'q-ndako-wapi', 't-zando-lobi'];
  for (const id of v1) assert.ok(ITEM_BY_ID.has(id), `lost v1 item ${id}`);
});

test('dialogues: well-formed, linked ids exist and match the line', () => {
  for (const u of UNITS.filter((x) => x.dialogue)) {
    const { lines, title, setting } = u.dialogue;
    assert.ok(title && setting, u.id);
    assert.ok(lines.some((l) => l.who === 'you') && lines.some((l) => l.who === 'them'), u.id);
    for (const l of lines) {
      assert.ok(['you', 'them'].includes(l.who) && l.lg && l.en, `${u.id}: bad line`);
      if (l.id) {
        assert.ok(ITEM_BY_ID.has(l.id), `${u.id}: unknown id ${l.id}`);
        assert.equal(normalize(l.lg), normalize(ITEM_BY_ID.get(l.id).lg), `${u.id}: line text differs from ${l.id}`);
      }
    }
  }
});

test('pattern drills: every drill has a source, a cue, and a different answer', () => {
  const drills = ITEMS.filter((i) => i.drill);
  assert.ok(drills.length >= 20, 'expected plenty of pattern drills');
  for (const i of drills) {
    assert.ok(i.drill.from && i.drill.fromEn && i.drill.cue, i.id);
    assert.notEqual(normalize(i.drill.from), normalize(i.lg), `${i.id}: drill doesn't change anything`);
  }
});

test('first lesson: notes, dialogue, then every new item is introduced before it is tested', () => {
  const cards = {};
  const lesson = buildLesson(COURSE[0].id, (id) => cards[id]);
  assert.deepEqual(lesson.steps.slice(0, 2).map((s) => s.type), ['notes', 'dialogue']);
  assert.equal(lesson.newIds.length, NEW_PER_LESSON);
  const introduced = new Set();
  for (const step of lesson.steps) {
    if (step.type === 'intro') introduced.add(step.itemId);
    else if (step.itemId) assert.ok(introduced.has(step.itemId), `${step.type} before intro for ${step.itemId}`);
  }
  for (const id of lesson.newIds) {
    assert.ok(lesson.steps.filter((s) => s.itemId === id).length >= 4, `${id}: needs 4+ exposures`);
  }
});

test('lessons mix in due reviews and advance through the course in level order', () => {
  const now = Date.now();
  const cards = {};
  for (const item of COURSE[0].items) cards[item.id] = learnedCard(item.id, now);
  const get = (id) => cards[id];
  assert.equal(currentUnit(get).id, COURSE[1].id);
  const lesson = buildLesson(COURSE[1].id, get, now);
  assert.ok(lesson.itemIds.some((id) => !lesson.newIds.includes(id)), 'due reviews are interleaved');

  const review = buildDueReview(get, now);
  assert.equal(review.kind, 'review');
  assert.equal(review.steps[0].type, 'match');
});

test('review exercises get harder as a card matures; drills are used for patterned items', () => {
  const drilled = ITEMS.find((i) => i.drill);
  assert.equal(reviewStepFor(drilled, { reps: 0 }).type, 'mc');
  assert.equal(reviewStepFor(drilled, { reps: 1 }).type, 'transform');
  const word = ITEMS.find((i) => !i.drill && !normalize(i.lg).includes(' '));
  assert.equal(reviewStepFor(word, { reps: 5 }, () => 0).type, 'type');
  const phrase = ITEMS.find((i) => !i.drill && normalize(i.lg).includes(' '));
  assert.equal(reviewStepFor(phrase, { reps: 5 }, () => 0).type, 'speak');
});

test('conversation role-play: one reply per line you say, graded only for learned items', () => {
  for (const u of UNITS.filter((x) => x.dialogue)) {
    const session = buildConversation(u.id, () => undefined);
    const yours = u.dialogue.lines.filter((l) => l.who === 'you').length;
    assert.equal(session.steps[0].type, 'dialogue');
    assert.equal(session.steps.filter((s) => s.type === 'reply').length, yours, u.id);
    assert.deepEqual(session.itemIds, [], 'nothing is graded before it is learned');
    for (const s of session.steps.filter((x) => x.type === 'reply')) {
      const opts = replyChoices(u.id, s.line);
      assert.equal(opts.length, 4, `${u.id} line ${s.line}`);
      assert.equal(new Set(opts.map((o) => normalize(o.lg))).size, 4);
    }
  }
});

test('checkpoints: a mixed test of the level with no re-asks', () => {
  for (const level of LEVELS) {
    const cp = buildCheckpoint(level.id);
    assert.equal(cp.kind, 'checkpoint');
    assert.ok(cp.noRequeue);
    assert.ok(cp.steps.length >= 10, level.id);
    const ids = new Set(levelItems(level.id).map((i) => i.id));
    for (const id of cp.itemIds) assert.ok(ids.has(id), `${id} not in ${level.id}`);
    assert.ok(!cp.steps.some((s) => s.type === 'intro'), 'no teaching in a test');
  }
});

test('pace estimate shrinks as you learn and with a bigger goal', () => {
  const none = () => undefined;
  const d20 = daysToLevel('conversations', none, 20);
  assert.ok(d20 > 0);
  assert.ok(daysToLevel('conversations', none, 50) < d20);
  const now = Date.now();
  const all = Object.fromEntries(ITEMS.map((i) => [i.id, learnedCard(i.id, now)]));
  assert.equal(daysToLevel('conversations', (id) => all[id], 20), 0);
});

test('exercise content: choices and tiles are valid for every item', () => {
  for (const item of ITEMS) {
    const opts = choices(item, 'en');
    assert.equal(opts.length, 4);
    assert.ok(opts.includes(item));
    assert.equal(new Set(opts.map((o) => normalize(o.en))).size, 4, `ambiguous options for ${item.id}`);
    const bank = tiles(item).map((t) => normalize(t.word));
    for (const w of normalize(item.lg).split(' ')) assert.ok(bank.includes(w), `${item.id} missing tile ${w}`);
  }
});

test('chat scenarios: unique, complete, and tied to real course levels', async () => {
  const { SCENARIOS } = await import('../public/app/js/chat-scenarios.js');
  const ids = SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SCENARIOS) {
    assert.match(s.id, /^[a-z-]+$/);
    assert.ok(s.partner && s.persona && s.setting && s.opener.lg && s.opener.en, s.id);
    assert.ok(s.level === null || LEVELS.some((l) => l.id === s.level), `${s.id}: unknown level`);
  }
  assert.ok(SCENARIOS.filter((s) => s.mission).length >= 5, 'most partners come with a mission');
});

// --- Base language (i18n) ------------------------------------------------------------

import { readFileSync, readdirSync } from 'node:fs';
import { FR_ITEMS, FR_UNITS, FR_LEVELS, FR_DIALOGUES, FR_SCENARIOS, FR_DRILL } from '../public/app/js/course-fr.js';
import { setLang, t, gloss, hasKey, stringKeys, LANGS } from '../public/app/js/i18n.js';

const frEntry = (id) => (typeof FR_ITEMS[id] === 'string' ? { m: FR_ITEMS[id] } : FR_ITEMS[id]);

test('French: every item has a meaning, and every note/tip is translated', () => {
  for (const i of ITEMS) {
    const f = frEntry(i.id);
    assert.ok(f?.m, `missing French meaning for ${i.id}`);
    if (i.note) assert.ok(f.note, `missing French note for ${i.id}`);
    if (i.tip) assert.ok(f.tip, `missing French tip for ${i.id}`);
  }
  for (const id of Object.keys(FR_ITEMS)) assert.ok(ITEMS.some((i) => i.id === id), `stray French entry ${id}`);
  // French prompts must be unambiguous within a unit too.
  for (const u of UNITS) {
    const ms = u.items.map((i) => normalize(frEntry(i.id).m));
    assert.equal(new Set(ms).size, ms.length, `duplicate French meaning in ${u.id}`);
  }
});

test('French: units, levels, dialogues, scenarios and drill cues are complete', async () => {
  const { SCENARIOS } = await import('../public/app/js/chat-scenarios.js');
  for (const u of UNITS) {
    assert.ok(FR_UNITS[u.id]?.title && FR_UNITS[u.id]?.intro, `unit ${u.id}`);
    if (u.dialogue) {
      const d = FR_DIALOGUES[u.id];
      assert.ok(d?.title && d?.setting, `dialogue ${u.id}`);
      assert.equal(d.lines.length, u.dialogue.lines.length, `dialogue ${u.id} line count`);
    }
  }
  for (const l of LEVELS) {
    const f = FR_LEVELS[l.id];
    assert.ok(f?.title && f?.subtitle && f?.weeks, `level ${l.id}`);
    assert.equal(f.canDo.length, l.canDo.length, `level ${l.id} can-do count`);
  }
  for (const s of SCENARIOS) {
    const f = FR_SCENARIOS[s.id];
    assert.ok(f?.title && f?.setting && f?.opener, `scenario ${s.id}`);
    assert.equal(!!f.mission, !!s.mission, `scenario ${s.id} mission`);
  }
  for (const i of ITEMS.filter((x) => x.drill)) {
    assert.ok(FR_DRILL[i.drill.fromEn], `drill text "${i.drill.fromEn}"`);
    assert.ok(FR_DRILL[i.drill.cue], `drill cue "${i.drill.cue}"`);
  }
});

test('gloss() follows the base language', () => {
  const mbote = ITEMS.find((i) => i.id === 'g-mbote');
  setLang('fr');
  assert.equal(gloss(mbote), 'Bonjour');
  assert.equal(t('nav.learn'), 'Apprendre');
  setLang('en');
  assert.equal(gloss(mbote), 'Hello');
  assert.equal(setLang('xx'), 'en', 'unsupported languages fall back to English');
});

test('UI strings: every key used in the app exists in every language', () => {
  const dir = new URL('../public/app/js/', import.meta.url);
  const src = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const used = new Set();
  for (const [, key] of src.matchAll(/\bt\('([a-zA-Z0-9.-]+)'/g)) used.add(key);
  for (const [, key] of src.matchAll(/\btn\('([a-zA-Z0-9.-]+)'/g)) used.add(`${key}_one`).add(`${key}_other`);
  // Keys built at runtime.
  for (const k of ['learn', 'review', 'chat', 'translate', 'account']) used.add(`nav.${k}`);
  for (const g of [10, 20, 30, 50]) used.add(`goal.${g}`).add(`goal.name.${g}`);
  for (const m of ['travel', 'family', 'music', 'friends', 'work', 'curious']) used.add(`mot.${m}`).add(`mot.line.${m}`);
  for (const c of ['high', 'medium', 'low']) used.add(`tr.conf.${c}`);
  for (const r of ['learn', 'unit', 'level', 'review', 'chat', 'translate', 'phrases', 'account', 'study', 'card', 'forgot', 'reset']) used.add(`title.${r}`);
  for (const c of ['off', 'email', 'sms']) used.add(`nt.ch.${c}`);
  for (const e of ['email-off', 'sms-off', 'pro-only', 'phone-unverified', 'phone-invalid', 'code-wrong', 'code-expired', 'sms-quota', 'reset-expired', 'email-failed', 'sms-failed']) used.add(`nerr.${e}`);
  for (const d of ['due', 'weak', 'tricky', 'recent', 'all']) used.add(`study.deck.${d}`).add(`study.deckSub.${d}`);
  for (const f of ['ln', 'base', 'mix']) used.add(`study.front.${f}`);
  for (const c of ['none', 'think', 'sure']) used.add(`study.conf.${c}`);
  for (const g of [0, 1, 2, 3]) used.add(`study.grade.${g}`);
  for (const k of ['pretest', 'hyper', 'hook', 'notes', 'confuse', 'spacing']) used.add(`study.sci.${k}`);
  for (const p of ['prog', 'have', 'neg', 'poss', 'dont', 'respect', 'each', 'chain']) used.add(`bd.pat.${p}`);
  for (const e of ['busy', 'unavailable', 'connection', 'refused', 'muddled', 'quota', 'too-long', 'off']) used.add(`aiErr.${e}`);

  for (const key of used) assert.ok(hasKey(key, 'en'), `missing English string ${key}`);
  for (const lang of Object.keys(LANGS)) {
    for (const key of stringKeys('en')) {
      assert.ok(hasKey(key, lang), `missing ${lang} string ${key}`);
    }
  }
});

test('every unit has an icon from the icon set', () => {
  for (const unit of COURSE) assert.ok(unit.icon && hasIcon(unit.icon), `unit ${unit.id} has no valid icon`);
});

test('breakdown: every word of every course phrase is in the lexicon', () => {
  for (const item of ITEMS) {
    for (const text of [item.lg, ...(item.alt || [])]) {
      assert.deepEqual(unknownWords(text), [], `unknown word in "${text}" (${item.id})`);
    }
  }
});

test('breakdown: verb pieces join back into the word, and each piece has a meaning', () => {
  for (const item of ITEMS) {
    for (const w of breakdown(item.lg).words) {
      if (!w.pieces) continue;
      assert.equal(normalize(w.pieces.map((p) => p.m).join('')), normalize(w.word), `${w.word} (${item.id})`);
      for (const p of w.pieces) if (p.kind !== 'end') assert.ok(p.g, `piece ${p.m} of ${w.word} has no gloss`);
    }
  }
  const [nalingi] = breakdown('Nalingi').words;
  assert.deepEqual(nalingi.pieces.map((p) => p.m), ['na', 'ling', 'i']);
  assert.ok(breakdown('Nazali kolia te').patterns.includes('prog'));
  assert.ok(breakdown('Nazali kolia te').patterns.includes('neg'));
  assert.ok(breakdown('mama na ngai').patterns.includes('poss'));
  assert.ok(breakdown('Kobanga te').patterns.includes('dont'));
});

test('study decks: due, tricky and unit decks pick the right cards', () => {
  const now = Date.now();
  const cards = {
    'g-mbote': { ...learnedCard('g-mbote', now), due: now - DAY },
    'g-te': { ...learnedCard('g-te', now), due: now + 5 * DAY, lapses: TRICKY_LAPSES },
  };
  const get = (id) => cards[id];
  assert.deepEqual(deckItems('due', get, now, noFuzz).map((i) => i.id), ['g-mbote']);
  assert.deepEqual(deckItems('tricky', get, now, noFuzz).map((i) => i.id), ['g-te']);
  assert.equal(deckItems('unit:greetings', get, now, noFuzz).length, UNITS.find((u) => u.id === 'greetings').items.length);
  assert.deepEqual(deckItems('nope', get, now), []);
});

test('study cards: look-alikes and conversation lines', () => {
  for (const item of ITEMS) {
    const alike = lookAlikes(item);
    assert.ok(alike.length <= 3);
    assert.ok(!alike.some((o) => o.id === item.id));
  }
  const olei = ITEMS.find((i) => i.id === 'fd-olei');
  assert.ok(contextLines(olei).length > 0, 'Olei? appears in a course conversation');
});

test('reminders: next local time in a time zone, across daylight saving', async () => {
  const { nextOccurrence, localDate, validClock, validTimeZone } = await import('../src/time.js');
  // 2026-03-07 12:00 UTC = 07:00 in New York (EST, UTC-5).
  const before = Date.UTC(2026, 2, 7, 12, 0);
  assert.equal(new Date(nextOccurrence('19:00', 'America/New_York', before)).toISOString(), '2026-03-08T00:00:00.000Z');
  // After 19:00 local it rolls to the next day; New York switches to EDT (UTC-4) on 2026-03-08.
  const after = Date.UTC(2026, 2, 8, 1, 0);
  assert.equal(new Date(nextOccurrence('19:00', 'America/New_York', after)).toISOString(), '2026-03-08T23:00:00.000Z');
  assert.equal(new Date(nextOccurrence('08:00', 'Africa/Kinshasa', Date.UTC(2026, 0, 1, 6, 59))).toISOString(), '2026-01-01T07:00:00.000Z');
  assert.equal(localDate('Africa/Kinshasa', Date.UTC(2026, 0, 1, 23, 30)), '2026-01-02');
  assert.ok(validClock('07:45') && !validClock('07:40') && !validClock('24:00'));
  assert.ok(validTimeZone('Europe/Paris') && !validTimeZone('Mars/Base'));
});

test('word of the day: same phrase for a given date, cycles through the whole course', async () => {
  const { wordOfTheDay } = await import('../public/app/js/wotd.js');
  assert.equal(wordOfTheDay('2026-10-26').id, wordOfTheDay('2026-10-26').id);
  const seen = new Set();
  const start = Date.parse('2026-01-01T00:00:00Z');
  for (let i = 0; i < ITEMS.length; i++) seen.add(wordOfTheDay(new Date(start + i * 86_400_000).toISOString().slice(0, 10)).id);
  assert.equal(seen.size, ITEMS.length);
});

test('emails: templates in both languages include the link and unsubscribe', async () => {
  const { verifyEmail, resetEmail, wotdEmail, reminderEmail, unsubHeaders } = await import('../src/mail.js');
  for (const lang of ['en', 'fr']) {
    const v = verifyEmail(lang, 'https://x.test/api/email/verify?token=abc');
    assert.ok(v.html.includes('token=abc') && v.text.includes('token=abc') && v.subject);
    assert.ok(resetEmail(lang, 'https://x.test/app/#/reset/abc').html.includes('#/reset/abc'));
    const w = wotdEmail(lang, ITEMS.find((i) => i.id === 'w-nalingi-yo'), { base: 'https://x.test', unsubUrl: 'https://x.test/u' });
    assert.ok(w.subject.includes('Nalingi yo') && w.html.includes('#/card/w-nalingi-yo') && w.html.includes('https://x.test/u'));
    const r = reminderEmail(lang, { streak: 4, due: 3, base: 'https://x.test', unsubUrl: 'https://x.test/u' });
    assert.ok(r.html.includes('4') && r.text.includes('https://x.test/u'));
  }
  assert.equal(unsubHeaders('https://x.test/u')['List-Unsubscribe'], '<https://x.test/u>');
});
