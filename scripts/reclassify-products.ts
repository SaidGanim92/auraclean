/**
 * סיווג חכם של כל המוצרים לפי שם + תיאור.
 * הרצה: npx tsx --env-file=.env.local scripts/reclassify-products.ts
 * דמה:   npx tsx --env-file=.env.local scripts/reclassify-products.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { categoryArabic, normalizeCategoryHe } from '../lib/category-ar';
import { classifyProduct } from '../lib/classify-category';
import type { Product } from '../lib/types';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from('products')
    .select('id,sku,name_he,desc_he,category_he,category_ar');
  if (error) throw error;

  let updated = 0;
  let unchanged = 0;
  const changes: string[] = [];

  for (const row of data || []) {
    const p = row as Pick<Product, 'id' | 'sku' | 'name_he' | 'desc_he' | 'category_he' | 'category_ar'>;
    const { category, confidence } = classifyProduct({
      name_he: p.name_he,
      desc_he: p.desc_he,
      category_he: p.category_he,
    });

    const cur = normalizeCategoryHe(p.category_he);
    if (cur === category) {
      unchanged++;
      continue;
    }

    const patch = {
      category_he: category,
      category_ar: categoryArabic(category),
    };

    changes.push(
      `${p.sku} | ${(p.name_he || '').slice(0, 45)} | ${cur || '—'} → ${category} (${confidence}%)`
    );

    if (!dryRun) {
      const { error: upErr } = await sb.from('products').update(patch).eq('id', p.id);
      if (upErr) {
        console.error('שגיאה', p.sku, upErr.message);
        continue;
      }
    }
    updated++;
  }

  console.log(dryRun ? '=== דמה (ללא שמירה) ===' : '=== עודכן במסד ===');
  console.log(`שונו: ${updated} | ללא שינוי: ${unchanged} | סה"כ: ${(data || []).length}\n`);
  for (const line of changes) console.log(line);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
