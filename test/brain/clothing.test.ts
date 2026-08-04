import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { resolveConcept, resolveConcepts, registerRuntimeConcepts } from '../../src/lib/akg/kb/knowledge';
import { detectFacts } from '../../src/lib/akg/kb/facts';

// ============================================================
// بائعةُ الملابس من بيتها — زيارةٌ ميدانيّة.
//
//   الجملُ أدناه منطوقةٌ حرفيًّا: أربعٌ من لسان البائعة، وأربعَ عشرةَ من
//   لسان زبائنها على الواتساب. وقياسٌ قبل هذه الدفعة قال: **اثنتا عشرةَ من
//   أربعَ عشرةَ جملةَ زبونةٍ لا تُفهَم إطلاقًا**، واثنتان تُفهَمان خطأً —
//   «واش كاين التوصيل» تُفهَم **مطعمًا**، و«كنبيع كسيوات» **سمسارًا عقاريًّا**.
//
//   والسببُ لم يكن نقصَ مفردات: **لا واحدةَ من أسئلة الزبونة تسأل عن مفهوم**.
//   كلُّها تسأل عن واقعةٍ عن نسخة — الموقع، التوفّر، المقاس، الثمن، التوصيل.
//   وهي القاعدة ① في عقد المعرفة. فكان المحرّكُ يفتّش عن مهنةٍ في جملةٍ لا
//   مهنةَ فيها، فيصمت أو يُصيب مصرفًا.
// ============================================================

// ── لسانُ البائعة ─────────────────────────────────────────────
test('«كنبيع كسيوات ديال الدراري الصغار» ⇒ ملابسُ أطفالٍ لا سمسارٌ عقاريّ', () => {
  const u = understand('كنبيع كسيوات ديال الدراري الصغار');
  assert.equal(u.service, 'kids_clothing');
  assert.equal(u.stance, 'offer');
});

test('جملةٌ واحدةٌ تحمل بضاعتَها كلَّها ⇒ تُستخرَج كلُّها', () => {
  // كان `resolveConcept` يقف عند أوّل إصابة، فتُسجَّل بضاعةٌ من ثلاث.
  const ids = resolveConcepts('عندي كسيوات، ملابس أطفال، الطرطاقت، اونصومبلات').map(c => c.id);
  assert.ok(ids.includes('kids_clothing'));
  assert.ok(ids.includes('baby_onesies'));
  assert.ok(ids.includes('clothing_sets'));
});

test('«كاين التوصيل لجميع المدن» ⇒ واقعةُ توصيلٍ لا مفهوم', () => {
  assert.deepEqual(detectFacts('كاين التوصيل لجميع المدن'), ['delivery']);
});

// ── كلماتٌ لا يعرفها قاموس ────────────────────────────────────
test('«طرطاقة» ملابسٌ داخليّةٌ للرضّع — لا يعرفها أيُّ قاموس', () => {
  assert.equal(resolveConcept('بغيت طرطاقات')?.id, 'baby_onesies');
  assert.equal(resolveConcept('واش عندك طرطاقة')?.id, 'baby_onesies');
});

test('«اونصومبل» طقمٌ كامل', () => {
  assert.equal(resolveConcept('بغيت اونصومبل ديال الدراري')?.id, 'clothing_sets');
});

// ── المتلقّي يحسم — بلا أن يبتلع الأخصّ ────────────────────────
test('«كسوة لبنتي» ملابسُ أطفال، و«كسوة» وحدَها عامّة', () => {
  assert.equal(resolveConcept('بغيت شي كسوة لبنتي')?.id, 'kids_clothing');
  assert.equal(resolveConcept('بغيت كسوة')?.id, 'clothing');
});

test('التخصيصُ لا يبتلع ما هو أخصُّ منه', () => {
  // هذان كسرَتهما القاعدةُ حين كانت تسبق الفهرس. الحارسُ هنا يمنع عودتَها.
  assert.equal(resolveConcept('بغيت حوايج للبيبي')?.id, 'baby_clothing');
  assert.equal(resolveConcept('كسوة العيد ديال الدراري')?.id, 'eid_clothing');
});

