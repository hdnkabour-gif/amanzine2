import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nudgesFor, allNudgeRules, type MerchantState } from '../../src/lib/merchantSuccess';
import { decide } from '../../src/lib/akg/decision';
import { PAGE_IDS } from '../../src/types';

// ============================================================
// نجاحُ التاجر — الفرقُ بين لوحةِ تحكّمٍ وموظّفٍ ذكيّ.
//
//   اللوحةُ تعرض أرقامًا وتنتظر؛ الموظّفُ يلاحظ ويقترح. والتاجرُ لا يبحث عن
//   الميزة — الميزةُ هي التي تجيء إليه.
//
//   **والهيكلُ كان موجودًا ميّتًا**: `Nudge` مُعرَّفٌ في `CommandCenter`
//   ومُعلَنٌ في خصائصها، ولا أحدَ يمرّره. قرارٌ (DR-0005) كُتب نصفُه — وهذا
//   نمطُ العطب الذي تكرّر في هذا المشروع: كودٌ صحيحٌ بلا مستهلك.
// ============================================================

const EMPTY: MerchantState = {
  photoCount: 0, serviceCount: 0, productCount: 0, orderCount: 0,
  hasHours: false, hasBooking: false,
};
const FULL: MerchantState = {
  profession: 'حلاق', city: 'الدار البيضاء', district: 'الألفة', phone: '0600000000',
  photoCount: 5, serviceCount: 4, productCount: 3, orderCount: 2,
  hasHours: true, hasBooking: true,
};

test('التاجرُ الجديدُ يُقاد، لا يُترَك أمام لوحةٍ فارغة', () => {
  const n = nudgesFor(EMPTY);
  assert.equal(n.length, 1, 'واحدٌ في المرّة — والعشرةُ ضجيجٌ يُغلَق');
  assert.ok(n[0].text.length > 10 && n[0].cta && n[0].page, 'ملاحظةٌ بلا نصٍّ أو فعلٍ أو وجهة');
});

test('الأهمُّ أوّلًا — الهاتفُ قبل عدد الصور', () => {
  // صفحةٌ بلا هاتفٍ لا تعمل أصلًا؛ وصفحةٌ بصورتين تعمل وتُحسَّن.
  assert.equal(nudgesFor(EMPTY)[0].id, 'no_phone');
  const hasPhone = { ...EMPTY, phone: '06' };
  assert.equal(nudgesFor(hasPhone)[0].id, 'no_photo', 'الصورةُ بعد الهاتف مباشرة');

  // **حالةٌ يخالف فيها الترتيبُ ترتيبَ الإعلان** — وإلّا مرّ الحارسُ ولو
  //   حُذف الفرزُ كلُّه (وهذا ما وقع في أوّل صيغةٍ له: حقنُ حذفِ الفرز لم
  //   يُسقطه، لأنّ القواعدَ مكتوبةٌ صدفةً بترتيب أثرها).
  const both: MerchantState = { ...FULL, photoCount: 2, hasBooking: false, askedAboutBooking: 3 };
  const ids = nudgesFor(both, 5).map(n => n.id);
  assert.ok(ids.indexOf('booking_asked') < ids.indexOf('few_photos'),
    `الحجزُ (أثر ٨٥) بعد الصور (أثر ٤٠): ${ids.join(' · ')}`);
});

test('مَن أكمل كلَّ شيءٍ لا يُزعَج', () => {
  // **حارسُ صنف.** اقتراحٌ بلا سببٍ حقيقيٍّ يُحوّل المساعدَ إلى إزعاج، ويُعلّم
  // التاجرَ أن يتجاهل كلَّ ما يقوله التطبيق — فيضيع الاقتراحُ المهمُّ لاحقًا.
  assert.deepEqual(nudgesFor(FULL), [], 'يُقترَح على تاجرٍ لا ينقصه شيء');
});

