// Word of the day: the same phrase for everyone on a given date, cycling through
// the course in a fixed shuffled order. Shared by the app's home screen and the
// Worker's daily email.

import { ITEMS } from './course.js';

// Small seeded PRNG so the order is stable across devices and the server.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORDER = (() => {
  const rand = mulberry32(2026);
  const list = [...ITEMS];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
})();

// `day` is a local calendar date, YYYY-MM-DD.
export function wordOfTheDay(day) {
  const days = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  return ORDER[((days % ORDER.length) + ORDER.length) % ORDER.length];
}
