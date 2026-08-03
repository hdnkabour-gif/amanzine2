'use strict';
const test = require('node:test');
const assert = require('node:assert');
const livo = require('../services/delivery/providers/livo.provider');

// ============================================================
// عقدُ Livo — مقروءًا من وثيقتهم الرسميّة (OpenAPI 3.0.3، rest.livo.ma).
//
//   شكوى المالك حرفيًّا: «أنشئ طلبًا، فيُنشَأ رقمُ تتبّع — لكن حين أدخل
//   موقعَ Livo لا أجد الطلبَ ولا رقمَ التتبّع».
//
//   وحين قُرئت الوثيقةُ تبيّن أنّ ما كنّا نرسله يخالف `AddOrderRequest` في
//   أربعةِ مواضع، كلٌّ منها يكفي وحدَه:
//
//     ① المستلِمُ مُعشَّشٌ في `target` — وكنّا نرسله مسطّحًا.
//     ② `products` إجباريّةٌ بمُعرِّفات Livo — وكنّا لا نرسلها.
//     ③ `cost` عندهم **المبلغُ المُحصَّل عند التسليم** — وكنّا نضع فيه رسمَ
//        التوصيل. خطأُ مالٍ: يُحصّل الموزّعُ ٢٠ درهمًا بدل ثمن الطلب.
//     ④ الطلبُ يُنشَأ `draft` ما لم نقل `status: 'pending'` — والمسوّدةُ
//        لا تدخل دورةَ التوصيل ولا تظهر في لوحتهم. **هذا هو الجواب.**
//
//   هذه الاختباراتُ تحرس العقدَ نفسَه: تعترض الطلبَ الصادرَ وتفحصه.
// ============================================================

const CFG = { apiKey: 'test-key', apiEndpoint: 'https://rest.livo.ma' };

const ORDER = {
  id: 'ord-1',
  customerName: 'أحمد بناني',
  customerPhone: '0612345678',
  city: 'casablanca',
  cityName: 'casablanca',
  address: '12 Rue des Orangers',
  total: 250,
  deliveryFee: 20,
  notes: 'اتصل قبل التسليم',
  items: [{ productId: 'p1', productName: 'Serum X', sku: 'PRD-001', quantity: 2 }],
};

/** يعترض `fetch` ويُعيد ما سُجِّل — بلا شبكة. */
function stub(handlers) {
  const calls = [];
  const real = global.fetch;
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null, headers: opts.headers });
    for (const [pattern, reply] of handlers) if (String(url).includes(pattern)) return reply;
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { calls, restore: () => { global.fetch = real; } };
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const bad = (status, body) => ({ ok: false, status, json: async () => body });

/** كتالوجُهم كما تصفه الوثيقة: مغلَّفٌ مرّتين. */
const CATALOG = ok({ success: true, data: { data: [
  { _id: 'pr-ab12cd34', name: 'Serum X', id_name: 'serum x', refr: 'PRD-001' },
] } });

const CREATED = ok({ success: true, data: { data: { _id: 'or-ab12cd34', status: 'pending' } } });

test('المستلِمُ يُرسَل مُعشَّشًا في target — لا مسطّحًا', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    const r = await livo.createShipment(ORDER, CFG);
    assert.ok(r.success, r.error);
    const post = s.calls.find(c => c.method === 'POST');
    assert.ok(post, 'لم يُرسَل طلبُ إنشاء');
    assert.ok(post.body.target, '"target" غائب — Livo ترفض بـ«"target" is required»');
    assert.strictEqual(post.body.target.name, 'أحمد بناني');
    assert.strictEqual(post.body.target.city, 'casablanca');
    assert.strictEqual(post.body.target.address, '12 Rue des Orangers');
    // ولا تُرسَل الحقولُ المسطّحةُ القديمة.
    assert.strictEqual(post.body.recipientName, undefined, 'حقلٌ مسطّحٌ قديمٌ ما زال يُرسَل');
  } finally { s.restore(); }
});

test('cost هو المبلغُ المُحصَّل عند التسليم، لا رسمُ التوصيل', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    await livo.createShipment(ORDER, CFG);
    const post = s.calls.find(c => c.method === 'POST');
    assert.strictEqual(post.body.cost, 250,
      'cost = رسمُ التوصيل ⇒ الموزّعُ يُحصّل ٢٠ درهمًا بدل ٢٥٠. خطأُ مال.');
  } finally { s.restore(); }
});

test('الطلبُ يُرسَل pending — والمسوّدةُ لا يراها أحد', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    await livo.createShipment(ORDER, CFG);
    const post = s.calls.find(c => c.method === 'POST');
    assert.strictEqual(post.body.status, 'pending',
      'بلا status: pending يبقى الطلبُ draft — لا يدخل دورةَ التوصيل ولا يظهر في لوحة Livo');
  } finally { s.restore(); }
});

test('البنودُ تُرسَل بمُعرِّفات Livo، مطابَقةً بالـSKU', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    await livo.createShipment(ORDER, CFG);
    const post = s.calls.find(c => c.method === 'POST');
    assert.ok(Array.isArray(post.body.products) && post.body.products.length === 1,
      '"products" إجباريّة — الطلبُ بلا بنودٍ مرفوض');
    assert.strictEqual(post.body.products[0].product_id, 'pr-ab12cd34',
      'المُعرِّفُ ليس من كتالوج Livo');
    assert.strictEqual(post.body.products[0].quantity, 2);
  } finally { s.restore(); }
});

