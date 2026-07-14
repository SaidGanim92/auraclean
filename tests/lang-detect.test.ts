import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeHebrew, needsArabicTranslation } from '../lib/lang-detect';

test('looksLikeHebrew — עברית בלי ערבית', () => {
  assert.equal(looksLikeHebrew('גל כביסה הטאץ ביבי'), true);
  assert.equal(looksLikeHebrew('טאצ\' BABY ג\'ל כביסה'), true);
});

test('looksLikeHebrew — ערבית אמיתית', () => {
  assert.equal(looksLikeHebrew('جل غسيل تاتش بيبي'), false);
  assert.equal(looksLikeHebrew('منقي هواء قوي'), false);
});

test('looksLikeHebrew — ריק / מספרים', () => {
  assert.equal(looksLikeHebrew(''), false);
  assert.equal(looksLikeHebrew(null), false);
  assert.equal(looksLikeHebrew('7290019274001'), false);
});

test('needsArabicTranslation — חסר או עברי', () => {
  assert.equal(needsArabicTranslation('שם בעברית', null), true);
  assert.equal(needsArabicTranslation('שם בעברית', ''), true);
  assert.equal(needsArabicTranslation('שם בעברית', 'שם בעברית'), true);
  assert.equal(needsArabicTranslation('שם בעברית', 'اسم بالعربية'), false);
  assert.equal(needsArabicTranslation('', 'اسم'), false);
});
