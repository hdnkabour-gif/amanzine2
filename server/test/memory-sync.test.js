'use strict';
// ============================================================
// ذاكرةُ المستخدم — من طرفٍ إلى طرف، على قاعدةٍ حقيقيّة.
//
//   السيناريو الذي يبرّر هذا العمل كلَّه: تاجرٌ يستعمل التطبيقَ على هاتفه
//   شهرًا، ثمّ يفتحه من حاسوب. اليوم يجده **لا يعرفه** — لأنّ تسعةَ مخازنِ
//   معرفةٍ تعيش في `localStorage` ولا يصل واحدٌ منها الخادم.
//
//   وأخطرُ ما يُختبَر هنا ليس الحفظَ بل **التزامن**: جهازان يُزامنان في نفس
//   اللحظة. بلا قفلِ صفٍّ يقرأ كلٌّ منهما القيمةَ القديمةَ ويكتب فوق الآخر،
//   فيضيع ما تعلّمه أحدُهما بلا أثر — عطبٌ لا يُكتشَف إلّا بعد شهور.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-memory-sync-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '', OTHER_TOKEN = '', USER_ID = '', OTHER_ID = '';
const req = async (method, path, body, token) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token || TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const EMAIL = 'memsync@test.ma';
const EMAIL2 = 'memsync-other@test.ma';

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const secret = require('../lib/config').JWT_SECRET;
  const mk = async (email) => await db.getUserByEmail(email)
    || await db.createUser({ name: 'M', email, password: bcrypt.hashSync('x', 4), role: 'user' });

  const u = await mk(EMAIL); USER_ID = u.id;
  const o = await mk(EMAIL2); OTHER_ID = o.id;
  TOKEN = jwt.sign({ id: u.id, email: EMAIL, role: 'user' }, secret, { expiresIn: '1h' });
  OTHER_TOKEN = jwt.sign({ id: o.id, email: EMAIL2, role: 'user' }, secret, { expiresIn: '1h' });

  await pool.query('DELETE FROM user_memory WHERE user_id = ANY($1)', [[USER_ID, OTHER_ID]]);

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/memory', require('../routes/memory'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

test('ذاكرةٌ فارغةٌ لمستخدمٍ جديد — والمفاتيحُ المُعلَنة تصل العميل', async () => {
  const { status, body } = await req('GET', '/api/memory');
  assert.equal(status, 200);
  assert.deepEqual(body.memory, {});
  assert.ok(body.keys.length >= 9, 'العميلُ لا يعرف ماذا يُزامن');
});

test('الهاتفُ يرفع ما تعلّمه ⇒ يبقى بعد إغلاق المتصفّح', async () => {
  const { status, body } = await req('POST', '/api/memory/sync', {
    entries: { amanzine_learned: { 'طرطاقة': 'baby_onesies' } },
  });
  assert.equal(status, 200);
  assert.equal(body.merged.amanzine_learned.added, 1);
  assert.deepEqual(body.memory.amanzine_learned.value, { 'طرطاقة': 'baby_onesies' });
});

test('الحاسوبُ يرفع شيئًا آخر ⇒ **الاثنان** يبقيان', async () => {
  // هذا هو جوهرُ العمل: لو فازت آخرُ كتابةٍ لضاعت «طرطاقة» بلا شكوى.
  const { body } = await req('POST', '/api/memory/sync', {
    entries: { amanzine_learned: { 'اونصومبل': 'clothing_sets' } },
  });
  assert.deepEqual(body.memory.amanzine_learned.value, {
    'طرطاقة': 'baby_onesies', 'اونصومبل': 'clothing_sets',
  });
});

test('المزامنةُ تُعيد الذاكرةَ كاملةً — الجهازُ الرافعُ يأخذ ما تعلّمه غيرُه', async () => {
  const { body } = await req('POST', '/api/memory/sync', {
    entries: { amanzine_journeys: [{ id: 'j1', published: true }] },
  });
  // رفع الرحلات، ويأخذ في نفس الردّ العباراتِ التي رفعها جهازٌ آخر.
  assert.ok(body.memory.amanzine_learned, 'لم تعد الذاكرةُ كاملةً');
  assert.equal(body.memory.amanzine_journeys.value.length, 1);
});

