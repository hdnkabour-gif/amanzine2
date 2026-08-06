import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNeed } from '../../src/lib/needEngine';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';

// ============================================================
// المجالاتُ الثلاثة التي يبدأ بها المالك: الملابس · السيّارات · المعلوميّات.
//
//   قِيست قبل التوسعة: **الملابس ٩/١٥ فشل** — أعلى نسبةٍ في المجالات الثلاثة،
//   وهي المجالُ الأوّل. السببُ أنّ المفهومَ الوحيد `clothing` كان يحمل أربعَ
//   كلماتٍ عامّة، والناسُ لا يكتبون «ملابس» بل **اسمَ القطعة**.
//
//   كلُّ جملةٍ هنا حقيقيّةٌ من مسحٍ فعليّ، لا مُختلَقة. والاختبارُ يقيس
//   **الفهمَ لا الوجهة**: أن يُعرَف الشيءُ المطلوبُ ما هو.
// ============================================================

/** فُهمت = نيّةٌ معروفةٌ **و** شيءٌ مُسمّى (مفهومٌ أو مهنةٌ أو صنف). */
function understood(q: string): boolean {
  const r: any = parseNeed(q, {});
  if (r.intent === 'unknown') return false;
  return !!resolveConcept(q) || !!r.object?.profession || !!r.object?.category;
}

const CLOTHES = [
  'بغيت جلابة', 'كنقلب على قفطان', 'بغيت صباط رجالي', 'عندي محل ديال الحوايج',
  'بغيت نبيع تراكسي', 'بغيت قميص أبيض', 'فين نلقى قشاشة', 'بغيت بلوزة نسائية',
  'كنبيع حوايج الدراري', 'بغيت جوطية', 'بغيت سروال جينز', 'عندي كسوة العيد',
  'بغيت نشري بابوش', 'بغيت كاسكيطة', 'بغيت طاكشيطة للعرس',
];
const CARS = [
  'بغيت نغسل الطوموبيل', 'الطوموبيل ما بغاتش تخدم', 'بغيت نبدل الزيت', 'بغيت ميكانيسيان',
  'بغيت نشري بنيو', 'الفران ديال الطوموبيل خربان', 'بغيت نصبغ الطوموبيل',
  'بغيت ديانيوستيك', 'بغيت نكري طوموبيل', 'بغيت طوليط', 'بغيت نبيع طوموبيلتي',
];
const IT = [
  'بغيت نصلح البورطابل', 'الحاسوب بطيء', 'بغيت نركب ويندوز', 'بغيت نشري لابتوب',
  'الواي فاي كيقطع', 'بغيت كاميرات المراقبة', 'بغيت واحد يدير ليا موقع',
  'الشاشة مهرسة', 'بغيت نبيع بيسي', 'بغيت انطرنيت فالدار', 'بغيت تقني معلوميات',
  'بغيت ديسك دور',
];

test('الملابس تُفهَم كلُّها — المجالُ الأوّل', () => {
  const failed = CLOTHES.filter(q => !understood(q));
  assert.deepEqual(failed, [], `لم تُفهَم: ${failed.join(' · ')}`);
});

test('خدماتُ السيّارات تُفهَم كلُّها', () => {
  const failed = CARS.filter(q => !understood(q));
  assert.deepEqual(failed, [], `لم تُفهَم: ${failed.join(' · ')}`);
});

test('المعلوميّات تُفهَم كلُّها', () => {
  const failed = IT.filter(q => !understood(q));
  assert.deepEqual(failed, [], `لم تُفهَم: ${failed.join(' · ')}`);
});

test('القطعةُ تُسمّى باسمها لا بـ«ملابس» العامّة', () => {
  // القيمةُ ليست في أن يُفهَم، بل في أن يُعرَف **ماذا** — فيُبحَث عنه بدقّة.
  // المُعرِّفاتُ هي **الموجودةُ في القاعدة** لا أسماءٌ جديدةٌ اخترعتُها:
  // كتبتُ `footwear` و`flea_market` أوّلًا بينما القاعدةُ فيها `shoe_store`
  // و`used_clothing` — فأثمر ذلك مفهومين يتنازعان المرادفَ الواحد.
  assert.equal(resolveConcept('بغيت صباط')?.id, 'shoe_store');
  assert.equal(resolveConcept('بغيت سروال جينز')?.id, 'garment_bottom');
  assert.equal(resolveConcept('بغيت طاكشيطة')?.id, 'traditional_clothing');
  assert.equal(resolveConcept('بغيت كاسكيطة')?.id, 'fashion_accessories');
  assert.equal(resolveConcept('بغيت جوطية')?.id, 'used_clothing');
});

