'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { syncOrder, runCycle } = require('../lib/trackingSync');
const { normalizeDeliveryStatus } = require('../lib/deliveryStatus');

// ============================================================
// المزامنةُ الدوريّة — أن تصل الحالةُ وحدَها.
//
//   العطبُ الذي وُلدت منه: `delivery_status` لم يكن يتغيّر إلّا بضغطة
//   **التاجر**، أو بإشعارٍ من شركةٍ تُقدّمه **وأعدّه التاجر**. فالزبونُ الذي
//   يبحث بكوده في واجهة المتجر يرى حالةً مجمّدةً عند لحظة الإنشاء — والشركةُ
//   تعرف أنّ طردَه خرج للتوزيع منذ ساعتين.
//
//   وثلاثةُ مزوّدين يُعلنون `tracking:'api'` وقادرون على الجواب. القدرةُ
//   كانت مبنيّةً ولا يستدعيها إلّا إصبع.
// ============================================================

/** قاعدةُ بياناتٍ في الذاكرة — ما يُقاس هو المنطق لا PostgreSQL. */
function fakeDb({ orders = [], providers = [] } = {}) {
  const logs = [], notes = [], updates = [];
  return {
    orders, logs, notes, updates,
    async getOrdersDueForTrackingSync() { return orders; },
    async getDeliveryProviders() { return providers; },
    async updateOrder(id, patch) {
      updates.push({ id, patch });
      const o = orders.find(x => x.id === id);
      if (o) Object.assign(o, patch);
      return o;
    },
    async addLog(l) { logs.push(l); },
    async addNotification(n) { notes.push(n); },
  };
}

const PROV = { name: 'ForceLog', apiType: 'forcelog', enabled: true, apiKey: 'k' };
const ORDER = {
  id: 'O-1', userId: 'u1', status: 'processing',
  deliveryProvider: 'ForceLog', providerShipmentId: 'F-1',
};

function stubTracking(body) {
  const original = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => body });
  return () => { global.fetch = original; };
}

const TRACK = (name) => ({
  'GET-TRACKING': { RESULT: 'SUCCESS', TRACKING_NUMBER: 'F-1', HISTORY: [{ STATUS_NAME: name, TIME: 'الآن' }] },
});

test('الحالةُ تصل وحدَها — وتُحرّك الطلبَ حين تُفهَم', async () => {
  const db = fakeDb({ orders: [{ ...ORDER }], providers: [PROV] });
  const restore = stubTracking(TRACK('Livré'));
  try {
    const r = await syncOrder(db, db.orders[0]);
    assert.equal(r.ok, true);
    assert.equal(r.changed, true);
    const p = db.updates[0].patch;
    assert.equal(p.status, 'delivered');
    assert.equal(p.deliveryStatus, 'Livré', 'ضاع نصُّ الشركة الأصليّ');
    assert.ok(p.deliverySyncedAt, 'بلا وقتِ مزامنةٍ تُستفتى نفسُ الشحنة كلَّ دورة');
    assert.equal(db.notes.length, 1, 'وصل الطردُ ولم يُخبَر التاجر');
  } finally { restore(); }
});

test('**كلمةٌ لا نعرفها لا تُحرّك الطلب** — تُحفَظ نصًّا ولا تُخمَّن', async () => {
  // تخمينُ «مُسلَّم» من كلمةٍ مجهولةٍ يُقفل طلبًا لم يصل صاحبَه. والصمتُ هنا
  // مجّانيّ: الدورةُ التالية تسأل ثانيةً.
  const db = fakeDb({ orders: [{ ...ORDER }], providers: [PROV] });
  const restore = stubTracking(TRACK('Chez le hub Casa-Sud'));
  try {
    const r = await syncOrder(db, db.orders[0]);
    assert.equal(r.ok, true);
    assert.equal(r.changed, false);
    const p = db.updates[0].patch;
    assert.equal(p.status, undefined, 'خُمّنت حالةٌ من كلمةٍ مجهولة');
    assert.equal(p.deliveryStatus, 'Chez le hub Casa-Sud');
    assert.equal(db.notes.length, 0);
  } finally { restore(); }
});

test('شحنةٌ بلا معرّفٍ لدى الشركة لا تُسأل عنها', async () => {
  const db = fakeDb({ orders: [{ ...ORDER, providerShipmentId: '' }], providers: [PROV] });
  const r = await syncOrder(db, db.orders[0]);
  assert.equal(r.ok, false);
  assert.equal(db.updates.length, 0, 'كُتب شيءٌ على طلبٍ لم يُسأل عنه');
});

