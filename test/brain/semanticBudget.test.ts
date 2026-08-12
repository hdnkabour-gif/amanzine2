import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decideFor } from '../../src/lib/decide';
import { readNeed, readFacts } from '../../src/pages/Landing/sections/NeedFirst';

// ============================================================
// **RC-P6 — تحليلٌ دلاليٌّ واحدٌ لكلّ فعلِ مستخدم.**
//
//   قِيس بعدّادٍ مغروسٍ في العقل نفسِه (لا في الاختبار) على جملةٍ واحدة:
//
//       ضغطةُ مفتاحٍ في `NeedFirst` ⇒ understand ×٢ · parseNeed ×٢
//       نقرةُ إرسالٍ واحدة          ⇒ understand ×٢ · parseNeed ×٢ + ٣
//       لوحةُ التصحيح في `LivingHome` ⇒ قراءةٌ **مع كلّ إعادة رسم**
//
//   والكلفةُ أهونُ ما في الأمر. الخطرُ **التباعد**: الذاكرةُ والمفاهيمُ
//   المُسجَّلةُ حيًّا تُكتَب بين نداءٍ وآخر، فتُعرَض حقائقُ من قراءةٍ ويُبنى
//   القرارُ على قراءةٍ أخرى — بلا أن يظهر ذلك في أيّ سطر.
//
//   والحارسُ هنا **سلوكيٌّ بالبنية**: تُقاس هُويّةُ الكائنات لا عددُ الأسطر.
//   قراءتان لنفس الجملة تُنتجان كائنَين مختلفَين، وقراءةٌ واحدةٌ مُمرَّرةٌ
//   تُنتج **نفسَ الكائن** — وهذا ما يُثبَت.
// ============================================================

const ROOT = process.cwd();
/**
 * يُجرَّد الملفُّ من **كلّ** تعليقٍ قبل الفحص.
 *
 *   وقع هذا مرّتَين: حارسٌ طابق شرحَه هو. فـ`understand().reasoning` مكتوبةً
 *   في تعليقٍ تُحسَب نداءً، وتصفيةُ الأسطر التي **تبدأ** بـ`//` لا تكفي —
 *   التعليقُ الكتليُّ فيه أسطرٌ تبدأ بحرفٍ عاديّ.
 */
const bare = (p: string) => fs.readFileSync(path.resolve(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');

const Q = 'خاصني سبّاك مستعجل فالدار البيضاء';

test('**المالكُ يقرأ ما أُعطي ولا يُعيد القراءة** — هُويّةُ الكائن تشهد', () => {
  // لو أعاد `decideFor` النداءَ لعاد بكائنٍ آخر. فالمساواةُ المرجعيّةُ هي
  //   الدليلُ الوحيدُ الذي لا يُخدَع: `deepEqual` تمرّ على قراءتَين متطابقتَين.
  const rd = readNeed(Q);
  const d = decideFor(Q, { u: rd.u, need: rd.r });
  assert.equal(d.u, rd.u, '**أعاد المالكُ قراءةَ الفهم** رغم تمريره');
  assert.equal(d.need, rd.r, '**أعاد المالكُ قراءةَ الحاجة** رغم تمريرها');
});

test('**وبلا تمريرٍ يقرأ مرّةً واحدةً لا مرّتَين**', () => {
  const a = decideFor(Q);
  const b = decideFor(Q);
  // نداءان منفصلان ⇒ كائنان. وهذا يُثبت أنّ الاختبارَ أعلاه يقيس شيئًا:
  //   لو كانت القراءةُ مُخبَّأةً عالميًّا لتساوى هذان أيضًا، ولصار الحارسُ أجوف.
  assert.notEqual(a.u, b.u, 'قراءةٌ مُخبَّأةٌ عالميًّا — الحارسُ أعلاه لا يقيس شيئًا');
  assert.ok(a.u && a.need, 'المالكُ لا يقرأ شيئًا');
});

test('**وقراءةُ الصفحة واحدةٌ تُغذّي الحقائقَ والنتيجةَ والأثر**', () => {
  const rd = readNeed(Q);
  assert.ok(rd.u && rd.r, 'القراءةُ لا تُخرج ما يُمرَّر');
  assert.ok(Array.isArray(rd.facts) && rd.facts.length > 0, 'لا حقائقَ من قراءةٍ صحيحة');
  // والأثرُ من نفس الفهم لا من فهمٍ ثانٍ.
  assert.ok(Array.isArray((rd.u as { reasoning?: string[] }).reasoning), 'لا أثرَ في الفهم المقروء');
  // والبابُ القديمُ يبقى صادقًا — لا يُكسَر ما تقرؤه الاختباراتُ الأخرى.
  assert.deepEqual(readFacts(Q).map(f => f.label), rd.facts.map(f => f.label));
});

test('**ولا قراءةَ داخل الرسم** — تحليلٌ لكلّ رمشةٍ ليس تحليلًا لكلّ فعل', () => {
  // `correctionOptions(understand(text))` كانت داخل JSX في `LivingHome`،
  //   فتُقرأ الجملةُ مع كلّ إعادة رسمٍ ما دامت اللوحةُ مفتوحة. (SOURCE_SHAPE
  //   معلَن: «أين يقع النداء» خاصّيّةٌ بنيويّةٌ لا تُقاس من مخرج.)
  const code = bare('src/pages/LivingHome.tsx');
  assert.doesNotMatch(code, /correctionOptions\(understand\(/,
    'قراءةٌ داخل الرسم — تتكرّر مع كلّ إعادة رسم');
  // جسمُ الرسم هو `return (` الوحيدُ بمسافتَين — لا `return (` داخل دالّةٍ
  //   مُضمَّنة. والفحصُ يُجرى عليه وحدَه، وإلّا حُسبت نداءاتُ `submit`.
  const at = code.indexOf('\n  return (');
  assert.ok(at > 0, 'لم يُعثَر على جسم الرسم — الحارسُ يقيس فراغًا');
  const jsx = code.slice(at);
  assert.ok(jsx.length > 5000, `جسمُ الرسم ${jsx.length} حرفًا — قُطع الحارسُ عن مقياسه`);
  // ولا يُحسَب `RemoteProvider.understand` — ذاك نداءُ شبكةٍ لا قراءةً محلّيّة.
  const inRender = (jsx.match(/(?<!\.)\bunderstand\(/g) || []).length;
  assert.equal(inRender, 0, `${inRender} نداءَ فهمٍ داخل جسم الرسم`);
});

test('**وسقفُ التحليل لا يُرفَع** — `NeedFirst` تقرأ في موضعٍ واحد', () => {
  const code = bare('src/pages/Landing/sections/NeedFirst.tsx');
  // `readNeed` وحدَها تنادي العقل؛ وما عداها يستهلك ما قرأته.
  const u = (code.match(/\bunderstand\(/g) || []).length;
  const n = (code.match(/\bparseNeed\(/g) || []).length;
  assert.equal(u, 1, `\`understand\` في ${u} موضعًا — القراءةُ موضعٌ واحد`);
  assert.equal(n, 1, `\`parseNeed\` في ${n} موضعًا — القراءةُ موضعٌ واحد`);
  // والنقرةُ تُمرّر ما قرأته إلى المالك، وإلّا قرأه من جديد.
  assert.match(code, /decideFor\(need, \{ u: pre\?\.u/, 'النقرةُ لا تُمرّر قراءتَها إلى المالك');
  assert.match(code, /const rd = need === text\.trim\(\) \? read : readNeed\(need\)/,
    'النقرةُ تقرأ من جديدٍ ما قرأه العرضُ للتوّ');
});
