// Time-zone helpers for scheduled emails and texts: learners pick a local time
// ("19:00") and we store the next matching moment in UTC.

const formatters = new Map();
function parts(tz, ms) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    formatters.set(tz, f);
  }
  return Object.fromEntries(f.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
}

export function validTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Offset of the time zone from UTC at that moment, in ms (local − UTC).
function offset(tz, ms) {
  const p = parts(tz, ms);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

// The learner's calendar date (YYYY-MM-DD) at that moment.
export function localDate(tz, ms = Date.now()) {
  const p = parts(tz, ms);
  return `${p.year}-${p.month}-${p.day}`;
}

// Next moment strictly after `after` when the local clock in `tz` reads hh:mm.
export function nextOccurrence(hhmm, tz, after = Date.now()) {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = localDate(tz, after).split('-').map(Number);
  for (let add = 0; add < 3; add++) {
    const wall = Date.UTC(y, mo - 1, d + add, h, m);
    let t = wall - offset(tz, wall);
    t = wall - offset(tz, t); // second pass corrects across a daylight-saving change
    if (t > after) return t;
  }
  return after + 86_400_000;
}

// Times offered in settings: every 15 minutes.
export const validClock = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):(00|15|30|45)$/.test(v);
