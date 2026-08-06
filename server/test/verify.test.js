'use strict';
// ============================================================
// التحقّقُ الموحَّد — قناةٌ محايدة، والفعلُ هو ما يطلب الرمز.
//
//   السيناريو الذي يبرّر العمل: تاجرٌ مغربيٌّ يملك واتساب ولا يفتح بريدَه.
//   كان التحقّقُ بريدًا وحدَه، فلا سبيلَ له إليه إطلاقًا.
//
//   وأخطرُ ما يُختبَر هنا ليس الإرسالَ بل **ربطُ الرمز بغرضه**: رمزٌ طُلب
//   لتأكيد طلبِ زبونٍ يجب ألّا يبدّل نمرةَ صاحب الحساب. بلا ذلك يصير الرمزُ
//   مفتاحًا عامًّا يلتقطه من يرى رسالةً واحدة.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-verify-only-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

const contract = require('../lib/verify/contract');

// ── ما لا يحتاج قاعدةً: العقدُ نفسُه ────────────────────────────
rawTest('الهويّةُ تُعرَف نوعًا — بريدٌ أم رقم', () => {
  assert.equal(contract.kindOf('a@b.com'), 'email');
  assert.equal(contract.kindOf('0612345678'), 'phone');
  assert.equal(contract.kindOf('+212 612-345-678'), 'phone');
  assert.equal(contract.kindOf('شي حاجة'), null, 'نصٌّ عاديٌّ قُرئ هويّة');
  assert.equal(contract.kindOf(''), null);
});

rawTest('الرقمُ المغربيُّ يُوحَّد — «0612» و«+212612» شيءٌ واحد', () => {
  // بلا التوحيد يُخزَّن الرمزُ على صيغةٍ ويُطلَب على أخرى، فلا يُطابَق أبدًا.
  const a = contract.normalizeIdentifier('0612345678');
  const b = contract.normalizeIdentifier('+212 612 345 678');
  assert.equal(a, b, `«${a}» ≠ «${b}»`);
  assert.equal(a, '212612345678');
});

rawTest('الهويّةُ تُحجَب في العرض — لا يُطبَع بريدٌ ولا رقمٌ بتمامه', () => {
  assert.match(contract.maskIdentifier('ahmed@gmail.com'), /^ah\*\*\*@/);
  const m = contract.maskIdentifier('0612345678');
  assert.ok(m.endsWith('5678') && m.includes('•'), `قناعٌ ضعيف: ${m}`);
  assert.ok(!m.includes('212612'), 'الرقمُ ظاهرٌ رغم القناع');
});

rawTest('العقدُ يرفض قناةً ناقصةً عند التحميل لا وقت الإرسال', () => {
  assert.deepEqual(contract.validateChannel({ meta: { id: 'x', name: 'س', kind: 'email' }, available: () => true, send: async () => ({}) }), []);
  assert.ok(contract.validateChannel({ meta: { id: 'x', name: 'س', kind: 'fax' }, available: () => true, send: async () => ({}) }).length,
    'قناةٌ بنوعِ هويّةٍ مجهولٍ قُبلت');
  assert.ok(contract.validateChannel({ meta: { id: 'x', name: 'س', kind: 'email' }, send: async () => ({}) }).length,
    'قناةٌ بلا `available` قُبلت — ستفشل صامتةً وقتَ الإرسال');
});

// ── كلُّ قناةٍ تُعلن عجزَها ولا تصمت ───────────────────────────
//
//   الصمتُ هنا أخطرُ ما يكون: يظنّ الإنسانُ أنّ الرمزَ في الطريق وينتظر
//   رمزًا لن يصل. ولذلك تُسأل كلُّ قناةٍ عن `available` قبل الاختيار.
rawTest('قناةٌ غيرُ مُهيّأةٍ تُعلن ذلك — ولا تدّعي الإرسال', async () => {
  const dir = path.join(__dirname, '..', 'lib', 'verify', 'channels');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.channel.js'));
  assert.ok(files.length >= 3, `وُجدت ${files.length} قنوات — البريدُ وواتساب وSMS على الأقلّ`);
  for (const f of files) {
    const ch = require(path.join(dir, f));
    if (ch.available({ settings: null })) continue;   // مُهيّأةٌ في هذه البيئة
    const r = await ch.send({ to: 'x@y.com', code: '123456' });
    assert.equal(r.sent, false, `${ch.meta.id}: غيرُ مُهيّأةٍ وادّعت الإرسال`);
    assert.ok(r.reason, `${ch.meta.id}: فشلٌ بلا سبب — لا يُشخَّص`);
  }
});

