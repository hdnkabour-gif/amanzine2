import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNeed } from '../../src/lib/needEngine';
import { inferValues } from '../../src/lib/inference';
import { decide } from '../../src/lib/akg/decision';
import { conceptGraph } from '../../src/lib/akg/kb/knowledgeGraph';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { categoryForConcept } from '../../src/lib/catalog';

// ============================================================
// أوّلُ خمسِ دقائق — اللحظةُ التي يُربَح فيها التاجرُ أو يُفقَد.
//
//   المشهدُ كما وصفه المالك: يدخل محلَّ حلاقةٍ في حي الألفة، يعطي الهاتفَ
//   للحلّاق ويقول «اكتب أنّ عندك محل حلاقة». وما يراه الحلّاقُ في الثواني
//   العشر التالية يقرّر كلَّ شيء.
//
//   وقياسٌ قبل الإصلاح كشف ثلاثةَ أعطابٍ تقتل تلك اللحظة:
//     ① التطبيقُ يعرف أنّه `barber` **ثمّ يسأله**: «حرفيّ ولا مهنيّ ولا محلّ؟»
//     ② خانةُ المهنة تُملأ بالجملة كاملةً: «محل حلاقة فحي الألفة الدار البيضاء»
//     ③ «الألفة» تُستخرَج بنجاحٍ ثمّ **تُرمى** — لا حقلَ يستقبلها
//
//   والقانونُ الذي تحرسه هذه الاختبارات، وهو أوّلُ دستور الحوار:
//   **لا تسأل سؤالًا تعرف جوابه.**
// ============================================================

const SHOP = 'عندي محل حلاقة فحي الألفة الدار البيضاء';

test('مَن يعرف الحرفةَ لا يسأل عنها', () => {
  // **حارسُ صنف.** كان `SELF` من طبقة النيّة الإنسانيّة يُجيب أوّلًا بسؤالِ
  // تصنيفٍ عامٍّ، فلا يصل الدورُ إلى المعرفة التي حلّت المفهومَ سلفًا.
  for (const q of ['عندي محل حلاقة', 'أنا حلاق', SHOP]) {
    const r = parseNeed(q) as any;
    assert.equal(r.intent, 'create_service', `«${q}» ⇒ ${r.intent}`);
    assert.ok(r.page || r.url, `«${q}» بلا وجهة — يقف التاجرُ أمام لا شيء`);
    const asks = (r.steps?.[0]?.clarifyId) || '';
    assert.notEqual(asks, 'service_kind', `«${q}» يُسأل عن مجالٍ معلوم`);
  }
});

test('المهنةُ مفهومٌ لا جملة', () => {
  // «المهنة: محل حلاقة فحي الألفة الدار البيضاء» أوّلُ ما يراه الحلّاق.
  const prof = inferValues('service', SHOP).find(v => v.key === 'profession');
  assert.ok(prof, 'لا مهنةَ مستنتَجة');
  assert.ok(!/محل|فحي|البيضاء/.test(String(prof!.value)),
    `المهنة = «${prof!.value}» — جملةٌ لا حرفة`);
  assert.ok(String(prof!.value).length <= 20, `اسمُ مهنةٍ من ${String(prof!.value).length} حرفًا`);
});

test('المدينةُ والحيُّ يُستخرجان معًا — والقُربُ هو ما يُقنع الزبون', () => {
  const v = inferValues('service', SHOP);
  assert.equal(v.find(x => x.key === 'city')?.value, 'الدار البيضاء');
  assert.equal(v.find(x => x.key === 'district')?.value, 'الألفة',
    'الحيُّ يُستخرَج ثمّ يُرمى — لا حقلَ يستقبله');
});

test('كلُّ ما يُستنتَج له خانةٌ تستقبله', () => {
  // **الوجهُ المقلوب لقانون «لا سؤالَ بلا مستقرّ»**: جوابٌ نعرفه ولا خانةَ له
  // ضياعٌ صامتٌ أيضًا — التاجرُ يُسأل عمّا قاله سلفًا.
  const fields = new Set(decide(SHOP, {}).fields.map(f => f.key));
  for (const k of ['profession', 'city', 'district', 'specialties', 'phone', 'photos'])
    assert.ok(fields.has(k), `«${k}» يُستنتَج بلا خانة`);
});

test('التطبيقُ يقترح الخدماتِ ولا ينتظر أن يفكّر التاجر', () => {
  // جوهرُ الفكرة: الحلّاقُ لا يفكّر، التطبيقُ يقترح وهو يختار. والمعرفةُ
  // تعرف خمسَ خدماتٍ للحلّاق منذ البداية — لو بقيت خانةً فارغةً لَكتب
  // «حلاقة» وحدَها ومضى.
  const spec = decide(SHOP, {}).fields.find(f => f.key === "specialties") as any;
  assert.ok(spec, 'لا خانةَ تخصّصات');
  assert.ok((spec.options || []).length >= 3,
    `${(spec.options || []).length} خدماتٍ مقترحةٍ فقط — والمعرفةُ تعرف أكثر`);

  // ونفسُ المعرفةِ تخدم كلَّ حرفةٍ لا الحلاقةَ وحدَها.
  for (const w of ['سباك', 'كهربائي', 'نجار', 'ميكانيكي', 'حلاق', 'مصور']) {
    const id = resolveConcept(w)?.id;
    assert.ok(id, `«${w}» غيرُ محلول`);
    assert.ok((conceptGraph(id!)?.services || []).length > 0, `«${w}» بلا خدماتٍ معروفة`);
  }
});

test('لا حرفةَ بلا خدماتٍ تعرفها — سقّاطة', () => {
  // **سقّاطةٌ تنزل ولا تصعد.** كانت ١١ حرفةً من ١٤٧ بلا خدماتٍ معروفة، وفيها
  // الميكانيكيُّ ومصلّحُ الهواتف — أوّلُ ما يُزار ميدانيًّا. والخانةُ الفارغةُ
  // تعني أنّ التاجرَ يكتب «ميكانيك» وحدَها ويمضي، فلا يعرف الزبونُ إن كان
  // يُصلح المحرّكَ أم يُغيّر الزيت.
  const bare = CONCEPTS
    .filter(c => categoryForConcept(c.id)?.kind === 'service')
    .filter(c => !(conceptGraph(c.id)?.services || []).length)
    .map(c => c.id);
  assert.ok(bare.length <= 0, `${bare.length} حرفةً بلا خدمات: ${bare.slice(0, 8).join(' · ')}`);
});
