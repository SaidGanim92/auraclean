import Link from 'next/link';

/** סרגל דק למנהל מחובר — מופיע בחנות בלבד, לא נראה ללקוחות */
export function StoreAdminBar() {
  return (
    <div className="store-admin-bar" role="complementary" aria-label="כלים למנהל">
      <div className="container store-admin-bar-inner">
        <span>מחובר כמנהל</span>
        <Link href="/admin/products">ניהול מוצרים</Link>
      </div>
    </div>
  );
}
