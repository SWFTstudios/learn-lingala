// Learner state: cards, XP and account. Always saved to localStorage first so
// the app works offline and for guests; synced to the server when signed in.

import { api } from './api.js';
import { ITEM_BY_ID } from './course.js';

const KEY = 'll-state-v1';

function blank() {
  return {
    cards: {}, dirty: [], events: [], serverDays: {}, goal: 20, user: null, lastSync: 0,
    // Learner's own notes and memory hooks per phrase ({ text, hook, updatedAt }), synced like cards.
    notes: {}, dirtyNotes: [],
    // Study cards: confidence calibration ({ sure: [asked, right], … }) and which side shows first.
    calibration: {}, studyFront: 'ln',
    // Device preferences (kept on sign-out).
    baseLang: null, onboarded: false, motivation: null,
  };
}

// What survives signing out: the device's language, onboarding and study preference.
const devicePrefs = () => ({ baseLang: state.baseLang, onboarded: state.onboarded, motivation: state.motivation, studyFront: state.studyFront });

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch {
    return blank();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): keep working in memory.
  }
  listeners.forEach((fn) => fn());
}

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export const today = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

// --- Cards --------------------------------------------------------------------

export const getCard = (id) => state.cards[id];
export const allCards = () => Object.values(state.cards).filter((c) => ITEM_BY_ID.has(c.id));

export function putCards(cards) {
  for (const card of cards) {
    state.cards[card.id] = card;
    if (!state.dirty.includes(card.id)) state.dirty.push(card.id);
  }
  save();
}

// --- Notes ----------------------------------------------------------------------

export const NOTE_MAX = 1000;
export const HOOK_MAX = 400;

export const getNote = (id) => state.notes[id] ?? null;

export function putNote(id, { text = '', hook = '' }) {
  state.notes[id] = { text: String(text).slice(0, NOTE_MAX), hook: String(hook).slice(0, HOOK_MAX), updatedAt: Date.now() };
  if (!state.dirtyNotes.includes(id)) state.dirtyNotes.push(id);
  save();
}

// --- Study cards ----------------------------------------------------------------

export const studyFront = () => state.studyFront;
export function setStudyFront(front) {
  state.studyFront = front;
  save();
}

// How often each confidence level turns out right ("sure" should be right almost always).
export function recordConfidence(level, right) {
  const [asked = 0, ok = 0] = state.calibration[level] ?? [];
  state.calibration[level] = [asked + 1, ok + (right ? 1 : 0)];
  save();
}
export const calibration = () => state.calibration;

// --- XP, goal, streak ---------------------------------------------------------

export function addXp(xp) {
  if (xp <= 0) return;
  state.events.push({ id: crypto.randomUUID(), day: today(), xp });
  save();
}

export function xpByDay() {
  const days = { ...state.serverDays };
  for (const e of state.events) days[e.day] = (days[e.day] || 0) + e.xp;
  return days;
}

export const todayXp = () => xpByDay()[today()] || 0;
export const totalXp = () => Object.values(xpByDay()).reduce((a, b) => a + b, 0);
export const dailyGoal = () => state.user?.dailyGoal || state.goal;

