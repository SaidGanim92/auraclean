'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCart } from '@/components/providers/CartProvider';
import type { PaymentMethod } from '@/lib/whatsapp';
import { validateCheckoutAndBuildUrl } from '@/app/checkout-actions';
import { I18N } from '@/lib/i18n/dict';
import { playCartClose, playCheckoutWelcome } from '@/lib/button-sound';
import { isButtonSoundEnabled } from '@/lib/a11y-settings';
import { BitIcon, CashIcon } from '@/components/store/PaymentIcons';

export function CheckoutModal() {
  const { t, lang } = useI18n();
  const { items, checkoutOpen, closeCheckout } = useCart();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payment, setPayment] = useState<PaymentMethod | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (checkoutOpen && isButtonSoundEnabled()) playCheckoutWelcome();
  }, [checkoutOpen]);

  const handleClose = () => {
    playCartClose();
    closeCheckout();
  };

  if (!checkoutOpen) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value.trim();
    const address = (form.elements.namedItem('address') as HTMLInputElement).value.trim();
    const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value.trim();
    const consent = (form.elements.namedItem('consent') as HTMLInputElement).checked;

    const errs: Record<string, string> = {};
    if (!name) errs.name = t('err_name');
    if (!/^[0-9+\-\s()]{7,}$/.test(phone)) errs.phone = t('err_phone');
    if (!address) errs.address = t('err_address');
    if (payment !== 'cash' && payment !== 'bit') errs.payment = t('err_payment');
    if (!consent) errs.consent = t('err_consent');
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const result = await validateCheckoutAndBuildUrl(
        items.map((i) => ({ id: i.id, qty: i.qty })),
        { name, phone, address, notes, payment: payment as PaymentMethod },
        lang,
        I18N[lang]
      );
      if (!result.ok) {
        setErrors({ form: result.error });
        return;
      }
      window.open(result.data.whatsappUrl, '_blank');
    } catch {
      setErrors({ form: t('err_checkout') });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal checkout-modal" role="dialog" aria-modal="true" aria-label={t('checkout_title')}>
        <div className="modal-head">
          <h2>{t('checkout_title')}</h2>
          <button type="button" className="icon-btn" onClick={handleClose} aria-label={t('close')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="info-note checkout-note">{t('payment_info')}</div>
          <form className="checkout-form" onSubmit={submit} noValidate>
            {errors.form && (
              <div className="error checkout-form-error" role="alert" aria-live="assertive">{errors.form}</div>
            )}
            <Field name="name" label={t('f_name')} required error={errors.name} autoComplete="name" />
            <Field name="phone" label={t('f_phone')} required error={errors.phone} type="tel" autoComplete="tel" />
            <Field name="address" label={t('f_address')} required error={errors.address} autoComplete="street-address" />

            <fieldset className="field payment-field">
              <legend>{t('payment_method')} <span className="req">*</span></legend>
              <div className="payment-options" role="radiogroup" aria-label={t('payment_method')}>
                <label className={`payment-option${payment === 'cash' ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={payment === 'cash'}
                    onChange={() => setPayment('cash')}
                  />
                  <CashIcon size={26} className="payment-icon payment-icon-cash" />
                  <span className="payment-option-label">{t('pay_cash')}</span>
                </label>
                <label className={`payment-option${payment === 'bit' ? ' on' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bit"
                    checked={payment === 'bit'}
                    onChange={() => setPayment('bit')}
                  />
                  <BitIcon size={26} className="payment-icon payment-icon-bit" />
                  <span className="payment-option-label">{t('pay_bit')}</span>
                </label>
              </div>
              <div className="error" role="alert" aria-live="assertive">{errors.payment || ''}</div>
            </fieldset>

            <div className="field">
              <label htmlFor="co-notes">{t('f_notes')}</label>
              <textarea id="co-notes" name="notes" rows={2} />
            </div>
            <div className="consent-field">
              <input id="co-consent" name="consent" type="checkbox" aria-describedby="err-consent" />
              <label htmlFor="co-consent">
                {t('consent_label')}{' '}
                <Link href="/privacy" target="_blank">{t('consent_privacy')}</Link>{' '}
                {t('consent_and')}{' '}
                <Link href="/terms" target="_blank">{t('consent_terms')}</Link>
                <div className="error" id="err-consent" role="alert" aria-live="assertive">{errors.consent || ''}</div>
              </label>
            </div>
            <button type="submit" className="btn btn-whatsapp btn-block btn-lg" disabled={submitting}>
              <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.4.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z" /></svg>
              {submitting ? t('loading') : t('send_whatsapp')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  name, label, required, error, type = 'text', autoComplete,
}: {
  name: string; label: string; required?: boolean; error?: string; type?: string; autoComplete?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={`co-${name}`}>{label} {required && <span className="req">*</span>}</label>
      <input
        id={`co-${name}`}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={`err-${name}`}
      />
      <div className="error" id={`err-${name}`} role="alert" aria-live="assertive">{error || ''}</div>
    </div>
  );
}
