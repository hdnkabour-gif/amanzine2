'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../services/delivery/registry');

// ============================================================
// Olivraison و ForceLog — مزوّدان كُتبا من وثيقتَيهما لا من كلامٍ تسويقيّ.
//
//   ولكلٍّ منهما مخالفةٌ تكفي وحدَها لكسر مزوّدٍ كُتب على النمط المعتاد،
//   وهذه الاختباراتُ تحرسها **بردودٍ حقيقيّةِ الشكل** لا بادّعاء:
//
//     Olivraison  مصادفةٌ بخطوتين (JWT) + `/package/new` لا `/package`
//     ForceLog    الردُّ مغلَّفٌ باسم العمليّة + المدنُ **كائنٌ لا مصفوفة**
//
//   ولا شبكةَ هنا: `fetch` يُستبدَل بردٍّ محفوظ. اختبارٌ يضرب خادمَ شركةٍ
//   حقيقيًّا يفشل يومَ تتعطّل شبكتُهم ويقول لنا إنّ كودَنا معطوب.
// ============================================================

const olivraison = registry.get('olivraison');
const forcelog = registry.get('forcelog');

/** يستبدل `fetch` بدالّةٍ تُجيب حسب المسار، ويُعيد سجلَّ ما أُرسل. */
function stubFetch(routes) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, opts });
    const key = Object.keys(routes).find(k => u.includes(k));
    const r = key ? routes[key] : { status: 404, body: {} };
    const body = typeof r.body === 'function' ? r.body(opts) : r.body;
    return {
      ok: (r.status || 200) < 400,
      status: r.status || 200,
      json: async () => body,
    };
  };
  return { calls, restore: () => { global.fetch = original; } };
}

const ORDER = {
  id: 'ORD-9', customerName: 'سارة', customerPhone: '0612265893',
  city: 'Casablanca', cityName: 'Casablanca', address: 'حي المسيرة',
  total: 350, notes: 'قبل المغرب',
  items: [{ productName: 'صباط', quantity: 2, sku: 'SB-1' }],
};

// ── Olivraison ────────────────────────────────────────────────
test('Olivraison: مُعلَنةٌ في السجلّ بحقلَيها لا أكثر', () => {
  assert.ok(olivraison, 'لم تُكتشَف Olivraison');
  const keys = olivraison.meta.credentials.map(f => f.key);
  assert.deepEqual(keys, ['apiKey', 'secretKey']);
  // الشركةُ لا تطلب اسمًا ولا هاتفًا ولا رابطَ موقع — ولا يجوز أن نسأل عنها.
  for (const banned of ['name', 'phone', 'websiteUrl', 'loginUrl', 'username', 'password']) {
    assert.ok(!keys.includes(banned), `سُئل التاجرُ عن «${banned}» ولا تطلبه الشركة`);
  }
  assert.equal(olivraison.capabilities.tracking, 'api');
  assert.equal(olivraison.capabilities.pricing, 'api');
});

test('Olivraison: تُبادل المفتاحَين برمزٍ ثمّ تُرسل Bearer — لا مفتاحَ خامٌّ في الترويسة', async () => {
  const s = stubFetch({
    '/auth/login': { body: { token: 'JWT-1', expiration: '7d' } },
    '/package/new': { status: 201, body: { status: 'CONFIRMED', trackingID: 'OL-77' } },
  });
  try {
    const r = await olivraison.createShipment(ORDER, { fields: { apiKey: 'ak', secretKey: 'sk' } });
    assert.deepEqual(r, { success: true, shipmentId: 'OL-77', trackingNumber: 'OL-77' });

    const login = s.calls.find(c => c.url.includes('/auth/login'));
    assert.ok(login, 'لم يُسجَّل الدخول');
    assert.deepEqual(JSON.parse(login.opts.body), { apiKey: 'ak', secretKey: 'sk' });

    const create = s.calls.find(c => c.url.includes('/package/new'));
    assert.equal(create.opts.headers.Authorization, 'Bearer JWT-1');
    const sent = JSON.parse(create.opts.body);
    // ⚠️ `price` هو المبلغُ المُحصَّل من الزبون — لا رسمُ التوصيل. الخلطُ
    // هنا يُحصّل ٢٠ درهمًا بدل ٣٥٠، وقد وقع حرفيًّا مع Livo في هذا المشروع.
    assert.equal(sent.price, 350);
    assert.equal(sent.destination.phone, '0612265893');
    // بضاعةُ التاجر ليست في مستودعهم ⇒ لا `fullfillment` بمراجعَ لا يعرفونها.
    assert.equal(sent.inventory, undefined);
    assert.equal(sent.fullfillment, undefined);
  } finally { s.restore(); }
});

