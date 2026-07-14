import type { EnrichmentSource, Product } from '@/lib/types';
import { detectSupplier, scrapeProductPage } from '@/lib/suppliers';
import { discoverProductUrl } from '@/lib/product-discovery.server';
import { translateProductName } from '@/lib/translate/product-he-ar';
import { freeTranslateHeAr } from '@/lib/translate/free-google';

/**
 * העשרת מוצר: מוסיפה **תמונה, תיאור, מחיר וברקוד** מדף הספק.
 * שם/קטגוריה/מלאי נשארים ממקור המלאי (הקובץ שיובא) ולא נדרסים כאן.
 * המחיר שמוחזר כאן הוא הצעה בלבד — נשמר רק אם המנהל מאשר בטופס ההעשרה.
 * שרשרת נפילה: (1) קישור ספק (source_url) → (2) ידני (none).
 */

export interface EnrichResult {
  found: boolean;
  source: EnrichmentSource;      // supplier | manual | none
  source_url?: string | null;    // קישור שנמצא (ספק שמור או גילוי אוטומטי)
  images: string[];              // תמונות ממקור חיצוני (מועמדות, לא יורדות עדיין)
  desc_he: string | null;        // תיאור עברית (מקור חיצוני / קיים) — ללא ברקוד (שדה נפרד)
  name_ar_draft: string | null;  // תרגום שם (טיוטה) — לא דורס name_he
  desc_ar_draft: string | null;  // תרגום תיאור (טיוטה)
  brand: string | null;          // עזר בלבד
  found_name: string | null;     // שם שחזר מהספק — עזר בלבד, לא לפרסום
  barcode: string | null;        // ברקוד (EAN/UPC) שנמצא בדף הספק — שדה נפרד, לא בתיאור
  price: number | null;          // מחיר שנמצא בדף הספק — הצעה, ניתן לעריכה לפני שמירה
  sale_price: number | null;     // מחיר מבצע שנמצא בדף הספק, אם יש
  on_sale: boolean;              // האם הדף אצל הספק מציג מבצע
  image_external: boolean;       // תמיד true להעשרה חיצונית
}

const NONE: Omit<EnrichResult, 'name_ar_draft' | 'desc_ar_draft'> = {
  found: false, source: 'none', images: [], desc_he: null, brand: null, found_name: null, barcode: null,
  price: null, sale_price: null, on_sale: false, image_external: false,
};

/** מגבלת זמן לגריפה — מונעת תקיעה כשאתר הספק איטי (טאצ' = Store API + HTML) */
const SCRAPE_TIMEOUT_MS = 20_000;

/** תרגום דרפט של שם ותיאור (לא דורס עברית קיימת) */
async function withArabicDrafts(
  base: EnrichBase,
  nameHe: string
): Promise<EnrichResult> {
  const [name_ar_draft, desc_ar_draft] = await Promise.all([
    translateProductName(nameHe, freeTranslateHeAr),
    base.desc_he ? freeTranslateHeAr(base.desc_he) : Promise.resolve(''),
  ]);
  return { ...base, name_ar_draft: name_ar_draft || null, desc_ar_draft: desc_ar_draft || null };
}

type EnrichBase = Omit<EnrichResult, 'name_ar_draft' | 'desc_ar_draft'>;

async function fromUrlWithTimeout(
  url: string,
  product: Product,
  ms = SCRAPE_TIMEOUT_MS
): Promise<Omit<EnrichResult, 'name_ar_draft' | 'desc_ar_draft'> | null> {
  return Promise.race([
    fromUrl(url, product),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/** גריפה מקישור — ספק מוכר או כל אתר (פרסר גנרי) */
async function fromUrl(url: string, product: Product): Promise<Omit<EnrichResult, 'name_ar_draft' | 'desc_ar_draft'> | null> {
  let scraped;
  try {
    scraped = await scrapeProductPage(url.trim());
  } catch (err) {
    console.warn('גריפה מקישור נכשלה', url, err);
    return null;
  }
  const hasKnownParser = !!detectSupplier(url.trim());
  const hasPrice = typeof scraped.price === 'number' && scraped.price > 0;
  if (!scraped.image_urls.length && !scraped.desc_he && !scraped.barcode && !hasPrice) return null;
  const barcode = scraped.barcode || null;
  return {
    found: true,
    source: hasKnownParser ? 'supplier' : 'manual',
    source_url: url.trim(),
    images: scraped.image_urls,
    desc_he: scraped.desc_he || product.desc_he || null,
    brand: null,
    found_name: scraped.name_he,
    barcode,
    price: hasPrice ? scraped.price : null,
    sale_price: scraped.on_sale && scraped.sale_price != null ? scraped.sale_price : null,
    on_sale: !!scraped.on_sale,
    image_external: scraped.image_urls.length > 0,
  };
}

/**
 * תצוגה מקדימה מהירה — רק source_url שמור, בלי חיפוש אוטומטי (נפתח מיד בממשק).
 */
export async function enrichProductPreview(product: Product): Promise<EnrichResult> {
  if (product.source_url?.trim()) {
    try {
      const sup = await fromUrlWithTimeout(product.source_url.trim(), product);
      if (sup) return withArabicDrafts(sup, product.name_he);
    } catch (err) {
      console.warn('העשרה מספק נכשלה', err);
    }
  }
  return withArabicDrafts(
    { ...NONE, desc_he: product.desc_he || null },
    product.name_he
  );
}

/**
 * חיפוש אוטומטי לפי שם + ברקוד — איטי (DuckDuckGo + עד 6 דפים). רק לפי בקשה במודל.
 */
export async function enrichProductDiscover(product: Product): Promise<EnrichResult> {
  try {
    const hit = await discoverProductUrl(product);
    if (hit) {
      const sup = await fromUrlWithTimeout(hit.url, product, SCRAPE_TIMEOUT_MS * 2);
      if (sup) return withArabicDrafts({ ...sup, source_url: hit.url }, product.name_he);
    }
  } catch (err) {
    console.warn('חיפוש מוצר נכשל', err);
  }
  return withArabicDrafts(
    { ...NONE, desc_he: product.desc_he || null },
    product.name_he
  );
}

/**
 * העשרה מלאה (bulk): source_url → חיפוש אוטומטי → none
 */
export async function enrichProduct(product: Product): Promise<EnrichResult> {
  const preview = await enrichProductPreview(product);
  if (preview.found) return preview;
  return enrichProductDiscover(product);
}

/** העשרה מפורשת מקישור שהמנהל הדביק (שלב 2 ידני) */
export async function enrichFromSupplierUrl(product: Product, url: string): Promise<EnrichResult> {
  const sup = await fromUrlWithTimeout(url.trim(), product);
  if (sup) return withArabicDrafts(sup, product.name_he);
  return withArabicDrafts(NONE, product.name_he);
}
