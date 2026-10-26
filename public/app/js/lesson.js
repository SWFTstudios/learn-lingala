// Builds learning sessions. The design leans on what research says builds
// spoken fluency fastest:
//  • retrieval practice — every new item is tested minutes after it's introduced
//  • desirable difficulty — recognise (multiple choice) → assemble (tiles / pattern drill)
//    → recall (typing) → say it out loud
//  • chunks — whole phrases are taught as units, the way native speakers store them
//  • pattern drills — transform one sentence into another so the rule generalises
//  • comprehensible input — each unit's dialogue is read, then role-played
//  • interleaving & spacing — new items mixed with reviews scheduled by the SRS
//  • errors re-asked — a missed item comes back later in the same session

import { COURSE, ITEMS, UNIT_BY_ID, ITEM_BY_ID, LEVEL_BY_ID, levelItems } from './course.js';
import { normalize, tokens } from './answer.js';
import { isLearned, isDue, recall } from './srs.js';

export const NEW_PER_LESSON = 4;
export const MAX_REVIEWS_IN_LESSON = 6;
export const MAX_REVIEW_SESSION = 15;
export const CHECKPOINT_SIZE = 14;
export const CHECKPOINT_PASS = 0.8;

export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isPhrase = (item) => tokens(item.lg).length > 1;

// Which exercise fits a card that has already been introduced, by how well it's known.
export function reviewStepFor(item, card, rand = Math.random) {
  const reps = card?.reps ?? 0;
  const id = item.id;
  if (reps === 0) return { type: 'mc', itemId: id };
  if (reps === 1) {
    if (item.drill) return { type: 'transform', itemId: id };
    return { type: isPhrase(item) ? 'tiles' : 'mc-rev', itemId: id };
  }
  if (reps === 2 && item.drill) return { type: 'transform', itemId: id };
  // Mature phrases: alternate typing with saying them out loud.
  if (isPhrase(item) && rand() < 0.5) return { type: 'speak', itemId: id };
  return { type: 'type', itemId: id };
}

export function unitProgress(unit, getCard) {
  const learned = unit.items.filter((i) => isLearned(getCard(i.id))).length;
  return { learned, total: unit.items.length, done: learned === unit.items.length };
}

export function levelProgress(levelId, getCard) {
  const items = levelItems(levelId);
  const learned = items.filter((i) => isLearned(getCard(i.id))).length;
  return { learned, total: items.length, done: learned === items.length };
}

