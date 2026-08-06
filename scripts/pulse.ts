// ============================================================
// نبضُ التطبيق — **رقمٌ واحدٌ يُقاس قبل التغيير وبعده**.
//
//   سؤالُ المالك: «كيف سنعرف أنّ كلَّ ما قمنا به يؤثّر على التطبيق؟»
//
//   كنّا نقيس كلَّ تغييرٍ وحدَه: اختبارٌ يمرّ، وسبرٌ يُثبت أنّه يحرس. وهذا
//   يُثبت أنّ **القطعة** تعمل، ولا يقول شيئًا عن **الحصيلة**. فقد تمرّ ثمانُ
//   طبقاتٍ كلُّها خضراء ويبقى الإنسانُ يُسأل في ٣٢ جملةً من ٣٦.
//
//   هذا الملفّ يمرّر المدوّنةَ كلَّها على **كلّ** طبقةٍ ويُخرج تسعةَ أرقام.
//   يُشغَّل قبل أيّ تغييرٍ وبعده، فيُرى الأثرُ لا يُدَّعى.
//
//   ── ولماذا لا يكفي عدُّ الاختبارات ──
//   ٨١٥ اختبارًا خضراءَ لا تقول إن كان التطبيقُ صار أنفعَ للناس. والنبضُ
//   يقول: كم جملةً فُهمت؟ كم نُفِّذت؟ كم مرّةً اختلف العقلان؟ وهذه أسئلةٌ
//   عن **الحصيلة**، لا عن أيّ دالّةٍ بعينها.
// ============================================================

import { understand, stanceOf } from '../src/lib/akg/kb';
import { parseNeed } from '../src/lib/needEngine';
import { readHuman } from '../src/lib/humanIntent';
import { decideExecution } from '../src/lib/executionPolicy';
import { abilityFor, canDo } from '../src/lib/abilities';
import { readPersonFacts } from '../src/lib/personFacts';
import { readAction } from '../src/lib/akg/kb/actions';
import { resolveConcept } from '../src/lib/akg/kb/knowledge';
import { normLoose } from '../src/lib/normalize';
import { ALL, EXPECT_NEVER_EXECUTE, EXPECT_ASK, EXPECT_CONFIRM, EXPECT_NOT_ASK,
  EXPECT_CONCEPT, EXPECT_ADMIN, CLASSIFIED } from '../test/corpus.mjs';

