import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACE_COUNT, allPlaces, resolvePlace, suggestPlaces, judgePlace, judgePlaceList,
  registerLearnedPlaces, normPlace, placeById,
} from '../../src/lib/akg/kb/places';
import { resolveCity } from '../../src/lib/akg/kb/knowledge';

// ============================================================
// أماكنُ المغرب — ٤٠٩ مكانًا بالعربيّة والفرنسيّة.
//
//   وُلدت من قياسٍ ميدانيّ: عند مزامنة مدن Livo ظهر أنّ المحرّكَ يفهم
//   **٣٤ من ٤٤١** — و٤٠٧ أماكنَ تُرسَل أسماؤها نصًّا خامًّا.
//
//   والقرارُ الذي تحرسه هذه الاختباراتُ قبل كلّ شيء: **المعرفةُ ليست ملكًا
//   لشركةِ توصيل**. لو بُدِّلت الشركةُ غدًا لبقيت الأماكنُ عندنا.
// ============================================================

test('المعرفةُ الجغرافيّةُ تغطّي المغربَ لا مدنًا معدودة', () => {
  assert.ok(PLACE_COUNT >= 400, `${PLACE_COUNT} مكانًا فقط — كانت ٤٥ قبل الدفعة`);
});

test('الاسمُ يُحلّ بالعربيّة والفرنسيّة معًا', () => {
  const pairs: [string, string][] = [
    ['كازا', 'الدار البيضاء'], ['Casablanca', 'الدار البيضاء'],
    ['tiflet', 'تيفلت'],       ['تيفلت', 'تيفلت'],
    ['ait melloul', 'آيت ملول'], ['آيت ملول', 'آيت ملول'],
    ['Skhirat', 'الصخيرات'],   ['بوسكورة', 'بوسكورة'],
  ];
  for (const [q, want] of pairs)
    assert.equal(resolvePlace(q)?.ar, want, `«${q}» لا يُحلّ`);
});

test('النبراتُ والشرطاتُ لا تمنع المطابقة', () => {
  // Livo تكتب «Sabaâ Aïyoun» و«Ourzazate-Taznakht». حرفٌ منبورٌ لا يجعل
  // المكانَ مجهولًا.
  for (const q of ['Sabaâ Aïyoun', 'sabaa aiyoun', 'Ourzazate-Taznakht', "Kelaat M'gouna'"])
    assert.ok(resolvePlace(q) || judgePlace(q).kind !== 'new', `«${q}» يُعدّ مجهولًا`);
});

test('المكانُ الموجودُ سلفًا يُدمَج ولا يُلغى', () => {
  // **حارسُ صنف.** أوّلُ صيغةٍ للدمج كانت `continue`: فكانت «تيفلت» الموجودةُ
  // في المدن الكبرى **بلا اسمٍ فرنسيّ** تبتلع مدخلَنا كلَّه ومعه المفتاحُ
  // اللاتينيّ. النتيجة: «تيفلت» تُحلّ و«tiflet» لا. المعرفةُ تُضاف ولا تُلغى.
  for (const [ar, fr] of [['تيفلت', 'tiflet'], ['تازة', 'taza'], ['الحسيمة', 'al hoceima']]) {
    const a = resolvePlace(ar), b = resolvePlace(fr);
    assert.ok(a, `«${ar}» مفقود`);
    assert.ok(b, `«${fr}» مفقود — دُمج المكانُ فابتلع مفاتيحَه اللاتينيّة`);
    assert.equal(a!.ar, b!.ar, `«${ar}» و«${fr}» مكانان مختلفان`);
  }
});

test('الإكمالُ يُظهر مطابقاتٍ لا القائمةَ كلَّها', () => {
  // ٤٠٩ خيارًا في منسدلةٍ على هاتفٍ ليست خيارًا بل عقوبة.
  for (const q of ['تا', 'sidi', 'بن', 'oul']) {
    const hits = suggestPlaces(q, 6);
    assert.ok(hits.length > 0 && hits.length <= 6, `«${q}» ⇒ ${hits.length}`);
    assert.ok(hits.every(h => h.keys.some(k => k.includes(normPlace(q)))),
      `«${q}» أعطت مكانًا لا يطابقها`);
  }
});

test('الإكمالُ يعمل بالحرف الواحد وبالفرنسيّة', () => {
  assert.ok(suggestPlaces('م', 5).length > 0, 'حرفٌ عربيٌّ واحدٌ لا يُكمِل');
  assert.ok(suggestPlaces('a', 5).length > 0, 'حرفٌ لاتينيٌّ واحدٌ لا يُكمِل');
});

test('الكبرى تسبق الصغرى في الاقتراح', () => {
  // من كتب «تا» يريد «تازة» قبل «تاسيلتانت».
  const hits = suggestPlaces('تا', 6);
  assert.ok(hits[0].major || hits.slice(0, 3).some(h => h.major),
    `الاقتراحُ الأوّل «${hits[0]?.ar}» مركزٌ صغيرٌ قبل مدينةٍ كبرى`);
});

