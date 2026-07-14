'use client';

import Link from 'next/link';
import { useI18n } from '@/components/providers/I18nProvider';
import { useConsent } from '@/components/providers/ConsentProvider';
import { LanguageSwitch } from './LanguageSwitch';

const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '972502073111';

function FooterIcon({ children }: { children: React.ReactNode }) {
  return <span className="footer-icon" aria-hidden="true">{children}</span>;
}

export function Footer() {
  const { t } = useI18n();
  const { openSettings } = useConsent();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-col footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-footer.png" alt="AURA CLEAN" />
          <p>{t('footer_about')}</p>
          <div className="footer-actions">
            <LanguageSwitch />
            <a className="btn btn-whatsapp" href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer">
              {t('footer_quick_order')}
            </a>
          </div>
        </div>
        <div className="footer-col">
          <h3>{t('footer_links_title')}</h3>
          <ul>
            <li><Link href="/terms">{t('link_terms')}</Link></li>
            <li><Link href="/privacy">{t('link_privacy')}</Link></li>
            <li><Link href="/accessibility">{t('link_accessibility')}</Link></li>
            <li><Link href="/shipping">{t('link_shipping')}</Link></li>
            <li><Link href="/contact">{t('link_contact')}</Link></li>
            <li>
              <button type="button" className="link-btn" onClick={openSettings}>
                {t('cookie_settings')}
              </button>
            </li>
          </ul>
        </div>
        <div className="footer-col">
          <h3>{t('footer_contact_title')}</h3>
          <ul className="footer-contact">
            <li>
              <FooterIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </FooterIcon>
              <a href="tel:0502073111" dir="ltr">050-2073111</a>
            </li>
            <li>
              <FooterIcon>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z" /></svg>
              </FooterIcon>
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" dir="ltr">050-2073111</a>
            </li>
            <li>
              <FooterIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </FooterIcon>
              <a href="mailto:sagroup050@gmail.com" dir="ltr">sagroup050@gmail.com</a>
            </li>
            <li>
              <FooterIcon>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              </FooterIcon>
              <span>מאגר / المغار</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} AURA CLEAN · {t('rights')}</span>
      </div>
    </footer>
  );
}
