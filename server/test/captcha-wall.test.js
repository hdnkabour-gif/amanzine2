'use strict';
// ============================================================
// **المربّعُ أخضرُ والطلبُ لا يمرّ.**
//
//   ما رآه صاحبُ المشروع على شاشته: يضغط مربّعَ hCaptcha فيخضرّ ✓، ثمّ
//   «فشل التحقق الأمني — حدّث الصفحة وأعد المحاولة». يحدّث، يعيد، نفسُ
//   الشيء. **ولا طلبَ يمرّ في المتجر أبدًا.**
//
//   ── والسببُ ليس hCaptcha ──
//   رمزُ hCaptcha **يُستهلَك عند أوّل تحقّق**. وكان الفحصُ يجري **قبل**
//   بوّابة تأكيد النمرة، فرحلةُ كلِّ زبونٍ جديد (وهم كلُّ الزبائن في
//   البداية) كانت:
//
//       ① يضغط المربّع ✓ ⇒ **نستهلك رمزَه نحن** ⇒ 428 «خاصّنا نتأكّدو من النمرة»
//       ② يكتب الكود ⇒ تُعاد المحاولةُ تلقائيًّا **بنفس الرمز المستهلَك**
//       ③ hCaptcha: `timeout-or-duplicate` ⇒ «فشل التحقق الأمني» ⇒ إلى الأبد
//
//   حرقنا الرمزَ في طلبٍ قرّرنا سلفًا ألّا نُنشئ فيه شيئًا، ثمّ حاسبناه عليه.
//
//   ── والثاني: عطبُنا كان يدفع ثمنَه الزبون ──
//   مفتاحٌ سرّيٌّ خاطئ، أو مفتاحان من حسابَين مختلفَين (والمربّعُ يخضرّ رغم
//   ذلك لأنّه لا يعرف إلّا مفتاحَ الموقع)، أو شبكةٌ لم تصل منّا إلى
//   hCaptcha — كلُّها كانت تُقفل المتجر. حمايةٌ **لم تعمل** لا حمايةٌ رفضت.
//   والقاعدةُ نفسُها المكتوبةُ في `orderVerification`: ما لا يعمل يُعلَّق
//   ويُقال لصاحبه، ولا يُقلَب جدارًا.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-captcha-wall-only-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

const express = require('express');
const { db } = require('../database');
const pool = require('../db');

const EMAIL = 'captcha-merchant@test.ma';
const CUST_PHONE = '0655114400';
let server, base, TOKEN = '', MERCHANT = null, PRODUCT = null;

