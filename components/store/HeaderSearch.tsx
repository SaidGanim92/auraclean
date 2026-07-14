'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/providers/I18nProvider';

function HeaderSearchForm() {
  const { t } = useI18n();
  const q = useSearchParams().get('q') || '';

  return (
    <form className="header-search" action="/" role="search">
      <label htmlFor="header-search-input" className="visually-hidden">{t('search_placeholder')}</label>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
      </svg>
      <input
        id="header-search-input"
        name="q"
        type="search"
        placeholder={t('search_placeholder')}
        defaultValue={q}
        autoComplete="off"
        key={q}
      />
    </form>
  );
}

export function HeaderSearch() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={(
        <form className="header-search" action="/" role="search">
          <label htmlFor="header-search-input" className="visually-hidden">{t('search_placeholder')}</label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input id="header-search-input" name="q" type="search" placeholder={t('search_placeholder')} autoComplete="off" />
        </form>
      )}
    >
      <HeaderSearchForm />
    </Suspense>
  );
}
