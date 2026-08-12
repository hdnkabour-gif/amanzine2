'use strict';
// ============================================================
// **المرحلة ⑤ — RC-P5: القاعدةُ تحرس معناها بنفسها.**
//
//   ثلاثةُ أعطابٍ قِيست على PostgreSQL حقيقيّة قبل الإصلاح:
//
//     ①  **الترحيلُ ليس ذرّيًّا.** أربعُ نسخٍ معًا على قاعدةٍ نظيفة ⇒ ٣ تسقط
//        بـ`23505 / pg_type_typname_nsp_index`. و`CREATE TABLE IF NOT EXISTS`
//        لا تحمي: معاملتان تريان «غيرُ موجود» معًا فتُنشئان معًا.
//     ②  **الخطوةُ الاختياريّةُ تقتل الترحيلَ كلَّه.** أيُّ خطأٍ داخل معاملةٍ
//        يُفسدها، فكلُّ ما بعده «current transaction is aborted».
//        و`.catch(() => {})` كان يبتلع السببَ فيظهر العطبُ في خطوةٍ بريئة.
//     ③  **القاعدةُ تقبل ما لا معنى له**: حالةٌ مخترَعةٌ · ثمنٌ سالبٌ · مخزونٌ
//        سالب. ودورةُ الحياة مكتوبةٌ في جافاسكربت، و`updateOrder` لا تسألها.
//
//   وكلُّ ما هنا REAL_POSTGRESQL: قاعدةٌ زائلةٌ وعمليّاتٌ متزامنةٌ حقيقيّة.
//
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/phase5-db-invariants.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { execFile } = require('node:child_process');
const path = require('node:path');

const SKIP = !process.env.DATABASE_URL;
const test = (n, f) => rawTest(n, { skip: SKIP && 'لا DATABASE_URL' }, f);
const pool = require('../db');
const L = require('../lib/orderLifecycle');

const ROOT = path.join(__dirname, '..');
const U = 'p5-' + crypto.randomBytes(4).toString('hex');

/** يُشغّل `migrate.js` عمليّةً مستقلّةً — كما يفعل الإقلاعُ الحقيقيّ. */
const runMigrate = () => new Promise(res => {
  execFile('node', [path.join(ROOT, 'migrate.js')], { cwd: ROOT, env: process.env },
    (err, stdout, stderr) => res({ code: err ? (err.code ?? 1) : 0, out: String(stdout) + String(stderr) }));
});

before(async () => {
  if (SKIP) return;
  await pool.query(`INSERT INTO users(id,name,email,password) VALUES($1,'م',$2,'x')
    ON CONFLICT (id) DO NOTHING`, [U, U + '@test.local']);
});
after(async () => {
  if (SKIP) return;
  await pool.query('DELETE FROM users WHERE id = $1', [U]).catch(() => {});
  await pool.end?.();
});

// ── ① الترحيلُ يحتمل نسختَين تُقلعان معًا ────────────────────────
test('**ستُّ نسخٍ تُرحّل معًا ولا تسقط واحدة**', async () => {
  // قِيس قبل القفل: ٣/٤ تسقط. وإعادةُ تشغيلٍ متدرّجةٌ تُقلع نسختَين في
  //   نفس الثانية — فهذا ليس فرضًا نظريًّا.
  const rs = await Promise.all([...Array(6)].map(() => runMigrate()));
  const failed = rs.filter(r => r.code !== 0);
  assert.deepEqual(failed.map(f => f.out.slice(-200)), [],
    `${failed.length}/6 سقطت — الترحيلُ ليس ذرّيًّا`);
}, { timeout: 120000 });

test('**والقفلُ مأخوذٌ فعلًا** — لا مجرّدَ نصٍّ في الملفّ', async () => {
  // حارسٌ سلوكيّ: يُؤخَذ نفسُ القفل من هذا الاختبار، فيجب أن **ينتظر**
  //   الترحيلُ. ولو لم يكن يأخذه لمرّ فورًا.
  const src = require('fs').readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  const key = Number((src.match(/const MIGRATION_LOCK = ([\d_]+)/) || [])[1].replace(/_/g, ''));
  assert.ok(Number.isFinite(key), 'لا مفتاحَ قفلٍ في الترحيل');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [key]);
    let done = false;
    const p = runMigrate().then(r => { done = true; return r; });
    await new Promise(r => setTimeout(r, 1500));
    assert.equal(done, false, '**الترحيلُ مرّ والقفلُ مأخوذ** — لا قفلَ فعليًّا');
    await client.query('ROLLBACK');           // يُفكّ القفلُ مع المعاملة
    assert.equal((await p).code, 0, 'سقط الترحيلُ بعد تحرير القفل');
  } finally { client.release(); }
}, { timeout: 120000 });

