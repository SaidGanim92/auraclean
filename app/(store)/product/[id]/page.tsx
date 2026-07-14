import type { Metadata } from 'next';
import { getProductById, getPublishedProducts } from '@/lib/products.server';
import { isAdminRequest } from '@/lib/admin-auth';
import { ProductView } from '@/components/store/ProductView';

// פרטי מוצר מתעדכנים מיד לאחר עריכה או תרגום במנהל.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProductById(id);
  if (!p) return { title: 'מוצר · AURA CLEAN' };
  return {
    title: `${p.name_he} · AURA CLEAN`,
    description: p.desc_he || undefined,
    openGraph: {
      title: `${p.name_he} · AURA CLEAN`,
      description: p.desc_he || undefined,
      images: p.images?.length ? p.images : ['/images/logo.png'],
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, all, isAdmin] = await Promise.all([
    getProductById(id),
    getPublishedProducts(),
    isAdminRequest(),
  ]);
  return <ProductView product={product} all={all} isAdmin={isAdmin} />;
}
