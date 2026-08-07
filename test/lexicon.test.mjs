import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = join(ROOT, 'REPORTS/LEXICON.md');

// ============================================================
// **تقريرُ اللغة لا يقدُم.**
//
//   طلبَ صاحبُ المشروع استخراجَ لغة التطبيق كلِّها وما يستطيع فعلَه.
//   ووثيقةٌ كهذه تُكتَب مرّةً ثمّ تكذب: تُضاف مفرداتٌ وقدراتٌ ولا يُحدَّث
//   شيء، فتصير خريطةً لبلدٍ تغيّر. وهذا نفسُ ما وقع في هذا المشروع سلفًا —
//   ولذلك يُولَّد التقريرُ آليًّا، **ويُحرَس أنّه مُولَّدٌ من الحاضر**.
//
//   والحارسُ يُشغّل المولّدَ نفسَه: حارسٌ يُعيد بناءَ منطق القياس يقيس شيئًا
//   آخرَ بالضرورة، فيصير رأيًا ثانيًا لا حارسًا.
// ============================================================

const num = (s) => Number(String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

function measured() {
  const out = execFileSync(process.execPath, [join(ROOT, 'scripts/lexicon.mjs')], { encoding: 'utf8' });
  const m = out.match(/\[lexicon\] (\d+) مفهومًا · (\d+) مصطلحًا · (\d+) قدرةً · (\d+) زوجَ/);
  assert.ok(m, `تعذّر قراءةُ خرج المولّد — تغيّرت صيغتُه والحارسُ صار أعمى:\n${out}`);
  return { concepts: +m[1], terms: +m[2], abilities: +m[3], pairs: +m[4] };
}

test('تقريرُ اللغة موجودٌ ومُولَّد', () => {
  assert.ok(existsSync(REPORT), 'ناقص: REPORTS/LEXICON.md — شغّل `npm run report:lexicon`');
  assert.match(readFileSync(REPORT, 'utf8'), /مُولَّدٌ آليًّا/,
    'التقريرُ محرَّرٌ بيد — سيقدُم كما قدُم سلفُه');
});

test('وأرقامُه تطابق الكودَ الآن — لا وثيقةَ قديمة', () => {
  const doc = readFileSync(REPORT, 'utf8');
  const now = measured();
  const declared = (label) => num((doc.match(new RegExp(`\\| ${label}[^|]*\\| \\*\\*([٠-٩\\d]+)\\*\\* \\|`)) || [])[1]);

  assert.equal(declared('مفهومًا يفهمه التطبيق'), now.concepts,
    `التقريرُ يقول ${declared('مفهومًا يفهمه التطبيق')} مفهومًا والكودُ يقول ${now.concepts} — أعِد التوليد`);
  assert.equal(declared('مصطلحًا مميَّزًا'), now.terms, 'عددُ المصطلحات قديم — أعِد التوليد');
  assert.equal(declared('قدرةً يستطيع تنفيذها'), now.abilities, 'عددُ القدرات قديم — أعِد التوليد');
});

// ── والعطبُ البنيويُّ الذي كاد يُنتج رقمًا كاذبًا ─────────────────
//
//   كُتب المولّدُ أوّلًا بدمجٍ **محلّيٍّ** لـ`knowledgeData` و`knowledgeExtra`،
//   فأعطى ١٨٥ مفهومًا والحقيقةُ ٢٠٧: أسقط `knowledgeExtra.generated`
//   وتجاهل `DISOWNED`. فيُحرَس السببُ لا العَرَض.
test('المولّدُ يقرأ المصدرَ الواحد — لا يُعيد الدمجَ نسخةً ثانية', () => {
  const gen = readFileSync(join(ROOT, 'scripts/lexicon.mjs'), 'utf8');
  const code = gen.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /kb\/concepts/,
    'المولّدُ لا يقرأ `concepts.ts` — أيُّ دمجٍ آخرَ يُسقط المستورَد من CSV');
  assert.doesNotMatch(code, /function mergedConcepts/,
    'عاد الدمجُ نسخةً ثانيةً في المولّد — وهي تكذب في أوّل قياس');
});

