// טיפוסים משותפים לכל האפליקציה

export type Supplier = 'tyroler' | 'touch' | 'yaakobi' | 'sag' | 'manual';

/** מוצר כפי שהוא נשמר במסד (products) */
export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  source_url: string | null;
  supplier: Supplier | null;
  name_he: string;
  name_ar: string | null;
  category_he: string | null;
  category_ar: string | null;
  price: number;
  sale_price: number | null;
  on_sale: boolean;
  // true אחרי שהמנהל שינה מחיר ידנית (בעריכה או באישור העשרה) — ייבוא CSV/עדכון-מהמקור לא ידרוס אותו יותר
  price_override: boolean;
  desc_he: string | null;
  desc_ar: string | null;
  images: string[];
  available: boolean;
  unit: string | null;
  featured: boolean;
  published: boolean;
  // ייבוא מלאי + העשרה מקישור ספק
  stock_qty: number | null;
  cost_ref: number | null;
  enrichment_source: EnrichmentSource | null;
  image_external: boolean;
  created_at: string;
  updated_at: string;
}

export type EnrichmentSource = 'supplier' | 'manual' | 'none';

/** שדות הניתנים לעריכה בטופס ה-Admin (ללא שדות מערכת) */
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;

/**
 * תוצאת גריפה גולמית מספק (לפני הורדת תמונות ותרגום).
 * זהו הפורמט האחיד שכל SupplierParser מחזיר.
 */
export interface ScrapedProduct {
  sku: string;
  source_url: string;
  supplier: Supplier;
  name_he: string;
  category_he: string | null;
  desc_he: string | null;
  price: number;
  sale_price: number | null;
  on_sale: boolean;
  available: boolean;
  unit: string | null;
  /** כתובות התמונות אצל הספק (יורדו לאחסון שלנו בהמשך) */
  image_urls: string[];
  /** ברקוד (EAN/UPC) שנמצא בדף המוצר אצל הספק, אם קיים */
  barcode?: string | null;
}

/** מטען התצוגה המקדימה שנשלח ל-Admin לעריכה לפני שמירה */
export interface ImportPreview extends ScrapedProduct {
  name_ar: string;
  category_ar: string | null;
  desc_ar: string | null;
  /** האם מק"ט זה כבר קיים במסד (אזהרת כפילות) */
  duplicate_of: string | null; // product id קיים או null
}
