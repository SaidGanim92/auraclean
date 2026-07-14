import { SkipLink } from '@/components/store/SkipLink';
import { Bubbles } from '@/components/store/Bubbles';
import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';
import { CheckoutModal } from '@/components/store/CheckoutModal';
import { CookieBanner } from '@/components/store/CookieBanner';
import { AccessibilityMenu } from '@/components/store/AccessibilityMenu';
import { ButtonSoundListener } from '@/components/store/ButtonSoundListener';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <Bubbles />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <CheckoutModal />
      <CookieBanner />
      <AccessibilityMenu />
      <ButtonSoundListener />
    </>
  );
}
