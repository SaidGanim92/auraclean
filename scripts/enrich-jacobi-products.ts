/**
 * העשרה מיעקובי (jacobi.co.il) + פרסום — שומר מחיר קיים באתר.
 * הרצה: npx tsx --env-file=.env.local scripts/enrich-jacobi-products.ts
 */
import { createClient } from '@supabase/supabase-js';
import { shopifyParser } from '../lib/suppliers/shopify';
import { validateImageUrl } from '../lib/security/url-validator';
import { translateProductName } from '../lib/translate/product-he-ar';
import { freeTranslateHeAr } from '../lib/translate/free-google';
import { looksLikeHebrew } from '../lib/lang-detect';

const BUCKET = 'product-images';

/** קישורי יעקובי (ללא כפילויות) */
const JACOBI_URLS = [
  'https://www.jacobi.co.il/products/kh7-סופר-מסיר-כתמים',
  'https://www.jacobi.co.il/products/וויט-ברייט-מלבין-כביסה-ומסיר-כתמים',
  'https://www.jacobi.co.il/products/דזיטול-דאודורנט-טקסטיל',
  'https://www.jacobi.co.il/products/kh7-סופר-מסיר-כתמים-baby',
  'https://www.jacobi.co.il/products/kh7-סופר-קלינר-למטבח-ולמכשירי-גריל-ביתיים',
  'https://www.jacobi.co.il/products/דורגול-למטבח-ולכיורי-נירוסטה',
  'https://www.jacobi.co.il/products/דורגול-מסיר-אבנית-במקלחון',
  'https://www.jacobi.co.il/products/אסטוניש-פלא-של-אקונומיקה',
  'https://www.jacobi.co.il/products/דזיטול-מנקה-ומחטא-בריסוס-אחד',
  'https://www.jacobi.co.il/products/דורגול-גל-ניקוי-יסודי-אסלה',
  'https://www.jacobi.co.il/products/מדבקות-הפלא-לאסלה-deoclean',
  'https://www.jacobi.co.il/products/מדבקות-הפלא-לאסלה-deoclean-1',
  'https://www.jacobi.co.il/products/קרבונה-לשטיחים-וריפודים',
  'https://www.jacobi.co.il/products/פוליבוי-ספריי-דוחה-אבק',
];

/** מחירי מלאי (מקור האמת) למוצרים שחסרים במסד */
const INVENTORY_PRICES: Record<string, { name_he: string; price: number }> = {
  '8420822132444': { name_he: 'KH-7 – סופר מסיר כתמים Baby', price: 25 },
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
      if (buf.length > 8 * 1024 * 1024) continue;
      const ext = src.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1]?.replace('jpeg', 'jpg') || 'jpg';
      const path = `${safeSku}/jacobi-${Date.now()}-${i}.${ext}`;
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
  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourceUrl of JACOBI_URLS) {
    process.stdout.write(`${sourceUrl.split('/').pop()}… `);
    try {
      const scraped = await shopifyParser.parse(sourceUrl);
      const sku = scraped.sku || scraped.barcode;
      if (!sku) {
        console.log('אין מק"ט');
        failed++;
        continue;
      }

      let { data: product } = await supabase.from('products').select('*').eq('sku', sku).maybeSingle();

      if (!product && INVENTORY_PRICES[sku]) {
        const inv = INVENTORY_PRICES[sku];
        const baseRow = {
          sku,
          name_he: inv.name_he,
          price: inv.price,
          available: scraped.available,
          published: false,
          images: [] as string[],
          enrichment_source: 'none' as const,
          image_external: false,
          supplier: 'yaakobi' as const,
          on_sale: false,
          featured: false,
        };
        let row: Record<string, unknown> = { ...baseRow, barcode: scraped.barcode, price_override: false };
        let { data: created, error: insErr } = await supabase.from('products').insert(row).select('*').single();
        for (let attempt = 0; insErr && attempt < 4; attempt++) {
          const msg = insErr.message || '';
          if (msg.includes('barcode')) delete row.barcode;
          else if (msg.includes('price_override')) delete row.price_override;
          else break;
          ({ data: created, error: insErr } = await supabase.from('products').insert(row).select('*').single());
        }
        if (insErr) {
          console.log('שגיאת יצירה:', insErr.message);
          failed++;
          continue;
        }
        product = created;
        console.log(`נוצר ${sku}… `);
      }

      if (!product) {
        console.log(`חסר במסד (${sku})`);
        failed++;
        continue;
      }

      if (product.published) {
        console.log('כבר מפורסם — דילוג');
        skipped++;
        continue;
      }

      const hosted = scraped.image_urls.length
        ? await downloadImages(supabase, scraped.image_urls, sku)
        : [];

      const patch: Record<string, unknown> = {
        source_url: sourceUrl,
        enrichment_source: 'supplier',
        supplier: 'yaakobi',
        image_external: hosted.length > 0,
        published: true,
      };
      if (hosted.length) patch.images = hosted;
      if (scraped.desc_he) patch.desc_he = scraped.desc_he;
      if (scraped.category_he && !product.category_he) patch.category_he = scraped.category_he;
      if (scraped.barcode && !product.barcode) patch.barcode = scraped.barcode;

      if (!product.name_ar || looksLikeHebrew(product.name_ar)) {
        const name_ar = await translateProductName(product.name_he, freeTranslateHeAr);
        if (name_ar) patch.name_ar = name_ar;
      }
      if (scraped.desc_he && (!product.desc_ar || looksLikeHebrew(product.desc_ar))) {
        const desc_ar = await freeTranslateHeAr(scraped.desc_he);
        if (desc_ar) patch.desc_ar = desc_ar;
      }

      const { error } = await supabase.from('products').update(patch).eq('id', product.id);
      if (error) {
        const stripped = { ...patch };
        delete stripped.barcode;
        const retry = await supabase.from('products').update(stripped).eq('id', product.id);
        if (retry.error) {
          console.log('שגיאה:', retry.error.message);
          failed++;
          continue;
        }
      }

      console.log(`✓ פורסם ${sku} | ${product.name_he.slice(0, 35)} | ${product.price} ₪ | תמונות:${hosted.length}`);
      published++;
    } catch (e) {
      console.log('שגיאה:', e instanceof Error ? e.message : e);
      failed++;
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n--- סיכום ---\nפורסמו: ${published}\nדילוג (כבר מפורסם): ${skipped}\nנכשלו/חסרים: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
