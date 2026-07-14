/* ==========================================================================
   accessibility.js – תפריט נגישות
   שליטה בגודל גופן, ניגודיות, הדגשת קישורים, כיבוי אנימציה + איפוס.
   ההעדפות נשמרות ב-localStorage ומוחלות בכל טעינה.
   ========================================================================== */

const A11Y_KEY = 'auraclean_a11y';

/* ברירות מחדל */
const A11Y_DEFAULTS = { fontScale: 1, contrast: false, links: false, noAnim: false };
const FONT_MIN = 0.9, FONT_MAX = 1.5, FONT_STEP = 0.1;

function loadA11y() {
  try { return { ...A11Y_DEFAULTS, ...JSON.parse(localStorage.getItem(A11Y_KEY) || '{}') }; }
  catch { return { ...A11Y_DEFAULTS }; }
}
function saveA11y(s) { localStorage.setItem(A11Y_KEY, JSON.stringify(s)); }

let a11yState = loadA11y();

/* החלת ההעדפות על הדף */
function applyA11y() {
  const html = document.documentElement;
  html.style.setProperty('--font-scale', a11yState.fontScale);
  html.classList.toggle('a11y-contrast', a11yState.contrast);
  html.classList.toggle('a11y-links', a11yState.links);
  html.classList.toggle('no-anim', a11yState.noAnim);
  syncPanel();
}

/* עדכון הפקדים בפאנל בהתאם למצב */
function syncPanel() {
  const panel = document.getElementById('a11y-panel');
  if (!panel) return;
  panel.querySelector('[data-a11y="contrast"]').checked = a11yState.contrast;
  panel.querySelector('[data-a11y="links"]').checked = a11yState.links;
  panel.querySelector('[data-a11y="noAnim"]').checked = a11yState.noAnim;
  const pct = Math.round(a11yState.fontScale * 100) + '%';
  const out = panel.querySelector('[data-a11y-fontval]');
  if (out) out.textContent = pct;
}

/* בניית ה-FAB והפאנל */
function buildA11y() {
  // כפתור צף
  const fab = document.createElement('button');
  fab.className = 'a11y-fab';
  fab.type = 'button';
  fab.id = 'a11y-fab';
  fab.setAttribute('aria-haspopup', 'dialog');
  fab.setAttribute('aria-controls', 'a11y-overlay');
  fab.innerHTML = `<span class="visually-hidden" data-i18n="accessibility_menu"></span>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 5.2c0 .5-.4.9-.9.9-1.9-.1-3.7-.4-5.1-.7v3.3l2.4 6.9c.2.5-.1 1-.6 1.2-.5.2-1-.1-1.2-.6L12 13.9l-2 5.2c-.2.5-.7.8-1.2.6-.5-.2-.8-.7-.6-1.2L10.6 12V8.4c-1.4.3-3.2.6-5.1.7-.5 0-.9-.4-.9-.9s.4-.9.9-.9c2.9-.1 5.6-.9 6.5-.9s3.6.8 6.5.9c.6 0 1 .4 1 .8z"/></svg>`;
  document.body.appendChild(fab);

  // שכבת רקע + מודאל
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'a11y-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="a11y-title" id="a11y-panel">
      <div class="modal-head">
        <h2 id="a11y-title" data-i18n="a11y_title"></h2>
        <button type="button" class="icon-btn" data-a11y-close aria-label="סגירה">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="a11y-row">
          <div><div class="label" data-i18n="a11y_font"></div><div class="desc" data-i18n="a11y_font_desc"></div></div>
          <div class="seg" role="group" aria-label="גודל גופן">
            <button type="button" data-a11y-font="dec" data-i18n="decrease"></button>
            <button type="button" data-a11y-fontval aria-live="polite" style="min-width:56px;cursor:default">100%</button>
            <button type="button" data-a11y-font="inc" data-i18n="increase"></button>
          </div>
        </div>
        <div class="a11y-row">
          <div><div class="label" data-i18n="a11y_contrast"></div><div class="desc" data-i18n="a11y_contrast_desc"></div></div>
          <label class="toggle"><input type="checkbox" data-a11y="contrast"><span class="track"></span><span class="thumb"></span></label>
        </div>
        <div class="a11y-row">
          <div><div class="label" data-i18n="a11y_links"></div><div class="desc" data-i18n="a11y_links_desc"></div></div>
          <label class="toggle"><input type="checkbox" data-a11y="links"><span class="track"></span><span class="thumb"></span></label>
        </div>
        <div class="a11y-row">
          <div><div class="label" data-i18n="a11y_anim"></div><div class="desc" data-i18n="a11y_anim_desc"></div></div>
          <label class="toggle"><input type="checkbox" data-a11y="noAnim"><span class="track"></span><span class="thumb"></span></label>
        </div>
        <button type="button" class="btn btn-outline btn-block mt-2" data-a11y-reset data-i18n="a11y_reset"></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return { fab, overlay };
}

/* פתיחה/סגירה עם ניהול מיקוד */
let lastFocused = null;
function openPanel(overlay) {
  lastFocused = document.activeElement;
  overlay.classList.add('open');
  applyTranslations(overlay);
  syncPanel();
  const first = overlay.querySelector('[data-a11y-font="dec"]');
  if (first) first.focus();
  document.addEventListener('keydown', escClose);
}
function closePanel(overlay) {
  overlay.classList.remove('open');
  document.removeEventListener('keydown', escClose);
  if (lastFocused) lastFocused.focus();
}
let overlayRef = null;
function escClose(e) { if (e.key === 'Escape' && overlayRef) closePanel(overlayRef); }

/* אתחול */
function initA11y() {
  const { fab, overlay } = buildA11y();
  overlayRef = overlay;
  applyA11y();

  fab.addEventListener('click', () => openPanel(overlay));
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.closest('[data-a11y-close]')) closePanel(overlay);
  });

  // גודל גופן
  overlay.querySelectorAll('[data-a11y-font]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.getAttribute('data-a11y-font');
      if (dir === 'inc') a11yState.fontScale = Math.min(FONT_MAX, +(a11yState.fontScale + FONT_STEP).toFixed(2));
      if (dir === 'dec') a11yState.fontScale = Math.max(FONT_MIN, +(a11yState.fontScale - FONT_STEP).toFixed(2));
      saveA11y(a11yState); applyA11y();
    });
  });
  // מתגים
  overlay.querySelectorAll('[data-a11y]').forEach(input => {
    input.addEventListener('change', () => {
      a11yState[input.getAttribute('data-a11y')] = input.checked;
      saveA11y(a11yState); applyA11y();
    });
  });
  // איפוס
  overlay.querySelector('[data-a11y-reset]').addEventListener('click', () => {
    a11yState = { ...A11Y_DEFAULTS };
    saveA11y(a11yState); applyA11y();
  });
}

document.addEventListener('DOMContentLoaded', initA11y);
