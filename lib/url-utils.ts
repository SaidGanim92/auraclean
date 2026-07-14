/** נרמול קישור מוצר לפני גריפה */
export function normalizeProductUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  return new URL(s).toString();
}
