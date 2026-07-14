import { CATEGORY_LABEL_HE, normalizeCategoryHe } from '@/lib/category-ar';

export type CategoryKey = keyof typeof CATEGORY_LABEL_HE;

/** כלל סיווג — ציון גבוה = התאמה חזקה יותר */
type Rule = { re: RegExp; score: number };

const RULES: Record<CategoryKey, Rule[]> = {
  'כביסה וטיפוח בדים': [
    { re: /מרכך\s*כביס/i, score: 90 },
    { re: /כביסה|לכביסה|בכביסה|מכונת\s*כביס/i, score: 70 },
    { re: /אבקת\s*כביס|ג['']?ל\s*כביס|נוזל\s*כביס/i, score: 85 },
    { re: /מלבין|מסיר\s*כתמ|כתמים\s*עקשנ/i, score: 75 },
    { re: /מחטא\s*(?:ב)?גדים|חיטוי\s*בגד/i, score: 80 },
    { re: /תוסף\s*כביס|כביס\s*ול/i, score: 70 },
    { re: /softener|laundry/i, score: 65 },
    { re: /מבשם\s*בדים|מרסס\s*דאודורנט\s*לטקסטיל|דאודורנט\s*לטקסטיל/i, score: 85 },
    { re: /בדים|טקסטיל|מצע/i, score: 40 },
  ],
  'מטבח וכלים': [
    { re: /נוזל\s*כלים|סבון\s*כלים|כלי\s*כלים/i, score: 90 },
    { re: /לכלים|שטיפת\s*כלים|מדיח/i, score: 75 },
    { re: /שומן\s*(?:ומזון|מטבח)|שאריות\s*מזון/i, score: 70 },
    { re: /ספוגit|sponge.*dish|fairy/i, score: 55 },
    { re: /מטבח/i, score: 35 },
  ],
  'רצפות ושטיחים': [
    { re: /נוזל\s*רצפ|לרצפות|ניקוי\s*רצפ|מנקה\s*רצפ/i, score: 90 },
    { re: /רצפ(?:ה|ות)|parquet|parquet/i, score: 65 },
    { re: /שטיח(?:ים|ון)?|carpet|rug/i, score: 70 },
    { re: /מטלית\s*(?:ל)?רצפ|מגב\s*רצפ/i, score: 80 },
    { re: /floor\s*clean/i, score: 60 },
  ],
  'מקלחת ושירותים': [
    { re: /ג['']?ל\s*אסל|אסלות|לאסל/i, score: 95 },
    { re: /אסלה|שירותים|wc\b|toilet/i, score: 85 },
    { re: /אמבט(?:יה|)?|מקלחת|חדר(?:י)?\s*רחצ/i, score: 75 },
    { re: /אבנית|עובש|פטר/i, score: 70 },
    { re: /אנטי.?קalk|קalk/i, score: 65 },
    { re: /חיטול(?:ית)?\s*(?:אמבט|שירות)/i, score: 80 },
    { re: /קרמיקה\s*מחוספס|וקס\s*פיח/i, score: 60 },
    { re: /סבון\s*יד(?:יים)?(?!\s*כלים)/i, score: 45 },
  ],
  'מטהרי אוויר וריחות': [
    { re: /מטהר\s*אוויר|בושם\s*אוויר|מטהר(?:י)?\s*אויר/i, score: 95 },
    { re: /מטהר(?:י)?\s*(?:אוויר|חדר)|ריח\s*נעים|ניחוח/i, score: 75 },
    { re: /air\s*fresh|aroma|fragrance/i, score: 65 },
    { re: /מסיר\s*עש(?:an)?/i, score: 70 },
  ],
  'נייר וחד פעמי': [
    { re: /נייר\s*טואלט|טיש|Tork|toilet\s*paper/i, score: 90 },
    { re: /מגב(?:י)?\s*כף|מפיות|נייר\s*מג/i, score: 85 },
    { re: /מזלג|סכ"כ|כף\s*חד|סכין\s*חד/i, score: 88 },
    { re: /גליל(?:ים)?\s*נייר|נייר\s*עד/i, score: 75 },
    { re: /כפפות\s*חד|צלחות\s*חד|כוסות\s*חד/i, score: 80 },
    { re: /חד.?פעמי|disposable/i, score: 60 },
    { re: /שק(?:י)?\s*אשפ/i, score: 55 },
  ],
  'מטליות, ספוגים ומגבונים': [
    { re: /מגבון(?:ים|ות)?|מגבונים|דלי\s*מטליות|מטליות\s*לח/i, score: 88 },
    { re: /מגבונים\s*(?:ל)?(?:חיטוי|ניקוי|שומן|הסר)/i, score: 92 },
    { re: /padsag|pad\s*sag|ספוג(?:ית|יות)/i, score: 95 },
    { re: /מטלית(?:ים|ות)?|ספוג(?:ית|יות|ים)?|microfiber|מיקרו/i, score: 70 },
    { re: /וויפ|wipe(?!\s*out)/i, score: 60 },
    { re: /ג['']?רזי|jersey|padsag|pad\s*sag/i, score: 55 },
    { re: /סponex|ספונג/i, score: 65 },
  ],
  'אביזרי ניקיון': [
    { re: /tyroler|טיירול|טירולר/i, score: 85 },
    { re: /(?:tyroler|טירולר).{0,30}מטליט|מטליט.{0,20}(?:מבריק|tyroler|טירולר)/i, score: 98 },
    { re: /מבריקן|מיני\s*מבריק|מטליות\s*ל(?:מבריק|מבר)/i, score: 82 },
    { re: /דלי\s*(?:הפלא|טורבו|מגב|ניקוי)/i, score: 78 },
    { re: /מגב\s*(?:חלון|זכוכית|לאסל)(?!\s*(?:נוזל|תרסיס))/i, score: 75 },
    { re: /מטאט|יעה|מגבה/i, score: 70 },
    { re: /מגרד|scraper|squeegee/i, score: 70 },
    { re: /דלי\s*(?!מטליות)|מעמד\s*ל(?:מגב|מטל)/i, score: 55 },
    { re: /מברש(?:ה|ת)(?!\s*(?:שיניים|שיער))/i, score: 60 },
    { re: /מערכת\s*מגב|ידית\s*\+|מקל\s*ניר/i, score: 75 },
  ],
  'חלונות וזכוכית': [
    { re: /הברק(?:ה|)|ברק\s*ל/i, score: 85 },
    { re: /חלונ(?:ות|)|זכוכית|mirror|stainless|נירוסט/i, score: 80 },
    { re: /shine|polish|תרסיס\s*.*חלון/i, score: 75 },
    { re: /ניקוי\s*חלונ/i, score: 70 },
  ],
  'ניקיון כללי ומשטחים': [
    { re: /ניקוי\s*כללי|לניקוי\s*כללי|רב\s*שימוש|אוניברסלי|multi/i, score: 80 },
    { re: /חיטוי|מחטא|desinf|דזיטול|sanitol|סנטול/i, score: 55 },
    { re: /תרסיס\s*(?:כללי|ניקוי)|כל\s*משטח|משטח/i, score: 50 },
    { re: /אלcohol|70%|99%/i, score: 40 },
    { re: /חITול\s*יד|אל\s*סבון/i, score: 35 },
  ],
};

const LIQUID = /נוזל|תרסיס|ג['']?ל|אבקה|ספרי|מרכך|חומר|מסיר|מנק/i;
const TOOL = /מגב|ידית|מברשת|דלי|מגרד|מתקן|מערכת|tyroler|טיירול/i;

/** מוריד ציון לקטגוריית אביזרים כשמדובר בנוזל/תרסיס/מגבון */
function toolPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'אביזרי ניקיון') return score;
  if (/מגבון|מטלית|ספוג|מטהר\s*א/i.test(text)) return score * 0.15;
  if (LIQUID.test(text) && !TOOL.test(text)) return score * 0.25;
  return score;
}

