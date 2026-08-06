import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ============================================================
// السقّاطة — **الأرقامُ تتحسّن ولا ترتدّ**.
//
//   سؤالُ المالك الذي وُلد منه هذا الملفّ: «كيف سنعرف أنّ كلَّ ما قمنا به
//   يؤثّر على التطبيق؟»
//
//   الاختباراتُ الأخرى تُثبت أنّ **القطعة** تعمل. وقد تكون كلُّها خضراءَ
//   والحصيلةُ رديئة: قِيس أنّ ٤٥ جملةً من ٥٩ كانت تُقابَل بسؤال، و**صفرٌ**
//   يُنفَّذ — بينما كلُّ اختبارٍ يمرّ.
//
//   فهذا الملفّ يقيس **الحصيلة**: يمرّر المدوّنةَ على كلّ الطبقات ويقارن
//   بخطِّ أساسٍ محفوظ. ولا يطلب رقمًا بعينه — يطلب **ألّا يسوء**.
//
//   ── لماذا سقّاطةٌ لا قيمةٌ ثابتة ──
//   لو ثبّتنا «٣٥ مفهومة» لسقط الاختبارُ عند كلّ تحسّن. ولو تركناه بلا حدٍّ
//   لمرّ كلُّ ارتداد. فالسقّاطةُ تسمح بالصعود وتمنع النزول — ويُحدَّث الأساسُ
//   بيدٍ واعية، لا بتشغيلٍ تلقائيٍّ يجعله يتبع العطبَ إلى أسفل.
//
//   ولا تُحذَف جملةٌ من المدوّنة لترتفع النسبة: ذاك أسهلُ طرق خداع النفس،
//   ويحرسه `sentences` أدناه.
//
//   ── وحدُّ هذه الأداة، مكتوبًا بصراحة ──
//   سُبرت بإعادة خمسة أعطابٍ من مراحلَ منجَزة. أمسكت ثلاثةً وأفلتت اثنين:
//   ارتدادَ المطبِّع (أُصلح بإضافة `variantDrift`)، وتخمينَ الجسر لقدرةٍ
//   قريبةٍ — وهذا لا يُمسَك هنا لأنّ أثرَه لا يظهر في الحصيلة، ويحرسه
//   اختبارُ الوحدة. فالنبضُ يقيس **الحصيلة**، والاختباراتُ تقيس **الآليّة**،
//   ولا يُغني أحدُهما عن الآخر. وادّعاءُ أنّ رقمًا واحدًا يكفي وهمٌ مريح.
// ============================================================

import { ALL, EXPECT_NEVER_EXECUTE, EXPECT_ASK, EXPECT_CONFIRM, EXPECT_NOT_ASK,
  EXPECT_CONCEPT, EXPECT_ADMIN, EXPECT_PERSON_FACTS } from './corpus.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = JSON.parse(readFileSync(join(ROOT, 'test/pulse.baseline.json'), 'utf8'));

const out = join(mkdtempSync(join(tmpdir(), 'amz-pulse-')), 'pulse.mjs');
execSync(`npx esbuild scripts/pulse.ts --bundle --platform=node --format=esm --outfile="${out}" --log-level=error`,
  { cwd: ROOT, stdio: 'pipe' });
const { measure } = await import(out);
const p = measure();

test('المدوّنةُ لم تُقلَّص — لا تُحذَف جملةٌ صعبةٌ لترتفع النسبة', () => {
  assert.ok(p.sentences >= BASE.sentences,
    `صُغِّرت المدوّنةُ من ${BASE.sentences} إلى ${p.sentences} — النسبةُ ترتفع بلا أن يتحسّن شيء`);
});

test('الفهمُ لا يرتدّ', () => {
  assert.ok(p.understood >= BASE.minUnderstood,
    `فُهم ${p.understood} وكان ${BASE.minUnderstood}`);
  assert.ok(p.stanceKnown >= BASE.minStanceKnown,
    `عُرف الاتّجاه في ${p.stanceKnown} وكان ${BASE.minStanceKnown}`);
});

