import type { ScrapedProduct, Supplier } from '@/lib/types';

/**
 * ממשק אחיד לכל פרסר ספק.
 * הוספת ספק חדש = הוספת קובץ אחד שמייצא אובייקט התואם לממשק הזה,
 * ורישומו ב-lib/suppliers/index.ts.
 */
export interface SupplierParser {
  /** מזהה הספק */
  supplier: Supplier;
  /** האם הפרסר מטפל בכתובת הזו (בדיקת דומיין/תבנית URL) */
  matches(url: string): boolean;
  /**
   * שליפת נתוני המוצר מהכתובת.
   * מקבל fetcher (להזרקה בבדיקות) ומחזיר ScrapedProduct אחיד.
   */
  parse(url: string, fetcher?: Fetcher): Promise<ScrapedProduct>;
}

/** טיפוס fetch מוזרק — מאפשר בדיקות מול fixtures ללא רשת */
export type Fetcher = (url: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
}>;

/** עזר: המרת מחרוזת מחיר ("₪ 24.90", "24,90") למספר */
export function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  const cleaned = String(raw).replace(/[^\d.,]/g, '').replace(/,/g, '.');
  const m = cleaned.match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** בדיקה גסה שהמחרוזת נראית כמו ברקוד תקין (EAN-8/12/13/14 / UPC) — מספרות בלבד */
export function looksLikeBarcode(value: string | number | null | undefined): boolean {
  const v = String(value ?? '').trim();
  return /^\d{8,14}$/.test(v);
}
