'use strict';
// ============================================================
// تأكيدُ نمرة الزبون — **حيث تقع الخسارة، لا في كلّ مكان**.
//
//   المعضلةُ كما طُرحت: «التحقّقُ يقلّل الطلباتِ الوهميّةَ ويقلّل الحقيقيّةَ
//   معها». وهي كاذبةٌ لأنّها تفترض الاختيارَ بين تأكيد الكلّ وتأكيد لا أحد.
//
//   الاقتصادُ الحقيقيّ: الدفعُ عند الاستلام. فالطلبُ الوهميُّ لا يُخسِر
//   التاجرَ سلعةً بل **ثمنَ توصيلٍ حقيقيّ** لطردٍ يُرفَض عند الباب. وهذه
//   الخسارةُ تقع كلُّها في الطلب الأوّل من نمرةٍ مجهولة.
//
//   والقاعدةُ التي تحسم: «لا يسأل التطبيقُ سؤالًا يعرف جوابَه». زبونٌ وصلَه
//   طردٌ من قبلُ أثبت نمرتَه بالتسليم نفسِه.
//
//   وأخطرُ ما يُختبَر هنا: **ألّا يُصدَّق العميلُ في قوله «تأكّدتُ»**.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-order-verification-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

const ov = require('../lib/orderVerification');

// ── **قناةٌ مربوطة — شرطُ أن تكون السياسةُ هي المُختبَرة** ────────────
//
//   قِيس بأوّل مشيٍ كاملٍ للطريق أنّ التأكيدَ كان **بوّابةً بلا مفتاح**:
//   يُطلَب من كلّ زبونٍ لكلّ تاجرٍ جديد، ولا قناةَ تُسلّم الرمزَ، فلا طلبَ
//   واحدًا يمرّ. فصار `needsVerification` يفحص إمكانَ التسليم أوّلًا.
//
//   ولذلك تُمرَّر هنا قناةٌ مربوطة: بدونها يُقاس **الشرطُ** لا **السياسة**،
//   ويصير كلُّ اختبارٍ أدناه يُثبت الشيءَ نفسَه ولا يميّز `off` من `always`.
//   والشرطُ نفسُه له اختبارُه الخاصُّ في آخر الملفّ.
const CH = { social: { whatsapp: { accessToken: 'tok-test', pageId: '1234567890' } } };
/** يدمج القناةَ مع إعدادِ سياسةٍ — فلا تُنسى في نداءٍ فيفترق معناه. */
const withCh = (extra = {}) => ({ ...CH, ...extra });

// ── السياسةُ نفسُها، بلا قاعدة ──────────────────────────────────
rawTest('الأوضاعُ الثلاثةُ مُعلَنةٌ والافتراضيُّ «أوّلَ مرّة»', () => {
  assert.deepEqual(ov.MODES, ['off', 'first', 'always']);
  assert.equal(ov.DEFAULT_MODE, 'first',
    'الافتراضيُّ تغيّر — وهو القرارُ الذي يوازن الحمايةَ بالتحويل');
});

// ── وعلى قاعدةٍ حقيقيّة ─────────────────────────────────────────
let pool, db, verify, USER_ID;
const NEW_PHONE = '0655000111';       // لم يصله شيءٌ قطّ
const KNOWN_PHONE = '0655000222';     // وصله طردٌ من قبل

before(async () => {
  if (SKIP) return;
  db = require('../database').db;
  pool = require('../db');
  verify = require('../lib/verify');
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('ordverify@test.ma')
    || await db.createUser({ name: 'O', email: 'ordverify@test.ma', password: bcrypt.hashSync('x', 4), role: 'user' });
  USER_ID = u.id;
  await pool.query(`DELETE FROM orders WHERE user_id = $1 AND id LIKE 'ov-%'`, [USER_ID]);
  await pool.query(`DELETE FROM otp_tokens WHERE identifier IN ('212655000111','212655000222')`);
  // زبونٌ وصلَه طردٌ فعلًا — هذا هو البرهانُ الذي يُغني عن السؤال.
  await pool.query(
    `INSERT INTO orders (id, user_id, customer_name, customer_phone, city, address, items, total, status)
     VALUES ('ov-delivered', $1, 'ز', $2, 'الرباط', 'ع', '[]', 100, 'delivered')
     ON CONFLICT (id) DO UPDATE SET status = 'delivered', customer_phone = $2`,
    [USER_ID, KNOWN_PHONE]);
});
after(async () => { if (SKIP) return; await pool.end?.(); });

test('أوّلُ طلبٍ من نمرةٍ مجهولة ⇒ يُطلَب التأكيد', async () => {
  const r = await ov.needsVerification({ userId: USER_ID, phone: NEW_PHONE, settings: withCh() });
  assert.equal(r.required, true);
  assert.match(r.reason, /أوّل/, 'قرارٌ بلا سببٍ ظاهرٍ يبدو تعسّفًا');
});

