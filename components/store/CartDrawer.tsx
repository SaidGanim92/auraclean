'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCart, type CartItem } from '@/components/providers/CartProvider';
import { money } from '@/lib/product';
import { playCartClose, playCartQtyDown, playCartQtyUp } from '@/lib/button-sound';

export function CartDrawer() {
  const { t, lang } = useI18n();
  const { items, subtotal, shipping, total, drawerOpen, closeDrawer, setQty, remove, openCheckout } = useCart();
  const c = t('currency');
  const itemName = (i: CartItem) => (lang === 'ar' ? i.name_ar || i.name_he : i.name_he || i.name_ar);

  const handleClose = () => {
    playCartClose();
    closeDrawer();
  };

  return (
    <>
      <div className={`drawer-overlay${drawerOpen ? ' open' : ''}`} onClick={handleClose} />
      <aside
        className={`drawer${drawerOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('cart_title')}
      >
        <div className="drawer-head">
          <h2>{t('cart_title')}</h2>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label={t('close')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>

        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="empty-cart">
              <p style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t('cart_empty')}</p>
              <Link href="/#shop" className="btn btn-primary mt-2" onClick={closeDrawer}>
                {t('cart_empty_cta')}
              </Link>
            </div>
          ) : (
            items.map((i) => (
              <div className="cart-item" key={i.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image} alt={itemName(i) || ''} />
                <div>
                  <div className="ci-name">{itemName(i)}</div>
                  <div className="ci-price">{money(i.price, c)}{i.unit ? ` · ${i.unit}` : ''}</div>
                  <div className="ci-controls">
                    <div className="qty-mini">
                      <button type="button" onClick={() => { playCartQtyDown(); setQty(i.id, i.qty - 1); }} aria-label={t('decrease')}>−</button>
                      <span aria-live="polite">{i.qty}</span>
                      <button type="button" onClick={() => { playCartQtyUp(); setQty(i.id, i.qty + 1); }} aria-label={t('increase')}>+</button>
                    </div>
                    <button type="button" className="ci-remove" onClick={() => remove(i.id)}>{t('remove')}</button>
                  </div>
                </div>
                <div className="ci-line">{money(i.price * i.qty, c)}</div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="summary-row"><span>{t('subtotal')}</span><span>{money(subtotal, c)}</span></div>
            <div className="summary-row"><span>{t('shipping')}</span><span>{shipping === 0 ? t('free_shipping') : money(shipping, c)}</span></div>
            <div className="ship-note">{t('shipping_note')}</div>
            <div className="summary-row total"><span>{t('total')}</span><span>{money(total, c)}</span></div>
            <button type="button" className="btn btn-gradient btn-block btn-lg mt-2" onClick={openCheckout}>
              {t('checkout_title')}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
