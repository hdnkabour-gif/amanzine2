'use strict';
// ============================================================
// قناةُ «ما فهمناه غلطًا» — الوجهُ المفقود من حلقة التعلّم.
//
//   كان عندنا `learning_unknowns`: ما لم نفهمه، بعدّادٍ وحالةٍ يراها الأدمن.
//   ولم يكن لما فهمناه **غلطًا** قناةٌ أصلًا — مع أنّه أخطر: الصامتُ يُسأل
//   فيُصحَّح، والواثقُ المخطئُ يمضي بالإنسان إلى بابٍ ليس بابَه ولا يعلم.
//   فأشدُّ أخطائنا كان وحدَه بلا قياس.
//
//   وهذه الاختباراتُ تحرس ما يجعل القناةَ مفيدةً لا مجرّد جدول: التجميعُ
//   بالمفتاح (وإلّا غرق العطبُ البنيويّ في ضجيج السطور)، وحفظُ أسوأ ثقةٍ
//   (وإلّا بدا الخطرُ أقلَّ ممّا هو)، والحدُّ الأمنيّ (البلاغُ عامّ والحكمُ محميّ).
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/misread-channel.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-misread-channel-only-0123456789';

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

const T = 'الفريجيدير ما كيخدمش — اختبار';

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('misread@test.ma')
    || await db.createUser({ name: 'Misread', email: 'misread@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  TOKEN = require('jsonwebtoken').sign(
    { id: u.id, email: 'misread@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });

  // تشغيلٌ متكرّر: نبدأ من صفحةٍ نظيفة، وإلّا صار «العدّادُ يتراكم» صحيحًا بالصدفة.
  await pool.query(`DELETE FROM learning_misreads WHERE text LIKE '%اختبار%'`).catch(() => {});

  const app = express();
  app.use(express.json());
  app.use('/api/ai', require('../routes/ai'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (SKIP) return;
  await pool.query(`DELETE FROM learning_misreads WHERE text LIKE '%اختبار%'`).catch(() => {});
  server?.close();
  await pool.end?.();
});

const mine = async (text = T) => {
  const r = await get('/api/ai/misread-report?limit=200', TOKEN);
  return (r.body.misreads || []).filter(m => m.text === text);
};

test('البلاغُ يُسجَّل بما ادّعيناه — لا «خطأٌ ما»', async () => {
  // بلا `said` نعرف أنّنا أخطأنا ولا نعرف إلى أين انحرفنا، فلا يُصلَح شيء.
  const res = await post('/api/ai/report-misread',
    { text: T, field: 'profession', said: 'ميكانيكي', confidence: 0.9 });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  const rows = await mine();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].said, 'ميكانيكي');
  assert.equal(rows[0].field, 'profession');
  assert.equal(rows[0].count, 1);
  assert.equal(rows[0].status, 'pending', 'دخلت المعرفةُ بلا اعتمادِ إنسان');
});

test('نفسُ الغلطة تزيد العدّادَ ولا تُكرّر السطر', async () => {
  // السطرُ ذو العدّاد العالي عطبٌ بنيويٌّ لا هفوةُ إنسان — ولا يظهر ذلك
  // إن صارت كلُّ ضغطةٍ سطرًا جديدًا.
  for (let i = 0; i < 3; i++) {
    await post('/api/ai/report-misread', { text: T, field: 'profession', said: 'ميكانيكي', confidence: 0.5 });
  }
  const rows = await mine();
  assert.equal(rows.length, 1, 'تكرّر السطرُ بدل العدّاد');
  assert.equal(rows[0].count, 4);
});

test('تُحفَظ أسوأُ ثقةٍ لا آخرُها', async () => {
  // ٠٫٩ مردودةً أسوأُ من ٠٫٥ مردودة: تلك تخمينٌ ظاهر، وهذه خطأٌ يمضي واثقًا.
  // ولو غلبت الأخيرةُ لبدا الخطرُ أقلَّ ممّا هو كلّما تكرّر البلاغُ بثقةٍ أدنى.
  const rows = await mine();
  assert.equal(rows[0].confidence, 0.9);
});

test('حقلان مختلفان على نفس الجملة سطران — الحرفُ المُخطَأ جزءٌ من الهويّة', async () => {
  await post('/api/ai/report-misread', { text: T, field: 'city', said: 'الدار البيضاء', confidence: 0.7 });
  const rows = await mine();
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => r.field).sort(), ['city', 'profession']);
});