test('**زبونٌ وصلَه طردٌ لا يُسأل** — يعرف ثمّ يسأل هو موتُ السحر', async () => {
  const r = await ov.needsVerification({ userId: USER_ID, phone: KNOWN_PHONE, settings: withCh() });
  assert.equal(r.required, false, 'سُئل زبونٌ عائدٌ أثبت نمرتَه بالتسليم نفسِه');
});

test('والنمرةُ تُطابَق بآخر تسع خانات — «0655…» و«+212655…» واحدة', async () => {
  const r = await ov.needsVerification({ userId: USER_ID, phone: '+212 655 000 222', settings: withCh() });
  assert.equal(r.required, false, 'نفسُ الزبون بصيغةٍ دوليّةٍ عُومل مجهولًا');
});

test('«ديما» تسأل حتّى العائد · و«بلا تأكيد» لا تسأل أحدًا', async () => {
  const always = await ov.needsVerification({ userId: USER_ID, phone: KNOWN_PHONE, settings: withCh({ security: { verifyOrders: 'always' } }) });
  assert.equal(always.required, true);
  const off = await ov.needsVerification({ userId: USER_ID, phone: NEW_PHONE, settings: withCh({ security: { verifyOrders: 'off' } }) });
  assert.equal(off.required, false);
});

test('قيمةٌ مجهولةٌ للإعداد تسلك مسلكَ الافتراضيّ بالضبط — لا `off` ولا `always`', () => {
  // اختبارُ «required === true للمجهول» لا يميّز شيئًا: كلُّ الأوضاع عدا
  // `off` تسأل المجهول. التمييزُ في **العائد**: `always` تسأله و`first` لا.
  // فإن سلك التالفُ مسلكَ `first` فقد سقط على الافتراضيّ فعلًا.
  //   ويلزم **الاتّجاهان معًا** كي يُثبَّت الوضعُ على `first` وحدَه:
  //   العائدُ لا يُسأل (⇒ ليست `always`)، والمجهولُ يُسأل (⇒ ليست `off`).
  //   قياسُ أحدهما وحدَه لا يميّز — وسبرٌ مرّ لهذا السبب بالذات.
  const cfg = withCh({ security: { verifyOrders: 'nonsense' } });
  return Promise.all([
    ov.needsVerification({ userId: USER_ID, phone: KNOWN_PHONE, settings: cfg }),
    ov.needsVerification({ userId: USER_ID, phone: NEW_PHONE, settings: cfg }),
  ]).then(([known, unknown]) => {
    assert.equal(known.required, false, 'إعدادٌ تالفٌ سلك مسلكَ «ديما» — يُسأل عائدٌ بلا سبب');
    assert.equal(unknown.required, true, '**إعدادٌ تالفٌ سلك مسلكَ «بلا تأكيد» — عُطّلت الحمايةُ بقيمةٍ خاطئة**');
  });
});

test('والفشلُ يُغلَق آمنًا — عطبُ قاعدةٍ لا يفتح البابَ لطلباتٍ وهميّة', async () => {
  const real = db.hasDeliveredOrderFromPhone;
  db.hasDeliveredOrderFromPhone = async () => { throw new Error('قاعدةٌ ساقطة'); };
  try {
    const r = await ov.needsVerification({ userId: USER_ID, phone: KNOWN_PHONE, settings: withCh() });
    assert.equal(r.required, true,
      '**تعذّرت القراءةُ فمرّ الطلبُ بلا تأكيد** — عطبٌ عندنا يصير بابًا للمهاجم');
  } finally { db.hasDeliveredOrderFromPhone = real; }
});

