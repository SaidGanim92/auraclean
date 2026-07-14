/* ==========================================================================
   data.js – שכבת נתונים
   שליפת מוצרים מגיליון Google Sheets שפורסם (gviz, ללא מפתח API),
   עם גיבוי מובנה בקוד אם הגיליון לא נטען.
   ========================================================================== */

/* =======================================================================
   ⚙️  הגדרות למילוי בעל האתר  (עדכנו את הערכים כאן)
   ======================================================================= */
const CONFIG = {
  // מזהה הגיליון: מ-URL של Google Sheets בין /d/ ל-/edit
  SHEET_ID: '[SHEET_ID]',
  // שם הגיליון (הטאב) עם המוצרים
  SHEET_NAME: 'products',
  // מספר וואטסאפ בפורמט בינלאומי (ללא + וללא רווחים)
  WHATSAPP_NUMBER: '972502073111',
  // דמי משלוח קבועים (בתוך מאגר בלבד)
  SHIPPING_FEE: 20,
};
/* ======================================================================= */

/* ----- גיבוי: קטלוג הדגמה דו-לשוני (עולה אם הגיליון לא נטען) ----- */
const BACKUP_PRODUCTS = [
  { id: 'p01', name_he: 'אקונומיקה מרוכזת 4 ליטר', name_ar: 'كلور مركّز 4 لتر',
    category_he: 'חומרי חיטוי', category_ar: 'مواد التعقيم', price: 18,
    desc_he: 'אקונומיקה חזקה לחיטוי וניקוי משטחים, ריח רענן.', desc_ar: 'كلور قويّ لتعقيم وتنظيف الأسطح، برائحة منعشة.',
    image: '', available: true, unit: 'ל־4 ליטר', on_sale: false, sale_price: '', featured: true },

  { id: 'p02', name_he: 'מרכך כביסה פרימיום 4 ליטר', name_ar: 'منعّم غسيل ممتاز 4 لتر',
    category_he: 'כביסה', category_ar: 'الغسيل', price: 32,
    desc_he: 'מרכך מרוכז עם ניחוח עמיד לאורך זמן.', desc_ar: 'منعّم مركّز بعطر يدوم طويلًا.',
    image: '', available: true, unit: 'ל־4 ליטר', on_sale: true, sale_price: 24, featured: true },

  { id: 'p03', name_he: 'ג\'ל כביסה 3 ב-1 (60 מנות)', name_ar: 'جل غسيل 3×1 (60 غسلة)',
    category_he: 'כביסה', category_ar: 'الغسيل', price: 45,
    desc_he: 'ניקוי, הלבנה ושמירה על הצבע במנה אחת.', desc_ar: 'تنظيف وتبييض وحفاظ على اللون بجرعة واحدة.',
    image: '', available: true, unit: 'לאריזה', on_sale: false, sale_price: '', featured: false },

  { id: 'p04', name_he: 'נוזל כלים לימון 1 ליטר', name_ar: 'سائل جلي بالليمون 1 لتر',
    category_he: 'מטבח', category_ar: 'المطبخ', price: 12,
    desc_he: 'מסיר שומנים ביעילות, עדין לידיים.', desc_ar: 'يزيل الدهون بفعّاليّة، لطيف على اليدين.',
    image: '', available: true, unit: 'לליטר', on_sale: false, sale_price: '', featured: false },

  { id: 'p05', name_he: 'ספריי לניקוי מטבח וסילוק שומן', name_ar: 'بخّاخ تنظيف المطبخ ومزيل الدهون',
    category_he: 'מטבח', category_ar: 'المطبخ', price: 16,
    desc_he: 'מפרק שומן שרוף משטחים, כיריים ותנור.', desc_ar: 'يفكّك الدهون المحترقة عن الأسطح والموقد والفرن.',
    image: '', available: true, unit: 'ל־750 מ״ל', on_sale: true, sale_price: 11.90, featured: true },

  { id: 'p06', name_he: 'מסיר אבנית לאסלה 750 מ״ל', name_ar: 'مزيل الكلس للمرحاض 750 مل',
    category_he: 'חדר אמבטיה', category_ar: 'الحمّام', price: 14,
    desc_he: 'ג\'ל צמיג נצמד לדפנות ומסיר אבנית וכתמים.', desc_ar: 'جل لزج يلتصق بالجدران ويزيل الكلس والبقع.',
    image: '', available: true, unit: 'ל־750 מ״ל', on_sale: false, sale_price: '', featured: false },

  { id: 'p07', name_he: 'ספריי לניקוי אמבטיה נגד אבנית', name_ar: 'بخّاخ تنظيف الحمّام ضدّ الكلس',
    category_he: 'חדר אמבטיה', category_ar: 'الحمّام', price: 15,
    desc_he: 'מבריק אריחים, ברזים ומקלחונים.', desc_ar: 'يلمّع البلاط والحنفيّات وكابينة الدش.',
    image: '', available: false, unit: 'ל־750 מ״ל', on_sale: false, sale_price: '', featured: false },

  { id: 'p08', name_he: 'מטהר אוויר מפיץ ריח 3 יח\'', name_ar: 'معطّر جوّ ناشر رائحة 3 قطع',
    category_he: 'ריח וטיהור', category_ar: 'العطور والتعطير', price: 22,
    desc_he: 'ניחוח נעים ומתמשך לבית ולמשרד.', desc_ar: 'عطر لطيف ومستمرّ للبيت والمكتب.',
    image: '', available: true, unit: 'לשלישייה', on_sale: false, sale_price: '', featured: false },

  { id: 'p09', name_he: 'מגבוני חיטוי רב-תכליתיים (100)', name_ar: 'مناديل تعقيم متعدّدة (100)',
    category_he: 'חומרי חיטוי', category_ar: 'مواد التعقيم', price: 13,
    desc_he: 'מגבונים לחים לחיטוי מהיר של משטחים.', desc_ar: 'مناديل مبلّلة لتعقيم سريع للأسطح.',
    image: '', available: true, unit: 'לאריזה', on_sale: true, sale_price: 9.50, featured: false },

  { id: 'p10', name_he: 'סבון ידיים אנטיבקטריאלי 500 מ״ל', name_ar: 'صابون يدين مضادّ للبكتيريا 500 مل',
    category_he: 'טיפוח וניקיון אישי', category_ar: 'العناية والنظافة الشخصيّة', price: 9,
    desc_he: 'מנקה ומרכך את העור עם משאבה נוחה.', desc_ar: 'ينظّف ويرطّب البشرة مع مضخّة مريحة.',
    image: '', available: true, unit: 'ל־500 מ״ל', on_sale: false, sale_price: '', featured: false },

  { id: 'p11', name_he: 'שמפו לרכב 1 ליטר', name_ar: 'شامبو للسيّارة 1 لتر',
    category_he: 'כללי ורצפות', category_ar: 'عامّ وأرضيّات', price: 20,
    desc_he: 'קצף עשיר לניקוי הרכב ללא שריטות.', desc_ar: 'رغوة غنيّة لتنظيف السيّارة دون خدوش.',
    image: '', available: true, unit: 'לליטר', on_sale: false, sale_price: '', featured: false },

  { id: 'p12', name_he: 'מגב רצפה עם ידית טלסקופית', name_ar: 'ممسحة أرضيّات بمقبض قابل للتمديد',
    category_he: 'כלים ואביזרים', category_ar: 'أدوات وملحقات', price: 35,
    desc_he: 'מגב איכותי עם גב ספוג להברקת רצפות.', desc_ar: 'ممسحة عالية الجودة بإسفنجة لتلميع الأرضيّات.',
    image: '', available: true, unit: 'ליחידה', on_sale: false, sale_price: '', featured: true },

  { id: 'p13', name_he: 'סט מטליות מיקרופייבר (5)', name_ar: 'طقم مماسح ميكروفايبر (5)',
    category_he: 'כלים ואביזרים', category_ar: 'أدوات وملحقات', price: 19,
    desc_he: 'סופגות ומבריקות ללא סימני מים.', desc_ar: 'ماصّة وملمّعة دون آثار ماء.',
    image: '', available: true, unit: 'לסט', on_sale: false, sale_price: '', featured: false },

  { id: 'p14', name_he: 'נוזל לניקוי רצפות ריח לבנדר 2 ליטר', name_ar: 'سائل تنظيف الأرضيّات برائحة اللافندر 2 لتر',
    category_he: 'כללי ורצפות', category_ar: 'عامّ وأرضيّات', price: 21,
    desc_he: 'מנקה ומותיר ניחוח לבנדר רענן.', desc_ar: 'ينظّف ويترك عطر لافندر منعشًا.',
    image: '', available: true, unit: 'ל־2 ליטר', on_sale: true, sale_price: 15, featured: false },

  { id: 'p15', name_he: 'אבקת כביסה 9 ק״ג', name_ar: 'مسحوق غسيل 9 كغم',
    category_he: 'כביסה', category_ar: 'الغسيل', price: 55,
    desc_he: 'אריזה משפחתית חסכונית לכל סוגי הכביסה.', desc_ar: 'عبوة عائليّة اقتصاديّة لكلّ أنواع الغسيل.',
    image: '', available: true, unit: 'ל־9 ק״ג', on_sale: false, sale_price: '', featured: false },

  { id: 'p16', name_he: 'כפפות ניקיון רב-פעמיות (זוג)', name_ar: 'قفّازات تنظيف قابلة لإعادة الاستخدام (زوج)',
    category_he: 'כלים ואביזרים', category_ar: 'أدوات وملحقات', price: 8,
    desc_he: 'הגנה על הידיים בעבודות ניקיון.', desc_ar: 'حماية لليدين أثناء أعمال التنظيف.',
    image: '', available: true, unit: 'לזוג', on_sale: false, sale_price: '', featured: false },

  { id: 'p17', name_he: 'ניקוי זכוכית וחלונות 750 מ״ל', name_ar: 'منظّف زجاج ونوافذ 750 مل',
    category_he: 'כללי ורצפות', category_ar: 'عامّ وأرضيّات', price: 12,
    desc_he: 'ברק ללא פסים לזכוכית ומראות.', desc_ar: 'لمعان دون خطوط للزجاج والمرايا.',
    image: '', available: true, unit: 'ל־750 מ״ל', on_sale: false, sale_price: '', featured: false },

  { id: 'p18', name_he: 'שקיות אשפה מבושמות 60 ליטר (50)', name_ar: 'أكياس قمامة معطّرة 60 لتر (50)',
    category_he: 'כלים ואביזרים', category_ar: 'أدوات وملحقات', price: 17,
    desc_he: 'עמידות וחזקות, עם ניחוח נעים.', desc_ar: 'متينة وقويّة، بعطر لطيف.',
    image: '', available: true, unit: 'לגליל', on_sale: false, sale_price: '', featured: false },
];