test('الأشدُّ خطرًا أوّلًا في التقرير', async () => {
  const r = await get('/api/ai/misread-report?limit=200', TOKEN);
  const list = r.body.misreads || [];
  const score = m => m.count * m.confidence;
  for (let i = 1; i < list.length; i++) {
    assert.ok(score(list[i - 1]) >= score(list[i]) - 1e-9,
      'لم يُرتَّب بالخطورة — فيغرق العطبُ الواثقُ المتكرّر في آخر الصفحة');
  }
});

test('نصٌّ فارغٌ أو أقصرُ من حرفين لا يُسجَّل', async () => {
  for (const text of ['', '  ', 'ا']) {
    const res = await post('/api/ai/report-misread', { text, field: 'all', said: 'س', confidence: 0.5 });
    assert.equal(res.body.ok, false, `سُجّل نصٌّ لا معنى له: «${text}»`);
  }
});

test('الثقةُ تُحصَر في [٠،١] ولا تُصدَّق كما جاءت', async () => {
  const t = 'جملة ثقة شاذة — اختبار';
  await post('/api/ai/report-misread', { text: t, field: 'all', said: 'س', confidence: 99 });
  const rows = await mine(t);
  assert.equal(rows.length, 1);
  assert.ok(rows[0].confidence <= 1, 'ثقةٌ من الخارج دخلت كما هي ⇒ يفسد الترتيبُ كلُّه');
});

// ── الحدُّ الأمنيّ ─────────────────────────────────────────────
test('البلاغُ عامٌّ والقراءةُ والحكمُ محميّان', async () => {
  // مَن يكتشف الخطأ هو الزائرُ الذي وقع عليه؛ وطلبُ تسجيلِ الدخول منه ليُبلّغ
  // ضمانُ ألّا يُبلّغ أحد. أمّا ما يُقرأ ويُحكَم فبابٌ مغلق.
  const open = await post('/api/ai/report-misread', { text: 'زائر — اختبار', field: 'all', said: 'س', confidence: 0.4 });
  assert.equal(open.body.ok, true, 'حُجب البلاغُ عن الزائر');

  assert.equal((await get('/api/ai/misread-report')).status, 401);
  assert.equal((await post('/api/ai/judge-misread', { text: T, field: 'city', status: 'fixed' })).status, 401);
});

test('لا حكمَ إلّا `fixed` أو `rejected`', async () => {
  // حالةٌ حرّةٌ تعني أنّ أيّ نصٍّ يصير حكمًا، فيسقط معنى «مُعلَّق».
  const bad = await post('/api/ai/judge-misread', { text: T, field: 'city', status: 'approved_maybe' }, TOKEN);
  assert.equal(bad.body.ok, false);

  const ok = await post('/api/ai/judge-misread', { text: T, field: 'city', status: 'fixed' }, TOKEN);
  assert.equal(ok.body.ok, true);
  const rows = await mine();
  assert.equal(rows.find(r => r.field === 'city').status, 'fixed');
  assert.equal(rows.find(r => r.field === 'profession').status, 'pending', 'حُكم على سطرٍ آخر');
});

test('التصفيةُ بالحالة تعمل — وإلّا لا يمكن فرزُ ما عولج', async () => {
  const r = await get('/api/ai/misread-report?status=pending&limit=200', TOKEN);
  const list = r.body.misreads || [];
  assert.ok(list.length, 'صفرُ نتائجَ يجعل الحارسَ بلا معنى');
  assert.ok(list.every(m => m.status === 'pending'));
  assert.ok(!list.some(m => m.text === T && m.field === 'city'), 'ظهر المعالَجُ في المُعلَّق');
});
