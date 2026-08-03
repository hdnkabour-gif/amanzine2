import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { allUIFields, buildUIStep } from '../../src/lib/akg/uiContract';
import { baseFields, UNIVERSAL_KEYS } from '../../src/lib/catalog';
import { allCapabilities as allPageCapabilities } from '../../src/lib/akg/registry';
import '../../src/lib/akg/pages';

// ============================================================
// خسائرُ البيانات — أخطرُ صنفٍ في المشروع، لأنّه **صامت**.
//
//   التاجرُ يملأ المقاسَ فيرى ✓، ثمّ لا يُحفَظ. لا رسالةَ خطأ، لا شيء.
//   وقعت أربعُ مرّاتٍ في دالّةٍ واحدة:
//     sizes: []  ·  colors: []  ·  cost: 0  ·  stock: 1
//   وخامسةً في الطرف الآخر: `city` سؤالٌ إجباريٌّ بلا عمودٍ في الجدول.
//
//   الاختباراتُ هنا تحرس **الصنفَ** لا الحالات الخمس: أيُّ قيمةٍ حرفيّةٍ
//   جديدةٍ فوق مفتاحٍ يسأل عنه العقلُ تُفشِل البناءَ فورًا.
// ============================================================

const SRC = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
/** يزيل التعليقاتِ حتّى لا يمرّ حارسٌ لأنّ الاسمَ ذُكر في شرح. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('لا قيمةَ ثابتةٌ فوق قيمةِ المستخدم في دوالّ التحويل', () => {
  // `cost: 0` تجعل كلَّ ربحٍ يبدو ١٠٠٪. `stock: 1` تُغلق البيعَ بعد أوّل طلبٍ
  // لمن عنده أربعون قطعة. `sizes: []` تبتلع ما مَلأه التاجر.
  const src = code(SRC('src/components/CreateFlow.tsx'));
  const GUARDED = ['sizes', 'colors', 'stock', 'cost', 'price', 'city', 'category'];
  const bad: string[] = [];
  for (const key of GUARDED) {
    // `key: 0` · `key: []` · `key: ''` — قيمةٌ حرفيّةٌ لا تقرأ شيئًا من القيم.
    const lit = new RegExp(`\\b${key}\\s*:\\s*(0\\b|\\[\\s*\\]|''|""|false\\b)(?!\\s*\\|\\||\\s*\\?\\?)`, 'g');
    if (lit.test(src)) bad.push(key);
  }
  assert.deepEqual(bad, [],
    `قيمةٌ ثابتةٌ تطمس ما يملؤه التاجر: ${bad.join(' · ')} — اقرأها من values`);
});

test('كلُّ مفتاحٍ يسأل عنه العقلُ له مستقرٌّ في قاعدة البيانات', () => {
  // «لا يُسأل عن معلومةٍ ليس لها مكانٌ تستقرّ فيه». `city` كان يُسأل إجباريًّا،
  // يُرسَل إلى الخادم، ولا عمودَ له — فيسقط صامتًا في آخر خطوة.
  const migrate = SRC('server/migrate.js');
  const dbjs    = SRC('server/database.js');
  const asked = new Set<string>();
  for (const need of ['بغيت نبيع تلفون', 'عندي كسوة العيد للبيع', 'بغيت نبيع بنيو', 'أنا سباك'])
    for (const f of allUIFields(need)) asked.add(f.key);

  assert.ok(/custom_fields/.test(migrate), 'لا عمودَ custom_fields — فلا مستقرَّ للحقول الخاصّة');

  // **أعمدةُ جدول المنتجات وحدَها.** البحثُ في الملفّ كلِّه كان يمرّ لأنّ
  // `city` موجودةٌ في جدولَي الزبناء والطلبات — فيقول الحارسُ «موجودة» وهي
  // غائبةٌ عن الجدول الذي يعنينا. حارسٌ يقرأ الملفَّ كلَّه حارسٌ لا يحرس.
  const createIdx = migrate.indexOf('CREATE TABLE IF NOT EXISTS products');
  assert.ok(createIdx > 0, 'لم يُعثر على تعريف جدول products');
  const createBlock = migrate.slice(createIdx, migrate.indexOf('`)', createIdx));
  const alters = [...migrate.matchAll(/ALTER TABLE products ADD COLUMN IF NOT EXISTS (\w+)/g)].map(m => m[1]);
  const columns = new Set([
    ...[...createBlock.matchAll(/^\s*(\w+)\s+(TEXT|NUMERIC|INTEGER|BOOLEAN|JSONB|TIMESTAMPTZ)/gm)].map(m => m[1]),
    ...alters,
  ]);

  const MUST_HAVE_COLUMN = ['title', 'price', 'city', 'photos', 'desc', 'category', 'stock', 'cost', 'sizes', 'colors'];
  const COLUMN_OF: Record<string, string> = { title: 'name', desc: 'description', photos: 'images' };
  const missing = MUST_HAVE_COLUMN
    .filter(k => asked.has(k))
    .filter(k => !columns.has(COLUMN_OF[k] || k));
  assert.deepEqual(missing, [],
    `يُسأل عنها ولا عمودَ لها في جدول products: ${missing.join(' · ')}`);

  // ووجودُ العمود لا يكفي: من يكتب ومن يقرأ يجب أن يعرفاه أيضًا.
  const unwired = MUST_HAVE_COLUMN
    .filter(k => asked.has(k))
    .map(k => COLUMN_OF[k] || k)
    .filter(col => !new RegExp(`\\b${col}\\b`).test(dbjs));
  assert.deepEqual(unwired, [],
    `عمودٌ موجودٌ ولا تعرفه database.js: ${unwired.join(' · ')}`);
});

test('حقلٌ واحدٌ باسمٍ واحد — عبر **كلّ** مصادر الحقول', () => {
  // كان `title` اسمُه «اسم المنتج» في الاستمارة و«العنوان» في السيناريو.
  // اختبارُ الكتالوج يقارن المفاتيحَ فمرّ هذا من تحته.
  //
  // ولا يكفي أن نقارن داخلَ `allUIFields`: بعد التوحيد صارت كلُّها تقرأ من
  // مصدرٍ واحد، فأصبح الحارسُ يقارن الشيءَ بنفسه ولا يفشل أبدًا. المقارنةُ
  // الصحيحةُ **بين المصادر**: الكتالوج · قدراتُ الصفحات · القالب.
  const seen = new Map<string, { label: string; where: string }>();
  const clash: string[] = [];
  const note = (key: string, label: string, where: string) => {
    const prev = seen.get(key);
    if (prev && prev.label !== label) clash.push(`${key}: «${prev.label}» (${prev.where}) ≠ «${label}» (${where})`);
    else if (!prev) seen.set(key, { label, where });
  };

  for (const f of baseFields('product')) note(f.key, f.label, 'catalog');
  for (const cap of allPageCapabilities())
    for (const f of cap.fields || []) note(f.key, f.label, `page:${cap.page}`);
  for (const need of ['بغيت نبيع تلفون', 'عندي كسوة العيد للبيع', 'بغيت نبيع بنيو', 'بغيت نكري دار'])
    for (const f of allUIFields(need)) note(f.key, f.label, 'assistant');

  assert.deepEqual([...new Set(clash)], [],
    `مفتاحٌ واحدٌ بتسميتين — التاجرُ يظنّهما حقلين:\n  ${[...new Set(clash)].join('\n  ')}`);
});

test('المفاتيحُ الكونيّةُ مصدرُها الكتالوج وحدَه', () => {
  // القالبُ الأمّ لم يعد يكتب حقولَه بيده. لو عاد لكتابتها لعادت الفجوةُ.
  const bp = code(SRC('src/lib/blueprints.ts'));
  const base = bp.slice(bp.indexOf("id: 'base'"), bp.indexOf("id: 'product'"));
  for (const k of UNIVERSAL_KEYS) {
    assert.ok(!new RegExp(`key:\\s*'${k}'`).test(base),
      `القالبُ الأمّ يكتب «${k}» بيده — يجب أن يشتقّه من catalog.baseFields`);
  }
});

test('المقاسُ واللونُ يُسألان لمن يبيع لباسًا', () => {
  // شكوى المالك: بائعُ كسوةِ العيد يُسأل عن **طولِ الطفل ووزنِه** ولا يُسأل
  // عن المقاسات التي عنده. سؤالان للمشتري لا للبائع.
  const keys = allUIFields('عندي كسوة العيد للبيع').map(f => f.key);
  for (const k of ['sizes', 'colors', 'stock'])
    assert.ok(keys.includes(k), `بائعُ اللباس لا يُسأل عن «${k}»`);
});

test('المقاساتُ المقترحةُ تأتي من الفئة', () => {
  const f = allUIFields('بغيت نبيع صباط').find(x => x.key === 'sizes');
  assert.ok(f, 'لا حقلَ مقاسات');
  assert.ok((f!.choices || []).includes('42'),
    'مقاساتُ الأحذية لا تُقترَح — يُترَك التاجرُ أمام صندوقٍ فارغ');
});

test('لا يُسأل بائعُ اللباس عن ضمانٍ ولا يُحرَم منه بائعُ الإلكترونيات', () => {
  const clothes = allUIFields('عندي كسوة العيد للبيع').map(f => f.key);
  const tech    = allUIFields('بغيت نبيع لابتوب').map(f => f.key);
  assert.ok(!clothes.includes('warranty'), 'ضمانةٌ على كسوةِ عيدِ طفل');
  assert.ok(tech.includes('warranty'), 'لابتوب بلا سؤالٍ عن الضمان');
});

test('نوعُ القيمة المتعدّدة له مكوّنٌ يرسمه', () => {
  // `tags` بلا مكوّنٍ في السجلّ = حقلٌ يُعرَض كنصٍّ فيضيع معناه.
  const vm = SRC('src/lib/akg/viewModel.ts');
  const reg = SRC('src/components/componentRegistry.tsx');
  const m = vm.match(/tagset:\s*'(\w+)'/);
  assert.ok(m, 'widget «tagset» بلا مكوّنٍ في ViewModel');
  assert.ok(new RegExp(`\\b${m![1]}\\b`).test(reg),
    `المكوّن «${m![1]}» غيرُ مسجَّلٍ في Component Registry`);
});

test('أساسُ الخدمة يسأل عن المدينة كما يسأل أساسُ المنتج', () => {
  for (const kind of ['product', 'service'] as const)
    assert.ok(baseFields(kind).some(f => f.key === 'city'),
      `أساسُ «${kind}» بلا مدينة`);
});

// ============================================================
// أقلُّ الأسئلة الكافية — «المستخدمُ لا يفكّر في الحقول، بل في: كيف نبيع بسرعة؟»
// ============================================================

test('ما ينقص يُقال بالاسم لا بنسبةٍ وحدَها', () => {
  // «اكتمل ٠٪» رقمٌ صحيحٌ حسابيًّا لا يقول للتاجر ما العمل. والمخطّطُ يعرف
  // الأسماءَ أصلًا — كان يختزلها إلى نسبةٍ ثمّ يعرض النسبةَ وحدَها.
  const s = buildUIStep('عندي كسوة العيد للبيع', {});
  assert.ok(Array.isArray(s.missing));
  assert.ok(s.missing.length > 0, 'إعلانٌ فارغٌ بلا شيءٍ ناقص؟');
  assert.ok(s.missing.every(m => typeof m === 'string' && m.length > 1));
});

test('ما افترضناه ليس ناقصًا — لا رسالتان متناقضتان عن حقلٍ واحد', () => {
  const s = buildUIStep('عندي كسوة العيد للبيع', {});
  const assumedLabels = s.assumptions.map(a => a.label);
  const both = s.missing.filter(m => assumedLabels.includes(m));
  assert.deepEqual(both, [],
    `حقلٌ يظهر في «ينقصك» وفي «افترضنا» معًا: ${both.join(' · ')}`);
});

test('الفئةُ تُشتقّ من الفهم فلا تُسأل', () => {
  // كان المحرّكُ يعرف أنّ «كسوة العيد» ⇒ أطفال، يستعمل ذلك لاختيار الحقول،
  // ثمّ يسأل التاجرَ «فأشمن فئة؟» — سؤالٌ جوابُه معروفٌ سلفًا.
  for (const [need, cat] of [['عندي كسوة العيد للبيع', 'أطفال'], ['بغيت نبيع تراكسي', 'رياضة']] as const) {
    const s = buildUIStep(need, {});
    assert.ok(!s.missing.includes('الفئة'), `«${need}»: الفئةُ تُسأل وهي معروفة`);
    assert.ok(s.assumptions.some(a => a.value === cat),
      `«${need}»: الفئةُ «${cat}» غيرُ معروضةٍ في «افترضنا» — تُستعمل بلا أن يراها التاجر`);
  }
});

test('كلُّ افتراضٍ يُعرَض ليُصحَّح — لا قرارَ صامت', () => {
  const s = buildUIStep('بغيت نبيع تراكسي', {});
  assert.ok(s.assumptions.length > 0, 'قراراتٌ تُتّخذ ولا تُعرَض');
  for (const a of s.assumptions) {
    assert.ok(a.key && a.label && a.value !== '', 'افتراضٌ ناقصُ العرض');
    assert.ok(['high', 'medium'].includes(a.confidence));
  }
});

test('لا عددَ حقولٍ في نصّ الدعوة — العددُ يُخيف ولا يُفيد', () => {
  const src = SRC('src/components/CreateFlow.tsx');
  assert.ok(!/\{fullFields\.length\}\s*حقل/.test(src),
    '«النموذج الكامل (٢٠ حقل)» عادت — العددُ ليس دعوة');
});