// ============================================================
// **«بلا صفحة» ليست «بلا باب» — وقولُها عن بابٍ يعمل أسوأُ من الصمت.**
//
//   كان العمودُ يكتب «**بلا باب**» لكلّ `page: null`، فأعلن التقريرُ ثغرتَين
//   لا وجودَ لهما. و`TRACK_ORDER` **بابُه يعمل**: `/track/:userId` في
//   `App.tsx`، وحارسٌ في `abilities.test.mjs` يُسقط البناءَ لو حُذف.
//
//   والتقريرُ نفسُه يحذّر من نصف الحقيقة: «تقريرٌ يعرض بعضَ ما يُستطاع أسوأُ
//   من غيابه». وأن يقول عن مبنيٍّ إنّه معدومٌ أسوأُ — يقرؤه صاحبُ المشروع
//   فيطلب بناءَ ما هو مبنيٌّ ويؤجّل ما ليس كذلك.
// ============================================================
test('التقريرُ يفرّق بين غيابٍ مقصودٍ وثغرةٍ حقيقيّة', () => {
  const doc = readFileSync(REPORT, 'utf8');
  assert.doesNotMatch(doc, /\| \*\*بلا باب\*\* \|/,
    '**عاد العمودُ يقول «بلا باب» لكلّ صفحةٍ فارغة** — فيُعلَن عن بابٍ يعمل أنّه معدوم');
  assert.match(doc, /بلا صفحةٍ \*\*عمدًا\*\*/, 'اختفى تمييزُ الغياب المقصود');
  assert.match(doc, /TRACK_ORDER/, 'سببُ غيابِ صفحةِ التتبّع لم يعد مذكورًا');
});

test('وقائمةُ المقصود تُقرأ من سقّاطتها — لا نسخةً ثانيةً في المولّد', () => {
  // القائمةُ مُعلَنةٌ ومحروسةٌ في `abilities.test.mjs` وحدَه. ولو نُسخت في
  // المولّد لتباعدتا بصمت: تُضاف قدرةٌ بلا صفحةٍ فتُعلَن «مقصودة» في التقرير
  // و«ثغرة» في السقّاطة — أو العكس، وهو أسوأ.
  const gen = readFileSync(join(ROOT, 'scripts/lexicon.mjs'), 'utf8');
  const code = gen.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /abilities\.test\.mjs/,
    'المولّدُ لا يقرأ سقّاطةَ القدرات — القائمةُ منسوخةٌ فيه وستتباعد');
  assert.doesNotMatch(code, /const DELIBERATE = new Set\(\s*\[\s*'/,
    'قائمةُ الغياب المقصود مكتوبةٌ بيدٍ في المولّد — نسختان تنحرفان');
});

test('والتقريرُ يذكر كلَّ قدرةٍ بلا استثناء', () => {
  // تقريرٌ يعرض بعضَ ما يُستطاع أسوأُ من غيابه: يقرؤه صاحبُ المشروع فيظنّ
  // أنّ ما ليس فيه غيرُ مبنيّ.
  const doc = readFileSync(REPORT, 'utf8');
  const now = measured();
  // العمودُ المميِّزُ هو **الخطورة**: جدولُ الأوامر الإداريّة يشترك في عمود
  // الفعل، فعدُّه به يخلط الجدولَين (قِيس: ١٨٣ بدل ٨٩).
  const rows = (doc.match(/^\| [^|]+ \| (?:offer|seek|create|update|delete|view|send|book) \| [^|]+ \| [^|]+ \| (?:low|medium|high) \|/gm) || []).length;
  assert.equal(rows, now.abilities, `التقريرُ يعرض ${rows} قدرةً من ${now.abilities}`);
});
