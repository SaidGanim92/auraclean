/**
 * תיקון העשרה — מוצרי סנונית (snonitshop.co.il)
 * הרצה: npx tsx --env-file=.env.local scripts/fix-snunit-fabric.ts
 */
import { createClient } from '@supabase/supabase-js';
import { parseGenericRetail } from '../lib/suppliers/generic-retail';
import { validateImageUrl } from '../lib/security/url-validator';
import { translateProductName } from '../lib/translate/product-he-ar';
import { freeTranslateHeAr } from '../lib/translate/free-google';
import { looksLikeHebrew } from '../lib/lang-detect';

const BUCKET = 'product-images';

/** מק"ט → קישור רשמי בסנונית */
const SNUNIT_URLS: Record<string, string> = {
  '7290019261582': 'https://snonitshop.co.il/product/fabric-perfume-perfect/',
  '7290018936757': 'https://snonitshop.co.il/product/400-%d7%9e%d7%9c-%d7%9e%d7%91%d7%a9%d7%9d-%d7%91%d7%93%d7%99%d7%9d-%d7%91%d7%a0%d7%99%d7%97%d7%95%d7%97-%d7%a4%d7%a8%d7%97%d7%99-%d7%90%d7%91%d7%99%d7%91-%d7%9e%d7%a8%d7%95%d7%9b%d7%96-%d7%91%d7%9e/',
  '7290019261131': 'https://snonitshop.co.il/product/%d7%9e%d7%91%d7%a9%d7%9d-%d7%91%d7%93%d7%99%d7%9d-%d7%9c%d7%92%d7%95%d7%a0%d7%94-%d7%9e%d7%a8%d7%95%d7%9b%d7%96-%d7%91%d7%9e%d7%99%d7%95%d7%97%d7%93-750-%d7%9e%d7%9c/',
  '7290019261032': 'https://snonitshop.co.il/product/%d7%9e%d7%91%d7%a9%d7%9d-%d7%91%d7%93%d7%99%d7%9d-%d7%94%d7%95%d7%98%d7%9c-%d7%9e%d7%a8%d7%95%d7%9b%d7%96-%d7%91%d7%9e%d7%99%d7%95%d7%97%d7%93-750-%d7%9e%d7%9c/',
  '7290019261537': 'https://snonitshop.co.il/product/%d7%9e%d7%91%d7%a9%d7%9d-%d7%91%d7%93%d7%99%d7%9d-%d7%92%d7%95%d7%9c%d7%93-%d7%9e%d7%a8%d7%95%d7%9b%d7%96-%d7%91%d7%9e%d7%99%d7%95%d7%97%d7%93-750-%d7%9e%d7%9c/',
  '7290018936252': 'https://snonitshop.co.il/product/1-%D7%9C%D7%99%D7%98%D7%A8-%D7%9E%D7%95%D7%9C%D7%98%D7%99-%D7%A7%D7%9C%D7%99%D7%A0%D7%A8-%D7%9C%D7%A0%D7%99%D7%A7%D7%95%D7%99-%D7%95%D7%94%D7%A1%D7%A8%D7%AA-%D7%9B%D7%AA%D7%9E%D7%99%D7%9D-%D7%9E%D7%A8/',
  '7290018936955': 'https://snonitshop.co.il/product/1-%D7%9C%D7%99%D7%98%D7%A8-%D7%A1%D7%95%D7%A4%D7%A8-%D7%A7%D7%9C%D7%99%D7%A0%D7%A8-%D7%9C%D7%A0%D7%99%D7%A7%D7%95%D7%99-%D7%95%D7%94%D7%A1%D7%A8%D7%AA-%D7%90%D7%91%D7%A0%D7%99%D7%AA-%D7%9E%D7%9E%D7%A7/',
  '7290019261575': 'https://snonitshop.co.il/product/winddow-cleaner/',
};

async function downloadImages(
  supabase: ReturnType<typeof createClient>,
  imageUrls: string[],
  sku: string
): Promise<string[]> {
  const out: string[] = [];
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  for (let i = 0; i < imageUrls.length && out.length < 6; i++) {
    try {
      const src = validateImageUrl(imageUrls[i]);
      const res = await fetch(src, { headers: { accept: 'image/*' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = src.match(/\.(jpe?g|png|webp|gif)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
      const path = `${safeSku}/snunit-${Date.now()}-${i}.${ext}`;
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const [sku, sourceUrl] of Object.entries(SNUNIT_URLS)) {
    process.stdout.write(`${sku}… `);
    const scraped = await parseGenericRetail(sourceUrl);
    if (!scraped.image_urls.length) {
      console.log('אין תמונה');
      continue;
    }

    const { data: product } = await supabase.from('products').select('id,name_he,name_ar,desc_ar').eq('sku', sku).maybeSingle();
    if (!product) {
      console.log('מוצר לא נמצא במסד');
      continue;
    }

    const hosted = await downloadImages(supabase, scraped.image_urls, sku);
    const patch: Record<string, unknown> = {
      images: hosted.length ? hosted : scraped.image_urls,
      desc_he: scraped.desc_he,
      source_url: sourceUrl,
      enrichment_source: 'supplier',
      image_external: true,
    };
    if (scraped.desc_he && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
      const desc_ar = await freeTranslateHeAr(scraped.desc_he);
      if (desc_ar) patch.desc_ar = desc_ar;
    }
    if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
      const name_ar = await translateProductName(product.name_he, freeTranslateHeAr);
      if (name_ar) patch.name_ar = name_ar;
    }

    const { error } = await supabase.from('products').update(patch).eq('id', product.id);
    if (error) console.log('שגיאה:', error.message);
    else console.log(`✓ ${hosted.length} תמונות מסנונית`);
  }

  console.log('\nהושלם');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