export interface Pulse {
  /** حجمُ المدوّنة — يُذكَر كي لا تُقارَن نسبتان من مدوّنتَين. */
  sentences: number;
  /**
   * فُهم المفهومُ — **من الجمل التي يُنتظَر منها مفهوم**.
   *
   *   كان يُقاس على المدوّنة كلِّها فأعطى ٥٩٪. وقياسٌ على الفاشلات كشف أنّ
   *   ١٤ من ٢٤ ليست إخفاقًا: سبعٌ أفعالٌ إداريّةٌ فُهمت تمامًا، وسبعٌ ناقصةٌ
   *   يُسأل عنها بحقّ. فكان المقياسُ يحاسب طبقةَ المعرفة على عملِ غيرها.
   */
  understood: number;
  /** كم جملةً يُنتظَر منها مفهومٌ أصلًا — المقامُ الصادق. */
  conceptExpected: number;
  /** أفعالٌ إداريّةٌ قُرئت (`update:phone`…) من الجمل التي تنتظرها. */
  adminRead: number;
  adminExpected: number;
  /** كلُّ جملةٍ مصنَّفة؟ حارسُ ألّا تُهرَّب جملةٌ صعبةٌ خارجَ الحساب. */
  unclassified: number;
  /** عُرف الاتّجاه: يَعرض أم يطلب؟ */
  stanceKnown: number;
  /** حقائقُ الشخص المستخرَجة — كان صفرًا قبل `personFacts`. */
  personFacts: number;
  /** طابقت قدرةً في الكتالوج — أي أنّ التطبيق يعرف **ماذا يفعل** بها. */
  abilityMatched: number;
  /** توزيعُ الحكم النهائيّ. */
  verdicts: Record<string, number>;
  /**
   * **معرفةٌ ضائعة**: `parseNeed` يعرف حرفةً و`understand` لا يعرفها.
   * هذا هو الانقسامُ الذي يؤذي — «الفريجيدير ما كيخدمش» يعرفه أحدُهما
   * «تقنيَّ تبريد» ويجهله الآخر، فيعتمد الجوابُ على أيّ صفحةٍ أنت فيها.
   *
   *   وحلّ محلَّ `brainSplit` الذي كان يعدّ ٢٤. وقياسٌ أثبت أنّه **عيبٌ في
   *   التعريف**: كان يعدّ `car_wash` مقابل «مغسلة سيّارات» اختلافًا، وهما
   *   الشيءُ نفسُه بمُعرِّفٍ ولافتة. ثالثُ مقياسٍ يُكشَف كاذبًا في يومَين.
   */
  lostKnowledge: number;
  /** كلاهما يعرف ويُسمّيان **حرفتَين مختلفتَين** — تناقضٌ لا تفاوتُ دقّة. */
  contradiction: number;
  /** جملٌ لم يفهمها أحدٌ إطلاقًا. */
  silent: number;
  /**
   * **ثباتُ الصيغة**: كم حالةً تغيّر فيها الفهمُ بفارقٍ لا يراه إنسان
   * (همزة · تشكيل · مدُّ حرف · «ڭ» بدل «ك»). أُضيف بعد أن كشف سبرٌ أنّ
   * النبضَ لا يمسك ارتدادَ المطبِّع: الحصيلةُ لا تتحرّك لأنّ المدوّنة
   * مكتوبةٌ بصيغةٍ واحدة، والناسُ يكتبون بصيغٍ شتّى.
   */
  variantDrift: number;

  // ── جودةُ القرار، لا عدده ───────────────────────────────────
  //
  //   سبرٌ أثبت أنّ عدَّ التنفيذ وحدَه يكافئ التهوّر: خفضُ العتبات إلى صفرٍ
  //   يرفع `execute` من ٢٠ إلى ٤٥ **والسقّاطةُ خضراء**. فهذه الأرقامُ تسأل
  //   السؤالَ الآخر: أكان القرارُ في محلّه؟
  /** نُفِّذ ما لا يجوز تنفيذُه — **يجب أن يبقى صفرًا**. */
  wrongExecutions: number;
  /** نُفِّذت جملةٌ غامضةٌ بدل أن تُسأل — تهوّر. */
  recklessExecutions: number;
  /** فعلٌ لا يُسترجَع مرّ بلا تأكيد — أخطرُ الأصناف. */
  unconfirmedDestructive: number;
  /** سُئلت جملةٌ واضحةٌ — «موتُ السحر». */
  needlessAsks: number;
  /** كم من الأحكام المحكومِ عليها كان صحيحًا (من أصل `judged`). */
  correct: number;
  judged: number;

  // ── أين تنكسر السلسلة ───────────────────────────────────────
  //
  //   «فُهم ٥٩٪» لا يقول أين وقع الخلل: أفي التطبيع؟ أم في المفهوم؟ أم في
  //   القدرة؟ وهذه الأرقامُ تقيس **كلَّ حلقةٍ وحدَها**، فيُعرَف موضعُ الجهد
  //   بدل أن يُخمَّن. والحلقةُ الأضعفُ هي التي تُصلَح، لا التي نظنّها.
  stages: { name: string; ok: number; of: number }[];
}

