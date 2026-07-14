'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import { useConsent } from '@/components/providers/ConsentProvider';

// באנר עוגיות opt-in — הפיקסל נטען רק לאחר "אישור" (תיקון 13)
export function CookieBanner() {
  const { t } = useI18n();
  const { showBanner, grant, deny } = useConsent();
  if (!showBanner) return null;

  return (
    <div className="cookie-banner show" role="dialog" aria-live="polite" aria-label={t('cookie_settings')}>
      <p>
        {t('cookie_text')}{' '}
        <Link href="/cookies">{t('cookie_more')}</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="btn btn-gradient" onClick={grant}>{t('cookie_accept')}</button>
        <button type="button" className="btn btn-outline" onClick={deny}>{t('cookie_reject')}</button>
      </div>
    </div>
  );
}
