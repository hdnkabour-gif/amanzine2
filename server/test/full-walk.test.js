'use strict';
// ============================================================
// **المشيُ الكامل** — الطريقُ الذي لم يمشِه أحدٌ قطّ.
//
//   ── لماذا وُلد ──
//   جردُ المستودع قاس أنّ العقلَ مغطًّى بـ٨٩٪ والسطحَ بـ٩٪، وأنّ ١٤٠ ملفًّا
//   و٣٢٬٩٤٠ سطرًا لا يبلغها اختبار. لكنّ الثغرةَ الأخطرَ لم تكن ملفًّا:
//   **لم يمرّ أحدٌ — لا إنسانٌ ولا اختبار — على الطريق كاملًا من أوّله إلى
//   آخره**. كلُّ اختبارٍ يحرس حلقةً، ولا اختبارَ يحرس أنّ الحلقاتِ متّصلة.
//
//       حسابٌ جديد ⟵ منتج ⟵ طلبُ زبونٍ من الواجهة ⟵ التاجرُ يَعلم
//
//   وهذه **أربعُ قفزاتٍ بين أربعةِ جداولَ وثلاثةِ مسارات**. عطبٌ في أيّ
//   وصلةٍ منها لا يظهر في اختبارِ وحدةٍ واحد: كلُّ طرفٍ صحيحٌ وحدَه،
//   والسلسلةُ مقطوعة. وهو بالضبط نمطُ العطب الذي تكرّر في هذا المستودع
//   («طبقةٌ بُنيت ولم تُنادَ»)، لكن على مستوى الرحلة لا الملفّ.
//
//   ── وما يحرسه بالضبط ──
//   ليس صحّةَ كلِّ حقل — ذاك عملُ اختباراتِ الوحدة القائمة. بل **أنّ ما
//   يكتبه طرفٌ يقرؤه الطرفُ التالي**: أنّ المنتجَ الذي أنشأه التاجرُ يجده
//   الزبونُ بثمنِه، وأنّ الطلبَ يُنسَب لصاحبه، وأنّ الثمنَ يُحسَب في الخادم
//   لا يُصدَّق من العميل، وأنّ التاجرَ **يَعلم** — وإلّا فالطلبُ ورقةٌ في درج.
//
//   ── وشرطُ الصدق ──
//   الطلبُ يُنشَأ من `POST /orders/public` — **المسارُ العامُّ نفسُه** الذي
//   تناديه واجهةُ المتجر، بلا رمزِ تاجرٍ في الترويسة. فلو اختُبر بالمسار
//   المحميّ لَمشى الاختبارُ طريقًا لا يمشيه زبونٌ أبدًا.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-full-walk-only-0123456789';

const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const express = require('express');
const { db } = require('../database');
const pool = require('../db');
const verify = require('../lib/verify');
const orderVerification = require('../lib/orderVerification');
const { normalizeIdentifier } = require('../lib/verify/contract');

const EMAIL = 'walk-merchant@test.ma';
const CUST_PHONE = '0611002200';

let server, base, TOKEN = '', MERCHANT = null, PRODUCT = null, ORDER = null;

/** متنُ الطلب — واحدٌ للبابَين، فلا يفترق ما يُوقَف عمّا يُقبَل. */
const ORDER_BODY = () => ({
  userId: MERCHANT.id,
  items: [{ productId: PRODUCT.id, productName: 'سلهام صوف', quantity: 2, price: 340 }],
  customerName: 'زبون المشي', customerPhone: CUST_PHONE,
  city: 'الدار البيضاء', address: 'درب غلف، زنقة ٤',
  source: 'Storefront',
});