/* ----- המרת ערכי בוליאן מהגיליון ----- */
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'כן' || s === 'yes' || s === '1' || s === 'نعم';
}

function toNum(v) {
  if (v === '' || v == null) return '';
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return isNaN(n) ? '' : n;
}

/* ----- נירמול שורת מוצר לפורמט אחיד ----- */
function normalizeProduct(row) {
  return {
    id: String(row.id || '').trim(),
    name_he: row.name_he || '', name_ar: row.name_ar || row.name_he || '',
    category_he: row.category_he || '', category_ar: row.category_ar || row.category_he || '',
    price: toNum(row.price) || 0,
    desc_he: row.desc_he || '', desc_ar: row.desc_ar || row.desc_he || '',
    image: row.image || '',
    available: toBool(row.available),
    unit: row.unit || '',
    on_sale: toBool(row.on_sale),
    sale_price: toNum(row.sale_price),
    featured: toBool(row.featured),
  };
}

/* ----- פרסור תשובת gviz של Google Sheets ----- */
function parseGviz(text) {
  // gviz עוטף את ה-JSON: google.visualization.Query.setResponse({...});
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('gviz: מבנה לא צפוי');
  const json = JSON.parse(text.substring(start, end + 1));
  const cols = json.table.cols.map(c => (c.label || c.id || '').trim());
  const rows = json.table.rows.map(r => {
    const obj = {};
    (r.c || []).forEach((cell, i) => {
      const key = cols[i];
      if (key) obj[key] = cell ? (cell.v != null ? cell.v : '') : '';
    });
    return obj;
  });
  return rows;
}

