import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { abilityFor } from '../../src/lib/abilities';
import { decideExecution } from '../../src/lib/executionPolicy';
import { liveSentenceFor, fillsSlot, type Slot } from '../../src/lib/liveSentence';
import { readAmount } from '../../src/lib/money';

// ============================================================
// **الجملةُ الحيّة** — كلامُ الإنسان نفسُه هو الواجهة.
//
//   لا نافذةَ ولا صفحة: ما فُهم يظهر قطعةً مُثبَتة، وما نقص فراغًا في سطره:
//
//       بغيت نبدل الثمن ديال ⟨👗 كسوة · ١٨٩ درهم⟩ ل [ ___ ] درهم
//
//   وهي طبقةُ **عرضٍ** لا عقلٌ سادس: لا نيّةَ جديدة، ولا محرّك، ولا عقد.
//   فلو حُذفت بقي التطبيقُ يفهم ويقرّر كما هو — وهذا ما تحرسه الاختبارات.
// ============================================================

const P = { id: 'p1', name: 'Ensemble bébé rose', note: 'الثمن دابا ١٨٩ درهم', icon: '📦' };
const build = (s: string, subject?: typeof P) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const m = abilityFor({ action: u.action, intent: r?.intent, stance: u.stance } as any);
  return { u, m, ls: liveSentenceFor(s, u, m, subject ? { subject } : undefined) };
};

test('**«أيّ منتوج؟» لا تُسأل حين يكون المنتوجُ مرئيًّا** — والفراغُ هو السؤال', () => {
  const { ls } = build('بغيت نبدل الثمن ديال الكسوة', P);
  assert.ok(ls, 'ما تبناتش الجملةُ الحيّة');
  assert.equal(ls!.subject?.name, P.name, 'المنتوجُ غيرُ معروضٍ — فسيُسأل عنه');
  assert.equal(ls!.field, 'الثمن');
  assert.deepEqual(ls!.slots.map(s => s.need), ['price'], 'الفراغُ ليس الثمن');
  assert.equal(ls!.raw, 'بغيت نبدل الثمن ديال الكسوة', 'أُعيدت صياغةُ كلامه — والجملةُ جملتُه');
});

test('والفراغُ يُشتقّ ولا يُكتَب — من `unmetNeeds` وشرطِ الحقل نفسِه', () => {
  // النقصُ مُعلَنٌ في قائمتَين: `UPDATE_PRODUCT.needs` مفاتيحُ مصنَّفة، و
  // `actions.ts` يدفع «بشحال؟» **نصًّا حرًّا**. فلو قُرئت الأولى وحدَها لَما
  // ظهر فراغُ الثمن أصلًا — وهذا ما وقع في أوّل قياس.
  const said = build('بدل الثمن ل 179 درهم', P);
  assert.equal(said.ls, null, 'ظهر فراغُ ثمنٍ وقد ذُكر الثمنُ في الجملة');
  assert.equal(readAmount('بدل الثمن ل 179 درهم'), 179);
});

test('وتصمت حيث لا تنفع — أغلبُ الجمل', () => {
  for (const s of ['وريني الطلبات', 'بغيت نبيع', 'عندي مشكل فالدار',
                   'بغيت نبيع شي حاجة جديدة', 'حيد هاد المنتوج', 'كنقلب على حداد']) {
    assert.equal(build(s, P).ls, null, `«${s}» بنت جملةً حيّةً بلا داعٍ`);
  }
});

test('ولا تُبنى على قراءةٍ ضعيفة — ٠٫٣٥ تعني فعلًا بلا هدف', () => {
  // «بغيت نغير حياتي» تُقرأ `update/settings` بثقة ٠٫٣٥. ولو بُنيت عليها
  // جملةٌ حيّةٌ لعُرض على الإنسان حقلٌ لم يطلبه أحد.
  const { u, ls } = build('بغيت نغير حياتي', P);
  assert.ok((u.action?.confidence ?? 0) < 0.5, 'تغيّرت القراءةُ — لم تعد هذه الحالةَ المقيسة');
  assert.equal(ls, null, 'قراءةٌ ضعيفةٌ فتحت حقلًا');
});

