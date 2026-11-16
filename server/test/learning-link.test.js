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
process.env.ADMIN_EMAILS = 'link@test.ma';
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
  app.use('/api/providers', require('../routes/providers'));
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


test('A01: ordinary merchant cannot read or judge platform knowledge', async () => {
  const ordinary = require('jsonwebtoken').sign({ id: 'ordinary-merchant', email: 'ordinary@test.ma', role: 'admin' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  for (const path of ['unknown-report', 'misread-report', 'demand-report']) {
    const r = await fetch(base + '/api/ai/' + path, { headers: { authorization: 'Bearer ' + ordinary } });
    assert.equal(r.status, 403, path);
  }
  for (const path of ['judge-unknown', 'judge-misread']) {
    const r = await fetch(base + '/api/ai/' + path, { method: 'POST',
      headers: { authorization: 'Bearer ' + ordinary, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'untrusted-proposal', status: 'approved', conceptId: 'plumber' }) });
    assert.equal(r.status, 403, path);
  }
});

test('A02: public understanding never reads credentials selected by caller userId', async () => {
  const original = db.getSettings;
  let reads = 0;
  db.getSettings = async () => { reads++; throw new Error('Untrusted settings read'); };
  try {
    const r = await fetch(base + '/api/ai/understand', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'plumber', userId: 'another-merchant' }) });
    assert.equal(r.status, 200);
    assert.equal(reads, 0);
  } finally { db.getSettings = original; }
});

test('A03: merchant cannot approve through create, update or status; platform admin can review', async () => {
  const owner = await db.getUserByEmail('approval-owner@test.ma')
    || await db.createUser({ name: 'Owner', email: 'approval-owner@test.ma', password: 'test-only-unused', role: 'admin' });
  const bearer = require('jsonwebtoken').sign({ id: owner.id, email: owner.email, role: 'admin' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  const call = async (path, method, body, t = bearer) => {
    const r = await fetch(base + '/api/providers' + path, { method,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  const created = await call('', 'POST', { name: 'Untrusted approval', status: 'approved', isVerified: true });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'pending');
  const id = created.body.id;
  try {
    assert.equal((await call('/' + id + '/status', 'PUT', { status: 'approved' })).status, 403);
    assert.equal((await call('/' + id, 'PUT', { status: 'approved', isVerified: true, adminNote: 'forged', bio: 'Allowed edit' })).status, 200);
    let p = await db.getProvider(owner.id, id);
    assert.equal(p.status, 'pending'); assert.equal(p.isVerified, false);
    assert.equal(p.adminNote, ''); assert.equal(p.bio, 'Allowed edit');
    assert.equal((await call('/' + id + '/status', 'PUT', { status: 'approved' }, TOKEN)).status, 200);
    p = await db.getProvider(owner.id, id); assert.equal(p.status, 'approved');
  } finally { await db.deleteProvider(owner.id, id); }
});