export function measure(): Pulse {
  const verdicts: Record<string, number> = {};
  let understood = 0, stanceKnown = 0, personFacts = 0, abilityMatched = 0;
  let lostKnowledge = 0, contradiction = 0, wrongExecutions = 0, silent = 0, variantDrift = 0;
  let recklessExecutions = 0, unconfirmedDestructive = 0, needlessAsks = 0;
  let correct = 0, judged = 0, adminRead = 0;

  // تحويلاتٌ من الشارع: لوحاتُ مفاتيحَ مختلفة، ومدُّ الحروف، وتشكيلٌ.
  const VARIANTS: ((x: string) => string)[] = [
    x => x.replace(/ا/g, (m, i) => i === 0 || x[i - 1] === ' ' ? 'أ' : m),
    x => x.replace(/ة/g, 'ه'),
    x => x.replace(/([بتثجحخدذرزسشصضطظعغفقكلمنهوي])/g, '$1ّ'),
    x => x.replace(/([ايو])/, '$1$1$1'),
    x => x.replace(/ك/g, 'ڭ'),
  ];
  const print = (x: string) => [understand(x).service ?? '', (parseNeed(x, {}) as { intent: string }).intent,
    readHuman(x).intent, stanceOf(x)].join('|');

  for (const s of ALL) {
    const u = understand(s);
    const r = parseNeed(s, {}) as { intent: string };
    const match = abilityFor({ action: u.action ?? null, intent: r.intent });
    const able = match ? canDo(match.verb, match.entity) : true;
    const d = decideExecution(u, able, match ?? undefined);

    if (u.service && EXPECT_CONCEPT.includes(s)) understood++;
    if (EXPECT_ADMIN.includes(s) && (u.action || readAction(s))) adminRead++;
    if (u.stance && u.stance !== 'unknown') stanceKnown++;
    if (readPersonFacts(s).length) personFacts++;
    if (match) abilityMatched++;
    verdicts[d.verdict] = (verdicts[d.verdict] || 0) + 1;

    // ── الانقسام، مقيسًا بالمعنى لا بالمُعرِّف ──
    //   الوسمُ «المطلوب → مغسلة سيّارات» و`car_wash` شيءٌ واحد. فتُقارَن
    //   **أسماءُ المفهوم بكلّ لغاته** لا مُعرِّفُه، وإلّا عُدَّ الاتّفاقُ خلافًا.
    const tags: string[] = ((r as { tags?: string[] }).tags || [])
      .filter(t => /^(المشكل|المطلوب|نوع|التخصّص)/.test(t))
      .map(t => normLoose(t.split('→')[1] || t));
    const aKnows = !!u.service, bKnows = tags.length > 0;
    if (bKnows && !aKnows) lostKnowledge++;
    if (aKnows && bKnows) {
      const names = Object.values(resolveConcept(s)?.concept || {}).map(normLoose)
        .concat(normLoose(u.service || ''), normLoose(u.profession?.label || ''))
        .filter(Boolean);
      // «متجر/مطعم» أعمُّ من `greengrocer` ولا يناقضه — فالعمومُ لا يُعَدّ خلافًا.
      const GENERIC = ['متجر مطعم', 'متجر', 'مطعم'];
      const same = tags.some(t => GENERIC.includes(t) || names.some(n => t.includes(n) || n.includes(t)));
      if (!same) contradiction++;
    }

    if (!aKnows && !bKnows && readHuman(s).intent === 'NONE' && stanceOf(s) === 'unknown') silent++;
    // ── الحكمُ على الحكم ──
    if (EXPECT_NEVER_EXECUTE.includes(s)) {
      judged++;
      if (d.verdict === 'execute') wrongExecutions++; else correct++;
    }
    if (EXPECT_ASK.includes(s)) {
      judged++;
      if (d.verdict === 'execute') recklessExecutions++;
      if (d.verdict === 'ask') correct++;
    }
    if (EXPECT_CONFIRM.includes(s)) {
      judged++;
      if (d.verdict === 'execute') unconfirmedDestructive++;
      if (d.verdict === 'confirm') correct++;
    }
    if (EXPECT_NOT_ASK.includes(s)) {
      judged++;
      if (d.verdict === 'ask') needlessAsks++; else correct++;
    }

    const ref = print(s);
    for (const f of VARIANTS) { const v = f(s); if (v !== s && print(v) !== ref) variantDrift++; }
  }

  // كلُّ حلقةٍ تُقاس على ما **يخصّها**: التطبيعُ على كلّ الجمل، والحقائقُ
  // على ما يُنتظَر منه حقائقُ فقط — وإلّا حُوسبت حلقةٌ على عملِ غيرها.
  const factExpected = ALL.filter(x => EXPECT_NOT_ASK.includes(x));
  const stages = [
    { name: 'التطبيع',  ok: ALL.length * 5 - variantDrift, of: ALL.length * 5 },
    { name: 'المفهوم',  ok: understood,     of: EXPECT_CONCEPT.length },
    { name: 'الإداريّ', ok: adminRead,       of: EXPECT_ADMIN.length },
    { name: 'الاتّجاه',  ok: stanceKnown,    of: ALL.length },
    { name: 'الحقائق',  ok: factExpected.filter(x => readPersonFacts(x).length).length, of: factExpected.length },
    { name: 'القدرة',   ok: abilityMatched, of: ALL.length },
    { name: 'القرار',   ok: correct,        of: judged },
  ];

  const unclassified = ALL.filter(x => !CLASSIFIED.includes(x)).length;

  return { sentences: ALL.length, understood, stanceKnown, personFacts, stages,
    conceptExpected: EXPECT_CONCEPT.length, adminRead, adminExpected: EXPECT_ADMIN.length, unclassified,
    abilityMatched, verdicts, lostKnowledge, contradiction, silent, variantDrift,
    wrongExecutions, recklessExecutions, unconfirmedDestructive, needlessAsks, correct, judged };
}

