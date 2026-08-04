'use strict';
// ============================================================
// دفترُ أحداث الطلب — من طرفٍ إلى طرف، على قاعدةٍ حقيقيّة.
//
//   السيناريو هو الذي كسر نموذجَ العمود الواحد: طلبٌ من ثلاثِ قطعٍ بـ١٥٠،
//   يُخصَم، يُشحَن، يُسلَّم، ثمّ **يرفض الزبونُ قطعةً واحدةً عند الباب**.
//   العمودُ الواحد لا يصفه: لا `delivered` صادقةٌ ولا `returned`. والدفترُ
//   يصفه بلا تناقض، ويُخرِج المبلغَ الصحيحَ محسوبًا لا مكتوبًا.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-order-events-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '', USER_ID = '', ORDER_ID = '';
const req = async (method, path, body) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const EMAIL = 'orderevents@test.ma';

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail(EMAIL)
    || await db.createUser({ name: 'OE', email: EMAIL, password: bcrypt.hashSync('x', 4), role: 'user' });
  USER_ID = u.id;
  TOKEN = require('jsonwebtoken').sign({ id: u.id, email: EMAIL, role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });

  // نظّف دفترَ الجولة السابقة: دفترٌ لا يُحذَف منه في الإنتاج، لكنّ اختبارًا
  // يقرأ أحداثَ أمسِ يقيس شيئًا آخر.
  await pool.query('DELETE FROM order_events WHERE user_id=$1', [USER_ID]);
  await pool.query('DELETE FROM orders WHERE user_id=$1', [USER_ID]);

  const o = await db.createOrder({
    userId: USER_ID, customerName: 'زبونة', customerPhone: '0600000000',
    city: 'طنجة', address: 'حيّ ما', total: 150, status: 'pending',
    items: [
      { productId: 'p1', productName: 'سروال', quantity: 1, price: 50 },
      { productId: 'p2', productName: 'قاميجة', quantity: 2, price: 50 },
    ],
  });
  ORDER_ID = o.id || o;

  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../routes/orders'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

test('الطلبُ الجديد: دفترٌ فارغٌ ومبلغٌ كاملٌ', async () => {
  const { status, body } = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  assert.equal(status, 200);
  assert.equal(body.events.length, 0);
  assert.equal(body.facts.amountDue, 150);
  assert.equal(body.facts.totalQty, 3);
});

test('الرحلةُ كاملةً حتى التسليم — والحالةُ تتقدّم مع الأحداث', async () => {
  for (const e of [
    { type: 'discount.applied', amountDelta: -15, note: 'كوبون' },
    { type: 'order.confirmed', status: 'confirmed' },
    { type: 'shipment.created', status: 'shipped', payload: { tracking: 'DZ-1' } },
    { type: 'courier.picked' },
    { type: 'order.delivered', status: 'delivered' },
  ]) {
    const r = await req('POST', `/api/orders/${ORDER_ID}/events`, e);
    assert.equal(r.status, 200, `${e.type}: ${r.body.error || ''}`);
  }
  const { body } = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  assert.equal(body.order.status, 'delivered');
  assert.equal(body.facts.amountDue, 135);
});

test('رفض الزبونُ قطعةً عند الباب — مُسلَّمٌ ومُرجَعٌ جزئيًّا معًا', async () => {
  const r = await req('POST', `/api/orders/${ORDER_ID}/events`, {
    type: 'item.rejected', amountDelta: -50, note: 'رفضت السروال',
    payload: { productId: 'p1', quantity: 1 },
  });
  assert.equal(r.status, 200, r.body.error);

  const { body } = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  // الحالةُ تبقى «مُسلَّم» — والواقعةُ الأخرى تُستنتَج ولا تُزاحمها.
  assert.equal(body.order.status, 'delivered');
  assert.equal(body.facts.partiallyReturned, true);
  assert.equal(body.facts.fullyReturned, false);
  assert.equal(body.facts.returnedQty, 1);
  // ١٥٠ − ١٥ خصمًا − ٥٠ مرفوضةً = ٨٥. محسوبٌ من الدفتر لا مكتوبٌ في عمود.
  assert.equal(body.facts.amountDue, 85);
});

test('الدفترُ يقول **لماذا** تغيّر المبلغ، بترتيب الحدوث', async () => {
  const { body } = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  const money = body.events.filter(e => e.amountDelta !== 0);
  assert.deepEqual(money.map(e => e.type), ['discount.applied', 'item.rejected']);
  assert.equal(money[1].note, 'رفضت السروال');
  // ولا حدثٌ اختفى: الدفترُ يُضاف إليه فقط.
  assert.equal(body.events.length, 6);
});

test('استرجاعٌ بلا طلبٍ مفتوحٍ يُرفَض برسالةٍ مفهومة', async () => {
  const r = await req('POST', `/api/orders/${ORDER_ID}/events`, { type: 'refund.completed', amountDelta: -85 });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /refund\.requested/);
});

test('الاسترجاعُ بعد طلبه يمرّ ويُصفّر المبلغ', async () => {
  let r = await req('POST', `/api/orders/${ORDER_ID}/events`, { type: 'refund.requested', note: 'طلبت الزبونة' });
  assert.equal(r.status, 200);
  const mid = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  assert.deepEqual(mid.body.facts.pendingRequests, ['refund.requested']);

  r = await req('POST', `/api/orders/${ORDER_ID}/events`, { type: 'refund.completed', amountDelta: -85 });
  assert.equal(r.status, 200, r.body.error);
  const { body } = await req('GET', `/api/orders/${ORDER_ID}/timeline`);
  assert.equal(body.facts.amountDue, 0);
  assert.equal(body.facts.refunded, true);
  assert.deepEqual(body.facts.pendingRequests, []);
});

test('لا يُردُّ أكثرُ ممّا بقي — الحارسُ يقرأ الدفترَ الحاليّ', async () => {
  const r = await req('POST', `/api/orders/${ORDER_ID}/events`, { type: 'item.returned', amountDelta: -10 });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /أكبرُ من/);
});

test('طلبُ مستخدمٍ آخر لا يُقرأ ولا يُكتَب عليه', async () => {
  const other = require('jsonwebtoken').sign({ id: 'ghost-user', email: 'g@t.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  const r = await fetch(`${base}/api/orders/${ORDER_ID}/timeline`, {
    headers: { authorization: `Bearer ${other}` },
  });
  assert.equal(r.status, 404);
});
