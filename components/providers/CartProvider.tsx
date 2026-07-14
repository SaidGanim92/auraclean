'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { effectivePrice, productImage } from '@/lib/product';
import { useConsent } from './ConsentProvider';

const CART_KEY = 'auraclean_cart_v2'; // v2: כולל sku לברקוד בהזמנת וואטסאפ
export const SHIPPING_FEE = 20; // דמי משלוח קבועים (מאגר בלבד)
export const FREE_SHIPPING_THRESHOLD = 250;

export interface CartItem {
  id: string;
  sku: string;
  name_he: string;
  name_ar: string | null;
  price: number;
  unit: string | null;
  image: string;
  qty: number;
  barcode: string | null;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  add: (p: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { track } = useConsent();

  // טעינה מ-localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  // שמירה
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = useCallback(
    (p: Product, qty = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === p.id);
        if (existing) {
          return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + qty } : i));
        }
        return [
          ...prev,
          {
            id: p.id,
            sku: p.sku,
            name_he: p.name_he,
            name_ar: p.name_ar,
            price: effectivePrice(p),
            unit: p.unit,
            image: productImage(p, 'he'),
            qty,
            // עד שתורץ מיגרציית barcode במסד — ה-SKU (מק"ט/ברקוד מהייבוא) הוא מקור האמת
            barcode: p.barcode || p.sku || null,
          },
        ];
      });
      track('AddToCart', { content_ids: [p.id], value: effectivePrice(p), currency: 'ILS' });
      // לא פותחים את הסל אוטומטית — הכפתור על הכרטיס מציג את הכמות + אופציה לצפייה בסל
    },
    [track]
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const shipping = useMemo(
    () => (items.length && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0),
    [items.length, subtotal]
  );
  const total = items.length ? subtotal + shipping : 0;

  const openCheckout = useCallback(() => {
    if (!items.length) return;
    setDrawerOpen(false);
    setCheckoutOpen(true);
    track('InitiateCheckout', { value: total, currency: 'ILS', num_items: count });
  }, [items.length, total, count, track]);

  const value: CartCtx = {
    items, count, subtotal, shipping, total,
    add, setQty, remove, clear,
    drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    checkoutOpen, openCheckout, closeCheckout: () => setCheckoutOpen(false),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart חייב להיות בתוך CartProvider');
  return ctx;
}
