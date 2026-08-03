import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory, categoryForConcept, baseFields, allFieldsFor } from '../../src/lib/catalog';
import { CATEGORY_FIELDS } from '../../src/data/categoryFields';
import { getPageCapability } from '../../src/lib/akg/registry';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { allUIFields } from '../../src/lib/akg/uiContract';

// ============================================================
// الكتالوج — مصدرٌ واحدٌ للفئات وحقولها.
//
//   ما لاحظه المالك: «المساعدُ الذكيّ يعطيني أسئلةً مغايرةً للتي في صفحة
//   المنتجات — لماذا؟» الجواب: قائمتان مكتوبتان يدويًّا في مكانين لا يعرف
//   أحدُهما الآخر. هذه الاختباراتُ تمنع عودتَهما.
// ============================================================

test('كلُّ فئةٍ لها حقولٌ — لا فئةَ تُعرَض ثمّ تُسلِّم استمارةً فارغة', () => {
  // «أخرى» وحدَها بلا حقول، وهي بابُ ما لم يُصنَّف — لا فئةُ بيعٍ حقيقيّة.
  const empty = CATEGORIES
    .filter(c => c.id !== 'other')
    .filter(c => (CATEGORY_FIELDS[c.id] || []).length === 0)
    .map(c => c.label);
  assert.deepEqual(empty, [],
    `فئةٌ تُعرَض في القائمة وتُسلِّم استمارةً فارغة: ${empty.join(' · ')}`);
});

test('العقلُ والاستمارةُ يقرآن نفسَ الحقول الأساسيّة', () => {
  const brain = (getPageCapability('products')?.fields || []).map(f => f.key).sort();
  const form  = baseFields('product').map(f => f.key).sort();
  assert.deepEqual(brain, form,
    'حقولُ العقل تخالف حقولَ الاستمارة — وهو سببُ اختلاف الأسئلة');
});

test('مجالاتُ المالك الثلاثة لها فئاتٌ حقيقيّة', () => {
  // قبل هذا: الملابس أربعُ فئاتٍ، والسيّاراتُ **صفر**، والمعلوميّاتُ **صفر** —
  // فمن يبيع قطعةَ غيارٍ أو هاتفًا يقع في «أخرى» وهي بلا حقلٍ واحد.
  for (const id of ['auto', 'auto_service', 'tech', 'tech_service', 'sport']) {
    const c = getCategory(id);
    assert.ok(c, `الفئة «${id}» غيرُ موجودة`);
    assert.ok((CATEGORY_FIELDS[id] || []).length >= 5,
      `«${c!.label}» بحقولٍ أقلَّ من أن تصف ما يُباع`);
  }
});

test('الفئةُ تُشتقّ من الفهم — «تراكسي» ⇒ رياضة', () => {
  const cases: [string, string][] = [
    ['بغيت نبيع تراكسي', 'sport'],
    ['بغيت نبيع صباط',   'shoes'],
    ['بغيت نبيع جلابة',  'women'],
    ['بغيت نبيع بنيو',   'auto'],
  ];
  for (const [q, expected] of cases) {
    const cat = categoryForConcept(resolveConcept(q)?.id);
    assert.equal(cat?.id, expected, `«${q}» ⇒ ${cat?.id ?? 'لا فئة'}`);
  }
});

test('لا مفهومَ يُطالَب به من فئتين', () => {
  const seen = new Map<string, string>();
  for (const c of CATEGORIES) {
    for (const concept of c.concepts) {
      const owner = seen.get(concept);
      assert.ok(!owner, `المفهوم «${concept}» تطالب به «${owner}» و«${c.id}» معًا`);
      seen.set(concept, c.id);
    }
  }
});

test('الخدماتُ تُسأل عن منطقة العمل، والمنتجاتُ عن المخزون', () => {
  // النوعُ يغيّر السؤال. استمارةٌ واحدةٌ لكلّ شيءٍ تسأل التاجرَ عمّا لا يعنيه.
  const svc = baseFields('service').map(f => f.key);
  const prod = baseFields('product').map(f => f.key);
  assert.ok(svc.includes('workArea'), 'الخدمةُ بلا منطقةِ عمل');
  assert.ok(!svc.includes('stock'), 'الخدمةُ لا مخزونَ لها');
  assert.ok(prod.includes('stock'), 'المنتجُ بلا مخزون');
  assert.ok(!prod.includes('workArea'));
});

test('الحقولُ الأساسيّةُ والخاصّةُ لا تتصادم في المُعرِّفات', () => {
  for (const c of CATEGORIES) {
    const { base, specific } = allFieldsFor(c.id);
    const baseKeys = new Set(base.map(f => f.key));
    const clash = specific.filter(f => baseKeys.has(f.id)).map(f => f.id);
    assert.deepEqual(clash, [],
      `«${c.label}»: حقلٌ خاصٌّ يحمل مُعرِّفَ حقلٍ أساسيّ (${clash.join(' · ')}) — أحدُهما يطمس الآخر`);
  }
});

// ============================================================
// العقلُ والاستمارةُ يسألان السؤالَ نفسَه.
//   شكوى المالك حرفيًّا: «صفحة المساعد تعطيني أسئلةً مغايرةً للتي في صفحة
//   المنتجات». كان ثلاثةُ مصادرَ للحقول لا مصدرًا واحدًا:
//     `categoryFields` (الاستمارة) · `akg/pages` (القدرات) · `blueprints` (المساعد)
//   وأربعُ قوائمَ للفئات، إحداها داخل القالب بستّ تسمياتٍ مختلفةٍ تمامًا.
// ============================================================

test('المساعدُ يسأل حقولَ الفئة نفسَها التي تسألها الاستمارة', () => {
  const cases: [string, string][] = [
    ['بغيت نبيع تراكسي', 'sport'],
    ['بغيت نبيع بنيو',   'auto'],
    ['بغيت نبيع لابتوب', 'tech'],
  ];
  for (const [need, catId] of cases) {
    const asked = new Set(allUIFields(need).map(f => f.key));
    const formFields = CATEGORY_FIELDS[catId] || [];
    assert.ok(formFields.length > 0, `${catId} بلا حقول`);
    const missing = formFields.filter(f => !asked.has(f.id)).map(f => f.label);
    assert.deepEqual(missing, [],
      `«${need}»: الاستمارةُ تسأل عمّا لا يسأل عنه المساعد: ${missing.join(' · ')}`);
  }
});

test('خيارات «الفئة» في القالب هي فئاتُ الكتالوج', () => {
  const asked = allUIFields('بغيت نبيع تلفون').find(f => f.key === 'category');
  assert.ok(asked, 'القالبُ بلا حقل فئة');
  const labels = CATEGORIES.map(c => c.label);
  assert.deepEqual(asked!.choices, labels,
    'قائمةُ فئاتٍ ثانيةٌ داخل القالب — تخالف ما تعرضه الاستمارة');
});

test('لا تسميتان متطابقتان في نموذجٍ واحد', () => {
  // حقلان اسمُهما «الحالة» في استمارةٍ واحدةٍ يجعلان التاجرَ يملأ أحدَهما
  // ظنًّا أنّه الآخر.
  for (const need of ['بغيت نبيع بنيو', 'بغيت نبيع لابتوب', 'عندي كسوة للبيع', 'أنا ميكانيسيان']) {
    const labels = allUIFields(need).map(f => f.label);
    const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
    assert.deepEqual([...new Set(dup)], [],
      `«${need}»: تسميةٌ مكرّرة — ${[...new Set(dup)].join(' · ')}`);
  }
});
