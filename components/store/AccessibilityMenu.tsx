'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/components/providers/I18nProvider';
import { playButtonSound } from '@/lib/button-sound';
import { A11Y_DEFAULTS, A11Y_KEY, type A11yState } from '@/lib/a11y-settings';

const FONT_MIN = 0.85, FONT_MAX = 1.6, STEP = 0.05;

export function AccessibilityMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(A11Y_DEFAULTS);

  // טעינה
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(A11Y_KEY) || '{}');
      setState({ ...A11Y_DEFAULTS, ...saved });
    } catch {}
  }, []);

  // החלה + שמירה
  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty('--font-scale', String(state.fontScale));
    html.classList.toggle('a11y-contrast', state.contrast);
    html.classList.toggle('a11y-links', state.links);
    html.classList.toggle('no-anim', state.noAnim);
    html.classList.toggle('a11y-sounds', state.buttonSounds);
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // Esc לסגירה
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const setFont = (dir: 1 | -1) =>
    setState((s) => ({
      ...s,
      fontScale: Math.min(FONT_MAX, Math.max(FONT_MIN, +(s.fontScale + dir * STEP).toFixed(2))),
    }));

  return (
    <>
      <button
        type="button"
        className="a11y-fab"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className="visually-hidden">{t('accessibility_menu')}</span>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm8 5.2c0 .5-.4.9-.9.9-1.9-.1-3.7-.4-5.1-.7v3.3l2.4 6.9c.2.5-.1 1-.6 1.2-.5.2-1-.1-1.2-.6L12 13.9l-2 5.2c-.2.5-.7.8-1.2.6-.5-.2-.8-.7-.6-1.2L10.6 12V8.4c-1.4.3-3.2.6-5.1.7-.5 0-.9-.4-.9-.9s.4-.9.9-.9c2.9-.1 5.6-.9 6.5-.9s3.6.8 6.5.9c.6 0 1 .4 1 .8z" />
        </svg>
      </button>

      {open && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={t('a11y_title')}>
            <div className="modal-head">
              <h2>{t('a11y_title')}</h2>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={t('close')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 6l12 12M6 18L18 6" /></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="a11y-row">
                <div>
                  <div className="label">{t('a11y_font')}</div>
                  <div className="desc">{t('a11y_font_desc')}</div>
                </div>
                <div className="seg" role="group" aria-label={t('a11y_font')}>
                  <button type="button" onClick={() => setFont(-1)}>{t('decrease')}</button>
                  <button type="button" aria-live="polite" style={{ minWidth: 56, cursor: 'default' }}>
                    {Math.round(state.fontScale * 100)}%
                  </button>
                  <button type="button" onClick={() => setFont(1)}>{t('increase')}</button>
                </div>
              </div>

              <Toggle label={t('a11y_contrast')} desc={t('a11y_contrast_desc')} checked={state.contrast}
                onChange={(v) => setState((s) => ({ ...s, contrast: v }))} />
              <Toggle label={t('a11y_links')} desc={t('a11y_links_desc')} checked={state.links}
                onChange={(v) => setState((s) => ({ ...s, links: v }))} />
              <Toggle label={t('a11y_anim')} desc={t('a11y_anim_desc')} checked={state.noAnim}
                onChange={(v) => setState((s) => ({ ...s, noAnim: v }))} />
              <Toggle label={t('a11y_sounds')} desc={t('a11y_sounds_desc')} checked={state.buttonSounds}
                onChange={(v) => {
                  setState((s) => ({ ...s, buttonSounds: v }));
                  if (v) playButtonSound('click', true);
                }} />

              <button type="button" className="btn btn-outline btn-block mt-2" onClick={() => setState(A11Y_DEFAULTS)}>
                {t('a11y_reset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="a11y-row">
      <div>
        <div className="label">{label}</div>
        <div className="desc">{desc}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="track" />
        <span className="thumb" />
      </label>
    </div>
  );
}