rawTest('SMS لا تنادي شبكةً داخليّة', () => {
  const sms = require('../lib/verify/channels/sms.channel');
  assert.throws(() => sms._assertSafeUrl('https://127.0.0.1/send'), /داخليّة/);
  assert.throws(() => sms._assertSafeUrl('https://10.0.0.5/send'), /داخليّة/);
  assert.throws(() => sms._assertSafeUrl('http://api.sms.ma/send'), /https/);
  assert.ok(sms._assertSafeUrl('https://api.sms.ma/send'));
});

// ── وعلى قاعدةٍ حقيقيّة ─────────────────────────────────────────
let pool, db, verify, USER_ID;
const EMAIL = 'verify-test@amanzine.ma';
const PHONE = '0612000111';

before(async () => {
  if (SKIP) return;
  db = require('../database').db;
  pool = require('../db');
  verify = require('../lib/verify');
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail(EMAIL)
    || await db.createUser({ name: 'V', email: EMAIL, password: bcrypt.hashSync('x', 4), role: 'user' });
  USER_ID = u.id;
  await pool.query(`DELETE FROM otp_tokens WHERE identifier IN ($1,$2)`, [EMAIL, '212612000111']);
});
after(async () => { if (SKIP) return; await pool.end?.(); });

/** يقرأ الرمزَ من القاعدة — الاختبارُ لا يملك بريدًا ولا واتساب. */
const lastCode = async (identifier, purpose) => {
  const r = await pool.query(
    `SELECT code FROM otp_tokens WHERE identifier=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1`,
    [contract.normalizeIdentifier(identifier), purpose]);
  return r.rows[0]?.code;
};

test('لا قناةَ مُهيّأة ⇒ يُعلَن بصراحةٍ ولا يُختلَق نجاح', async () => {
  // بيئةُ الاختبار بلا SMTP وبلا واتساب: هذه هي الحالةُ الصادقة.
  const out = await verify.start({ identifier: EMAIL, purpose: 'login', userId: USER_ID, settings: {} });
  if (out.ok) return;                                  // بيئةٌ فيها SMTP — لا شأنَ لنا
  assert.equal(out.reason, 'no-channel');
  assert.deepEqual(out.channels, [], 'قنواتٌ مُعلَنةٌ وهي غيرُ مُهيّأة');
});

