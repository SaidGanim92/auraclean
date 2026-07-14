'use client';

import { useEffect } from 'react';
import { playButtonSound, primeButtonSounds } from '@/lib/button-sound';
import { isButtonSoundEnabled } from '@/lib/a11y-settings';

const SELECTOR = 'button, .btn, a.btn, [role="button"], input[type="submit"], input[type="button"]';
/** בלי צליל גנרי — לסל יש צלילים ייעודיים */
const SILENT = '.add-cart-row, .cart-stepper, .product-cart-row, .qty-mini, .qty-control, .card-footer .btn-primary, .product-add-btn, .drawer-head .icon-btn, .modal-head .icon-btn';

export function ButtonSoundListener() {
  useEffect(() => {
    primeButtonSounds();

    const onPointer = (e: PointerEvent) => {
      if (!isButtonSoundEnabled()) return;
      if (e.button !== 0) return;

      const target = e.target;
      if (!(target instanceof Element)) return;

      const el = target.closest(SELECTOR);
      if (!el || !(el instanceof HTMLElement)) return;
      if (el.closest('.a11y-fab, .toggle, .lang-switch')) return;
      if (el.closest(SILENT)) return;
      if (el.closest('.checkout-modal') && (el as HTMLButtonElement).type === 'submit') return;
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;

      playButtonSound('click');
    };

    document.addEventListener('pointerdown', onPointer, true);
    return () => document.removeEventListener('pointerdown', onPointer, true);
  }, []);

  return null;
}
