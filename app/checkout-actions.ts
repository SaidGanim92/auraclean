'use server';

import type { CartItem } from '@/components/providers/CartProvider';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/components/providers/CartProvider';
import { buildWhatsappUrl, type OrderDetails } from '@/lib/whatsapp';
import { getPublishedProducts } from '@/lib/products.server';
import { effectivePrice, pName } from '@/lib/product';
import type { Lang, TKey } from '@/lib/i18n/dict';

export interface CheckoutLineInput {
  id: string;
  qty: number;
}

export interface ValidatedCheckout {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  whatsappUrl: string;
}

/** אימות מחירים ומלאי מהמסד לפני שליחת הזמנה לוואטסאפ */
export async function validateCheckoutAndBuildUrl(
  lines: CheckoutLineInput[],
  details: OrderDetails,
  lang: Lang,
  labels: Record<TKey, string>
): Promise<{ ok: true; data: ValidatedCheckout } | { ok: false; error: string }> {
  if (!lines.length) return { ok: false, error: labels.err_cart_empty || 'העגלה ריקה' };

  const catalog = await getPublishedProducts();
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const validated: CartItem[] = [];

  for (const line of lines) {
    const qty = Math.min(99, Math.max(1, Math.round(Number(line.qty) || 1)));
    const p = byId.get(line.id);
    if (!p) return { ok: false, error: labels.err_product_unavailable || 'מוצר לא זמין' };
    if (!p.available) return { ok: false, error: `${p.name_he} — ${labels.err_out_of_stock || 'אזל מהמלאי'}` };

    validated.push({
      id: p.id,
      sku: p.sku,
      name_he: p.name_he,
      name_ar: p.name_ar,
      price: effectivePrice(p),
      unit: p.unit,
      image: p.images?.[0] || '',
      qty,
      barcode: p.barcode || p.sku || null,
    });
  }

  const subtotal = validated.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
  const total = subtotal + shipping;

  const t = (k: TKey) => labels[k] || k;
  const whatsappUrl = buildWhatsappUrl(validated, details, { lang, t, shipping, subtotal, total });

  return { ok: true, data: { items: validated, subtotal, shipping, total, whatsappUrl } };
}

/** עזר לתצוגה — שם מוצר מאומת */
export async function resolveProductNames(ids: string[], lang: Lang): Promise<Map<string, string>> {
  const catalog = await getPublishedProducts();
  const map = new Map<string, string>();
  for (const id of ids) {
    const p = catalog.find((x) => x.id === id);
    if (p) map.set(id, pName(p, lang));
  }
  return map;
}
