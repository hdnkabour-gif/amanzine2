import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { understandRules, shouldEscalate } from '../../src/lib/understanding';
import { refine } from '../../src/lib/refine';
import { ALL } from '../corpus.mjs';

// ============================================================
// **بوّابةُ الذكاء: مبنيّةٌ، ولا تبلغ الشاشةَ التي يفتحها الناس.**
//
//   `understandHybrid` و`shouldEscalate` مكتوبتان منذ زمنٍ ومُختبَرتان،
//   وتُناديان من `AssistantPage` **وحدَها**. أمّا `LivingHome` — مدخلُ كلّ
//   من يفتح التطبيق — فلا تعرف أنّهما موجودتان. وهذا ثالثُ موضعٍ يتكرّر
//   فيه النمطُ نفسُه: طبقةٌ تعمل ولا أحدَ يعرف أنّها تعمل.
//
//   وحين قِيست البوّابةُ نفسُها قبل ربطها، ظهر أنّها **لا تصلح للربط بعد**:
//
//   ①  **عينُها واحدة.** `understandRules` لا تسأل إلّا عن `problem`/
//      `profession` — أي عن السوق. فـ«بغيت نبدل رقم الهاتف ديالي» تُقرأ
//      `update/phone` بثقة ٠٫٨٥ وتصل البوّابةَ **عجزًا كاملًا** بثقة ٠٫٢.
//   ②  **أرضيّةُ العجز معطَّلةٌ على العربيّة.** الفرعُ كان
//      `weakFloor && (mixed || unresolvedLatin)` وكِلا الطرفَين يشترط حرفًا
//      لاتينيًّا. فنفسُ الجملة تُصعَّد بالحرف اللاتينيّ ولا تُصعَّد بالعربيّ.
//
//   وربطُ البوّابة قبل ①و② كان يُغرق الذكاءَ بما تفهمه القواعدُ تمامًا،
//   ويُبقيه أعمى عن العربيّة القصيرة — أي عكسَ الغرض في الاتّجاهَين معًا.
// ============================================================

const gate = (s: string) => shouldEscalate(s, understandRules(s));

// ── ① عينُ البوّابة ترى الفعلَ الإداريَّ والغاية ────────────────
test('**ما قُرئ بثقةٍ لا يُرسَل عجزًا** — الفعلُ الإداريُّ يبلغ البوّابة', () => {
  // ٠٫٨٥ في `understand` و٠٫٢ عند البوّابة: مقياسٌ يكذب، لا فهمٌ ينقص.
  for (const s of ['بغيت نبدل رقم الهاتف ديالي', 'بغيت نشوف الزبناء ديالي',
                   'بغيت نزيد منتوج جديد', 'بغيت نشوف الرصيد ديالي']) {
    const u = understand(s) as any;
    assert.ok((u.action?.confidence ?? 0) >= 0.5, `«${s}» لا فعلَ فيها أصلًا`);
    assert.ok(understandRules(s).confidence >= 0.5,
      `«${s}» قُرئت ${u.action.verb}/${u.action.object} وتصل البوّابةَ بثقة ${understandRules(s).confidence}`);
    assert.equal(gate(s), false, `«${s}» تُرسَل للذكاء وهي مفهومةٌ تمامًا`);
  }
});

test('والغايةُ كذلك — «بنتي داخلة للمدرسة» مقروءةٌ لا مجهولة', () => {
  for (const s of ['بنتي داخلة للمدرسة', 'غادي نتزوج', 'عندي مولود جديد']) {
    assert.ok((understand(s) as any).goal?.id, `«${s}» لا غايةَ فيها`);
    assert.equal(gate(s), false, `«${s}» تُرسَل للذكاء وغايتُها مقروءة`);
  }
});

test('**والقراءةُ الضعيفةُ تبقى ضعيفة** — الحدُّ ليس تزكيةً عامّة', () => {
  // نصفُ الحارس: لو رُفعت الثقةُ بأيّ فعلٍ مهما ضعف، لَصارت قراءةُ
  // `settings` الساقطةُ (٠٫٣٥) تُسكت البوّابةَ عن أشدّ ما تحتاجه.
  const u = understand('بغيت نمشي الحي عندي غير 10 دراهم') as any;
  assert.ok((u.action?.confidence ?? 0) < 0.5, 'تغيّرت القراءةُ الساقطة — أعِد ضبطَ الحدّ');
  assert.equal(gate('بغيت نمشي الحي عندي غير 10 دراهم'), true,
    'قراءةٌ ساقطةٌ بثقة ٠٫٣٥ أسكتت البوّابة');
});

// ── ② العجزُ عجزٌ بأيّ خطٍّ كُتب ────────────────────────────────
test('**نفسُ المعنى لا يُحكَم عليه بخطِّه**', () => {
  // «bghit chi haja» كانت تُصعَّد و«بغيت شي حاجة» لا — بنفس الثقة تمامًا.
  const pairs: [string, string][] = [
    ['bghit chi haja', 'بغيت شي حاجة'],
    ['bghit nmchi l tanja', 'بغيت نمشي لطنجة'],
  ];
  for (const [lat, ar] of pairs) {
    assert.equal(understandRules(lat).confidence, understandRules(ar).confidence,
      `«${lat}» و«${ar}» ليستا بنفس الثقة — القياسُ نفسُه تغيّر`);
    assert.equal(gate(ar), gate(lat), `«${ar}» ⇒ ${gate(ar)} بينما «${lat}» ⇒ ${gate(lat)}`);
  }
});

