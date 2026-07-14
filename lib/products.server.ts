import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/types';
import { PUBLIC_PRODUCT_COLUMNS } from '@/lib/security/field-allowlist';

// קריאת מוצרים מפורסמים דרך products_public (רק שדות בטוחים, ללא cost_ref/source_url).
// בפיתוח בלבד — נופלים לקטלוג הדגמה אם Supabase לא מוגדר.

const PUBLIC_TABLE = 'products_public';

function isDevFallback(): boolean {
  return process.env.NODE_ENV === 'development';
}

function readClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes('YOUR-PROJECT')) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getPublishedProducts(): Promise<Product[]> {
  const supabase = readClient();
  if (!supabase) {
    if (isDevFallback()) {
      console.warn('AURA CLEAN: Supabase לא הוגדר — נטען קטלוג הדגמה. מלא את .env.local.');
      return BACKUP_PRODUCTS;
    }
    return [];
  }
  let { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select(PUBLIC_PRODUCT_COLUMNS)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  // אם עמודה חסרה במסד (למשל barcode) — נסה שוב בלי עמודות אופציונליות
  if (error && /column|schema cache|products_public/i.test(error.message)) {
    const fallbackCols = PUBLIC_PRODUCT_COLUMNS.split(',').filter((c) => c !== 'barcode').join(',');
    const retry = await supabase
      .from(PUBLIC_TABLE)
      .select(fallbackCols)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });
    data = retry.data;
    error = retry.error;
    // אם התצוגה לא קיימת — נסה products עם עמודות ציבוריות בלבד (תאימות לאחור)
    if (error && /products_public|relation.*does not exist/i.test(error.message)) {
      const legacy = await supabase
        .from('products')
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('published', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });
      data = legacy.data;
      error = legacy.error;
    }
  }

  if (error) {
    console.warn('AURA CLEAN: קריאת מוצרים נכשלה.', error.message);
    if (isDevFallback()) return BACKUP_PRODUCTS;
    return [];
  }
  if (!data?.length) {
    console.warn('AURA CLEAN: אין מוצרים מפורסמים במסד (published=true).');
  }
  return (data as unknown as Product[]) || [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = readClient();
  if (!supabase) {
    if (isDevFallback()) return BACKUP_PRODUCTS.find((p) => p.id === id) || null;
    return null;
  }
  let { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select(PUBLIC_PRODUCT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error && /column|schema cache|products_public/i.test(error.message)) {
    const fallbackCols = PUBLIC_PRODUCT_COLUMNS.split(',').filter((c) => c !== 'barcode').join(',');
    const retry = await supabase
      .from(PUBLIC_TABLE)
      .select(fallbackCols)
      .eq('id', id)
      .maybeSingle();
    data = retry.data;
    error = retry.error;
    if (error && /products_public|relation.*does not exist/i.test(error.message)) {
      const legacy = await supabase
        .from('products')
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('id', id)
        .eq('published', true)
        .maybeSingle();
      if (!legacy.error) return (legacy.data as unknown as Product) || null;
    }
  }
  if (error) {
    console.warn('AURA CLEAN: קריאת מוצר נכשלה.', error.message);
    return null;
  }
  return (data as unknown as Product) || null;
}

// ----- קטלוג הדגמה (dev בלבד, עד חיבור Supabase) -----
function demo(p: Partial<Product> & { id: string; sku: string; name_he: string }): Product {
  return {
    barcode: null, source_url: null, supplier: 'manual', name_ar: null, category_he: null, category_ar: null,
    price: 0, sale_price: null, on_sale: false, price_override: false, desc_he: null, desc_ar: null, images: [],
    available: true, unit: null, featured: false, published: true,
    stock_qty: null, cost_ref: null, enrichment_source: null, image_external: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...p,
  } as Product;
}

export const BACKUP_PRODUCTS: Product[] = [
  demo({ id: 'demo-01', sku: 'DEMO-01', name_he: 'אקונומיקה מרוכזת 4 ליטר', name_ar: 'كلور مركّز 4 لتر',
    category_he: 'חומרי חיטוי', category_ar: 'مواد التعقيم', price: 18, unit: 'ל־4 ליטר', featured: true,
    desc_he: 'אקונומיקה חזקה לחיטוי וניקוי משטחים.', desc_ar: 'كلور قويّ لتعقيم وتنظيف الأسطح.' }),
  demo({ id: 'demo-02', sku: 'DEMO-02', name_he: 'מרכך כביסה פרימיום 4 ליטר', name_ar: 'منعّم غسيل ممتاز 4 لتر',
    category_he: 'כביסה', category_ar: 'الغسيل', price: 32, sale_price: 24, on_sale: true, featured: true, unit: 'ל־4 ליטר',
    desc_he: 'מרכך מרוכז עם ניחוח עמיד.', desc_ar: 'منعّم مركّز بعطر يدوم.' }),
  demo({ id: 'demo-03', sku: 'DEMO-03', name_he: 'נוזל כלים לימון 1 ליטר', name_ar: 'سائل جلي بالليمون 1 لتر',
    category_he: 'מטבח', category_ar: 'المطبخ', price: 12, unit: 'לליטר',
    desc_he: 'מסיר שומנים ביעילות.', desc_ar: 'يزيل الدهون بفعّاليّة.' }),
  demo({ id: 'demo-04', sku: 'DEMO-04', name_he: 'מסיר אבנית לאסלה 750 מ״ל', name_ar: 'مزيل الكلس للمرحاض 750 مل',
    category_he: 'חדר אמבטיה', category_ar: 'الحمّام', price: 14, available: false, unit: 'ל־750 מ״ל',
    desc_he: 'ג\'ל צמיג נגד אבנית.', desc_ar: 'جل ضدّ الكلس.' }),
  demo({ id: 'demo-05', sku: 'DEMO-05', name_he: 'מגב רצפה טלסקופי', name_ar: 'ممسحة أرضيّات قابلة للتمديد',
    category_he: 'כלים ואביזרים', category_ar: 'أدوات وملحقات', price: 35, featured: true, unit: 'ליחידה',
    desc_he: 'מגב איכותי להברקת רצפות.', desc_ar: 'ممسحة عالية الجودة.' }),
  demo({ id: 'demo-06', sku: 'DEMO-06', name_he: 'מגבוני חיטוי (100)', name_ar: 'مناديل تعقيم (100)',
    category_he: 'חומרי חיטוי', category_ar: 'مواد التعقيم', price: 13, sale_price: 9.5, on_sale: true, unit: 'לאריזה',
    desc_he: 'מגבונים לחים לחיטוי מהיר.', desc_ar: 'مناديل مبلّلة لتعقيم سريع.' }),
];
