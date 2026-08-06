'use strict';
// ============================================================
// الأداءات — **بابٌ يُفتَح، وثغرةٌ تُغلَق قبل أن يُفتَح**.
//
//   طبقةُ الدفع كاملةٌ كانت تعمل على الخادم بلا مُنادٍ واحدٍ في `src/`:
//   تُنشَأ الدفعاتُ ولا تُقرَأ، والفهرسُ `idx_payments_user` مبنيٌّ منذ
//   الهجرة الأولى لاستعلامٍ لم يُكتب. فيُعلن الكتالوجُ «تشوف الأداءات»
//   و«تسجّل خلاص» ويشير إلى صفحة المحفظة — وصفحةُ المحفظة لا تعرف أنّ
//   المسارَ موجود.
//
//   ── وما يُوقَظ حين يُفتَح الباب ──
//   `POST /:id/confirm` كان يأخذ أيَّ مُعرِّفٍ ويكتب عليه: `updatePaymentStatus`
//   لا تعرف صاحبَ الدفعة. فأيُّ تاجرٍ مصادَقٍ يُعلن دفعةَ تاجرٍ آخرَ «مدفوعة»
//   أو «مُستردّة». المسارُ كان بلا بابٍ فبقيت الثغرةُ نائمة — وفتحُ الباب
//   يوقظها. تُغلَق **مع** فتحه لا بعدَه.
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-payment-door-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

let pool, db, OWNER, STRANGER;

before(async () => {
  if (SKIP) return;
  db = require('../database').db;
  pool = require('../db');
  const bcrypt = require('bcryptjs');
  const mk = async (email) => (await db.getUserByEmail(email))
    || await db.createUser({ name: 'P', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  OWNER = (await mk('payowner@test.ma')).id;
  STRANGER = (await mk('paystranger@test.ma')).id;
  await pool.query('DELETE FROM payments WHERE user_id = ANY($1)', [[OWNER, STRANGER]]);
});
after(async () => { if (SKIP) return; await pool.end?.(); });

test('الأداءاتُ تُقرَأ أصلًا — الاستعلامُ الذي بُني له الفهرسُ ولم يُكتب', async () => {
  const p = await db.createPayment({ userId: OWNER, provider: 'cod', amount: 250, status: 'pending' });
  const rows = await db.listPayments(OWNER);
  const mine = rows.find(r => r.id === p.id);
  assert.ok(mine, 'دفعةٌ أُنشئت ولا تظهر في القراءة');
  assert.equal(mine.amount, 250, 'المبلغُ يعود نصًّا لا رقمًا — سيُجمَع في الواجهة جمعَ نصوص');
  assert.equal(mine.status, 'pending');
  assert.equal(mine.userId, OWNER);
});

test('**ولا تُقرَأ أداءاتُ غيره** — القراءةُ مقيَّدةٌ بصاحبها', async () => {
  const his = await db.createPayment({ userId: STRANGER, provider: 'wallet', amount: 999, status: 'paid' });
  const mine = await db.listPayments(OWNER);
  assert.ok(!mine.some(r => r.id === his.id),
    'سجلُّ تاجرٍ آخرَ ظهر في قائمة هذا التاجر');
});

test('**التأكيدُ يُقيَّد بمالكه** — وإلّا أعلن تاجرٌ دفعةَ غيره «مُستردّة»', async () => {
  // هذا هو السبرُ الذي كان سيمرّ قبل الإصلاح: `updatePaymentStatus(id)` بلا
  // `user_id` تكتب على أيّ صفّ. نُثبت أنّ المسارَ يقرأ المالكَ أوّلًا.
  const his = await db.createPayment({ userId: STRANGER, provider: 'cod', amount: 400, status: 'pending' });
  const row = await db.getPayment(his.id);
  assert.equal(row.userId, STRANGER, 'قراءةُ الدفعة لا تُرجع مالكَها — فلا سبيلَ لفحص الملكيّة');
  assert.notEqual(row.userId, OWNER);

  // والمسارُ نفسُه: يُقرأ نصًّا لأنّ الفحصَ شرطُ أمانٍ لا تفصيلَ تنفيذ.
  const src = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'routes', 'payment.js'), 'utf8');
  const confirm = src.split("router.post('/:id/confirm'")[1] || '';
  assert.match(confirm, /db\.getPayment/,
    'التأكيدُ لا يقرأ الدفعةَ قبل الكتابة — أيُّ مُعرِّفٍ يمرّ');
  assert.match(confirm, /!==\s*req\.user\.id/,
    '**التأكيدُ لا يقارن المالكَ** — تاجرٌ يكتب على سجلّ تاجر');
});

test('والقراءةُ لا تأخذ هويّتَها من الجسم — الرمزُ وحدَه يقول مَن أنت', () => {
  const src = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'routes', 'payment.js'), 'utf8');
  const list = src.split("router.get('/'")[1]?.split('router.')[0] || '';
  assert.match(list, /req\.user\.id/, 'القراءةُ بلا هويّةٍ من الرمز');
  assert.ok(!/req\.(query|body)\.userId/.test(list),
    'القراءةُ تقبل `userId` من العميل — بابٌ إلى سجلّ غيره');
});

// ── والباب: أتنادي الواجهةُ هذا المسارَ فعلًا؟ ─────────────────
rawTest('صفحةُ المحفظة تنادي المسارَ — لا تكتفي بالإشارة إليه في الكتالوج', () => {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.join(__dirname, '..', '..');
  const page = fs.readFileSync(path.join(root, 'src/pages/WalletPage.tsx'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'src/services/api.ts'), 'utf8');
  assert.match(api, /'\/payment'/, '`paymentAPI.list` لا تشير إلى المسار');
  assert.match(page, /paymentAPI/, 'الصفحةُ لا تعرف أنّ مسارَ الأداءات موجود');
  assert.match(page, /walletAPI/, 'الصفحةُ تحسب «الرصيد» من الطلبات ولا تقرأ المحفظة');
  assert.match(page, /paymentAPI\.confirm/, 'لا بابَ لتأكيد أنّ الخلاصَ وصل');
  assert.match(page, /paymentAPI\.charge/, 'لا بابَ لتسجيل خلاص — `MAKE_PAYMENT` بلا فعل');
});
