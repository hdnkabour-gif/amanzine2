import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'REPORTS/ASK_KIND.md');

// ============================================================
// **تقريرُ «بائعٌ أم حِرفيّ» لا يقدُم.**
//
//   وُلد ليُجهِّز قرارًا: ١٦٨ مفهومًا من ٢٠٧ يُقرأ طلبُها «تقلّب على حرفي
//   ولا مختصّ» — فيها الجزّارُ والمخبزةُ والمقهى وبائعُ الخضر. والقرارُ
//   لصاحب المشروع، لكنّ **الأرقامَ التي يقرّر عليها يجب أن تكون اليومَ**.
//
//   ووثيقةٌ كهذه تكذب بصمت: تُصلَح النيّةُ لعشرة مفاهيمَ ويبقى التقريرُ
//   يقول ١٦٨ — فيُتَّخَذ القرارُ على عددٍ لم يعد قائمًا. ولذلك يُشغَّل
//   المولّدُ نفسُه هنا: حارسٌ يُعيد بناءَ القياس يقيس شيئًا آخر.
// ============================================================

const num = (s) => Number(String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function measured() {
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/run-askKind.mjs'), '--json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const rows = JSON.parse(out.slice(out.indexOf('[')));
  return {
    total: rows.length,
    seller: rows.filter(r => r.cue === 'بائع').length,
    trade: rows.filter(r => r.cue === 'حِرفيّ').length,
    unclear: rows.filter(r => r.cue === 'ملتبس').length,
  };
}

test('التقريرُ موجودٌ ومُولَّدٌ لا محرَّر', () => {
  assert.ok(existsSync(REPORT), 'ناقص: REPORTS/ASK_KIND.md — شغّل `npm run report:ask-kind`');
  assert.match(readFileSync(REPORT, 'utf8'), /مُولَّدٌ آليًّا/,
    'التقريرُ محرَّرٌ بيد — سيقدُم كما قدُم سلفُه');
});

test('وأرقامُه تطابق الكودَ الآن — لا قرارَ على عددٍ قديم', () => {
  const doc = readFileSync(REPORT, 'utf8');
  const now = measured();
  const declared = (label) => num((doc.match(new RegExp(`\\| ${label}[^|]*\\| \\*\\*([٠-٩\\d]+)\\*\\* \\|`)) || [])[1]);

  assert.equal(declared('مفهومًا يُقرأ طلبُه'), now.total,
    `التقريرُ يقول ${declared('مفهومًا يُقرأ طلبُه')} والكودُ يقول ${now.total} — أعِد التوليد`);
  assert.equal(declared('منها ترجّح البياناتُ أنّه \\*\\*بائع\\*\\*'), now.seller, 'عددُ الباعة قديم — أعِد التوليد');
  assert.equal(declared('منها ترجّح البياناتُ أنّه \\*\\*حِرفيّ\\*\\*'), now.trade, 'عددُ الحِرفيّين قديم — أعِد التوليد');
  assert.equal(declared('منها \\*\\*ملتبس\\*\\*'), now.unclear, 'عددُ الملتبس قديم — أعِد التوليد');
});

// ── وحدُّ الأداة: **تقيس ولا تقرّر** ──────────────────────────
//
//   الخطرُ على أداةٍ كهذه أن تُرقَّى بصمتٍ إلى حَكَم: يُستورَد `cue` في
//   `needEngine` فيصير التخمينُ اللفظيُّ («وجدتُ كلمة بائع في الوصف»)
//   قرارَ توجيهٍ لإنسان. والقرينةُ ليست حكمًا — وقد تخطئ: «محل» في وصفِ
//   حِرفيٍّ لا تجعله بائعًا.
test('ولا يستهلكها محرّكٌ حيّ — قياسٌ لا حَكَم', () => {
  // `git grep` يخرج بحالة ١ حين لا يجد — وهي **حالةُ النجاح** هنا. ولو تُرك
  // بلا معالجةٍ لسقط الحارسُ دائمًا، ثمّ يُحذَف لأنّه «مزعج».
  let out = [];
  try {
    out = execFileSync('git', ['grep', '-l', 'askKind', '--', 'src/', 'server/'],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch (e) {
    assert.equal(e.status, 1, `فشل البحثُ نفسُه لا لغيابِ نتيجة:\n${e.stderr || e.message}`);
  }
  assert.deepEqual(out, [],
    `ملفّاتٌ حيّةٌ تستورد أداةَ القياس — صار التخمينُ اللفظيُّ قرارًا:\n  ${out.join('\n  ')}`);
});

test('والمولّدُ يقرأ الطريقَ الحيّ — لا يُعيد اشتقاقَ النيّة', () => {
  // لو قرأ التقريرُ فئاتِ المفاهيم بدل `parseNeed` لقاس تصنيفَنا لا سلوكَ
  // التطبيق — وهو ما يُتَّخذ عليه القرار.
  //
  //   ── **والذكرُ ليس نداءً** ────────────────────────────────────
  //   كُتب هذا الحارسُ أوّلًا يفحص وجودَ الكلمة `parseNeed` في الملفّ، ثمّ
  //   حُقن العطبُ (استُبدل النداءُ بقيمةٍ ثابتة) فمرّ — لأنّ سطرَ الاستيراد
  //   وحدَه يكفي لإرضائه. أسقطه حارسُ الأرقامِ لا هو. فيُفحَص **النداء**.
  const src = readFileSync(join(ROOT, 'scripts/askKind.ts'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /parseNeed\s*\(/, 'المولّدُ لا **ينادي** `parseNeed` — يقيس تصنيفَنا لا سلوكَ التطبيق');
});
