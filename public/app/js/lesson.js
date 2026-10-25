// Builds learning sessions. The design leans on what research says speeds up
// vocabulary learning:
//  • retrieval practice — every new item is tested minutes after it's introduced
//  • desirable difficulty — recognition (multiple choice) → assembly (tiles) → recall (typing)
//  • interleaving — new items, reviews, and production are mixed, not blocked
//  • spacing — reviews come from the SRS scheduler, overdue cards first
//  • errors re-asked — a missed item comes back later in the same session

import { UNITS, ITEMS, UNIT_BY_ID, ITEM_BY_ID } from './course.js';
import { normalize, tokens } from './answer.js';
import { isLearned, isDue, recall } from './srs.js';

export const NEW_PER_LESSON = 4;
export const MAX_REVIEWS_IN_LESSON = 6;
export const MAX_REVIEW_SESSION = 15;

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isPhrase = (item) => tokens(item.lg).length > 1;

// Which exercise fits a card that has already been introduced.
export function reviewStepFor(item, card) {
  const reps = card?.reps ?? 0;
  if (reps === 0) return { type: 'mc', itemId: item.id };
  if (reps === 1) return { type: isPhrase(item) ? 'tiles' : 'mc-rev', itemId: item.id };
  return { type: 'type', itemId: item.id };
}

export function unitProgress(unit, getCard) {
  const learned = unit.items.filter((i) => isLearned(getCard(i.id))).length;
  return { learned, total: unit.items.length, done: learned === unit.items.length };
}

// The first unit with items left to learn.
export function currentUnit(getCard) {
  return UNITS.find((u) => !unitProgress(u, getCard).done) || UNITS[UNITS.length - 1];
}

export function dueItems(getCard, now = Date.now()) {
  return ITEMS.filter((i) => isDue(getCard(i.id), now)).sort((a, b) => getCard(a.id).due - getCard(b.id).due);
}

function weakestLearned(items, getCard, n, now) {
  return items
    .filter((i) => isLearned(getCard(i.id)))
    .sort((a, b) => recall(getCard(a.id), now) - recall(getCard(b.id), now))
    .slice(0, n);
}

export function buildLesson(unitId, getCard, now = Date.now(), rand = Math.random) {
  const unit = UNIT_BY_ID.get(unitId);
  const fresh = unit.items.filter((i) => !isLearned(getCard(i.id))).slice(0, NEW_PER_LESSON);
  const reviews = dueItems(getCard, now)
    .filter((i) => !fresh.includes(i))
    .slice(0, MAX_REVIEWS_IN_LESSON);

  // Unit finished and nothing due: practise its weakest items instead.
  if (!fresh.length) {
    const practice = reviews.length ? reviews : weakestLearned(unit.items, getCard, 8, now);
    return buildReview(practice, getCard, rand, { kind: 'practice', unitId });
  }

  const reviewSteps = shuffle(reviews, rand).map((i) => reviewStepFor(i, getCard(i.id)));
  const production = fresh.map((i) => ({ type: isPhrase(i) ? 'tiles' : 'mc-rev', itemId: i.id }));

  const steps = [];
  // Starting a unit: open with its short grammar note (explicit rule + immediate practice).
  if (!unit.items.some((i) => isLearned(getCard(i.id)))) steps.push({ type: 'notes', unitId });
  fresh.forEach((item, idx) => {
    steps.push({ type: 'intro', itemId: item.id }, { type: 'mc', itemId: item.id });
    if (reviewSteps.length) steps.push(reviewSteps.shift());
    if (idx >= 1) steps.push(production[idx - 1]);
  });
  steps.push(production[fresh.length - 1]);
  // Last pass: type each new single word once — producing it from memory is what makes it stick.
  for (const item of shuffle(fresh.filter((i) => !isPhrase(i)), rand)) {
    if (reviewSteps.length) steps.push(reviewSteps.shift());
    steps.push({ type: 'type', itemId: item.id });
  }
  steps.push(...reviewSteps);

  return {
    kind: 'lesson',
    unitId,
    steps,
    itemIds: [...fresh, ...reviews].map((i) => i.id),
    newIds: fresh.map((i) => i.id),
  };
}

export function buildReview(items, getCard, rand = Math.random, extra = { kind: 'review' }) {
  const chosen = items.slice(0, MAX_REVIEW_SESSION);
  const steps = [];
  if (chosen.length >= 5) steps.push({ type: 'match', itemIds: shuffle(chosen, rand).slice(0, 5).map((i) => i.id) });
  steps.push(...shuffle(chosen, rand).map((i) => reviewStepFor(i, getCard(i.id))));
  return { ...extra, steps, itemIds: chosen.map((i) => i.id), newIds: [] };
}

export function buildDueReview(getCard, now = Date.now(), rand = Math.random) {
  const due = dueItems(getCard, now);
  if (due.length) return buildReview(due, getCard, rand);
  return buildReview(weakestLearned(ITEMS, getCard, 10, now), getCard, rand, { kind: 'practice' });
}

// --- Exercise content ---------------------------------------------------------

// Multiple-choice options: the answer plus 3 distractors, preferring the same
// unit and the same shape (word vs phrase) so the choice is a real test.
export function choices(item, field, rand = Math.random, n = 4) {
  const seen = new Set([normalize(item[field])]);
  const pool = [
    ...shuffle(ITEMS.filter((i) => i.unit === item.unit && i.id !== item.id), rand),
    ...shuffle(ITEMS.filter((i) => i.unit !== item.unit), rand),
  ].sort((a, b) => (isPhrase(a) === isPhrase(item) ? 0 : 1) - (isPhrase(b) === isPhrase(item) ? 0 : 1));
  const picks = [];
  for (const cand of pool) {
    const key = normalize(cand[field]);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(cand);
    if (picks.length === n - 1) break;
  }
  return shuffle([item, ...picks], rand);
}

const stripPunct = (w) => w.replace(/[?!.,]/g, '');

// Word tiles for building a phrase: its words plus a few decoys.
export function tiles(item, rand = Math.random) {
  const words = item.lg.split(/\s+/).map(stripPunct).filter(Boolean);
  const own = new Set(words.map(normalize));
  const decoys = [];
  for (const cand of shuffle(ITEMS, rand)) {
    for (const w of cand.lg.split(/\s+/).map(stripPunct)) {
      const key = normalize(w);
      if (!key || own.has(key)) continue;
      own.add(key);
      decoys.push(w);
      if (decoys.length === Math.min(3, Math.max(2, words.length))) break;
    }
    if (decoys.length >= Math.min(3, Math.max(2, words.length))) break;
  }
  return shuffle([...words, ...decoys], rand).map((w, i) => ({ key: i, word: w }));
}

export function acceptedAnswers(item) {
  return [item.lg, ...(item.alt || [])];
}

export function itemsFor(ids) {
  return ids.map((id) => ITEM_BY_ID.get(id)).filter(Boolean);
}
