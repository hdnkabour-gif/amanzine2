'use strict';
// ============================================================
// **القناةُ الثالثة: ما فهمناه تمامًا ولا بابَ له.**
//
//   عندنا `learning_unknowns` (لم نفهم) و`learning_misreads` (فهمنا غلطًا)،
//   وكلاهما **عطبٌ فينا**. وهذه ليست عطبًا: «بغيت نمشي لطنجة» طلبٌ مشروعٌ
//   فُهم تمامًا — الوجهةُ مقروءةٌ والاتّجاهُ مقروء — ولم نبنِ له بابًا بعد.
//
//   وكان يُبتلَع في سؤالٍ لا جوابَ له («شنو محتاج بالضبط؟»)، فلا يصل أحدًا
//   ولا يُحصى. وهو أنفعُ الثلاث لصاحب المشروع: **خارطةُ الطريق يكتبها
//   الناسُ بأنفسهم**، مرتّبةً بعدد من طلبها.
//
//   وحدُّه كحدِّ أختَيه: `pending` دائمًا. **لا تعلُّمَ ذاتيّ** — عدّادٌ يمتلئ
//   يخبر إنسانًا أين ينظر، ولا يبني قدرةً بنفسه.
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/demand-channel.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-demand-channel-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '';
const post = async (path, body, token) => {
  const h = { 'content-type': 'application/json' };
  if (token) h.authorization = `Bearer ${token}`;
  const r = await fetch(base + path, { method: 'POST', headers: h, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = async (path, token) => {
  const h = {};
  if (token) h.authorization = `Bearer ${token}`;
  const r = await fetch(base + path, { headers: h });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const T = 'بغيت نمشي لطنجة — اختبار';
const clean = () => pool.query(`DELETE FROM capability_demand WHERE text LIKE '%اختبار%'`).catch(() => {});

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('demand@test.ma')
    || await db.createUser({ name: 'Demand', email: 'demand@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  TOKEN = require('jsonwebtoken').sign(
    { id: u.id, email: 'demand@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  await clean();                     // تشغيلٌ متكرّر يبدأ من صفحةٍ نظيفة
  const app = express();
  app.use(express.json());
  app.use('/api/ai', require('../routes/ai'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (SKIP) return;
  await clean();
  server?.close();
  await pool.end?.();
});

const mine = async (text = T) => {
  const r = await get('/api/ai/demand-report?limit=500', TOKEN);
  return (r.body.demand || []).filter(d => d.text === text);
};

test('الطلبُ غيرُ المغطّى يُسجَّل بما فُهم منه', async () => {
  // بلا `understood` نعرف أنّ أحدًا طلب شيئًا ولا نعرف ماذا فهمنا — فلا
  // يُقرَأ الجدولُ قرارًا، ويبقى نصًّا خامًا كالذي في `learning_unknowns`.
  const res = await post('/api/ai/uncovered',
    { kind: 'transport', text: T, city: 'طنجة', understood: 'تمشي لطنجة' });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  const rows = await mine();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'transport');
  assert.equal(rows[0].understood, 'تمشي لطنجة');
  assert.equal(rows[0].city, 'طنجة');
  assert.equal(rows[0].count, 1);
  assert.equal(rows[0].status, 'pending', '**دخلت قدرةٌ بلا حكمِ إنسان**');
});

test('**والعدّادُ هو كلُّ القيمة** — جملةٌ رأيٌ ومائةٌ قرارُ منتَج', async () => {
  for (let i = 0; i < 4; i++) {
    await post('/api/ai/uncovered', { kind: 'transport', text: T, city: 'طنجة' });
  }
  const rows = await mine();
  assert.equal(rows.length, 1, 'تكرّر السطرُ بدل العدّاد — غرق الطلبُ في الضجيج');
  assert.equal(rows[0].count, 5);
});

test('ونفسُ النصّ في مجالٍ آخرَ سطرٌ آخر — المفتاحُ مركّب', async () => {
  await post('/api/ai/uncovered', { kind: 'other_domain', text: T });
  const r = await get('/api/ai/demand-report?limit=500', TOKEN);
  const kinds = (r.body.demand || []).filter(d => d.text === T).map(d => d.kind).sort();
  assert.deepEqual(kinds, ['other_domain', 'transport']);
});

test('**البلاغُ عامٌّ والقراءةُ محميّة** — من يطلب ما لا نملك زائرٌ غالبًا', async () => {
  // لا معنى لأن نطلب حسابًا ممّن يخبرنا أنّنا ناقصون؛ ولا معنى لأن تُقرأ
  // خارطةُ طريقنا من أيّ أحد.
  const open = await post('/api/ai/uncovered', { kind: 'transport', text: 'بلا حساب — اختبار' });
  assert.equal(open.body.ok, true, 'أُغلق البلاغُ في وجه من يطلب');
  const guarded = await get('/api/ai/demand-report');
  assert.equal(guarded.status, 401, 'خارطةُ الطريق مقروءةٌ بلا حساب');
});

test('ومدخلٌ فارغٌ لا يُسجَّل — عدّادٌ يمتلئ بالفراغ يكذب', async () => {
  assert.equal((await post('/api/ai/uncovered', { kind: '', text: T })).body.ok, false);
  assert.equal((await post('/api/ai/uncovered', { kind: 'transport', text: 'x' })).body.ok, false);
});