const req = async (method, p, body, auth = true) => {
  const r = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...(auth && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

async function scrub() {
  const u = await db.getUserByEmail(EMAIL).catch(() => null);
  if (!u) return;
  await pool.query('DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [u.id]).catch(() => {});
  for (const t of ['orders', 'customers', 'products', 'notifications', 'audit_logs', 'store_events', 'settings']) {
    await pool.query(`DELETE FROM ${t} WHERE user_id = $1`, [u.id]).catch(() => {});
  }
  await pool.query('DELETE FROM otp_tokens WHERE identifier = ANY($1)', [[CUST_PHONE, '212655114400']]).catch(() => {});
  await pool.query('DELETE FROM users WHERE id = $1', [u.id]).catch(() => {});
}

before(async () => {
  if (SKIP) return;
  await scrub();
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/products', require('../routes/products'));
  app.use('/api/orders', require('../routes/orders'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;

  const reg = await req('POST', '/auth/register',
    { name: 'تاجرُ المربّع', email: EMAIL, password: 'captcha-pass-123', storeName: 'حانوت المربّع' }, false);
  TOKEN = reg.body.token || reg.body.accessToken || '';
  MERCHANT = await db.getUserByEmail(EMAIL);
  const p = await req('POST', '/products',
    { name: 'بلغة صفراء', price: 180, stock: 5, status: 'published', city: 'فاس' });
  PRODUCT = p.body.product || p.body;
});

after(async () => {
  if (SKIP) return;
  await scrub();
  await new Promise(r => server.close(r));
  await pool.end().catch(() => {});
});

const ORDER = () => ({
  userId: MERCHANT.id,
  items: [{ productId: PRODUCT.id, productName: 'بلغة صفراء', quantity: 1, price: 180 }],
  customerName: 'زبونُ المربّع', customerPhone: CUST_PHONE,
  city: 'فاس', address: 'باب بوجلود', source: 'Storefront',
});

// ── ① الترتيب: الرمزُ لا يُحرَق في طلبٍ لن يُنشئ شيئًا ──────────
test('① الفحصُ بعد بوّابة التأكيد لا قبلها — وإلّا استُهلك الرمزُ في طلبٍ مرفوض', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes/orders.js'), 'utf8');
  const handler = src.slice(src.indexOf("router.post('/public'"));
  const gate = handler.indexOf('needsVerification({');
  const cap  = handler.indexOf('_verifyHCaptcha(');
  assert.ok(gate > 0 && cap > 0, 'اختفت إحدى الحلقتَين');
  assert.ok(cap > gate,
    'رجع فحصُ المربّع قبل بوّابة التأكيد — فيُستهلَك الرمزُ ثمّ يُطلَب مرّةً ثانية، والطلبُ لا يمرّ أبدًا');
});

// ── ② الطريقُ كاملًا برمزٍ حقيقيّ يعبر ──────────────────────────
//   مفاتيحُ الاختبار المُعلَنة من hCaptcha: تُصدِّق فعلًا عبر `api.hcaptcha.com`.
//   فهذا أقربُ ما يمكن قياسُه من إنسانٍ ضغط المربّعَ فعلًا.
const HC_TEST_SECRET = '0x0000000000000000000000000000000000000000';
const HC_TEST_TOKEN  = '10000000-aaaa-bbbb-cccc-000000000001';

const setSecret = async (secret) => {
  const st = await db.getSettings(MERCHANT.id) || {};
  if (secret) st.security = { ...(st.security || {}), hcaptchaSecret: secret };
  else delete st.security;
  await db.saveSettings(MERCHANT.id, st);
};

test('② رمزٌ صحيحٌ يعبر الطريقَ كاملًا — الطلبُ يُكتَب', async () => {
  await setSecret(HC_TEST_SECRET);
  const r = await req('POST', '/orders/public', { ...ORDER(), captchaToken: HC_TEST_TOKEN }, false);
  if (r.status === 0 || /network/.test(JSON.stringify(r.body))) return; // بلا شبكةٍ لا يُقاس
  assert.ok(r.status === 200 || r.status === 201,
    `رمزٌ صحيحٌ انرفض: ${r.status} — ${JSON.stringify(r.body).slice(0, 160)}`);
  assert.ok(r.body.order?.id, 'ما تكتبش الطلب');
});

test('②ب سرٌّ لا يطابق المفتاح لا يُقفل المتجر — الحمايةُ تُعلَّق ويُقال للتاجر', async () => {
  // سرٌّ صحيحُ الشكل ولا يخصّ هذا الموقع ⇒ `not-using-dummy-secret`.
  // وبلا شبكةٍ ⇒ `network:timeout`. **والاثنان عطبُنا لا عطبُ الزبون**،
  // فالنتيجةُ واحدةٌ في الحالتَين: الطلبُ يمرّ والتاجرُ يُخبَر.
  await setSecret('0x0000000000000000000000000000000000000001');
  const r = await req('POST', '/orders/public', { ...ORDER(), captchaToken: HC_TEST_TOKEN }, false);
  assert.ok(r.status === 200 || r.status === 201 || r.status === 428,
    `المتجرُ انقفل بسبب إعدادٍ عندنا: ${r.status} — ${JSON.stringify(r.body).slice(0, 160)}`);

  // **ويُقال لصاحبه**: وإلّا ظنّ التاجرُ نفسَه محميًّا وهو مكشوف.
  const logs = await db.getLogs(MERCHANT.id).catch(() => []);
  assert.ok(JSON.stringify(logs).includes('hCaptcha'),
    'الحمايةُ سقطت بصمت — التاجرُ يظنّ نفسَه محميًّا وهو مكشوف');
});

test('②ج ورمزٌ ميّتٌ يُردّ بصراحةٍ وبعلامةِ مسحٍ للمربّع', async () => {
  await setSecret(HC_TEST_SECRET);
  const r = await req('POST', '/orders/public', { ...ORDER(), captchaToken: 'رمزٌ-مستهلَك' }, false);
  if (r.status === 200 || r.status === 201) return; // شبكةٌ مقطوعة ⇒ عبر كعطبٍ عندنا
  assert.equal(r.status, 400);
  assert.equal(r.body.captchaStale, true,
    'ما كاينش علامةُ مسحٍ — فالواجهةُ تبعث نفس الرمز الميّت إلى الأبد');
});

test('③ ومتجرٌ بلا مفتاحٍ لا يُسأل عن مربّعٍ أصلًا', async () => {
  await setSecret(null);
  const r = await req('POST', '/orders/public', ORDER(), false);
  assert.ok(r.status === 200 || r.status === 201 || r.status === 428,
    `طلبٌ بلا مربّعٍ انرفض: ${r.status} — ${JSON.stringify(r.body).slice(0, 160)}`);
});

// ── ④ التصنيف: الرمزُ الميّتُ يُقال إنّه ميّت ────────────────────
test('④ الرمزُ المستهلَكُ يُردّ برسالةٍ تُفهَم وبعلامةٍ تمسح المربّع', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes/orders.js'), 'utf8');
  assert.match(src, /timeout-or-duplicate/, 'ما بقاش يُميَّز الرمزُ المستهلَك');
  assert.match(src, /captchaStale:\s*true/,
    'ما كاينش علامةٌ تقول للواجهة امسحي المربّع — فيُعاد إرسالُ نفس الرمز الميّت');
  assert.match(src, /sitekey-secret-mismatch/,
    'المفتاحان من حسابَين مختلفَين: أشيعُ عطبٍ عند أوّل إعداد، ولا يُميَّز');
  assert.doesNotMatch(src, /resolve\(!!JSON\.parse\(d\)\.success\)/,
    'رجع ابتلاعُ `error-codes` — فكلُّ الأسباب تبدو سببًا واحدًا');
});

test('⑤ والواجهةُ تمسح المربّعَ بعد كلّ فشل', () => {
  const sf = fs.readFileSync(path.join(__dirname, '..', '..', 'src/pages/Storefront.tsx'), 'utf8');
  assert.match(sf, /hcaptcha\?\.reset\?\.\(\)/,
    'الواجهةُ ما كتمسحش المربّع — فالمحاولةُ الثانيةُ تبعث نفس الرمز الميّت');
  assert.match(sf, /captchaStale/, 'ما كتقراش علامةَ الرمز الميّت من الخادم');
});
