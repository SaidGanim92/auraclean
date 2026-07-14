import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameScore } from '../lib/product-discovery.server';

test('nameScore — מוצר SAG דומה', () => {
  const s = nameScore('מטליות סאג', 'Magic Towel- מארז טריפל מטליות פונקציונליות ממיקרופייבר');
  assert.ok(s > 0.2);
});

test('nameScore — שמות לא קשורים', () => {
  assert.ok(nameScore('סכינים', 'מרכך כביסה') < 0.2);
});
