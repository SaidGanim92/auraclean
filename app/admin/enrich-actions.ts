'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { downloadImagesToStorage } from '@/lib/images.server';
import {
  enrichProduct,
  enrichProductPreview,
  enrichProductDiscover,
  enrichFromSupplierUrl,
  type EnrichResult,
} from '@/lib/enrich.server';
import { safeUpdate } from '@/lib/db-patch.server';
import { looksLikeHebrew } from '@/lib/lang-detect';
import { translateCategoryToArabic, translateNameToArabic, translateToArabic } from '@/lib/translate';
import { normalizeProductUrl } from '@/lib/url-utils';
import { validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';
import { sanitizeSourceUrl } from '@/lib/security/sanitize-product';
import type { EnrichmentSource, Product } from '@/lib/types';

const DEMO = 'מצב הדגמה: Supabase לא מחובר — מלא את .env.local.';
const MAX_BULK_BATCH = 50;

async function guard() {
  if (!(await isAdminRequest())) throw new Error('לא מורשה');
}

async function fetchProduct(id: string): Promise<Product> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error || !data) throw new Error('המוצר לא נמצא');
  return data as Product;
}

/** תצוגה מקדימה מהירה (לא שומר) — רק source_url, בלי חיפוש אוטומטי */
export async function enrichPreviewAction(
  id: string
): Promise<{ ok: boolean; result?: EnrichResult; product?: Product; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    const product = await fetchProduct(id);
    const result = await enrichProductPreview(product);
    return { ok: true, result, product };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'שגיאה' };
  }
}

/** חיפוש אוטומטי לפי שם/ברקוד — איטי, רק לפי בקשה במודל */
export async function discoverEnrichAction(
  id: string
): Promise<{ ok: boolean; result?: EnrichResult; product?: Product; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    const product = await fetchProduct(id);
    const result = await enrichProductDiscover(product);
    return { ok: true, result, product };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'שגיאה' };
  }
}

/** העשרה מפורשת מקישור ספק (שלב 2 ידני) */
export async function enrichFromUrlAction(
  id: string,
  url: string
): Promise<{ ok: boolean; result?: EnrichResult; product?: Product; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    const product = await fetchProduct(id);
    const normalized = normalizeProductUrl(url);
    validatePublicHttpsUrl(normalized);
    const result = await enrichFromSupplierUrl(product, normalized);
    return { ok: true, result, product };
  } catch (e) {
    if (e instanceof UrlValidationError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : 'שגיאה' };
  }
}

export interface ApplyEnrichmentInput {
  images: string[];      // כתובות תמונה חיצוניות שאושרו (יורדו לאחסון שלנו)
  desc_he: string | null;
  desc_ar: string | null;
  name_ar: string | null; // טיוטה — יישמר רק אם name_ar ריק כרגע
  source: EnrichmentSource;
  source_url?: string | null; // קישור הספק שממנו הגיעה ההעשרה (לשימוש עתידי ב"עדכן מהמקור")
  price?: number | null;      // מחיר לעדכון — מגיע מהטופס, המנהל אישר/ערך אותו לפני השמירה
  sale_price?: number | null; // מחיר מבצע לעדכון (אופציונלי)
  barcode?: string | null;    // ברקוד — שדה נפרד מהתיאור
}

/** החלת העשרה שאושרה: מוריד תמונות לאחסון ומעדכן תיאור/מקור/מחיר (אם המנהל אישר). לא נוגע בשם/מלאי. */
export async function applyEnrichment(
  id: string,
  input: ApplyEnrichmentInput
): Promise<{ ok: boolean; images?: string[]; error?: string; warning?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  const supabase = createAdminClient();
  const product = await fetchProduct(id);

  let hosted: string[] = [];
  if (input.images.length) {
    try {
      hosted = await downloadImagesToStorage(input.images, product.sku, 6, { allowAnyHttpsHost: true });
    } catch (e) {
      console.warn('הורדת תמונות נכשלה', e);
    }
  }

  const patch: Partial<Product> = {
    enrichment_source: input.source,
    image_external: hosted.length > 0,
  };
  if (hosted.length) patch.images = hosted;
  if (input.desc_he != null) patch.desc_he = input.desc_he;
  // לא שומרים עברית בשדות ערביים
  if (input.desc_ar != null && !looksLikeHebrew(input.desc_ar)) patch.desc_ar = input.desc_ar;
  // העשרה חדשה חייבת להופיע גם בחנות הערבית. אם לא הגיע תרגום מהספק,
  // מתרגמים את התיאור והפרטים הקיימים בעברית אוטומטית.
  if (input.desc_he && (!input.desc_ar || looksLikeHebrew(input.desc_ar)) && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
    const desc_ar = await translateToArabic(input.desc_he);
    if (desc_ar) patch.desc_ar = desc_ar;
  }
  if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
    const name_ar = await translateNameToArabic(product.name_he);
    if (name_ar) patch.name_ar = name_ar;
  }
  if (product.category_he && (!product.category_ar || looksLikeHebrew(product.category_ar))) {
    const category_ar = await translateCategoryToArabic(product.category_he);
    if (category_ar) patch.category_ar = category_ar;
  }
  // שומרים את קישור הספק שנעשה בו שימוש, כדי ש"עדכן מהמקור" יעבוד בעתיד
  if (input.source_url) {
    try {
      patch.source_url = sanitizeSourceUrl(normalizeProductUrl(input.source_url));
    } catch (e) {
      const msg = e instanceof UrlValidationError ? e.message : 'קישור מקור לא תקין';
      return { ok: false, error: msg };
    }
  }
  // name_ar נשמר רק אם ריק/עברי כרגע, ורק אם הטיוטה באמת ערבית
  if (input.name_ar && !looksLikeHebrew(input.name_ar) && (!product.name_ar || looksLikeHebrew(product.name_ar))) {
    patch.name_ar = input.name_ar;
  }
  // ברקוד: שדה נפרד מהתיאור — מתעדכן אם המנהל מסר ערך (כולל ריקון מכוון)
  if (input.barcode !== undefined) patch.barcode = input.barcode || null;
  // מחיר: מתעדכן אם המנהל אישר ערך תקין בטופס — ואז ננעל (price_override) כדי שייבוא
  // CSV / עדכון-מהמקור עתידי לא ידרוס את מה שהמנהל קבע כאן.
  if (typeof input.price === 'number' && !isNaN(input.price) && input.price > 0) {
    patch.price = input.price;
    if (typeof input.sale_price === 'number' && !isNaN(input.sale_price) && input.sale_price > 0 && input.sale_price < input.price) {
      patch.sale_price = input.sale_price;
      patch.on_sale = true;
    } else {
      patch.sale_price = null;
      patch.on_sale = false;
    }
    if (input.price !== product.price || input.sale_price !== product.sale_price) {
      patch.price_override = true;
    }
  }

  const res = await safeUpdate(patch as Record<string, unknown>, (p) =>
    supabase.from('products').update(p).eq('id', id)
  );
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath('/');
  revalidatePath('/admin/products');
  return { ok: true, images: hosted, warning: res.warning };
}