// The first unit, in course order, with items left to learn.
export function currentUnit(getCard) {
  return COURSE.find((u) => !unitProgress(u, getCard).done) || COURSE[COURSE.length - 1];
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

  const reviewSteps = shuffle(reviews, rand).map((i) => reviewStepFor(i, getCard(i.id), rand));
  // Second exposure: assemble it — a pattern drill if the item has one, otherwise tiles / reverse choice.
  const production = fresh.map((i) => ({
    type: i.drill ? 'transform' : isPhrase(i) ? 'tiles' : 'mc-rev',
    itemId: i.id,
  }));

  const steps = [];
  // Starting a unit: the grammar note, then the real conversation you're working towards.
  if (!unit.items.some((i) => isLearned(getCard(i.id)))) {
    steps.push({ type: 'notes', unitId });
    if (unit.dialogue) steps.push({ type: 'dialogue', unitId });
  }
  fresh.forEach((item, idx) => {
    steps.push({ type: 'intro', itemId: item.id }, { type: 'mc', itemId: item.id });
    if (reviewSteps.length) steps.push(reviewSteps.shift());
    if (idx >= 1) steps.push(production[idx - 1]);
  });
  steps.push(production[fresh.length - 1]);
  // Last pass: produce each new item from memory — typed for words, out loud for phrases.
  for (const item of shuffle(fresh, rand)) {
    if (reviewSteps.length) steps.push(reviewSteps.shift());
    steps.push({ type: isPhrase(item) ? 'speak' : 'type', itemId: item.id });
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
  steps.push(...shuffle(chosen, rand).map((i) => reviewStepFor(i, getCard(i.id), rand)));
  return { ...extra, steps, itemIds: chosen.map((i) => i.id), newIds: [] };
}

export function buildDueReview(getCard, now = Date.now(), rand = Math.random) {
  const due = dueItems(getCard, now);
  if (due.length) return buildReview(due, getCard, rand);
  return buildReview(weakestLearned(ITEMS, getCard, 10, now), getCard, rand, { kind: 'practice' });
}

// Role-play a unit's dialogue: read it, answer each of your lines, then say them out loud.
export function buildConversation(unitId, getCard, rand = Math.random) {
  const unit = UNIT_BY_ID.get(unitId);
  const lines = unit.dialogue.lines;
  const yourLines = lines.map((l, i) => ({ ...l, index: i })).filter((l) => l.who === 'you');
  const steps = [{ type: 'dialogue', unitId }];
  for (const l of yourLines) steps.push({ type: 'reply', unitId, line: l.index, itemId: l.id });
  for (const l of shuffle(yourLines, rand).slice(0, 2)) steps.push({ type: 'speak-line', unitId, line: l.index, itemId: l.id });
  const linked = [...new Set(yourLines.map((l) => l.id).filter((id) => id && isLearned(getCard(id))))];
  return { kind: 'conversation', unitId, steps, itemIds: linked, newIds: [] };
}

// Level checkpoint: a mixed test with no hints or re-asks. Passing it "tests out"
// of the level — every item not yet learned is added to your reviews.
export function buildCheckpoint(levelId, rand = Math.random) {
  const level = LEVEL_BY_ID.get(levelId);
  const items = shuffle(levelItems(levelId), rand).slice(0, CHECKPOINT_SIZE);
  const steps = items.map((i) =>
    i.drill && rand() < 0.5 ? { type: 'transform', itemId: i.id }
    : isPhrase(i) ? { type: rand() < 0.5 ? 'tiles' : 'type', itemId: i.id }
    : { type: rand() < 0.6 ? 'type' : 'mc-rev', itemId: i.id },
  );
  // Plus two conversation replies from the level's dialogues.
  const replies = level.units
    .map((id) => UNIT_BY_ID.get(id))
    .filter((u) => u.dialogue)
    .flatMap((u) => u.dialogue.lines.map((l, idx) => ({ l, idx, unitId: u.id })).filter(({ l }) => l.who === 'you'));
  for (const r of shuffle(replies, rand).slice(0, 2)) steps.push({ type: 'reply', unitId: r.unitId, line: r.idx });
  return { kind: 'checkpoint', levelId, steps: shuffle(steps, rand), itemIds: items.map((i) => i.id), newIds: [], noRequeue: true };
}

// --- Exercise content ---------------------------------------------------------

// Multiple-choice options: the answer plus 3 distractors, preferring the same
// unit and the same shape (word vs phrase) so the choice is a real test.
// `field` is a property name ('lg', 'en') or a function returning the text to compare.
export function choices(item, field, rand = Math.random, n = 4) {
  const text = typeof field === 'function' ? field : (i) => i[field];
  const seen = new Set([normalize(text(item))]);
  const pool = [
    ...shuffle(ITEMS.filter((i) => i.unit === item.unit && i.id !== item.id), rand),
    ...shuffle(ITEMS.filter((i) => i.unit !== item.unit), rand),
  ].sort((a, b) => (isPhrase(a) === isPhrase(item) ? 0 : 1) - (isPhrase(b) === isPhrase(item) ? 0 : 1));
  const picks = [];
  for (const cand of pool) {
    const key = normalize(text(cand));
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(cand);
    if (picks.length === n - 1) break;
  }
  return shuffle([item, ...picks], rand);
}

// Reply options for a dialogue line: the real line plus other things "you" say
// in the course — plausible Lingala, but wrong for this moment.
export function replyChoices(unitId, lineIndex, rand = Math.random) {
  const answer = UNIT_BY_ID.get(unitId).dialogue.lines[lineIndex];
  const seen = new Set([normalize(answer.lg)]);
  const pool = shuffle(
    COURSE.flatMap((u) => (u.dialogue ? u.dialogue.lines.filter((l) => l.who === 'you') : [])),
    rand,
  );
  const picks = [];
  for (const l of pool) {
    const key = normalize(l.lg);
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(l);
    if (picks.length === 3) break;
  }
  return shuffle([answer, ...picks], rand);
}

const stripPunct = (w) => w.replace(/[?!.,]/g, '');

// Word tiles for building a phrase: its words plus a few decoys.
export function tiles(item, rand = Math.random) {
  const words = item.lg.split(/\s+/).map(stripPunct).filter(Boolean);
  const own = new Set(words.map(normalize));
  const want = Math.min(3, Math.max(2, words.length));
  const decoys = [];
  for (const cand of shuffle(ITEMS, rand)) {
    for (const w of cand.lg.split(/\s+/).map(stripPunct)) {
      const key = normalize(w);
      if (!key || own.has(key)) continue;
      own.add(key);
      decoys.push(w);
      if (decoys.length === want) break;
    }
    if (decoys.length >= want) break;
  }
  return shuffle([...words, ...decoys], rand).map((w, i) => ({ key: i, word: w }));
}

export function acceptedAnswers(item) {
  return [item.lg, ...(item.alt || [])];
}

export function itemsFor(ids) {
  return ids.map((id) => ITEM_BY_ID.get(id)).filter(Boolean);
}

// --- Pace ---------------------------------------------------------------------

// Rough new phrases per day for each daily goal (a lesson ≈ 4 new items ≈ 15–20 XP,
// and some of each day's XP goes to reviews).
const NEW_PER_DAY = { 10: 2, 20: 4, 30: 6, 50: 10 };

// Days until every item up to and including `levelId` is learned, at this goal.
export function daysToLevel(levelId, getCard, goal) {
  const order = [...LEVEL_BY_ID.keys()];
  const upto = order.slice(0, order.indexOf(levelId) + 1);
  const remaining = ITEMS.filter((i) => upto.includes(i.level) && !isLearned(getCard(i.id))).length;
  return Math.ceil(remaining / (NEW_PER_DAY[goal] || 5));
}
