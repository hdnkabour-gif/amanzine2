'use strict';
// ============================================================
// تتبُّعُ الزبون — بابٌ عامٌّ يقرأ طلباتٍ حقيقيّة.   [REAL_POSTGRESQL]
//
//   كان يُحمّل **كلَّ** طلبات التاجر إلى الذاكرة ثمّ يُصفّي في جافاسكربت.
//   فتاجرٌ بعشرين ألفَ طلبٍ يدفع عشرين ألفَ صفٍّ في كلّ نداءٍ من أيّ زائر.
//   هنا يُقاس أنّ **النتيجةَ لم تتغيّر** وأنّ الكلفةَ تغيّرت.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-tracking-only-0123456789';
const test = (n, f) => rawTest(n, { skip: SKIP && 'لا DATABASE_URL' }, f);
const { db } = require('../database');
const pool = require('../db');

let U = '', CODE = '', server = null, base = '';
const PH = '0655123456';          // الرقمُ المقصود
before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('track@test.ma')
    || await db.createUser({ name: 'TR', email: 'track@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  U = u.id;
  await pool.query('DELETE FROM orders WHERE user_id=$1', [U]);
  // نفسُ الرقم بثلاثِ صيغ — كلُّها زبونٌ واحد
  for (const p of [PH, '+212655123456', '00212 655 12 34 56']) {
    const order = await db.createOrder({ userId: U, customerName: 'زبون', customerPhone: p, total: 10,
      items: [{ productName: 'QA-private-line-item', quantity: 1, price: 10 }] });
    if (p === PH) CODE = order.customerCode;
  }
  await db.createOrder({ userId: U, customerName: 'آخر', customerPhone: '0677000000', total: 99, items: [] });
  const express = require('express');
  const app = express(); app.use(express.json());
  app.use('/api/orders', require('../routes/orders'));
  app.use('/api/ai', require('../routes/ai'));
  await new Promise(resolve => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (SKIP) return; await new Promise(r => server?.close(r)); await pool.end?.(); });

test('**الصيغُ الثلاثُ للرقم نفسِه تُطابَق — والغريبُ لا يُطابَق**', async () => {
  const rows = await db.findOrdersByPhone(U, '655123456');
  assert.equal(rows.length, 3, 'المطابقةُ بآخر تسعِ خاناتٍ لم تعمل عبر الصيغ');
  assert.ok(rows.every(o => +o.total === 10), 'تسرّب طلبُ زبونٍ آخر');
});

test('**ولا تُقرَأ طلباتُ تاجرٍ آخر** — العزلُ قبل كلّ شيء', async () => {
  assert.deepEqual(await db.findOrdersByPhone('لا-أحد', '655123456'), []);
});

test('**والعددُ مسقوف** — بابٌ عامٌّ لا يُخرِج جدولًا كاملًا', async () => {
  assert.ok((await db.findOrdersByPhone(U, '655123456', 2)).length <= 2);
  // سقفٌ أعلى صلب: قيمةٌ ضخمةٌ من المتصل لا تفتح الباب
  assert.ok((await db.findOrdersByPhone(U, '655123456', 99999)).length <= 100);
});

test('**والتصفيةُ تقع في القاعدة لا في الذاكرة**  [SOURCE_SHAPE]', () => {
  // حارسُ شكلٍ مُعلَن: السلوكُ أعلاه لا يكشف **أين** وقعت التصفية، وهي
  //   كلُّ الفرق بين صفٍّ واحدٍ وعشرين ألفًا على الشبكة.
  const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/orders.js'), 'utf8');
  const h = src.slice(src.indexOf("router.get('/track/:phone'"), src.indexOf("router.get('/track-code/"));
  assert.doesNotMatch(h, /db\.getOrders\(/, 'عاد البابُ العامُّ يُحمّل كلَّ الطلبات');
  assert.match(h, /findOrderByCode/, 'تسربت قراءة الهاتف دون مطابقة كود الطلب');
  assert.match(h, /trackingPhoneMatches/, 'غاب عامل التحقق الثاني برقم الهاتف');
});


const get = async (url) => {
  const response = await fetch(base + url);
  return { status: response.status, body: await response.json() };
};

test('**الرقمُ وحدَه لا يكشف طلبًا — HTTP حقيقيّ**', async () => {
  const r = await get('/api/orders/track/' + PH + '?userId=' + U);
  assert.equal(r.status, 403);
  assert.ok(!JSON.stringify(r.body).includes('QA-private-line-item'));
});

test('**الكودُ وحدَه يكشف الحالة لا المبلغَ ولا المشتريات**', async () => {
  const r = await get('/api/orders/track-code/' + CODE + '?userId=' + U);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'pending');
  assert.ok(!('total' in r.body));
  assert.ok(!('items' in r.body));
  assert.ok(!('customerName' in r.body));
});

test('**الهاتف الخطأ مع كود صحيح لا يكشف شيئًا**', async () => {
  const r = await get('/api/orders/track-code/' + CODE + '?userId=' + U + '&phone=0677999999');
  assert.equal(r.status, 404);
  assert.ok(!JSON.stringify(r.body).includes('QA-private-line-item'));
});

test('**الهاتف الصحيح والكود الصحيح معًا يكشفان تفاصيل الطلب لصاحبه**', async () => {
  const url = '/api/orders/track/' + PH + '?userId=' + U + '&code=' + CODE;
  const r = await get(url);
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);
  assert.equal(+r.body[0].total, 10);
  assert.equal(r.body[0].items[0].productName, 'QA-private-line-item');
});

test('**المساعد العمومي لا يكشف المبلغ أو المشتريات برقم الهاتف وحده**', async () => {
  const r = await fetch(base + '/api/ai/public-reply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: U, message: 'فين وصل طلبي ' + PH }),
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.model, 'order-tracking-verification');
  assert.ok(!JSON.stringify(body).includes('QA-private-line-item'));
  assert.ok(!JSON.stringify(body).includes(CODE));
});