test('شركةٌ لا تُقدّم تتبّعًا عبر API لا تُستفتى', async () => {
  // Amana تُعلن `tracking:'none'`. سؤالُها يُنتج خطأً في كلّ دورةٍ إلى الأبد.
  const db = fakeDb({ orders: [{ ...ORDER, deliveryProvider: 'Amana' }],
    providers: [{ name: 'Amana', apiType: 'amana', enabled: true, apiKey: 'k' }] });
  const r = await syncOrder(db, db.orders[0]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /تتبّعًا عبر API/);
});

test('الشركةُ تُقرأ في كلّ مرّة — المعطَّلةُ لا تُسأل', async () => {
  // قد يكون التاجرُ عطّلها أو بدّل مفتاحَها بين دورتَين، والصفُّ المحفوظ قديم.
  const db = fakeDb({ orders: [{ ...ORDER }], providers: [{ ...PROV, enabled: false }] });
  const r = await syncOrder(db, db.orders[0]);
  assert.equal(r.ok, false);
  assert.match(r.reason, /لا شركةَ مفعّلة/);
});

test('الدورةُ لا تمسّ ما انتهى — المُسلَّمُ والملغى لا يتغيّران', async () => {
  const db = fakeDb({
    orders: [{ ...ORDER, id: 'A', status: 'delivered' }, { ...ORDER, id: 'B', status: 'cancelled' }],
    providers: [PROV],
  });
  const restore = stubTracking(TRACK('Livré'));
  try {
    const r = await runCycle(db);
    assert.equal(r.changed, 0);
    assert.equal(db.updates.length, 0, 'استُفتيت شحنةٌ انتهت — سقفُ الطلبات يُحرَق بلا خبر');
  } finally { restore(); }
});

test('الدورةُ تُكمل رغم إخفاق شحنة — واحدةٌ لا تُوقف الباقي', async () => {
  const db = fakeDb({
    orders: [{ ...ORDER, id: 'A', providerShipmentId: '' }, { ...ORDER, id: 'B' }],
    providers: [PROV],
  });
  const restore = stubTracking(TRACK('Livré'));
  try {
    const r = await runCycle(db);
    assert.equal(r.checked, 2);
    assert.equal(r.failed, 1);
    assert.equal(r.changed, 1, 'أوقف إخفاقُ الأولى مزامنةَ الثانية');
  } finally { restore(); }
});

// ── التطبيع: مصدرٌ واحدٌ للإشعار وللمزامنة ─────────────────────
test('جدولُ الحالات واحدٌ — نسختان تنحرفان بصمت', () => {
  // كان الجدولُ داخل `routes/webhooks.js` وحدَه، ولمّا احتاجته المزامنةُ كان
  // النسخُ أسهل. ونسختان تعنيان: شحنةٌ تُقرأ ملغاةً حين يصل الإشعار وسليمةً
  // حين تُستفتى الشركة — نفسُ الطلب، جوابان، والفرقُ أيُّ مسارٍ سبق.
  const webhooks = require('fs').readFileSync(require.resolve('../routes/webhooks.js'), 'utf8');
  assert.ok(/require\(['"]\.\.\/lib\/deliveryStatus['"]\)/.test(webhooks),
    'الإشعارُ لا يقرأ الجدولَ المشترك — نسخةٌ ثانيةٌ عادت');
  assert.ok(!/const STATUS_MAP\s*=\s*\{/.test(webhooks), 'جدولٌ ثانٍ داخل مسار الإشعارات');
});

test('التطبيعُ يعرف مفرداتِ الشركات الثلاث', () => {
  assert.equal(normalizeDeliveryStatus('Livré'), 'delivered');
  assert.equal(normalizeDeliveryStatus('DELIVERED'), 'delivered');
  assert.equal(normalizeDeliveryStatus('En cours de livraison'), 'shipped');
  assert.equal(normalizeDeliveryStatus('NEW_PARCEL'), 'processing');
  assert.equal(normalizeDeliveryStatus('Refusé'), 'cancelled');
  assert.equal(normalizeDeliveryStatus('كلام غير معروف'), null, 'خُمّنت حالةٌ من كلمةٍ مجهولة');
  assert.equal(normalizeDeliveryStatus(''), null);
});
