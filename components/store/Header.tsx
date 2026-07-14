'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCart } from '@/components/providers/CartProvider';
import { LanguageSwitch } from './LanguageSwitch';
import { HeaderSearch } from './HeaderSearch';

export function Header() {
  const { t } = useI18n();
  const { count, openDrawer } = useCart();

  return (
    <header className="site-header">
      <div className="promo-bar" role="status">
        <div className="container promo-bar-inner">
          <span aria-hidden="true">✦</span>
          <span>{t('free_delivery_banner')}</span>
        </div>
      </div>
      <div className="container header-inner">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="AURA CLEAN" />
          <span className="brand-name">
            <span className="en">AURA CLEAN</span>
            <span className="local">{t('brand_local')}</span>
          </span>
        </Link>
        <HeaderSearch />
        <div className="header-spacer" />
        <div className="header-actions">
          <LanguageSwitch />
          <button type="button" className="icon-btn" onClick={openDrawer} aria-label={t('open_cart')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="9" cy="20" r="1.6" />
              <circle cx="18" cy="20" r="1.6" />
              <path d="M2 3h3l2.4 12.3a1 1 0 0 0 1 .7h9.3a1 1 0 0 0 1-.8L21 7H6" />
            </svg>
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
