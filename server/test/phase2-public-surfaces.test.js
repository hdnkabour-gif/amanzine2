'use strict';
// ============================================================
// **المرحلة ② — RC-P3: الأسطحُ العامّةُ تُفشي أكثرَ ممّا يلزمها.**
//
//   `POST /api/customers/public` بابُ كتابةٍ مجهولٌ **عمدًا** — الزبونُ يملأ
//   استمارةً في صفحة التاجر قبل أن يكون له حساب. والعطبُ لم يكن في وجوده بل
//   في جوابه: كان يردّ السجلَّ المخزَّنَ كاملًا لمن أرسل رقمًا موجودًا، فيصير
//   بابُ الكتابة **بابَ قراءةٍ** لا يحتاج إلّا معرفةَ رقمِ هاتف.
//
//   وكلُّ ما هنا INTEGRATION: خادمٌ حقيقيٌّ + PostgreSQL زائلة + طلباتُ HTTP.
//   ولا يُطبَع في رسائل الفشل أيُّ حقلِ زبونٍ — الحارسُ لا يسرّب ما يمنع تسريبَه.
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/phase2-public-surfaces.test.js
// ============================================================
process.env.JWT_SECRET ||= 'phase2-test-secret-0123456789abcdef';
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const SKIP = !process.env.DATABASE_URL;
const test = (n, f) => rawTest(n, { skip: SKIP && 'لا DATABASE_URL' }, f);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let srv, base, MERCHANT = '', OTHER = '';
const VICTIM_PHONE = '060' + crypto.randomBytes(3).toString('hex');
const VICTIM_NAME = 'اسمُ الضحيّة المخزَّن';
const VICTIM_ADDR = 'عنوانُ الضحيّة المخزَّن';

