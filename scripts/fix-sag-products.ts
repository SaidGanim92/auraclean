/**
 * תיקון תמונות מוצרי SAG — מקור ראשון: sagncs.co.il, נפילה לחיפוש באתרים ישראליים.
 * הרצה: npx tsx --env-file=.env.local scripts/fix-sag-products.ts
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

/** מק"ט → קישור רשמי בסאג (מותאם לפי שם/קוד המוצר) */
const SAG_URLS: Record<string, string> = {
  '7290019468233': 'https://sagncs.co.il/product/ps111-padsag-soap/',
  '7290019468110':
    'https://sagncs.co.il/product/mg200-%d7%9e%d7%92%d7%91%d7%95%d7%a0%d7%99%d7%9d-%d7%9c%d7%94%d7%a1%d7%a8%d7%94-%d7%9e%d7%94%d7%99%d7%a8%d7%94-%d7%a9%d7%9c-%d7%a9%d7%95%d7%9e%d7%a0%d7%99%d7%9d/',
  '7290019468416':
    'https://sagncs.co.il/product/magic-towel-%d7%9e%d7%98%d7%9c%d7%99%d7%95%d7%aa-%d7%a4%d7%95%d7%a0%d7%a7%d7%a6%d7%99%d7%95%d7%a0%d7%9c%d7%99%d7%95%d7%aa-%d7%9e%d7%9e%d7%99%d7%a7%d7%a8%d7%95%d7%a4%d7%99%d7%99%d7%91%d7%a8-mt030-4/',
  '7290016979725':
    'https://sagncs.co.il/product/%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-sagclean-%d7%91%d7%a0%d7%99%d7%97%d7%95%d7%97-boutique/',
  '7290019468332':
    'https://sagncs.co.il/product/%d7%9e%d7%a1%d7%99%d7%a8-%d7%9b%d7%aa%d7%9e%d7%99%d7%9d-%d7%90%d7%a7%d7%95%d7%9c%d7%95%d7%92%d7%99-%d7%9e%d7%91%d7%93%d7%99%d7%9d-power-clean-pc600/',
  '7290003976218':
    'https://sagncs.co.il/product/ja-clean-%d7%a1%d7%a4%d7%a8%d7%99%d7%99-%d7%90%d7%a7%d7%95%d7%9c%d7%95%d7%92%d7%99-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99-%d7%9c%d7%94%d7%a1%d7%a8%d7%aa-%d7%a9%d7%95%d7%9e%d7%a0%d7%99%d7%9d-jc710/',
  '7290019468141':
    'https://sagncs.co.il/product/sc005-%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-sagclean-%d7%91%d7%a0%d7%99%d7%97%d7%95%d7%97-freedom-2/',
  '7290016979657':
    'https://sagncs.co.il/product/le654-%d7%a9%d7%9e%d7%a4%d7%95-%d7%9c%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%95%d7%97%d7%99%d7%98%d7%95%d7%99-%d7%93%d7%a9%d7%90-%d7%a1%d7%99%d7%a0%d7%98%d7%98%d7%99/',
  '7290016979831':
    'https://sagncs.co.il/product/nm300-%d7%97%d7%95%d7%9e%d7%a8-%d7%a9%d7%98%d7%99%d7%a4%d7%94-%d7%94%d7%9e%d7%99%d7%95%d7%a2%d7%93-%d7%9c%d7%9e%d7%9b%d7%95%d7%a0%d7%95%d7%aa/',
  '7290019468271':
    'https://sagncs.co.il/product/%d7%aa%d7%a8%d7%a1%d7%99%d7%a1-%d7%9c%d7%94%d7%91%d7%a8%d7%a7%d7%94-%d7%95%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%97%d7%9c%d7%95%d7%a0%d7%95%d7%aa-sag-shine-nh202/',
  '7290016979749':
    'https://sagncs.co.il/product/crystal-shine-cs500-%d7%aa%d7%9b%d7%a9%d7%99%d7%a8-%d7%9c%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%95%d7%94%d7%91%d7%a8%d7%a7%d7%aa-%d7%97%d7%9c%d7%95%d7%a0%d7%95%d7%aa-%d7%95%d7%9e%d7%aa%d7%90%d7%95%d7%aa/',
  '7290016979008':
    'https://sagncs.co.il/product/magicstone-%d7%90%d7%91%d7%9f-%d7%94%d7%a7%d7%a1%d7%9d-%d7%9c%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%9b%d7%9c%d7%9c%d7%99/',
  '7290003976249': 'https://sagncs.co.il/product/mk105-%d7%9e%d7%a7%d7%9c%d7%97%d7%95%d7%a0%d7%99%d7%aa/',
  '7290016979695':
    'https://sagncs.co.il/product/mz200-%d7%9e%d7%96%d7%92%d7%a0%d7%99%d7%aa-%d7%aa%d7%a8%d7%a1%d7%99%d7%a1-%d7%a7%d7%a6%d7%a3-%d7%9c%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%95%d7%97%d7%99%d7%98%d7%95%d7%99-%d7%9e%d7%96%d7%92%d7%a0%d7%99/',
  '7290001246207': 'https://sagncs.co.il/product/3840/',
  '7290015251075': 'https://sagncs.co.il/product/ac-140/',
  '7290019468356':
    'https://sagncs.co.il/product/ja-clean-%d7%a1%d7%a4%d7%a8%d7%99%d7%99-%d7%90%d7%a7%d7%95%d7%9c%d7%95%d7%92%d7%99-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99-%d7%9c%d7%94%d7%a1%d7%a8%d7%aa-%d7%a9%d7%95%d7%9e%d7%a0%d7%99%d7%9d-jc710/',
  '7290016979787':
    'https://sagncs.co.il/product/cl025-%d7%a7%d7%9c%d7%99%d7%a0%d7%9b%d7%9c-%d7%a7%d7%a6%d7%a3-%d7%9c%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%95%d7%97%d7%99%d7%98%d7%95%d7%99-%d7%97%d7%93%d7%a8%d7%99-%d7%a8%d7%97%d7%a6%d7%94/',
  '7290001245033': 'https://sagncs.co.il/product/%d7%a0%d7%95%d7%96%d7%9c-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99/',
  '7290001246764': 'https://sagncs.co.il/product/%d7%a0%d7%95%d7%96%d7%9c-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99/',
  '7290019468127':
    'https://sagncs.co.il/product/sh200-%d7%a9%d7%98%d7%99%d7%a4%d7%95%d7%9e%d7%98%d7%99-%d7%a9%d7%9e%d7%a4%d7%95-%d7%9c%d7%a9%d7%95%d7%90%d7%91-%d7%a9%d7%95%d7%98%d7%a3-%d7%91%d7%a0%d7%99%d7%97%d7%95%d7%97-infinity/',
  '7290019468165':
    'https://sagncs.co.il/product/sc008-%d7%a0%d7%99%d7%a7%d7%95%d7%99-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-sagclean-%d7%91%d7%a0%d7%99%d7%97%d7%95%d7%97-top-secret/',
  // SC009 (HOME SWEET HOME) אינו זמין באתר — נפילה ל-SC003 נוזל רצפות מקצועי
  '7290019460107': 'https://sagncs.co.il/product/%d7%a0%d7%95%d7%96%d7%9c-%d7%a8%d7%a6%d7%a4%d7%95%d7%aa-%d7%9e%d7%a7%d7%a6%d7%95%d7%a2%d7%99/',
  '7290016979824': 'https://sagncs.co.il/product/ac-140/',
};

