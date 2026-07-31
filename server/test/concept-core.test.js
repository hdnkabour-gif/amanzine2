'use strict';
// ============================================================
// نواةُ المفهوم — الاستقرار (نسخ · أسماءٌ بديلة · مصدر) والجسر (مزوّد ⇄ مفهوم).
//
//   ثلاثةُ أسئلةٍ لم يكن للنظام جوابٌ عليها:
//     ① «لماذا تغيّر هذا المفهوم؟ ورُدَّه كما كان.»   ⇐ لا تاريخ
//     ② «دمجتُ auto_mechanic في mechanic — ماذا حلّ بمزوّديه؟» ⇐ ينقطعون
//     ③ «شكون كيبيع الورد فالدار البيضاء؟»            ⇐ لا رابطَ أصلًا
//
//   الثالثُ أهمُّها: المحرّك كان يفهم «بغيت نشري ورد» ثمّ يقف — يفهم ولا يصل
//   إلى إنسان. وهو الشرطُ الوحيد لجملة «أيُّ محلٍّ كيفما كان نوعه».
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/concept-core.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.ADMIN_EMAIL = 'core@test.ma';
process.env.JWT_SECRET ||= 'test-secret-for-concept-core-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, userId, TOKEN = '';
const req = async (method, path, body) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('core@test.ma')
    || await db.createUser({ name: 'Core', email: 'core@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  userId = u.id;
  TOKEN = require('jsonwebtoken').sign({ id: userId, email: 'core@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });

  await pool.query('DELETE FROM provider_concepts');
  await pool.query('DELETE FROM concept_aliases');
  await pool.query('DELETE FROM concept_versions');
  await pool.query(`DELETE FROM custom_concepts WHERE id LIKE 'tst_%'`);
  await pool.query(`DELETE FROM providers WHERE name LIKE 'اختبار%'`);

  const app = express();
  app.use(express.json());
  app.use('/api/knowledge', require('../routes/knowledge'));
  app.use('/api/providers', require('../routes/providers'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

const mkConcept = (id, ar, variants) =>
  req('POST', '/api/knowledge/concepts', {
    id, category: 'products', concept: { ar },
    variants: { darija: variants }, status: 'published',
  });

// ── ① النسخ ─────────────────────────────────────────────────
test('كلُّ كتابةٍ تُخلّف نسخةً — وإلّا فالتراجعُ مستحيل', async () => {
  await mkConcept('tst_flower', 'بائع ورد', ['ورد', 'باقة ورد']);
  const v0 = await req('GET', '/api/knowledge/concepts/tst_flower/versions');
  assert.equal(v0.body.versions.length, 0, 'الإنشاءُ الأوّل ليس تعديلًا — لا نسخةَ قبله');

  await req('PUT', '/api/knowledge/concepts/tst_flower', {
    category: 'products', concept: { ar: 'محلّ زهور' }, variants: { darija: ['ورد', 'زهور'] }, status: 'published',
  });
  const v1 = await req('GET', '/api/knowledge/concepts/tst_flower/versions');
  assert.equal(v1.body.versions.length, 1, 'التعديلُ لم يُخلّف نسخة');
  assert.equal(v1.body.versions[0].reason, 'manual');
});

test('التراجعُ يُعيد الحالةَ السابقة — ولا يمحو التاريخ', async () => {
  const vs = (await req('GET', '/api/knowledge/concepts/tst_flower/versions')).body.versions;
  const r = await req('POST', `/api/knowledge/concepts/tst_flower/revert/${vs[0].id}`);
  assert.equal(r.status, 200, r.body?.error);
  assert.equal(r.body.concept.concept.ar, 'بائع ورد', 'لم يرجع الاسمُ السابق');

  const after2 = (await req('GET', '/api/knowledge/concepts/tst_flower/versions')).body.versions;
  assert.equal(after2.length, 2, 'التراجعُ نفسُه حدثٌ — يجب أن يُسجَّل، لا أن يبتلع ما قبله');
  assert.match(after2[0].reason, /^revert:/);
});

// الـmiss فريدٌ بـ(normalized, city)، فإعادةُ التشغيل تجده `resolved` لا `open`.
// نُعيده مفتوحًا صراحةً بدل حذف الجدول كلِّه — فملفّاتُ الاختبار تعمل متوازيةً
// وحذفُ جدولٍ مشتركٍ يُسقط اختبارَ غيرنا بلا سببٍ ظاهر.
const openMiss = async (raw) => {
  await db.recordSearchMiss({ raw, normalized: raw, city: null });
  await pool.query(`UPDATE search_misses SET status = 'open' WHERE normalized = $1`, [raw]);
  return (await db.listSearchMisses({ status: 'open', limit: 100 })).find(x => x.raw === raw);
};

test('التعلّمُ من miss يُسجّل سببَه — «لماذا تغيّر هذا؟» يُجيب نفسَه', async () => {
  const m = await openMiss('بوكي ديال الورد');
  const r = await req('POST', `/api/knowledge/misses/${m.id}/resolve`, { conceptId: 'tst_flower' });
  assert.equal(r.status, 200, r.body?.error);
  const vs = (await req('GET', '/api/knowledge/concepts/tst_flower/versions')).body.versions;
  assert.match(vs[0].reason, /^miss:/, `السببُ لم يُسجَّل: ${vs[0].reason}`);
});

test('المصدرُ محفوظ — دفعةُ ذكاءٍ اصطناعيٍّ سيّئةٌ يجب أن تكون قابلةً للتمييز', async () => {
  const c = await db.upsertCustomConcept({
    id: 'tst_ai', category: 'products', concept: { ar: 'مقترحٌ آليّ' },
    variants: { darija: ['كلمة مقترحة'] }, status: 'candidate', source: 'ai', createdBy: userId,
  });
  assert.equal(c.source, 'ai');
  assert.equal(c.status, 'candidate', 'الحالةُ candidate مفقودة — فاقتراحُ الـAI إمّا خطرٌ أو غيرُ مرئيّ');
  const pub = await req('GET', '/api/knowledge/concepts/public');
  assert.ok(!pub.body.concepts.some(x => x.id === 'tst_ai'), 'مرشّحٌ لم يُراجَع تسرّب إلى الفهم العامّ');
});

// ── ② الدمج بلا كسر ─────────────────────────────────────────
test('الدمجُ يُحوّل المزوّدين ولا يتركهم على مفهومٍ ميّت', async () => {
  const p = await db.createProvider(userId, { name: 'اختبار ورد', city: 'الدار البيضاء', phone: '0600000000', status: 'active' });
  await mkConcept('tst_flower2', 'زهور مناسبات', ['ورد المناسبات']);
  await req('PUT', `/api/providers/${p.id}/concepts`, { concepts: [{ conceptId: 'tst_flower2', isPrimary: true }] });

  const r = await req('POST', '/api/knowledge/concepts/merge', { fromId: 'tst_flower2', toId: 'tst_flower', reason: 'نفس المعنى' });
  assert.equal(r.status, 200, r.body?.error);

  const pc = await db.getProviderConcepts(p.id);
  assert.deepEqual(pc.map(x => x.concept_id), ['tst_flower'], `المزوّدُ بقي على مفهومٍ محذوف: ${JSON.stringify(pc)}`);
});

test('الاسمُ البديل يُحلّ — الإشارةُ القديمة تبقى صالحة', async () => {
  assert.equal(await db.resolveConceptAlias('tst_flower2'), 'tst_flower');
  const got = await db.getCustomConcept('tst_flower2');
  assert.ok(got, 'طلبُ المعرّف القديم أعاد فراغًا — وهذا هو الكسرُ الذي بُني الـalias لمنعه');
  assert.equal(got.id, 'tst_flower');
});

test('الدمجُ العكسيّ يُرفَض — الحلقةُ تُجمّد الحلَّ لا تُخطئ فقط', async () => {
  const r = await req('POST', '/api/knowledge/concepts/merge', { fromId: 'tst_flower', toId: 'tst_flower2' });
  assert.equal(r.status, 409, `سُمح بحلقةٍ في الأسماء البديلة (${r.status})`);
});

test('صفُّ المفهوم المدموج محفوظٌ نسخةً — الدمجُ غيرُ مُتلِف', async () => {
  const vs = await db.listConceptVersions('tst_flower2');
  assert.ok(vs.length >= 1, 'اختفى المفهومُ بلا أثر');
  assert.match(vs[0].reason, /^merged_into:tst_flower$/);
});

// ── ③ الجسر ─────────────────────────────────────────────────
test('«شكون كيبيع الورد فالدار البيضاء؟» — الجملةُ التي لم تكن ممكنة', async () => {
  const r = await req('GET', '/api/providers/by-concept/tst_flower?city=' + encodeURIComponent('الدار البيضاء'));
  assert.equal(r.status, 200);
  assert.equal(r.body.providers.length, 1, `لم يُعثَر على المزوّد: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.providers[0].name, 'اختبار ورد');
});

test('البحثُ بالمعرّف القديم يعمل أيضًا — الاستقرارُ يمتدّ إلى الاستعلام', async () => {
  const r = await req('GET', '/api/providers/by-concept/tst_flower2');
  assert.equal(r.body.providers.length, 1, 'الاسمُ البديل لا يُحلّ عند الاستعلام');
});

test('لا يُسرَّب ما لا يخصّ الباحث', async () => {
  const p = (await req('GET', '/api/providers/by-concept/tst_flower')).body.providers[0];
  assert.equal(p.user_id, undefined, 'user_id مُسرَّب');
  assert.equal(p.admin_note, undefined, 'admin_note مُسرَّب');
});

test('نشاطٌ أساسيٌّ واحدٌ فقط — «أساسيّان» = لا أساسيّ', async () => {
  const p = await db.createProvider(userId, { name: 'اختبار مخبزة', city: 'سلا', phone: '0611111111', status: 'active' });
  await req('PUT', `/api/providers/${p.id}/concepts`, {
    concepts: [{ conceptId: 'bakery', isPrimary: true }, { conceptId: 'cafe', isPrimary: true }],
  });
  const pc = await db.getProviderConcepts(p.id);
  assert.equal(pc.length, 2, 'المتعدّدُ لم يُحفَظ — والمحلُّ نادرًا ما يكون شيئًا واحدًا');
  assert.equal(pc.filter(x => x.is_primary).length, 1, `أكثرُ من نشاطٍ أساسيّ: ${JSON.stringify(pc)}`);
});

test('مفهومٌ لا وجودَ له يُرفَض — لا رابطَ ميّتٍ من لحظة إنشائه', async () => {
  const p = await db.createProvider(userId, { name: 'اختبار وهمي', city: 'فاس', phone: '0622222222', status: 'active' });
  const r = await req('PUT', `/api/providers/${p.id}/concepts`, { concepts: [{ conceptId: 'ma_kayn_walo' }] });
  assert.equal(r.status, 400, 'قُبل مفهومٌ غيرُ موجود');
  assert.equal((await db.getProviderConcepts(p.id)).length, 0, 'كُتب رغم الرفض');
});

test('المفاهيمُ المدمجة تُحلّ عند الكتابة أيضًا', async () => {
  const p = await db.createProvider(userId, { name: 'اختبار قديم', city: 'أكادير', phone: '0633333333', status: 'active' });
  await req('PUT', `/api/providers/${p.id}/concepts`, { concepts: [{ conceptId: 'tst_flower2' }] });
  const pc = await db.getProviderConcepts(p.id);
  assert.deepEqual(pc.map(x => x.concept_id), ['tst_flower'],
    'رابطٌ وُلد معطوبًا: كُتب المعرّفُ الميّت بدل الحيّ');
});