test('استثناءُ «المجهولِ صوابًا» **سقفٌ لا باب**', () => {
  // جملُ النفي والصيغةِ التي لا تُلزم تُقاس ولا تُحاسَب: `unknown` فيها هو
  // الجوابُ الذي يوجبه الدستور. وهذا الاستثناءُ بابٌ لخداع النفس لو تُرك
  // بلا سقف: يكفي أن تُوسَّع قراءةُ النفي حتّى تصير كلُّ جملةٍ «معفاة»
  // فيبلغ الاتّجاهُ ١٠٠٪ وهو لا يقرأ شيئًا.
  //   ولذلك سقفٌ يُشدّ ولا يُرخى — كسائر السقوف في هذا الملفّ.
  assert.ok(p.stanceMoot <= BASE.maxStanceMoot,
    `اتّسع الاستثناءُ إلى ${p.stanceMoot} وكان ${BASE.maxStanceMoot} — أيُوسّع الفهمُ أم الإعفاء؟`);
  // **والمقامُ يُحرَس كالبسط.** كشفه سبر: سقّاطةُ الحلقات تقارن `ok` وحدَه
  // ولا تنظر في `of`. فمن قلّص المقامَ رفع النسبةَ والسقّاطةُ خضراء — وهو
  // نفسُ الباب الذي أُغلق للمفهوم والحقائق والغاية والوجهة، وبقي مفتوحًا
  // للاتّجاه وحدَه لأنّه لم يكن له مقامٌ مستقلٌّ قبل اليوم.
  assert.ok(p.sentences - p.stanceMoot >= BASE.minStanceCounted,
    `قُلِّل مقامُ الاتّجاه: ${p.sentences - p.stanceMoot} وكان ${BASE.minStanceCounted}`);
});

test('حقائقُ الشخص لا ترتدّ', () => {
  // كانت صفرًا. وأيُّ عودةٍ إلى الصفر تعني أنّ التطبيق نسي من يُكلّمه.
  assert.ok(p.personFacts >= BASE.minPersonFacts,
    `حقائقُ الشخص ${p.personFacts} وكانت ${BASE.minPersonFacts}`);
});

test('كلُّ جملةٍ تجد قدرةً في الكتالوج', () => {
  // نقصانُ هذا الرقم يعني جملةً يفهمها التطبيقُ ولا يعرف ماذا يفعل بها.
  assert.ok(p.abilityMatched >= BASE.minAbilityMatched,
    `طابقت ${p.abilityMatched} قدرةً وكانت ${BASE.minAbilityMatched}`);
});

test('التنفيذُ لا يقلّ', () => {
  // العطبُ الأصليّ: عتبةٌ واحدةٌ ٠٫٩٠ جعلت التنفيذَ صفرًا والسؤالَ ٤٥.
  assert.ok((p.verdicts.execute || 0) >= BASE.minExecute,
    `نُفِّذت ${p.verdicts.execute || 0} وكانت ${BASE.minExecute}`);
});

// ── جودةُ القرار — أُضيفت بعد أن أثبت سبرٌ أنّ العدَّ وحدَه يكافئ التهوّر ──
//
//   خفضتُ العتبات إلى صفرٍ فقفز `execute` من ٢٠ إلى ٤٥، وصار التطبيقُ
//   يحذف متجرًا بثقةٍ ضعيفة — ومرّت السقّاطةُ **خضراء**. فالعدُّ وحدَه لا
//   يفرّق بين فهمٍ أفضلَ وتهوّرٍ أكبر.

test('لا يُنفَّذ ما لا يجوز تنفيذُه — صفرٌ مطلق', () => {
  // نقلٌ · نفيٌ · «كيفاش» · شرطٌ · ماضٍ. **الوضوحُ ليس إذنًا.**
  assert.equal(p.wrongExecutions, 0, `نُفِّذت ${p.wrongExecutions} جملةً لا يجوز تنفيذُها`);
});

test('لا تُنفَّذ جملةٌ غامضة — صفرٌ مطلق', () => {
  // «بغيت» وحدَها لا تقول ماذا. وتنفيذُها ليس ذكاءً بل تهوّرٌ يُنتج فعلًا
  // لم يطلبه أحد.
  assert.equal(p.recklessExecutions, 0,
    `نُفِّذت ${p.recklessExecutions} جملةً غامضةً بدل أن تُسأل`);
});

test('لا يمرّ ما لا يُسترجَع بلا تأكيد — صفرٌ مطلق', () => {
  // «حيّد هاد المحل» بثقةٍ مئةٍ تبقى تأكيدًا: خطأٌ هنا يمحو عملَ سنين.
  assert.equal(p.unconfirmedDestructive, 0,
    `مرّ ${p.unconfirmedDestructive} فعلًا لا يُسترجَع بلا تأكيد`);
});

test('السؤالُ بلا داعٍ لا يكثر', () => {
  // «موتُ السحر»: أن يعرف أنّه حلّاقٌ ثمّ يسأله ما مهنتُه. وهذا المقياسُ
  // حلَّ محلَّ عدّ `ask` الخام — فالسؤالُ في محلّه ليس عيبًا.
  assert.ok(p.needlessAsks <= BASE.maxNeedlessAsks,
    `سُئلت ${p.needlessAsks} جملةً واضحةً وكانت ${BASE.maxNeedlessAsks}`);
});

