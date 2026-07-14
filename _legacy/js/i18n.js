/* ==========================================================================
   i18n.js – ניהול דו-לשוניות (עברית / ערבית), זיהוי והחלפת שפה
   שתי השפות הן RTL: dir נשאר "rtl" תמיד, רק lang משתנה.
   ========================================================================== */

/* מפתח שמירה ב-localStorage */
const LANG_KEY = 'auraclean_lang';

/* ----- מילון תרגומי ממשק ----- */
const I18N = {
  he: {
    dir: 'rtl',
    langName: 'עברית',
    brand_local: 'אורה קלין · מוצרי ניקיון',
    nav_home: 'דף הבית',
    nav_catalog: 'קטלוג',
    nav_contact: 'צור קשר',
    open_cart: 'פתיחת סל הקניות',
    open_menu: 'תפריט',
    accessibility_menu: 'תפריט נגישות',
    skip_to_content: 'דלג לתוכן הראשי',

    hero_title: 'מוצרי ניקיון איכותיים — עד הבית',
    hero_sub: 'קטלוג מלא של חומרי ניקוי, כלים ואביזרים. מזמינים בכמה קליקים וסוגרים בוואטסאפ.',
    hero_cta: 'לצפייה בקטלוג',
    hero_badge_delivery: 'משלוח בתוך מאגר — 20 ₪',
    hero_badge_nomin: 'ללא מינימום הזמנה',
    hero_badge_pay: 'תשלום במזומן או ביט',

    search_placeholder: 'חיפוש מוצר…',
    all_categories: 'הכל',
    brands_title: 'המותגים שאנחנו עובדים איתם',
    featured_title: 'מוצרים מומלצים',
    catalog_title: 'הקטלוג שלנו',
    loading: 'טוען מוצרים…',
    no_results: 'לא נמצאו מוצרים תואמים.',
    empty_catalog: 'אין מוצרים להצגה כרגע.',

    add_to_cart: 'הוסף לסל',
    out_of_stock: 'אזל מהמלאי',
    tag_sale: 'מבצע',
    tag_featured: 'מומלץ',
    unit_prefix: 'ל־',
    currency: '₪',

    cart_title: 'סל הקניות',
    cart_empty: 'הסל שלך ריק',
    cart_empty_cta: 'למעבר לקטלוג',
    close: 'סגירה',
    remove: 'הסרה',
    qty: 'כמות',
    subtotal: 'סכום מוצרים',
    shipping: 'משלוח (מאגר)',
    shipping_note: 'משלוח בתוך מאגר בלבד',
    total: 'סה"כ לתשלום',
    checkout_title: 'פרטים למשלוח',
    payment_info: 'תשלום: מזומן במסירה או ביט (אין סליקה באתר).',

    f_name: 'שם מלא',
    f_phone: 'טלפון',
    f_address: 'כתובת (במאגר)',
    f_notes: 'הערות (לא חובה)',
    required: 'שדה חובה',
    err_name: 'נא להזין שם מלא',
    err_phone: 'נא להזין מספר טלפון תקין',
    err_address: 'נא להזין כתובת למשלוח',
    err_consent: 'יש לאשר את מדיניות הפרטיות והתקנון',
    consent_label: 'קראתי ואני מאשר/ת את',
    consent_privacy: 'מדיניות הפרטיות',
    consent_and: 'ו',
    consent_terms: 'התקנון',
    send_whatsapp: 'שליחת הזמנה בוואטסאפ',

    /* עמוד מוצר */
    back_to_catalog: 'חזרה לקטלוג',
    product_not_found: 'המוצר לא נמצא.',
    description: 'תיאור',
    perfect_route: 'המסלול המושלם',
    same_category: 'מוצרים מאותה קטגוריה',
    all_cats_links: 'כל הקטגוריות',
    availability: 'זמינות',
    in_stock: 'במלאי',

    /* Footer */
    footer_about_title: 'AURA CLEAN',
    footer_about: 'חנות מוצרי ניקיון במאגר. הזמנות ומשלוחים מקומיים בוואטסאפ.',
    footer_quick_order: 'הזמנה מהירה בוואטסאפ',
    footer_links_title: 'מידע ומדיניות',
    footer_contact_title: 'יצירת קשר',
    cookie_settings: 'הגדרות עוגיות',
    link_terms: 'תקנון ותנאי שימוש',
    link_privacy: 'מדיניות פרטיות',
    link_accessibility: 'הצהרת נגישות',
    link_shipping: 'משלוחים והחזרות',
    link_contact: 'צור קשר',
    rights: 'כל הזכויות שמורות',

    /* עוגיות */
    cookie_text: 'אנו משתמשים בעוגיות ובכלי מדידה/פרסום (כגון Meta Pixel) כדי לשפר את השירות והפרסום. כלים אלו יופעלו רק לאחר אישורך.',
    cookie_more: 'למדיניות הפרטיות',
    cookie_accept: 'אישור',
    cookie_reject: 'דחייה',
    cookie_saved_accept: 'אישרת שימוש בעוגיות מדידה/פרסום.',
    cookie_saved_reject: 'בחרת לדחות עוגיות מדידה/פרסום.',

    /* נגישות */
    a11y_title: 'הגדרות נגישות',
    a11y_font: 'גודל גופן',
    a11y_font_desc: 'הגדלת או הקטנת הטקסט',
    a11y_contrast: 'ניגודיות גבוהה',
    a11y_contrast_desc: 'שחור-לבן בניגודיות מרבית',
    a11y_links: 'הדגשת קישורים',
    a11y_links_desc: 'קו תחתון והדגשה לכל הקישורים',
    a11y_anim: 'כיבוי אנימציה',
    a11y_anim_desc: 'עצירת בועות הרקע ותנועות',
    a11y_reset: 'איפוס הגדרות',
    decrease: 'הקטן', increase: 'הגדל', reset: 'אפס',
    on: 'פעיל', off: 'כבוי',

    /* הודעת וואטסאפ */
    wa_greeting: 'שלום, אשמח להזמין:',
    wa_sum: 'סכום מוצרים',
    wa_ship: 'משלוח (מאגר)',
    wa_total: 'סה"כ',
    wa_name: 'שם', wa_phone: 'טלפון', wa_address: 'כתובת',
    wa_notes: 'הערות', wa_payment: 'תשלום', wa_payment_val: 'מזומן / ביט',
    wa_footer: 'ההזמנה ממתינה לאישורכם למשלוח 🙏',
    wa_none: 'ללא',
  },

  ar: {
    dir: 'rtl',
    langName: 'العربية',
    brand_local: 'أورا كلين · مواد تنظيف',
    nav_home: 'الصفحة الرئيسية',
    nav_catalog: 'الكتالوج',
    nav_contact: 'اتصل بنا',
    open_cart: 'فتح سلّة التسوّق',
    open_menu: 'القائمة',
    accessibility_menu: 'قائمة إتاحة الوصول',
    skip_to_content: 'تخطَّ إلى المحتوى الرئيسيّ',

    hero_title: 'مواد تنظيف عالية الجودة — حتّى باب البيت',
    hero_sub: 'كتالوج كامل من مواد التنظيف والأدوات والملحقات. اطلب بنقرات وأكمِل عبر واتساب.',
    hero_cta: 'تصفّح الكتالوج',
    hero_badge_delivery: 'توصيل داخل المغار — 20 ₪',
    hero_badge_nomin: 'دون حدّ أدنى للطلب',
    hero_badge_pay: 'الدفع نقدًا أو Bit',

    search_placeholder: 'ابحث عن منتج…',
    all_categories: 'الكلّ',
    brands_title: 'العلامات التجاريّة الّتي نعمل معها',
    featured_title: 'منتجات مختارة',
    catalog_title: 'كتالوجنا',
    loading: 'جارٍ تحميل المنتجات…',
    no_results: 'لا توجد منتجات مطابقة.',
    empty_catalog: 'لا توجد منتجات للعرض حاليًّا.',

    add_to_cart: 'أضِف إلى السلّة',
    out_of_stock: 'غير متوفّر',
    tag_sale: 'عرض',
    tag_featured: 'مختار',
    unit_prefix: 'لكلّ ',
    currency: '₪',

    cart_title: 'سلّة التسوّق',
    cart_empty: 'سلّتك فارغة',
    cart_empty_cta: 'الذهاب إلى الكتالوج',
    close: 'إغلاق',
    remove: 'إزالة',
    qty: 'الكمّيّة',
    subtotal: 'مجموع المنتجات',
    shipping: 'التوصيل (المغار)',
    shipping_note: 'التوصيل داخل المغار فقط',
    total: 'المجموع للدفع',
    checkout_title: 'تفاصيل التوصيل',
    payment_info: 'الدفع: نقدًا عند الاستلام أو Bit (لا دفع إلكترونيّ عبر الموقع).',

    f_name: 'الاسم الكامل',
    f_phone: 'الهاتف',
    f_address: 'العنوان (في المغار)',
    f_notes: 'ملاحظات (اختياريّ)',
    required: 'حقل إلزاميّ',
    err_name: 'يرجى إدخال الاسم الكامل',
    err_phone: 'يرجى إدخال رقم هاتف صحيح',
    err_address: 'يرجى إدخال عنوان التوصيل',
    err_consent: 'يجب الموافقة على سياسة الخصوصيّة والشروط',
    consent_label: 'قرأتُ وأوافق على',
    consent_privacy: 'سياسة الخصوصيّة',
    consent_and: 'و',
    consent_terms: 'الشروط',
    send_whatsapp: 'إرسال الطلب عبر واتساب',

    back_to_catalog: 'العودة إلى الكتالوج',
    product_not_found: 'المنتج غير موجود.',
    description: 'الوصف',
    perfect_route: 'المسار المثاليّ',
    same_category: 'منتجات من الفئة نفسها',
    all_cats_links: 'كلّ الفئات',
    availability: 'التوفّر',
    in_stock: 'متوفّر',

    footer_about_title: 'AURA CLEAN',
    footer_about: 'متجر مواد تنظيف في المغار. طلبات وتوصيل محلّيّ عبر واتساب.',
    footer_quick_order: 'طلب سريع عبر واتساب',
    footer_links_title: 'معلومات وسياسات',
    footer_contact_title: 'التواصل',
    cookie_settings: 'إعدادات ملفّات الارتباط',
    link_terms: 'الشروط والأحكام',
    link_privacy: 'سياسة الخصوصيّة',
    link_accessibility: 'بيان إتاحة الوصول',
    link_shipping: 'التوصيل والإرجاع',
    link_contact: 'اتصل بنا',
    rights: 'جميع الحقوق محفوظة',

    cookie_text: 'نستخدم ملفّات تعريف الارتباط وأدوات القياس/الإعلان (مثل Meta Pixel) لتحسين الخدمة والإعلان. تُفعَّل هذه الأدوات فقط بعد موافقتك.',
    cookie_more: 'إلى سياسة الخصوصيّة',
    cookie_accept: 'موافقة',
    cookie_reject: 'رفض',
    cookie_saved_accept: 'وافقتَ على ملفّات القياس/الإعلان.',
    cookie_saved_reject: 'اخترتَ رفض ملفّات القياس/الإعلان.',

    a11y_title: 'إعدادات إتاحة الوصول',
    a11y_font: 'حجم الخطّ',
    a11y_font_desc: 'تكبير أو تصغير النصّ',
    a11y_contrast: 'تباين عالٍ',
    a11y_contrast_desc: 'أبيض وأسود بأقصى تباين',
    a11y_links: 'إبراز الروابط',
    a11y_links_desc: 'خطّ سفليّ وإبراز لكلّ الروابط',
    a11y_anim: 'إيقاف الحركة',
    a11y_anim_desc: 'إيقاف فقاعات الخلفيّة والحركات',
    a11y_reset: 'إعادة ضبط',
    decrease: 'تصغير', increase: 'تكبير', reset: 'إعادة',
    on: 'مُفعّل', off: 'مُوقف',

    wa_greeting: 'مرحبًا، أودّ أن أطلب:',
    wa_sum: 'مجموع المنتجات',
    wa_ship: 'التوصيل (المغار)',
    wa_total: 'المجموع',
    wa_name: 'الاسم', wa_phone: 'الهاتف', wa_address: 'العنوان',
    wa_notes: 'ملاحظات', wa_payment: 'الدفع', wa_payment_val: 'نقدًا / Bit',
    wa_footer: 'الطلب بانتظار تأكيدكم للتوصيل 🙏',
    wa_none: 'لا يوجد',
  },
};

