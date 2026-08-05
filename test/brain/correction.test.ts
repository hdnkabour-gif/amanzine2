import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { correctionOptions, applyCorrection, buildMisread, thankFor } from '../../src/lib/correction';
import { matchApprovedMemory } from '../../src/lib/akg/kb/memory';
import { reportMisread, decisionStats } from '../../src/lib/journey';

// ============================================================
// التصحيحُ الفوريّ — «لا، ماشي هادشي».
//
//   الزرُّ كان موجودًا، وما وراءه: عدّادٌ يزيد واحدًا، ثمّ `reset()` يمحو
//   جملةَ الإنسان. أي أنّه يدفع ثمنَ خطئنا مرّتين — يكتب من جديد، ولا
//   يتحسّن شيءٌ حين يكتب.
//
//   وهذه الاختباراتُ تحرس القواعدَ الثلاث: الجملةُ تبقى، ونسأل عمّا
//   ادّعيناه نحن، والتصحيحُ شخصيٌّ لا يُعلّم التطبيقَ كلَّه.
// ============================================================

const clear = () => { try { localStorage.clear(); } catch { /* noop */ } };

// ── ② نسأل عمّا ادّعيناه ──────────────────────────────────────
test('الخياراتُ تُبنى ممّا قلناه نحن، لا قائمةً عامّة', () => {
  const u = understand('الفريجيدير ما كيخدمش ف كازا');
  const opts = correctionOptions(u);
  const labels = opts.map(o => o.label);
  // كلُّ خيارٍ يذكر ما ادّعيناه حرفيًّا — «شنو غالط؟» وحدَها تُرجع العبءَ
  // إلى الإنسان بعد أن أخطأنا نحن.
  if (u.profession?.label) assert.ok(labels.includes(`ماشي ${u.profession.label}`), 'لم يُعرَض ما ادّعيناه');
  if (u.city) assert.ok(labels.includes(`ماشي ${u.city}`));
  assert.ok(opts.length >= 2, 'خيارٌ واحدٌ ليس سؤالًا');
});

test('لا يُسأل عن حقلٍ لم نملأه', () => {
  // سؤالُ «ماشي المدينة» لمن لم نذكر له مدينةً سؤالٌ عن شيءٍ لم يقع.
  const u = understand('بغيت ميكانيكي');
  assert.equal(u.city, undefined);
  assert.ok(!correctionOptions(u).some(o => o.field === 'city'), 'سُئل عن مدينةٍ لم تُذكر');
});

test('«كلشي غالط» آخرًا دائمًا', () => {
  // لو جاء أوّلًا لاختاره الناسُ كسلًا، فنفقد الحرفَ الذي أخطأنا فيه.
  const opts = correctionOptions(understand('الفريجيدير ما كيخدمش ف كازا'));
  assert.equal(opts[opts.length - 1].field, 'all');
  assert.equal(opts.filter(o => o.field === 'all').length, 1);
});

test('كلُّ خيارٍ يحمل سؤالَه — لا خيارٌ يقود إلى فراغ', () => {
  for (const o of correctionOptions(understand('الفريجيدير ما كيخدمش ف كازا'))) {
    assert.ok(o.ask && o.ask.trim().length > 3, `خيارٌ بلا سؤال: ${o.field}`);
    assert.ok(o.label && o.label.trim().length > 2);
  }
});

test('فهمٌ فارغٌ ⇒ بلا خيارات', () => {
  assert.deepEqual(correctionOptions(null), []);
  assert.deepEqual(correctionOptions(undefined), []);
});

// ── ③ التصحيحُ شخصيٌّ يُطبَّق ──────────────────────────────────
test('التصحيحُ يُطبَّق فورًا على صاحبه', () => {
  clear();
  // القيمةُ الوحيدةُ للتصحيح أن يُغيّر شيئًا. ولو بقي عدّادًا لظلّ الإنسانُ
  // يُخطَأ عليه في نفس الجملة إلى الأبد.
  assert.equal(matchApprovedMemory('طرطاقات'), undefined);
  assert.equal(applyCorrection('طرطاقات', 'كهربائي'), true);
  const hit = matchApprovedMemory('عندي طرطاقات ف الدار');
  assert.ok(hit, 'صحّح الإنسانُ ولم يتغيّر شيء');
  assert.equal(hit!.concept, 'كهربائي');
  clear();
});

test('لا يُكتب تصحيحٌ فارغ — «صحّحتُ إلى لا شيء» تعليمٌ للعدم', () => {
  clear();
  assert.equal(applyCorrection('طرطاقات', ''), false);
  assert.equal(applyCorrection('طرطاقات', '   '), false);
  assert.equal(applyCorrection('', 'كهربائي'), false);
  assert.equal(matchApprovedMemory('طرطاقات'), undefined, 'كُتب فراغٌ في الذاكرة');
  clear();
});