test('**البرهانُ من القاعدة لا من الطلب** — لا يُصدَّق العميل', async () => {
  // من أراد إغراقَ تاجرٍ بطلباتٍ وهميّةٍ يرسل أيَّ حقلٍ يشاء في الجسم.
  const before = await verify.isVerified({ identifier: NEW_PHONE, purpose: 'order_confirm' });
  assert.equal(before, false, 'نمرةٌ لم تتأكّد تُقرأ متأكّدة');

  await db.createVerification({
    identifier: '212655000111', purpose: 'order_confirm', userId: null,
    channel: 'whatsapp', code: '424242',
    expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  // مجرّدُ **طلبِ** رمزٍ ليس تحقّقًا — لا بدّ من إدخاله.
  assert.equal(await verify.isVerified({ identifier: NEW_PHONE, purpose: 'order_confirm' }), false,
    'طلبُ الرمز وحدَه عُدَّ تحقّقًا — يكفي أن يضغط المهاجمُ «صيفط»');

  const ok = await verify.check({ identifier: NEW_PHONE, purpose: 'order_confirm', code: '424242' });
  assert.equal(ok.valid, true);
  assert.equal(await verify.isVerified({ identifier: NEW_PHONE, purpose: 'order_confirm' }), true,
    'تأكّدت النمرةُ ولم يُسجَّل البرهان — سيُطلَب التأكيدُ إلى الأبد');
});

test('ورمزُ غرضٍ آخرَ لا يفتح الطلبات', async () => {
  await pool.query(`DELETE FROM otp_tokens WHERE identifier = '212655000333'`);
  await db.createVerification({
    identifier: '212655000333', purpose: 'phone_change', userId: USER_ID,
    channel: 'sms', code: '515151', expiresAt: new Date(Date.now() + 300000).toISOString(),
  });
  await verify.check({ identifier: '0655000333', purpose: 'phone_change', code: '515151' });
  assert.equal(await verify.isVerified({ identifier: '0655000333', purpose: 'order_confirm' }), false,
    'تحقّقُ تبديلِ نمرةٍ قُبل تأكيدًا لطلب — الغرضُ ليس جزءًا من المفتاح');
});

test('والبرهانُ يشيخ — تحقّقٌ قديمٌ لا يفتح طلباتٍ إلى الأبد', async () => {
  assert.equal(
    await verify.isVerified({ identifier: NEW_PHONE, purpose: 'order_confirm', withinMs: 1 }), false,
    'تحقّقٌ مضى عليه الدهرُ ما زال يُقبَل');
});

// ── والمسارُ نفسُه: أيسأل الخادمُ قبل أن يقبل؟ ──────────────────
rawTest('مسارُ الطلب العامّ يستشير السياسةَ ويقرأ البرهانَ من القاعدة', () => {
  const src = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'routes', 'orders.js'), 'utf8');
  assert.match(src, /orderVerification\.needsVerification/, 'المسارُ لا يسأل السياسةَ أصلًا');
  assert.match(src, /verify\.isVerified/, 'المسارُ لا يقرأ البرهان');
  assert.match(src, /status\(428\)/,
    'الردُّ ليس 428 — ستعرضه الواجهةُ خطأً فيظنّ الزبونُ أنّ الطلبَ فشل');
  // ولا يُقرأ حقلٌ من الجسم اسمُه verified: ذاك تصديقٌ للعميل.
  assert.ok(!/req\.body[^\n]*\bverified\b/.test(src),
    'المسارُ يقرأ «تأكّدتُ» من جسم الطلب — بابٌ مفتوحٌ لمن يشاء');
});

// ── **والبوّابةُ التي لا مفتاحَ لها ليست بوّابة، هي حائط** ────────────
//
//   قِيس بأوّل مشيٍ كاملٍ للطريق — حسابٌ جديد ⟵ منتج ⟵ طلبُ زبون:
//   النمرةُ لها قناتان لا غير (SMS بمفتاحِ منصّةٍ · واتساب بتوكنِ التاجر)،
//   وحسابٌ جديدٌ لا يملك أيًّا منهما. فيُطلَب التأكيدُ ويُطلَب الرمزُ فيرجع
//   `no-channel` — **ولا زبونَ واحدٍ يقدر يتمّم طلبًا عند أيّ تاجرٍ جديد**.
//
//   ولم يظهر هذا في اختبارِ وحدةٍ واحد، لأنّ كلَّ طرفٍ صحيحٌ وحدَه: السياسةُ
//   تقرّر صوابًا، والقناةُ تُعلن عجزَها صدقًا، والسلسلةُ مقطوعة.
test('بلا قناةٍ لا يُطلَب تأكيدٌ — والتخفيفُ يُعلَن ولا يُصمَت عنه', async () => {
  const r = await ov.needsVerification({ userId: USER_ID, phone: NEW_PHONE, settings: {} });
  assert.equal(r.required, false,
    'يُطلَب تأكيدٌ لا سبيلَ لتسليمه — كلُّ زبناء التاجر الجديد يُوقَفون بلا مخرج');
  assert.equal(r.undeliverable, true,
    'سقطت الحمايةُ بصمت — التاجرُ يظنّ نفسَه محميًّا وهو مكشوف');
  assert.match(r.reason, /قناة/, 'السببُ ما كيقولش شنو خاصّو يدير باش ترجع');
});

test('و«ديما» نفسُها لا تتجاوز غيابَ القناة — لا استثناءَ يفتح الحائط', async () => {
  const r = await ov.needsVerification({
    userId: USER_ID, phone: NEW_PHONE, settings: { security: { verifyOrders: 'always' } },
  });
  assert.equal(r.required, false, '«ديما» سبقت فحصَ القناة — فرجع الحائطُ لمن اختارها');
  assert.equal(r.undeliverable, true);
});

test('وربطُ القناةِ وحدَه يُرجع الحمايةَ — بلا أيّ خطوةٍ أخرى', async () => {
  const r = await ov.needsVerification({ userId: USER_ID, phone: NEW_PHONE, settings: CH });
  assert.equal(r.required, true, 'رُبطت قناةٌ وما رجعتش الحماية — التخفيفُ صار دائمًا');
  assert.ok(!r.undeliverable, 'أُعلن العجزُ وفيه قناة');
});
