import { createAdminClient } from '@/lib/supabase/admin';
import { isDemoMode } from '@/lib/admin-auth';
import { BACKUP_PRODUCTS } from '@/lib/products.server';
import { ProductsTable } from '@/components/admin/ProductsTable';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const demo = isDemoMode();
  let products: Product[] = [];
  let error: string | null = null;

  if (demo) {
    products = BACKUP_PRODUCTS;
  } else {
    const supabase = createAdminClient();
    const { data, error: dbError } = await supabase
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });
    products = (data as Product[]) || [];
    error = dbError?.message || null;
  }

  return (
    <div>
      <div className="admin-page-head">
        <h1>ניהול מוצרים</h1>
        <div className="flex-wrap">
          <a href="/admin/import-csv" className="btn btn-outline">ייבוא CSV</a>
          <a href="/admin/import" className="btn btn-gradient">+ ייבוא מקישור</a>
        </div>
      </div>
      {demo && (
        <p className="admin-error" style={{ background: 'var(--bg-soft)', color: 'inherit' }}>
          מצב הדגמה: Supabase לא מחובר, מוצג קטלוג הדגמה בלבד (לקריאה, בלי שמירה בפועל). מלא את .env.local כדי לעבוד עם המוצרים האמיתיים.
        </p>
      )}
      {error && <p className="admin-error">שגיאת טעינה: {error} — ודא שהרצת את schema.sql ומילאת את .env.local.</p>}
      <ProductsTable initial={products} initialEditId={edit} />
    </div>
  );
}