test('صوابُ الحكم لا يرتدّ — ولا تُنقَص الجملُ المحكومُ عليها', () => {
  assert.ok(p.judged >= BASE.judged,
    `قُلِّلت الجملُ المحكومُ عليها من ${BASE.judged} إلى ${p.judged}`);
  assert.ok(p.correct >= BASE.minCorrect,
    `صوابُ الحكم ${p.correct} وكان ${BASE.minCorrect}`);
});

test('لا تضيع معرفةٌ بين العقلَين ولا يتّسع التناقض', () => {
  // حلّ محلَّ `brainSplit` الذي كان يعدّ ٢٤. وقياسٌ أثبت أنّه **عيبٌ في
  // التعريف**: عدَّ `car_wash` مقابل «مغسلة سيّارات» اختلافًا وهما واحد.
  // ثالثُ مقياسٍ يُكشَف كاذبًا — ولذلك تُسبَر المقاييسُ كما يُسبَر الكود.
  assert.ok(p.lostKnowledge <= BASE.maxLostKnowledge,
    `ضاعت معرفةٌ في ${p.lostKnowledge} جملةً وكانت ${BASE.maxLostKnowledge}`);
  assert.ok(p.contradiction <= BASE.maxContradiction,
    `تناقض العقلان في ${p.contradiction} جملةً وكان ${BASE.maxContradiction}`);
  // **تفاوتُ الدقّة ليس تناقضًا** — وله سقفُه المستقلّ. لولا الفصلُ لظلّ
  // السقفُ ٤ يُخفي تناقضًا حقيقيًّا واحدًا خلف ثلاثِ حالاتِ عمومٍ بريئة،
  // ولأمكن أن يزيد التناقضُ إلى ٤ والسقّاطةُ خضراء.
  assert.ok(p.abstraction <= BASE.maxAbstraction,
    `تفاوتَ مستوى الدقّة في ${p.abstraction} جملةً وكان ${BASE.maxAbstraction}`);
});

test('لا صمتَ جديد', () => {
  assert.ok(p.silent <= BASE.maxSilent,
    `صمتَ في ${p.silent} وكان ${BASE.maxSilent}`);
});

test('الفهمُ لا يتزحزح بفارقٍ لا يراه إنسان', () => {
  // أُضيف بعد سبرٍ كشف حدَّ الأداة: إعادةُ المطبِّع الضعيف **لم تُحرّك** أيَّ
  // رقمٍ آخر، لأنّ المدوّنة مكتوبةٌ بصيغةٍ واحدة والناسُ يكتبون بصيغٍ شتّى.
  assert.ok(p.variantDrift <= BASE.maxVariantDrift,
    `انحرف الفهمُ في ${p.variantDrift} حالةً وكان ${BASE.maxVariantDrift}`);
});



test('لا تضعف حلقةٌ من حلقات الفهم', () => {
  // «فُهم ٥٩٪» لا يقول أين وقع الخلل. وهذه تحرس كلَّ حلقةٍ وحدَها، فيسقط
  // الاختبارُ باسم الحلقة التي ضعفت — لا برقمٍ عامٍّ يُترَك للتخمين.
  for (const st of p.stages) {
    const min = BASE.minStages[st.name];
    assert.ok(min === undefined || st.ok >= min,
      `ضعفت حلقةُ «${st.name}»: ${st.ok}/${st.of} وكانت ${min}`);
  }
});

// ── صدقُ المقياس نفسِه ────────────────────────────────────────
//
//   تصحيحُ المقياس يرفع رقمًا بلا أن يتحسّن التطبيق (٥٩٪ ⇒ ٧٩٪ بلا سطرِ
//   كودٍ واحد). وهو بابٌ مفتوحٌ لخداع النفس: يكفي نقلُ كلّ جملةٍ صعبةٍ إلى
//   «لا تُحاسَب» ليصير كلُّ شيءٍ مئةً. فهذه الثلاثةُ تُغلقه.

