'use strict';
// ============================================================
// تفرّدُ إنشاءِ الطلب — على PostgreSQL حقيقيّة.  [REAL_POSTGRESQL]
//
//   ما يقيسه: أنّ **القاعدة** تمنع الصفَّ الثاني، لا أنّ الشيفرة تنوي
//   منعَه. لذلك يُدرَج مرّتين متزامنتين ويُعَدُّ ما استقرّ في الجدول، لا
//   ما أعادته الدالّة.
//
//   وما لا يقيسه عمدًا: التشابه. زبونٌ يشتري نفسَ الشيء مرّتين بمفتاحَين
//   مختلفين ⇒ صفّان — وهو الاختبارُ السادس. حمايةٌ تمنع ذلك ليست حماية.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-idempotency-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');
const idem = require('../lib/idempotency');

let server, base, TOKEN = '', USER_ID = '', OTHER_TOKEN = '', OTHER_ID = '';

const post = async (body, key, token) => {
  const r = await fetch(base + '/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token || TOKEN}`,
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const PAYLOAD = {
  customerName: 'زبونُ التفرّد', customerPhone: '0611223344',
  city: 'أكادير', address: 'زنقة ٧', total: 240,
  items: [{ productId: 'x1', productName: 'قفطان', quantity: 1, price: 240 }],
};

const countKey = async (userId, key) => {
  const { rows } = await pool.query(
    'SELECT count(*)::int n FROM orders WHERE user_id=$1 AND idempotency_key=$2', [userId, key]);
  return rows[0].n;
};

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const mk = async (email) => await db.getUserByEmail(email)
    || await db.createUser({ name: 'IDEM', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  const u = await mk('idem-a@test.ma');
  const v = await mk('idem-b@test.ma');
  USER_ID = u.id; OTHER_ID = v.id;
  const sign = (x, e) => require('jsonwebtoken').sign({ id: x, email: e, role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  TOKEN = sign(u.id, 'idem-a@test.ma');
  OTHER_TOKEN = sign(v.id, 'idem-b@test.ma');

  await pool.query('DELETE FROM orders WHERE user_id = ANY($1)', [[USER_ID, OTHER_ID]]);

  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../routes/orders'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

// ① الفهرسُ موجودٌ فعلًا في القاعدة — لا في نيّةِ ملفِّ الترحيل.
test('الفهرسُ الفريدُ الجزئيُّ قائمٌ على (user_id, idempotency_key)', async () => {
  const { rows } = await pool.query(
    `SELECT indexdef FROM pg_indexes WHERE indexname = 'uniq_orders_idempotency'`);
  assert.equal(rows.length, 1, 'الفهرسُ غائب — لا حارسَ في القاعدة');
  const def = rows[0].indexdef;
  assert.match(def, /UNIQUE/);
  assert.match(def, /user_id/);
  assert.match(def, /idempotency_key/);
  assert.match(def, /WHERE/, 'فهرسٌ غيرُ جزئيّ يمنع أكثرَ من صفٍّ بلا مفتاح');
});

// ② نفسُ المفتاح + نفسُ الحمولة، على التوالي ⇒ صفٌّ واحد والطلبُ الأصليّ.
test('إعادةُ الإرسالِ تُعيد الطلبَ الأوّلَ ولا تكتب صفًّا ثانيًا', async () => {
  const key = 'idem-seq-' + Date.now().toString(36);
  const a = await post(PAYLOAD, key);
  const b = await post(PAYLOAD, key);
  assert.equal(a.status, 201);
  assert.equal(b.status, 200, 'المحاولةُ المعادةُ ليست إنشاءً جديدًا');
  assert.equal(b.body.id, a.body.id, 'أُعيد طلبٌ آخر');
  assert.equal(await countKey(USER_ID, key), 1);
});

// ③ عشرون طلبًا متزامنًا بنفس المفتاح ⇒ صفٌّ واحدٌ في الجدول.
test('عشرون محاولةً متزامنةً بنفس المفتاح ⇒ صفٌّ واحدٌ بالضبط', async () => {
  const key = 'idem-race-' + Date.now().toString(36);
  const res = await Promise.all([...Array(20)].map(() => post(PAYLOAD, key)));
  const codes = res.reduce((m, r) => (m[r.status] = (m[r.status] || 0) + 1, m), {});
  assert.equal(await countKey(USER_ID, key), 1, `صفوفٌ أكثرُ من واحد · ${JSON.stringify(codes)}`);
  assert.equal(codes[201], 1, `يجب أن ينجح إنشاءٌ واحدٌ فقط · ${JSON.stringify(codes)}`);
  assert.equal(codes[200], 19, `الباقي تُعاد بلا إنشاء · ${JSON.stringify(codes)}`);
  const ids = new Set(res.map(r => r.body.id));
  assert.equal(ids.size, 1, 'المتزامناتُ رأت طلباتٍ مختلفة');
});

// ④ نفسُ المفتاح + حمولةٌ مختلفة ⇒ تعارضٌ صريحٌ ولا كتابةَ فوق الأصل.
test('مفتاحٌ أُعيد استعمالُه لحمولةٍ أخرى ⇒ 409 والأصلُ سليم', async () => {
  const key = 'idem-conflict-' + Date.now().toString(36);
  const a = await post(PAYLOAD, key);
  assert.equal(a.status, 201);
  const c = await post({ ...PAYLOAD, total: 999, items: [{ productId: 'x1', productName: 'قفطان', quantity: 1, price: 999 }] }, key);
  assert.equal(c.status, 409);
  assert.equal(c.body.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(await countKey(USER_ID, key), 1);
  const { rows } = await pool.query('SELECT total FROM orders WHERE id=$1', [a.body.id]);
  assert.equal(+rows[0].total, 240, 'كُتِب فوق طلبٍ قائم');
});

// ⑤ نفسُ المفتاح لتاجرَين ⇒ فضاءان مستقلّان، لا تسرّبَ بينهما.
test('نفسُ المفتاح لحسابَين مختلفَين ⇒ طلبان مستقلّان', async () => {
  const key = 'idem-shared-' + Date.now().toString(36);
  const a = await post(PAYLOAD, key);
  const b = await post(PAYLOAD, key, OTHER_TOKEN);
  assert.equal(a.status, 201);
  assert.equal(b.status, 201, 'مفتاحُ تاجرٍ منع تاجرًا آخر');
  assert.notEqual(a.body.id, b.body.id);
  assert.equal(await countKey(USER_ID, key), 1);
  assert.equal(await countKey(OTHER_ID, key), 1);
});

// ⑥ **الشراءُ المتكرّرُ المشروع لا يُمنَع.** نفسُ كلِّ شيءٍ إلّا المفتاح.
test('طلبان متطابقان بمفتاحَين مختلفَين ⇒ صفّان — لا حذفَ بحجّة الشبه', async () => {
  const k1 = 'idem-twin-a-' + Date.now().toString(36);
  const k2 = 'idem-twin-b-' + Date.now().toString(36);
  const a = await post(PAYLOAD, k1);
  const b = await post(PAYLOAD, k2);
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.notEqual(a.body.id, b.body.id);
});

// ⑦ بلا مفتاح ⇒ السلوكُ القديمُ كما هو، والفهرسُ الجزئيُّ لا يعترض.
test('طلبات بلا مفتاحٍ ⇒ كلٌّ منها صفٌّ مستقلّ', async () => {
  const tag = 'nokey-' + Date.now().toString(36);
  const r = await Promise.all([...Array(3)].map(() => post({ ...PAYLOAD, notes: tag })));
  assert.deepEqual(r.map(x => x.status), [201, 201, 201]);
  const { rows } = await pool.query(
    `SELECT count(*)::int n FROM orders WHERE user_id=$1 AND notes=$2`, [USER_ID, tag]);
  assert.equal(rows[0].n, 3);
  const { rows: empt } = await pool.query(
    `SELECT count(*)::int n FROM orders WHERE user_id=$1 AND notes=$2 AND idempotency_key <> ''`, [USER_ID, tag]);
  assert.equal(empt[0].n, 0);
});

// ⑧ مفتاحٌ مشوّهٌ يُردّ صراحةً — لا يُتجاهَل صمتًا فيُكتَب صفٌّ ثانٍ.
test('مفتاحٌ غيرُ صالحِ الشكل ⇒ 400 ولا كتابة', async () => {
  const before = (await pool.query('SELECT count(*)::int n FROM orders WHERE user_id=$1', [USER_ID])).rows[0].n;
  const r = await post(PAYLOAD, 'ab');           // أقصرُ من الحدّ
  assert.equal(r.status, 400);
  const after = (await pool.query('SELECT count(*)::int n FROM orders WHERE user_id=$1', [USER_ID])).rows[0].n;
  assert.equal(after, before, 'كُتِب طلبٌ رغم رفضِ المفتاح');
});

// ⑨ البصمةُ لا تتأثّر بما لا يغيّر الطلب، وتتأثّر بما يغيّره.   [UNIT]
test('البصمةُ: تنسيقُ الهاتف لا يغيّرها، والمبلغُ يغيّرها', () => {
  const a = idem.fingerprint(PAYLOAD);
  assert.equal(idem.fingerprint({ ...PAYLOAD, customerPhone: '+212 611 22 33 44'.replace('+212 6', '06') }), a);
  assert.notEqual(idem.fingerprint({ ...PAYLOAD, total: 241 }), a);
  assert.notEqual(idem.fingerprint({ ...PAYLOAD, items: [] }), a);
});

// ⑩ المتجرُ العامّ — نفسُ العهد على مسارٍ آخرَ بمعاملةٍ فيها زبون.
test('واجهةُ المتجر: محاولتان متزامنتان ⇒ طلبٌ واحدٌ وزبونٌ واحد', async () => {
  const app2 = express();
  app2.use(express.json());
  app2.use('/api/orders', require('../routes/orders'));
  const srv = await new Promise(r => { const s = app2.listen(0, () => r(s)); });
  const b2 = `http://127.0.0.1:${srv.address().port}`;
  const key = 'idem-store-' + Date.now().toString(36);
  const phone = '0655' + String(Date.now()).slice(-6);
  const body = {
    userId: USER_ID, customerName: 'زبونةُ المتجر', customerPhone: phone,
    city: 'فاس', address: 'درب ٣', total: 120, source: 'Storefront',
    items: [{ productId: 'y1', productName: 'بابوش', quantity: 1, price: 120 }],
  };
  const call = () => fetch(b2 + '/api/orders/public', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(body),
  }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

  const [a, b] = await Promise.all([call(), call()]);
  srv.close();
  assert.ok([200, 201].includes(a.status), `جوابٌ غيرُ متوقَّع ${a.status} ${JSON.stringify(a.body)}`);
  assert.ok([200, 201].includes(b.status), `جوابٌ غيرُ متوقَّع ${b.status} ${JSON.stringify(b.body)}`);
  assert.equal(await countKey(USER_ID, key), 1, 'صفّان لنفس المحاولة في مسار المتجر');
  const { rows } = await pool.query(
    'SELECT count(*)::int n FROM customers WHERE user_id=$1 AND phone=$2', [USER_ID, phone]);
  assert.equal(rows[0].n, 1, 'المعاملةُ الملغاةُ تركت زبونًا خلفها');
});
