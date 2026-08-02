'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { unitCost, goodsCost, shippingCost, summarize, attachCosts } = require('../lib/orderCosting');

// نفسُ هذه الأمثلةِ حرفيًّا في `test/brain/orderCosting.test.ts`.
// إن تباعد الحسابان سقط أحدُ الاختبارين.
const PRODUCTS = [
  { id: 'p1', cost: 100 },
  { id: 'p2', cost: 40 },
  { id: 'p3' },              // بلا تكلفة
];

test('تكلفةُ الوحدة: الملتقَطُ في البند يسبق بطاقةَ المنتج اليوم', () => {
  // جوهرُ العطب: التاجرُ رفع ثمنَ الشراء من ٦٠ إلى ١٠٠ بعد البيع.
  assert.equal(unitCost({ productId: 'p1', cost: 60 }, PRODUCTS), 60);
  assert.equal(unitCost({ productId: 'p1' }, PRODUCTS), 100, 'طلبٌ قديمٌ بلا التقاط يقع على منتجِ اليوم');
  assert.equal(unitCost({ productId: 'p3' }, PRODUCTS), 0);
  assert.equal(unitCost({ productId: 'مجهول' }, PRODUCTS), 0);
  assert.equal(unitCost({ productId: 'p1', cost: -5 }, PRODUCTS), 0, 'لا تكلفةَ سالبة');
  assert.equal(unitCost({ productId: 'p1', cost: 0 }, PRODUCTS), 0, 'صفرٌ ملتقَطٌ صفرٌ حقيقيّ، لا «غير موجود»');
});

test('التكلفةُ تُضرَب في الكمّيّة، والكمّيّةُ الناقصةُ واحدة', () => {
  assert.equal(goodsCost({ items: [{ productId: 'p1', cost: 60, quantity: 3 }] }, PRODUCTS), 180);
  assert.equal(goodsCost({ items: [{ productId: 'p2' }] }, PRODUCTS), 40);
  assert.equal(goodsCost({ items: [] }, PRODUCTS), 0);
  assert.equal(goodsCost({}, PRODUCTS), 0);
});

test('رسمُ التوصيل مصروفٌ لا ربح — لأنّه داخلَ `total` أصلًا', () => {
  assert.equal(shippingCost({ deliveryFee: 30 }), 30);
  assert.equal(shippingCost({ deliveryFee: 30, codFee: 5 }), 35);
  assert.equal(shippingCost({}), 0);
});

test('الحصيلة: إيرادٌ − بضاعةٌ − توصيل', () => {
  const orders = [
    { total: 330, deliveryFee: 30, items: [{ productId: 'p1', cost: 100, quantity: 1 }, { productId: 'p2', cost: 40, quantity: 2 }] },
    { total: 150, deliveryFee: 0,  items: [{ productId: 'p2', cost: 40, quantity: 1 }] },
  ];
  const m = summarize(orders, PRODUCTS);
  assert.equal(m.revenue, 480);
  assert.equal(m.goods, 220);      // ١٠٠ + ٨٠ + ٤٠
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
  const before = order.total - 40;              // الصيغةُ القديمة
  const after  = summarize([order], PRODUCTS).profit;
  assert.equal(before, 90);
  assert.equal(after, 60);
  assert.equal(before - after, 30, 'الفرقُ هو رسمُ التوصيل بالضبط');
});

test('التقاطُ التكلفة لا يثق بالعميل ولا بمنتجاتِ غيره', async () => {
  const fakeDb = { getProducts: async (uid) => (uid === 'u1' ? [{ id: 'p1', cost: 70 }] : []) };

  const mine = await attachCosts(fakeDb, 'u1', [{ productId: 'p1', quantity: 2, cost: 5 }]);
  assert.equal(mine[0].cost, 70, 'التكلفةُ من قاعدة البيانات، لا من الطلب القادم من المتصفّح');

  const foreign = await attachCosts(fakeDb, 'u2', [{ productId: 'p1', cost: 5 }]);
  assert.equal(foreign[0].cost, undefined, 'منتجٌ ليس لصاحب المتجر ⇒ لا تكلفةَ مُلتقَطة');

  assert.deepEqual(await attachCosts(fakeDb, 'u1', []), []);
  assert.deepEqual(await attachCosts(fakeDb, 'u1', undefined), []);
});

test('عجزُ القاعدة لا يُسقط طلبًا', async () => {
  const brokenDb = { getProducts: async () => { throw new Error('down'); } };
  const items = await attachCosts(brokenDb, 'u1', [{ productId: 'p1', quantity: 1 }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].productId, 'p1');
});
