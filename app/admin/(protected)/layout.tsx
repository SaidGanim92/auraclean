import { requireAdmin } from '@/lib/admin-auth';
import { AdminNav } from '@/components/admin/AdminNav';

// כל דפי הניהול המוגנים — מאמת Admin לפני הרינדור.
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <>
      <AdminNav email={user.email || ''} />
      <main className="admin-main container">{children}</main>
    </>
  );
}
