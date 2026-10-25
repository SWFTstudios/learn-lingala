// Spaced-repetition scheduler (SM-2 family, tuned for fast early learning).
// Grades: 0 = again (wrong), 1 = hard (right with a slip), 2 = good, 3 = easy.

export const MINUTE = 60_000;
export const DAY = 86_400_000;
export const MASTERED_DAYS = 21;

export function newCard(id, now = Date.now()) {
  return { id, due: now, interval: 0, ease: 2.5, reps: 0, lapses: 0, last: null, updatedAt: now };
}

export function schedule(card, grade, now = Date.now(), rand = Math.random) {
  const c = { ...card, last: now, updatedAt: now };

  if (grade === 0) {
    if (c.reps > 0) c.lapses += 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.reps = 0;
    c.interval = 0;
    c.due = now + 10 * MINUTE; // see it again soon
    return c;
  }

  if (c.reps === 0) c.interval = [0, 0.5, 1, 3][grade];
  else if (c.reps === 1) c.interval = [0, 2, 3, 6][grade];
  else c.interval = c.interval * [0, 1.2, c.ease, c.ease * 1.3][grade];

  if (grade === 1) c.ease = Math.max(1.3, c.ease - 0.15);
  if (grade === 3) c.ease = Math.min(3.5, c.ease + 0.15);
  c.reps += 1;

  // ±5% fuzz so cards learned together don't all come due on the same day.
  const fuzz = c.interval >= 2 ? 1 + (rand() - 0.5) * 0.1 : 1;
  c.interval = Math.min(c.interval * fuzz, 3650);
  c.due = now + c.interval * DAY;
  return c;
}

export const isLearned = (card) => !!card && (card.reps > 0 || card.lapses > 0 || card.last != null);
export const isDue = (card, now = Date.now()) => isLearned(card) && card.due <= now;
export const isMastered = (card) => !!card && card.interval >= MASTERED_DAYS;

// Estimated chance of recalling the card right now, 0–1 (for strength meters).
export function recall(card, now = Date.now()) {
  if (!isLearned(card)) return 0;
  if (card.interval <= 0) return 0.3;
  const elapsedDays = Math.max(0, (now - (card.last ?? now)) / DAY);
  return Math.exp((Math.log(0.9) * elapsedDays) / card.interval);
}
