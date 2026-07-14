import Link from 'next/link';

/** קישורי עריכה — מוצגים רק למנהל מחובר (לבינתיים, בזמן בניית החנות) */
export function AdminProductEditLink({
  productId,
  variant = 'overlay',
}: {
  productId: string;
  variant?: 'overlay' | 'inline';
}) {
  return (
    <div className={`store-admin-links${variant === 'inline' ? ' store-admin-links-inline' : ''}`}>
      <Link href={`/admin/products?edit=${productId}`} className="store-admin-link">
        ✎ ערוך
      </Link>
    </div>
  );
}
