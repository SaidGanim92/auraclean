import 'server-only';
import { looksLikeHebrew } from '@/lib/lang-detect';
import { categoryArabic } from '@/lib/category-ar';
import { translateProductName, translateCategoryName } from '@/lib/translate/product-he-ar';

/**
 * מודול תרגום ניטרלי-ספק (HE→AR).
 * שמות מוצרים: מילון מותגים + מונחי ניקיון (לא Google גולמי — מונע תרגומים מצחיקים).
 * תיאורים: Google החינמי, עם אותה הגנה מפני החזרת עברית.
 */

type Provider = 'google' | 'deepl' | '';

function getProvider(): Provider {
  return (process.env.TRANSLATE_PROVIDER || '').toLowerCase() as Provider;
}

/** תרגום שם מוצר / קטגוריה — מילון קודם, ואז fallback רק לשאריות */
export async function translateNameToArabic(text: string | null | undefined): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';
  try {
    const out = await translateProductName(src, freeGoogleTranslate);
    if (!out || looksLikeHebrew(out)) return '';
    return out;
  } catch (err) {
    console.warn('AURA CLEAN: תרגום שם נכשל.', err);
    return '';
  }
}

export async function translateCategoryToArabic(text: string | null | undefined): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';
  const dict = categoryArabic(src);
  if (dict) return dict;
  try {
    const out = await translateCategoryName(src, freeGoogleTranslate);
    if (!out || looksLikeHebrew(out)) return '';
    return out;
  } catch {
    return '';
  }
}

/** תרגום מחרוזת בודדת HE→AR (לתיאורים). מחזיר '' אם נכשל / התוצאה עדיין בעברית. */
export async function translateToArabic(text: string | null | undefined): Promise<string> {
  const src = (text || '').trim();
  if (!src) return '';
  const key = process.env.TRANSLATE_API_KEY;
  const provider = getProvider();

  try {
    let out = '';
    if (provider === 'google' && key) out = await googleTranslate(src, key);
    else if (provider === 'deepl' && key) out = await deeplTranslate(src, key);
    else out = await freeGoogleTranslate(src);

    const cleaned = (out || '').trim();
    if (!cleaned || cleaned === src || looksLikeHebrew(cleaned)) {
      console.warn('AURA CLEAN: תרגום החזיר עברית/מקור — לא נשמר כערבית.');
      return '';
    }
    return cleaned;
  } catch (err) {
    console.warn('AURA CLEAN: תרגום נכשל.', err);
  }
  return '';
}

// ----- תרגום חינמי בלי מפתח (נקודת הקצה הציבורית של Google Translate) -----
async function freeGoogleTranslate(text: string): Promise<string> {
  // גוגל מגביל אורך שאילתה בנתיב הזה; מפצלים למקטעים בטוחים ומאחדים בחזרה.
  const chunks = splitForTranslation(text, 1800);
  const translated = await Promise.all(chunks.map((c) => freeGoogleTranslateChunk(c)));
  return translated.join('');
}

function splitForTranslation(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('\n', maxLen);
    if (cut < maxLen * 0.5) cut = rest.lastIndexOf(' ', maxLen);
    if (cut < 1) cut = maxLen;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest) parts.push(rest);
  return parts;
}

async function freeGoogleTranslateChunk(text: string): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=he&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; AuraCleanBot/1.0)' },
    // מיועד לטיוטה בלבד — אין צורך במטמון ארוך; קריאה חייה בכל תרגום.
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Free Google Translate ${res.status}`);
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  const joined = segments.map((seg: any) => seg?.[0] || '').join('');
  return joined || text;
}

/** תרגום נוח למספר שדות בבת אחת */
export async function translateFields<T extends Record<string, string | null | undefined>>(
  fields: T
): Promise<Record<keyof T, string>> {
  const entries = Object.entries(fields);
  const results = await Promise.all(entries.map(([, v]) => translateToArabic(v)));
  const out = {} as Record<keyof T, string>;
  entries.forEach(([k], i) => {
    out[k as keyof T] = results[i];
  });
  return out;
}

// ----- Google Cloud Translation v2 (REST, מפתח API) -----
async function googleTranslate(text: string, key: string): Promise<string> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'he', target: 'ar', format: 'text' }),
    }
  );
  if (!res.ok) throw new Error(`Google Translate ${res.status}`);
  const data = await res.json();
  return data?.data?.translations?.[0]?.translatedText || text;
}

// ----- DeepL (Free/Pro) -----
async function deeplTranslate(text: string, key: string): Promise<string> {
  // מפתחות ה-Free מסתיימים ב-:fx ומשתמשים ב-api-free
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const res = await fetch(`https://${host}/v2/translate`, {
    method: 'POST',
    headers: {
      authorization: `DeepL-Auth-Key ${key}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ text, source_lang: 'HE', target_lang: 'AR' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}`);
  const data = await res.json();
  return data?.translations?.[0]?.text || text;
}
