'use strict';
// ============================================================
// عطبٌ عابرٌ لدى شركة التوصيل لا يُضيع شحنةً ولا يُحمِّل التاجرَ عملًا.
//
//   `lib/retryQueue.js` كان مبنيًّا ومعه اختبارُه ولا يستدعيه أحدٌ في الإنتاج.
//   فكان مسارُ الشحن يعامل **كلَّ** فشلٍ معاملةَ الفشل الدائم: «سجّل الطلبَ في
//   موقع الشركة وأدخل رقمَ التتبّع». مهلةُ دقيقتَين ⇒ عملٌ يدويٌّ على صاحب
//   المحلّ، وشحنةٌ قد لا تُرسَل إن انشغل.
//
//   وأخطرُ ما يُختبَر هنا ليس الجدولةَ بل **ألّا تُنشَأ شحنتان**: طلبٌ نجح
//   شحنُه بين محاولتَين يجب أن يخرج من الطابور فورًا.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-shipment-retry-only-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

const { decide, isTransient } = require('../lib/retryQueue');

// ── ما لا يحتاج قاعدةً: القرارُ نفسُه ──────────────────────────
rawTest('العابرُ يُعاد والدائمُ لا — وهذا هو الفرقُ كلُّه', () => {
  assert.equal(decide({ error: 'HTTP 503 Service Unavailable', attempts: 0 }).retry, true);
  assert.equal(decide({ error: 'ETIMEDOUT', attempts: 0 }).retry, true);
  assert.equal(decide({ error: 'HTTP 429 Too Many Requests', attempts: 0 }).retry, true);
  // مفتاحٌ خاطئٌ أو مدينةٌ مرفوضة لن تُصلحها ألفُ محاولة.
  assert.equal(decide({ error: 'HTTP 401 Unauthorized', attempts: 0 }).retry, false);
  assert.equal(decide({ error: 'city not supported', attempts: 0 }).retry, false);
  assert.equal(decide({ error: 'لا يوجد مفتاح API أو Webhook مهيأ', attempts: 0 }).retry, false);
});

rawTest('الإعادةُ تنتهي — لا طابورَ أبديّ', () => {
  assert.equal(decide({ error: 'timeout', attempts: 5, maxAttempts: 5 }).retry, false);
  assert.match(decide({ error: 'timeout', attempts: 5, maxAttempts: 5 }).reason, /استُنفدت/);
});

// ── الوصل: هل يستدعيه الإنتاجُ فعلًا؟ ──────────────────────────
//
//   هذا هو الاختبارُ الذي كان غائبًا. `retry-queue.test.js` يُثبت أنّ القرارَ
//   صحيح، ولا يقول شيئًا عن كونِه يُتَّخذ. وحدةٌ صحيحةٌ بلا مستهلكٍ عطبٌ لا ميزة.
rawTest('مسارُ الشحن يستشير الطابور — لا يقرّر بنفسه', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'lib', 'shipmentAttempt.js'), 'utf8');
  assert.match(src, /require\('\.\/retryQueue'\)/, 'مسارُ الشحن لا يعرف الطابورَ أصلًا');
  assert.match(src, /decide\(\{\s*error/, 'الطابورُ مستوردٌ ولا يُستشار');
  assert.match(src, /retry_scheduled/, 'لا حالةَ «مجدوَلة» — كلُّ فشلٍ يُسلَّم للإنسان كما كان');
});

rawTest('المُعيدُ الدوريُّ مركَّبٌ ويسلك نفسَ مسار الزرّ', () => {
  const idx = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(idx, /startShipmentRetryCron\(\);/, 'المُعيدُ معرَّفٌ ولا يُشغَّل');
  assert.match(idx, /getOrdersDueForDeliveryRetry/, 'المُعيدُ لا يسأل عن الطلبات المستحقّة');
  // نفسُ الدالّة لا نسخةٌ منها: النسختان تتباعدان في شحنةٍ حقيقيّةٍ لزبون.
  assert.match(idx, /require\('\.\/lib\/shipmentAttempt'\)/, 'المُعيدُ ينسخ مسارَ الشحن بدل أن يشترك فيه');
});

