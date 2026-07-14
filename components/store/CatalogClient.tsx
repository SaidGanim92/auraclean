'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@/lib/types';
import { useI18n } from '@/components/providers/I18nProvider';
import { pCat, catKey } from '@/lib/product';
import { ProductCard } from './ProductCard';
import { BrandMarquee } from './BrandMarquee';

export function CatalogClient({ products, isAdmin = false }: { products: Product[]; isAdmin?: boolean }) {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get('category') || 'all';
  const requestedSearch = searchParams.get('q') || '';
  const [activeCat, setActiveCat] = useState<string>(requestedCategory);

  // קישור ממוצר מחזיר ישירות לקטגוריה — אם הקטגוריה לא קיימת, חוזרים ל"הכל".
  useEffect(() => {
    if (requestedCategory === 'all') {
      setActiveCat('all');
      return;
    }
    const valid = products.some((p) => catKey(p) === requestedCategory);
    setActiveCat(valid ? requestedCategory : 'all');
  }, [requestedCategory, products]);

  const featured = useMemo(() => products.filter((p) => p.featured).slice(0, 8), [products]);

  // קטגוריות ייחודיות (מפתח עברי יציב)
  const categories = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      const k = catKey(p);
      if (k && !map.has(k)) map.set(k, p);
    });
    return [...map.entries()]
      .map(([key, p]) => ({ key, label: pCat(p, lang) }))
      .filter((c) => c.label.trim());
  }, [products, lang]);

  // סינון
  const filtered = useMemo(() => {
    const term = requestedSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat !== 'all' && catKey(p) !== activeCat) return false;
      if (!term) return true;
      const hay = [p.name_he, p.name_ar, p.desc_he, p.desc_ar, p.category_he, p.category_ar]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [products, activeCat, requestedSearch]);

  // קיבוץ לקטגוריות
  const groups = useMemo(() => {
    const m = new Map<string, Product[]>();
    filtered.forEach((p) => {
      const k = catKey(p);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    });
    return [...m.entries()];
  }, [filtered]);

  return (
    <>
      <div className="container">
        <BrandMarquee />

        {featured.length > 0 && (
          <section className="section">
            <div className="section-head"><h2>{t('featured_title')}</h2></div>
            <div className="product-grid">
              {featured.map((p, i) => <ProductCard key={p.id} product={p} index={i} isAdmin={isAdmin} />)}
            </div>
          </section>
        )}
      </div>

      {/* סרגל קטגוריות */}
      <div className="catalog-toolbar" id="shop">
        <div className="container">
          <div className="filter-bars">
            <div className="category-bar" role="group" aria-label={t('categories_title')}>
              <span className="category-bar-label">{t('categories_title')}</span>
              <button className="chip" aria-current={activeCat === 'all'} onClick={() => setActiveCat('all')}>
                {t('all_categories')}
              </button>
              {categories.map((c) => (
                <button
                  key={c.key}
                  className="chip"
                  aria-current={activeCat === c.key}
                  onClick={() => setActiveCat(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="section-head mt-3"><h2>{t('catalog_title')}</h2></div>
        {products.length === 0 ? (
          <div className="status-msg">{t('empty_catalog')}</div>
        ) : filtered.length === 0 ? (
          <div className="status-msg">
            {t('no_results')}
            <div className="mt-2">
              <Link className="btn btn-outline" href="/#shop" onClick={() => setActiveCat('all')}>
                {t('all_categories')}
              </Link>
            </div>
          </div>
        ) : (
          groups.map(([key, items]) => (
            <section className="section" key={key}>
              <div className="section-head"><h2 className="category-title">{pCat(items[0], lang)}</h2></div>
              <div className="product-grid">
                {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} isAdmin={isAdmin} />)}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
