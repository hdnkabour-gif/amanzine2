'use strict';
// ============================================================
// الترحيلُ يُشغَّل بالأمر المباشر — حارسٌ سلوكيٌّ لا نصّيّ.
//
//   كان `module.exports = migrate;` آخرَ سطرٍ في الملفّ، فـ`node migrate.js`
//   **يُحمِّل الدالّةَ ويخرج بلا عمل**. وأسوأُ ما فيه أنّه صامتٌ تمامًا:
//   صفرُ خرجٍ وصفرُ خطأٍ وخروجٌ بـ٠. فمَن هيّأ بيئتَه ظنّ القاعدةَ مُرحَّلة،
//   ثمّ سقطت ثمانيةُ اختباراتٍ بـ«relation "user_memory" does not exist»
//   فبدا العطبُ في الاختبارات لا في الترحيل.
//
//   ولا يُحرَس هذا بمسحِ النصّ بحثًا عن `require.main` — ذاك يحرس الشكلَ
//   لا الأثر. هنا نُشغّل العمليّةَ فعلًا ونطالبها بأثرٍ في القاعدة.
// ============================================================
const { test: rawTest } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const SKIP = !process.env.DATABASE_URL;
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);

const MIGRATE = path.join(__dirname, '..', 'migrate.js');

test('`node migrate.js` يُرحِّل فعلًا ويُعلن اكتمالَه', () => {
  const out = execFileSync(process.execPath, [MIGRATE], {
    encoding: 'utf8',
    timeout: 120000,
    env: process.env,
  });
  // العلامةُ تُطبَع من داخل `migrate()` بعد `COMMIT`. غيابُها يعني أنّ
  // الدالّةَ لم تُستدعَ أصلًا — وهو بالضبط العطبُ الذي كان.
  assert.match(out, /Migrations complete/,
    'شُغِّل `node migrate.js` ولم يُرحِّل شيئًا — أُعيد حذفُ الاستدعاء الذاتيّ');
});

test('الترحيلُ يخرج بلا تعليقِ العمليّة', () => {
  // `pool.end()` ثمّ `process.exit(0)`: بلا إغلاق البِركة تبقى العمليّةُ
  // معلَّقةً إلى الأبد في CI، وهو فشلٌ بالمهلة لا برسالةٍ مفهومة.
  const started = Date.now();
  execFileSync(process.execPath, [MIGRATE], { encoding: 'utf8', timeout: 120000, env: process.env });
  assert.ok(Date.now() - started < 115000, 'الترحيلُ لم يُنهِ عمليّتَه');
});