// ── وعلى قاعدةٍ حقيقيّة ────────────────────────────────────────
let pool, db, USER_ID;
before(async () => {
  if (SKIP) return;
  db = require('../database').db;
  pool = require('../db');
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('retry@test.ma')
    || await db.createUser({ name: 'R', email: 'retry@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  USER_ID = u.id;
  await pool.query(`DELETE FROM orders WHERE user_id = $1 AND id LIKE 'retry-test-%'`, [USER_ID]);
});
after(async () => { if (SKIP) return; await pool.end?.(); });

const mkOrder = async (id, patch) => {
  await pool.query(
    `INSERT INTO orders (id, user_id, customer_name, customer_phone, city, address, items, total, status)
     VALUES ($1,$2,'ز','0600000000','الدار البيضاء','عنوان','[]',100,'processing')
     ON CONFLICT (id) DO NOTHING`, [id, USER_ID]);
  await db.updateOrder(id, patch);
};

test('الطلبُ المجدوَلُ الذي حان موعدُه يُلتقَط', async () => {
  await mkOrder('retry-test-due', {
    deliveryStatus: 'retry_scheduled',
    deliveryRetryAt: new Date(Date.now() - 60000).toISOString(),
    deliveryAttempts: 1,
  });
  const due = await db.getOrdersDueForDeliveryRetry();
  assert.ok(due.some(o => o.id === 'retry-test-due'), 'لم يُلتقَط طلبٌ حان موعدُه');
});

test('الذي لم يحن موعدُه لا يُلتقَط — التباعدُ الأُسّيّ يُحترَم', async () => {
  await mkOrder('retry-test-future', {
    deliveryStatus: 'retry_scheduled',
    deliveryRetryAt: new Date(Date.now() + 3600000).toISOString(),
    deliveryAttempts: 1,
  });
  const due = await db.getOrdersDueForDeliveryRetry();
  assert.ok(!due.some(o => o.id === 'retry-test-future'), 'أُعيد قبل موعده — التباعدُ بلا أثر');
});

test('**الحارسُ الأهمّ**: طلبٌ صار له رقمُ تتبّعٍ لا يُعاد — لا شحنتان لزبون', async () => {
  await mkOrder('retry-test-shipped', {
    deliveryStatus: 'retry_scheduled',
    deliveryRetryAt: new Date(Date.now() - 60000).toISOString(),
    deliveryAttempts: 2,
    trackingNumber: 'REAL-123',
  });
  const due = await db.getOrdersDueForDeliveryRetry();
  assert.ok(!due.some(o => o.id === 'retry-test-shipped'),
    'طلبٌ مشحونٌ ما زال في الطابور — ستُنشَأ له شحنةٌ ثانية');
});

test('عدّادُ المحاولات وموعدُها يُحفظان ويُقرآن', async () => {
  const o = await db.getOrder('retry-test-due');
  assert.equal(o.deliveryAttempts, 1, 'عدّادُ المحاولات لا يُقرأ');
  assert.ok(o.deliveryRetryAt, 'موعدُ الإعادة لا يُقرأ');
});


test('carrier ACK without reference: PostgreSQL status requires confirmation, no tracking, no auto retry', async () => {
  const { runShipment } = require('../lib/shipmentAttempt');
  await mkOrder('retry-test-unconfirmed', { deliveryStatus: '', trackingNumber: '' });
  const order = await db.getOrder('retry-test-unconfirmed');
  const originalFetch = global.fetch;
  let called = 0;
  global.fetch = async () => { called++; return {
    ok: true, status: 202, json: async () => ({ received: true }),
  }; };
  try {
    const result = await runShipment({
      userId: USER_ID, order,
      prov: { id: 'qa-provider-row', name: 'QA Carrier', apiType: 'webhook',
        webhookUrl: 'https://carrier.example.invalid/webhook', apiKey: 'TEST-ONLY' },
      settings: { brand: { currency: 'MAD' } },
    });
    assert.equal(called, 1);
    assert.equal(result.real, false, 'unverified carrier ACK recorded as shipment');
    assert.equal(result.acceptedUnconfirmed, true);
    assert.equal(result.needsManual, false, 'unknown state must not prompt duplicate manual submission');
    assert.equal(result.retryAt, undefined, 'blind retry could create duplicate COD parcel');
    const saved = await db.getOrder(order.id);
    assert.equal(saved.deliveryStatus, 'confirmation_required');
    assert.equal(saved.trackingNumber || '', '');
    assert.equal(saved.status, 'processing');
    const due = await db.getOrdersDueForDeliveryRetry();
    assert.ok(!due.some(x => x.id === order.id), 'unconfirmed parcel automatically re-scheduled');
  } finally { global.fetch = originalFetch; }
});

test('carrier returns a real reference: persisted tracking comes from provider, not generated internally', async () => {
  const { runShipment } = require('../lib/shipmentAttempt');
  await mkOrder('retry-test-carrier-confirmed', { deliveryStatus: '', trackingNumber: '' });
  const order = await db.getOrder('retry-test-carrier-confirmed');
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 201,
    json: async () => ({ shipmentId: 'QA-REMOTE-55', trackingNumber: 'QA-TRACK-55' }) });
  try {
    const out = await runShipment({
      userId: USER_ID, order,
      prov: { id: 'qa-provider-row', name: 'QA Carrier', apiType: 'webhook',
        webhookUrl: 'https://carrier.example.invalid/webhook' },
      settings: { brand: { currency: 'MAD' } },
    });
    assert.equal(out.real, true);
    assert.equal(out.tracking, 'QA-TRACK-55');
    const updated = await db.getOrder(order.id);
    assert.equal(updated.trackingNumber, 'QA-TRACK-55');
    assert.equal(updated.providerShipmentId, 'QA-REMOTE-55');
  } finally { global.fetch = originalFetch; }
});

