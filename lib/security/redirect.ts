/** מניעת open redirect אחרי התחברות — רק נתיבי admin פנימיים */
export function safeAdminRedirect(raw: string | null | undefined): string {
  const fallback = '/admin/products';
  if (!raw) return fallback;
  const path = raw.trim();
  // חייב להתחיל ב-/admin/ וללא // (שמונע //evil.com)
  if (!path.startsWith('/admin/')) return fallback;
  if (path.startsWith('//')) return fallback;
  if (/^https?:/i.test(path)) return fallback;
  if (!/^\/admin\/[a-zA-Z0-9/_-]*$/.test(path)) return fallback;
  return path;
}