test('«تراكسي» ملابسٌ رياضيّة لا عقار', () => {
  // كانت تُقرأ `real_estate_agency` — «تراكسي» ≈ «تراس». خطأٌ يُرسل بائعَ
  // ملابسَ إلى وكالةِ عقار.
  assert.equal(resolveConcept('بغيت نبيع تراكسي')?.id, 'sportswear');
  assert.equal(parseNeed('بغيت نبيع تراكسي').intent, 'sell');
});

test('الاتّجاه يبقى محفوظًا مع التوسعة — البائعُ ليس مشتريًا', () => {
  assert.equal(parseNeed('كنبيع حوايج الدراري').intent, 'sell');
  assert.equal(parseNeed('بغيت نبيع تراكسي').intent, 'sell');
  assert.equal(parseNeed('بغيت نشري بابوش').intent, 'buy');
  assert.equal(parseNeed('بغيت نشري بنيو').intent, 'buy');
});

test('«انطرنيت» بإملائها المغربيّ تُفهَم كما «إنترنت»', () => {
  for (const q of ['بغيت انطرنيت فالدار', 'بغيت الفيبر', 'الانترنت كيقطع']) {
    assert.ok(understood(q), `${q} لم تُفهَم`);
  }
});

// ============================================================
// كناري: كلماتٌ شائعةٌ لا تُطابق مفهومًا وحدَها.
//
//   كتبتُ خطأً مطبعيًّا `'ديagnostic'` في متغيّرات «الفحص الإلكترونيّ».
//   `normArabic` تحذف اللاتينيّةَ فيبقى **«دي»** — مصطلحٌ من حرفين موجودٌ
//   داخل «كنـدير» و«ديال» و«جديد». فصارت «انا كندير الحلويات» تُقرأ
//   **فحصَ سيّارات**. مصطلحٌ قصيرٌ واحدٌ يكفي ليُفسد الفهمَ عبر المجالات كلِّها.
//
//   هذا الاختبارُ يمرّ على كلماتٍ دارجةٍ شائعةٍ لا معنى تجاريًّا لها وحدَها،
//   ويرفض أن يُطابقها أيُّ مفهوم. رخيصٌ، ويمسك صنفًا كاملًا من الأخطاء.
// ============================================================

const COMMON_WORDS = [
  'كندير', 'ديال', 'جديد', 'بغيت', 'عندي', 'واش', 'شنو', 'فين', 'كيفاش',
  'دابا', 'مزيان', 'شوية', 'بزاف', 'حتى', 'غير', 'راه', 'ديما', 'مابقاش',
];

test('كلمةٌ دارجةٌ شائعةٌ وحدَها لا تُطابق مفهومًا', () => {
  const wrong = COMMON_WORDS
    .map(w => ({ w, c: resolveConcept(w) }))
    .filter(x => !!x.c)
    .map(x => `«${x.w}» → ${x.c!.id}`);
  assert.deepEqual(wrong, [],
    `مصطلحٌ قصيرٌ يبتلع كلماتٍ شائعة: ${wrong.join(' · ')}`);
});

test('جملةٌ عن مجالٍ لا تُسحَب إلى مجالٍ آخر', () => {
  // كلٌّ من هذه فشلت فعلًا مرّةً بسبب مصطلحٍ عابر.
  const pairs: [string, string | null][] = [
    // كان المتوقَّعُ `null` — لا لأنّ الصمتَ صواب، بل لأنّ العطبَ المقصود
    // (`car_diagnostics` من متغيّرٍ مطبعيّ) لم يكن له بديلٌ صحيحٌ يومَها.
    // صار له: صانعُ الحلويات حلوانيّ. والحارسُ يشتدّ بذلك لا يلين — يمنع
    // المجالَ الخاطئ **ويطلب** الصحيح.
    ['انا كندير الحلويات', 'pastry_chef'],  // كانت: car_diagnostics
    ['بغيت نصبغ الدار', 'painter'],        // كانت: car_painting
    ['بغيت نبيع تراكسي', 'sportswear'],    // كانت: real_estate_agency
  ];
  for (const [q, expected] of pairs) {
    const got = resolveConcept(q)?.id ?? null;
    if (expected === null) assert.equal(got, null, `«${q}» طابقت ${got} بلا وجهِ حقّ`);
    else assert.equal(got, expected, `«${q}» → ${got}`);
  }
});