// ============================================================
// **نقطة ⑬: الرقمُ المجرّدُ يملأ الفراغَ المعلَّق.**
//
//   `readAmount('179')` تُرجع `undefined` — و**هذا صواب**: «عندي ٣ ديال
//   المحلات» يجب ألّا تُقرأ ثلاثةَ دراهم، وتوسيعُ القارئ العامّ يُفسد جملًا
//   كثيرة. فلم يُمَسّ `money.ts`.
//
//   والفرقُ أنّ **الفراغَ المعلَّق يمنح الرقمَ معناه**: من سُئل «بشحال؟»
//   وأجاب «179» أجاب بلا لبس. فالسياقُ يرخّص لا القارئ.
// ============================================================

test('«179» تملأ فراغَ الثمن — ولا تُقرأ ثمنًا بلا فراغ', () => {
  const slot: Slot = { need: 'price', ask: 'بشحال؟', unit: 'درهم' };
  assert.equal(fillsSlot(slot, '179'), '179');
  assert.equal(fillsSlot(slot, '١٧٩'), '179', 'الأرقامُ العربيّةُ لا تُقرأ');
  assert.equal(fillsSlot(slot, '179.50'), '179.50');
  assert.equal(fillsSlot(slot, '179 درهم'), '179');
  // وبلا فراغٍ يبقى القارئُ العامُّ محافظًا كما هو — وهو المقصود.
  assert.equal(readAmount('179'), undefined, 'صار الرقمُ المجرّدُ ثمنًا في كلّ جملة');
});

test('ولا يُخمَّن على كلامٍ لم يُقصَد به الملء', () => {
  const slot: Slot = { need: 'price', ask: 'بشحال؟', unit: 'درهم' };
  for (const bad of ['بغيت نمشي', '179 حاجة أخرى', '', '   ', 'لا']) {
    assert.equal(fillsSlot(slot, bad), null, `«${bad}» مَلأت الفراغَ وهي ليست جوابًا`);
  }
});

test('والحفظُ يمرّ بنفس الحَكَم — لا بابَ ثانيًا يتجاوزه', () => {
  // ما تفعله `fillSlot` في الشاشة: تُعيد القيمةَ **جملةً** فتُقرأ وتُحكَم
  // كأيّ كلامٍ كتبه الإنسان. ولو حُفظ من الواجهة مباشرةً لصار للتطبيق
  // بابان: واحدٌ يمرّ بالسياسة وآخرُ يتجاوزها.
  const said = 'بدّل الثمن ديال هاد المنتوج ل 179 درهم';
  const u = understand(said) as any;
  const r = parseNeed(said, {} as any) as any;
  const m = abilityFor({ action: u.action, intent: r?.intent, stance: u.stance } as any);
  const v = decideExecution(u, m || undefined, false,
    { lastProduct: { id: 'p1', name: 'Ensemble bébé rose' }, raw: said } as any);
  assert.equal(m?.id, 'UPDATE_PRODUCT');
  assert.ok(v.verdict === 'execute' || v.verdict === 'confirm',
    `الحَكَمُ قال «${v.verdict}» — فلن يُحفَظ شيءٌ بعد ملء الفراغ`);
});

test('وهي طبقةُ عرضٍ لا عقل — حذفُها لا يُغيّر فهمًا ولا حكمًا', () => {
  // الحارسُ الذي يمنعها أن تصير محرّكًا خامسًا: نفسُ الجملة تُقرأ وتُحكَم
  // بلا أن تُستدعى الطبقةُ أصلًا، والنتيجةُ هي هي.
  const s = 'بغيت نبدل الثمن ديال الكسوة';
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  assert.equal(u.action?.object, 'price');
  // ── **والنيّةُ الخشنةُ تقرؤها شراءً — والفعلُ هو الذي يصدق** ────
  //   «الكسوة» بضاعةٌ فتُقرأ النيّةُ `buy`، والفعلُ المقروءُ `update/price`.
  //   و`abilityFor` تجرّب **الفعلَ أوّلًا** فتُصيب. سجّلتُ هنا ما قِيس لا ما
  //   توقّعتُه: كتبتُ `manage` فسقط الحارس، والكودُ كان محقًّا.
  assert.equal(r.intent, 'buy', 'تغيّرت النيّةُ الخشنة — يُراجَع أثرُها على المطابقة');
  assert.equal(abilityFor({ action: u.action, intent: r.intent, stance: u.stance } as any)?.id,
    'UPDATE_PRODUCT', 'المطابقةُ ما بقاتش تُقدّم الفعلَ على النيّة — فالثمنُ صار شراءً');
});
