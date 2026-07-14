'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link href={href} className={`admin-nav-link${pathname === href ? ' active' : ''}`}>
      {label}
    </Link>
  );

  return (
    <header className="admin-header">
      <div className="admin-header-inner">
        <Link href="/admin/products" className="admin-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="AURA CLEAN" />
          <span>ניהול</span>
        </Link>
        <nav className="admin-nav">
          {link('/admin/products', 'מוצרים')}
          {link('/admin/import-csv', 'ייבוא CSV')}
          {link('/admin/import', 'ייבוא מקישור')}
        </nav>
        <div className="admin-header-spacer" />
        <span className="admin-email" dir="ltr">{email}</span>
        <Link href="/" className="admin-nav-link" target="_blank">לצפייה בחנות ↗</Link>
        <button type="button" className="btn btn-outline" onClick={logout}>יציאה</button>
      </div>
    </header>
  );
}
