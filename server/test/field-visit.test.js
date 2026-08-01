'use strict';
// ============================================================
// الزيارةُ الميدانيّة — «نمشي للمحلّ، نسجّلو، ونجمع كلّ شيء».
//
//   المحصولُ الحقيقيُّ ليس صفَّ المحلّ بل **اللغة**. صفُّ المحلّ يُكتب في
//   دقيقة؛ أمّا «برييون» و«دريساج» فلا يعرفها قاموسٌ في الأرض.
//
//   والخطرُ المقابل: زيارةٌ بحسن نيّةٍ تُدخل كلمةً يملكها مفهومٌ آخر، فتُفسد
//   فهمًا كان يشتغل. لذلك الكلماتُ تمرّ بحارس التعارض نفسِه — والاختبارُ
//   أدناه **يحاول التسميم عمدًا** ويتأكّد أنّه رُدّ.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.ADMIN_EMAIL = 'field@test.ma';
process.env.JWT_SECRET ||= 'test-secret-for-field-visit-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '';
const req = async (method, path, body) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

const PHONE = '0655000111';
const SHOP_EMAIL = `${PHONE}@amanzine.local`;
const TEST_PHONES = [PHONE, '0655000222', '0677000333', '0688000444',
  ...Array.from({ length: 6 }, (_, i) => `06990004${String(i).padStart(2, '0')}`)];

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('field@test.ma')
    || await db.createUser({ name: 'Field', email: 'field@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  TOKEN = require('jsonwebtoken').sign({ id: u.id, email: 'field@test.ma', role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });

  // نظّف السلسلة **كاملةً**: حذفُ المزكِّي وحده يُفرّغ vouched_by على صفوفٍ
  // باقيةٍ (ON DELETE SET NULL)، فيقرأ الاختبارُ صفًّا قديمًا بلا مزكٍّ ويظنّ
  // أنّ الميزة معطوبة. عطبُ اختبارٍ يبدو عطبَ منتجٍ هو أسوأُ ما في مجموعة.
  await pool.query('DELETE FROM field_visits');
  await pool.query(`DELETE FROM providers WHERE phone = ANY($1)`, [TEST_PHONES]);
  await pool.query(`DELETE FROM users WHERE email = ANY($1)`,
    [TEST_PHONES.map(p => `${p}@amanzine.local`)]);
  await pool.query(`DELETE FROM custom_concepts WHERE id = 'car_wash'`);

  const app = express();
  app.use(express.json());
  app.use('/api/providers', require('../routes/providers'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

// زيارةٌ كاملةٌ كما تحدث فعلًا في محلّ غسلٍ بالدار البيضاء.
const VISIT = {
  shop: { name: 'لافاج النور', phone: PHONE, city: 'الدار البيضاء' },
  servicesRaw: 'عندي لافاج، طولوري، صباغة، كنغسل الزرابي',
  concepts: [
    { conceptId: 'car_wash', isPrimary: true },
    { conceptId: 'car_body_repair' },
    { conceptId: 'car_painting' },
    { conceptId: 'carpet_cleaning' },
  ],
  customerLines: ['بغيت نغسل الطوموبيل', 'عندي خدشة فالبارشوك', 'واش كتديرو البوليساج؟'],
  pricingAsks: ['واش الطوموبيل كبيرة ولا صغيرة؟', 'واش وسخة بزاف ولا شويّة؟'],
  words: [{ term: 'رشة ديال الما', conceptId: 'car_wash' }],
  notes: 'مفتوح من ٨ حتّى ٢٠',
};

test('زيارةٌ واحدةٌ تُنشئ الحساب والمحلّ والروابط معًا', async () => {
  const r = await req('POST', '/api/providers/field-visit', VISIT);
  assert.equal(r.status, 200, r.body?.error);
  assert.ok(r.body.provider?.id, 'لم يُنشأ المحلّ');
  assert.equal(r.body.learned.concepts, 4, `رُبطت ${r.body.learned.concepts} خدماتٍ من ٤`);

  const pc = await db.getProviderConcepts(r.body.provider.id);
  assert.equal(pc.filter(x => x.is_primary).length, 1, 'لا نشاطَ أساسيًّا واحدًا');
  assert.ok(pc.some(x => x.concept_id === 'carpet_cleaning'));
});

test('رمزُ الدخول يُعطى مرّةً، ويُجبِر على التغيير', async () => {
  // الحسابُ أُنشئ نيابةً عن إنسانٍ حقيقيّ. رمزٌ لا يُجبَر على تغييره يبقى
  // معروفًا لشخصين إلى الأبد.
  const u = await db.getUserByEmail(SHOP_EMAIL);
  assert.ok(u, 'لم يُنشأ حسابُ صاحب المحلّ');
  const { rows } = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [u.id]);
  assert.equal(rows[0].must_change_password, true, 'لم يُطلَب تغييرُ الرمز — رمزٌ مؤقّتٌ صار دائمًا');

  // زيارةٌ ثانيةٌ لنفس الرقم: لا رمزَ جديد، فالحسابُ صار لصاحبه.
  const again = await req('POST', '/api/providers/field-visit', VISIT);
  assert.equal(again.status, 200, again.body?.error);
  assert.equal(again.body.loginCode, null, 'أُصدر رمزٌ جديدٌ لحسابٍ له مالك');
});

test('أسئلةُ التسعير تُكتَب في asks — لا في ملاحظةٍ لا يقرؤها أحد', async () => {
  // «الثمنُ على حسب نوع السيارة، واش وسخة بزاف» — هذه طريقةُ تفكير الحرفيّ.
  // مكانُها `asks` كي يسألها المحرّكُ نيابةً عنه، لا حقلُ ملاحظاتٍ حرّ.
  const c = await db.getCustomConcept('car_wash');
  assert.ok(c, 'لم يُنشأ صفُّ إثراءٍ لـcar_wash');
  const seek = (c.asks || {}).seek || [];
  assert.ok(seek.includes('واش وسخة بزاف ولا شويّة؟'), `asks.seek = ${JSON.stringify(seek)}`);
});

test('الكلمةُ الجديدة تُتعلَّم فعلًا — لا تُسجَّل وتُنسى', async () => {
  const c = await db.getCustomConcept('car_wash');
  assert.ok(Object.values(c.variants || {}).flat().includes('رشة ديال الما'),
    'الكلمةُ التي قالها الحرفيّ لم تدخل المعرفة');
});

test('⛔ زيارةٌ لا تستطيع تسميم المعرفة — ولو بحسن نيّة', async () => {
  // «سبّاك» يملكها plumber المدمج. لو مرّت لصارت مغسلةً، فينكسر فهمُ آلافٍ
  // بسبب زيارةٍ واحدة. تُردّ موسومةً — لا تُطبَّق صامتًا ولا تُرمى صامتًا.
  const r = await req('POST', '/api/providers/field-visit', {
    shop: { name: 'لافاج آخر', phone: '0655000222', city: 'سلا' },
    concepts: [{ conceptId: 'car_wash', isPrimary: true }],
    words: [{ term: 'سباك', conceptId: 'car_wash' }],
  });
  assert.equal(r.status, 200, r.body?.error);
  assert.equal(r.body.learned.words, 0, 'كلمةٌ مسروقةٌ دخلت المعرفة');
  assert.equal(r.body.learned.needsReview, 1, 'لم يُبلَّغ الزائرُ بالتعارض');
  assert.match(r.body.words[0].reason, /plumber/);
});

test('رقمُ هاتفٍ غيرُ صالح يُرفَض — الهاتفُ هو الهويّة في السوق', async () => {
  const r = await req('POST', '/api/providers/field-visit', { shop: { name: 'x', phone: '123' } });
  assert.equal(r.status, 400);
});

test('حصادُ السوق يُحسَب من الخام — فلا يُضخَّم', async () => {
  const r = await req('GET', '/api/providers/field-visits');
  assert.equal(r.status, 200, r.body?.error);
  assert.ok(r.body.harvest.visits >= 3, `الزيارات: ${r.body.harvest.visits}`);
  assert.ok(r.body.harvest.lines >= 6, `جملُ الزبناء: ${r.body.harvest.lines}`);
  assert.ok(r.body.harvest.asks >= 4, `أسئلةُ التسعير: ${r.body.harvest.asks}`);
});

// ── سلسلةُ التزكية ───────────────────────────────────────────
// «المحلّاتُ اللي كنسجّل أنا يوليو معتمدين، ويقدروا يسجّلو محلّاتٍ أخرى.»
// الفكرةُ قويّة، وفيها فخٌّ: لو **ورِث** الاعتمادُ لصار الجميعُ معتمَدين بعد
// شهر، ولا يعني الوسمُ شيئًا — ووسمُ ثقةٍ لا يميّز أحدًا أسوأُ من غيابه.
// فالقاعدة المُختبَرة هنا: **الاعتمادُ لا يُورَث، يُكتسَب.**

const shopToken = async (email) => {
  const u = await db.getUserByEmail(email);
  return require('jsonwebtoken').sign({ id: u.id, email, role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
};

test('ما زرتُه بنفسي ⇒ معتمَد من يومه، وله حقُّ التزكية', async () => {
  const r = await req('GET', '/api/providers/field-visits');   // أدمن
  assert.equal(r.status, 200);
  const p = (await pool.query(`SELECT * FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  assert.equal(p.is_verified, true, 'محلٌّ زُرتُه بنفسي ولم يُعتمَد');
  assert.equal(p.depth, 1);
  assert.ok(p.invite_quota > 0, 'معتمَدٌ بلا حقّ تزكية');
});

test('محلٌّ معتمَدٌ يسجّل غيرَه — بنفس الشاشة تمامًا', async () => {
  const T = TOKEN; TOKEN = await shopToken(SHOP_EMAIL);
  const r = await req('POST', '/api/providers/field-visit', {
    shop: { name: 'ميكانيك الأمل', phone: '0677000333', city: 'الدار البيضاء' },
    servicesRaw: 'ميكانيك',
    concepts: [{ conceptId: 'mechanic', isPrimary: true }],
    customerLines: ['الطوموبيل ما بغاتش تقاد'],
  });
  TOKEN = T;
  assert.equal(r.status, 200, r.body?.error);
  assert.equal(r.body.provider.status, 'vouched', 'التزكيةُ أُعطيت اعتمادًا');
  assert.equal(r.body.provider.vouchedBy, 'لافاج النور', 'اسمُ المزكِّي غائب — التزكيةُ اسمٌ يتحمّل');
});

test('⛔ الاعتمادُ لا يُورَث — المُزكَّى غيرُ معتمَد', async () => {
  const p = (await pool.query(`SELECT * FROM providers WHERE phone = '0677000333' ORDER BY created_at DESC`)).rows[0];
  assert.equal(p.is_verified, false, 'وُرِث الاعتماد — الوسمُ صار بلا معنى');
  assert.equal(p.depth, 2);
  assert.ok(p.vouched_by, 'لا أثرَ لمن زكّاه');
});

test('⛔ المُزكَّى لا يُزكّي — السلسلةُ تقف عند اثنين', async () => {
  const T = TOKEN; TOKEN = await shopToken('0677000333@amanzine.local');
  const r = await req('POST', '/api/providers/field-visit', {
    shop: { name: 'محلّ ثالث', phone: '0688000444' },
  });
  TOKEN = T;
  assert.equal(r.status, 403, `سُمح بسلسلةٍ من ثلاث درجات (${r.status})`);
  assert.match(r.body.error, /يُكتسَب/);
});

test('الحصّةُ محدودة — «بلا حدّ» تعني ٢٠٠ محلٍّ وهميٍّ في ليلة', async () => {
  const T = TOKEN; TOKEN = await shopToken(SHOP_EMAIL);
  let last = null;
  for (let i = 0; i < 6; i++) {
    last = await req('POST', '/api/providers/field-visit', {
      shop: { name: `محلّ ${i}`, phone: `06990004${String(i).padStart(2, '0')}` },
    });
    if (last.status === 429) break;
  }
  TOKEN = T;
  assert.equal(last.status, 429, 'لا حدَّ للتزكية');
  assert.match(last.body.error, /الحصّة/);
});

test('المزكِّي يرى سلسلتَه وحصّتَه — التزكيةُ مسؤوليّةٌ مرئيّة', async () => {
  const T = TOKEN; TOKEN = await shopToken(SHOP_EMAIL);
  const r = await req('GET', '/api/providers/my-vouches');
  TOKEN = T;
  assert.equal(r.status, 200, r.body?.error);
  assert.equal(r.body.me.verified, true);
  assert.ok(r.body.vouched.length >= 1, 'لا يرى مَن زكّاهم');
  assert.equal(r.body.left, 0, `الباقي ${r.body.left} رغم استهلاك الحصّة`);
  assert.equal(r.body.canVouch, false);
});

// ── أنواعُ التحقّق ───────────────────────────────────────────
// `is_verified` بتٌّ واحدٌ كان يحمل وقائعَ مختلفة: وُجد المحلّ؟ الرجلُ صاحبُه؟
// الموقعُ صحيح؟ وجمعُها يُفقد التفصيل، فلا يمكن غدًا أن تسأل «وريني اللي
// زرتُهم بنفسي». الآن لكلّ واقعةٍ صاحبٌ ووقت — و`is_verified` **مشتقٌّ**.

test('الزيارةُ الإداريّة تُسجّل واقعةَ اعتماد، لا بتًّا يدويًّا', async () => {
  const p = (await pool.query(`SELECT * FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  const v = await db.getProviderVerifications(p.id);
  assert.ok(v.some(x => x.kind === 'business'), `لا واقعةَ اعتماد: ${JSON.stringify(v)}`);
  assert.ok(v[0].verified_by, 'لا يُعرَف مَن اعتمد');
  assert.equal(p.is_verified, true, 'الصفةُ لم تُشتَقّ من الواقعة');
});

test('`is_verified` مشتقٌّ لا مصدرٌ ثانٍ — يسقط بسقوط الواقعة', async () => {
  const p = (await pool.query(`SELECT id FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  await db.unverifyProvider(p.id, 'business');
  let row = (await pool.query('SELECT is_verified FROM providers WHERE id = $1', [p.id])).rows[0];
  assert.equal(row.is_verified, false, 'بقيت الصفةُ بعد سحب الواقعة — مصدران للحقيقة');

  await db.verifyProvider(p.id, { kind: 'business', by: 'test' });
  row = (await pool.query('SELECT is_verified FROM providers WHERE id = $1', [p.id])).rows[0];
  assert.equal(row.is_verified, true);
});

test('أنواعٌ مستقلّة: الهويّةُ ليست وجودَ المحلّ', async () => {
  const p = (await pool.query(`SELECT id FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  await db.verifyProvider(p.id, { kind: 'location', by: 'test', note: 'GPS مطابق' });
  await db.verifyProvider(p.id, { kind: 'identity', by: 'test' });
  const kinds = (await db.getProviderVerifications(p.id)).map(x => x.kind).sort();
  assert.deepEqual(kinds, ['business', 'identity', 'location']);

  // الجملةُ التي كان البتُّ الواحد يمنعها.
  const both = await db.providersByVerification({ kinds: ['business', 'location'] });
  assert.ok(both.some(x => x.id === p.id), 'تعذّر الاستعلامُ بنوعَين معًا');
  const onlyPhone = await db.providersByVerification({ kinds: ['phone'] });
  assert.ok(!onlyPhone.some(x => x.id === p.id), 'نوعٌ لم يُسجَّل ظهر في النتيجة');
});

test('نوعُ تحقّقٍ مخترَع يُرفَض — لا وسومَ حرّةً على الثقة', async () => {
  const p = (await pool.query(`SELECT id FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  await assert.rejects(() => db.verifyProvider(p.id, { kind: 'super_trusted' }), /غيرُ معروف/);
});

test('الزيارةُ كيانٌ يُعاد ويُقارَن', async () => {
  const p = (await pool.query(`SELECT id FROM providers WHERE phone = $1 ORDER BY created_at DESC`, [PHONE])).rows[0];
  const r = await req('GET', `/api/providers/${p.id}/visits`);
  assert.equal(r.status, 200, r.body?.error);
  assert.ok(r.body.visits.length >= 1, 'لا تاريخَ للزيارات');
  assert.ok('lines' in r.body.visits[0], 'لا حصادَ لكلّ زيارة — فلا تُقارَن زيارتان');
  assert.ok(r.body.verifications.length >= 1);
});