const SAG_NAME_RE =
  /סאג|\bSAG\b|PADSAG|SAGCLEAN|SAG SHINE|freedom sag|אקסולס|SH20[02]|CS500|PC600|JC710|LE654|MK105|OV106|AC140|BM107|CL025|MZ200|ST808|MG300|NM300|SH300|SH100|SC00[0-9]|HOME SWEET|טופ סיקרט|שטיפומטי|ג'נט|צמיג|אבן הקסם|ספרי אקולוג|דשא סינטטי/i;

function isSagProduct(p: Pick<Product, 'name_he' | 'supplier' | 'source_url'>): boolean {
  if (/pink stuff/i.test(p.name_he || '')) return false;
  const sup = (p.supplier || '').toLowerCase();
  if (sup === 'sag' || sup === 'sagncs') return true;
  if ((p.source_url || '').toLowerCase().includes('sagncs')) return true;
  return SAG_NAME_RE.test(p.name_he || '');
}

async function downloadImages(
  supabase: ReturnType<typeof createClient>,
  imageUrls: string[],
  sku: string
): Promise<string[]> {
  const out: string[] = [];
  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'sag';
  for (let i = 0; i < imageUrls.length && out.length < 6; i++) {
    try {
      const src = validateImageUrl(imageUrls[i]);
      const res = await fetch(src, { headers: { accept: 'image/*' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) continue;
      const ext = src.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
      const path = `${safeSku}/sag-${Date.now()}-${i}.${ext}`;
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

async function scrapeWithFallback(product: Product, primaryUrl?: string) {
  const urls = [primaryUrl, product.source_url].filter(Boolean) as string[];
  for (const url of urls) {
    if (!url.includes('sagncs.co.il')) continue;
    try {
      const scraped = await scrapeFromUrl(url);
      if (scraped.image_urls.length) return { scraped, sourceUrl: url };
    } catch {
      /* try next */
    }
  }

  try {
    const hit = await discoverProductUrl(product);
    if (hit) {
      const scraped = await scrapeFromUrl(hit.url);
      if (scraped.image_urls.length) return { scraped, sourceUrl: hit.url };
    }
  } catch {
    /* none */
  }

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
  const { data: allProducts, error } = await supabase.from('products').select('*').order('sku');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const products = ((allProducts as Product[] | null) || []).filter(isSagProduct);
  console.log(`מוצרי SAG לעדכון: ${products.length}\n`);

  let ok = 0;
  let fail = 0;

  for (const product of products) {
    const sku = product.sku;
    process.stdout.write(`${sku} ${product.name_he.slice(0, 28)}… `);
    const hit = await scrapeWithFallback(product, SAG_URLS[sku]);
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
      supplier: 'sag',
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
