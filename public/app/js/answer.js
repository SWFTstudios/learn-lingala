// Forgiving answer checking. Learners shouldn't be marked wrong for tone marks,
// capital letters, punctuation, or typing plain e/o instead of ɛ/ɔ.

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip tone marks / accents
    .replace(/ɛ/g, 'e')
    .replace(/ɔ/g, 'o')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Returns 'correct', 'typo' (close enough — counted right, shown the spelling), or 'wrong'.
export function checkTyped(input, accepted) {
  const got = normalize(input);
  if (!got) return 'wrong';
  const wants = accepted.map(normalize);
  if (wants.includes(got)) return 'correct';
  for (const want of wants) {
    // Allow one slip per ~6 letters, but never on very short words.
    const allowed = want.length >= 4 ? Math.max(1, Math.floor(want.length / 6)) : 0;
    if (levenshtein(got, want) <= allowed) return 'typo';
  }
  return 'wrong';
}

export function tokens(text) {
  return normalize(text).split(' ').filter(Boolean);
}