/* ----- שליפת מוצרים (עם גיבוי) -----
   מחזיר Promise למערך מוצרים מנורמל. אף פעם לא זורק – נופל לגיבוי. */
async function fetchProducts() {
  const id = CONFIG.SHEET_ID;
  // אם לא הוגדר מזהה גיליון – ישר לגיבוי
  if (!id || id.includes('[') ) {
    console.warn('AURA CLEAN: SHEET_ID לא הוגדר – נטען קטלוג הגיבוי המובנה.');
    return BACKUP_PRODUCTS.map(normalizeProduct);
  }
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseGviz(text);
    const products = rows.map(normalizeProduct).filter(p => p.id && (p.name_he || p.name_ar));
    if (!products.length) throw new Error('הגיליון ריק');
    return products;
  } catch (err) {
    console.warn('AURA CLEAN: טעינת הגיליון נכשלה, נטען קטלוג הגיבוי.', err);
    return BACKUP_PRODUCTS.map(normalizeProduct);
  }
}

/* ----- עזרים לשפה פעילה ----- */
function pName(p) { return currentLang === 'ar' ? (p.name_ar || p.name_he) : (p.name_he || p.name_ar); }
function pCat(p) { return currentLang === 'ar' ? (p.category_ar || p.category_he) : (p.category_he || p.category_ar); }
function pDesc(p) { return currentLang === 'ar' ? (p.desc_ar || p.desc_he) : (p.desc_he || p.desc_ar); }

