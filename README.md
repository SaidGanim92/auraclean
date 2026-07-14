# AURA CLEAN — חנות מוצרי ניקיון (Full-Stack) + Admin וייבוא מספקים

חנות דו-לשונית (עברית + ערבית, RTL) בשם **AURA CLEAN**, הזמנות נסגרות בוואטסאפ (אין סליקה).
בנויה ב-**Next.js (App Router)** + **Supabase** (Postgres, Auth, Storage), עם **מערכת Admin**
לניהול מוצרים ולייבוא אוטומטי מקישור ספק (יעקובי, Tyroler, SAG, טאצ').

---

## 1. הרצה מקומית מהירה (מצב הדגמה, ללא Supabase)

```bash
npm install
npm run dev        # http://localhost:3000
```

ללא הגדרת Supabase האתר עולה ב**מצב הדגמה**: החנות מציגה קטלוג הדגמה מובנה, ו-`/admin`
נגיש ללא התחברות (רק לצפייה — שמירה בפועל דורשת Supabase). כך אפשר לראות הכול מיד.

בדיקות הפרסרים: `npm test`
בנייה לפרודקשן: `npm run build`

---

## 2. מבנה הפרויקט

```
app/
  (store)/                חנות הלקוח (route group)
    page.tsx              דף הבית (hero, מומלצים, מותגים, קטלוג)
    product/[id]/page.tsx עמוד מוצר + "המסלול המושלם"
    terms|privacy|accessibility|shipping|contact/  5 עמודים משפטיים (he/ar)
    layout.tsx            כותרת/כותרת תחתית/סל/באנר עוגיות/תפריט נגישות/בועות
  admin/
    login/               התחברות (Supabase Auth)
    (protected)/         מוגן במידלוור + requireAdmin
      products/          טבלת ניהול מוצרים
      import/            ייבוא מוצר מקישור
    actions.ts           Server Actions (שמירה/עדכון/מחיקה/עדכון-מהמקור)
  api/admin/import/      Route Handler: קישור → תצוגה מקדימה
  layout.tsx             Root layout + Providers + גופנים
components/
  providers/             I18n, Consent (Pixel gating), Cart
  store/                 רכיבי החנות
  admin/                 רכיבי הניהול
lib/
  types.ts               טיפוסים (Product, ScrapedProduct, ImportPreview)
  i18n/dict.ts           מילון he/ar
  product.ts             עזרי תצוגת מוצר (שם/מחיר/תמונה לפי שפה)
  whatsapp.ts            בניית הודעת הזמנה
  supabase/              client / server / admin(service-role) / middleware / config
  suppliers/             ★ ארכיטקטורת הספקים (ראה §7)
  translate/             תרגום HE→AR ניטרלי-ספק (Google / DeepL)
  import.server.ts       גריפה+תרגום+כפילות; diff לעדכון-מהמקור
  images.server.ts       הורדת תמונות הספק ל-Supabase Storage
  products.server.ts     קריאת מוצרים לחנות (+קטלוג הדגמה)
supabase/schema.sql      סכימת המסד (טבלה, אינדקסים, RLS, דלי אחסון)
styles/globals.css       מערכת העיצוב (מותג, RTL, בועות, נגישות, Admin)
_legacy/                 גרסת ה-HTML הסטטית הקודמת (ארכיון)
```

---

## 3. הקמת Supabase

1. צרו פרויקט חינמי ב-[supabase.com](https://supabase.com).
2. **SQL Editor** → הדביקו והריצו את התוכן של `supabase/schema.sql`
   (יוצר את טבלת `products`, אילוץ ייחודי על `sku`, RLS, ודלי אחסון `product-images`).
   • למסד **קיים** מגרסה מוקדמת: הריצו גם את `supabase/migration_enrichment.sql`
     (מוסיף `stock_qty`, `cost_ref`, `enrichment_source`, `image_external`).
3. **Project Settings → API**: העתיקו `Project URL`, `anon public`, ו-`service_role`.

---

## 4. משתני סביבה

העתיקו `.env.example` ל-`.env.local` ומלאו:

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת הפרויקט |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח anon (ציבורי) |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח service-role — **צד שרת בלבד!** |
| `ADMIN_EMAIL` | האימייל היחיד שמורשה ל-`/admin` |
| `TRANSLATE_PROVIDER` | `google` או `deepl` — **אופציונלי**. בלי זה, התרגום לערבית קורה אוטומטית וללא עלות דרך שירות Google Translate הציבורי (איכות טובה ברוב המקרים; ניתן לערוך ידנית ב-Admin). ממלאים כדי לעבור לשירות בתשלום עם SLA/יציבות גבוהה יותר |
| `TRANSLATE_API_KEY` | מפתח התרגום — נדרש רק אם מולאה `TRANSLATE_PROVIDER` |
| `NEXT_PUBLIC_META_PIXEL_ID` | מזהה Meta Pixel (נטען רק אחרי אישור עוגיות) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | מספר וואטסאפ בינלאומי (ברירת מחדל 972502073111) |

---

## 5. יצירת משתמש ה-Admin

ב-Supabase: **Authentication → Users → Add user** → צרו משתמש עם האימייל שהגדרתם ב-`ADMIN_EMAIL`
וסיסמה. התחברות דרך `/admin/login`. רק אימייל זה יורשה; אחרים ינותקו אוטומטית.

---

## 6. תהליך הייבוא (Admin)

`/admin/import` → הדביקו קישור מוצר → **שליפת נתונים**:
1. זיהוי ספק אוטומטי לפי הדומיין.
2. גריפה בצד-שרת (Shopify `.json` / WooCommerce Store API + fallback ל-meta).
3. תרגום אוטומטי HE→AR (טיוטה לעריכה).
4. בדיקת כפילות לפי מק"ט.
5. **תצוגה מקדימה ניתנת לעריכה** — כל השדות, מחיר, מבצע, מלאי, תמונות.
6. **שמור ופרסם** → התמונות יורדות ל-Supabase Storage (לא מקשרים לספק), והמוצר נכנס למסד.

ב-`/admin/products`: עריכה, מחיקה, החלפת זמין/מבצע/מומלץ/מפורסם, ו**"עדכן מהמקור"**
(מושך מחדש מ-`source_url`, מציג מה השתנה, ומעדכן לאחר אישור).

---

## 6.5 ייבוא מלאי (CSV) + העשרה מקישור ספק

**עיקרון:** קובץ המלאי הוא **מקור האמת** לשם/מחיר/קטגוריה/מלאי; ההעשרה מוסיפה **רק תמונה ותיאור**.

- **`/admin/import-csv`** — העלאת `auraclean-import-ready.csv`. כותרות גמישות
  (`sku/ברקוד, name_he, price, category_he, category_ar, available, stock_qty…`).
  Upsert לפי `sku`; מוצרים חדשים נכנסים כ**טיוטה** (`published=false`). עדכון חוזר
  לא נוגע בתמונות/תיאור שהתקבלו מהעשרה ולא מבטל פרסום קיים.
- **שרשרת מילוי** (`lib/enrich.server.ts`): (1) קישור ספק (`source_url`, ה-parsers הקיימים) → (2) ידני.
  לכל מוצר נשמר `enrichment_source`. התיאור מתורגם לערבית כטיוטה (לא דורס `name_he`).
- **בטבלת המוצרים:** כפתור **"העשר את כל המלאי"** (אצווה עם rate-limit, פס התקדמות),
  סינון **"חסרי תמונה" / "דורש טיפול ידני"**, וכפתור **"העשר"** לכל שורה עם תצוגה מקדימה,
  בחירת תמונות, **תווית מקור** וסימון תמונות חיצוניות. **פרסום תמיד ידני** (אין פרסום אוטומטי).

## 7. הוספת ספק חדש (ארכיטקטורת `SupplierParser`)

כל ספק הוא מודול המממש ממשק אחיד ב-`lib/suppliers/types.ts`:

```ts
interface SupplierParser {
  supplier: Supplier;
  matches(url: string): boolean;          // זיהוי לפי דומיין
  parse(url, fetcher?): Promise<ScrapedProduct>;
}
```

- **Shopify** (`shopify.ts`) — יעקובי. מוסיף `.json` לכתובת → JSON נקי.
- **WooCommerce** (`woocommerce.ts`) — Tyroler/SAG/טאצ' דרך `makeWooParser`.
  מנסה Store API `/wp-json/wc/store/v1/products?slug=`, ואם אין — נופל לתגיות meta.

**הוספת ספק = הוספת קובץ אחד + רישום ב-`lib/suppliers/index.ts`** (מערך `PARSERS`).
ה-`fetcher` ניתן להזרקה → בדיקות מול fixtures (`tests/parsers.test.ts`).

> ⚠️ אם ספק משנה את מבנה האתר שלו, ה-parser עלול להישבר ולדרוש עדכון — טרייד-אוף של ייבוא אוטומטי.

---

## 8. שלבי הבנייה

- **שלב א' (מיושם):** מסד + חנות + Admin + ייבוא מוצר בודד + ניהול מוצרים.
- **שלב ב' (מוכן):** ממשק פרסרים אחיד; הוספת ספק = קובץ אחד.
- **שלב ג' (מוכן, מושבת):** כפתור "ייבוא קטלוג" המוני — מוסתר עד לייצוב הפרסרים הבודדים.

---

## 9. פריסה ל-Vercel

1. דחפו את הפרויקט ל-GitHub.
2. ב-[vercel.com](https://vercel.com): **Add New → Project** → בחרו את המאגר.
3. **Environment Variables**: הזינו את כל המשתנים מ-§4.
4. Deploy. (אין צורך בהגדרות מיוחדות — Next.js מזוהה אוטומטית.)
5. עדכנו `NEXT_PUBLIC_SITE_URL` לכתובת הפרודקשן.

---

## 10. נגישות ופרטיות

- **נגישות (ת"י 5568 / WCAG AA):** מבנה סמנטי, ניווט מקלדת, ניגודיות, הגדלת טקסט,
  תפריט נגישות. **מלאו את פרטי רכז הנגישות** בעמוד הצהרת הנגישות.
- **עוגיות ו-Pixel (תיקון 13):** ה-Pixel נטען **רק אחרי "אישור"** בבאנר; ניתן לשנות דרך
  "הגדרות עוגיות" ב-footer.
- **placeholders משפטיים** (מסומנים בצהוב): שם עסק, ח.פ, כתובת, מחוז, ימי אספקה, שעות, תאריכים.

---

## 11. הבהרות

- **זכויות תוכן:** תמונות ותיאורי ספק עשויים להיות מוגני זכויות יוצרים — קבלו אישור מהספק
  או החליפו בתוכן משלכם. אינו ייעוץ משפטי.
- **מומלץ** שעו"ד יעבור על העמודים המשפטיים ומדיניות הפרטיות (בגלל ה-Pixel).

בהצלחה! 🧽✨
