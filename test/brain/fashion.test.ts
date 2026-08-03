import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { categoryForConcept } from '../../src/lib/catalog';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { expandQuery } from '../../src/lib/searchIntent';
import { extractContexts, allContextTerms } from '../../src/lib/akg/kb/contexts';
import { buildUIStep } from '../../src/lib/akg/uiContract';

// ============================================================
// مجالُ الملابس — المجالُ الأوّل للمالك.
//
//   قِيس قبل هذه الدفعة: ١١٣ مصطلحًا يستعملها المغاربةُ في بيع الملابس
//   وشرائها. يفهم منها المحرّكُ ٣٩ ويوجّهها صحيحًا؛ **٦١ لا تُفهَم إطلاقًا،
//   و١٣ تُفهَم وتذهب لغير مكانها**.
//
//   هذه الاختباراتُ تحرس التغطيةَ لا الحالات: قائمةٌ حقيقيّةٌ من السوق،
//   وكلُّ مصطلحٍ فيها يجب أن يُفهَم **ويقع في فئةِ أزياء**.
// ============================================================

const FASHION_CATS = ['men', 'women', 'kids', 'shoes', 'access', 'sport', 'clothes'];

/** كلُّ ما يقوله المغاربةُ حين يبيعون لباسًا — بالأربع لغات. */
const TERMS: [string, string[]][] = [
  ['عامّ · عربيّة',   ['ملابس', 'لباس', 'ثياب', 'أزياء', 'ألبسة', 'موضة']],
  ['عامّ · دارجة',    ['حوايج', 'حويج', 'حويجات', 'لبسة', 'كسوة', 'تصبينة', 'لبسة الدار', 'لبسة الخروج']],
  ['عامّ · فرنسيّة',  ['vetement', 'vetements', 'habits', 'mode', 'tenue', 'friperie']],
  ['عامّ · إنجليزيّة', ['clothes', 'clothing', 'fashion', 'garment', 'apparel', 'outfit']],
  ['جُمَلُ بيع',      ['عندي كسوة للبيع', 'كنبيع الحوايج', 'بغيت نبيع اللباس', 'بيع الأزياء']],
  ['نساء',            ['ملابس نسائية', 'حوايج ديال العيالات', 'womenswear', 'vetements femme']],
  ['رجال',            ['ملابس رجالية', 'حوايج ديال الرجال', 'menswear', 'vetements homme']],
  ['أطفال',           ['دراري', 'بيبي', 'رضيع', 'مواليد', 'ملابس أطفال', 'vetements enfant', 'toddler']],
  ['قميص وتيشيرت',    ['قميص', 'شوميز', 'تيشيرت', 'تيشورت', 'chemise', 'shirt', 'tee', 'polo']],
  ['سروال',           ['سروال', 'بنطلون', 'جينز', 'جين', 'دينيم', 'pantalon', 'jean', 'jeans']],
  ['فستان',           ['فستان', 'روب', 'robe', 'dress']],
  ['تقليديّ',         ['جلابة', 'جلابية', 'قفطان', 'تكشيطة', 'عباية', 'قندورة', 'djellaba', 'caftan', 'takchita', 'abaya']],
  ['محتشم',           ['حجاب', 'خمار', 'سبنية', 'voile', 'hijab', 'headscarf']],
  ['جاكيت ومعطف',     ['جاكيت', 'سترة', 'معطف', 'بالطو', 'veste', 'manteau', 'jacket', 'coat']],
  ['سويت',            ['هودي', 'سويت', 'سويتر', 'pull', 'sweat', 'hoodie', 'sweater']],
  ['رياضيّ',          ['تراكسي', 'ترينينغ', 'سبور', 'survetement', 'tracksuit', 'sportswear']],
  ['نوم',             ['بيجامة', 'ملابس النوم', 'pyjama', 'pajamas', 'sleepwear']],
  ['مستعمَل',         ['بالة', 'فريب', 'حوايج مستعملة', 'friperie', 'thrift']],
  ['أقمشة',           ['طوب', 'أقمشة', 'قماش', 'tissu', 'fabric', 'textile']],
];

test('كلُّ ما يقوله المغاربةُ عن الملابس يُفهَم ويقع في الأزياء', () => {
  const unknown: string[] = [];
  const misrouted: string[] = [];
  for (const [group, terms] of TERMS) {
    for (const t of terms) {
      const c = resolveConcept(t);
      if (!c) { unknown.push(`${group}: ${t}`); continue; }
      const cat = categoryForConcept(c.id);
      if (!cat || !FASHION_CATS.includes(cat.id)) misrouted.push(`${group}: ${t} ⇒ ${c.id}/${cat?.id ?? '—'}`);
    }
  }
  assert.deepEqual(unknown, [], `مصطلحاتٌ لا يفهمها المحرّك:\n  ${unknown.join('\n  ')}`);
  assert.deepEqual(misrouted, [], `مصطلحاتٌ تُفهَم وتذهب لغير مكانها:\n  ${misrouted.join('\n  ')}`);
});

