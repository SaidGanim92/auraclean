import { ImportClient } from '@/components/admin/ImportClient';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div>
      <div className="admin-page-head">
        <h1>ייבוא מוצר מקישור</h1>
        {/* שלב ג' (מוכן להרחבה, מושבת): ייבוא קטלוג המוני */}
        <button className="btn btn-outline" disabled title="בקרוב — לאחר ייצוב הסקרייפרים הבודדים">
          ייבוא קטלוג (בקרוב)
        </button>
      </div>
      <ImportClient />
    </div>
  );
}
