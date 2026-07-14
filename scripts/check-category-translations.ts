/**
 * בדיקת קטגוריות חסרות תרגום ערבי
 * npx tsx --env-file=.env.local scripts/check-category-translations.ts
 */
import { createClient } from '@supabase/supabase-js';
import { looksLikeHebrew } from '../lib/lang-detect';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.from('products').select('sku,category_he,category_ar,published');
  if (error) throw error;

  const cats = new Map<string, { count: number; ar: string | null; published: number }>();
  for (const p of data || []) {
    const he = (p.category_he || '').trim();
    if (!he) continue;
    const cur = cats.get(he) || { count: 0, ar: p.category_ar, published: 0 };
    cur.count++;
    if (p.published) cur.published++;
    cats.set(he, cur);
  }

  console.log('קטגוריות ייחודיות:', cats.size);
  for (const [he, info] of [...cats.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const ar = (info.ar || '').trim();
    const ok = ar && !looksLikeHebrew(ar);
    const status = ok ? '✓' : '✗ חסר/עברית';
    console.log(`${status} | ${info.count} מוצרים (${info.published} מפורסמים) | ${he} → ${ar || '—'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
