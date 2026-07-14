import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from '@/components/providers/Providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'AURA CLEAN · מוצרי ניקיון במאגר',
  description:
    'AURA CLEAN — חנות מוצרי ניקיון במאגר. קטלוג חומרי ניקוי, כלים ואביזרים. הזמנה מהירה בוואטסאפ, משלוח מקומי.',
  icons: { icon: '/images/logo.png' },
  openGraph: {
    title: 'AURA CLEAN · מוצרי ניקיון במאגר',
    description: 'קטלוג מוצרי ניקיון — הזמנה בוואטסאפ, משלוח בתוך מאגר.',
    images: ['/images/logo.png'],
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&family=Cairo:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#5B93D6" />
        {/* החלת הגדרות נגישות שמורות לפני טעינת React */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d={fontScale:1,contrast:false,links:false,noAnim:false,buttonSounds:true};var s=Object.assign(d,JSON.parse(localStorage.getItem('auraclean_a11y')||'{}'));var h=document.documentElement;if(typeof s.fontScale==='number')h.style.setProperty('--font-scale',String(s.fontScale));if(s.contrast)h.classList.add('a11y-contrast');if(s.links)h.classList.add('a11y-links');if(s.noAnim)h.classList.add('no-anim');if(s.buttonSounds)h.classList.add('a11y-sounds');}catch(e){document.documentElement.classList.add('a11y-sounds');}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