/* מחיר אפקטיבי (בהתחשב במבצע) */
function effectivePrice(p) {
  return (p.on_sale && p.sale_price) ? p.sale_price : p.price;
}

/* ----- תמונת מוצר: URL, קובץ מ-images/, או placeholder צבעוני ----- */
function productImage(p) {
  const img = (p.image || '').trim();
  if (img) {
    if (/^https?:\/\//i.test(img)) return img;
    return 'images/' + img.replace(/^\/?images\//, '');
  }
  return placeholderImage(p);
}

/* placeholder כ-SVG data URI עם גוון לפי קטגוריה ושם המוצר */
const PLACEHOLDER_COLORS = ['#5B93D6', '#C85A9E', '#E8913C', '#3E74B8', '#B23F86', '#C9761F'];
function placeholderImage(p) {
  const name = pName(p) || 'AURA CLEAN';
  let hash = 0;
  for (let i = 0; i < (p.id || name).length; i++) hash = ((p.id || name).charCodeAt(i) + hash * 31) >>> 0;
  const c1 = PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
  const c2 = PLACEHOLDER_COLORS[(hash + 2) % PLACEHOLDER_COLORS.length];
  const label = name.length > 22 ? name.slice(0, 21) + '…' : name;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='400' height='400' fill='url(#g)' opacity='0.16'/>` +
    `<circle cx='200' cy='168' r='96' fill='url(#g)' opacity='0.5'/>` +
    `<circle cx='232' cy='140' r='16' fill='#ffffff' opacity='0.6'/>` +
    `<circle cx='168' cy='196' r='9' fill='#ffffff' opacity='0.45'/>` +
    `<text x='200' y='330' font-family='Assistant, Cairo, sans-serif' font-size='22' font-weight='700' ` +
    `fill='#14203A' text-anchor='middle'>${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
