'use client';

import { I18nProvider } from './I18nProvider';
import { ConsentProvider } from './ConsentProvider';
import { CartProvider } from './CartProvider';

// עטיפת כל ה-providers של צד הלקוח (סדר חשוב: Consent חייב לעטוף את Cart)
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ConsentProvider>
        <CartProvider>{children}</CartProvider>
      </ConsentProvider>
    </I18nProvider>
  );
}