test('Olivraison: النقطةُ المستعمَلة `/package/new` لا `/package`', async () => {
  // `/package` تُنشئ الشحنةَ **مؤكَّدةً** فورًا فلا تُصحَّح، و`/package/new`
  // تتركها `CREATED`. اختيارُ الأولى يجعل خطأً في عنوانٍ نهائيًّا.
  const s = stubFetch({
    '/auth/login': { body: { token: 'T' } },
    '/package': { status: 201, body: { trackingID: 'OL-1' } },
  });
  try {
    await olivraison.createShipment(ORDER, { fields: { apiKey: 'a', secretKey: 'b' } });
    assert.ok(s.calls.some(c => c.url.endsWith('/package/new')), 'لم تُستعمَل النقطةُ القابلةُ للتصحيح');
  } finally { s.restore(); }
});

test('Olivraison: بلا رقمِ تتبّعٍ لا نجاح', async () => {
  // «تمّ» بلا رقمٍ أسوأُ من فشلٍ صريح: التاجرُ يطمئنّ ولا شحنةَ عندهم.
  const s = stubFetch({
    '/auth/login': { body: { token: 'T' } },
    '/package/new': { status: 201, body: { status: 'CONFIRMED' } },
  });
  try {
    const r = await olivraison.createShipment(ORDER, { fields: { apiKey: 'a', secretKey: 'b' } });
    assert.equal(r.success, false);
    assert.match(r.error, /رقمَ تتبّع/);
  } finally { s.restore(); }
});

test('Olivraison: المدنُ والأثمانُ من نفس النقطة', async () => {
  const s = stubFetch({
    '/auth/login': { body: { token: 'T' } },
    '/cities': { body: [{ name: 'Casablanca', price: 25 }, { name: 'Fès', price: 35 }] },
  });
  try {
    const cfg = { fields: { apiKey: 'a2', secretKey: 'b' } };
    const c = await olivraison.getCities(cfg);
    assert.equal(c.success, true);
    assert.equal(c.cities.length, 2);
    const q = await olivraison.calculateQuote({ cityName: 'Fès' }, cfg);
    assert.equal(q.deliveryFee, 35);
    assert.equal(q.supported, true);
    // ومدينةٌ لا تخدمها **تُعلَن غيرَ مدعومة** لا تُسعَّر بصفر — وصفرٌ يبدو
    // توصيلًا مجّانيًّا للزبون، ثمّ يُرفَض الطلبُ عند الشركة.
    const bad = await olivraison.calculateQuote({ cityName: 'Lagouira' }, cfg);
    assert.equal(bad.supported, false);
  } finally { s.restore(); }
});

test('Olivraison: الرمزُ المخبَّأ لا يُعاد شراؤه في كلّ نداء', async () => {
  // سقفُهم ٥ طلباتٍ في الثانية. تسجيلُ دخولٍ مع كلّ نداءٍ يحرق نصفَه بلا فائدة.
  const s = stubFetch({
    '/auth/login': { body: { token: 'T' } },
    '/cities': { body: [{ name: 'Rabat', price: 20 }] },
  });
  try {
    const cfg = { fields: { apiKey: 'cache-me', secretKey: 'b' } };
    await olivraison.getCities(cfg);
    await olivraison.getCities(cfg);
    await olivraison.getCities(cfg);
    assert.equal(s.calls.filter(c => c.url.includes('/auth/login')).length, 1,
      'سُجّل الدخولُ أكثرَ من مرّةٍ لنفس المفتاح');
  } finally { s.restore(); }
});

// ── ForceLog ──────────────────────────────────────────────────
test('ForceLog: مفتاحٌ واحدٌ لا غير', () => {
  assert.ok(forcelog, 'لم تُكتشَف ForceLog');
  assert.deepEqual(forcelog.meta.credentials.map(f => f.key), ['apiKey']);
  assert.equal(forcelog.capabilities.pricing, 'api');
});

test('ForceLog: الردُّ مغلَّفٌ باسم العمليّة — و`RESULT` هو الحَكَم', async () => {
  // خطأُ ForceLog يصل بـHTTP 200 والجسمُ يقول `RESULT: ERROR`. فمن حكم بـ
  // `res.ok` وحدَها أعلن نجاحًا على فشلٍ صريح.
  const s = stubFetch({
    '/AddParcel': { status: 200, body: { 'ADD-PARCEL': { RESULT: 'ERROR', MESSAGE: 'City not found' } } },
  });
  try {
    const r = await forcelog.createShipment(ORDER, { apiKey: 'k' });
    assert.equal(r.success, false);
    assert.equal(r.error, 'City not found');
  } finally { s.restore(); }
});

test('ForceLog: النجاحُ يُقرأ من داخل الغلاف، والمفتاحُ في X-API-Key', async () => {
  const s = stubFetch({
    '/AddParcel': {
      body: { 'ADD-PARCEL': { RESULT: 'SUCCESS', 'NEW-PARCEL': { TRACKING_NUMBER: 'F-123' } } },
    },
  });
  try {
    const r = await forcelog.createShipment(ORDER, { apiKey: 'my-key' });
    assert.deepEqual(r, { success: true, shipmentId: 'F-123', trackingNumber: 'F-123' });
    const call = s.calls[0];
    assert.equal(call.opts.headers['X-API-Key'], 'my-key');
    const sent = JSON.parse(call.opts.body);
    assert.equal(sent.COD, 350, 'COD هو المبلغُ المُحصَّل لا رسمُ التوصيل');
    assert.equal(sent.RECEIVER, 'سارة');
  } finally { s.restore(); }
});

