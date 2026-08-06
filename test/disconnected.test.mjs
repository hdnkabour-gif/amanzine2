import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// ============================================================
// **وثيقةٌ تكذب أسوأُ من وثيقةٍ ناقصة.**
//
//   `REPORTS/DISCONNECTED.md` أعلن «٣٩ ملفًّا · ٣٠٥٦ سطرًا مفصولة»، والقياسُ
//   على الكود يقول سبعةً و٤٥٠. ولو صُدِّق لحُذفت صفحةُ الهبوط الحيّةُ كلُّها:
//   ماسحُه لم يكن يحلّ `from './Landing'` ⇒ `Landing/index.tsx`.
//   ثمّ قدُم: وُصل `executionPolicy` بالتزامٍ تالٍ وبقي التقريرُ يعدّه مفصولًا.
//
//   ولا يُصلَح هذا بإعادة كتابةٍ يدويّةٍ أخرى — تقدُم بدورها بعد أسبوع.
//   يُصلَح بأن يصير التقريرُ **مُولَّدًا** وأن يسقط البناءُ حين يخالف الكود.
//
//   وهذا الحارسُ لا يقرأ التقريرَ ليصدّقه: يُعيد القياسَ من الصفر ويقارن.
// ============================================================

const ROOT = new URL('..', import.meta.url).pathname;
const REPORT = join(ROOT, 'REPORTS/DISCONNECTED.md');

/** الأرقامُ العربيّة-الهنديّة في التقرير ⇒ عددًا. */
const num = (s) => Number(String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function measured() {
  // نُشغّل المولّدَ نفسَه: حارسٌ يُعيد بناءَ منطق القياس يقيس شيئًا آخرَ
  // بالضرورة، فيصير الاختبارُ رأيًا ثانيًا لا حارسًا.
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/disconnected.mjs')], { encoding: 'utf8' });
  const m = out.match(/\[disconnected\] (\d+) ملفًّا مفصولًا · (\d+) سطرًا · من (\d+)/);
  assert.ok(m, `تعذّر قراءةُ خرج المولّد — تغيّرت صيغتُه والحارسُ صار أعمى:\n${out}`);
  return { files: +m[1], lines: +m[2], scanned: +m[3] };
}

test('التقريرُ موجودٌ ومُولَّد', () => {
  assert.ok(existsSync(REPORT), 'ناقص: REPORTS/DISCONNECTED.md — شغّل `npm run report:disconnected`');
  const doc = readFileSync(REPORT, 'utf8');
  assert.match(doc, /مُولَّدٌ بأمر/,
    'التقريرُ محرَّرٌ بيد — سيقدُم كما قدُم سلفُه. وَلِّده بـ`npm run report:disconnected`');
});

test('أرقامُ التقرير تطابق الكودَ الآن — لا وثيقةَ قديمة', () => {
  const doc = readFileSync(REPORT, 'utf8');
  const now = measured();

  const declaredFiles = num((doc.match(/\| \*\*مفصولة\*\* \| \*\*([٠-٩\d]+)\*\* \|/) || [])[1]);
  const declaredLines = num((doc.match(/\| أسطرٌ مفصولة \| ([٠-٩\d]+) \|/) || [])[1]);
  const declaredScan  = num((doc.match(/\| ملفّاتُ الإنتاج المسوحة \| ([٠-٩\d]+) \|/) || [])[1]);

  assert.equal(declaredFiles, now.files,
    `التقريرُ يقول ${declaredFiles} ملفًّا مفصولًا والكودُ يقول ${now.files} — أعِد التوليد`);
  assert.equal(declaredLines, now.lines,
    `التقريرُ يقول ${declaredLines} سطرًا والكودُ يقول ${now.lines} — أعِد التوليد`);
  assert.equal(declaredScan, now.scanned,
    `التقريرُ مسح ${declaredScan} ملفًّا والمشروعُ فيه ${now.scanned} — أعِد التوليد`);
});

// ── العطبُ البنيويُّ الذي أنتج الرقمَ الكاذب ────────────────────
//
//   ليس سهوًا يُصحَّح مرّةً: ماسحٌ لا يحلّ استيرادَ المجلّد سيُعيد الكذبةَ في
//   أوّل صفحةٍ تُنظَّم في مجلّدٍ بـ`index.tsx`. فيُحرَس السببُ لا العَرَض.
test('الماسحُ يحلّ استيرادَ المجلّد — وإلّا سقطت صفحةُ الهبوط في «الميّت»', () => {
  const gen = readFileSync(join(ROOT, 'scripts/disconnected.mjs'), 'utf8');
  assert.match(gen, /'\/index\.tsx'/, 'الماسحُ لا يحلّ `./Dir` إلى `Dir/index.tsx`');
  assert.match(gen, /'\/index\.js'/, 'الماسحُ لا يحلّ المجلّدَ في كود الخادم');
});

test('الماسحُ يعرف التحميلَ بمسح المجلّد — وإلّا أوصى بحذف شركاتِ توصيلٍ تعمل', () => {
  const gen = readFileSync(join(ROOT, 'scripts/disconnected.mjs'), 'utf8');
  assert.match(gen, /delivery\/providers/, 'المزوّداتُ ليست في نقاط الدخول');
  assert.match(gen, /delivery\/adapters/, 'الوسائطُ ليست في نقاط الدخول');
  // وهذا ليس تنظيرًا: أربعةُ مزوّدين ووسيلتان يُحمَّلون هكذا فعلًا.
  const reg = readFileSync(join(ROOT, 'server/services/delivery/registry.js'), 'utf8');
  assert.match(reg, /readdirSync/, 'السجلُّ لم يعد يمسح المجلّدَ — راجِع افتراضَ الماسح');
});

test('الماسحُ يقرأ `require` لا `import` وحدَه — وإلّا صار الخادمُ كلُّه «ميّتًا»', () => {
  const gen = readFileSync(join(ROOT, 'scripts/disconnected.mjs'), 'utf8');
  assert.match(gen, /require\\\(/, 'لا نمطَ لـ`require` — وكودُ الخادم كلُّه CommonJS');
});
