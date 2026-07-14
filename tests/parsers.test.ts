// בדיקות פרסרים מול fixtures סינתטיים (ללא רשת).
// מריצים: npm test   (או: npx tsx --test tests/parsers.test.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopifyParser } from '../lib/suppliers/shopify';
import { tyrolerParser, touchParser } from '../lib/suppliers/woocommerce';
import { detectSupplier } from '../lib/suppliers';
import type { Fetcher } from '../lib/suppliers/types';

// עוזר לבניית fetcher מזויף לפי מפת url→תוכן
function fakeFetcher(routes: Record<string, { ok?: boolean; body: string }>): Fetcher {
  return async (url: string) => {
    const hit = routes[url];
    const ok = hit ? hit.ok !== false : false;
    const body = hit?.body ?? '';
    return {
      ok,
      status: ok ? 200 : 404,
      text: async () => body,
      json: async () => JSON.parse(body || '{}'),
    };
  };
}

test('KSP — מוצר מ-API', async () => {
  const url = 'https://ksp.co.il/web/item/411165?utm_source=google';
  const apiUrl = 'https://ksp.co.il/m_action/api/item/411165';
  const body = JSON.stringify({
    result: {
      data: {
        uin: 411165,
        uinsql: '371551',
        name: 'סנונית - ג\'ל כביסה',
        smalldesc: 'ג\'ל כביסה מרוכז',
        price: 29,
        bms_price: 24,
      },
    },
  });
  const { parseKsp } = await import('../lib/suppliers/ksp');
  const p = await parseKsp(url, fakeFetcher({ [apiUrl]: { body } }));
  assert.equal(p.sku, '371551');
  assert.match(p.name_he, /סנונית/);
  assert.equal(p.price, 29);
  assert.equal(p.on_sale, true);
  assert.equal(p.sale_price, 24);
  assert.equal(p.source_url, 'https://ksp.co.il/web/item/411165');
  assert.ok(p.image_urls.length >= 1);
});

test('זיהוי ספק לפי דומיין', () => {
  assert.equal(detectSupplier('https://jacobi.co.il/products/soap')?.supplier, 'yaakobi');
  assert.equal(detectSupplier('https://www.tyroler.co.il/product/bleach')?.supplier, 'tyroler');
  assert.equal(detectSupplier('https://sagncs.co.il/product/x')?.supplier, 'sag');
  assert.equal(detectSupplier('https://touchonline.co.il/product/y')?.supplier, 'touch');
  assert.equal(detectSupplier('https://example.com/foo'), null);
});

test('Shopify (יעקובי) — מוצר במבצע', async () => {
  const url = 'https://jacobi.co.il/products/premium-softener';
  const json = JSON.stringify({
    product: {
      id: 111, handle: 'premium-softener', title: 'מרכך כביסה', product_type: 'כביסה',
      body_html: '<p>ניחוח עמיד <b>לאורך זמן</b></p>',
      images: [{ src: 'https://cdn.shopify.com/a.jpg' }, { src: 'https://cdn.shopify.com/b.jpg' }],
      variants: [{ price: '24.90', sku: 'SFT-4L', compare_at_price: '32.00', available: true }],
    },
  });
  const p = await shopifyParser.parse(url, fakeFetcher({ [url + '.json']: { body: json } }));
  assert.equal(p.supplier, 'yaakobi');
  assert.equal(p.sku, 'SFT-4L');
  assert.equal(p.name_he, 'מרכך כביסה');
  assert.equal(p.category_he, 'כביסה');
  assert.equal(p.on_sale, true);
  assert.equal(p.sale_price, 24.9);
  assert.equal(p.price, 32); // מחיר מקורי
  assert.equal(p.available, true);
  assert.equal(p.image_urls.length, 2);
  assert.match(p.desc_he || '', /ניחוח עמיד לאורך זמן/);
});

test('Shopify — מוצר רגיל (ללא מבצע) + אזל מהמלאי', async () => {
  const url = 'https://jacobi.co.il/products/basic';
  const json = JSON.stringify({
    product: {
      id: 222, handle: 'basic', title: 'סבון', images: [],
      variants: [{ price: '12.00', sku: 'BAS-1', compare_at_price: null, available: false }],
    },
  });
  const p = await shopifyParser.parse(url, fakeFetcher({ [url + '.json']: { body: json } }));
  assert.equal(p.on_sale, false);
  assert.equal(p.sale_price, null);
  assert.equal(p.price, 12);
  assert.equal(p.available, false);
});

