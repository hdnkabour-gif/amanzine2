import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { categoryForConcept, CATEGORIES } from '../../src/lib/catalog';
import { allUIFields } from '../../src/lib/akg/uiContract';

// ============================================================
// وصولُ المعرفة — أن يبلغ ما تعرفه القاعدةُ **التاجرَ**، لا أن يبقى مخزّنًا.
//
//   العطبُ الذي حرسته هذه الاختبارات: `resolveConcept` كان يُرجع
//   `{ id, category, concept }` فقط، فتُرمى عند الباب:
//     • `services[]` — مملوءةٌ في ١٤٨ مفهومًا بمعرفةٍ مغربيّةٍ حقيقيّة
//     • `fields[]` · `examples[]`
//   فتعرف القاعدةُ أنّ السبّاكَ يفتح المجاري ويركّب السخانات، ويسأله
//   التطبيقُ «التخصّصات» في خانةِ نصٍّ حرٍّ فارغة.
//
//   والعطبُ الثاني: فئةُ «خدمة» كانت `concepts: []`، فلا مفهومَ يقود إليها،
//   وسبعةَ عشرَ حقلًا لا يبلغها المساعدُ أبدًا — فكان السبّاكُ والكهربائيُّ
//   والمصوّرُ يحملون **ثمانيةَ حقولٍ متطابقةً حرفًا بحرف**.
// ============================================================

test('resolveConcept يحمل المعرفةَ ولا يرميها عند الباب', () => {
  const c = resolveConcept('أنا سباك');
  assert.equal(c?.id, 'plumber');
  assert.ok((c?.services || []).length >= 5,
    'المعرفةُ عن السبّاك مكتوبةٌ في القاعدة ولا تصل — resolveConcept يُسقط services');
  assert.ok(c!.services!.some(s => s.includes('المجاري')));
});

test('كلُّ فهمٍ يحمل دليلَه — أيُّ مصطلحٍ طابق وبأيّ طريق', () => {
  // بلا هذا يبقى الفهمُ صندوقًا أسودَ: نعرف أنّ «تراكسي» صارت رياضةً ولا
  // نعرف لماذا، فلا نستطيع تصحيحَ خطأٍ ولا شرحَ قرارٍ للتاجر.
  for (const q of ['أنا سباك', 'بغيت نبيع تراكسي', 'بغيت نغسل الطوموبيل', 'je cherche un plombier']) {
    const c = resolveConcept(q);
    assert.ok(c, `«${q}» لم يُفهَم`);
    assert.ok(c!.matched?.term, `«${q}» ⇒ ${c!.id} بلا دليل: أيُّ مصطلحٍ طابق؟`);
    assert.ok(['composite', 'exact', 'latin', 'tokens'].includes(c!.matched!.via));
  }
});

test('التخصّصاتُ خياراتٌ من قاعدة المعرفة، لا خانةُ نصٍّ فارغة', () => {
  const cases: [string, string][] = [
    ['أنا سباك',    'المجاري'],
    ['أنا كهربائي', 'الإنارة'],
    ['أنا خياط',    'جلابة'],
  ];
  for (const [need, expect] of cases) {
    const f = allUIFields(need).find(x => x.key === 'specialties');
    assert.ok(f, `«${need}» بلا حقل تخصّصات`);
    const choices = f!.choices || [];
    assert.ok(choices.length >= 4, `«${need}»: التخصّصاتُ بلا خيارات — يُترك أمام صندوقٍ فارغ`);
    assert.ok(choices.some(c => c.includes(expect)),
      `«${need}»: الخياراتُ لا تحمل «${expect}» — ${choices.join(' · ')}`);
  }
});

test('السبّاكُ والكهربائيُّ لا يتساويان في الأسئلة', () => {
  // شكوى المالك في الجوهر: «أسئلة الخدمات ليست خاصّةً بالمهنة».
  const a = allUIFields('أنا سباك');
  const b = allUIFields('أنا كهربائي');
  const sa = a.find(f => f.key === 'specialties')?.choices || [];
  const sb = b.find(f => f.key === 'specialties')?.choices || [];
  assert.notDeepEqual(sa, sb, 'السبّاكُ والكهربائيُّ يُسألان السؤالَ نفسَه بالخيارات نفسِها');
});

test('كلُّ حرفةٍ تعرفها القاعدةُ تجد فئةً — بقاعدةٍ لا بقائمة', () => {
  // ١٦٠ مفهومًا لا تطالب بها فئةٌ صراحة. القاعدةُ: «مَن يَفعل، خدمة».
  // القائمةُ اليدويّةُ كانت ستصير المصدرَ الثامنَ وتتخلّف عند أوّل إضافة.
  const doers = (CONCEPTS as any[]).filter(c => (c.services || []).length > 0);
  assert.ok(doers.length > 100, 'قاعدةُ المعرفة فقدت خدماتِها');
  const homeless = doers.filter(c => !categoryForConcept(c.id));
  assert.deepEqual(homeless.map(c => c.id), [],
    `مفاهيمُ تعرف القاعدةُ ما تفعله ولا فئةَ لها: ${homeless.length}`);
});

test('لا فئةٌ في الكتالوج بلا طريقٍ يصل إليها', () => {
  // فئةٌ لا يقود إليها مفهومٌ ولا قاعدةٌ = حقولٌ مكتوبةٌ لا تُعرَض أبدًا.
  const BY_RULE = new Set(['service']);          // تُدرَك بقاعدة «مَن يَفعل»
  const DOORLESS_OK = new Set(['other', 'digital']); // بابُ ما لم يُصنَّف
  const unreachable = CATEGORIES
    .filter(c => !DOORLESS_OK.has(c.id) && !BY_RULE.has(c.id) && c.concepts.length === 0)
    .map(c => c.label);
  assert.deepEqual(unreachable, [],
    `فئاتٌ بحقولٍ لا يبلغها شيء: ${unreachable.join(' · ')}`);
});

test('المفاهيمُ التي تُطالب بها فئةٌ صراحةً موجودةٌ في قاعدة المعرفة', () => {
  // منعُ تكرارِ خطئي: كتبتُ مُعرِّفاتٍ من رأسي (`welder` · `locksmith` · …)
  // لا وجودَ لها، فكان الإعلانُ صحيحًا نحويًّا وفارغًا معنًى.
  const known = new Set((CONCEPTS as any[]).map(c => c.id));
  const ghosts: string[] = [];
  for (const c of CATEGORIES)
    for (const id of c.concepts) if (!known.has(id)) ghosts.push(`${c.id}:${id}`);
  assert.deepEqual(ghosts, [],
    `فئةٌ تطالب بمفهومٍ لا وجودَ له: ${ghosts.join(' · ')}`);
});
