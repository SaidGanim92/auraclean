import 'server-only';

/**
 * עוזר לשמירה "עמידה" מפני עמודות חדשות שעדיין לא נוספו בפועל ב-Supabase
 * (למשל: barcode, price_override — התווספו לקוד אבל המיגרציה לא הורצה עדיין).
 *
 * במקום שכל השמירה תיכשל כליל בגלל שדה אחד חסר (שגיאת PostgREST:
 * "Could not find the 'x' column of 'products' in the schema cache"),
 * מנסים שוב בלי השדות האופציונליים ומחזירים אזהרה ברורה למנהל.
 */

const OPTIONAL_COLUMNS = ['barcode', 'price_override'] as const;

function isMissingColumnError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /schema cache/i.test(message) || /column .* does not exist/i.test(message);
}

export interface SafeUpdateResult {
  ok: boolean;
  warning?: string;
  error?: string;
}

/**
 * מריצה update, ואם השגיאה היא "עמודה חסרה" — מסירה מה-patch את העמודות
 * האופציונליות (barcode/price_override) ומנסה שוב, כדי שלפחות שאר השדות יישמרו.
 */
export async function safeUpdate(
  patch: Record<string, unknown>,
  run: (p: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
): Promise<SafeUpdateResult> {
  const first = await run(patch);
  if (!first.error) return { ok: true };
  if (!isMissingColumnError(first.error.message)) return { ok: false, error: first.error.message };

  const stripped = stripOptionalColumns(patch);
  if (!stripped.removed) return { ok: false, error: first.error.message };

  const second = await run(stripped.row);
  if (second.error) return { ok: false, error: second.error.message };
  return { ok: true, warning: MIGRATION_WARNING };
}

export interface SafeInsertResult<T = unknown> {
  ok: boolean;
  data?: T;
  warning?: string;
  error?: string;
}

const MIGRATION_WARNING =
  'נשמר בהצלחה, אבל בלי ברקוד/נעילת מחיר — חסרה מיגרציה ב-Supabase. ' +
  'הרץ ב-SQL Editor את supabase/migration_barcode.sql ו-migration_price_override.sql, ' +
  'ואז NOTIFY pgrst, \'reload schema\'; ונסה לשמור שוב.';

function stripOptionalColumns(row: Record<string, unknown>): { row: Record<string, unknown>; removed: boolean } {
  const out: Record<string, unknown> = { ...row };
  let removed = false;
  for (const col of OPTIONAL_COLUMNS) {
    if (col in out) {
      delete out[col];
      removed = true;
    }
  }
  return { row: out, removed };
}

/** insert עמיד — מסיר עמודות אופציונליות אם חסרות במסד */
export async function safeInsert<T = unknown>(
  row: Record<string, unknown>,
  run: (r: Record<string, unknown>) => PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<SafeInsertResult<T>> {
  const first = await run(row);
  if (!first.error && first.data) return { ok: true, data: first.data };
  if (!first.error) return { ok: false, error: 'לא התקבלו נתונים מהמסד' };
  if (!isMissingColumnError(first.error.message)) return { ok: false, error: first.error.message };

  const stripped = stripOptionalColumns(row);
  if (!stripped.removed) return { ok: false, error: first.error.message };

  const second = await run(stripped.row);
  if (second.error) return { ok: false, error: second.error.message };
  if (!second.data) return { ok: false, error: 'לא התקבלו נתונים מהמסד' };
  return { ok: true, data: second.data, warning: MIGRATION_WARNING };
}
