'use strict';
// ============================================================
// حلقةُ التعلّم — الاختبارُ الذي يمنع عودةَ «زرٍّ لا يُعلّم».
//
//   العطب كما كان: POST /misses/:id/resolve يكتب `resolved_category` (نصٌّ حرّ،
//   ليس حتّى مفتاحًا خارجيًّا) ثمّ ينتهي. لا يمسّ custom_concepts. فيكتب إنسانٌ
//   آخرُ نفسَ الكلمة غدًا — ولا نفهمها. زرٌّ اسمه «حلّ» ولا يحلّ شيئًا.
//
//   هذه الاختباراتُ أُثبتت بإعادة العطب: بإرجاع resolveMiss وحدَه تفشل
//   «يُضاف المرادف» و«يصير قابلًا للاستدعاء»، وتبقى البقيّة خضراء — أي أنّها
//   تختبر التعلّم فعلًا لا شكل الاستجابة.
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/learning-loop.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

// بلا قاعدةٍ نتخطّى بدل أن نُسقط: process.exit هنا كان سيُنهي كلّ ملفّات
// الاختبار المشتركة في نفس التشغيل، فيخفي نجاحَ غيرِنا خلف صمتٍ كاذب.
const SKIP = !process.env.DATABASE_URL;

// قبل أيّ require: platformAdmin يقرأ ADMIN_EMAIL عند التحميل. ونستعمل توكنًا
// حقيقيًّا بدل حقن req.user — فيُختبر الحارسان (auth + platformAdmin) أيضًا.
process.env.ADMIN_EMAIL = 'loop@test.ma';
process.env.JWT_SECRET ||= 'test-secret-for-learning-loop-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

// خادمٌ حقيقيٌّ + fetch المدمج — بلا تبعيّةٍ جديدة. نختبر المسار كما يُستدعى
// فعلًا (JSON عبر HTTP)، لا الدالّةَ في عزلة.
let server, base, adminId;
let TOKEN = '';
const post = async (path, body) => {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const get = async (path) => {
  const r = await fetch(base + path, { headers: { authorization: `Bearer ${TOKEN}` } });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('loop@test.ma')
    || await db.createUser({ name: 'Loop', email: 'loop@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  adminId = u.id;
  // تشغيلٌ متكرّر: نبدأ من صفحةٍ نظيفة، وإلّا صار «الإثراءُ يتراكم» صحيحًا بالصدفة.
  for (const id of ['hvac_tech', 'my_plumber', 'other_hvac']) await db.deleteCustomConcept?.(id).catch(() => {});
  await pool.query(`DELETE FROM search_misses`);
  TOKEN = require('jsonwebtoken').sign(
    { id: adminId, email: 'loop@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });

  const app = express();
  app.use(express.json());
  app.use('/api/knowledge', require('../routes/knowledge'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

const mkMiss = async (raw) => {
  await db.recordSearchMiss({ raw, normalized: raw.toLowerCase(), city: null });
  const rows = await db.listSearchMisses({ status: 'open', limit: 50 });
  return rows.find(r => r.raw === raw);
};

test('التعلّم يُضيف المرادفَ إلى المفهوم — لا وسمًا نصّيًّا', async () => {
  const m = await mkMiss('شفاج ديال الشوفاج');
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { conceptId: 'hvac_tech', concept: { ar: 'تقني تدفئة' }, category: 'home_services' });
  assert.equal(res.status, 200, res.body?.error);
  assert.ok(res.body.learned, 'الردُّ يجب أن يحمل learned — وإلّا لم يتعلّم شيء');
  assert.deepEqual(res.body.learned.variants, ['شفاج ديال الشوفاج']);

  const saved = await db.getCustomConcept('hvac_tech');
  assert.ok(saved, 'المفهومُ لم يُنشأ في custom_concepts');
  const all = Object.values(saved.variants || {}).flat();
  assert.ok(all.includes('شفاج ديال الشوفاج'), `المرادفُ غائب: ${JSON.stringify(all)}`);
  assert.equal(saved.status, 'published', 'مسوّدةٌ لا يقرؤها المحرّك = لم يتعلّم');
});

test('ما تعلَّمه يظهر فورًا في المسار العامّ — أي أنّ المحرّك يقرؤه', async () => {
  const res = await get('/api/knowledge/concepts/public');
  assert.equal(res.status, 200);
  const c = (res.body.concepts || []).find(x => x.id === 'hvac_tech');
  assert.ok(c, 'المفهومُ المتعلَّم غيرُ مرئيٍّ للزائر ⇒ الحلقةُ ما زالت مقطوعة');
  assert.ok(Object.values(c.variants || {}).flat().includes('شفاج ديال الشوفاج'));
});

test('الـmiss يصير resolved — لا يعود في الطابور', async () => {
  const open = await db.listSearchMisses({ status: 'open', limit: 50 });
  assert.ok(!open.some(r => r.raw === 'شفاج ديال الشوفاج'), 'ما زال مفتوحًا رغم التعلّم');
});

test('الإثراءُ التالي يتراكم ولا يمحو', async () => {
  const m = await mkMiss('شوفاج كيقطع');
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { conceptId: 'hvac_tech' });
  assert.equal(res.status, 200, res.body?.error);
  const all = Object.values((await db.getCustomConcept('hvac_tech')).variants || {}).flat();
  assert.ok(all.includes('شفاج ديال الشوفاج') && all.includes('شوفاج كيقطع'),
    `المرادفُ الأوّل ضاع عند الثاني: ${JSON.stringify(all)}`);
});

test('لا يُسرَق مرادفٌ من مفهومٍ **مدمج** — 409 لا 200', async () => {
  const m = await mkMiss('سباك');   // يملكه plumber المدمج
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { id: 'my_plumber', concept: { ar: 'سبّاكي' }, category: 'home_services' });
  assert.equal(res.status, 409, `سُمح بسرقة مرادفٍ مدمج (${res.status}) — الفهمُ يصير عشوائيًّا`);
  assert.match(res.body.error, /plumber/, res.body.error);
  assert.equal(await db.getCustomConcept('my_plumber'), null, 'كُتب رغم الرفض');
});

test('لا يُسرَق مرادفٌ من مفهومٍ مضاف', async () => {
  // صفٌّ جديد: «شوفاج كيقطع» صار resolved في الاختبار السابق فلا يعود مفتوحًا.
  // المرادفُ المتنازَعُ عليه يُرسَل صراحةً في variants، فالصفُّ هنا مجرّدُ حامل.
  const m = await mkMiss('تدفئة أخرى غامضة');
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { id: 'other_hvac', concept: { ar: 'تدفئة أخرى' }, category: 'home_services', variants: ['شوفاج كيقطع'] });
  assert.equal(res.status, 409, 'سُمح بازدواج المرادف بين مفهومين');
});

test('«تجاهل» لا يُنشئ مفهومًا', async () => {
  const m = await mkMiss('asdkjh qwe');
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { status: 'ignored' });
  assert.equal(res.status, 200);
  assert.equal(res.body.learned, null, 'التجاهلُ يجب ألّا «يتعلّم» شيئًا');
});

test('طلبٌ بلا مفهوم يُرفَض — لا «حلٌّ» صامتٌ بلا تعلّم', async () => {
  const m = await mkMiss('حاجة غامضة');
  const res = await post(`/api/knowledge/misses/${m.id}/resolve`, { category: 'home_services' });
  assert.equal(res.status, 400, 'قُبل «حلٌّ» لا يُعلّم شيئًا — وهو العطبُ الأصليّ بعينه');
});