/** מוריד ציון למטהרים כשמדובר בניקוי רצפות עם בושם */
function freshenerPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'מטהרי אוויר וריחות') return score;
  if (/רצפ|floor|מנקה\s*רצפ|נוזל\s*רצפ/i.test(text)) return score * 0.2;
  if (/ניקוי\s*כללי|רב\s*שימוש|אוניברסלי/i.test(text)) return score * 0.35;
  if (/דלי\s*מטליות|מגבון/i.test(text)) return score * 0.15;
  return score;
}

/** מוריד ציון לרצפות כשמדובר בדלי/אביזר */
function floorPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'רצפות ושטיחים') return score;
  if (/מבריקן|מטאט|יעה|דלי|טורבו|tyroler|טירולר/i.test(text)) return score * 0.25;
  return score;
}
/** מוריד ציון למטליות כשזו מטלית רצפות */
function clothPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'מטליות, ספוגים ומגבונים') return score;
  if (/רצפ|שטיח|floor/i.test(text)) return score * 0.3;
  if (/נייר|טואלט|מגב\s*כף/i.test(text)) return score * 0.2;
  return score;
}

/** מוריד ציון לאמבטיה כשמדובר בספוג/מטלית */
function bathroomPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'מקלחת ושירותים') return score;
  if (/ספוג|padsag|pad\s*sag|מגבון|מטלית\s*מיקר/i.test(text)) return score * 0.25;
  return score;
}