const post = async (body) => {
  const r = await fetch(base + '/api/customers/public', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const mk = async (email) => (await db.getUserByEmail(email))
    || await db.createUser({ name: 'M', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  MERCHANT = (await mk('p2-merchant@test.local')).id;
  OTHER = (await mk('p2-other@test.local')).id;
  // زبونٌ قائمٌ عند التاجر — هو ما كان يُستردّ سابقًا.
  await db.createCustomer({ userId: MERCHANT, name: VICTIM_NAME, phone: VICTIM_PHONE,
    city: 'الدار البيضاء', address: VICTIM_ADDR, source: 'Form', notes: 'ملاحظةٌ خاصّة',
    vip: true, trustScore: 95 });
  const app = express();
  app.use(express.json());
  app.use('/api/customers', require('../routes/customers'));
  srv = app.listen(0);
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => {
  if (SKIP) return;
  srv?.close();
  await pool.query(`DELETE FROM customers WHERE user_id = ANY($1::text[])`, [[MERCHANT, OTHER]]).catch(() => {});
  await pool.end?.();
});

/** أيُّ أثرٍ لبيانات الضحيّة في الجواب؟ يُفحَص النصُّ كلُّه لا حقلٌ بعينه. */
const leaks = (body) => {
  const s = JSON.stringify(body || {});
  return [VICTIM_NAME, VICTIM_PHONE, VICTIM_ADDR, 'ملاحظةٌ خاصّة', 'trustScore', 'totalSpent']
    .filter(x => s.includes(x));
};

test('**زبونٌ جديدٌ: يُقرّ الاستلامُ ولا يُروى سجلّ**', async () => {
  const r = await post({ userId: MERCHANT, name: 'زبونٌ جديد', phone: '061' + crypto.randomBytes(3).toString('hex') });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.body).sort(), ['ok'], `الجوابُ يحمل حقولًا زائدة: ${Object.keys(r.body).join(',')}`);
});

test('**ورقمٌ موجودٌ لا يستردّ بياناتِ صاحبه** — عرّافُ القراءة', async () => {
  // المهاجمُ يرسل اسمًا مخترَعًا ورقمًا حقيقيًّا؛ كان يعود إليه سجلُّ صاحب الرقم.
  const r = await post({ userId: MERCHANT, name: 'اسمٌ مخترَع', phone: VICTIM_PHONE });
  assert.deepEqual(leaks(r.body), [], 'تسرّبت بياناتُ الزبون المخزَّن في الجواب');
  assert.deepEqual(Object.keys(r.body).sort(), ['ok']);
});

test('**ولا يُفرَّق الموجودُ من الجديد** — لا عرّافَ عضويّة', async () => {
  // `isNew` و٢٠١/٢٠٠ كانا يفرّقان، فيُجرَّب رقمٌ بعد رقمٍ ويُعرَف زبناءُ التاجر
  //   بلا قراءةِ حقلٍ واحد. الجوابُ الآن واحدٌ حرفيًّا في الحالتين.
  const known = await post({ userId: MERCHANT, name: 'x', phone: VICTIM_PHONE });
  const fresh = await post({ userId: MERCHANT, name: 'x', phone: '062' + crypto.randomBytes(3).toString('hex') });
  assert.equal(known.status, fresh.status, 'رمزُ الحالة يفرّق بين موجودٍ وجديد');
  assert.deepEqual(known.body, fresh.body, 'جسدُ الجواب يفرّق بين موجودٍ وجديد');
  assert.ok(!('isNew' in known.body), 'عاد `isNew`');
});

test('**وتاجرٌ آخرُ لا يرى زبونَ غيره** — العزلُ بين المستأجرين', async () => {
  // نفسُ الرقم تحت تاجرٍ آخر: يجب أن يُنشَأ عنده هو، ولا يُروى شيءٌ عن الأوّل.
  const r = await post({ userId: OTHER, name: 'زبونٌ عند تاجرٍ آخر', phone: VICTIM_PHONE });
  assert.equal(r.status, 200);
  assert.deepEqual(leaks(r.body), [], 'تسرّب زبونُ تاجرٍ إلى تاجرٍ آخر');
  const mine = (await db.getCustomers(OTHER)).filter(c => c.phone === VICTIM_PHONE);
  assert.equal(mine.length, 1, 'لم يُنشَأ الزبونُ عند التاجر الثاني');
  assert.notEqual(mine[0].name, VICTIM_NAME, '**نُسخت بياناتُ زبونِ تاجرٍ إلى آخر**');
});

test('**وخطأُ القاعدة لا يُروى خامًا**', async () => {
  const r = await post({ userId: 'no-such-merchant-' + crypto.randomBytes(4).toString('hex'), name: 'x', phone: '0699999999' });
  const s = JSON.stringify(r.body);
  for (const t of ['constraint', 'customers_user_id_fkey', 'insert or update', 'relation', 'column']) {
    assert.ok(!s.includes(t), `تسرّب تفصيلُ قاعدةِ بيانات: ${t}`);
  }
  assert.notEqual(r.status, 500, 'خطأُ مُدخَلٍ يُقدَّم خطأَ خادم');
});

test('**والمعطياتُ الناقصةُ تُردّ قبل لمس القاعدة**', async () => {
  for (const b of [{}, { userId: MERCHANT }, { userId: MERCHANT, name: 'x' }, { name: 'x', phone: '06' }]) {
    assert.equal((await post(b)).status, 400);
  }
});

test('**والحدُّ يُطبَّق فعلًا على المسار** — SOURCE_SHAPE معلَن + سلوكيّ', async () => {
  // الحدُّ يُركَّب في `index.js` على مستوى التطبيق، وهذا الخادمُ المصغَّرُ
  //   يركّب الموجِّهَ وحدَه. فيُفحَص التركيبُ نصًّا **ويُثبَت سلوكيًّا** أنّ
  //   نفسَ الوسيط يمنع فعلًا حين يُركَّب.
  const idx = require('fs').readFileSync(require('path').join(__dirname, '../index.js'), 'utf8');
  assert.match(idx, /app\.use\('\/api\/customers\/public',\s*rateLimit\(/,
    'المسارُ العامُّ بلا حدٍّ خاصّ — وهو بابُ كتابةٍ مجهول');

  const rateLimit = require('express-rate-limit');
  const app2 = express();
  app2.use(express.json());
  app2.use('/api/customers/public', rateLimit({ windowMs: 60000, max: 3, message: { error: 'كثير' } }));
  app2.use('/api/customers', require('../routes/customers'));
  const s2 = app2.listen(0);
  try {
    const u = `http://127.0.0.1:${s2.address().port}/api/customers/public`;
    const hit = () => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: MERCHANT, name: 'x', phone: '0688' + Math.random().toString().slice(2, 8) }) });
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await hit()).status);
    assert.ok(codes.includes(429), `لا حدَّ فعليًّا — الرموز: ${codes.join(',')}`);
  } finally { s2.close(); }
});