test('**والقفلُ يسقط مع المعاملة** — لا قفلَ يتيمٌ يجمّد الإقلاع', async () => {
  // قفلُ الجلسة (`pg_advisory_lock`) يبقى بعد سقوط المعاملة، فتُقلع نسخةٌ
  //   ماتت وتترك القفلَ فيتجمّد كلُّ إقلاعٍ بعدها. وقفلُ المعاملة لا يفعل.
  const src = require('fs').readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  assert.match(src, /pg_advisory_xact_lock/, 'قفلٌ على مستوى الجلسة — يبقى بعد الموت');
  assert.doesNotMatch(src, /pg_advisory_lock\(/, 'قفلُ جلسةٍ لا يُفكّ تلقائيًّا');
  const { rows } = await pool.query(
    `SELECT count(*)::int n FROM pg_locks WHERE locktype = 'advisory'`);
  assert.equal(rows[0].n, 0, `بقيت ${rows[0].n} أقفالٍ استشاريّةً بعد انتهاء الترحيل`);
});

// ── ② الخطوةُ الاختياريّةُ اختياريّةٌ حقًّا ──────────────────────
test('**وخطأٌ في خطوةٍ اختياريّةٍ لا يقتل ما بعده** — نقطةُ حفظ', async () => {
  // بلا `SAVEPOINT` يُفسد أوّلُ خطأٍ المعاملةَ كلَّها. يُقاس مباشرةً.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SAVEPOINT s1');
    await assert.rejects(() => client.query('ALTER TABLE t_ghost ADD COLUMN x int'));
    await client.query('ROLLBACK TO SAVEPOINT s1');
    const { rows } = await client.query('SELECT 1 AS ok');   // يجب أن يمرّ
    assert.equal(rows[0].ok, 1, 'المعاملةُ ماتت رغم نقطة الحفظ');
    await client.query('ROLLBACK');
  } finally { client.release(); }
});

