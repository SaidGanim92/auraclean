/**
 * ייצוא כל תמונות המוצרים לתיקייה מקומית אחת (לעריכה).
 * הרצה: npx tsx --env-file=.env.local scripts/export-product-images.ts [תיקיית-יעד]
 *
 * יוצר:
 *   product-images-export/
 *     images/          — כל הקבצים (SKU_1.jpg, SKU_2.jpg…)
 *     manifest.json    — מיפוי קובץ → מוצר
 *     manifest.csv     — אותו דבר ב-CSV (נוח ל-Excel)
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '../lib/types';

const DEFAULT_OUT = path.join(process.cwd(), 'product-images-export');

function safeName(sku: string): string {
  return sku.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50) || 'item';
}

function extFromUrl(url: string): string {
  const m = url.split('?')[0].match(/\.(png|jpe?g|webp|gif)$/i);
  return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
}

async function download(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { accept: 'image/*', 'user-agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 10 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

async function main() {
  const outDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_OUT;
  const imgDir = path.join(outDir, 'images');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('products').select('id,sku,name_he,images').order('sku');
  if (error) {
    console.error('שגיאת קריאה:', error.message);
    process.exit(1);
  }

  fs.mkdirSync(imgDir, { recursive: true });

  const manifest: {
    file: string;
    sku: string;
    name_he: string;
    image_index: number;
    source_url: string;
    product_id: string;
  }[] = [];

  let downloaded = 0;
  let skipped = 0;
  const products = (data as Pick<Product, 'id' | 'sku' | 'name_he' | 'images'>[]) || [];

  for (const p of products) {
    const imgs = p.images || [];
    if (!imgs.length) continue;

    const base = safeName(p.sku);
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i];
      if (!src?.startsWith('http')) { skipped++; continue; }

      const ext = extFromUrl(src);
      const file = imgs.length === 1 ? `${base}.${ext}` : `${base}_${i + 1}.${ext}`;
      const dest = path.join(imgDir, file);

      // אם כבר קיים — לא מוריד שוב (למניעת כפילויות בשמות דומים)
      if (fs.existsSync(dest)) {
        const alt = `${base}_${i + 1}_${Date.now()}.${ext}`;
        const buf = await download(src);
        if (!buf) { skipped++; continue; }
        fs.writeFileSync(path.join(imgDir, alt), buf);
        manifest.push({ file: alt, sku: p.sku, name_he: p.name_he, image_index: i, source_url: src, product_id: p.id });
        downloaded++;
        continue;
      }

      const buf = await download(src);
      if (!buf) {
        console.warn(`דילוג (הורדה נכשלה): ${p.sku} — ${src.slice(0, 60)}…`);
        skipped++;
        continue;
      }

      fs.writeFileSync(dest, buf);
      manifest.push({ file, sku: p.sku, name_he: p.name_he, image_index: i, source_url: src, product_id: p.id });
      downloaded++;
      process.stdout.write(`\r${downloaded} תמונות…`);
    }
  }

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const csvHeader = 'file,sku,name_he,image_index,product_id,source_url\n';
  const csvRows = manifest.map((m) =>
    `"${m.file}","${m.sku}","${m.name_he.replace(/"/g, '""')}",${m.image_index},"${m.product_id}","${m.source_url}"`
  ).join('\n');
  fs.writeFileSync(path.join(outDir, 'manifest.csv'), csvHeader + csvRows, 'utf8');

  const withImages = products.filter((p) => p.images?.length).length;
  console.log(`\n\n✓ סיום`);
  console.log(`תיקייה: ${imgDir}`);
  console.log(`מוצרים עם תמונות: ${withImages}`);
  console.log(`קבצים שהורדו: ${downloaded}`);
  console.log(`דילוגים: ${skipped}`);
  console.log(`מיפוי: ${path.join(outDir, 'manifest.csv')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