test('المصطلحُ القصير لا يُطابَق داخلَ كلمةٍ أخرى', () => {
  // «تصبينة» ⇒ بقّال (لأنّ «صبي» داخلها) · «garment» ⇒ سيّارة (لأنّ فكَّ
  // الـArabizi يعطي «كارمنت» وفيها «كار»). صنفٌ لا حالتان — وقع ثلاثَ مرّاتٍ
  // في هذا المشروع، آخرُها من خطأٍ مطبعيٍّ جعل «كندير الحلويات» تشخيصَ سيّارات.
  const cases: [string, string][] = [
    ['garment', 'car'],
    ['clothes', 'car'],
  ];
  for (const [q, wrong] of cases) {
    const c = resolveConcept(q);
    assert.notEqual(c?.id, wrong, `«${q}» تُطابَق داخلَ كلمةٍ أخرى ⇒ ${wrong}`);
  }

  // **كناريا**: كلماتٌ دارجةٌ شائعةٌ **لا يملكها أيُّ مفهوم**، وتحمل داخلها
  // مصطلحاتٍ قصيرةً حقيقيّة («كار» في «كارطة» · «صبي» في «صبيانو» · «بيع» في
  // «بيعتها»). لو عاد الحدُّ ساقطًا لأجاب المحرّكُ عنها جوابًا واثقًا خاطئًا —
  // وهو أسوأُ من الصمت. لا تُدرَج في قاعدة المعرفة أبدًا.
  for (const w of ['كارطة', 'مكارية', 'صبيانو', 'كارنيه', 'بيعتها', 'شرايطي']) {
    const c = resolveConcept(w);
    assert.equal(c, null,
      `«${w}» كلمةٌ عاديّةٌ فُهمت مفهومًا (${c?.id}) — طابقت «${c?.matched?.term}» داخلَها`);
  }
});

test('الفعلُ العامُّ لا يملكه مفهوم', () => {
  // `real_estate_agency` كان يُطالب بـ«بيع» و«شراء»، فكلُّ جملةٍ فيها «بيع»
  // تصير سمسارًا عقاريًّا — ومنها «بيع الأزياء».
  for (const q of ['بيع الأزياء', 'بيع الحوايج', 'شراء ملابس']) {
    const c = resolveConcept(q);
    assert.notEqual(c?.id, 'real_estate_agency',
      `«${q}» ⇒ سمسار عقاريّ — فعلٌ عامٌّ يملكه مفهومٌ لا يخصّه`);
  }
});

test('اللغاتُ الأربعُ تصل إلى المفهوم نفسِه', () => {
  const same: [string, string[]][] = [
    ['traditional_clothing', ['جلابة', 'جلابية', 'djellaba', 'caftan']],
    ['sportswear',           ['تراكسي', 'ترينينغ', 'survetement', 'tracksuit']],
    ['kids_clothing',        ['دراري', 'ملابس أطفال', 'vetements enfant', 'kids clothing']],
    ['modest_wear',          ['حجاب', 'خمار', 'voile', 'hijab']],
  ];
  for (const [id, words] of same)
    for (const w of words)
      assert.equal(resolveConcept(w)?.id, id, `«${w}» لا تصل إلى ${id}`);
});

test('الزبونُ يجد بأيّ لغةٍ كتب', () => {
  for (const q of ['حوايج', 'قفطان', 'hijab', 'pyjama', 'vetements femme', 'دراري', 'بالة']) {
    const it = expandQuery(q);
    assert.ok(it.concept, `«${q}» لا تُفهَم في البحث`);
    assert.ok(it.terms.length >= 3, `«${q}» توسّعت بمرادفٍ واحدٍ فقط`);
    assert.ok(FASHION_CATS.includes(it.category || ''),
      `«${q}» تُوجَّه إلى ${it.category ?? '—'} لا إلى الأزياء`);
  }
});

// ============================================================
// السياقات — ما يَصِف المبيعَ ولا يكونه.
//
//   «نسائي» و«شتوي» و«ديال العيد» ليست أشياءَ تُباع بل صفاتٌ لما يُباع.
//   كانت في فهرس المفاهيم، والفهرسُ يفوز فيه الأطول — فغلبت الصفةُ الموصوف:
//
//       «صباط ديال الرجال»   ⇒ ملابس رجال   (والحذاءُ ضاع)
//       «تراكسي ديال البنات» ⇒ ملابس نساء   (والرياضةُ ضاعت)
// ============================================================

