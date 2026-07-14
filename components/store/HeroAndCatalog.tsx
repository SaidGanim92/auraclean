'use client';

import { Suspense } from 'react';
import type { Product } from '@/lib/types';
import { useI18n } from '@/components/providers/I18nProvider';
import { CatalogClient } from './CatalogClient';
import { StoreAdminBar } from './StoreAdminBar';
import { BitIcon, CashIcon } from '@/components/store/PaymentIcons';

export function HeroAndCatalog({ products, isAdmin = false }: { products: Product[]; isAdmin?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {isAdmin && <StoreAdminBar />}
      <div className="container">
        <section className="hero hero-enter">
          <div className="hero-copy">
            <span className="hero-eyebrow">AURA CLEAN · MAGHAR</span>
            <h1>{t('hero_title')}</h1>
            <p>{t('hero_sub')}</p>
            <a href="#shop" className="btn btn-hero btn-lg">
              {t('hero_cta')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-orb hero-orb-large" />
            <div className="hero-orb hero-orb-small" />
            <div className="hero-bottle hero-bottle-main">
              <span className="bottle-cap" />
              <span className="bottle-label">CLEAN<br />HOME</span>
            </div>
            <div className="hero-bottle hero-bottle-side">
              <span className="bottle-cap" />
              <span className="bottle-label">FRESH</span>
            </div>
            <span className="hero-spark hero-spark-a" />
            <span className="hero-spark hero-spark-b" />
          </div>
        </section>

        <div className="trust-strip trust-enter">
          <div className="trust-item">
            <span className="trust-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
            </span>
            <span>{t('hero_badge_delivery')}</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <span>{t('hero_badge_nomin')}</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon trust-icon-pay" aria-hidden="true">
              <CashIcon size={20} className="payment-icon payment-icon-cash" />
              <BitIcon size={20} className="payment-icon payment-icon-bit" />
            </span>
            <span>{t('hero_badge_pay')}</span>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <CatalogClient products={products} isAdmin={isAdmin} />
      </Suspense>
    </>
  );
}