test('التصحيحُ لا يمسّ قاعدةَ المعرفة العامّة (القانون #٣)', () => {
  clear();
  // لو كتب تصحيحُ فردٍ في المعرفة العامّة لعلّمت غلطةُ واحدٍ الناسَ جميعًا.
  // الحدُّ المعلن: يُكتب في ذاكرة الشخص، وتُمحى بمحوها.
  applyCorrection('بغيت ميكانيكي', 'حلاق');
  assert.ok(matchApprovedMemory('بغيت ميكانيكي'), 'لم يُطبَّق على صاحبه');
  clear();
  assert.equal(matchApprovedMemory('بغيت ميكانيكي'), undefined,
    'نجا التصحيحُ من محو الذاكرة ⇒ كُتب في مكانٍ عامّ');
  // والمعرفةُ الأصليّةُ سليمةٌ بعد كلّ ذلك.
  assert.equal(understand('بغيت ميكانيكي').service, 'mechanic');
});

// ── بلاغُ سوء الفهم ────────────────────────────────────────────
test('البلاغُ يحمل الجملةَ وما ادّعيناه — وبدونهما لا يُصلَح شيء', () => {
  const u = understand('الفريجيدير ما كيخدمش');
  const m = buildMisread('الفريجيدير ما كيخدمش', u, 'profession');
  assert.ok(m);
  assert.equal(m!.text, 'الفريجيدير ما كيخدمش');
  assert.equal(m!.field, 'profession');
  assert.equal(m!.said, u.profession?.label || '');
  assert.equal(typeof m!.confidence, 'number');
});

test('بلا نصٍّ لا بلاغ', () => {
  assert.equal(buildMisread('', understand('بغيت ميكانيكي'), 'all'), null);
  assert.equal(buildMisread('   ', null, 'all'), null);
});

test('نفسُ الغلطة على نفس الجملة تزيد العدّادَ ولا تُكرّر السطر', () => {
  clear();
  // السطرُ ذو العدّاد العالي عطبٌ بنيويٌّ لا هفوةُ إنسان — ولا يظهر ذلك
  // إن صارت كلُّ ضغطةٍ سطرًا جديدًا.
  for (let i = 0; i < 3; i++) reportMisread({ text: 'بغيت طرطاقات', said: 'ميكانيكي', field: 'profession', confidence: 0.9 });
  const s: any = decisionStats();
  const mine = s.topMisreads.filter((m: any) => m.text === 'بغيت طرطاقات');
  assert.equal(mine.length, 1, 'تكرّر السطرُ بدل العدّاد');
  assert.equal(mine[0].count, 3);
  assert.equal(s.misreadTotal, 3);
  clear();
});

test('الأشدُّ خطرًا أوّلًا: الثقةُ جزءٌ من الترتيب لا العددُ وحدَه', () => {
  clear();
  // الأعدادُ مقلوبةٌ عمدًا: الضعيفةُ أكثرُ تكرارًا (٣ × ٠٫٢ = ٠٫٦) والواثقةُ
  // أقلُّ (٢ × ٠٫٩٥ = ١٫٩). فالترتيبُ بالعدد وحدَه يقدّم الضعيفة — وهي
  // تخمينٌ ظاهرٌ يُغتفَر، بينما الواثقةُ خطأٌ يمضي بالإنسان وهو مطمئن.
  for (let i = 0; i < 3; i++) reportMisread({ text: 'جملة ضعيفة', said: 'س', field: 'profession', confidence: 0.2 });
  for (let i = 0; i < 2; i++) reportMisread({ text: 'جملة واثقة', said: 'ص', field: 'profession', confidence: 0.95 });
  const s: any = decisionStats();
  assert.equal(s.topMisreads[0].text, 'جملة واثقة',
    'رُتّبت المخاطرُ بالعدد وحدَه — والثقةُ العاليةُ المردودةُ أخطر');
  assert.equal(s.topMisreads[0].count, 2);
  clear();
});

test('بلاغٌ بلا نصٍّ لا يُسجَّل', () => {
  clear();
  reportMisread({ text: '', said: 'س', field: 'all', confidence: 0.5 });
  reportMisread({ text: '   ', said: 'س', field: 'all', confidence: 0.5 });
  assert.equal((decisionStats() as any).misreadTotal, 0);
  clear();
});

// ── ما يُقال للإنسان ──────────────────────────────────────────
test('«كلشي غالط» اعتذارٌ، وما دونه شكرٌ ووعد', () => {
  assert.notEqual(thankFor('all'), thankFor('profession'));
  assert.ok(thankFor('all').length > 5);
  assert.ok(thankFor('city').length > 5);
});
