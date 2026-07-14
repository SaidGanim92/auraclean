/**
 * תיקון תמונות מוצרי טירולר — מקור ראשון: tyroler.co.il, נפילה לחיפוש באתרים ישראליים.
 * הרצה: npx tsx --env-file=.env.local scripts/fix-tyroler-products.ts
 */
import { createClient } from '@supabase/supabase-js';
import { scrapeFromUrl } from '../lib/suppliers';
import { discoverProductUrl } from '../lib/product-discovery.server';
import { validateImageUrl } from '../lib/security/url-validator';
import { translateProductName } from '../lib/translate/product-he-ar';
import { freeTranslateHeAr } from '../lib/translate/free-google';
import { looksLikeHebrew } from '../lib/lang-detect';
import type { Product } from '../lib/types';

const BUCKET = 'product-images';

/** מק"ט → קישור רשמי בטירולר (מותאם לפי שם המוצר) */
const TYROLER_URLS: Record<string, string> = {
  '7290005902185': 'https://www.tyroler.co.il/product/magic-dustpan/',
  '7290005902475': 'https://www.tyroler.co.il/product/mop/',
  '7290005902437': 'https://www.tyroler.co.il/product/knuckle-broom/',
  '729000590286': 'https://www.tyroler.co.il/product/mop-replacement/',
  '7290005902543': 'https://www.tyroler.co.il/product/microfiber-cloth/',
  '7290005902277': 'https://www.tyroler.co.il/product/patented-high-window-cleaner/',
  '7290005902420': 'https://www.tyroler.co.il/product/knuckle-joint-squeegee/',
  '7290005902499': 'https://www.tyroler.co.il/product/pushpull-squeegee/',
  '111': 'https://www.tyroler.co.il/product/flexible-squeegee/',
  '222': 'https://www.tyroler.co.il/product/flexible-squeegee/',
  '7290005902802': 'https://www.tyroler.co.il/product/squeegee-xl/',
  '7290005902260': 'https://www.tyroler.co.il/product/counter-squeegee/',
};

async function downloadImages(
  supabase: ReturnType<typeof createClient>,
  imageUrls: string[],
  sku: string
): Promise<string[]> {
  const out: string[] = [];
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'tyroler';
  for (let i = 0; i < imageUrls.length && out.length < 6; i++) {
    try {
      const src = validateImageUrl(imageUrls[i]);
      const res = await fetch(src, { headers: { accept: 'image/*' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) continue;
      const ext = src.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
      const path = `${safeSku}/tyroler-${Date.now()}-${i}.${ext}`;
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

async function scrapeWithFallback(product: Product, primaryUrl: string) {
  try {
    const scraped = await scrapeFromUrl(primaryUrl);
    if (scraped.image_urls.length) return { scraped, sourceUrl: primaryUrl };
  } catch { /* try discovery */ }

  try {
    const hit = await discoverProductUrl(product);
    if (hit) {
      const scraped = await scrapeFromUrl(hit.url);
      if (scraped.image_urls.length) return { scraped, sourceUrl: hit.url };
    }
  } catch { /* none */ }

  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const skus = Object.keys(TYROLER_URLS);
  const { data: products, error } = await supabase.from('products').select('*').in('sku', skus);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;

  for (const sku of skus) {
    const product = (products as Product[] | null)?.find((p) => p.sku === sku);
    if (!product) {
      console.log(`${sku}… מוצר לא נמצא`);
      fail++;
      continue;
    }

    process.stdout.write(`${sku} ${product.name_he.slice(0, 30)}… `);
    const hit = await scrapeWithFallback(product, TYROLER_URLS[sku]);
    if (!hit?.scraped.image_urls.length) {
      console.log('לא נמצאה תמונה');
      fail++;
      continue;
    }

    const hosted = await downloadImages(supabase, hit.scraped.image_urls, sku);
    if (!hosted.length) {
      console.log('הורדת תמונה נכשלה');
      fail++;
      continue;
    }

    const patch: Record<string, unknown> = {
      images: hosted,
      source_url: hit.sourceUrl,
      supplier: 'tyroler',
      enrichment_source: 'supplier',
      image_external: true,
    };
    if (hit.scraped.desc_he) patch.desc_he = hit.scraped.desc_he;
    if (hit.scraped.desc_he && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
      const desc_ar = await freeTranslateHeAr(hit.scraped.desc_he);
      if (desc_ar) patch.desc_ar = desc_ar;
    }
    if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
      const name_ar = await translateProductName(product.name_he, freeTranslateHeAr);
      if (name_ar) patch.name_ar = name_ar;
    }

    const { error: upErr } = await supabase.from('products').update(patch).eq('id', product.id);
    if (upErr) {
      console.log('שגיאה:', upErr.message);
      fail++;
    } else {
      const host = new URL(hit.sourceUrl).hostname;
      console.log(`✓ ${hosted.length} תמונות מ-${host}`);
      ok++;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n--- סיכום ---\nעודכנו: ${ok}\nנכשלו: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
