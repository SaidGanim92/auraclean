import { looksLikeHebrew } from '@/lib/lang-detect';

/** תוויות קצרות לסרגל הקטגוריות (עברית) */
export const CATEGORY_LABEL_HE: Record<string, string> = {
  'ניקיון כללי ומשטחים': 'ניקיון כללי',
  'כביסה וטיפוח בדים': 'כביסה',
  'רצפות ושטיחים': 'רצפות',
  'מקלחת ושירותים': 'מקלחת ושירותים',
  'מטבח וכלים': 'מטבח',
  'מטליות, ספוגים ומגבונים': 'מטליות וספוגים',
  'מטהרי אוויר וריחות': 'מטהרי אוויר',
  'נייר וחד פעמי': 'נייר וחד פעמי',
  'אביזרי ניקיון': 'אביזרים',
  'חלונות וזכוכית': 'חלונות וזכוכית',
};

/** תוויות קצרות לסרגל הקטגוריות (ערבית) */
export const CATEGORY_AR_HE: Record<string, string> = {
  'ניקיון כללי ומשטחים': 'تنظيف عام',
  'כביסה וטיפוח בדים': 'غسيل',
  'רצפות ושטיחים': 'أرضيات',
  'מקלחת ושירותים': 'دش وحمّام',
  'מטבח וכלים': 'مطبخ',
  'מטליות, ספוגים ומגבונים': 'فوط وإسفنج',
  'מטהרי אוויר וריחות': 'معطّرات',
  'נייר וחד פעמי': 'ورق واستخدام واحد',
  'אביזרי ניקיון': 'أدوات',
  'חלונות וזכוכית': 'نوافذ وزجاج',
};

/** רשימת קטגוריות לבחירה בממשק הניהול */
export const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABEL_HE).map((key) => ({
  key,
  labelHe: CATEGORY_LABEL_HE[key] || key,
  labelAr: CATEGORY_AR_HE[key] || '',
}));

/** תווית קטגוריה לתצוגה (קצרה) */
export function categoryLabel(he: string | null | undefined, lang: 'he' | 'ar'): string {
  const k = (he || '').trim();
  if (!k) return '';
  if (lang === 'ar') return CATEGORY_AR_HE[k] || '';
  return CATEGORY_LABEL_HE[k] || k;
}

/** תרגום ערבי לשמירה במסד */
export function categoryArabic(he: string | null | undefined): string {
  return categoryLabel(he, 'ar');
}

/** כינויים/כפילויות → קטגוריה קנונית ברשימה */
export const CATEGORY_ALIASES: Record<string, string> = {
  'נוזל רצפה': 'רצפות ושטיחים',
  'נוזל רצפות': 'רצפות ושטיחים',
  'אמבטיה ושירותים': 'מקלחת ושירותים',
  'אמבטיה': 'מקלחת ושירותים',
  'ניקוי והברקה': 'חלונות וזכוכית',
  'הברקה': 'חלונות וזכוכית',
  'נייר ומוצרים חד פעמיים': 'נייר וחד פעמי',
  'חד פעמי': 'נייר וחד פעמי',
};

/** מנרמל שם קטגוריה לערך קנוני (לסרגל, סינון, ייבוא CSV) */
export function normalizeCategoryHe(he: string | null | undefined): string {
  const k = (he || '').trim();
  if (!k) return '';
  return CATEGORY_ALIASES[k] || k;
}

/**
 * מפתח קטגוריה בעברית — גם אם נשמר בטעות רק ב-category_ar (עברית).
 */
export function resolveCategoryHe(
  category_he: string | null | undefined,
  category_ar: string | null | undefined
): string {
  const he = (category_he || '').trim();
  if (he) return normalizeCategoryHe(he);
  const ar = (category_ar || '').trim();
  if (ar && looksLikeHebrew(ar)) return normalizeCategoryHe(ar);
  return '';
}