// ── المقارنة عند إضافة شركةٍ جديدة ────────────────────────────

test('المعروفُ يُعرَف، والإملاءُ الآخرُ يُنسَب لصاحبه', () => {
  assert.equal(judgePlace('Casablanca').kind, 'known');
  const sim = judgePlace('Rissani');
  assert.ok(sim.kind === 'known' || sim.kind === 'similar',
    `«Rissani» تُعدّ جديدةً وهي إملاءٌ آخرُ لـ«الريصاني»`);
});

test('الحيُّ لا يُقبَل مدينةً — وهذا يمنع فسادَ البحث', () => {
  // «عين الشق» حيٌّ في الدار البيضاء. إضافتُه مدينةً تُفسد البحثَ والتوصيل.
  const v = judgePlace('عين الشق');
  assert.equal(v.kind, 'district', `«عين الشق» ⇒ ${v.kind}`);
  assert.equal((v as any).place.ar, 'الدار البيضاء');
});

test('الجديدُ يبقى جديدًا — لا يُنسَب لأقربِ شبيهٍ بعيد', () => {
  // عتبةُ التشابه حارسٌ ذو حدَّين: إن ضاقت فاتَنا الإملاءُ الآخر، وإن اتّسعت
  // ابتلعت أماكنَ مستقلّة. و«Berkanoua» على الحدّ: تبعد ٣ أحرفٍ عن «بركان».
  // لو رُفعت العتبةُ لعُدَّت إملاءً آخرَ لها فلم تُضَف أبدًا.
  //
  //   (كان هنا «تمارة الجديدة» و«بني ملال الشرقية» — وكانتا خطأً منّي: اسمان
  //    اخترعتُهما لا وجودَ لهما، وهما بصيغتهما المركّبة تخصيصٌ لمدينةٍ معروفةٍ
  //    لا مكانٌ مستقلّ. الحارسُ لا يُبنى على مثالٍ مُختلَق.)
  for (const q of ['Ville Inconnue XYZ', 'Berkanoua', 'دوار أولاد بلقاسم']) {
    const v = judgePlace(q);
    assert.equal(v.kind, 'new', `«${q}» نُسب إلى «${(v as any).place?.ar}» وهو مكانٌ مستقلّ`);
  }
});

// ── الاسمُ المركّب: أكثرُ ما تكتبه شركاتُ التوصيل ────────────

test('«Temsia Agadir» ليست مدينةً جديدة — التخصيصُ لا يصنع مكانًا', () => {
  // قوائمُ الشركات لا تكتب «تمسية» وحدَها. والفارقُ هنا **كلماتٌ لا حروف**،
  // فلا تراه مسافةُ ليفنشتاين أبدًا مهما وُسّعت. بلا هذا التفكيك تُضاف تمسيةُ
  // ثلاثَ مرّاتٍ عند إضافة ثلاثِ شركات.
  const same: [string, string][] = [
    ['Temsia Agadir', 'تمسية'], ['Temsia Chtouka Ait Baha', 'تمسية'],
    ['الرشيدية المدينة', 'الرشيدية'], ['Casablanca Maarif', 'الدار البيضاء'],
  ];
  for (const [q, want] of same) {
    const v = judgePlace(q);
    assert.notEqual(v.kind, 'new', `«${q}» عُدّت مدينةً جديدة`);
    assert.equal((v as any).place?.ar, want, `«${q}» ⇒ ${(v as any).place?.ar}`);
  }
});

test('المدينةُ تسبق الحيّ عند تفكيك المركّب', () => {
  // «تمارة» مُدرَجةٌ حيًّا في الرباط **وهي مدينةٌ قائمةٌ بذاتها**. لو قُدّم
  // فهرسُ الأحياء لصارت «تمارة الجديدة» حيًّا في الرباط — والطردُ يُشحَن
  // إلى مدينةٍ أخرى. الاسمُ الذي يعرفه المكانُ نفسُه أصدقُ من اسمِ جارِه.
  const v = judgePlace('تمارة الجديدة');
  assert.equal((v as any).place?.ar, 'تمارة', `⇒ ${(v as any).place?.ar}`);
});

test('من أخطأ في الكتابة يجد مدينتَه — لا قائمةً فارغة', () => {
  // «tmara» ليست بدايةً لـ«temara» ولا جزءًا منها: كان الإكمالُ يخرج فارغًا
  // فيظنّ الكاتبُ أنّ مدينتَه مجهولة.
  const fuzzy: [string, string][] = [
    ['tmara', 'تمارة'], ['tanjer', 'طنجة'], ['marakech', 'مراكش'], ['الدار البيضا', 'الدار البيضاء'],
  ];
  for (const [q, want] of fuzzy)
    assert.equal(suggestPlaces(q, 3)[0]?.ar, want, `«${q}» ⇒ ${suggestPlaces(q, 3).map(p => p.ar).join('/') || 'فراغ'}`);
});

