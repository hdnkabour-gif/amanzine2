import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNeed } from '../../src/lib/needEngine';
import { resolveConcepts } from '../../src/lib/akg/kb/knowledge';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';
import { allCategories } from '../../src/lib/akg/kb/categories';

// ============================================================
// الأكلُ والمشروبات.
//
//   `categories.ts` يُعلن «🍽️ الأكل والمطاعم» منذ أوّل يوم. وقياسُ خمسَ
//   عشرةَ جملةً حقيقيّةً أعطى: «جاني جوع» ⇒ لا شيء · «بغيت كسكسو» ⇒ لا شيء
//   · «تشهيت طاجين بالدجاج» ⇒ **بائعُ الفخّار**. فئةٌ مُعلَنةٌ وفارغة.
//
//   والقرارُ المعماريُّ الذي تحرسه هذه الاختبارات: **الطبقُ ليس مفهومًا.**
//   الكسكسُ لا يُسأل عن سنوات الخبرة ولا عن منطقة التغطية. الأطباقُ مفرداتٌ
//   تدلّ على مطعم، والطبقُ المحدَّدُ يعيش في قائمة التاجر (`products`).
//   لا تُخلَق مئةُ مفهومٍ لمئة طبق.
// ============================================================

const say = (s: string) => {
  const r = parseNeed(s) as any;
  return { intent: r.intent as string, stance: r.stance as string,
    ids: resolveConcepts(s).map((x: any) => x.id) };
};

test('الجوعُ يُفهَم — «جاني جوع» جملةٌ كاملةُ المعنى', () => {
  // لا أداةَ طلبٍ فيها ولا فعلَ شراء. ومَن جاع لا يَعرض الطعامَ بل يطلبه.
  for (const s of ['جاني جوع', 'تشهيت ناكل', 'تشهيت شي حاجة', 'راني جيعان']) {
    const r = say(s);
    assert.ok(r.ids.includes('restaurant'), `«${s}» ⇒ ${r.ids.join(',') || 'لا شيء'}`);
    assert.equal(r.stance, 'seek', `«${s}» ⇒ اتّجاه ${r.stance}`);
  }
});

test('الأطباقُ المغربيّةُ والعالميّة تدلّ على مطعم', () => {
  const dishes = ['بغيت كسكسو', 'تشهيت رفيسة', 'بغيت حريرة', 'تشهيت بسطيلة',
    'بغيت ناكل بيتزا', 'تشهيت طاكوس', 'بغيت شاورما', 'تشهيت مشوي', 'بغيت طنجية'];
  const miss = dishes.filter(s => !say(s).ids.includes('restaurant'));
  assert.deepEqual(miss, [], 'أطباقٌ لا يعرفها المحرّك');
});

test('«تشهيت طاجين بالدجاج» طبقٌ لا آنيةُ فخّار', () => {
  // **حارسُ صنف.** الطاجينُ آنيةٌ وطبق، وكان بائعُ الفخّار يملك الاسمَ
  // المجرّد. مَن قال «تشهيت» يريد الطبقَ — والجوابُ الخاطئ أسوأُ من الصمت.
  const r = say('تشهيت طاجين بالدجاج');
  assert.ok(r.ids.includes('restaurant'), `⇒ ${r.ids.join(',')}`);
  assert.ok(!r.ids.includes('pottery_and_traditional_cookware_seller'),
    'الطاجينُ ما زال آنيةَ فخّار');
});

test('مَن يطلب عملًا يَعرض نفسَه — لا يَستأجر', () => {
  // «بغيت نخدم دليفري» صياغتُها طلبٌ ومعناها عرضُ يدٍ عاملة. بلا هذا كان
  // الباحثُ عن عملٍ يُرسَل ليَستأجر موصِّلًا.
  for (const s of ['بغيت نخدم دليفري', 'أنا موصل طلبات', 'كنوصل الطلبات فكازا']) {
    const r = say(s);
    assert.equal(r.stance, 'offer', `«${s}» ⇒ ${r.stance}`);
    assert.equal(r.intent, 'create_service', `«${s}» ⇒ ${r.intent}`);
  }
});

test('الطبخُ المنزليُّ عرضٌ قائمٌ بذاته', () => {
  // امرأةٌ تطبخ في بيتها وتبيع — سوقٌ مغربيٌّ واسعٌ لم يكن له مفهوم.
  const r = say('كنطبخ فالدار وكنبيع الماكلة');
  assert.ok(r.ids.includes('home_kitchen'), `⇒ ${r.ids.join(',')}`);
  assert.equal(r.stance, 'offer');
});

test('العارضُ والطالبُ لا يختلطان في الأكل', () => {
  const cases: [string, string][] = [
    ['عندي مطعم فكازا', 'offer'], ['فين كاين مطعم مغربي قريب', 'seek'],
    ['عندي سنتر ديال الساندويتش', 'offer'], ['بغيت نطلب ماكلة للدار', 'seek'],
  ];
  for (const [s, want] of cases)
    assert.equal(say(s).stance, want, `«${s}» ⇒ ${say(s).stance}`);
});

test('لا مهنةَ وهميّةٌ في فئة', () => {
  // الفئةُ التي تُسمّي مهنةً لا وجودَ لها تَعِد بما لا تملك: يضغط المستخدمُ
  // «🍽️ الأكل» فلا يجد وراءها شيئًا.
  //
  //   (كان هنا حارسٌ أوسعُ يشترط لكلّ فئةٍ مفهومًا يحمل مُعرِّفَها. وكان
  //    يقيس الخطأ: المفاهيمُ المولَّدةُ تحمل في `category` نصًّا عربيًّا
  //    كـ«تجارة / غذاء» لا مُعرِّفَ الفئة، فالمقارنةُ تفشل دائمًا لأسبابٍ
  //    لا علاقةَ لها بالفراغ. حارسٌ يفشل لسببٍ غير الذي يزعمه حارسٌ خاطئ.)
  const known = new Set(CONCEPTS.map(c => c.id));
  const phantom: string[] = [];
  for (const c of allCategories())
    for (const id of [...(c.professions || []), ...((c as any).concepts || [])])
      if (!known.has(id)) phantom.push(`${c.label}: ${id}`);
  assert.deepEqual(phantom, [], 'فئاتٌ تُسمّي مهنًا لا وجودَ لها');
});

test('فئةُ الأكل لم تعد فارغة', () => {
  // القياسُ الذي وَلَد هذا الملفّ: الفئةُ مُعلَنةٌ منذ أوّل يومٍ بلا مفهوم.
  const food = CONCEPTS.filter(c =>
    ['restaurant', 'cafe', 'bakery', 'home_kitchen', 'snack_bar_restaurant'].includes(c.id));
  assert.ok(food.length >= 4, `${food.length} مفاهيمَ فقط وراء «🍽️ الأكل والمطاعم»`);
  assert.ok(CONCEPTS.some(c => c.id === 'home_kitchen'), 'المطبخُ المنزليُّ مفقود');
  assert.ok(CONCEPTS.some(c => c.id === 'food_courier'), 'موصِّلُ الطلبات مفقود');
});
