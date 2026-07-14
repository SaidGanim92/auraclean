/* ==========================================================================
   consent.js – באנר עוגיות (opt-in) וטעינת Meta Pixel לאחר הסכמה
   בהתאם לתיקון 13 לחוק הגנת הפרטיות:
   כלי מדידה/פרסום נטענים אך ורק לאחר לחיצה על "אישור".
   ========================================================================== */

/* =======================================================================
   ⚙️  מזהה Meta Pixel למילוי בעל האתר
   ======================================================================= */
const META_PIXEL_ID = '[META_PIXEL_ID]';
/* ======================================================================= */

const CONSENT_KEY = 'auraclean_consent'; // 'granted' | 'denied' | null
let pixelLoaded = false;

/* ----- טעינת Meta Pixel (רק לאחר הסכמה) ----- */
function loadMetaPixel() {
  if (pixelLoaded) return;
  if (!META_PIXEL_ID || META_PIXEL_ID.includes('[')) {
    // אין מזהה אמיתי – לא טוענים, אך מגדירים fbq דמה כדי שקריאות אירוע לא ייכשלו
    window.fbq = window.fbq || function () {};
    pixelLoaded = true;
    console.warn('AURA CLEAN: META_PIXEL_ID לא הוגדר – ה-Pixel לא נטען בפועל.');
    return;
  }
  /* קוד ה-Pixel הרשמי של Meta */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
    n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
  pixelLoaded = true;
}

/* ----- דיווח אירוע (no-op אם אין הסכמה) ----- */
function trackEvent(name, params) {
  if (localStorage.getItem(CONSENT_KEY) !== 'granted') return;
  if (!pixelLoaded) loadMetaPixel();
  if (window.fbq) window.fbq('track', name, params || {});
}
window.trackEvent = trackEvent; // חשיפה גלובלית לשאר הקבצים

/* ----- בניית באנר העוגיות ----- */
function buildBanner() {
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('aria-label', 'הודעת עוגיות');
  banner.innerHTML = `
    <p><span data-i18n="cookie_text"></span>
       <a href="pages/privacy.html" data-i18n="cookie_more" data-cookie-privacy></a></p>
    <div class="cookie-actions">
      <button type="button" class="btn btn-gradient" data-consent="accept" data-i18n="cookie_accept"></button>
      <button type="button" class="btn btn-outline" data-consent="reject" data-i18n="cookie_reject"></button>
    </div>`;
  document.body.appendChild(banner);
  return banner;
}

/* התאמת נתיב קישור הפרטיות לפי מיקום העמוד (שורש / תיקיית pages) */
function fixPrivacyLink(banner) {
  const link = banner.querySelector('[data-cookie-privacy]');
  if (!link) return;
  const inPages = /\/pages\//.test(location.pathname);
  link.setAttribute('href', (inPages ? '' : 'pages/') + 'privacy.html');
}

/* ----- ניהול הסכמה ----- */
function grantConsent() {
  localStorage.setItem(CONSENT_KEY, 'granted');
  loadMetaPixel();
  hideBanner();
}
function denyConsent() {
  localStorage.setItem(CONSENT_KEY, 'denied');
  hideBanner();
}
let bannerEl = null;
function showBanner() { if (bannerEl) { bannerEl.classList.add('show'); applyTranslations(bannerEl); } }
function hideBanner() { if (bannerEl) bannerEl.classList.remove('show'); }

/* פתיחה מחדש דרך "הגדרות עוגיות" ב-footer */
function openCookieSettings() {
  if (!bannerEl) bannerEl = buildBanner();
  fixPrivacyLink(bannerEl);
  showBanner();
}
window.openCookieSettings = openCookieSettings;

/* ----- אתחול ----- */
function initConsent() {
  bannerEl = buildBanner();
  fixPrivacyLink(bannerEl);

  bannerEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-consent]');
    if (!btn) return;
    if (btn.getAttribute('data-consent') === 'accept') grantConsent();
    else denyConsent();
  });

  // קישור "הגדרות עוגיות" בכל מקום באתר
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-cookie-settings]');
    if (s) { e.preventDefault(); openCookieSettings(); }
  });

  const state = localStorage.getItem(CONSENT_KEY);
  if (state === 'granted') {
    loadMetaPixel();               // נטען מחדש בכל עמוד עבור מי שכבר אישר
  } else if (state !== 'denied') {
    showBanner();                  // הצגה ראשונה בלבד
  }
}

document.addEventListener('DOMContentLoaded', initConsent);