test('**ولا خطوةَ تُبتلَع صامتةً** — لا `.catch(() => {})` في الترحيل', () => {
  const src = require('fs').readFileSync(path.join(ROOT, 'migrate.js'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const swallows = (code.match(/\.catch\(\(\) => \{\}\)/g) || []).length;
  assert.equal(swallows, 0, `${swallows} خطوةً تُبتلَع بلا حرف — الإقلاعُ «ناجحٌ» على مخطَّطٍ ناقص`);
  assert.match(code, /SAVEPOINT/, 'لا نقطةَ حفظٍ — الخطوةُ الاختياريّةُ تقتل الباقي');
});

test('**وإعادةُ الترحيل نظيفةٌ** — «مُطبَّقٌ سلفًا» ليس إخفاقًا', async () => {
  // بلا فحصِ الوجود يمتلئ دفترُ الإخفاقات بـ«already exists» كلَّ إقلاع،
  //   فيُتعلَّم تجاهلُه — ويضيع الإخفاقُ الحقيقيُّ بينها.
  const r = await runMigrate();
  assert.equal(r.code, 0);
  assert.doesNotMatch(r.out, /already exists/,
    'إعادةُ الترحيل تُبلّغ عن إخفاقاتٍ ليست إخفاقات');
  assert.doesNotMatch(r.out, /خطوةً اختياريّةً لم تُطبَّق/, `دفترُ إخفاقاتٍ غيرُ فارغ:\n${r.out}`);
}, { timeout: 60000 });

test('**ودفترُ الترحيل يُكتَب** — بأيّ نسخةٍ رُحّلت هذه القاعدة', async () => {
  const { rows } = await pool.query(
    `SELECT checksum, duration_ms FROM schema_migrations ORDER BY id DESC LIMIT 1`);
  assert.ok(rows[0], 'لا أثرَ للترحيل إطلاقًا');
  assert.match(rows[0].checksum, /^[0-9a-f]{64}$/, 'بصمةٌ ليست بصمة');
  assert.ok(rows[0].duration_ms >= 0);
  // والبصمةُ بصمةُ الملفّ الحاضر، وإلّا لم تُميّز نسخةً من نسخة.
  const real = crypto.createHash('sha256')
    .update(require('fs').readFileSync(path.join(ROOT, 'migrate.js'))).digest('hex');
  assert.equal(rows[0].checksum, real, 'البصمةُ لا تتبع الملفَّ — لا تُميّز شيئًا');
});

// ── ③ القاعدةُ ترفض ما لا معنى له ──────────────────────────────
const rejects = async (sql, params, constraint) => {
  await assert.rejects(() => pool.query(sql, params),
    e => { assert.match(e.message, new RegExp(constraint), `رُفض لسببٍ آخر: ${e.message}`); return true; },
    `**قُبل ما يخالف ${constraint}**`);
};

test('**حالةُ طلبٍ مخترَعةٌ تُرفَض**', async () => {
  await rejects(`INSERT INTO orders(id,user_id,status) VALUES($1,$2,'حالةٌ مخترَعةٌ تمامًا')`,
    ['o-' + U, U], 'chk_orders_status');
});

test('**ومبلغٌ سالبٌ يُرفَض** — في الطلب والمنتوج', async () => {
  await rejects(`INSERT INTO orders(id,user_id,status,total) VALUES($1,$2,'pending',-5)`,
    ['o2-' + U, U], 'chk_orders_total');
  await rejects(`INSERT INTO products(id,user_id,name,price) VALUES($1,$2,'x',-999)`,
    ['p-' + U, U], 'chk_products_price');
  await rejects(`INSERT INTO products(id,user_id,name,stock) VALUES($1,$2,'x',-5)`,
    ['p2-' + U, U], 'chk_products_stock');
  await rejects(`INSERT INTO products(id,user_id,name,status) VALUES($1,$2,'x','مخترَعة')`,
    ['p3-' + U, U], 'chk_products_status');
});

test('**والقيدُ يحرس التعديلَ لا الإدخالَ وحدَه**', async () => {
  // `NOT VALID` يُعفي الصفوفَ **القائمة** من الفحص، ولا يُعفي تعديلَها.
  //   ولولا ذلك لكفى `UPDATE` واحدٌ ليعود كلُّ شيء.
  await pool.query(`INSERT INTO orders(id,user_id,status,total) VALUES($1,$2,'pending',100)`,
    ['o3-' + U, U]);
  await rejects(`UPDATE orders SET status = 'مخترَعة' WHERE id = $1`, ['o3-' + U], 'chk_orders_status');
  await rejects(`UPDATE orders SET total = -1 WHERE id = $1`, ['o3-' + U], 'chk_orders_total');
});

test('**ومفرداتُ العميل مقبولةٌ** — لا يُكسَر ما يعمل اليوم', async () => {
  // القيدُ يرفض المخترَعَ لا المألوف: العميلُ يكتب `approved` منذ اليوم الأوّل،
  //   وقيدٌ يرفضه يُسقط كلَّ موافقةٍ على طلب.
  for (const s of ['pending', 'pending_confirmation', 'approved', 'confirmed',
    'processing', 'shipped', 'delivered', 'cancelled', 'closed']) {
    await pool.query(`UPDATE orders SET status = $2 WHERE id = $1`, ['o3-' + U, s]);
  }
  const { rows } = await pool.query(`SELECT status FROM orders WHERE id = $1`, ['o3-' + U]);
  assert.equal(rows[0].status, 'closed');
});

// ── ④ الطلبُ المُوافَقُ عليه لا يتجمّد ──────────────────────────
test('**الطلبُ المُوافَقُ عليه له مخرج** — أخطرُ ما قِيس', () => {
  // `PUT /api/orders/:id/approve` يكتب `approved`، وهي ليست في `TRANSITIONS`.
  //   فـ`TRANSITIONS['approved']` تُقرأ `undefined` ⇒ `[]` ⇒ **لا مخرجَ**.
  //   أي أنّ الفعلَ الأوّلَ الذي يفعله التاجرُ بكلّ طلبٍ كان يجمّده أبدًا.
  const frozen = ['pending_confirmation', 'approved', 'processing']
    .filter(s => !L.STATES.some(t => t !== L.canonicalState(s) && L.canTransition(s, t)));
  assert.deepEqual(frozen, [], `حالاتٌ مجمَّدةٌ لا مخرجَ لها: ${frozen.join(' · ')}`);
  assert.equal(L.canTransition('approved', 'shipped'), true);
  assert.equal(L.canTransition('approved', 'cancelled'), true);
});

test('**والترجمةُ لا تفتح ما كان مغلقًا** — الممنوعُ يبقى ممنوعًا', () => {
  // مرادفٌ يُترجَم إلى موضعٍ لا يعني أنّ كلَّ انتقالٍ صار مسموحًا: لو صار،
  //   لكان العلاجُ إسقاطَ الجدول لا وصلَه.
  assert.equal(L.canTransition('approved', 'delivered'), false, 'قفزةٌ ممنوعةٌ صارت مسموحة');
  assert.equal(L.canTransition('delivered', 'pending'), false, 'المُسلَّمُ عاد إلى الانتظار');
  assert.equal(L.canTransition('closed', 'shipped'), false, 'المُغلَقُ يُشحَن');
  assert.equal(L.canTransition('cancelled', 'shipped'), false, 'الملغى يُشحَن');
  assert.equal(L.canTransition('pending', 'حالةٌ مخترَعة'), false, 'حالةٌ مخترَعةٌ مقبولةٌ وجهةً');
  // وعددُ المواضع يبقى ستًّا: المرادفُ اسمٌ لا موضعٌ سابع.
  assert.equal(L.STATES.length, 6, 'صارت المفرداتُ مواضعَ — وهو العطبُ نفسُه أكبر');
});