const req = async (method, path, body, auth = true) => {
  const r = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth && TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

async function scrub() {
  const u = await db.getUserByEmail(EMAIL).catch(() => null);
  if (!u) return;
  // الترتيبُ يتبع المفاتيحَ الأجنبيّة: الأبناءُ قبل الآباء. وتنظيفٌ ناقصٌ
  //   يجعل الشوطَ الثاني يقرأ صفًّا من الشوط الأوّل ويظنّ الوصلةَ سليمة —
  //   عطبُ اختبارٍ يبدو نجاحَ منتجٍ هو أخطرُ ما في مجموعة.
  await pool.query('DELETE FROM order_events WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [u.id]).catch(() => {});
  await pool.query('DELETE FROM orders WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM customers WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM products WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM store_events WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM settings WHERE user_id = $1', [u.id]).catch(() => {});
  await pool.query('DELETE FROM otp_tokens WHERE identifier = ANY($1)', [[CUST_PHONE, '212611002200']]).catch(() => {});
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
  app.use('/api/verify', require('../routes/verify'));
  app.use('/api/delivery', require('../routes/delivery'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (SKIP) return;
  await scrub();
  await new Promise(r => server.close(r));
  await pool.end().catch(() => {});
});

// ── ① حسابٌ جديد ────────────────────────────────────────────
test('① يفتح تاجرٌ حسابًا — ويخرج منه برمزٍ يعمل', async () => {
  const r = await req('POST', '/auth/register', {
    name: 'مولاي التاجر', email: EMAIL, password: 'walk-pass-123', storeName: 'حانوت المشي',
  }, false);
  assert.ok(r.status === 200 || r.status === 201, `التسجيلُ رجع ${r.status}: ${JSON.stringify(r.body)}`);
  TOKEN = r.body.token || r.body.accessToken || '';
  assert.ok(TOKEN, 'ما رجعش رمزٌ — فالتاجرُ يسجّل ثمّ لا يقدر يدخل');
  MERCHANT = await db.getUserByEmail(EMAIL);
  assert.ok(MERCHANT?.id, 'الحسابُ ما تكتبش فقاعدة البيانات');
});

// ── ①ب الدخول — الحلقةُ التي لا يمرّ منها إلّا العائد ─────────
test('①ب ويرجع بعد يوم فيدخل بنفس ما سجّل به', async () => {
  // **حلقةٌ لا تُختبَر عادةً لأنّها تبدو بديهيّة** — والتسجيلُ يُرجع رمزًا
  //   فيُظَنّ البابُ مفتوحًا. لكنّ الإنسانَ يُغلق المتصفّحَ ويعود غدًا:
  //   إن لم يعمل الدخولُ فكلُّ ما بناه محبوسٌ خلف بابٍ فتحه مرّةً واحدة.
  const r = await req('POST', '/auth/login',
    { email: EMAIL, password: 'walk-pass-123' }, false);
  assert.ok(r.status === 200 || r.status === 201, `الدخولُ رجع ${r.status}: ${JSON.stringify(r.body)}`);
  const t = r.body.token || r.body.accessToken || '';
  assert.ok(t, 'دخل بلا رمز — فما يقدر يدير والو من بعد');
  // والرمزُ الجديدُ يفتح بابًا محميًّا فعلًا، لا يُصدَّق لأنّه رجع.
  const prev = TOKEN; TOKEN = t;
  const mine = await req('GET', '/orders');
  assert.equal(mine.status, 200, `رمزُ الدخول ما فتحش بابًا محميًّا (${mine.status})`);
  TOKEN = prev || t;
});

// ── ② منتج ──────────────────────────────────────────────────
test('② يزيد منتجًا — ويُكتَب بثمنه وصاحبِه', async () => {
  const r = await req('POST', '/products', {
    name: 'سلهام صوف', price: 340, stock: 5, status: 'published', city: 'الدار البيضاء',
  });
  assert.ok(r.status === 200 || r.status === 201, `إضافةُ المنتج رجعت ${r.status}: ${JSON.stringify(r.body)}`);
  PRODUCT = r.body.product || r.body;
  assert.ok(PRODUCT?.id, 'المنتجُ ما رجعش بمُعرِّف');
  // **والقراءةُ من القاعدة لا من الجواب.** جوابُ المسار قد يعكس ما أُرسل
  //   بلا أن يُكتَب شيء — وهو عطبٌ وقع في هذا المستودع من قبل.
  const saved = await db.getProduct(PRODUCT.id);
  assert.equal(saved.userId, MERCHANT.id, 'المنتجُ ما تنسبش لصاحبه');
  assert.equal(+saved.price, 340, 'الثمنُ ما تكتبش كما أُدخل');
});

// ── ③ بابُ التحقّق: عالمان، لا عالمٌ واحد ───────────────────
//
//   أوّلُ مشيٍ كاملٍ للطريق كشف أنّ العالمَ الافتراضيَّ **مسدود**: النمرةُ
//   لها قناتان لا غير (SMS بمفتاحِ منصّةٍ · واتساب بتوكنِ التاجر)، وحسابٌ
//   جديدٌ لا يملك أيًّا منهما. فيُطلَب التأكيدُ ولا يُسلَّم الرمزُ أبدًا —
//   **ولا زبونَ واحدٍ يقدر يتمّم طلبًا عند أيّ تاجرٍ جديد**.
//
//   والعالمان يُحرَسان معًا، لأنّ إصلاحَ أحدهما يكسر الآخرَ بصمت.

test('③ **بلا قناةٍ: البابُ يُفتَح ويُقال ذلك للتاجر** — لا حائطٌ صامت', async () => {
  const vp = await orderVerification.needsVerification({
    userId: MERCHANT.id, phone: CUST_PHONE, settings: {},
  });
  assert.equal(vp.required, false, 'التأكيدُ مطلوبٌ وما كايناش قناة — بوّابةٌ بلا مفتاح');
  assert.equal(vp.undeliverable, true, 'السقوطُ ما تعلنش — التاجرُ يظنّ نفسَه محميًّا وهو مكشوف');
  assert.match(vp.reason, /قناة/, 'السببُ ما كيقولش شنو خاصّو يدير');
});

test('④ **وبقناةٍ: البابُ يُقفَل ويُفتَح برمز** — الحمايةُ ترجع بلا أيّ خطوةٍ أخرى', async () => {
  // إعدادٌ حقيقيٌّ لا تجاوز: توكنُ واتساب هو ما يربطه التاجرُ بنفسه.
  const withChannel = { social: { whatsapp: { accessToken: 'walk-token', pageId: '1234567890' } } };
  const vp = await orderVerification.needsVerification({
    userId: MERCHANT.id, phone: CUST_PHONE, settings: withChannel,
  });
  assert.equal(vp.required, true, 'ربطُ القناة ما رجّعش الحمايةَ — التخفيفُ صار دائمًا');
  assert.ok(!vp.undeliverable, 'أُعلن العجزُ وفيه قناة');

  // والرمزُ يُفحَص بالدالّة الحقيقيّة على الجدول الحقيقيّ — يُكتَب مباشرةً
  //   لأنّ **التسليمَ** وحدَه هو ما يحتاج شبكةً، وهو ليس ما نحرسه هنا.
  //   **والهويّةُ تُخزَّن مُطبَّعةً**: «0611…» ⇒ «212611…». وأوّلُ صيغةٍ لهذا
  //   الاختبار كتبت الخامَّ وقرأت المُطبَّعَ فرجع `none` — وكِدتُ أُعلنها
  //   عطبًا في التطبيق. الخللُ كان في المِسبار، والقاعدةُ أنّ **أداةَ القياس
  //   تُقاس أوّلًا**.
  const CANON = normalizeIdentifier(CUST_PHONE);
  assert.equal(CANON, '212611002200', 'تغيّر تطبيعُ الهويّة — الاختبارُ يقيس صيغةً ماضية');

  const code = '424242';
  await db.invalidateVerifications(CANON, 'order_confirm').catch(() => {});
  await db.createVerification({
    identifier: CANON, purpose: 'order_confirm', userId: MERCHANT.id,
    channel: 'whatsapp', code, expiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
  });
  const bad = await verify.check({ identifier: CUST_PHONE, purpose: 'order_confirm', code: '000000' });
  assert.equal(bad.valid, false, 'رمزٌ خاطئٌ تقبل — البابُ مفتوحٌ لأيّ رقم');
  const ok = await verify.check({ identifier: CUST_PHONE, purpose: 'order_confirm', code });
  assert.equal(ok.valid, true, `الرمزُ الصحيحُ ما تقبلش: ${JSON.stringify(ok)}`);
  assert.equal(await verify.isVerified({ identifier: CUST_PHONE, purpose: 'order_confirm' }), true,
    'الفحصُ نجح وما تسجّلش — فالطلبُ غادي يتوقّف مرّةً أخرى');
});

// ── ⑤ طلبُ زبون — من الباب العامّ ────────────────────────────
test('⑤ يطلب زبونٌ من الواجهة — بلا حساب، وبالمسار العامّ نفسِه', async () => {
  const r = await req('POST', '/orders/public', {
    userId: MERCHANT.id,
    items: [{ productId: PRODUCT.id, productName: 'سلهام صوف', quantity: 2, price: 340 }],
    customerName: 'زبون المشي', customerPhone: CUST_PHONE,
    city: 'الدار البيضاء', address: 'درب غلف، زنقة ٤',
    source: 'Storefront',
  }, false);   // ← بلا رمز: هذا ما يفعله زبونٌ حقيقيّ
  assert.equal(r.status === 200 || r.status === 201, true,
    `الطلبُ العامُّ رجع ${r.status}: ${JSON.stringify(r.body)}`);
  ORDER = r.body.order || r.body;
  assert.ok(ORDER?.id, 'الطلبُ ما رجعش بمُعرِّف');
});

// ── ④ الوصلاتُ بين الطرفَين ─────────────────────────────────
test('⑥ الطلبُ يصل التاجرَ — منسوبًا، وبثمنٍ حسبه الخادم', async () => {
  const saved = await db.getOrder(ORDER.id);
  assert.ok(saved, 'الطلبُ ما تكتبش فقاعدة البيانات');
  assert.equal(saved.userId, MERCHANT.id, 'الطلبُ ما وصلش صاحبَ المنتج');

  // **والثمنُ يُحسَب في الخادم لا يُصدَّق من العميل.** ٢ × ٣٤٠ = ٦٨٠ على
  //   الأقلّ؛ وما زاد توصيلٌ يحسبه الخادمُ بنفسه. والقيدُ الحقيقيُّ أنّ
  //   المجموعَ **لا يقلّ** عن ثمن السلع: لو قلّ لكان العميلُ قد أملى الثمن.
  assert.ok(+saved.total >= 680, `المجموعُ ${saved.total} أقلُّ من ثمن السلع — العميلُ أملى الثمن`);

  // وقائمةُ الطلبات التي يفتحها التاجرُ تُظهره — لا تُظهره لغيره.
  const mine = await req('GET', '/orders');
  assert.equal(mine.status, 200, `قائمةُ الطلبات رجعت ${mine.status}`);
  const list = Array.isArray(mine.body) ? mine.body : (mine.body.orders || []);
  assert.ok(list.some(o => o.id === ORDER.id), 'التاجرُ ما كيشوفش الطلبَ فقائمتِه');
});

test('⑦ والتاجرُ **يَعلم** — وإلّا فالطلبُ ورقةٌ في درج', async () => {
  // آخرُ الوصلات وأهمُّها: طلبٌ يصل قاعدةَ البيانات ولا يبلغ صاحبَه هو
  //   طلبٌ ضائع. والزبونُ ينتظر، والتاجرُ لا يعرف — ويخسر الاثنان.
  //
  //   والقناةُ لا تُفرَض: قد تكون سجلًّا أو إشعارًا أو حدثَ متجر. المهمُّ
  //   أن يبقى **أثرٌ يبلغه** بعد إغلاق كلّ شيء.
  const q = async (sql) => (await pool.query(sql, [MERCHANT.id])).rows;
  const [notifs, events, logs] = await Promise.all([
    q('SELECT 1 FROM notifications WHERE user_id = $1 LIMIT 5').catch(() => []),
    q("SELECT 1 FROM store_events WHERE user_id = $1 AND type = 'order.created' LIMIT 5").catch(() => []),
    q('SELECT 1 FROM audit_logs WHERE user_id = $1 LIMIT 5').catch(() => []),
  ]);
  const reached = notifs.length + events.length + logs.length;
  assert.ok(reached > 0,
    'الطلبُ تسجّل وما وصل التاجرَ بأيّ قناة — لا إشعارٌ ولا حدثٌ ولا سجلّ');
});

// ── ⑧ الشحن — آخرُ حلقةٍ في الطريق ──────────────────────────
//
//   الطلبُ الذي لا يُشحَن ورقةٌ ثانية. والحلقةُ هنا **حدُّها صادقٌ عمدًا**:
//   لا شركةَ توصيلٍ مربوطةٌ في حسابٍ جديد، فلا شحنةَ تُنشَأ. والمطلوبُ أن
//   يُقال ذلك بوضوحٍ لا أن يسقط الخادمُ بـ٥٠٠ أو يصمت.
//
//   ومَن اختبر الشحنَ بشركةٍ وهميّةٍ اختبر شيئًا لا يقع؛ والقيمةُ هنا في
//   **جوابِ العجز**: أوّلُ ما سيصطدم به تاجرٌ حقيقيٌّ يوم يوافق على طلب.
test('⑧ بلا شركةِ توصيلٍ: العجزُ يُقال ولا يسقط الخادم', async () => {
  const r = await req('POST', `/delivery/create/${ORDER.id}`, {});
  assert.notEqual(r.status, 500, `الخادمُ سقط بدل ما يقول العجز: ${JSON.stringify(r.body)}`);
  assert.ok(r.status >= 400 && r.status < 500,
    `رجع ${r.status} — ولا شركةَ مربوطة، فالجوابُ خاصّو يكون رفضًا مفهومًا`);
  const msg = String(r.body?.error || r.body?.message || '');
  assert.ok(msg.length > 3, 'رفضٌ بلا سبب — التاجرُ ما كيعرفش شنو خاصّو يدير');
});

test('⑨ والطلبُ يبقى سليمًا بعد محاولةِ شحنٍ فاشلة', async () => {
  // **فشلٌ لا يُفسد ما قبله.** محاولةٌ ساقطةٌ تترك الطلبَ كما كان — وإلّا
  //   خسر التاجرُ الطلبَ لأنّه حاول شحنَه قبل أن يربط شركة.
  const saved = await db.getOrder(ORDER.id);
  assert.ok(saved, 'الطلبُ اختفى بعد محاولةِ الشحن');
  assert.equal(saved.userId, MERCHANT.id, 'الطلبُ تبدّلت نسبتُه');
  assert.ok(+saved.total >= 680, 'المجموعُ تبدّل بعد محاولةٍ فاشلة');
});
