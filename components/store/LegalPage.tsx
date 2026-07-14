'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';

// עוטף עמוד משפטי דו-לשוני: מציג את התוכן בשפה הפעילה.
export function LegalPage({ he, ar }: { he: React.ReactNode; ar: React.ReactNode }) {
  const { t, lang } = useI18n();
  return (
    <div className="container">
      <article className="page-content">
        {lang === 'ar' ? ar : he}
        <p className="mt-3">
          <Link className="btn btn-outline" href="/">{t('back_to_catalog')}</Link>
        </p>
      </article>
    </div>
  );
}

// עזר לסימון placeholder
export function PH({ children }: { children: React.ReactNode }) {
  return <span className="placeholder-hl">{children}</span>;
}
