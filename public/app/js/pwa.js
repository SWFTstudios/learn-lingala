// Offline banner and "install the app": the browser's install prompt (Chrome, Edge,
// Android) and Add to Home Screen steps for iPhone and iPad, where installing also
// stops Safari from clearing the app's saved progress after a week without a visit.

import { t } from './i18n.js';
import { icon } from './icons.js';

const DISMISS_KEY = 'll-install-dismissed';
const DISMISS_DAYS = 30;

let deferredPrompt = null;
let justInstalled = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
export const onInstallChange = (fn) => listeners.add(fn);

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // show our own card instead of the browser's mini-infobar
  deferredPrompt = e;
  notify();
});
addEventListener('appinstalled', () => {
  deferredPrompt = null;
  justInstalled = true;
  notify();
});

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 'installed' | 'prompt' (the browser can install it) | 'ios' (show the steps) | null (can't tell)
export function installState() {
  if (justInstalled || standalone()) return 'installed';
  if (deferredPrompt) return 'prompt';
  if (isIos()) return 'ios';
  return null;
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  const prompt = deferredPrompt;
  deferredPrompt = null; // a prompt can only be shown once
  prompt.prompt();
  await prompt.userChoice.catch(() => {});
  notify();
}

function dismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_DAYS * 864e5;
  } catch {
    return false;
  }
}

export function dismissInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage blocked: the card comes back next visit.
  }
}

const iosSteps = () => t('pwa.iosSteps', { share: `<span class="share-glyph">${icon('share')}</span>` });

// Card on the home screen. Hidden once installed or for a month after "not now".
export function installCardHtml() {
  const state = installState();
  if ((state !== 'prompt' && state !== 'ios') || dismissed()) return '';
  return `
    <div class="install-card">
      <span class="install-icon">${icon('install')}</span>
      <span class="install-text"><strong>${t('pwa.title')}</strong><small>${state === 'ios' ? iosSteps() : t('pwa.sub')}</small></span>
      ${state === 'prompt' ? `<button type="button" class="btn btn-primary btn-sm" data-install>${t('pwa.install')}</button>` : ''}
      <button type="button" class="icon-btn install-close" data-install-dismiss aria-label="${t('pwa.notNow')}">${icon('close')}</button>
    </div>`;
}

// Row in the profile settings, always available (ignores "not now").
export function installSettingsHtml() {
  const state = installState();
  if (!state) return '';
  const body =
    state === 'installed' ? `<p class="install-done">${icon('check')} ${t('pwa.installed')}</p>`
    : state === 'prompt' ? `<p class="muted small">${t('pwa.sub')}</p><button type="button" class="btn btn-secondary" data-install>${icon('install')} ${t('pwa.install')}</button>`
    : `<p class="muted small">${iosSteps()}</p>`;
  return `<h2 class="card-title">${icon('install')} ${t('pwa.settingsTitle')}</h2>${body}`;
}

// A small bar while there's no connection, and a brief "back online" when it returns.
export function initOfflineBanner() {
  const bar = document.createElement('div');
  bar.className = 'net-bar';
  bar.setAttribute('role', 'status');
  bar.hidden = true;
  document.body.append(bar);
  let timer;

  const update = (cameBack = false) => {
    clearTimeout(timer);
    document.documentElement.classList.toggle('is-offline', !navigator.onLine);
    if (!navigator.onLine) {
      bar.className = 'net-bar net-offline';
      bar.innerHTML = `${icon('offline')}<span><strong>${t('net.offline')}</strong> ${t('net.offlineSub')}</span>`;
      bar.hidden = false;
    } else if (cameBack) {
      bar.className = 'net-bar net-online';
      bar.innerHTML = `${icon('check')}<span><strong>${t('net.back')}</strong></span>`;
      bar.hidden = false;
      timer = setTimeout(() => (bar.hidden = true), 2500);
    } else {
      bar.hidden = true;
    }
  };
  addEventListener('offline', () => update());
  addEventListener('online', () => update(true));
  update();
  return () => update(); // re-render the text, e.g. after a language change
}