test('المطابقةُ بالاسم حين يغيب الـSKU', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    const r = await livo.createShipment(
      { ...ORDER, items: [{ productId: 'p1', productName: 'Serum X', quantity: 1 }] }, CFG);
    assert.ok(r.success, r.error);
    const post = s.calls.find(c => c.method === 'POST');
    assert.strictEqual(post.body.products[0].product_id, 'pr-ab12cd34');
  } finally { s.restore(); }
});

test('منتجٌ غيرُ مسجَّلٍ عندهم يُوقف الطلبَ ويُسمّى — لا يُسقَط بصمت', async () => {
  // طلبٌ ينقصه بندٌ طلبٌ خاطئٌ يصل إلى الزبون ناقصًا. الصمتُ هنا أسوأُ من الفشل.
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    const r = await livo.createShipment(
      { ...ORDER, items: [{ productId: 'x', productName: 'منتجٌ مجهول', quantity: 1 }] }, CFG);
    assert.strictEqual(r.success, false);
    assert.ok(/منتجٌ مجهول/.test(r.error), `الرسالةُ لا تُسمّي الناقص: ${r.error}`);
    assert.ok(!s.calls.some(c => c.method === 'POST'), 'أُرسل طلبٌ ناقصُ البنود');
  } finally { s.restore(); }
});

test('رقمُ التتبّع هو مُعرِّفُ Livo نفسُه — ولا يُختلَق', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    const r = await livo.createShipment(ORDER, CFG);
    assert.strictEqual(r.trackingNumber, 'or-ab12cd34');
    assert.strictEqual(r.shipmentId, 'or-ab12cd34');
    assert.ok(!/^TRK-/.test(r.trackingNumber), 'رقمُ تتبّعٍ مُختلَق');
  } finally { s.restore(); }
});

test('رسائلُ خطئهم تُقرأ من en_message/fr_message لا من message', async () => {
  const s = stub([['/products', CATALOG], ['/orders', bad(400, {
    success: false,
    data: { en_message: 'City not allowed for your account', fr_message: 'Ville non autorisée', type: 'client' },
  })]]);
  try {
    const r = await livo.createShipment(ORDER, CFG);
    assert.strictEqual(r.success, false);
    assert.ok(/autoris/i.test(r.error), `رسالةٌ غيرُ مقروءة: ${r.error}`);
    assert.ok(!/HTTP 400/.test(r.error), 'يُعرَض «HTTP 400» بلا سبب');
  } finally { s.restore(); }
});

test('طلبُ التأكيد (prompt) يُميَّز عن الفشل', async () => {
  // هاتفٌ مكرَّرٌ خلال ٣٠ دقيقة: ليس رفضًا بل سؤالًا.
  const s = stub([['/products', CATALOG], ['/orders', bad(400, {
    success: false,
    data: { en_message: 'The phone number was previously used', type: 'prompt', details: { confirm_text: 'duplicate_target' } },
  })]]);
  try {
    const r = await livo.createShipment(ORDER, CFG);
    assert.ok(/تأكيد/.test(r.error), `طلبُ التأكيد يُعرَض كفشلٍ عاديّ: ${r.error}`);
  } finally { s.restore(); }
});

test('المستلِمُ الناقصُ يُوقف الطلبَ قبل مسّ الشبكة', async () => {
  const s = stub([['/products', CATALOG], ['/orders', CREATED]]);
  try {
    const r = await livo.createShipment({ ...ORDER, address: '' }, CFG);
    assert.strictEqual(r.success, false);
    assert.strictEqual(s.calls.length, 0, 'نُودي الشبكةَ بطلبٍ نعرف أنّه مرفوض');
  } finally { s.restore(); }
});

test('المدنُ: تُعرَض ما تُسلَّم فيه الطلباتُ فقط', async () => {
  // عرضُ مدينةٍ بـ`canOrder: false` يعني طلبًا يُرفَض بعد أن يملأه التاجر.
  const s = stub([['/cities', ok({ success: true, data: { data: [
    { _id: 'ci-1', name: 'casablanca', canOrder: true,  canPickup: true },
    { _id: 'ci-2', name: 'tangier',    canOrder: false, canPickup: false },
  ] } })]]);
  try {
    const r = await livo.getCities(CFG);
    assert.ok(r.success);
    assert.deepStrictEqual(r.cities.map(c => c.name), ['casablanca'],
      'مدينةٌ لا تُسلَّم فيها الطلباتُ تُعرَض للتاجر');
  } finally { s.restore(); }
});

test('التسعيرُ يقرأ رسمَ التوصيل لا cost — المعنيان لا يتسرّبان', async () => {
  const q = await livo.calculateQuote({ cityName: 'casablanca', cost: 999, deliveryFee: 20 }, CFG);
  assert.strictEqual(q.deliveryFee, 20, 'رسمُ التوصيل قُرئ من cost — وهو مبلغُ التحصيل');
  const q2 = await livo.calculateQuote({ cityName: 'agadir' }, CFG);
  assert.strictEqual(q2.deliveryFee, 35);
});

test('التتبّعُ يقرأ الحالةَ وحالةَ الإرجاع', async () => {
  const s = stub([['/orders/or-1', ok({ success: true, data: { data: {
    _id: 'or-1', status: 'in progress', return_status: null,
  } } })]]);
  try {
    const r = await livo.trackShipment('or-1', CFG);
    assert.ok(r.success, r.error);
    assert.strictEqual(r.status, 'in progress');
    assert.strictEqual(r.trackingNumber, 'or-1');
  } finally { s.restore(); }
});
