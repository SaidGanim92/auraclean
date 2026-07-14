/**
 * עדכון מחירים (ומלאי/עלות) מקובץ ייצוא מלאי — מחיר ללקוח.
 * הרצה: npx tsx --env-file=.env.local scripts/update-inventory-prices.ts [path-to-csv]
 */
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { mapCsvRows, type MappedRow } from '../lib/csv-map';

const SOURCE_FIELDS: (keyof MappedRow)[] = [
  'name_he', 'name_ar', 'category_he', 'category_ar', 'barcode',
  'price', 'sale_price', 'on_sale', 'desc_he', 'desc_ar',
  'available', 'unit', 'featured', 'stock_qty', 'cost_ref',
];
const PRICE_FIELDS: (keyof MappedRow)[] = ['price', 'sale_price', 'on_sale'];

function patchFrom(row: MappedRow, priceLocked = false): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of SOURCE_FIELDS) {
    if (priceLocked && (PRICE_FIELDS as string[]).includes(f)) continue;
    const v = row[f];
    if (v !== undefined) patch[f] = v;
  }
  return patch;
}

function isMissingColumnError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /schema cache/i.test(message) || /column .* does not exist/i.test(message);
}

async function updateRow(
  supabase: ReturnType<typeof createClient>,
  sku: string,
  patch: Record<string, unknown>
): Promise<string | null> {
  const first = await supabase.from('products').update(patch).eq('sku', sku);
  if (!first.error) return null;
  if (!isMissingColumnError(first.error.message)) return first.error.message;
  const stripped = { ...patch };
  delete stripped.barcode;
  delete stripped.price_override;
  if (Object.keys(stripped).length === 0) return first.error.message;
  const second = await supabase.from('products').update(stripped).eq('sku', sku);
  return second.error?.message ?? null;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.env.HOME || '', 'Downloads/inventory_export_20260711020437.csv');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT')) {
    console.error('חסר Supabase ב-.env.local');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('קובץ לא נמצא:', csvPath);
    process.exit(1);
  }

  const text = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const { mapped, skipped } = mapCsvRows(parsed.data);
  const withPrice = mapped.filter((m) => m.price != null);

  console.log(`קובץ: ${path.basename(csvPath)}`);
  console.log(`שורות: ${parsed.data.length} · ממופות: ${mapped.length} · עם מחיר: ${withPrice.length} · דילוגים: ${skipped}`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const skus = mapped.map((m) => m.sku);
  const existing = new Set<string>();
  const priceLocked = new Set<string>();

  for (let i = 0; i < skus.length; i += 200) {
    const chunk = skus.slice(i, i + 200);
    let { data, error } = await supabase.from('products').select('sku, price_override').in('sku', chunk);
    if (error && /price_override|schema cache/i.test(error.message)) {
      const retry = await supabase.from('products').select('sku').in('sku', chunk);
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      console.error('שגיאת קריאה:', error.message);
      process.exit(1);
    }
    (data || []).forEach((r: { sku: string; price_override?: boolean }) => {
      existing.add(r.sku);
      if (r.price_override) priceLocked.add(r.sku);
    });
  }

  const toInsert = mapped.filter((m) => !existing.has(m.sku));
  const toUpdate = mapped.filter((m) => existing.has(m.sku));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  if (toInsert.length) {
    const rowsIns = toInsert.map((m) => ({
      ...patchFrom(m),
      sku: m.sku,
      published: false,
      images: [],
      enrichment_source: 'none',
      image_external: false,
    }));
    for (let i = 0; i < rowsIns.length; i += 100) {
      const chunk = rowsIns.slice(i, i + 100);
      const { error, count } = await supabase.from('products').insert(chunk, { count: 'exact' });
      if (error) errors.push(error.message);
      else created += count ?? chunk.length;
    }
  }

  for (const m of toUpdate) {
    const patch = patchFrom(m, priceLocked.has(m.sku));
    if (!Object.keys(patch).length) continue;
    const err = await updateRow(supabase, m.sku, patch);
    if (err) errors.push(`${m.sku}: ${err}`);
    else updated++;
  }

  console.log('\n--- תוצאה ---');
  console.log(`עודכנו: ${updated}`);
  console.log(`נוצרו (טיוטה): ${created}`);
  console.log(`לא נמצאו במסד (ייווצרו כטיוטה): ${toInsert.length}`);
  if (priceLocked.size) console.log(`מחיר נעול (דילגו על מחיר): ${priceLocked.size}`);
  if (errors.length) {
    console.log('שגיאות:');
    errors.slice(0, 15).forEach((e) => console.log(' -', e));
  } else {
    console.log('הושלם בהצלחה ✓');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