// ============================================================
// **سجلّان بمُعرِّفَين — والجسرُ بينهما مُعلَنٌ لا مُخمَّن.**
//
//   `professions.ts` فيه ٢١ مهنةً بمُعرِّفاتٍ قصيرة (`ac_tech`)، و`concepts`
//   فيه مئاتٌ بمُعرِّفاتٍ طويلة (`air_conditioning_and_refrigeration_technician`).
//   أحدَ عشرَ من الـ٢١ لا وجودَ لها في الآخر — سجلّان لا يعرف أحدُهما الآخر.
//
//   وثمنُ ذلك مقيسٌ لا متخيَّل: `problems.ts` تُحيل على مُعرِّف **مهنة**،
//   فإن كُتب في `service` خرج إلى البحث والسوق مُعرِّفٌ لا تعرفه قاعدةُ
//   المفاهيم؛ وإن حُوِّلت الإحالةُ إلى مفهومٍ انكسر `getProfession` فضاعت
//   القدراتُ والقطاع — جُرِّب الطريقان وقِيسا، وسقط ١١ من ١٤ في الثاني.
// ============================================================
import { allProfessions, getProfession } from '../../src/lib/akg/kb/professions';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { PROBLEMS } from '../../src/lib/akg/kb/problems';

test('كلُّ مهنةٍ تُعرَف بمفهومٍ موجود — لا جسرَ إلى العدم', () => {
  const known = new Set(CONCEPTS.map(c => c.id));
  const broken: string[] = [];
  for (const p of allProfessions()) {
    const cid = p.concept || p.id;   // بلا `concept` يكون المُعرِّفُ نفسُه هو المفهوم
    if (!known.has(cid)) broken.push(`${p.id} («${p.label}») ⇒ ${cid}`);
  }
  assert.deepEqual(broken, [],
    `مهنٌ لا يقابلها مفهوم — ما يخرج منها إلى البحث والسوق لا يعرفه أحد:\n  ${broken.join('\n  ')}`);
});

test('كلُّ مشكلةٍ يحلُّها مَن هو مُعلَنٌ في سجلّ المهن', () => {
  const orphans: string[] = [];
  for (const [pid, p] of Object.entries(PROBLEMS)) {
    for (const s of p.solutions || []) {
      if (!getProfession(s.profession)) orphans.push(`${pid} → ${s.profession}`);
    }
  }
  assert.deepEqual(orphans, [],
    `مشاكلُ تُحيل على مهنٍ لا وجودَ لها — فلا قدراتٍ ولا قطاعَ ولا خدمة:\n  ${orphans.join('\n  ')}`);
});

// ── الفخُّ الذي وقع فعلًا ─────────────────────────────────────
//
//   «الثلاجة ما بقاتش **خدامة**»: قرأت طبقةُ الأعراض «خدامة» حالَ عطب،
//   وقرأتها طبقةُ المفاهيم مهنةً (`house_cleaner`) — فصار عطبُ ثلّاجةٍ طلبَ
//   عاملةِ تنظيف. رمزٌ واحدٌ قُرئ قراءتَين متضادّتَين في الجملة الواحدة.
test('كلمةُ العطب ليست مهنة — «ما بقاتش خدامة» ثلّاجةٌ لا خادمة', async () => {
  const { understand } = await import('../../src/lib/akg/kb');
  const u: any = understand('الثلاجة ما بقاتش خدامة');
  assert.equal(u.problem?.id, 'fridge_not_cooling', 'ضاعت المشكلةُ نفسُها');
  assert.notEqual(u.service, 'house_cleaner', '«خدامة» ما زالت تُقرأ مهنةً في سياق عطب');
  assert.equal(u.service, 'home_appliance_repair', 'الخدمةُ ليست حلَّ المشكلة');
});

test('من لا كلمةَ في جملته تدلّ على حرفة يأخذها من مشكلته', async () => {
  const { understand } = await import('../../src/lib/akg/kb');
  const u: any = understand('الفريجيدير ديالي ما كيخدمش من البارح انا ف طنجة');
  assert.equal(u.service, 'home_appliance_repair', 'عرف عقلٌ الحرفةَ وبقي `service` فارغًا');
  assert.equal(u.city, 'طنجة', 'ضاعت المدينة');
});

test('وحدُّه: المشكلةُ تملأ الفراغَ ولا تكتب فوق مطابقةٍ صريحة', async () => {
  const { understand } = await import('../../src/lib/akg/kb');
  // جُرِّب أن تفوز المشكلةُ دائمًا فصارت هذه `auto_body_paint` — من يريد
  // غسلَ سيّارته يُساق إلى صبّاغ. الحدُّ ليس تجميلًا.
  assert.equal((understand('بغيت نغسل الطوموبيل') as any).service, 'car_wash');
});