test('كلُّ جملةٍ موسومةٍ **تُقاس** — لا حكمَ على غائب', () => {
  // العطبُ الذي وُلد منه هذا الحارس: ثلاثُ جملٍ موسومةٍ لم تكن في `ALL`،
  // والحلقةُ تمرّ على `ALL` وحدَها. فكان المقامُ يعدُّها والبسطُ لا يراها،
  // فبدت الحلقةُ الإداريّةُ ٨٣٪ **وهي لم تُخفق في شيء**. وأخبثُ ما فيه أنّه
  // لا يبالغ في الإخفاق ولا في النجاح — بل **يقيس فراغًا** ويسمّيه نسبة.
  const inAll = new Set(ALL);
  const strays = [
    ['EXPECT_NEVER_EXECUTE', EXPECT_NEVER_EXECUTE], ['EXPECT_ASK', EXPECT_ASK],
    ['EXPECT_CONFIRM', EXPECT_CONFIRM], ['EXPECT_NOT_ASK', EXPECT_NOT_ASK],
    ['EXPECT_CONCEPT', EXPECT_CONCEPT], ['EXPECT_ADMIN', EXPECT_ADMIN],
    ['EXPECT_PERSON_FACTS', EXPECT_PERSON_FACTS],
  ].flatMap(([name, list]) => list.filter(s => !inAll.has(s)).map(s => `${name}: «${s}»`));
  assert.deepEqual(strays, [],
    `جملٌ موسومةٌ خارجَ المدوّنة — تُحسَب في المقام ولا تُقاس أبدًا:\n  ${strays.join('\n  ')}`);
});

test('كلُّ جملةٍ مصنَّفة — لا تُهرَّب صعبةٌ خارجَ الحساب', () => {
  assert.equal(p.unclassified, 0,
    `${p.unclassified} جملةً بلا صنف — تُقاس ولا يُحاسَب عليها أحد`);
});

test('لا تُقلَّص الأصنافُ التي تُحاسَب', () => {
  // إخراجُ جملةٍ من «يُنتظَر منها مفهوم» يرفع النسبةَ بلا أن يفهم التطبيقُ
  // شيئًا جديدًا. وهذا يمنعه.
  assert.ok(p.conceptExpected >= BASE.minConceptExpected,
    `قُلِّلت الجملُ التي يُنتظَر منها مفهوم: ${p.conceptExpected} وكانت ${BASE.minConceptExpected}`);
  assert.ok(p.adminExpected >= BASE.minAdminExpected,
    `قُلِّلت الجملُ الإداريّة: ${p.adminExpected} وكانت ${BASE.minAdminExpected}`);
  // أُضيف بعد أن قُيست الحقائقُ على مقام جارتها (`EXPECT_NOT_ASK`): تصحيحُ
  // وسمِ جملتين خفض المقامَ من ١٠ إلى ٨ بلا أن يتغيّر سطرٌ في التطبيق. ولها
  // الآن مقامُها، وهذا يمنع تقليصَه.
  assert.ok(p.factExpected >= BASE.minFactExpected,
    `قُلِّل مقامُ الحقائق: ${p.factExpected} وكان ${BASE.minFactExpected}`);
  assert.ok(p.goalExpected >= BASE.minGoalExpected,
    `قُلِّل مقامُ الغاية: ${p.goalExpected} وكان ${BASE.minGoalExpected}`);
  assert.ok(p.destExpected >= BASE.minDestExpected,
    `قُلِّل مقامُ الوجهة: ${p.destExpected} وكان ${BASE.minDestExpected}`);
});

test('الفعلُ الإداريُّ يُساق إلى باب قدرته — لا إلى السوق', () => {
  // لاحظه المالك، وأثبته القياس: `parseNeed.intent` تخلط اتّجاهَ السوق بفعل
  // التطبيق، **وهي التي كانت تقرّر الصفحة**. فصاحبُ الحساب يُدير متجرَه
  // فيُساق إلى `publish` لينشر خدمة. والكتالوجُ يعرف `profile` ولم يُسأل.
  assert.ok(p.destRight >= BASE.minDestRight,
    `سِيقت ${p.destRight} جملةً إلى بابها وكانت ${BASE.minDestRight}`);
});

test('الغايةُ تُقرأ **وتصل** — لا حقلٌ مملوءٌ لا يغيّر شيئًا', () => {
  // الطبقةُ كانت مبنيّةً ونصفَ موصولة سنةً بلا أن يشتكي أحد، لأنّ المدوّنةَ
  // لم تحوِ جملةَ غايةٍ واحدة. **ما لا يُقاس لا يُصلَح** ولو كان مكتوبًا في
  // رأس الملفّ. والشرطُ ثلاثيّ: تُقرأ · تصحّح الاتّجاه · يبلغ سؤالُها الإنسان.
  assert.ok(p.goalRead >= BASE.minGoalRead,
    `قُرئت ${p.goalRead} غايةً وكانت ${BASE.minGoalRead}`);
});

test('الفعلُ الإداريُّ يُقرأ ولا يرتدّ', () => {
  // حلقةٌ كانت **خفيّةً تمامًا**: كان الإداريُّ يُحاسَب في خانة «المفهوم»
  // فيبدو إخفاقًا، ولا يُقاس بذاته فلا يُعرَف حالُه.
  assert.ok(p.adminRead >= BASE.minAdminRead,
    `قُرئ ${p.adminRead} فعلًا إداريًّا وكان ${BASE.minAdminRead}`);
});