test('لكلّ مكانٍ مُعرِّفٌ ثابتٌ لا يتكرّر', () => {
  // جدولُ ربطِ شركات التوصيل يخزّن `city_id`. لو كان المفتاحُ هو الاسمَ
  // المعروضَ لانكسر كلُّ ربطٍ يومَ نُصحّح إملاءً.
  const ids = allPlaces().map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'مُعرِّفان متطابقان لمكانَين');
  assert.deepEqual(ids.filter(i => !i || /\s/.test(i)), [], 'مُعرِّفٌ فارغٌ أو فيه فراغ');
  assert.equal(placeById('casablanca')?.ar, 'الدار البيضاء');
  assert.equal(placeById(resolvePlace('أكادير')!.id)?.ar, 'أكادير', 'المُعرِّفُ لا يعود إلى صاحبه');

  // **التصادم.** المُعرِّفُ يُشتقّ من الحروف اللاتينيّة، فاسمٌ يعتمده إنسانٌ
  // مثل «Casablanca الشتوية» يُنتج `casablanca` نفسَه. بلا ترقيمٍ يُدهَس
  // مُعرِّفُ الدار البيضاء في الفهرس ويُشحَن الطردُ إلى المكان الخطأ.
  const clash = 'Casablanca الشتوية الاختباريّة';
  assert.equal(registerLearnedPlaces([clash]), 1);
  const added = resolvePlace(clash);
  assert.equal(added?.ar, clash);
  assert.notEqual(added!.id, 'casablanca', 'المكانُ الجديدُ سرق مُعرِّفَ الدار البيضاء');
  assert.equal(placeById('casablanca')?.ar, 'الدار البيضاء', 'دُهس مُعرِّفُ الدار البيضاء');
});

test('الإملاءُ القريبُ يُلتقَط — العتبةُ ليست صفرًا', () => {
  // والحدُّ الآخر: «Tanjer» و«Oujdaa» أخطاءُ إملاءٍ بحرفٍ واحد. لو أُلغي
  // قياسُ التشابه لصارت كلُّها «جديدة» فتكرّرت المدنُ في المعرفة.
  for (const q of ['Tanjer', 'Oujdaa', 'Agadirr'])
    assert.equal(judgePlace(q).kind, 'similar', `«${q}» خطأُ إملاءٍ عُدّ مكانًا جديدًا`);
});

test('اللصقُ يُصنَّف أربعةَ أصناف، والمكرَّرُ لا يُحسَب مرّتين', () => {
  const r = judgePlaceList(`Casablanca
casablanca
CASABLANCA
عين الشق
Ville Inconnue XYZ`);
  assert.equal(r.known.length, 1, 'المكرَّرُ حُسب أكثرَ من مرّة');
  assert.equal(r.district.length, 1);
  assert.equal(r.fresh.length, 1);
});

test('اللصقُ يقبل الأسطرَ والفواصلَ و«·» معًا', () => {
  const r = judgePlaceList('Casablanca · Rabat, Marrakech\nTanger');
  assert.ok(r.known.length >= 4, `فُصلت ${r.known.length} فقط`);
});

test('ما يعتمده الإنسانُ يعمل فورًا — لا بعد إعادة نشر', () => {
  // نفسُ عطبِ `registerRuntimeConcepts`: يُخزَّن في المتصفّح ولا يعرفه
  // المحرّك، لأنّ الفهارسَ تُبنى عند تحميل الوحدة.
  const name = 'دوار أولاد بلقاسم الاختباريّ';
  assert.equal(resolvePlace(name), undefined);
  assert.equal(registerLearnedPlaces([name]), 1);
  assert.equal(resolvePlace(name)?.ar, name, 'المكانُ المعتمَدُ لا يعمل إلّا بعد إعادة نشر');
  assert.equal(registerLearnedPlaces([name]), 0, 'المكانُ نفسُه يُضاف مرّتين');
});

test('المحرّكُ والمُنتقي يعرفان المكانَ نفسَه', () => {
  // عقلان يختلفان على المكان الواحد = تاجرٌ يختار مدينةً لا يفهمها الفهم.
  for (const q of ['تيفلت', 'بوسكورة', 'آيت ملول', 'Skhirat']) {
    const viaPlace = resolvePlace(q)?.ar;
    const viaEngine = resolveCity(q)?.city;
    assert.ok(viaPlace, `«${q}» مجهولٌ للمُنتقي`);
    assert.equal(viaEngine, viaPlace, `«${q}»: المحرّك ⇒ ${viaEngine} · المُنتقي ⇒ ${viaPlace}`);
  }
});

test('لا مكانَ بلا اسمٍ عربيٍّ أو فرنسيّ', () => {
  const broken = allPlaces().filter(p => !p.ar?.trim() || !p.fr?.trim() || !p.keys.length);
  assert.deepEqual(broken.map(p => p.ar || p.fr || '؟'), [],
    'أماكنُ بلا اسمٍ أو بلا مفاتيحَ — لا تظهر في الإكمال أبدًا');
});
