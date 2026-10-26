// Inline SVG icons (24×24, stroke-based) so they inherit colour and size from CSS.

import { LEVELS } from './course.js';

const PATHS = {
  wave: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6"/><path d="m14.8 14.8 3.6 3.6"/><path d="m14.8 9.2 3.6-3.6"/><path d="m5.6 18.4 3.6-3.6"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.5 14.2a6.5 6.5 0 0 1 3 5.8"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M18.4 10.6a6 6 0 1 1-7.8 7.8"/><path d="M7.5 7h2v4"/><path d="M16.5 14.3v2.2"/>',
  bowl: '<path d="M3 11.5h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-1.6 1.2-1.6 1.2-3.5"/><path d="M12 8c0-1.6 1.2-1.6 1.2-3.5"/><path d="M16 8c0-1.6 1.2-1.6 1.2-3.5"/>',
  car: '<path d="M5.5 17.5h-1A1.5 1.5 0 0 1 3 16v-3.5l2.2-5.6A1.5 1.5 0 0 1 6.6 6h10.8a1.5 1.5 0 0 1 1.4.9l2.2 5.6V16a1.5 1.5 0 0 1-1.5 1.5h-1"/><path d="M3 12.5h18"/><circle cx="8" cy="17.5" r="2"/><circle cx="16" cy="17.5" r="2"/><path d="M10 17.5h4"/>',
  pin: '<path d="M12 21.5s-7-6.2-7-11.7a7 7 0 0 1 14 0c0 5.5-7 11.7-7 11.7z"/><circle cx="12" cy="9.8" r="2.6"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.8c0 1.7-2.5 2.2-2.5 3.8"/><path d="M12 17.2h.01"/>',
  home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11.5h13V9"/><path d="M10 20.5V15h4v5.5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  heart: '<path d="M12 20s-8.5-4.7-8.5-10.8A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.5 2.6C20.5 15.3 12 20 12 20z"/>',
  hourglass: '<path d="M6 3h12"/><path d="M6 21h12"/><path d="M7.5 3v3.2a4.5 4.5 0 0 0 2 3.7L12 12l2.5-2.1a4.5 4.5 0 0 0 2-3.7V3"/><path d="M7.5 21v-3.2a4.5 4.5 0 0 1 2-3.7L12 12l2.5 2.1a4.5 4.5 0 0 1 2 3.7V21"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2a3.4 3.4 0 0 1 6.4 0"/><path d="M14.5 10h4"/><path d="M14.5 13.5h3"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.2a4.3 4.3 0 0 0 7 0"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
  city: '<path d="M3 21h18"/><path d="M5 21V8l5-3v16"/><path d="M10 21V10h9v11"/><path d="M13 13.5h3"/><path d="M13 17h3"/><path d="M7.5 10.5h.01"/><path d="M7.5 14h.01"/><path d="M7.5 17.5h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2"/><path d="M12 19.5v2"/><path d="m5.3 5.3 1.4 1.4"/><path d="m17.3 17.3 1.4 1.4"/><path d="M2.5 12h2"/><path d="M19.5 12h2"/><path d="m5.3 18.7 1.4-1.4"/><path d="m17.3 6.7 1.4-1.4"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7"/><path d="M3 12.5h18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  learn: '<path d="M2 4.5h6.5A3.5 3.5 0 0 1 12 8v12a2.5 2.5 0 0 0-2.5-2.5H2z"/><path d="M22 4.5h-6.5A3.5 3.5 0 0 0 12 8v12a2.5 2.5 0 0 1 2.5-2.5H22z"/>',
  review: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1L20.5 8.5"/><path d="M20.5 3.5v5h-5"/>',
  chat: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z"/>',
  translate: '<path d="M4 5h8"/><path d="M8 3v2"/><path d="M10.5 5c-.9 3.8-3.3 6.6-6.5 8"/><path d="M5.5 8.5c1 2.2 2.8 3.9 5 4.8"/><path d="m12.5 21 4-9 4 9"/><path d="M14 17.5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flame: '<path d="M12 22c3.9 0 7-2.9 7-6.8 0-3.6-2.6-5.6-3.7-8.7-.9 1.7-2 2.6-3.3 2.9.3-2.6-.6-5.2-3-7.4.1 3.9-5 6.6-5 11.6C4 19 7.6 22 12 22z"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5v4"/>',
  send: '<path d="M21.5 2.5 10.5 13.5"/><path d="m21.5 2.5-7 19-4-8-8-4z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.3-4.3"/>',
  swap: '<path d="M7 20V5"/><path d="m3 9 4-4 4 4"/><path d="M17 4v15"/><path d="m21 15-4 4-4-4"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  forward: '<path d="m9 5 7 7-7 7"/>',
  install: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7"/><path d="m9 11 3 3 3-3"/><path d="M10.5 18.5h3"/>',
  share: '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M8.5 10.5H7A2.5 2.5 0 0 0 4.5 13v6A2.5 2.5 0 0 0 7 21.5h10a2.5 2.5 0 0 0 2.5-2.5v-6a2.5 2.5 0 0 0-2.5-2.5h-1.5"/>',
  offline: '<path d="M2 8.8a15 15 0 0 1 4.2-2.6"/><path d="M10 5.1A15 15 0 0 1 22 8.8"/><path d="M5 12.5a10 10 0 0 1 3.8-2.1"/><path d="M15.5 10.9A10 10 0 0 1 19 12.5"/><path d="M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/><path d="m3 3 18 18"/>',
  sparkle: '<path d="M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  trophy: '<path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6.5h-3a3 3 0 0 0 3 4"/><path d="M16.5 6.5h3a3 3 0 0 1-3 4"/><path d="M12 14v3.5"/><path d="M8 20.5h8"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v16H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H20v-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  speak: '<path d="M4 9.5v5h3.5l5 4v-13l-5 4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name] || ''}</svg>`;
}

export const hasIcon = (name) => name in PATHS;

// A course unit's icon on a soft tile tinted by its level (lv-1 … lv-5).
// Sizes: '' (40px), 'sm', 'in-ring' (inside a progress ring), 'lg'.
export function unitIcon(unit, size = '') {
  const lv = LEVELS.findIndex((l) => l.id === unit.level) + 1;
  return `<span class="uicon lv-${lv} ${size}" aria-hidden="true">${icon(unit.icon)}</span>`;
}
