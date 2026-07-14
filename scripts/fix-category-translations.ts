/**
 * תיקון תרגום קטגוריות לערבית — מילון קבוע + תיקון שדות הפוכים.
 * הרצה: npx tsx --env-file=.env.local scripts/fix-category-translations.ts
 */
import { createClient } from '@supabase/supabase-js';
import { categoryArabic, normalizeCategoryHe, resolveCategoryHe } from '../lib/category-ar';
import { looksLikeHebrew } from '../lib/lang-detect';
import type { Product } from '../lib/types';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.from('products').select('id,sku,category_he,category_ar');
  if (error) throw error;

  let updated = 0;
  for (const row of data || []) {
    const p = row as Pick<Product, 'id' | 'sku' | 'category_he' | 'category_ar'>;
    const he = resolveCategoryHe(p.category_he, p.category_ar);
    if (!he) continue;

    const patch: { category_he?: string; category_ar?: string } = {};
    const rawHe = (p.category_he || '').trim();
    if (
      !rawHe ||
      normalizeCategoryHe(rawHe) !== rawHe ||
      (looksLikeHebrew(p.category_ar) && p.category_ar?.trim() === he)
    ) {
      patch.category_he = he;
    }

    const targetAr = categoryArabic(he);
    const curAr = (p.category_ar || '').trim();
    const needsAr =
      !curAr ||
      looksLikeHebrew(curAr) ||
      (targetAr && curAr !== targetAr);

    if (targetAr && needsAr) patch.category_ar = targetAr;

    if (!Object.keys(patch).length) continue;

    const { error: upErr } = await sb.from('products').update(patch).eq('id', p.id);
    if (upErr) {
      console.error('שגיאה', p.sku, upErr.message);
      continue;
    }
    updated++;
    console.log(`✓ ${p.sku} | ${he} → ${patch.category_ar || curAr}`);
  }

  console.log(`\nעודכנו ${updated} מוצרים.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
