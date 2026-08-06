import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { findProblemBySymptom } from '../../src/lib/akg/kb/symptomGraph';

// ============================================================
// المفرداتُ الغائبة — وأخطرُها ليس الغياب بل ما يملأ الفراغ.
//
//   تسعُ جملٍ من المدوّنة لم تُفهَم. وأخطرُها لم تكن صامتة:
//
//       الفريجيدير ديالي ما كيخدمش  ⇒  **عطل حاسوب** بثقة ٠٫٥٩
//
//   والسبب: النمطُ «الحاسوب ما كيخدمش» يُطابَق جزئيًّا على **«كيخدمش»** —
//   وهي كلمةُ العطب التي يقولها المغربيُّ عن الثلّاجة والحاسوب والسيّارة
//   والباب. فأيُّ «X ما كيخدمش» تصير عطلَ حاسوب.
//
//   القاعدة: **العطبُ لا يُسمّي الحرفة — الشيءُ يُسمّيها.**
// ============================================================

test('العطبُ لا يُسمّي الحرفة — «ما كيخدمش» لا تعني حاسوبًا', () => {
  // كلُّ هذه أجهزةٌ مختلفة، والعبارةُ واحدة. ولو بقيت كلمةُ العطب مفتاحًا
  // لصار أوّلُ نمطٍ يحملها يبتلع الشكاوى كلَّها.
  const fridge = findProblemBySymptom('الفريجيدير ديالي ما كيخدمش');
  assert.equal(fridge?.problemId, 'fridge_not_cooling',
    `الثلّاجةُ قُرئت «${fridge?.problemId}»`);
  assert.equal(findProblemBySymptom('الثلاجة ما بقاتش خدامة')?.problemId, 'fridge_not_cooling');
  assert.equal(findProblemBySymptom('عندي مشكل في الفريجيدير')?.problemId, 'fridge_not_cooling');
});

test('جهازٌ لا نعرفه يبقى مجهولًا — ولا يقع في أوّل مصرف', () => {
  // هذا ما تحرسه كلمةُ العطب **وحدَها**: أجهزةٌ ليست في رسم الأعراض أصلًا.
  //   بلا الحارس:  «المكيف ما كيخدمش» ⇒ عطل حاسوب
  //                «الميكرو ما خدامش» ⇒ عطل حاسوب
  // وأن نصمت خيرٌ من أن نُرسله إلى تقنيّ حواسيب. الصامتُ يُسأل فيُصحَّح.
  for (const s of ['المكيف ما كيخدمش', 'الطابع ما كيخدمش', 'الميكرو ما خدامش']) {
    const got = findProblemBySymptom(s);
    assert.notEqual(got?.problemId, 'computer_broken', `«${s}» ⇒ عطل حاسوب`);
  }
  // ولا يُطفَأ ما يُسمّى صراحةً: «الباب» و«السخان» في الرسم فيبقيان.
  assert.equal(findProblemBySymptom('الباب ما كيخدمش')?.problemId, 'door_broken');
  assert.equal(findProblemBySymptom('السخان ما كيخدم')?.problemId, 'water_heater_broken');
});

test('ولا يبقى الحاسوبُ مفهومًا حين يُسمّى', () => {
  // سدُّ المصرف يجب ألّا يُطفئ ما كان يعمل: الاسمُ الصريحُ يبقى حاسمًا.
  assert.equal(findProblemBySymptom('الحاسوب ما كيخدمش')?.problemId, 'computer_broken');
  assert.equal(understand('الكمبيوتر بطّيء').profession?.id, 'it_tech');
  // «pc» يحوّلها `deArabizi` إلى «بك» قبل أن تصل، فالنمطُ اللاتينيُّ وحدَه
  // لا يكفي. وكانت تعمل **بالمصادفة** عبر المصرف المسدود.
  assert.equal(understand('pc ما خدامش').problem?.id, 'computer_broken');
});

test('الكلماتُ التي يقولها المغاربةُ ولا يحملها الملفُّ المولَّد', () => {
  const CASES: [string, string][] = [
    ['وريني كساوي اللي عندك', 'clothing'],          // من زيارةٍ ميدانيّة
    ['عندي صالون', 'women_s_hair_salon'],           // أشيعُ من «محل حلاقة»
    ['عندي سباط بغيت نبيعو', 'shoe_store'],         // «سباط» بالسين
    ['انا كنصايب سوارت', 'jeweler'],
    ['عندي دار بغيت نكريها', 'real_estate_agency'],
    ['أنا كنقلب على حرايفي', 'artisanat_et_m_tiers_manuels'],
  ];
  for (const [s, id] of CASES) {
    assert.equal(understand(s).service, id, `«${s}» ⇒ ${understand(s).service ?? '⛔'}`);
  }
});

test('العطلُ في الجهاز يُعطي مهنتَه', () => {
  assert.equal(understand('عندي مشكل ديال الضو').profession?.id, 'electrician');
  assert.ok(understand('عندي مشكل في الفريجيدير').profession, 'الثلّاجةُ بلا مهنة');
});

test('لا يبتلع الجديدُ ما كان يعمل', () => {
  // «كساوي» صارت بضاعةً عامّة؛ فيجب ألّا تبتلع الأخصَّ منها.
  assert.equal(understand('كنبيع كسيوات ديال الدراري').service, 'kids_clothing');
  assert.equal(understand('عندي محل ديال الخضرة').service, 'greengrocer');
  assert.equal(understand('عندي حانوت ديال الحوت').service, 'fishmonger');
});