test('WooCommerce (Tyroler) — Store API עם מבצע', async () => {
  const url = 'https://www.tyroler.co.il/product/bleach-4l';
  const apiUrl = 'https://www.tyroler.co.il/wp-json/wc/store/v1/products?slug=bleach-4l';
  const api = JSON.stringify([{
    id: 500, name: 'אקונומיקה 4 ליטר', sku: 'BLC-4L',
    prices: { price: '2490', regular_price: '3200', sale_price: '2490', currency_minor_unit: 2 },
    description: '<p>אקונומיקה חזקה</p>', is_in_stock: true,
    images: [{ src: 'https://tyroler.co.il/wp-content/uploads/x.jpg' }],
    categories: [{ name: 'חומרי חיטוי' }],
  }]);
  const p = await tyrolerParser.parse(url, fakeFetcher({ [apiUrl]: { body: api } }));
  assert.equal(p.supplier, 'tyroler');
  assert.equal(p.sku, 'BLC-4L');
  assert.equal(p.name_he, 'אקונומיקה 4 ליטר');
  assert.equal(p.category_he, 'חומרי חיטוי');
  assert.equal(p.on_sale, true);
  assert.equal(p.price, 32);      // regular
  assert.equal(p.sale_price, 24.9); // sale
  assert.equal(p.available, true);
  assert.equal(p.image_urls.length, 1);
});

test('WooCommerce — נפילה חלקה לתגיות meta כשאין Store API', async () => {
  const url = 'https://www.tyroler.co.il/product/no-api';
  const apiUrl = 'https://www.tyroler.co.il/wp-json/wc/store/v1/products?slug=no-api';
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="מטהר אוויר">
    <meta property="og:description" content="ניחוח נעים">
    <meta property="og:image" content="https://tyroler.co.il/wp-content/uploads/air.jpg">
    <meta property="product:price:amount" content="22.00">
    <meta property="product:availability" content="instock">
    <meta property="product:retailer_item_id" content="AIR-1">
    </head><body><h1 class="product_title">מטהר אוויר</h1></body></html>`;
  const p = await tyrolerParser.parse(url, fakeFetcher({
    [apiUrl]: { ok: false, body: '' },   // Store API לא זמין
    [url]: { body: html },                // עמוד HTML
  }));
  assert.equal(p.name_he, 'מטהר אוויר');
  assert.equal(p.sku, 'AIR-1');
  assert.equal(p.price, 22);
  assert.equal(p.available, true);
  assert.ok(p.image_urls.includes('https://tyroler.co.il/wp-content/uploads/air.jpg'));
});

test('WooCommerce fallback — מחיר בלי product:price:amount (רק span.woocommerce-Price-amount, בלי מבצע)', async () => {
  // תבנית אמיתית של touchonline.co.il: אין meta מחיר, ואין del/ins — רק מחיר "רגיל" בתוך p.price
  const url = 'https://touchonline.co.il/product/gel-baby';
  const apiUrl = 'https://touchonline.co.il/wp-json/wc/store/v1/products?slug=gel-baby';
  const html = `<!doctype html><html><head>
    <meta property="og:title" content="ג'ל כביסה בייבי">
    <meta property="og:description" content="ג'ל כביסה מרוכז לתינוקות">
    </head><body>
    <h1 class="product_title">ג'ל כביסה בייבי</h1>
    <div class="elementor-widget-woocommerce-product-price">
      <p class="price"><span class="woocommerce-Price-amount amount"><bdi><span class="woocommerce-Price-currencySymbol">₪</span>36.90</bdi></span></p>
    </div>
    <div><span class="price"><span class="woocommerce-Price-amount amount">11.90</span></span></div>
    </body></html>`;
  const p = await touchParser.parse(url, fakeFetcher({
    [apiUrl]: { ok: false, body: '[]' },
    [url]: { body: html },
  }));
  assert.equal(p.name_he, "ג'ל כביסה בייבי");
  assert.equal(p.price, 36.9);
  assert.equal(p.on_sale, false);
});