test('الغرضُ جزءٌ من المفتاح — رمزُ الطلبِ لا يبدّل نمرة', async () => {
  await db.createVerification({
    identifier: contract.normalizeIdentifier(PHONE), purpose: 'order_confirm',
    userId: USER_ID, channel: 'whatsapp', code: '111222',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  const wrongPurpose = await verify.check({ identifier: PHONE, purpose: 'phone_change', code: '111222' });
  assert.equal(wrongPurpose.valid, false, '**رمزُ تأكيدِ طلبٍ بدّل نمرةَ صاحب الحساب**');
  const right = await verify.check({ identifier: PHONE, purpose: 'order_confirm', code: '111222' });
  assert.equal(right.valid, true, 'الرمزُ الصحيحُ لغرضه رُفض');
});

test('الرمزُ يُستعمل مرّةً واحدة', async () => {
  await db.createVerification({
    identifier: contract.normalizeIdentifier(PHONE), purpose: 'order_confirm',
    userId: USER_ID, channel: 'whatsapp', code: '333444',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  assert.equal((await verify.check({ identifier: PHONE, purpose: 'order_confirm', code: '333444' })).valid, true);
  const again = await verify.check({ identifier: PHONE, purpose: 'order_confirm', code: '333444' });
  assert.equal(again.valid, false, 'رمزٌ أُعيد استعمالُه');
});

test('المنتهي يُرفَض ويُعلَن سببُه', async () => {
  await db.createVerification({
    identifier: EMAIL, purpose: 'login', userId: USER_ID, channel: 'email', code: '555666',
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });
  const r = await verify.check({ identifier: EMAIL, purpose: 'login', code: '555666' });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'expired', 'انتهاءُ الصلاحيّة يُقرأ «رمزٌ خاطئ» فيُعيد المحاولةَ بلا فائدة');
});

test('**المحاولاتُ معدودة** — رمزٌ من ٦ خاناتٍ يُخمَّن بلا حدّ', async () => {
  const ID = '212612000999';
  await pool.query(`DELETE FROM otp_tokens WHERE identifier=$1`, [ID]);
  await db.createVerification({
    identifier: ID, purpose: 'phone_change', userId: USER_ID, channel: 'sms', code: '999888',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  // **عددٌ ثابتٌ لا `MAX_ATTEMPTS`**: حلقةٌ تتبع الثابتَ تتبع تخريبَه معه،
  // فيمرّ الاختبارُ ولو رُفع السقفُ إلى مئة ألف. (سبرٌ أثبت هذا حرفيًّا.)
  assert.ok(verify.MAX_ATTEMPTS <= 10,
    `سقفُ المحاولات ${verify.MAX_ATTEMPTS} — رمزٌ من ٦ خاناتٍ يُخمَّن عمليًّا`);
  //   ويُلتقَط أوّلُ «too-many»: بعد الإبطال تصير الأسبابُ `none`، فقراءةُ
  //   آخر نتيجةٍ وحدَها تُخفي أنّ السقفَ عمل.
  let hit = null;
  for (let i = 0; i < 10 && !hit; i++) {
    const r = await verify.check({ identifier: ID, purpose: 'phone_change', code: '000000' });
    if (r.reason === 'too-many') hit = r;
  }
  assert.ok(hit, 'التخمينُ مفتوحٌ بلا سقف — عشرُ محاولاتٍ خاطئةٍ ولا إبطال');
  // وبعد الإبطال لا ينفع الرمزُ الصحيحُ نفسُه — وإلّا فالسقفُ زينة.
  const after = await verify.check({ identifier: ID, purpose: 'phone_change', code: '999888' });
  assert.equal(after.valid, false, 'الرمزُ نجا بعد استنفاد المحاولات');
});

test('«0612…» و«+212612…» هويّةٌ واحدة عبر الحلقة كاملةً', async () => {
  const ID = '0612000222';
  await pool.query(`DELETE FROM otp_tokens WHERE identifier=$1`, ['212612000222']);
  await db.createVerification({
    identifier: contract.normalizeIdentifier(ID), purpose: 'order_confirm',
    userId: USER_ID, channel: 'whatsapp', code: '777000',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  const r = await verify.check({ identifier: '+212 612 000 222', purpose: 'order_confirm', code: '777000' });
  assert.equal(r.valid, true, 'نفسُ الرقم بصيغتَين لم يُطابَق — والناسُ يكتبون بالصيغتَين');
});

test('Google يُثبت بلا رمز — ويترك أثرًا في نفس السجلّ', async () => {
  const before = await lastCode(EMAIL, 'login');
  const r = await verify.satisfy({ identifier: EMAIL, purpose: 'login', userId: USER_ID, via: 'google' });
  assert.equal(r.valid, true);
  const row = await pool.query(
    `SELECT channel, used FROM otp_tokens WHERE identifier=$1 AND purpose='login' ORDER BY created_at DESC LIMIT 1`, [EMAIL]);
  assert.equal(row.rows[0]?.channel, 'google', 'التحقّقُ بـGoogle بلا أثرٍ — مسارٌ ثالثٌ صامت');
  assert.equal(row.rows[0]?.used, true, 'أثرُ التحقّق قابلٌ لإعادة الاستعمال');
  assert.notEqual(before, undefined || null);
});
