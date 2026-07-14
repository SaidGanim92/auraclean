import 'server-only';
import { scrapeProductPage } from '@/lib/suppliers';
import { translateFields } from '@/lib/translate';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ImportPreview, Product } from '@/lib/types';

/**
 * בונה תצוגה מקדימה לייבוא: גריפה → תרגום HE→AR (טיוטה) → בדיקת כפילות לפי sku.
 * זהו הליבה המשותפת לנתיב /api/admin/import ולעדכון-מהמקור.
 */
export async function buildImportPreview(url: string): Promise<ImportPreview> {
  const scraped = await scrapeProductPage(url);

  // תרגום אוטומטי (טיוטה לעריכה)
  const ar = await translateFields({
    name_ar: scraped.name_he,
    category_ar: scraped.category_he,
    desc_ar: scraped.desc_he,
  });

  // בדיקת כפילות לפי sku
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('sku', scraped.sku)
    .maybeSingle();

  return {
    ...scraped,
    name_ar: ar.name_ar,
    category_ar: ar.category_ar || null,
    desc_ar: ar.desc_ar || null,
    duplicate_of: existing?.id || null,
  };
}

export interface SourceDiff {
  product: Product;
  changes: { field: string; from: unknown; to: unknown }[];
  scrapedPatch: Partial<Product>;
}

/** משיכה מחדש מ-source_url והשוואה למה שקיים במסד (לפני אישור עדכון) */
export async function getSourceDiff(id: string): Promise<SourceDiff> {
  const supabase = createAdminClient();
  const { data: product, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error || !product) throw new Error('המוצר לא נמצא');
  if (!product.source_url) throw new Error('למוצר אין קישור מקור לעדכון');

  const scraped = await scrapeProductPage(product.source_url);

  // שדות להשוואה (רק מה שמגיע מהספק — מחיר/מלאי/מבצע/תיאור/שם)
  // מחיר מדולג אם המנהל נעל אותו ידנית (price_override) — לא מציעים לדרוס אותו.
  const scrapedPatch: Partial<Product> = {
    name_he: scraped.name_he,
    available: scraped.available,
    desc_he: scraped.desc_he,
  };
  if (!product.price_override) {
    scrapedPatch.price = scraped.price;
    scrapedPatch.sale_price = scraped.sale_price;
    scrapedPatch.on_sale = scraped.on_sale;
  }

  const changes: SourceDiff['changes'] = [];
  (Object.keys(scrapedPatch) as (keyof Product)[]).forEach((k) => {
    const to = (scrapedPatch as any)[k];
    const from = (product as any)[k];
    if (String(from ?? '') !== String(to ?? '')) changes.push({ field: k as string, from, to });
  });

  return { product: product as Product, changes, scrapedPatch };
}