// ── الكلماتُ العامّة لا يملكها مفهوم ───────────────────────────
test('«واش كاين» لا تُصيب مطعمًا، و«بيع» لا تُصيب سمسارًا', () => {
  // كانتا متغيّرَين مسجَّلَين، فتبتلعان بابًا كاملًا من الكلام.
  assert.notEqual(resolveConcept('واش كاين التوصيل')?.id, 'restaurant');
  assert.notEqual(resolveConcept('كنبيع كسيوات')?.id, 'real_estate_agency');
});

test('الأدمن لا يستطيع تسجيلَ كلمةٍ عامّةٍ متغيّرًا — ولو بحسن نيّة', () => {
  // بابٌ خلفيّ: الملفُّ المولَّد محميٌّ بـDISOWNED، لكنّ ما يُضاف من الواجهة
  // يدخل الفهرسَ مباشرةً. تاجرٌ يكتب «بغيت» متغيّرًا لمحلّه يبتلع كلَّ طلبٍ
  // في التطبيق. الحارسُ يُسقطها عند البناء، ويُبقي ما فيه اسمٌ حقيقيّ.
  const added = registerRuntimeConcepts([{
    id: 'test_junk_shop', category: 'retail',
    concept: { ar: 'محل تجربة' },
    variants: { darija: ['بغيت', 'واش كاين', 'شي واحد', 'محل الزرابي'], ar: [], fr: [], en: [], arabizi: [] },
  } as any]);
  assert.equal(added, 1, 'مرّت كلمةٌ عامّةٌ إلى الفهرس');
  assert.notEqual(resolveConcept('بغيت سباك')?.id, 'test_junk_shop');
  assert.equal(resolveConcept('محل الزرابي')?.id, 'test_junk_shop');
});

// ── أسئلةُ الزبونة: وقائعُ لا مفاهيم ───────────────────────────
const ASKS: [string, string][] = [
  ['سلام ختي فين كاينة', 'location'],
  ['ختي مزال عندك كساوي', 'availability'],
  ['وريني كساوي اللي عندك', 'catalog'],
  ['وريهم ليا', 'catalog'],
  ['شحال القياس', 'size'],
  ['واش كاين التوصيل', 'delivery'],
  ['انا ف طنجة امتا توصلني', 'delivery_time'],
  ['بشحال التوصيل', 'delivery_price'],
  ['واش هاد الثمن معاه التوصيل', 'price_includes_delivery'],
];
for (const [phrase, topic] of ASKS) {
  test(`«${phrase}» ⇒ ${topic}`, () => {
    assert.ok(detectFacts(phrase).includes(topic as any),
      `فُهمت: ${JSON.stringify(detectFacts(phrase))}`);
  });
}

test('كلُّ أسئلة الزبونة تُقرأ **طلبًا** — ولو ذكرت نفسَها', () => {
  // «انا ف طنجة امتا توصلني» كانت تُقرأ **عرضًا** لأنّ فيها ضمير «أنا».
  // والضميرُ وحدَه لا يعرض شيئًا: مَن يسأل يطلب.
  for (const [phrase] of ASKS) {
    assert.equal(understand(phrase).stance, 'seek', `«${phrase}» لم تُقرأ طلبًا`);
  }
});

test('«فين كاينة» موقعٌ لا توفّر — أداةُ الاستفهام تحسم', () => {
  // «كاينة» كانت تُقرأ «مزال متوفّر»، فتخرج واقعتان إحداهما زائفة.
  assert.deepEqual(detectFacts('سلام ختي فين كاينة'), ['location']);
});

test('الأخصُّ يغلب العامَّ في الوقائع', () => {
  // «بشحال التوصيل» ثمنُ توصيلٍ واحد، لا «توصيلٌ» و«ثمنٌ» منفصلان.
  assert.deepEqual(detectFacts('بشحال التوصيل'), ['delivery_price']);
  assert.deepEqual(detectFacts('شحال القياس'), ['size']);
});

test('جملةٌ بلا وقائعَ لا تُخرج شيئًا — الصمتُ أصدقُ من الحشو', () => {
  assert.deepEqual(detectFacts('صباح الخير'), []);
  assert.deepEqual(detectFacts(''), []);
});