test('ForceLog: الحقولُ تُقَصّ إلى حدودها المُعلَنة', async () => {
  // وثيقتُهم تُعلن الحدود (اسم ٥٠ · هاتف ١٤ · عنوان ١٠٠). والتجاوزُ يُرفَض:
  // أن تصل الشحنةُ بعنوانٍ مقصوصٍ خيرٌ من أن تُرفَض كلُّها.
  const s = stubFetch({
    '/AddParcel': { body: { 'ADD-PARCEL': { RESULT: 'SUCCESS', 'NEW-PARCEL': { TRACKING_NUMBER: 'F-9' } } } },
  });
  try {
    await forcelog.createShipment({
      ...ORDER, customerName: 'ا'.repeat(120), address: 'ب'.repeat(300), notes: 'ج'.repeat(300),
    }, { apiKey: 'k' });
    const sent = JSON.parse(s.calls[0].opts.body);
    assert.equal(sent.RECEIVER.length, 50);
    assert.equal(sent.ADDRESS.length, 100);
    assert.equal(sent.COMMENT.length, 100);
  } finally { s.restore(); }
});

test('ForceLog: المدنُ **كائنٌ لا مصفوفة** — وتحمل ثمنَها', async () => {
  // `pickArray` تُرجع `[]` بحقٍّ هنا: الشكلُ `{"34":{…}}` مفتاحُه مُعرِّفُ
  // المدينة، وهو ما يُرسَل في `CITY`. من افترض مصفوفةً وجد صفرَ مدن.
  const s = stubFetch({
    '/customer/Cities': {
      body: {
        17: { CODE: 'NDR', NAME: 'Nador', D_FEES: '45', D_FEES_SAME_CITY: '45' },
        34: { CODE: 'CAS', NAME: 'Casablanca', D_FEES: '30', D_FEES_SAME_CITY: '20' },
      },
    },
  });
  try {
    const cfg = { apiKey: 'k' };
    const c = await forcelog.getCities(cfg);
    assert.equal(c.success, true);
    assert.equal(c.cities.length, 2);
    const casa = c.cities.find(x => x.name === 'Casablanca');
    assert.equal(casa.id, '34', 'المُعرِّفُ هو مفتاحُ الكائن — وهو ما يُرسَل');
    assert.equal(casa.price, 30);
    assert.equal(casa.priceSameCity, 20);

    // والثمنُ الأقلُّ داخل نفس المدينة يُطبَّق — تُعلنه الشركةُ ولا يُخمَّن.
    const out = await forcelog.calculateQuote({ cityName: 'Casablanca' }, cfg);
    assert.equal(out.deliveryFee, 30);
    const same = await forcelog.calculateQuote({ cityName: 'Casablanca', originCity: 'Casablanca' }, cfg);
    assert.equal(same.deliveryFee, 20);
  } finally { s.restore(); }
});

test('ForceLog: التتبّعُ يقرأ التاريخَ ويأخذ آخرَه حالًا', async () => {
  const s = stubFetch({
    '/GetTracking': {
      body: {
        'GET-TRACKING': {
          RESULT: 'SUCCESS', TRACKING_NUMBER: 'F-5',
          HISTORY: [
            { STATUS_CODE: 'NEW_PARCEL', STATUS_NAME: 'Nouveau', CITY_NAME: '', TIME: 'أمس' },
            { STATUS_CODE: 'DELIVERED', STATUS_NAME: 'Livré', CITY_NAME: 'Casablanca', TIME: 'اليوم' },
          ],
        },
      },
    },
  });
  try {
    const r = await forcelog.trackShipment('F-5', { apiKey: 'k' });
    assert.equal(r.success, true);
    assert.equal(r.status, 'Livré', 'أُخذ أوّلُ التاريخ بدل آخره');
    assert.equal(r.history.length, 2);
    assert.equal(r.trackingNumber, 'F-5');
  } finally { s.restore(); }
});

// ── ما يجمعهما: العقد ─────────────────────────────────────────
test('المزوّدان الجديدان يُطابقان العقدَ ولا يُرفضان', () => {
  assert.deepEqual(registry.rejected(), []);
  for (const p of [olivraison, forcelog]) {
    assert.equal(typeof p.createShipment, 'function');
    assert.equal(typeof p.trackShipment, 'function');
    for (const f of p.meta.credentials) {
      assert.ok(f.label && f.help, `${p.meta.id}: حقلٌ بلا شرحٍ يُترك التاجرُ أمامه حائرًا`);
    }
  }
});
