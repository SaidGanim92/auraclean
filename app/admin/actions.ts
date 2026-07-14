'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { downloadImagesToStorage } from '@/lib/images.server';
import { getSourceDiff, type SourceDiff } from '@/lib/import.server';
import { safeUpdate, safeInsert } from '@/lib/db-patch.server';
import { pickEditableFields, pickSourcePatchFields } from '@/lib/security/field-allowlist';
import { sanitizeSourceUrl, sanitizeStoredImages, sanitizeDownloadImageUrls } from '@/lib/security/sanitize-product';
import { validatePublicHttpsUrl, UrlValidationError } from '@/lib/security/url-validator';
import { scrapeProductPage } from '@/lib/suppliers';
import { normalizeProductUrl } from '@/lib/url-utils';
import { looksLikeBarcode } from '@/lib/suppliers/types';
import type { ImportPreview, Product } from '@/lib/types';

const DEMO_ERROR = 'מצב הדגמה: Supabase לא מחובר — אין שמירה בפועל. מלא את .env.local.';
const MAX_PRODUCT_IMAGES = 6;

async function guard() {
  if (!(await isAdminRequest())) throw new Error('לא מורשה');
}

/** שמירה/פרסום מוצר מתוך תצוגת הייבוא — מאמת מחדש מול המקור בשרת */
export async function saveProductFromImport(
  preview: ImportPreview & { price: number; sale_price: number | null; published: boolean; featured: boolean; unit: string | null }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };
  const supabase = createAdminClient();

  if (!preview.source_url?.trim()) {
    return { ok: false, error: 'חסר קישור מקור — לא ניתן לאמת את המוצר בשרת' };
  }

  let scraped;
  try {
    const sourceUrl = sanitizeSourceUrl(normalizeProductUrl(preview.source_url))!;
    scraped = await scrapeProductPage(sourceUrl);
  } catch (e) {
    const msg = e instanceof UrlValidationError ? e.message : e instanceof Error ? e.message : 'שגיאה בשליפה מהמקור';
    return { ok: false, error: msg };
  }

  const sku = (preview.sku || scraped.sku || '').trim();
  if (!sku) return { ok: false, error: 'חסר מק״ט למוצר' };

  let images: string[] = [];
  try {
    const imageUrls = sanitizeDownloadImageUrls(
      scraped.image_urls?.length ? scraped.image_urls : preview.image_urls || []
    );
    images = await downloadImagesToStorage(imageUrls, sku, 6, { allowAnyHttpsHost: true });
  } catch (e) {
    console.warn('הורדת תמונות נכשלה חלקית', e);
  }

  const price = typeof preview.price === 'number' && preview.price >= 0 ? preview.price : scraped.price;
  const row = {
    sku,
    source_url: scraped.source_url,
    supplier: scraped.supplier,
    name_he: preview.name_he?.trim() || scraped.name_he,
    name_ar: preview.name_ar || null,
    category_he: preview.category_he ?? scraped.category_he,
    category_ar: preview.category_ar || null,
    price,
    sale_price: preview.sale_price,
    on_sale: preview.on_sale,
    desc_he: preview.desc_he ?? scraped.desc_he,
    desc_ar: preview.desc_ar || null,
    images,
    available: preview.available,
    unit: preview.unit,
    featured: preview.featured,
    published: preview.published,
  };

  // upsert לפי sku (אם קיים — עדכון; אילוץ ייחודי מונע כפילות)
  const { data, error } = await supabase
    .from('products')
    .upsert(row, { onConflict: 'sku' })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/admin/products');
  return { ok: true, id: data?.id };
}

/** עדכון שדות של מוצר קיים (עריכה / החלפת דגלים) */
export async function updateProductFields(
  id: string,
  patch: Partial<Product>
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };
  const supabase = createAdminClient();
  const allowed = pickEditableFields(patch);
  if (!Object.keys(allowed).length) return { ok: false, error: 'אין שדות לעדכון' };

  if (allowed.sku !== undefined) {
    const skuCheck = await validateProductSku(supabase, id, String(allowed.sku ?? ''));
    if (!skuCheck.ok) return { ok: false, error: skuCheck.error };
    allowed.sku = skuCheck.sku;
  }

  if (allowed.source_url !== undefined) {
    try {
      allowed.source_url = sanitizeSourceUrl(
        allowed.source_url ? normalizeProductUrl(String(allowed.source_url)) : null
      );
    } catch (e) {
      const msg = e instanceof UrlValidationError ? e.message : 'קישור מקור לא תקין';
      return { ok: false, error: msg };
    }
  }

  if (allowed.images !== undefined) {
    try {
      allowed.images = sanitizeStoredImages(allowed.images as string[]);
    } catch (e) {
      const msg = e instanceof UrlValidationError ? e.message : 'רשימת תמונות לא תקינה';
      return { ok: false, error: msg };
    }
  }

  const res = await safeUpdate(allowed as Record<string, unknown>, (p) =>
    supabase.from('products').update(p).eq('id', id)
  );
  if (!res.ok) {
    const msg = res.error || '';
    if (/duplicate|unique|products_sku_key/i.test(msg)) {
      return { ok: false, error: 'מק״ט זה כבר קיים אצל מוצר אחר' };
    }
    return { ok: false, error: res.error };
  }
  revalidatePath('/');
  revalidatePath('/admin/products');
  return { ok: true, warning: res.warning };
}

/** מחיקת מוצר */
export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  revalidatePath('/admin/products');
  return { ok: true };
}

/** משיכה מחדש מ-source_url והחזרת הפרשים לאישור (לא מעדכן עדיין) */
export async function fetchSourceDiff(
  id: string
): Promise<{ ok: boolean; diff?: SourceDiff; error?: string }> {
  await guard();
  try {
    const diff = await getSourceDiff(id);
    return { ok: true, diff };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'שגיאה' };
  }
}

