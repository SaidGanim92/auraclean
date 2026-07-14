import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateProductName } from '../lib/translate/product-he-ar';

test('גל כביסה → جل غسيل (לא موجة)', async () => {
  const ar = await translateProductName('גל כביסה הטאצ ביבי');
  assert.match(ar, /جل غسيل/);
  assert.doesNotMatch(ar, /موجة/);
  assert.match(ar, /تاتش/);
  assert.match(ar, /بيبي/);
});

test('וילדה לא הופך לوالفتاة', async () => {
  const ar = await translateProductName('וילדה - סט טורבו דלי הפלא');
  assert.match(ar, /فيليدا/);
  assert.doesNotMatch(ar, /فتاة|بنت/);
  assert.match(ar, /دلو/);
});

test('ג׳ל כביסה טאצ׳ ירוק', async () => {
  const ar = await translateProductName("ג׳ל כביסה טאצ׳ ירוק 5 ליטר");
  assert.match(ar, /جل غسيل/);
  assert.match(ar, /تاتش/);
  assert.match(ar, /أخضر/);
  assert.match(ar, /5/);
  assert.match(ar, /لتر/);
});

test('די תוש לא הופך לסخيף', async () => {
  const ar = await translateProductName("די תוש 630 מ״ל טאצ'");
  assert.match(ar, /دي توش/);
  assert.doesNotMatch(ar, /سخيف/);
});