test('الوصفُ لا يغلب الموصوف', () => {
  const cases: [string, string][] = [
    ['صباط ديال الرجال',        'shoe_store'],
    ['تراكسي ديال البنات',       'sportswear'],
    ['تراكسي شتوي ديال البنات',  'sportswear'],
    ['قفطان ديال العيالات',      'traditional_clothing'],
    ['كسوة العيد ديال الدراري',  'eid_clothing'],
  ];
  for (const [q, expected] of cases) {
    const c = resolveConcept(q);
    assert.equal(c?.id, expected,
      `«${q}» ⇒ ${c?.id} (طابق «${c?.matched?.term}») — الوصفُ غلب الموصوف`);
  }
});

test('السياقُ يُلتقَط ومعه سببُه', () => {
  const cases: [string, string, string][] = [
    ['عندي كسوة شتوية للبنات',    'season',   'شتاء'],
    ['عندي كسوة شتوية للبنات',    'audience', 'نساء'],
    ['عندي تراكسي صيفي للرجال',   'season',   'صيف'],
    ['كسوة ديال العيد',           'occasion', 'عيد'],
    ['حوايج ديال المدرسة',        'occasion', 'مدرسة'],
    ['روب ديال العرس',            'occasion', 'عرس'],
  ];
  for (const [need, key, value] of cases) {
    const hit = extractContexts(need).find(c => c.key === key);
    assert.ok(hit, `«${need}» لم يُلتقَط منه ${key}`);
    assert.equal(hit!.value, value, `«${need}» ⇒ ${key}=${hit!.value}`);
    assert.ok(hit!.because, `${key} بلا سبب — قرارٌ لا يُشرَح ولا يُصحَّح`);
  }
});

test('السياقُ يُجيب فلا يُسأل', () => {
  // من كتب «كسوة شتوية للبنات» قال الموسمَ والجمهورَ بنفسه — وكان التطبيقُ
  // يسألهما بعدها. سؤالٌ جوابُه في السطر نفسِه.
  const s = buildUIStep('عندي كسوة شتوية للبنات', {});
  const labels = s.assumptions.map(a => a.label);
  assert.ok(labels.includes('الموسم'), `الموسمُ لا يُفترَض — ${labels.join(' · ')}`);
  assert.ok(!s.missing.includes('الموسم'), 'الموسمُ ناقصٌ وقد قِيل صراحةً');
  // وكلُّ افتراضٍ يحمل سببَه ليُعرَض للتاجر.
  const season = s.assumptions.find(a => a.label === 'الموسم');
  assert.equal(season?.because, 'شتوية', 'الافتراضُ بلا سببٍ يُعرَض');
});

test('لا مصطلحَ سياقٍ داخلَ فهرس المفاهيم', () => {
  // حارسُ الصنف: عودةُ «ديال الرجال» أو «شتوي» إلى مفهومٍ تُعيد العطبَ كلَّه.
  const ctx = new Set(allContextTerms().map(t => t.toLowerCase().trim()));
  // ما حمل الاسمَ معه مسموح: «حوايج ديال الرجال» فيها الموصوفُ والصفةُ معًا.
  const offenders: string[] = [];
  for (const c of CONCEPTS as any[])
    for (const list of Object.values(c.variants || {}) as string[][])
      for (const t of list || []) {
        const k = String(t).toLowerCase().trim();
        if (ctx.has(k)) offenders.push(`${c.id}: «${t}»`);
      }
  assert.deepEqual(offenders, [],
    `مصطلحُ سياقٍ داخلَ فهرس المفاهيم — سيغلب الموصوفَ:\n  ${offenders.join('\n  ')}`);
});

test('لا مصطلحَ يملكه مفهومان في الأزياء', () => {
  // «كسوة» كانت لـ`clothing` و`eid_clothing` معًا، و«تنورة» لـ`garment_bottom`
  // و`garment_dress`. المصطلحُ المشترَك يجعل الفهمَ رهنَ ترتيبِ الفهرس.
  const FASHION_IDS = ['clothing', 'mens_clothing', 'womens_clothing', 'kids_clothing',
    'baby_clothing', 'garment_top', 'garment_bottom', 'garment_outerwear', 'garment_dress',
    'traditional_clothing', 'sportswear', 'eid_clothing', 'used_clothing', 'fabric_shop',
    'modest_wear', 'sleepwear'];
  const owner = new Map<string, string>();
  const clash: string[] = [];
  for (const c of CONCEPTS as any[]) {
    if (!FASHION_IDS.includes(c.id)) continue;
    for (const list of Object.values(c.variants || {}) as string[][])
      for (const t of list || []) {
        const k = String(t).toLowerCase().trim();
        const prev = owner.get(k);
        if (prev && prev !== c.id) clash.push(`«${t}» ⇒ ${prev} | ${c.id}`);
        else owner.set(k, c.id);
      }
  }
  assert.deepEqual([...new Set(clash)], [],
    `مصطلحٌ يملكه مفهومان — الفهمُ رهنُ ترتيب الفهرس:\n  ${[...new Set(clash)].join('\n  ')}`);
});
