import type { CartItem } from '@/components/providers/CartProvider';
import type { Lang, TKey } from '@/lib/i18n/dict';
import { money } from '@/lib/product';
import { looksLikeHebrew } from '@/lib/lang-detect';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '972502073111';

/** סימן כיוון ימין-לשמאל — גורם לוואטסאפ להציג את ההודעה כ-RTL */
const RLM = '\u200F';

export type PaymentMethod = 'cash' | 'bit';

export interface OrderDetails {
  name: string;
  phone: string;
  address: string;
  notes: string;
  payment: PaymentMethod;
}

function itemName(i: CartItem, lang: Lang): string {
  if (lang === 'ar') {
    const ar = i.name_ar?.trim();
    if (ar && !looksLikeHebrew(ar)) return ar;
    return i.name_he || '';
  }
  return i.name_he || i.name_ar || '';
}

/** ברקוד להזמנה: שדה barcode, ואם חסר — sku (בייבוא CSV הברקוד נשמר כמק"ט) */
function itemBarcode(i: CartItem): string {
  const fromBarcode = (i.barcode || '').trim();
  if (fromBarcode && fromBarcode !== '-') return fromBarcode;
  const fromSku = (i.sku || '').trim();
  return fromSku || '-';
}

/** בניית קישור wa.me — טקסט RTL נקי, בלי אימוג'ים, עם ברקוד לכל מוצר */
export function buildWhatsappUrl(
  items: CartItem[],
  details: OrderDetails,
  opts: { lang: Lang; t: (k: TKey) => string; shipping: number; subtotal: number; total: number }
): string {
  const { t, lang, shipping, subtotal, total } = opts;
  const c = t('currency');
  const paymentLabel = details.payment === 'bit' ? t('pay_bit') : t('pay_cash');
  const lines: string[] = [];

  lines.push(`*AURA CLEAN*`);
  lines.push(`*${t('wa_greeting')}*`);
  lines.push('');

  items.forEach((i, idx) => {
    const n = idx + 1;
    const lineTotal = money(i.price * i.qty, c);
    lines.push(`*${n}.* ${itemName(i, lang)}`);
    lines.push(`${t('qty')}: ${i.qty} × ${money(i.price, c)} = *${lineTotal}*`);
    lines.push(`${t('wa_barcode')}: ${itemBarcode(i)}`);
    lines.push('');
  });

  lines.push('--------------------');
  lines.push(`${t('wa_sum')}: ${money(subtotal, c)}`);
  lines.push(`${t('wa_ship')}: ${shipping === 0 ? t('free_shipping') : money(shipping, c)}`);
  lines.push(`*${t('wa_total')}: ${money(total, c)}*`);
  lines.push('--------------------');
  lines.push('');
  lines.push(`*${t('wa_customer')}*`);
  lines.push(`${t('wa_name')}: ${details.name}`);
  lines.push(`${t('wa_phone')}: ${details.phone}`);
  lines.push(`${t('wa_address')}: ${details.address}`);
  lines.push(`${t('wa_payment')}: *${paymentLabel}*`);
  if (details.notes.trim()) {
    lines.push(`${t('wa_notes')}: ${details.notes.trim()}`);
  }
  lines.push('');
  lines.push(t('wa_footer'));

  // כל שורה מתחילה ב-RLM כדי שוואטסאפ יציג מימין לשמאל (עברית/ערבית)
  const body = lines.map((line) => (line ? RLM + line : line)).join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(body)}`;
}