/** החלת פרשי-המקור שאושרו על המוצר */
export async function applySourcePatch(
  id: string,
  patch: Partial<Product>
): Promise<{ ok: boolean; error?: string }> {
  return updateProductFields(id, pickSourcePatchFields(patch));
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function validateProductSku(
  supabase: AdminClient,
  id: string,
  raw: string
): Promise<{ ok: true; sku: string } | { ok: false; error: string }> {
  const sku = raw.trim();
  if (!sku) return { ok: false, error: 'מק״ט לא יכול להיות ריק' };
  const { data } = await supabase.from('products').select('id').eq('sku', sku).neq('id', id).maybeSingle();
  if (data) return { ok: false, error: 'מק״ט זה כבר קיים אצל מוצר אחר' };
  return { ok: true, sku };
}

function parseImageUrlInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isHostedStorageUrl(url: string): boolean {
  try {
    return /\.supabase\.(co|in)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** הוספת תמונות למוצר מקישורי HTTPS — מוריד לאחסון שלנו (או מצרף ישירות אם כבר באחסון) */
export async function addProductImagesFromUrls(
  id: string,
  rawUrls: string
): Promise<{ ok: boolean; images?: string[]; added?: number; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };

  const urls = parseImageUrlInput(rawUrls);
  if (!urls.length) return { ok: false, error: 'הדבק לפחות קישור תמונה אחד' };

  const supabase = createAdminClient();
  const { data, error: fetchErr } = await supabase.from('products').select('*').eq('id', id).single();
  if (fetchErr || !data) return { ok: false, error: 'המוצר לא נמצא' };
  const product = data as Product;

  const existing = product.images || [];
  const room = MAX_PRODUCT_IMAGES - existing.length;
  if (room <= 0) return { ok: false, error: `מקסימום ${MAX_PRODUCT_IMAGES} תמונות למוצר` };

  const direct: string[] = [];
  const external: string[] = [];
  for (const raw of urls) {
    if (direct.length + external.length >= room) break;
    try {
      const safe = validatePublicHttpsUrl(raw);
      if (existing.includes(safe) || direct.includes(safe)) continue;
      if (isHostedStorageUrl(safe)) direct.push(safe);
      else external.push(safe);
    } catch (err) {
      const msg = err instanceof UrlValidationError ? err.message : 'כתובת תמונה לא תקינה';
      return { ok: false, error: `${msg}: ${raw.slice(0, 80)}` };
    }
  }

  if (!direct.length && !external.length) {
    return { ok: false, error: 'אין תמונות חדשות להוספה (ייתכן שהקישורים כבר קיימים)' };
  }

  const downloaded = external.length
    ? await downloadImagesToStorage(external, product.sku, room - direct.length, { allowAnyHttpsHost: true })
    : [];

  const merged = [...existing];
  for (const url of [...direct, ...downloaded]) {
    if (!merged.includes(url) && merged.length < MAX_PRODUCT_IMAGES) merged.push(url);
  }

  if (merged.length === existing.length) {
    return { ok: false, error: 'לא הצלחנו להוסיף תמונות — ודא שהקישורים נגישים ובפורמט JPG/PNG/WebP' };
  }

  const patch: Partial<Product> = {
    images: merged,
    image_external: downloaded.length > 0 || !!product.image_external,
  };
  const res = await safeUpdate(patch as Record<string, unknown>, (p) =>
    supabase.from('products').update(p).eq('id', id)
  );
  if (!res.ok) return { ok: false, error: res.error };

  revalidatePath('/');
  revalidatePath('/admin/products');
  revalidatePath('/product/' + id);
  return { ok: true, images: merged, added: merged.length - existing.length };
}

/** עדכון ברקוד בלבד — עם אימות בסיסי */
export async function updateProductBarcode(
  id: string,
  barcode: string | null
): Promise<{ ok: boolean; barcode?: string | null; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };

  const trimmed = barcode?.trim() || '';
  if (trimmed && !looksLikeBarcode(trimmed)) {
    return { ok: false, error: 'ברקוד לא תקין — 8–14 ספרות בלבד' };
  }

  const value = trimmed || null;
  const res = await updateProductFields(id, { barcode: value });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, barcode: value };
}

/** עדכון מק״ט בלבד — עם בדיקת ייחודיות */
export async function updateProductSku(
  id: string,
  sku: string
): Promise<{ ok: boolean; sku?: string; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };

  const res = await updateProductFields(id, { sku });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, sku: sku.trim() };
}

/** יצירת מוצר ריק חדש (טיוטה) לעריכה */
export async function createEmptyProduct(): Promise<{ ok: boolean; product?: Product; error?: string; warning?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO_ERROR };

  const supabase = createAdminClient();
  const sku = `new-${Date.now()}`;
  const row = {
    sku,
    name_he: 'מוצר חדש',
    price: 0,
    published: false,
    available: true,
    on_sale: false,
    featured: false,
    images: [] as string[],
    supplier: 'manual' as const,
    enrichment_source: 'none' as const,
    image_external: false,
    price_override: false,
  };

  const res = await safeInsert<Product>(row, (r) =>
    supabase.from('products').insert(r).select('*').single()
  );
  if (!res.ok) return { ok: false, error: res.error };

  const product = {
    ...(res.data as Product),
    price_override: (res.data as Product).price_override ?? false,
    barcode: (res.data as Product).barcode ?? null,
  };

  revalidatePath('/');
  revalidatePath('/admin/products');
  return { ok: true, product, warning: res.warning };
}
