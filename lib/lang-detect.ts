/** האם המחרוזת נראית כמו עברית (אותיות עבריות ללא אותיות ערביות) — סימן לתרגום שנכשל ונשמר כמקור */
export function looksLikeHebrew(text: string | null | undefined): boolean {
  const s = (text || '').trim();
  if (!s) return false;
  const hasHebrew = /[\u0590-\u05FF]/.test(s);
  const hasArabic = /[\u0600-\u06FF]/.test(s);
  return hasHebrew && !hasArabic;
}

/** האם שדה ערבי חסר או עדיין בעברית (דורש תרגום) */
export function needsArabicTranslation(
  he: string | null | undefined,
  ar: string | null | undefined
): boolean {
  if (!he?.trim()) return false;
  if (!ar?.trim()) return true;
  return looksLikeHebrew(ar);
}