test('مزامنتان متزامنتان لا تمحو إحداهما الأخرى', async () => {
  // بلا `FOR UPDATE` في المعاملة يقرأ الطلبان نفسَ القيمة القديمة، فيكتب
  // الثاني فوق الأوّل ويضيع ما تعلّمه أحدُ الجهازَين.
  //
  //   وطلبان اثنان **لا يكفيان** لإثباته: يتسلسلان طبيعيًّا فلا يتداخلان،
  //   فيمرّ الاختبارُ ولو نُزع القفل. اثنا عشرَ طلبًا متوازيًا تُجبِر التداخل.
  //
  //   ── ولا تكفي جولةٌ واحدة ──────────────────────────────────────
  //   نافذةُ السباق ضيّقة: قِيس أنّ جولةً واحدةً تكشف نزعَ القفل في نحو
  //   ربع المرّات فقط — أي حارسٌ ينام ثلاثةَ أرباع الوقت. عشرُ جولاتٍ
  //   بمفاتيحَ جديدةٍ تجعل الكشفَ شبهَ مؤكَّد، والكلفةُ أجزاءُ ثانية.
  //   وأخطرُ ما تكشفه الجولةُ الأولى لكلّ مفتاح: `FOR UPDATE` **لا يقفل
  //   صفًّا لم يُخلَق بعد**، فأوّلُ مزامنةٍ هي أضعفُ لحظةٍ لا أقواها.
  const N = 12, ROUNDS = 10;
  for (let r = 0; r < ROUNDS; r++) {
    const KEY = 'amanzine_user_graph';
    await pool.query('DELETE FROM user_memory WHERE user_id=$1 AND key=$2', [USER_ID, KEY]);
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        req('POST', '/api/memory/sync', { entries: { [KEY]: { [`d${i}`]: 1 } } }))
    );
    for (const x of results) assert.equal(x.status, 200);

    const { body } = await req('GET', '/api/memory');
    const got = Object.keys(body.memory[KEY].value).sort();
    const want = Array.from({ length: N }, (_, i) => `d${i}`).sort();
    assert.deepEqual(got, want,
      `الجولة ${r + 1}: ضاع ${N - got.length} من ${N} — القفلُ لا يحمي من الكتابة المتزامنة`);
  }
});

test('`rev` يتزايد — يعرف العميلُ أنّ عنده قديمًا بلا مقارنة القيمة', async () => {
  const before = (await req('GET', '/api/memory')).body.memory.amanzine_learned.rev;
  await req('POST', '/api/memory/sync', { entries: { amanzine_learned: { 'كسوة': 'clothing' } } });
  const after = (await req('GET', '/api/memory')).body.memory.amanzine_learned.rev;
  assert.ok(after > before, 'rev لم يتزايد');
});

test('ذاكرةُ مستخدمٍ لا تُرى من حسابٍ آخر', async () => {
  const { body } = await req('GET', '/api/memory', undefined, OTHER_TOKEN);
  assert.deepEqual(body.memory, {}, 'تسرّبت ذاكرةُ مستخدمٍ إلى غيره');
});

test('بلا رمزٍ لا شيء — الذاكرةُ ليست عامّة', async () => {
  const r = await fetch(base + '/api/memory');
  assert.equal(r.status, 401);
});

test('مفتاحٌ غيرُ معروفٍ يُرفَض بـ400 ولا يلمس القاعدة', async () => {
  const { status } = await req('POST', '/api/memory/sync', { entries: { hack_me: { a: 1 } } });
  assert.equal(status, 400);
  const { body } = await req('GET', '/api/memory');
  assert.equal('hack_me' in body.memory, false);
});

test('«انسَ هذا عنّي» يمحو مفتاحًا واحدًا ولا يمسّ الباقي', async () => {
  const { status } = await req('DELETE', '/api/memory/amanzine_journeys');
  assert.equal(status, 200);
  const { body } = await req('GET', '/api/memory');
  assert.equal('amanzine_journeys' in body.memory, false);
  assert.ok(body.memory.amanzine_learned, 'المحوُ تجاوز مفتاحَه');
});

test('محوُ مفتاحٍ مجهولٍ يُرفَض — لا مسحَ بالخطأ', async () => {
  assert.equal((await req('DELETE', '/api/memory/nope')).status, 400);
});
