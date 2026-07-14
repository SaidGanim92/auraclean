import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ניהול · AURA CLEAN',
  robots: { index: false, follow: false },
};

// עוטף בסיסי לכל אזור הניהול (ללא בועות/סל/באנר של החנות)
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
