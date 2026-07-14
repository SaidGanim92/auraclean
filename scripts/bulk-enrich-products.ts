/**
 * העשרה אוטומטית למוצרים חסרי תמונה — חיפוש לפי שם+ברקוד וגריפה מספק.
 * הרצה: npx tsx --env-file=.env.local scripts/bulk-enrich-products.ts [--limit=N] [--sku=729...]
 */
import { createClient } from '@supabase/supabase-js';
import { enrichProduct } from '../lib/enrich.server';
import { looksLikeHebrew } from '../lib/lang-detect';
import { translateProductName, translateCategoryName } from '../lib/translate/product-he-ar';
import type { Product } from '../lib/types';
import { validateImageUrl } from '../lib/security/url-validator';

const BUCKET = 'product-images';

function parseArgs() {
  const all = process.argv.includes('--all');
  const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] || (all ? '9999' : '50'));
  const sku = process.argv.find((a) => a.startsWith('--sku='))?.split('=')[1];
  return { limit, sku, all };
}

async function downloadImages(
  supabase: ReturnType<typeof createClient>,
  imageUrls: string[],
  sku: string
): Promise<string[]> {
  const out: string[] = [];
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'item';
  for (let i = 0; i < imageUrls.length && out.length < 6; i++) {
    try {
      const src = validateImageUrl(imageUrls[i]);
      const res = await fetch(src, { headers: { accept: 'image/*' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) continue;
      const ext = src.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
      const path = `${safeSku}/${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType: res.headers.get('content-type') || `image/${ext}`,
        upsert: true,
      });
      if (error) continue;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) out.push(data.publicUrl);
    } catch { /* skip */ }
  }
  return out;
}

async function main() {
  const { limit, sku, all } = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  let query = supabase.from('products').select('*').order('name_he');
  if (sku) {
    query = query.eq('sku', sku);
  } else if (all) {
    query = query.limit(1000);
  } else {
    query = query.limit(Math.min(limit * 3, 600));
  }
  const { data, error } = await query;
  if (error) {
    console.error('שגיאת קריאה:', error.message);
    process.exit(1);
  }

  let products = (data as Product[]).filter((p) => !p.images?.length);
  if (!sku) products = products.slice(0, limit);
  console.log(`מוצרים לעיבוד: ${products.length}`);

  let found = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    process.stdout.write(`[${i + 1}/${products.length}] ${product.sku} ${product.name_he.slice(0, 40)}… `);

    try {
      const result = await enrichProduct(product);
      const hasData = result.found && (result.images.length || result.desc_he);
      if (!hasData) {
        console.log('לא נמצא');
        failed++;
        await supabase.from('products').update({ enrichment_source: 'none' }).eq('id', product.id);
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      let hosted: string[] = [];
      if (result.images.length) hosted = await downloadImages(supabase as Parameters<typeof downloadImages>[0], result.images, product.sku);

      const patch: Record<string, unknown> = {
        enrichment_source: result.source,
        image_external: hosted.length > 0,
      };
      if (hosted.length) patch.images = hosted;
      if (result.desc_he && !product.desc_he) patch.desc_he = result.desc_he;
      if (result.desc_he && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
        const desc_ar = result.desc_ar_draft && !looksLikeHebrew(result.desc_ar_draft)
          ? result.desc_ar_draft
          : '';
        if (desc_ar) patch.desc_ar = desc_ar;
      }
      if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
        const name_ar = result.name_ar_draft && !looksLikeHebrew(result.name_ar_draft)
          ? result.name_ar_draft
          : await translateProductName(product.name_he, async () => '');
        if (name_ar) patch.name_ar = name_ar;
      }
      if (product.category_he && (!product.category_ar || looksLikeHebrew(product.category_ar))) {
        const category_ar = await translateCategoryName(product.category_he, async () => '');
        if (category_ar) patch.category_ar = category_ar;
      }
      if (result.source_url && !product.source_url) patch.source_url = result.source_url;

      const { error: upErr } = await supabase.from('products').update(patch).eq('id', product.id);
      if (upErr) {
        console.log('שגיאת שמירה:', upErr.message);
        failed++;
      } else {
        console.log(`✓ תמונות:${hosted.length} מקור:${result.source_url?.slice(0, 40) || '—'}`);
        found++;
      }
    } catch (e) {
      console.log('שגיאה:', e instanceof Error ? e.message : e);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n--- סיכום ---\nהועשרו: ${found}\nלא נמצאו: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
