import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNeed } from '../../src/lib/needEngine';
import { detectLifeNeed, phantomConcepts, LIFE_NEEDS, needSuggestions } from '../../src/lib/akg/kb/goals';
import { extractContexts, contextValues } from '../../src/lib/akg/kb/contexts';

// ============================================================
// حاجةُ الحياة — ما وراء الطلب.
//
//   قياسٌ قبل البناء:
//       «بنتي داخلة للمدرسة» ⇒ نيّةٌ مجهولة (والسياق `occasion=مدرسة` مكتشَف!)
//       «غادي نتزوج»         ⇒ نيّةٌ مجهولة
//       «عندي مولود جديد»    ⇒ **عرضُ خدمة** — أبٌ جديدٌ يُعامَل كتاجر
//
//   السياقُ كان يُكتشَف **ولا أحدَ يستهلكه**. وهذه الاختباراتُ تحرس المستهلك.
// ============================================================

test('حالُ الحياة يُفهَم — لا صمتَ أمام «غادي نتزوج»', () => {
  const cases: [string, string][] = [
    ['غادي نتزوج', 'wedding'], ['بنتي داخلة للمدرسة', 'school'],
    ['عندي مولود جديد', 'new_baby'], ['تنقلت لدار جديدة', 'moving_home'],
    ['غادي نسافر', 'travel'],
  ];
  for (const [q, id] of cases)
    assert.equal(detectLifeNeed(q)?.id, id, `«${q}» ⇒ ${detectLifeNeed(q)?.id ?? 'لا شيء'}`);
});

test('الأبُ الجديدُ طالبٌ لا تاجر', () => {
  // **حارسُ صنف.** «عندي مولود جديد» تبدأ بـ«عندي» وهي علامةُ عرض، فكانت
  // تُقرأ `create_service`: يُساق الأبُ لينشر صفحةَ نشاطٍ تجاريّ.
  const r = parseNeed('عندي مولود جديد') as any;
  assert.notEqual(r.intent, 'create_service', 'ما زال يُعامَل عارضًا');
  assert.equal(r.stance, 'seek', `الاتّجاه ⇒ ${r.stance}`);
  assert.ok((r.steps?.[0]?.options?.length || 0) > 0, 'بلا اقتراحاتٍ يُفتح عليها');
});

test('الحاجةُ تعطي طريقًا لا كلامًا', () => {
  for (const q of ['غادي نتزوج', 'بنتي داخلة للمدرسة', 'تنقلت لدار جديدة']) {
    const r = parseNeed(q) as any;
    assert.notEqual(r.intent, 'unknown', `«${q}» ⇒ مجهولة`);
    const opts = r.steps?.[0]?.options || [];
    assert.ok(opts.length >= 3, `«${q}» ⇒ ${opts.length} اقتراحاتٍ فقط`);
    assert.ok(opts.every((o: any) => o.url || o.page), `«${q}» فيها خيارٌ بلا وجهة`);
  }
});

test('مَن يعرف ما يريد لا يُثرثَر عليه', () => {
  // «قفطان ديال العرس» مناسبتُه معروفةٌ لكنّ صاحبَها يعرف طلبَه. اقتراحُ
  // القاعةِ والتصويرِ عليه ضجيجٌ لا مساعدة.
  const r = parseNeed('بغيت قفطان ديال العرس') as any;
  assert.notEqual(r.label, 'العرس', 'ابتلعت الحاجةُ طلبًا واضحًا');
  assert.equal(r.intent, 'buy');
});

test('لا وعدَ بمفهومٍ لا وجودَ له', () => {
  // **الحارسُ الذي كشف أحدَ عشرَ خطأً عند أوّل كتابةٍ لهذا الملفّ.** مفهومٌ
  // يُعرَض على المستخدم ثمّ لا يُنتج نتيجةً واحدةً وعدٌ لا يُوفى.
  assert.deepEqual(phantomConcepts(), [], 'مفاهيمُ في الأهداف لا وجودَ لها في المعرفة');
  for (const n of LIFE_NEEDS) {
    assert.ok(n.concepts.length >= 3, `«${n.label}» ⇒ ${n.concepts.length} مفاهيمَ فقط`);
    assert.equal(needSuggestions(n).length, n.concepts.length, `«${n.label}» فيها مفهومٌ بلا اسم`);
  }
});

test('المناسبةُ تُكتَب مرّةً واحدة — لا إملاءَين', () => {
  // **مصدرٌ واحدٌ للحقيقة.** «عرس» و«مدرسة» و«عيد» مُعرَّفةٌ في `contexts.ts`
  // منذ زمن. نسخُها في الأهداف يعني إملاءَين ينحرفان بصمت، فالأهدافُ تشير
  // إلى قيمة السياق ولا تُعيد كتابةَ مصطلحاتها.
  const known = new Set(contextValues('occasion'));
  const orphans = LIFE_NEEDS.filter(x => x.occasion && !known.has(x.occasion)).map(x => x.occasion);
  assert.deepEqual(orphans, [], 'حاجةٌ تشير إلى مناسبةٍ لا وجودَ لها في السياقات');
});

test('القرابةُ جمهور — «لبنتي» في أوّل مثالٍ كتبه المالك', () => {
  // المغربيُّ لا يصف الجمهورَ بالفئة، يصفه بقرابته منه. وكان التطبيقُ يعرف
  // «ديال البنات» ولا يعرف «لبنتي».
  const pairs: [string, string][] = [
    ['بغيت لبسة لبنتي', 'بنت'], ['بغيت قفطان لولدي', 'ولد'],
    ['شي حاجة لمراتي', 'نساء'], ['حوايج لولادي', 'أطفال'],
  ];
  for (const [q, want] of pairs) {
    const a = extractContexts(q).find(c => c.key === 'audience');
    assert.equal(a?.value, want, `«${q}» ⇒ ${a?.value ?? 'لا جمهور'}`);
  }
  // وياءُ الملكيّة هنا لا تقلب الاتّجاه — بخلاف «داري».
  assert.equal((parseNeed('بغيت لبسة لبنتي') as any).stance, 'seek');
});
