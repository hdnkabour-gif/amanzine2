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

let U = '';
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
    await db.createOrder({ userId: U, customerName: 'زبون', customerPhone: p, total: 10, items: [] });
  }
  await db.createOrder({ userId: U, customerName: 'آخر', customerPhone: '0677000000', total: 99, items: [] });
});
after(async () => { if (SKIP) return; await pool.end?.(); });

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
  assert.match(h, /findOrdersByPhone/, 'لم يعد يستعمل الاستعلامَ المحدود');
});