/** جدولٌ يُقرأ بالعين — يُطبع عند التشغيل المباشر. */
export function render(p: Pulse): string {
  const pct = (n: number) => `${n}/${p.sentences} (${Math.round(n / p.sentences * 100)}٪)`;
  const v = Object.entries(p.verdicts).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`).join(' · ');
  return [
    `المدوّنة        : ${p.sentences} جملة`,
    `فُهم المفهوم    : ${p.understood}/${p.conceptExpected} (${Math.round(p.understood / p.conceptExpected * 100)}٪)  ← ممّا يُنتظَر منه مفهوم`,
    `فعلٌ إداريّ      : ${p.adminRead}/${p.adminExpected} (${Math.round(p.adminRead / p.adminExpected * 100)}٪)`,
    `غيرُ مصنَّفة     : ${p.unclassified}   ← يجب أن يبقى صفرًا`,
    `عُرف الاتّجاه    : ${pct(p.stanceKnown)}`,
    `حقائقُ الشخص    : ${pct(p.personFacts)}`,
    `طابقت قدرةً     : ${pct(p.abilityMatched)}`,
    `الأحكام         : ${v}`,
    `معرفةٌ ضائعة    : ${p.lostKnowledge}   ← يعرفها عقلٌ ويجهلها الآخر`,
    `تناقضٌ صريح     : ${p.contradiction}   ← حرفتان مختلفتان لجملةٍ واحدة`,
    `صمتٌ تامّ        : ${pct(p.silent)}`,
    `انحرافُ الصيغة  : ${p.variantDrift}   ← كلّما قلّ كان أفضل`,
    '',
    `── جودةُ القرار (${p.judged} جملةً محكومًا عليها) ──`,
    `صوابُ الحكم     : ${p.correct}/${p.judged} (${Math.round(p.correct / p.judged * 100)}٪)`,
    `تنفيذُ ما لا يجوز: ${p.wrongExecutions}   ← صفرٌ مطلق`,
    `تنفيذٌ متهوّر     : ${p.recklessExecutions}   ← نُفِّذت جملةٌ غامضة`,
    `حذفٌ بلا تأكيد   : ${p.unconfirmedDestructive}   ← صفرٌ مطلق`,
    `سؤالٌ بلا داعٍ    : ${p.needlessAsks}   ← سُئلت جملةٌ واضحة`,
    '',
    '── أين تنكسر السلسلة ──',
    ...p.stages.map(st => {
      const r = st.of ? st.ok / st.of : 1;
      const bar = '█'.repeat(Math.round(r * 20)).padEnd(20, '░');
      return `${st.name.padEnd(9)} ${bar} ${Math.round(r * 100)}٪  (${st.ok}/${st.of})`;
    }),
  ].join('\n');
}
