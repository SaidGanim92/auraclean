/**
 * תיקון מרככי כביסה — מקורות שגויים (טאצ') → סנונית / ג'ונסון קלין.
 * הרצה: npx tsx --env-file=.env.local scripts/fix-softener-products.ts
 */
import { createClient } from '@supabase/supabase-js';
import { parseGenericRetail } from '../lib/suppliers/generic-retail';
import { scrapeFromUrl } from '../lib/suppliers';
import { validateImageUrl } from '../lib/security/url-validator';
import { translateProductName } from '../lib/translate/product-he-ar';
import { freeTranslateHeAr } from '../lib/translate/free-google';
import { looksLikeHebrew } from '../lib/lang-detect';
import type { Product, ScrapedProduct } from '../lib/types';

const BUCKET = 'product-images';

const SNONIT = {
  hotel: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%94%d7%95%d7%98%d7%9c-1-%d7%9c%d7%99%d7%98%d7%a8/',
  lagoon: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%9c%d7%92%d7%95%d7%a0%d7%94-1-%d7%9c%d7%99%d7%98%d7%a8/',
  gold: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%92%d7%95%d7%9c%d7%93-1-%d7%9c%d7%99%d7%98%d7%a8/',
  master: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%9e%d7%90%d7%a1%d7%98%d7%a8-1-%d7%9c%d7%99%d7%98%d7%a8/',
  platinum: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%a4%d7%9c%d7%98%d7%99%d7%a0%d7%95%d7%9d-1-%d7%9c%d7%99%d7%98%d7%a8/',
  spring: 'https://snonitshop.co.il/product/%d7%9e%d7%a8%d7%9b%d7%9a-%d7%9b%d7%91%d7%99%d7%a1%d7%94-%d7%a4%d7%a8%d7%97%d7%99-%d7%90%d7%91%d7%99%d7%91-1-%d7%9c%d7%99%d7%98%d7%a8/',
  perfect: 'https://snonitshop.co.il/product/1-laundry-softener-perfect/',
} as const;

const JOHNSON = {
  soap: 'https://johnsonclean.co.il/products/%D7%9E%D7%A8%D7%9B%D7%9A-%D7%9B%D7%91%D7%99%D7%A1%D7%94-%D7%91%D7%95%D7%A1%D7%98%D7%A8-%D7%91%D7%A0%D7%99%D7%97%D7%95%D7%97-%D7%A1%D7%91%D7%95%D7%9F-%D7%9E%D7%A4%D7%A0%D7%A7',
  blossom:
    'https://johnsonclean.co.il/collections/my-blossom/products/my-blossom-%D7%9E%D7%A8%D7%9B%D7%9A-%D7%9B%D7%91%D7%99%D7%A1%D7%94-%D7%91%D7%95%D7%A1%D7%98%D7%A8-%D7%91%D7%A0%D7%99%D7%97%D7%95%D7%97',
} as const;

/** מק"ט → קישור (כשיש מיפוי ישיר) */
const SKU_URLS: Record<string, string> = {
  '7290019261339': SNONIT.hotel,
  '7290019261483': SNONIT.lagoon,
  '7290019261094': SNONIT.gold,
  '7290019261148': SNONIT.master,
  '7290019261049': SNONIT.platinum,
  '7290018776490': JOHNSON.soap,
  '7290019834120': JOHNSON.blossom,
  '7290019261186': SNONIT.perfect,
  '7290019261384': SNONIT.spring,
};

function resolveUrl(product: Pick<Product, 'sku' | 'name_he'>): string | null {
  if (SKU_URLS[product.sku]) return SKU_URLS[product.sku];
  const n = product.name_he || '';
  if (/הכל דבש/i.test(n)) return SNONIT.hotel;
  if (/מלא מחמאות|לגונה/i.test(n)) return SNONIT.lagoon;
  if (/חיוך גדול|גולד/i.test(n)) return SNONIT.gold;
  if (/זמן לעצמי|מאסטר/i.test(n)) return SNONIT.master;
  if (/הגעתי רחוק|פלטינום/i.test(n)) return SNONIT.platinum;
  if (/חמסה חמסה|פרחי אביב/i.test(n)) return SNONIT.spring;
  if (/שמח לי|פרפקט/i.test(n)) return SNONIT.perfect;
  if (/סבון מפנק/i.test(n)) return JOHNSON.soap;
  if (/my blossom/i.test(n)) return JOHNSON.blossom;
  return null;
}

function isWrongSoftener(p: Pick<Product, 'name_he' | 'source_url'>): boolean {
  const src = (p.source_url || '').toLowerCase();
  if (src.includes('touchonline')) return /מרכך כביס/i.test(p.name_he || '');
  return false;
}

async function scrape(url: string): Promise<ScrapedProduct> {
  if (url.includes('johnsonclean.co.il')) return scrapeFromUrl(url);
  return parseGenericRetail(url);
}

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
      const path = `${safeSku}/softener-${Date.now()}-${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
        contentType: res.headers.get('content-type') || `image/${ext}`,
        upsert: true,
      });
      if (error) continue;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (data?.publicUrl) out.push(data.publicUrl);
    } catch {
      /* skip */
    }
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
  const targetSkus = Object.keys(SKU_URLS);
  const { data: bySku } = await supabase.from('products').select('*').in('sku', targetSkus);
  const { data: wrongTouch } = await supabase
    .from('products')
    .select('*')
    .ilike('name_he', '%מרכך כביס%')
    .ilike('source_url', '%touchonline%');

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const p of [...((bySku as Product[]) || []), ...((wrongTouch as Product[]) || [])]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      products.push(p);
    }
  }

  console.log(`מרככי כביסה לתיקון: ${products.length}\n`);
  let ok = 0;
  let fail = 0;

  for (const product of products) {
    const sourceUrl = resolveUrl(product);
    if (!sourceUrl) {
      console.log(`${product.sku} ${product.name_he.slice(0, 30)}… לא נמצא מיפוי`);
      fail++;
      continue;
    }

    process.stdout.write(`${product.sku} ${product.name_he.slice(0, 28)}… `);
    let scraped: ScrapedProduct;
    try {
      scraped = await scrape(sourceUrl);
    } catch (e) {
      console.log('שגיאת שליפה:', (e as Error).message);
      fail++;
      continue;
    }

    if (!scraped.image_urls.length) {
      console.log('אין תמונה');
      fail++;
      continue;
    }

    const hosted = await downloadImages(supabase, scraped.image_urls, product.sku);
    if (!hosted.length) {
      console.log('הורדה נכשלה');
      fail++;
      continue;
    }

    const patch: Record<string, unknown> = {
      images: hosted,
      source_url: sourceUrl,
      supplier: null,
      enrichment_source: 'supplier',
      image_external: true,
    };
    if (scraped.desc_he) patch.desc_he = scraped.desc_he;
    if (scraped.desc_he && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
      const desc_ar = await freeTranslateHeAr(scraped.desc_he);
      if (desc_ar) patch.desc_ar = desc_ar;
    }
    if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
      const name_ar = await translateProductName(product.name_he, freeTranslateHeAr);
      if (name_ar) patch.name_ar = name_ar;
    }

    const { error } = await supabase.from('products').update(patch).eq('id', product.id);
    if (error) {
      console.log('שגיאה:', error.message);
      fail++;
    } else {
      const host = new URL(sourceUrl).hostname;
      console.log(`✓ ${hosted.length} תמונות מ-${host}`);
      ok++;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n--- סיכום ---\nעודכנו: ${ok}\nנכשלו: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
