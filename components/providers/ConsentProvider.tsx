'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const CONSENT_KEY = 'auraclean_consent'; // 'granted' | 'denied'
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

type ConsentState = 'granted' | 'denied' | 'unknown';

interface ConsentCtx {
  state: ConsentState;
  grant: () => void;
  deny: () => void;
  openSettings: () => void;
  showBanner: boolean;
  track: (event: string, params?: Record<string, unknown>) => void;
}

const Ctx = createContext<ConsentCtx | null>(null);

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConsentState>('unknown');
  const [showBanner, setShowBanner] = useState(false);
  const pixelLoaded = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY) as ConsentState | null;
    if (saved === 'granted') {
      setState('granted');
      loadPixel();
    } else if (saved === 'denied') {
      setState('denied');
    } else {
      setShowBanner(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadPixel() {
    if (pixelLoaded.current) return;
    if (!PIXEL_ID) {
      window.fbq = window.fbq || (() => {});
      pixelLoaded.current = true;
      return;
    }
    /* קוד ה-Pixel הרשמי של Meta */
    (function (f: any, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      const s = b.getElementsByTagName(e)[0];
      s.parentNode!.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq!('init', PIXEL_ID);
    window.fbq!('track', 'PageView');
    pixelLoaded.current = true;
  }

  const grant = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'granted');
    setState('granted');
    setShowBanner(false);
    loadPixel();
  }, []);

  const deny = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, 'denied');
    setState('denied');
    setShowBanner(false);
  }, []);

  const openSettings = useCallback(() => setShowBanner(true), []);

  const track = useCallback((event: string, params?: Record<string, unknown>) => {
    if (localStorage.getItem(CONSENT_KEY) !== 'granted') return; // gating
    if (!pixelLoaded.current) loadPixel();
    window.fbq?.('track', event, params || {});
  }, []);

  return (
    <Ctx.Provider value={{ state, grant, deny, openSettings, showBanner, track }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConsent(): ConsentCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConsent חייב להיות בתוך ConsentProvider');
  return ctx;
}
