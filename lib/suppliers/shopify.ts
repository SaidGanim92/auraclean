import type { ScrapedProduct } from '@/lib/types';
import { type Fetcher, type SupplierParser, parsePrice, looksLikeBarcode } from './types';
import { resolveFetcher } from './resolve-fetcher';

/**
 * פרסר Shopify — יעקובי (jacobi.co.il).
 * השיטה היציבה ביותר: הוספת ".json" לכתובת המוצר → JSON נקי.
 *   GET {product-url}.json  →  { product: { title, body_html, images[], variants[] } }
 * variant כולל: price, sku, compare_at_price, available.
 * מבצע: compare_at_price > price  →  on_sale, sale_price=price, מקורי=compare_at_price.
 */
function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim() || null;
}

/** בונה את כתובת ה-.json מתוך כתובת מוצר Shopify (מסיר query/hash) */
export function toJsonUrl(url: string): string {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.origin}${path}.json`;
}

export const shopifyParser: SupplierParser = {
  supplier: 'yaakobi',

  matches(url: string): boolean {
    try {
      const u = new URL(url);
      return /(^|\.)jacobi\.co\.il$/i.test(u.hostname) || /(^|\.)johnsonclean\.co\.il$/i.test(u.hostname);
    } catch {
      return false;
    }
  },

  async parse(url: string, fetcher?: Fetcher): Promise<ScrapedProduct> {
    const f = resolveFetcher(fetcher);
    const jsonUrl = toJsonUrl(url);
    const res = await f(jsonUrl);
    if (!res.ok) throw new Error(`Shopify JSON נכשל (${res.status}) עבור ${jsonUrl}`);
    const data = await res.json();
    const p = data?.product;
    if (!p) throw new Error('מבנה Shopify לא צפוי: חסר product');

    // בוחרים variant זמין ראשון, אחרת הראשון
    const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
    const variant = variants.find((v) => v.available) || variants[0] || {};

    const price = parsePrice(variant.price) ?? 0;
    const compare = parsePrice(variant.compare_at_price);
    const onSale = compare != null && price != null && compare > price;

    const images: string[] = Array.isArray(p.images)
      ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.src)).filter(Boolean)
      : [];

    const available = variants.length ? variants.some((v) => v.available) : true;

    // Shopify שומר ברקוד (EAN/UPC) בשדה variant.barcode, בנפרד מ-sku
    const barcodeRaw = variant.barcode ? String(variant.barcode).trim() : null;
    const barcode = looksLikeBarcode(barcodeRaw) ? barcodeRaw : null;

    return {
      sku: String(variant.sku || p.id || '').trim() || `shopify-${p.handle || ''}`,
      source_url: url,
      supplier: 'yaakobi',
      name_he: String(p.title || '').trim(),
      category_he: p.product_type ? String(p.product_type).trim() : null,
      desc_he: stripHtml(p.body_html),
      price: onSale ? compare! : price, // המחיר "המקורי" נשמר כ-price; sale_price הוא בפועל
      sale_price: onSale ? price : null,
      on_sale: onSale,
      available,
      unit: null,
      image_urls: images,
      barcode,
    };
  },
};
