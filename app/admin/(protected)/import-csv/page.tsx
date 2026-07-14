import { ImportCsvClient } from '@/components/admin/ImportCsvClient';
import { isDemoMode } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default function ImportCsvPage() {
  const demo = isDemoMode();
  return (
    <div>
      <div className="admin-page-head">
        <h1>ייבוא מלאי מקובץ (CSV)</h1>
        <a href="/admin/products" className="btn btn-outline">← למוצרים</a>
      </div>
      {demo && (
        <p className="admin-warn">
          ⚠ מצב הדגמה: Supabase לא מחובר — אפשר לראות תצוגה מקדימה, אבל <b>שמירה בפועל חסומה</b>.
          מלא את <code dir="ltr">.env.local</code> והרץ את <code dir="ltr">supabase/schema.sql</code> כדי לייבא באמת.
        </p>
      )}
      <ImportCsvClient />
    </div>
  );
}
