import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { CONFIDENCE } from '../../src/lib/clarify';
import { RISK_THRESHOLD } from '../../src/lib/abilities';
import { applyCorrection } from '../../src/lib/correction';

// ============================================================
// الثقةُ تصف الدليلَ — لا الأمنيّة ولا الصمت.
//
//   قِيس بالنبض: جملةٌ صريحةٌ كاملةٌ كـ«عندي محل ديال الخضرة» تخرج بثقة
//   **٠٫٥٠**، وعتبةُ التنفيذ المتوسّط ٠٫٧٠. فالنتيجة سؤالٌ على جملةٍ لا
//   ينقصها شيء — وهو «موتُ السحر»: يعرف ثمّ يسأل.
//
//   والعلاجُ ليس رفعَ الرقم ولا خفضَ العتبة. كلاهما كذبٌ في اتّجاه: الأوّل
//   ينفّذ على الغامض، والثاني يفتح الحذفَ للضعيف. العلاجُ أن تُقرأ **أدلّةٌ
//   ثلاثةٌ مجتمعة**، وأيُّ واحدٍ ناقصٍ يُبقي الثقةَ كما كانت.
// ============================================================

const LIFT = 0.75;

test('الأدلّةُ الثلاثةُ مجتمعةً ترفع الثقةَ فوق عتبة التعديل', () => {
  for (const s of ['عندي محل ديال الخضرة', 'أنا خضار', 'انا كندير الحلويات', 'عندي محل حلاقة']) {
    const u = understand(s);
    assert.ok(u.confidence >= LIFT, `«${s}» ثقتُها ${u.confidence} — دون ${LIFT}`);
    assert.ok(u.confidence >= RISK_THRESHOLD.medium,
      `«${s}» لا تكفي للإنشاء ولا للتعديل — فتُقابَل بسؤالٍ بلا داعٍ`);
  }
});

test('والأثرُ يُذكَر — رفعٌ بلا سببٍ مكتوبٍ رقمٌ لا يُراجَع', () => {
  const u = understand('عندي محل ديال الخضرة');
  assert.ok(u.reasoning.some(r => r.includes('مصطلحٌ صريح')), 'رُفعت الثقةُ بلا أثر');
});

// ── وأيُّ دليلٍ ناقصٍ لا يرفع ────────────────────────────────
test('① دليلٌ مفترَضٌ لا يرفع — الوعاءُ ليس تصريحًا', () => {
  // «حانوت ديال كلشي» تعود بقّالةً بوسم `container`، أي **افتراضًا** لا
  // قراءةً لما قاله. ولو رُفعت لها الثقةُ لصار الافتراضُ يقينًا.
  const u = understand('عندي حانوت ديال كلشي');
  assert.equal(u.service, 'grocer');
  assert.ok(u.confidence < LIFT, `افتراضُ الوعاء رُفع إلى ${u.confidence}`);
});

test('② اتّجاهٌ مجهولٌ لا يرفع — «سباك» وحدَها لا تقول ماذا يريد', () => {
  // حرفةٌ بلا اتّجاه: أيبحث عنه أم هو هو؟ التنفيذُ على أحد الاحتمالين
  // يفتح النشرَ لمن جاء يبحث.
  const u = understand('سباك');
  assert.equal(u.stance, 'unknown');
  assert.ok(u.confidence < LIFT, `خُمّن الاتّجاهُ بثقة ${u.confidence}`);
});

test('③ الغموضُ المعجميُّ لا يُرفَع فوقه — يُسأل ولا يُخمَّن', () => {
  const u = understand('عندي موطور');
  assert.ok(u.ambiguity, 'لم يُكشَف الغموضُ أصلًا — سقط الحارس');
  assert.ok(u.confidence < LIFT, `رُفعت الثقةُ على كلمةٍ لمعنيَين: ${u.confidence}`);
});

test('وما لا يُفهَم يبقى ضعيفًا — الرفعُ لا يمسّ الصمت', () => {
  const u = understand('زقززق فريدة غامضة تماما');
  assert.ok(u.confidence < CONFIDENCE.CONFIRM, `الهذيانُ خرج بثقة ${u.confidence}`);
});

test('الرفعُ سقفٌ لا إزاحة — لا يخفض ثقةً أعلى منه', () => {
  // `Math.max` لا إسناد. والفرقُ ليس نظريًّا: ما صحّحه الإنسانُ بيده يبلغ
  // ٠٫٨٥ (`learned && profession`)، وهو أوثقُ ما نملك — تصريحُ صاحبِ
  // الجملة نفسِه. ولو كُتب الرفعُ إسنادًا لخفضه إلى ٠٫٧٥، أي أن يصير
  // «تحسينُ الثقة» هدمًا لأقواها.
  try { localStorage.clear(); } catch { /* noop */ }
  const before = understand('عندي طرطاقات ف الدار').confidence;
  assert.equal(applyCorrection('طرطاقات', 'كهربائي'), true);
  const after = understand('عندي طرطاقات ف الدار');
  assert.ok(after.learned, 'لم يُطبَّق التصحيح — فالقياسُ لا يقيس شيئًا');
  assert.ok(after.confidence > LIFT,
    `ما صحّحه الإنسانُ خرج بثقة ${after.confidence} — خفضها الرفعُ بدل أن يصونها`);
  assert.ok(after.confidence > before);
  assert.ok(after.confidence <= 1, 'ثقةٌ تجاوزت الواحد');
  try { localStorage.clear(); } catch { /* noop */ }
});
