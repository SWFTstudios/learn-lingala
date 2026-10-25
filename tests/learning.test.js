import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalize, checkTyped } from '../public/app/js/answer.js';
import { schedule, newCard, DAY, MINUTE } from '../public/app/js/srs.js';
import { LEVELS, UNITS, COURSE, ITEMS, ITEM_BY_ID, levelItems } from '../public/app/js/course.js';
import {
  buildLesson, buildDueReview, buildConversation, buildCheckpoint, choices, replyChoices, tiles,
  currentUnit, reviewStepFor, daysToLevel, NEW_PER_LESSON,
} from '../public/app/js/lesson.js';

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
