import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unitCost, goodsCost, shippingCost, summarize } from '../../src/lib/orderCosting';

// ============================================================
// تكلفةُ الطلب — نظيرُ `server/test/order-costing.test.js` بنفس الأمثلة.
//
// نسختان لأنّ الواجهةَ تحسب حين ينقطع الخادم. الأمثلةُ متطابقةٌ عمدًا: إن
// تباعدت الصيغتان سقط أحدُ الملفّين. عددٌ واحدٌ لا يكفي — لو حسب الخادمُ
// الربحَ بطريقةٍ والمتصفّحُ بأخرى لرأى التاجرُ رقمين مختلفين للشيء نفسِه
// حسب اتّصالِه بالشبكة.
// ============================================================

const PRODUCTS = [
  { id: 'p1', cost: 100 },
  { id: 'p2', cost: 40 },
  { id: 'p3' },
];

test('تكلفةُ الوحدة: الملتقَطُ في البند يسبق بطاقةَ المنتج اليوم', () => {
  assert.equal(unitCost({ productId: 'p1', cost: 60 }, PRODUCTS), 60);
  assert.equal(unitCost({ productId: 'p1' }, PRODUCTS), 100);
  assert.equal(unitCost({ productId: 'p3' }, PRODUCTS), 0);
  assert.equal(unitCost({ productId: 'مجهول' }, PRODUCTS), 0);
  assert.equal(unitCost({ productId: 'p1', cost: -5 }, PRODUCTS), 0);
  assert.equal(unitCost({ productId: 'p1', cost: 0 }, PRODUCTS), 0);
});

test('التكلفةُ تُضرَب في الكمّيّة، والكمّيّةُ الناقصةُ واحدة', () => {
  assert.equal(goodsCost({ items: [{ productId: 'p1', cost: 60, quantity: 3 }] }, PRODUCTS), 180);
  assert.equal(goodsCost({ items: [{ productId: 'p2' }] }, PRODUCTS), 40);
  assert.equal(goodsCost({ items: [] }, PRODUCTS), 0);
  assert.equal(goodsCost({}, PRODUCTS), 0);
});

test('رسمُ التوصيل مصروفٌ لا ربح', () => {
  assert.equal(shippingCost({ deliveryFee: 30 }), 30);
  assert.equal(shippingCost({ deliveryFee: 30, codFee: 5 }), 35);
  assert.equal(shippingCost({}), 0);
});

test('الحصيلة: إيرادٌ − بضاعةٌ − توصيل — نفسُ أرقام الخادم', () => {
  const orders = [
    { total: 330, deliveryFee: 30, items: [{ productId: 'p1', cost: 100, quantity: 1 }, { productId: 'p2', cost: 40, quantity: 2 }] },
    { total: 150, deliveryFee: 0,  items: [{ productId: 'p2', cost: 40, quantity: 1 }] },
  ];
  const m = summarize(orders, PRODUCTS);
  assert.equal(m.revenue, 480);
  assert.equal(m.goods, 220);
  assert.equal(m.shipping, 30);
  assert.equal(m.cost, 250);
  assert.equal(m.profit, 230);
  assert.equal(m.margin, 48);
});

test('طلبٌ يُخسِر: الحصيلةُ تقولها ولا تُخفيها', () => {
  const m = summarize([{ total: 100, deliveryFee: 30, items: [{ productId: 'p1', cost: 100, quantity: 1 }] }], PRODUCTS);
  assert.equal(m.profit, -30);
  assert.equal(m.margin, -30);
});

test('بلا إيراد لا هامشَ — ولا قسمةَ على صفر', () => {
  const m = summarize([], PRODUCTS);
  assert.equal(m.revenue, 0);
  assert.equal(m.margin, 0);
  assert.ok(Number.isFinite(m.margin));
});

test('رسمُ التوصيل كان يُحسَب ربحًا صافيًا — هذا ما تغيّر', () => {
  const order = { total: 130, deliveryFee: 30, items: [{ productId: 'p2', cost: 40, quantity: 1 }] };
  const before = order.total - 40;
  const after  = summarize([order], PRODUCTS).profit;
  assert.equal(before, 90);
  assert.equal(after, 60);
  assert.equal(before - after, 30);
});