export interface BulkEnrichStatus {
  id: string;
  found: boolean;
  source: EnrichmentSource;
  images: number;
}

/**
 * העשרת אצווה: לכל id — העשרה ושמירה כטיוטה (בלי פרסום).
 * השהיה קטנה בין קריאות (rate limit) לכל מוצר עם source_url.
 */
export async function bulkEnrichBatch(ids: string[]): Promise<{ ok: boolean; statuses: BulkEnrichStatus[]; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, statuses: [], error: DEMO };
  if (ids.length > MAX_BULK_BATCH) {
    return { ok: false, statuses: [], error: `מקסימום ${MAX_BULK_BATCH} מוצרים בכל אצווה.` };
  }
  const supabase = createAdminClient();
  const statuses: BulkEnrichStatus[] = [];

  for (const id of ids) {
    try {
      const product = await fetchProduct(id);
      const result = await enrichProduct(product);
      const hasPrice = typeof result.price === 'number' && result.price > 0;

      if (result.found && (result.images.length || result.desc_he || hasPrice)) {
        let hosted: string[] = [];
        if (result.images.length) hosted = await downloadImagesToStorage(result.images, product.sku, 6, { allowAnyHttpsHost: true });
        const patch: Partial<Product> = {
          enrichment_source: result.source,
          image_external: hosted.length > 0,
        };
        if (hosted.length) patch.images = hosted;
        if (result.desc_he && !product.desc_he) patch.desc_he = result.desc_he;
        if (result.desc_ar_draft && !looksLikeHebrew(result.desc_ar_draft) && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
          patch.desc_ar = result.desc_ar_draft;
        }
        if (result.desc_he && !result.desc_ar_draft && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
          const desc_ar = await translateToArabic(result.desc_he);
          if (desc_ar) patch.desc_ar = desc_ar;
        }
        if (result.name_ar_draft && !looksLikeHebrew(result.name_ar_draft) && (!product.name_ar || looksLikeHebrew(product.name_ar))) {
          patch.name_ar = result.name_ar_draft;
        }
        if (!patch.name_ar && (!product.name_ar || looksLikeHebrew(product.name_ar))) {
          const name_ar = await translateNameToArabic(product.name_he);
          if (name_ar) patch.name_ar = name_ar;
        }
        if (product.category_he && (!product.category_ar || looksLikeHebrew(product.category_ar))) {
          const category_ar = await translateCategoryToArabic(product.category_he);
          if (category_ar) patch.category_ar = category_ar;
        }
        if (result.barcode && !product.barcode) patch.barcode = result.barcode;
        if (result.source_url && !product.source_url) {
          try {
            patch.source_url = sanitizeSourceUrl(normalizeProductUrl(result.source_url));
          } catch {
            /* URL לא תקין — לא שומרים */
          }
        }
        // מחיר: מתעדכן אוטומטית מהספק, חוץ אם המנהל נעל אותו ידנית (price_override)
        if (hasPrice && !product.price_override) {
          patch.price = result.price!;
          if (result.on_sale && result.sale_price != null && result.sale_price < result.price!) {
            patch.sale_price = result.sale_price;
            patch.on_sale = true;
          } else {
            patch.sale_price = null;
            patch.on_sale = false;
          }
        }
        await safeUpdate(patch as Record<string, unknown>, (p) =>
          supabase.from('products').update(p).eq('id', id)
        );
        statuses.push({ id, found: true, source: result.source, images: hosted.length });
      } else {
        await supabase.from('products').update({ enrichment_source: 'none' }).eq('id', id);
        statuses.push({ id, found: false, source: 'none', images: 0 });
      }
    } catch (e) {
      console.warn('העשרת אצווה נכשלה עבור', id, e);
      statuses.push({ id, found: false, source: 'none', images: 0 });
    }
    await new Promise((r) => setTimeout(r, 350)); // rate limit
  }

  revalidatePath('/admin/products');
  return { ok: true, statuses };
}