test('الاقتراحُ يأتي من المعرفة لا من العدم', () => {
  // «زيد شي خدمات» كلامٌ فارغ. «زيد: تهذيب اللحية · حلاقة الأطفال» مساعدة.
  const s = { ...FULL, serviceCount: 1 };
  const n = nudgesFor(s)[0];
  assert.equal(n.id, 'few_services');
  assert.ok(/·/.test(n.text), `الاقتراحُ بلا خدماتٍ من المعرفة: «${n.text}»`);
});

test('كلُّ اقتراحٍ يقود إلى صفحةٍ موجودة', () => {
  // **لا وعدَ بما لا نملك** — نفسُ قانون المفاهيم الوهميّة، مطبَّقًا على الصفحات.
  //
  //   (كان هنا `allCapabilities()` وهو خطأ: سجلُّ القدرات يصف **ستّ** صفحاتٍ
  //    لها واصفاتٌ معرفيّة، لا كلَّ صفحات التطبيق. فكان الحارسُ يتّهم
  //    `settings` و`bookings` وهما صفحتان قائمتان. المِسطرةُ الصحيحةُ هي
  //    `PAGE_IDS` — مصدرُ الحقيقة لِما يمكن الانتقالُ إليه.)
  const known = new Set<string>(PAGE_IDS as readonly string[]);
  const broken = allNudgeRules().filter(r => !known.has(r.page));
  assert.deepEqual(broken.map(r => r.id), [], 'اقتراحٌ يقود إلى صفحةٍ لا وجودَ لها');
});

test('لا اقتراحَين بنفس المُعرِّف ولا بنفس الأثر', () => {
  const rules = allNudgeRules();
  assert.equal(new Set(rules.map(r => r.id)).size, rules.length, 'مُعرِّفان متطابقان');
  // تساوي الأثرِ يجعل الترتيبَ عشوائيًّا فيتبدّل الاقتراحُ بين تحميلٍ وآخر.
  assert.equal(new Set(rules.map(r => r.impact)).size, rules.length, 'أثران متساويان — ترتيبٌ غيرُ مستقرّ');
});

// ── ما حُذف: أسئلةٌ بلا مستهلك ──────────────────────────────

test('لا يُسأل التاجرُ عمّا لا يقرؤه أحد', () => {
  // قِستُها: `serviceLocation` كان **إجباريًّا بصفر مستهلكين**، و`serviceType`
  // قائمةً من ٢٣ خيارًا **٢٢ مهنةً فقط من ١٤٧ تجد اسمَها فيها** — وهو نفسُه
  // `profession` الذي تملؤه المعرفةُ تلقائيًّا.
  const keys = new Set(decide('عندي محل حلاقة فحي الألفة الدار البيضاء', {}).fields.map(f => f.key));
  for (const dead of ['serviceType', 'serviceLocation', 'minBooking', 'teamSize'])
    assert.ok(!keys.has(dead), `«${dead}» ما زال يُسأل ولا يقرؤه أحد`);
});

test('الصورةُ تسبق الحقولَ الثانويّة', () => {
  // التاجرُ في محلّه يرى محلَّه في الشاشة قبل أن يكتب شيئًا — تلك اللحظةُ هي
  // ما يجعله يقول «واو»، لا خانةُ سنوات الخبرة.
  // (أوّلُ صيغةٍ قاست حقولَ `ask` وحدَها، والخبرةُ والأوقاتُ `optional` —
  //  فكان `indexOf` يُرجع ‎-1‎ ويمرّ الحارسُ ولو نُقلت الصورةُ إلى آخر القالب.
  //  المِسطرةُ الصحيحةُ هي **ترتيبُ العرض كلِّه**.)
  const order = decide('عندي محل حلاقة فحي الألفة الدار البيضاء', {}).fields.map(f => f.key);
  const photo = order.indexOf('photos');
  assert.ok(photo >= 0, 'الصورةُ غائبةٌ عن القالب');
  for (const later of ['experience', 'hours', 'mobile']) {
    const i = order.indexOf(later);
    assert.ok(i < 0 || i > photo, `«${later}» يُعرَض قبل الصورة (${i} < ${photo})`);
  }
});
