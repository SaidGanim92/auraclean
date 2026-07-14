'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useConsent } from '@/components/providers/ConsentProvider';
import { pName, pCat, pDesc, catKey, effectivePrice, productImage, money } from '@/lib/product';
import { playCartAdd, playCartQtyDown, playCartQtyUp } from '@/lib/button-sound';
import { ProductCard } from './ProductCard';
import { AdminProductEditLink } from './AdminProductEditLink';
import { StoreAdminBar } from './StoreAdminBar';

export function ProductView({
  product,
  all,
  isAdmin = false,
}: {
  product: Product | null;
  all: Product[];
  isAdmin?: boolean;
}) {
  const { t, lang } = useI18n();
  const { add, items, setQty: setCartQty, remove, openDrawer } = useCart();
  const { track } = useConsent();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) track('ViewContent', { content_ids: [product.id], value: effectivePrice(product), currency: 'ILS' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (!product) {
    return (
      <div className="container">
        <div className="status-msg">
          {t('product_not_found')}
          <div className="mt-2"><Link className="btn btn-primary" href="/">{t('back_to_catalog')}</Link></div>
        </div>
      </div>
    );
  }

  const p = product;
  const c = t('currency');
  const onSale = p.on_sale && p.sale_price;
  const same = all.filter((x) => catKey(x) === catKey(p) && x.id !== p.id).slice(0, 4);
  const inCartQty = items.find((i) => i.id === p.id)?.qty ?? 0;
  const categoryHref = catKey(p) ? `/?category=${encodeURIComponent(catKey(p))}#shop` : '/#shop';

  const catMap = new Map<string, Product>();
  all.forEach((x) => { const k = catKey(x); if (k && !catMap.has(k)) catMap.set(k, x); });

  return (
    <>
      {isAdmin && <StoreAdminBar />}
      <div className="container product-page">
      <nav className="breadcrumbs" aria-label="ניווט">
        <Link href="/">{t('nav_home')}</Link><span>/</span>
        <Link href={categoryHref}>{pCat(p, lang)}</Link><span>/</span>
        <span>{pName(p, lang)}</span>
      </nav>
      <Link className="product-back" href={categoryHref}>
        <span aria-hidden="true">←</span>
        {t('back_to_category')}
      </Link>

      <div className="product-detail product-detail-enter">
        <div className="media">
          {onSale ? <span className="tag tag-sale">{t('tag_sale')}</span> : p.featured ? <span className="tag tag-featured">{t('tag_featured')}</span> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={productImage(p, lang)} alt={pName(p, lang)} />
        </div>

        <div className="product-info">
          {isAdmin && <AdminProductEditLink productId={p.id} variant="inline" />}
          <span className="card-cat">{pCat(p, lang)}</span>
          <h1>{pName(p, lang)}</h1>

          <div className="product-price-block">
            {onSale ? (
              <>
                <span className="price price-sale">{money(p.sale_price!, c)}</span>
                <span className="price-old">{money(p.price, c)}</span>
              </>
            ) : (
              <span className="price">{money(p.price, c)}</span>
            )}
            {p.unit && <span className="unit-label">{t('unit_prefix')}{p.unit}</span>}
          </div>

          <div className={`stock-badge${p.available ? ' in-stock' : ' out-stock'}`}>
            {p.available ? (
              <>
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
                {t('in_stock')}
              </>
            ) : (
              t('out_of_stock')
            )}
          </div>

          <div className="product-purchase">
            {p.available ? (
              inCartQty > 0 ? (
                <div className="add-cart-row product-cart-row">
                  <div className="cart-stepper cart-stepper-lg" aria-label={`${t('in_cart')} ${inCartQty}`}>
                    <button
                      type="button"
                      onClick={() => {
                        playCartQtyDown();
                        if (inCartQty === 1) remove(p.id);
                        else setCartQty(p.id, inCartQty - 1);
                      }}
                      aria-label={t('decrease')}
                    >
                      −
                    </button>
                    <span>
                      <span className="cart-added-check" aria-hidden="true">✓</span>
                      {inCartQty}
                    </span>
                    <button type="button" onClick={() => { playCartQtyUp(); add(p, 1); }} aria-label={t('increase')}>
                      +
                    </button>
                  </div>
                  <button type="button" className="btn-view-cart" onClick={openDrawer}>
                    {t('view_cart')}
                  </button>
                </div>
              ) : (
                <div className="product-actions">
                  <div className="qty-control">
                    <button type="button" onClick={() => { playCartQtyDown(); setQty((q) => Math.max(1, q - 1)); }} aria-label={t('decrease')}>−</button>
                    <input type="text" inputMode="numeric" value={qty} aria-label={t('qty')}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 1))} />
                    <button type="button" onClick={() => { playCartQtyUp(); setQty((q) => q + 1); }} aria-label={t('increase')}>+</button>
                  </div>
                  <button className="btn btn-gradient btn-lg product-add-btn" onClick={() => { playCartAdd(); add(p, qty); }}>
                    {t('add_to_cart')}
                  </button>
                </div>
              )
            ) : (
              <button className="btn btn-outline btn-lg btn-block" disabled aria-disabled="true">{t('out_of_stock')}</button>
            )}

            <div className="info-note">
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
              </svg>
              <span>{t('shipping_note')} · {t('payment_info')}</span>
            </div>
          </div>

          {pDesc(p, lang) && (
            <div className="product-desc-block">
              <h2>{t('description')}</h2>
              <p>{pDesc(p, lang)}</p>
            </div>
          )}
        </div>
      </div>

      <section className="section product-related">
        <div className="section-head"><h2>{t('perfect_route')}</h2></div>
        {same.length > 0 && (
          <>
            <h3 className="subsection-title">{t('same_category')}</h3>
            <div className="product-grid">
              {same.map((x, i) => <ProductCard key={x.id} product={x} index={i} isAdmin={isAdmin} />)}
            </div>
          </>
        )}
        <div className="product-cats-links">
          <h3 className="subsection-title">{t('all_cats_links')}</h3>
          <div className="category-bar category-bar-wrap">
            {[...catMap.values()].map((x) => (
              <Link
                key={catKey(x)}
                className="chip"
                href={`/?category=${encodeURIComponent(catKey(x))}#shop`}
              >
                {pCat(x, lang)}
              </Link>
            ))}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