// Consecutive days with XP. Today counts if done; if not, the streak is still
// alive from yesterday until midnight.
export function streak() {
  const days = xpByDay();
  const d = new Date();
  if (!days[today(d)]) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days[today(d)] > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// --- Account ------------------------------------------------------------------

export const user = () => state.user;

export async function setGoal(goal) {
  state.goal = goal;
  if (state.user) {
    const { user: u } = await api('me', { method: 'PATCH', body: { dailyGoal: goal } });
    state.user = u;
  }
  save();
}

// --- Preferences ----------------------------------------------------------------

export const baseLang = () => state.baseLang;
export const onboarded = () => state.onboarded;
export const motivation = () => state.motivation;

export async function setBaseLang(lang) {
  state.baseLang = lang;
  save();
  if (state.user && state.user.baseLang !== lang) {
    const { user: u } = await api('me', { method: 'PATCH', body: { baseLang: lang } });
    state.user = u;
    save();
  }
}

export function finishOnboarding({ motivation: why, goal }) {
  state.onboarded = true;
  state.motivation = why || state.motivation;
  if (goal) state.goal = goal;
  save();
}

// The account's language wins when it has one; otherwise the device's is saved to it.
async function reconcileLang(u) {
  if (u.baseLang) {
    state.baseLang = u.baseLang;
  } else if (state.baseLang) {
    await api('me', { method: 'PATCH', body: { baseLang: state.baseLang } }).catch(() => {});
    u.baseLang = state.baseLang;
  }
}

// After sign-in/sign-up, upload everything learned as a guest so it merges into the account.
export async function signedIn(u) {
  state.user = u;
  state.onboarded = true;
  await reconcileLang(u);
  state.dirty = Object.keys(state.cards);
  state.dirtyNotes = Object.keys(state.notes);
  save();
  await sync();
}

export async function signOut() {
  try {
    await sync();
  } catch {
    // Signing out anyway; unsynced progress on this device is discarded below.
  }
  await api('auth/logout', { method: 'POST', body: {} }).catch(() => {});
  state = { ...blank(), ...devicePrefs() };
  save();
}

export async function deleteAccount(password) {
  await api('me', { method: 'DELETE', body: { password } });
  state = { ...blank(), ...devicePrefs() };
  save();
}

// Confirm the session is still valid (cookie may have expired or been cleared).
export async function refreshUser() {
  try {
    const { user: u } = await api('me');
    if (!u && state.user) {
      state.user = null;
      save();
    } else if (u) {
      state.user = u;
      state.onboarded = true;
      await reconcileLang(u);
      save();
      await sync();
    }
  } catch {
    // Offline: keep the cached user and try again later.
  }
}

// --- Sync ---------------------------------------------------------------------

let syncing = null;

export function sync({ keepalive = false } = {}) {
  if (!state.user) return Promise.resolve();
  syncing ??= (async () => {
    try {
      const sentIds = [...state.dirty];
      const sentCards = sentIds.map((id) => state.cards[id]).filter(Boolean);
      const sentEvents = [...state.events];
      const sentNotes = state.dirtyNotes.map((id) => state.notes[id] && { id, ...state.notes[id] }).filter(Boolean);
      const res = await api('sync', { method: 'POST', body: { cards: sentCards, xpEvents: sentEvents, notes: sentNotes }, keepalive });

      // Cards changed locally while the request was in flight stay dirty and local.
      const changedSince = state.dirty.filter((id) => state.cards[id] !== sentCards.find((c) => c.id === id));
      const cards = {};
      for (const c of res.cards) cards[c.id] = c;
      for (const id of changedSince) cards[id] = state.cards[id];
      state.cards = cards;
      state.dirty = changedSince;

      if (res.notes) {
        const notesChanged = state.dirtyNotes.filter((id) => state.notes[id]?.updatedAt !== sentNotes.find((n) => n.id === id)?.updatedAt);
        const notes = {};
        for (const n of res.notes) notes[n.id] = { text: n.text, hook: n.hook, updatedAt: n.updatedAt };
        for (const id of notesChanged) notes[id] = state.notes[id];
        state.notes = notes;
        state.dirtyNotes = notesChanged;
      }

      const accepted = new Set(res.acceptedEventIds);
      state.events = state.events.filter((e) => !accepted.has(e.id));
      state.serverDays = Object.fromEntries(res.days.map((d) => [d.day, d.xp]));
      state.lastSync = Date.now();
      save();
    } catch (err) {
      if (err.status === 401) {
        state.user = null; // session expired; progress stays on this device
        save();
      }
      throw err;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export const hasUnsynced = () => state.dirty.length > 0 || state.events.length > 0 || state.dirtyNotes.length > 0;
