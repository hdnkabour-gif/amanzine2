'use strict';
// ============================================================
// **الوصلة: الاعتمادُ يُنتج معرفةً تُقرأ.**   [REAL_POSTGRESQL]
//
//   كان `judge-unknown` يُبدّل عمودَ حالةٍ ثمّ ينتهي: يسأل الذكاءُ، ويفهم،
//   ويُخزَّن فهمُه، ويضغط المشغّلُ «اعتمد» — ولا يتغيّر شيء. فتُصعَّد الكلمةُ
//   نفسُها غدًا وتستهلك حصّةً ومالًا. وهذا ما يُقاس هنا: أنّ الاعتمادَ
//   **يكتب مرادفًا يقرؤه الفهمُ لاحقًا**، لا أنّ الجوابَ كان `{ok:true}`.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-learning-link-0123456789';
const test = (n, f) => rawTest(n, { skip: SKIP && 'لا DATABASE_URL' }, fn => f(fn));
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '';
const TERM = 'السخّان';
const CID  = 'test_learned_trade';
const post = (p, b) => fetch(base + p, {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify(b),
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('link@test.ma')
    || await db.createUser({ name: 'LK', email: 'link@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  TOKEN = require('jsonwebtoken').sign({ id: u.id, email: 'link@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  await pool.query('DELETE FROM learning_unknowns WHERE text=$1', [TERM]);
  await pool.query('DELETE FROM custom_concepts WHERE id=$1', [CID]);
  const app = express(); app.use(express.json());
  app.use('/api/ai', require('../routes/ai'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

test('① الجهلُ يُسجَّل ثمّ يُخزَّن ما فهمه الذكاء', async () => {
  assert.equal((await post('/api/ai/report-unknown', { text: TERM })).status, 200);
  await post('/api/ai/suggest-unknown', { text: TERM, suggestion: 'سبّاك · تصليح', conceptId: CID });
  const row = await db.getUnknownByText(TERM);
  assert.equal(row.aiConcept, CID, 'لم يُحفَظ المفهومُ المقترَح');
});

test('**② الاعتمادُ يكتب مرادفًا في مفهومٍ يُقرأ** — جوهرُ الوصلة', async () => {
  const r = await post('/api/ai/judge-unknown', { text: TERM, status: 'approved' });
  assert.equal(r.status, 200);
  assert.equal(r.body.learned?.conceptId, CID, 'الجوابُ لا يُقرّ بأنّ شيئًا تُعلِّم');

  // الدليلُ ليس الجواب — بل ما استقرّ في القاعدة ويقرؤه الفهم.
  const c = await db.getCustomConcept(CID);
  assert.ok(c, '**لم يُنشَأ مفهوم — الاعتمادُ ما زال يبدّل حالةً فقط**');
  const all = Object.values(c.variants || {}).flat();
  assert.ok(all.includes(TERM), `«${TERM}» ليست في مرادفات المفهوم: ${JSON.stringify(c.variants)}`);
  assert.equal(c.status, 'published', 'معرفةٌ غيرُ منشورةٍ لا يقرؤها الفهم');
});

test('③ والحالةُ تصير معتمَدةً — فلا يعود في الطابور', async () => {
  assert.equal((await db.getUnknownByText(TERM)).status, 'approved');
});

test('④ اعتمادٌ بلا مفهومٍ يُردّ — لا معرفةَ بلا وجهة', async () => {
  await pool.query('DELETE FROM learning_unknowns WHERE text=$1', ['لفظٌ بلا مفهوم']);
  await post('/api/ai/report-unknown', { text: 'لفظٌ بلا مفهوم' });
  const r = await post('/api/ai/judge-unknown', { text: 'لفظٌ بلا مفهوم', status: 'approved' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'CONCEPT_REQUIRED');
});

test('⑤ الرفضُ لا يكتب معرفةً', async () => {
  await pool.query('DELETE FROM learning_unknowns WHERE text=$1', ['لفظٌ مرفوض']);
  await pool.query('DELETE FROM custom_concepts WHERE id=$1', ['test_rejected_cid']);
  await post('/api/ai/report-unknown', { text: 'لفظٌ مرفوض' });
  await post('/api/ai/suggest-unknown', { text: 'لفظٌ مرفوض', suggestion: 's', conceptId: 'test_rejected_cid' });
  const r = await post('/api/ai/judge-unknown', { text: 'لفظٌ مرفوض', status: 'rejected' });
  assert.equal(r.status, 200);
  assert.equal(r.body.learned, null);
  assert.equal(await db.getCustomConcept('test_rejected_cid'), null, '**الرفضُ كتب معرفة**');
});
