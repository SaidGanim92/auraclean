/**
 * בדיקת קטגוריות במוצרים מפורסמים
 */
import { createClient } from '@supabase/supabase-js';
import { looksLikeHebrew } from '../lib/lang-detect';
import { pCat, catKey } from '../lib/product';
import type { Product } from '../lib/types';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = createClient(url!, key!, { auth: { persistSession: false } });
  const { data } = await sb.from('products').select('*').eq('published', true);
  const products = (data || []) as Product[];

  const cats = new Map<string, Product>();
  for (const p of products) {
    const k = catKey(p);
    if (k && !cats.has(k)) cats.set(k, p);
  }

  console.log('מפורסמים:', products.length, 'קטגוריות:', cats.size);
  for (const [k, p] of cats) {
    const labelHe = pCat(p, 'he');
    const labelAr = pCat(p, 'ar');
    const bad = !labelAr.trim();
    console.log(`${bad ? '✗' : '✓'} key="${k}" | he="${labelHe}" | ar="${labelAr}" | category_he="${p.category_he}" | category_ar="${p.category_ar}"`);
  }

  const badProducts = products.filter((p) => {
    const k = catKey(p);
    if (!k) return false;
    return !pCat(p, 'ar').trim();
  });
  if (badProducts.length) {
    console.log('\nמוצרים עם תווית ערבית ריקה:');
    badProducts.forEach((p) => console.log(p.sku, p.name_he, '|', p.category_he, '|', p.category_ar));
  }
}

main();
