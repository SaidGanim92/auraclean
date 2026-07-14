import { getPublishedProducts } from '@/lib/products.server';
import { isAdminRequest } from '@/lib/admin-auth';
import { HeroAndCatalog } from '@/components/store/HeroAndCatalog';

// קטלוג ומידע שפה מתעדכנים מיד לאחר עריכה במנהל.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [products, isAdmin] = await Promise.all([getPublishedProducts(), isAdminRequest()]);
  return <HeroAndCatalog products={products} isAdmin={isAdmin} />;
}
