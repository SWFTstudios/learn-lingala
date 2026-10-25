import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalize, checkTyped } from '../public/app/js/answer.js';
import { schedule, newCard, isDue, DAY, MINUTE } from '../public/app/js/srs.js';
import { UNITS, ITEMS } from '../public/app/js/course.js';
import { buildLesson, buildDueReview, choices, tiles, currentUnit, NEW_PER_LESSON } from '../public/app/js/lesson.js';

const noFuzz = () => 0.5;

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

test('course: ids are unique and every item has text', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of ITEMS) {
    assert.ok(i.lg && i.en, i.id);
    assert.match(i.id, /^[a-z0-9-]{1,64}$/);
  }
  // English prompts must be unambiguous within a unit for typing exercises.
  for (const u of UNITS) {
    const ens = u.items.map((i) => normalize(i.en));
    assert.equal(new Set(ens).size, ens.length, `duplicate English in ${u.id}`);
  }
});

test('first lesson: notes, then every new item is introduced before it is tested', () => {
  const cards = {};
  const lesson = buildLesson(UNITS[0].id, (id) => cards[id]);
  assert.equal(lesson.steps[0].type, 'notes');
  assert.equal(lesson.newIds.length, NEW_PER_LESSON);
  const introduced = new Set();
  for (const step of lesson.steps) {
    if (step.type === 'intro') introduced.add(step.itemId);
    else if (step.itemId) assert.ok(introduced.has(step.itemId), `${step.type} before intro for ${step.itemId}`);
  }
  // Each new item gets at least 3 exposures.
  for (const id of lesson.newIds) {
    assert.ok(lesson.steps.filter((s) => s.itemId === id).length >= 3, id);
  }
});

test('lessons mix in due reviews and advance through the course', () => {
  const now = Date.now();
  const cards = {};
  for (const item of UNITS[0].items) cards[item.id] = { ...newCard(item.id, now), reps: 2, interval: 3, last: now - 4 * DAY, due: now - DAY };
  const get = (id) => cards[id];
  assert.equal(currentUnit(get).id, UNITS[1].id);
  const lesson = buildLesson(UNITS[1].id, get, now);
  const reviewIds = lesson.itemIds.filter((id) => !lesson.newIds.includes(id));
  assert.ok(reviewIds.length > 0, 'due reviews are interleaved');
  assert.ok(lesson.steps.some((s) => s.type === 'type'), 'mature cards are typed from memory');

  const review = buildDueReview(get, now);
  assert.equal(review.kind, 'review');
  assert.equal(review.steps[0].type, 'match');
});

test('exercise content: choices and tiles are valid', () => {
  for (const item of ITEMS) {
    const opts = choices(item, 'en');
    assert.equal(opts.length, 4);
    assert.ok(opts.includes(item));
    assert.equal(new Set(opts.map((o) => normalize(o.en))).size, 4, `ambiguous options for ${item.id}`);
    const bank = tiles(item).map((t) => normalize(t.word));
    for (const w of normalize(item.lg).split(' ')) assert.ok(bank.includes(w), `${item.id} missing tile ${w}`);
  }
});
