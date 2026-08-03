import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACE_COUNT, allPlaces, resolvePlace, suggestPlaces, judgePlace, judgePlaceList,
  registerLearnedPlaces, normPlace,
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
  // ابتلعت أماكنَ حقيقيّةً مستقلّة. وهذه أسماءٌ على الحدّ:
  //   «تمارة الجديدة»    تبعد ٤ أحرفٍ عن «واد الجديدة» — ومع ذلك مكانٌ آخر
  //   «بني ملال الشرقية» تبعد ٨ أحرفٍ عن «بني ملال»    — ومع ذلك مكانٌ آخر
  // لو رُفعت العتبةُ لصارت هذه «إملاءً آخرَ» فلم تُضَف أبدًا.
  for (const q of ['Ville Inconnue XYZ', 'تمارة الجديدة', 'بني ملال الشرقية']) {
    const v = judgePlace(q);
    assert.equal(v.kind, 'new', `«${q}» نُسب إلى «${(v as any).place?.ar}» وهو مكانٌ مستقلّ`);
  }
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