/* ----- זיהוי שפה ראשונית ----- */
function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'he' || saved === 'ar') return saved;      // בחירת המשתמש גוברת
  const nav = (navigator.language || 'he').toLowerCase();
  if (nav.startsWith('ar')) return 'ar';
  if (nav.startsWith('he') || nav.startsWith('iw')) return 'he';
  return 'he';                                             // ברירת מחדל: עברית
}

/* השפה הפעילה (משתנה גלובלי) */
let currentLang = detectLang();

/* פונקציית תרגום */
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.he[key]) || key;
}

/* החלת השפה על ה-DOM */
function applyTranslations(root = document) {
  const html = document.documentElement;
  html.lang = currentLang;
  html.dir = I18N[currentLang].dir;   // תמיד rtl

  // טקסטים
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  // תכונות (placeholder / aria-label / title / value ...)
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    // פורמט: "attr:key; attr2:key2"
    el.getAttribute('data-i18n-attr').split(';').forEach(pair => {
      const [attr, key] = pair.split(':').map(s => s && s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });

  // עדכון מתגי שפה
  root.querySelectorAll('[data-lang-btn]').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-lang-btn') === currentLang ? 'true' : 'false');
  });

  // אירוע לרכיבים דינמיים (קטלוג, סל) שיצטרכו להתרנדר מחדש
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
}

/* החלפת שפה */
function setLang(lang) {
  if (lang !== 'he' && lang !== 'ar') return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
}

/* חיווט מתגי שפה + החלה ראשונית */
function initLang() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-lang-btn]');
    if (btn) setLang(btn.getAttribute('data-lang-btn'));
  });
  applyTranslations();
}

document.addEventListener('DOMContentLoaded', initLang);
