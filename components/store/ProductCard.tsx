'use client';

import Link from 'next/link';
import type { Product } from '@/lib/types';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCart } from '@/components/providers/CartProvider';
import { useConsent } from '@/components/providers/ConsentProvider';
import { pName, pCat, pDesc, effectivePrice, productImage, money } from '@/lib/product';
import { playCartAdd, playCartQtyDown, playCartQtyUp } from '@/lib/button-sound';
import { AdminProductEditLink } from './AdminProductEditLink';

export function ProductCard({
  product,
  index = 0,
  isAdmin = false,
}: {
  product: Product;
  index?: number;
  isAdmin?: boolean;
}) {
  const { t, lang } = useI18n();
  const { add, items, setQty, remove, openDrawer } = useCart();
  const { track } = useConsent();

  const p = product;
  const unavailable = !p.available;
  const onSale = p.on_sale && p.sale_price;
  const img = productImage(p, lang);
  const c = t('currency');
  const inCartQty = items.find((i) => i.id === p.id)?.qty ?? 0;

  return (
    <article
      className={`card${unavailable ? ' is-unavailable' : ''}`}
    >
      <div className="card-media">
        {isAdmin && <AdminProductEditLink productId={p.id} />}
        {onSale ? (
          <span className="tag tag-sale">{t('tag_sale')}</span>
        ) : p.featured ? (
          <span className="tag tag-featured">{t('tag_featured')}</span>
        ) : null}
        {unavailable && <span className="tag tag-out">{t('out_of_stock')}</span>}
        <Link
          href={`/product/${p.id}`}
          aria-label={pName(p, lang)}
          onClick={() => track('ViewContent', { content_ids: [p.id], value: effectivePrice(p), currency: 'ILS' })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={pName(p, lang)} loading="lazy" />
        </Link>
      </div>
      <div className="card-body">
        <span className="card-cat">{pCat(p, lang)}</span>
        <h3 className="card-title">
          <Link
            href={`/product/${p.id}`}
            onClick={() => track('ViewContent', { content_ids: [p.id] })}
          >
            {pName(p, lang)}
          </Link>
        </h3>
        <p className="card-desc">{pDesc(p, lang)}</p>
        <div className="price-row">
          {onSale ? (
            <>
              <span className="price price-sale">{money(p.sale_price!, c)}</span>{' '}
              <span className="price-old">{money(p.price, c)}</span>
            </>
          ) : (
            <span className="price">{money(p.price, c)}</span>
          )}
          {p.unit && <span className="unit-label">{t('unit_prefix')}{p.unit}</span>}
        </div>
        <div className="card-footer">
          {unavailable ? (
            <button className="btn btn-outline btn-block" disabled aria-disabled="true">
              {t('out_of_stock')}
            </button>
          ) : inCartQty > 0 ? (
            <div className="add-cart-row">
              <div className="cart-stepper" aria-label={`${t('in_cart')} ${inCartQty}`}>
                <button
                  type="button"
                  onClick={() => {
                    playCartQtyDown();
                    if (inCartQty === 1) remove(p.id);
                    else setQty(p.id, inCartQty - 1);
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
            <button className="btn btn-primary btn-block" onClick={() => { playCartAdd(); add(p, 1); }}>
              {t('add_to_cart')}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
