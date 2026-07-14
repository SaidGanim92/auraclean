'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { translateToArabic, translateNameToArabic, translateCategoryToArabic } from '@/lib/translate';
import { needsArabicTranslation } from '@/lib/lang-detect';
import type { Product } from '@/lib/types';

const DEMO = 'מצב הדגמה: Supabase לא מחובר — מלא את .env.local.';
const MAX_TRANSLATE_BATCH = 100;

async function guard() {
  if (!(await isAdminRequest())) throw new Error('לא מורשה');
}

async function fetchProduct(id: string): Promise<Product> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error || !data) throw new Error('המוצר לא נמצא');
  return data as Product;
}

/**
 * תרגום טיוטה לשדות ערביים.
 * שמות/קטגוריות: מילון מונחי ניקיון + מותגים (לא Google גולמי).
 * תיאורים: Google — רק אם חסר / עדיין בעברית.
 * forceNames=true → דורס שם/קטגוריה ערביים קיימים (לתיקון תרגומים גרועים).
 */
export async function translateProduct(
  id: string,
  opts: { forceNames?: boolean; forceContent?: boolean } = {}
): Promise<{ ok: boolean; patch?: Partial<Product>; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, error: DEMO };
  try {
    const product = await fetchProduct(id);
    const patch: Partial<Product> = {};

    if (opts.forceNames || needsArabicTranslation(product.name_he, product.name_ar)) {
      const name_ar = await translateNameToArabic(product.name_he);
      if (name_ar) patch.name_ar = name_ar;
    }
    if (product.category_he && (opts.forceNames || needsArabicTranslation(product.category_he, product.category_ar))) {
      const category_ar = await translateCategoryToArabic(product.category_he);
      if (category_ar) patch.category_ar = category_ar;
    }
    if ((opts.forceContent || needsArabicTranslation(product.desc_he, product.desc_ar)) && product.desc_he) {
      const desc_ar = await translateToArabic(product.desc_he);
      if (desc_ar) patch.desc_ar = desc_ar;
    }

    if (!Object.keys(patch).length) {
      return { ok: false, error: 'התרגום נכשל או שאין מה לעדכן.' };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/');
    revalidatePath('/admin/products');
    revalidatePath('/product/' + id);
    return { ok: true, patch };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'שגיאה' };
  }
}

export interface TranslateBatchStatus {
  id: string;
  translated: boolean;
}

/** תרגום אצווה — forceNames מתקן שמות שתורגמו גרוע */
export async function translateMissingBatch(
  ids: string[],
  opts: { forceNames?: boolean; forceContent?: boolean } = {}
): Promise<{ ok: boolean; statuses: TranslateBatchStatus[]; error?: string }> {
  await guard();
  if (!isSupabaseConfigured()) return { ok: false, statuses: [], error: DEMO };
  if (ids.length > MAX_TRANSLATE_BATCH) {
    return { ok: false, statuses: [], error: `מקסימום ${MAX_TRANSLATE_BATCH} מוצרים בכל אצווה.` };
  }
  const statuses: TranslateBatchStatus[] = [];
  for (const id of ids) {
    try {
      const res = await translateProduct(id, opts);
      statuses.push({ id, translated: !!(res.ok && res.patch && Object.keys(res.patch).length) });
    } catch {
      statuses.push({ id, translated: false });
    }
  }
  revalidatePath('/admin/products');
  return { ok: true, statuses };
}
