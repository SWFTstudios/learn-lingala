// The banner space on Home and Translate. With Google AdSense configured
// (ADSENSE_CLIENT + ADSENSE_SLOT in wrangler.jsonc) it shows an ad; otherwise
// it promotes the app's own features. Never shown to Pro members or in lessons.

import { t } from './i18n.js';
import { icon } from './icons.js';

let scriptLoaded = false;

function housePromo(user) {
  // Alternate by day; signed-out learners only see the word-of-the-day promo.
  const pro = user && new Date().getDate() % 2 === 0;
  const [title, sub, cta, ic] = pro
    ? [t('ad.proTitle'), t('ad.proSub'), t('ad.proCta'), 'crown']
    : [t('ad.wotdTitle'), t('ad.wotdSub'), t('ad.wotdCta'), 'mail'];
  return `<a href="#/account" class="ad-house"><span class="ad-house-icon">${icon(ic)}</span>
    <span class="ad-house-text"><b>${title}</b><small>${sub}</small><span class="ad-house-cta">${cta} ${icon('forward')}</span></span></a>`;
}

export function adSlotHtml(place, { ads, user }) {
  if (user?.plan === 'pro') return '';
  return `<aside class="ad-slot ad-${place}" aria-label="${ads ? t('ad.label') : t('ad.house')}">
    <span class="ad-label">${ads ? t('ad.label') : t('ad.house')}</span>
    ${
      ads
        ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`
        : housePromo(user)
    }
  </aside>`;
}

// Ask AdSense to fill any new ad units on the page.
export function fillAds(root, ads) {
  if (!ads) return;
  const units = root.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
  if (!units.length) return;
  if (!scriptLoaded) {
    scriptLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.client)}`;
    document.head.append(s);
  }
  units.forEach(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocked or not ready: the slot simply stays empty.
    }
  });
}
