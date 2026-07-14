// בדיקות מיפוי CSV → שדות products
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapCsvRow, mapCsvRows } from '../lib/csv-map';

test('מיפוי כותרות אנגלית', () => {
  const m = mapCsvRow({ sku: '7290000123456', name_he: 'אקונומיקה', price: '18.90', category_he: 'חיטוי', available: 'TRUE', stock_qty: '12' });
  assert.ok(m);
  assert.equal(m!.sku, '7290000123456');
  assert.equal(m!.name_he, 'אקונומיקה');
  assert.equal(m!.price, 18.9);
  assert.equal(m!.category_he, 'חיטוי');
  assert.equal(m!.available, true);
  assert.equal(m!.stock_qty, 12);
});

test('מיפוי כותרות עברית (ברקוד/שם/מחיר/מלאי)', () => {
  const m = mapCsvRow({ 'ברקוד': '123', 'שם': 'מגב', 'מחיר': '35', 'מלאי': '4', 'זמין': 'לא' });
  assert.ok(m);
  assert.equal(m!.sku, '123');
  assert.equal(m!.name_he, 'מגב');
  assert.equal(m!.price, 35);
  assert.equal(m!.stock_qty, 4);
  assert.equal(m!.available, false); // "לא" → לא זמין
});

test('שורה ללא sku או ללא שם → null', () => {
  assert.equal(mapCsvRow({ name_he: 'בלי מקט' }), null);
  assert.equal(mapCsvRow({ sku: '999' }), null);
});

test('עמודת image לא ממופה (תמונות מגיעות מהעשרה)', () => {
  const m = mapCsvRow({ sku: '1', name_he: 'x', image: 'http://supplier/x.jpg' });
  assert.ok(m);
  assert.equal((m as Record<string, unknown>).image, undefined);
  // name_he לא נדרס מה-image
  assert.equal(m!.name_he, 'x');
});

test('dedupe לפי sku (אחרון מנצח) + ספירת דילוגים', () => {
  const { mapped, skipped } = mapCsvRows([
    { sku: '1', name_he: 'ראשון', price: '10' },
    { sku: '1', name_he: 'שני', price: '20' },
    { sku: '', name_he: 'ללא מקט' },
    { name_he: 'גם ללא' },
  ]);
  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].name_he, 'שני');
  assert.equal(mapped[0].price, 20);
  assert.equal(skipped, 2);
});

test('available ריק → ברירת מחדל true; on_sale/featured ריק → false', () => {
  const m = mapCsvRow({ sku: '1', name_he: 'x' });
  assert.equal(m!.available, undefined); // לא נמסר → נשאר לברירת מחדל של המסד
  const m2 = mapCsvRow({ sku: '1', name_he: 'x', available: '', 'מבצע': '' });
  assert.equal(m2!.available, true);
  assert.equal(m2!.on_sale, false);
});

test('ייצוא מלאי — מחיר ללקוח, כמות במלאי, עלות', () => {
  const m = mapCsvRow({
    'מק״ט': '7290013883148',
    'שם המוצר': 'הפי – ג\'ל סופג ריחות',
    'עלות לפני מע"מ': '8.0',
    'מחיר ללקוח': '16',
    'כמות במלאי': '6',
  });
  assert.ok(m);
  assert.equal(m!.sku, '7290013883148');
  assert.equal(m!.price, 16);
  assert.equal(m!.cost_ref, 8);
  assert.equal(m!.stock_qty, 6);
});