test('وجملُ القبول الثلاثُ تبلغ الذكاءَ — وهي التي بُنيت البوّابةُ لها', () => {
  for (const s of ['بغيت نمشي لطنجة', 'بغيت نمشي الحي عندي غير 10 دراهم',
                   'مكرهتش شي سندويش طون بالحرور']) {
    assert.equal(gate(s), true, `«${s}» لا تبلغ الذكاءَ ولا تفهمها القواعد`);
  }
});

test('**والتصعيدُ يبقى استثناءً لا قاعدة** — سقفٌ يُقاس لا يُفترَض', () => {
  // بلا هذا يصير الإصلاحُ إغراقًا: كلُّ جملةٍ إلى الشبكة ⇒ بطءٌ وكلفةٌ
  // وتطبيقٌ لا يعمل بلا إنترنت. القياسُ المعلَن: ١٠–٣٠٪.
  const all = (ALL as string[]).filter(Boolean);
  const n = all.filter(s => gate(s)).length;
  const pct = Math.round((n / all.length) * 100);
  assert.ok(pct <= 30, `التصعيد ${pct}% من ${all.length} جملة — تجاوز السقف المعلَن`);
  assert.ok(pct >= 5, `التصعيد ${pct}% — البوّابةُ صارت صمّاء`);
});

test('وما فهمته القواعدُ تمامًا لا يُصعَّد', () => {
  for (const s of ['كنقلب على حداد', 'عندي مشكل فالتلفازة فالدار البيضاء', 'سبّاك فالرباط']) {
    assert.equal(gate(s), false, `«${s}» مفهومةٌ وتُرسَل للذكاء`);
  }
});

// ── ③ جوابُ الذكاء يملأ ولا يمسح ───────────────────────────────
const llm = (o: Partial<any>) => ({
  intent: 'NONE' as const, language: 'darija' as const, confidence: 0.9,
  reasoning: [], source: 'llm' as const, ...o,
});

test('**حقلٌ قرأته القواعدُ لا يُبدَّل بجوابٍ أفقر**', () => {
  const base = understand('عندي مشكل فالتلفازة فالدار البيضاء') as any;
  assert.equal(base.service, 'tv_repair');
  assert.equal(base.city, 'الدار البيضاء');
  // ذكاءٌ يقول شيئًا آخرَ تمامًا — ولا يُقبَل منه شيء.
  const { u, filled } = refine(base, llm({ profession: 'plombier', city: 'Marrakech' }) as any);
  assert.equal(u.service, 'tv_repair', 'مسح الذكاءُ خدمةً مقروءة');
  assert.equal(u.city, 'الدار البيضاء', 'مسح الذكاءُ مدينةً مقروءة');
  assert.deepEqual(filled, []);
  assert.equal(u, base, 'أُعيد كائنٌ جديدٌ بلا سببٍ — لا شيءَ مُلئ');
});

test('والفراغُ يُملأ — وهذا هو الغرض', () => {
  const base = understand('مكرهتش شي سندويش طون بالحرور') as any;
  assert.equal(base.service, undefined);
  const { u, filled } = refine(base, llm({ profession: 'snack', city: 'Casablanca' }) as any);
  assert.ok(filled.includes('service'), `لم تُملأ الخدمة — مُلئ: ${filled.join('·')}`);
  assert.ok(filled.includes('city'));
  // **والمدينةُ تُطبَّع**: «Casablanca» تدخل جدولًا يخزّن «الدار البيضاء»،
  // فلو قُبِل نصُّه كما هو لصار البحثُ صفرًا **بصمت**.
  assert.equal(u.city, 'الدار البيضاء', `قُبِل نصُّ الذكاء كما هو: ${u.city}`);
});

test('**وما لا نعرفه يُردّ** — الذكاءُ يقترح كلمةً ولا يسمّي مُعرِّفًا', () => {
  // لو قُبِل نصُّ الذكاء مُعرِّفًا لَامتلأ `service` بكلمةٍ لا وجودَ لها في
  // المعرفة، فتُبنى عليها قدرةٌ ووجهةٌ وبحثٌ — وكلُّها تسقط في الفراغ.
  const base = understand('مكرهتش شي سندويش طون بالحرور') as any;
  const { u, filled } = refine(base, llm({ profession: 'zzz_مهنة_غير_موجودة' }) as any);
  assert.equal(u.service, undefined, `دخل مُعرِّفٌ مخترَع: ${u.service}`);
  assert.deepEqual(filled, []);
});

test('وجوابُ القواعد لا يمرّ من هنا — المصدرُ يُفحَص', () => {
  // `refine` تُنادى في مسارٍ غير متزامن؛ لو مرّ عليها جوابُ القواعد
  // (`source: 'rules'`) لَرفع الثقةَ بلا معرفةٍ جديدة.
  const base = understand('مكرهتش شي سندويش طون بالحرور') as any;
  assert.deepEqual(refine(base, understandRules('سبّاك فالرباط')).filled, []);
  assert.deepEqual(refine(base, null).filled, []);
});
