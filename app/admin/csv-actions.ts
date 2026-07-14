'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminRequest } from '@/lib/admin-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { mapCsvRows, type MappedRow } from '@/lib/csv-map';
import { safeUpdate } from '@/lib/db-patch.server';

function isMissingColumnError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /schema cache/i.test(message) || /column .* does not exist/i.test(message);
}

export interface CsvImportResult {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings?: string[];
}

// שדות שקובץ המלאי הוא מקור האמת שלהם (מתעדכנים בייבוא חוזר).
// תמונות/enrichment/published לא נדרסים בעדכון — נשמרים מזרימת ההעשרה.
const SOURCE_FIELDS: (keyof MappedRow)[] = [
  'name_he', 'name_ar', 'category_he', 'category_ar', 'barcode',
  'price', 'sale_price', 'on_sale', 'desc_he', 'desc_ar',
  'available', 'unit', 'featured', 'stock_qty', 'cost_ref',
];

const PRICE_FIELDS: (keyof MappedRow)[] = ['price', 'sale_price', 'on_sale'];

const MAX_CSV_ROWS = 5000;

/** priceLocked=true → מדלגים על שדות המחיר (המנהל קבע מחיר ידנית ולא רוצים לדרוס אותו) */
function patchFrom(row: MappedRow, priceLocked = false): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const f of SOURCE_FIELDS) {
    if (priceLocked && (PRICE_FIELDS as string[]).includes(f)) continue;
    const v = row[f];
    if (v !== undefined) patch[f] = v; // רק שדות שנמסרו (לא דורסים בריק)
  }
  return patch;
}

/** ייבוא/עדכון שורות CSV: upsert לפי sku, מוצרים חדשים כטיוטה (published=false) */
export async function importCsvRows(rows: Record<string, string>[]): Promise<CsvImportResult> {
  if (!(await isAdminRequest())) return { ok: false, created: 0, updated: 0, skipped: 0, errors: ['לא מורשה'] };
  if (!isSupabaseConfigured())
    return { ok: false, created: 0, updated: 0, skipped: 0, errors: ['מצב הדגמה: Supabase לא מחובר — מלא את .env.local.'] };
  if (rows.length > MAX_CSV_ROWS) {
    return {
      ok: false, created: 0, updated: 0, skipped: 0,
      errors: [`קובץ גדול מדי: מקסימום ${MAX_CSV_ROWS} שורות.`],
    };
  }

  const { mapped, skipped } = mapCsvRows(rows);
  if (!mapped.length) return { ok: false, created: 0, updated: 0, skipped, errors: ['לא נמצאו שורות תקינות (נדרש sku + name_he).'] };

  const supabase = createAdminClient();
  const errors: string[] = [];

  // אילו מק"טים כבר קיימים, ואילו מהם עם מחיר נעול ידנית (price_override)?
  // (אם price_override עדיין לא קיים במסד — חוסר-מיגרציה — נופלים ל-select בסיסי בלי לחסום את הייבוא)
  let migrationWarning: string | null = null;
  const skus = mapped.map((m) => m.sku);
  const existing = new Set<string>();
  const priceLocked = new Set<string>();
  for (let i = 0; i < skus.length; i += 200) {
    const chunk = skus.slice(i, i + 200);
    let { data, error } = await supabase.from('products').select('sku, price_override').in('sku', chunk);
    if (error && isMissingColumnError(error.message)) {
      migrationWarning = 'לתשומת לבך: עמודת price_override חסירה במסד (מיגרציה לא הורצה) — נעילת מחיר לא נבדקה בייבוא הזה.';
      const retry = await supabase.from('products').select('sku').in('sku', chunk);
      data = (retry.data as any) || null;
      error = retry.error;
    }
    if (error) errors.push(error.message);
    (data || []).forEach((r: { sku: string; price_override?: boolean }) => {
      existing.add(r.sku);
      if (r.price_override) priceLocked.add(r.sku);
    });
  }

  const toInsert = mapped.filter((m) => !existing.has(m.sku));
  const toUpdate = mapped.filter((m) => existing.has(m.sku));

  // הוספה: מוצרים חדשים כטיוטה (published=false), תמונות ריקות עד העשרה
  let created = 0;
  if (toInsert.length) {
    const rowsIns = toInsert.map((m) => ({
      ...patchFrom(m),
      sku: m.sku,
      published: false,
      images: [],
      enrichment_source: 'none' as const,
      image_external: false,
    }));
    for (let i = 0; i < rowsIns.length; i += 100) {
      const chunk = rowsIns.slice(i, i + 100);
      let { error, count } = await supabase.from('products').insert(chunk, { count: 'exact' });
      if (error && isMissingColumnError(error.message)) {
        migrationWarning = 'לתשומת לבך: עמודת barcode חסרה במסד (מיגרציה לא הורצה) — יובא בלי ברקוד.';
        const stripped = chunk.map(({ barcode, ...rest }: any) => rest);
        const retry = await supabase.from('products').insert(stripped, { count: 'exact' });
        error = retry.error;
        count = retry.count;
      }
      if (error) errors.push(error.message);
      else created += count ?? chunk.length;
    }
  }

  // עדכון: רק שדות מקור-אמת; לא נוגעים ב-images/enrichment/published
  let updated = 0;
  const CHUNK = 20;
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map((m) =>
        safeUpdate(patchFrom(m, priceLocked.has(m.sku)), (p) =>
          supabase.from('products').update(p).eq('sku', m.sku)
        )
      )
    );
    results.forEach((r) => {
      if (r.ok) { updated++; if (r.warning) migrationWarning = r.warning; }
      else if (r.error) errors.push(r.error);
    });
  }

  revalidatePath('/');
  revalidatePath('/admin/products');
  return {
    ok: errors.length === 0,
    created, updated, skipped, errors,
    warnings: migrationWarning ? [migrationWarning] : undefined,
  };
}