/** מוריד ציון להברקה כשמדובר בכלי מבריקן */
function polishPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'חלונות וזכוכית') return score;
  if (/טירולר|tyroler|מבריקן(?!\s*(?:נוזל|תרסיס|חומר))/i.test(text) && !/חלון|זכוכית|shine/i.test(text)) {
    return score * 0.2;
  }
  if (/ניקוי\s*כללי|אוניברסלי|רב\s*שימוש/i.test(text) && !/חלון|זכוכית|הברק|mirror/i.test(text)) {
    return score * 0.4;
  }
  return score;
}

/** מוריד ציון לכביסה כשמדובר במטלית/אביזר ניקוי */
function laundryPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'כביסה וטיפוח בדים') return score;
  if (/tyroler|טירולר|מבריקן|מטליט\s*ל(?:מבריק|מבר)|ספוג|padsag/i.test(text)) return score * 0.15;
  if (/מטלית|מטליות|מגבון/i.test(text) && !/כביס|מרכך|מלבין|מבשם\s*בד/i.test(text)) {
    return score * 0.3;
  }
  return score;
}

/** מוריד ציון לחד-פעמי כשמדובר בספוג/מגבון */
function disposablePenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'נייר וחד פעמי') return score;
  if (/padsag|pad\s*sag|ספוג|מגבון|מטלית\s*מיקר/i.test(text)) return score * 0.2;
  return score;
}

/** מוריד ציון לכללי כשמדובר במגבונים */
function generalClothPenalty(text: string, category: CategoryKey, score: number): number {
  if (category !== 'ניקיון כללי ומשטחים') return score;
  if (/מגבון|מגבונים|מטלית\s*לח|דלי\s*מטליות/i.test(text)) return score * 0.2;
  return score;
}

/** מוריד ציון לכללי כשיש התאמה ספציפית חזקה */
function generalPenalty(scores: Record<string, number>, category: CategoryKey, score: number): number {
  if (category !== 'ניקיון כללי ומשטחים') return score;
  const others = Object.entries(scores)
    .filter(([k]) => k !== category)
    .map(([, v]) => v);
  const maxOther = Math.max(0, ...others);
  if (maxOther >= 50) return score * 0.5;
  return score;
}

export interface ClassifyInput {
  name_he: string;
  desc_he?: string | null;
  category_he?: string | null;
}

export interface ClassifyResult {
  category: CategoryKey;
  confidence: number;
  scores: Partial<Record<CategoryKey, number>>;
}

/**
 * מסווג מוצר לקטגוריה לפי שם + תיאור.
 * שם מקבל משקל כפול; תיאור מחזק התאמות ספציפיות.
 */
export function classifyProduct(input: ClassifyInput): ClassifyResult {
  const name = (input.name_he || '').trim();
  const desc = (input.desc_he || '').trim();
  const text = `${name} ${desc}`.replace(/\s+/g, ' ');
  const nameText = name.replace(/\s+/g, ' ');

  const scores = {} as Record<CategoryKey, number>;

  for (const [cat, rules] of Object.entries(RULES) as [CategoryKey, Rule[]][]) {
    let total = 0;
    for (const { re, score } of rules) {
      if (re.test(nameText)) total += score * 2;
      if (desc && re.test(desc)) total += score;
    }
    total = toolPenalty(text, cat, total);
    total = clothPenalty(text, cat, total);
    total = floorPenalty(text, cat, total);
    scores[cat] = total;
  }

  for (const cat of Object.keys(scores) as CategoryKey[]) {
    scores[cat] = generalPenalty(scores, cat, scores[cat]);
    scores[cat] = generalClothPenalty(text, cat, scores[cat]);
    scores[cat] = freshenerPenalty(text, cat, scores[cat]);
    scores[cat] = bathroomPenalty(text, cat, scores[cat]);
    scores[cat] = laundryPenalty(text, cat, scores[cat]);
    scores[cat] = disposablePenalty(text, cat, scores[cat]);
    scores[cat] = polishPenalty(text, cat, scores[cat]);
  }

  const ranked = (Object.entries(scores) as [CategoryKey, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  const best = ranked[0];
  const second = ranked[1];

  if (!best || best[1] < 25) {
    const fallback = normalizeCategoryHe(input.category_he) as CategoryKey;
    if (fallback && fallback in CATEGORY_LABEL_HE) {
      return { category: fallback, confidence: 0, scores };
    }
    return { category: 'ניקיון כללי ומשטחים', confidence: 0, scores };
  }

  const gap = second ? best[1] - second[1] : best[1];
  const confidence = Math.min(100, Math.round((best[1] / 180) * 100 + gap / 3));

  return { category: best[0], confidence, scores };
}
