'use client';

import { useI18n } from '@/components/providers/I18nProvider';

const BRANDS = [
  { src: '/images/brand-touch-transparent.png', alt: "טאצ'" },
  { src: '/images/brand-sag-transparent.png', alt: 'SAG' },
  { src: '/images/brand-tiroler-transparent.png', alt: 'טירולר' },
  { src: '/images/brand-yaakobi-transparent.png', alt: 'יעקובי' },
];

const LOOP_BRANDS = Array.from({ length: 3 }, () => BRANDS).flat();

export function BrandMarquee() {
  const { t } = useI18n();
  return (
    <section className="brands" aria-labelledby="brands-title">
      <h2 id="brands-title">{t('brands_title')}</h2>
      <div className="marquee">
        <div className="marquee-track">
          <div className="marquee-group">
            {LOOP_BRANDS.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${b.src}-${i}`} className="brand-logo" src={b.src} alt={i < BRANDS.length ? b.alt : ''} loading="lazy" />
            ))}
          </div>
          <div className="marquee-group" aria-hidden="true">
            {LOOP_BRANDS.map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${b.src}-copy-${i}`} className="brand-logo" src={b.src} alt="" loading="lazy" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
