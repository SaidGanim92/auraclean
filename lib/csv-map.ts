// מיפוי שורת CSV (כותרות גמישות, עברית/אנגלית) לשדות טבלת products.
// עיקרון: קובץ המלאי = מקור אמת לשם/מחיר/קטגוריה/מלאי. אין כאן תמונות/העשרה.

import { categoryArabic, resolveCategoryHe } from '@/lib/category-ar';
import { looksLikeHebrew } from '@/lib/lang-detect';

export interface MappedRow {
  sku: string;
  barcode?: string | null;
  name_he: string;
  name_ar?: string;
  category_he?: string;
  category_ar?: string;
  price?: number;
  sale_price?: number | null;
  on_sale?: boolean;
  desc_he?: string;
  desc_ar?: string;
  available?: boolean;
  unit?: string;
  featured?: boolean;
  stock_qty?: number | null;
  cost_ref?: number | null;
}

// כינויי כותרות → מפתח מנורמל
const ALIASES: Record<string, keyof MappedRow> = {
  sku: 'sku', 'מקט': 'sku', 'מק"ט': 'sku', 'מק״ט': 'sku',
  barcode: 'barcode', 'ברקוד': 'barcode', ean: 'barcode', gtin: 'barcode', upc: 'barcode',
  name_he: 'name_he', name: 'name_he', 'שם': 'name_he', 'שם המוצר': 'name_he',
  name_ar: 'name_ar',
  category_he: 'category_he', category: 'category_he', 'קטגוריה': 'category_he',
  category_ar: 'category_ar',
  price: 'price', 'מחיר': 'price', 'מחיר ללקוח': 'price',
  sale_price: 'sale_price', 'מחיר מבצע': 'sale_price',
  on_sale: 'on_sale', 'מבצע': 'on_sale',
  desc_he: 'desc_he', description: 'desc_he', 'תיאור': 'desc_he',
  desc_ar: 'desc_ar',
  image: 'name_he' /* placeholder, overridden below to be ignored */,
  available: 'available', 'זמין': 'available', 'במלאי': 'available',
  unit: 'unit', 'יחידה': 'unit', 'יחידת מידה': 'unit',
  featured: 'featured', 'מומלץ': 'featured',
  stock_qty: 'stock_qty', stock: 'stock_qty', 'מלאי': 'stock_qty', 'כמות': 'stock_qty', 'כמות במלאי': 'stock_qty',
  cost_ref: 'cost_ref', cost: 'cost_ref', 'עלות': 'cost_ref', 'עלות לפני מע"מ': 'cost_ref',
};
delete (ALIASES as Record<string, unknown>)['image']; // 'image' לא ממופה (תמונות מגיעות מהעשרה)

function normKey(k: string): keyof MappedRow | null {
  const key = String(k || '').trim().toLowerCase();
  return ALIASES[key] || ALIASES[String(k || '').trim()] || null;
}

function toBool(v: string, def = true): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '') return def;
  return !['false', '0', 'no', 'לא', 'off', 'אזל', 'unavailable'].includes(s);
}
function toNum(v: string): number | undefined {
  if (v == null || String(v).trim() === '') return undefined;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? undefined : n;
}

/** ממפה שורה גולמית (מפתחות = כותרות CSV) ל-MappedRow, או null אם חסר sku/שם */
export function mapCsvRow(raw: Record<string, string>): MappedRow | null {
  const out: Partial<MappedRow> = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const key = normKey(rawKey);
    if (!key) continue;
    const val = String(rawVal ?? '').trim();
    switch (key) {
      case 'price': { const n = toNum(val); if (n !== undefined) out.price = n; break; }
      case 'sale_price': case 'cost_ref': out[key] = toNum(val) ?? null; break;
      case 'stock_qty': { const n = toNum(val); out.stock_qty = n == null ? null : Math.round(n); break; }
      case 'available': out.available = toBool(val, true); break;
      case 'on_sale': case 'featured': out[key] = toBool(val, false); break;
      default: if (val !== '') (out as Record<string, unknown>)[key] = val;
    }
  }
  // אם אין עמודת מק"ט נפרדת אבל יש ברקוד — הברקוד משמש גם כמק"ט (זהות המוצר)
  if (!out.sku && out.barcode) out.sku = out.barcode;
  if (!out.sku || !out.name_he) return null;
  out.sku = String(out.sku).trim();

  const catHe = resolveCategoryHe(out.category_he, out.category_ar);
  if (catHe) {
    out.category_he = catHe;
    const ar = categoryArabic(catHe);
    if (ar && (!out.category_ar || looksLikeHebrew(out.category_ar))) out.category_ar = ar;
  }

  return out as MappedRow;
}

/** ממפה מערך שורות, מסיר כפולים לפי sku (אחרון מנצח), מחזיר גם דילוגים */
export function mapCsvRows(rows: Record<string, string>[]): { mapped: MappedRow[]; skipped: number } {
  const bySku = new Map<string, MappedRow>();
  let skipped = 0;
  for (const r of rows) {
    const m = mapCsvRow(r);
    if (!m) { skipped++; continue; }
    bySku.set(m.sku, m);
  }
  return { mapped: [...bySku.values()], skipped };
}