rawTest('delivery creation endpoint blocks resending already submitted or unconfirmed orders', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '../routes/delivery.js'), 'utf8');
  assert.match(src, /order\.deliveryStatus === 'confirmation_required'/);
  assert.match(src, /CARRIER_CONFIRMATION_REQUIRED/);
  assert.match(src, /order\.providerShipmentId \|\| order\.trackingNumber/);
  assert.match(src, /SHIPMENT_ALREADY_EXISTS/);
});


test('carrier HTTP create route rejects unknown choice and blocks duplicate submission (PostgreSQL)', async () => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/delivery', require('../routes/delivery'));
  const listener = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const base = 'http://127.0.0.1:' + listener.address().port;
  const token = jwt.sign({ id: USER_ID, email: 'retry@test.ma', role: 'user' },
    process.env.JWT_SECRET, { expiresIn: '1h' });
  const send = async (id, provider) => {
    const r = await fetch(base + '/api/delivery/create/' + id, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ provider }),
    });
    return { status: r.status, data: await r.json() };
  };
  const old = db.getDeliveryProviders;
  db.getDeliveryProviders = async () => [
    { id: 'qa-carrier-1', name: 'Carrier A', apiType: 'webhook', enabled: true,
      webhookUrl: 'https://carrier.example.invalid/create' },
  ];
  try {
    await mkOrder('retry-test-selection', { status: 'approved', deliveryStatus: '', trackingNumber: '' });
    const invalid = await send('retry-test-selection', 'Wrong Carrier');
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.code, 'CARRIER_NOT_FOUND');
    assert.equal((await db.getOrder('retry-test-selection')).trackingNumber || '', '');

    await mkOrder('retry-test-locked', { deliveryStatus: 'confirmation_required', trackingNumber: '' });
    const locked = await send('retry-test-locked', 'Carrier A');
    assert.equal(locked.status, 409);
    assert.equal(locked.data.code, 'CARRIER_CONFIRMATION_REQUIRED');

    await mkOrder('retry-test-already', { deliveryStatus: '', trackingNumber: 'REAL-ALREADY-EXISTS' });
    const duplicate = await send('retry-test-already', 'Carrier A');
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.data.code, 'SHIPMENT_ALREADY_EXISTS');
  } finally {
    db.getDeliveryProviders = old;
    await new Promise(resolve => listener.close(resolve));
  }
});


test('chosen carrier B is the only webhook target even when A is configured as default', async () => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/delivery', require('../routes/delivery'));
  const listener = await new Promise(resolve => { const srv = app.listen(0, () => resolve(srv)); });
  const base = 'http://127.0.0.1:' + listener.address().port;
  const token = jwt.sign({ id: USER_ID, role: 'user', email: 'retry@test.ma' },
    process.env.JWT_SECRET, { expiresIn: '1h' });
  const originals = {
    fetch: global.fetch,
    providers: db.getDeliveryProviders,
    settings: db.getSettings,
  };
  const calls = [];
  db.getSettings = async () => ({ delivery: { defaultProvider: 'Carrier A' },
    brand: { currency: 'MAD' } });
  db.getDeliveryProviders = async () => [
    { id: 'qa-carrier-a', name: 'Carrier A', apiType: 'webhook', enabled: true,
      webhookUrl: 'https://carrier.example.invalid/a' },
    { id: 'qa-carrier-b', name: 'Carrier B', apiType: 'webhook', enabled: true,
      webhookUrl: 'https://carrier.example.invalid/b' },
  ];
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://carrier.example.invalid/')) {
      calls.push(String(url));
      return { ok: true, status: 201,
        json: async () => ({ shipmentId: 'QA-REMOTE-B', trackingNumber: 'QA-TRACK-B' }) };
    }
    return originals.fetch(url, options);
  };
  try {
    await mkOrder('retry-test-carrier-route', { status: 'approved', trackingNumber: '', deliveryStatus: '' });
    const response = await originals.fetch(base + '/api/delivery/create/retry-test-carrier-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ provider: 'Carrier B' }),
    });
    const out = await response.json();
    assert.equal(response.status, 200, JSON.stringify(out));
    assert.equal(out.real, true);
    assert.equal(out.tracking, 'QA-TRACK-B');
    assert.deepEqual(calls, ['https://carrier.example.invalid/b'],
      'explicit carrier choice ignored: shipment sent to the default / first carrier');
    const saved = await db.getOrder('retry-test-carrier-route');
    assert.equal(saved.deliveryProvider, 'Carrier B');
    assert.equal(saved.trackingNumber, 'QA-TRACK-B');
  } finally {
    global.fetch = originals.fetch;
    db.getDeliveryProviders = originals.providers;
    db.getSettings = originals.settings;
    await new Promise(resolve => listener.close(resolve));
  }
});
