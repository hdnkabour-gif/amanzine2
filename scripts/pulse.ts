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
import { ALL, MUST_NOT_ACT } from '../test/corpus.mjs';

export interface Pulse {
  /** حجمُ المدوّنة — يُذكَر كي لا تُقارَن نسبتان من مدوّنتَين. */
  sentences: number;
  /** فُهم المفهومُ (حرفة/خدمة/سلعة). */
  understood: number;
  /** عُرف الاتّجاه: يَعرض أم يطلب؟ */
  stanceKnown: number;
  /** حقائقُ الشخص المستخرَجة — كان صفرًا قبل `personFacts`. */
  personFacts: number;
  /** طابقت قدرةً في الكتالوج — أي أنّ التطبيق يعرف **ماذا يفعل** بها. */
  abilityMatched: number;
  /** توزيعُ الحكم النهائيّ. */
  verdicts: Record<string, number>;
  /**
   * **اختلافُ العقلَين**: `understand` يرى مفهومًا و`parseNeed` يقول
   * `unknown`، أو العكس. هذا هو الرقمُ الذي يقيس الانقسامَ البنيويّ.
   */
  brainSplit: number;
  /** جملٌ يجب ألّا يُنفَّذ لها شيءٌ — ونُفِّذ. **يجب أن يبقى صفرًا.** */
  wrongExecutions: number;
  /** جملٌ لم يفهمها أحدٌ إطلاقًا. */
  silent: number;
  /**
   * **ثباتُ الصيغة**: كم حالةً تغيّر فيها الفهمُ بفارقٍ لا يراه إنسان
   * (همزة · تشكيل · مدُّ حرف · «ڭ» بدل «ك»). أُضيف بعد أن كشف سبرٌ أنّ
   * النبضَ لا يمسك ارتدادَ المطبِّع: الحصيلةُ لا تتحرّك لأنّ المدوّنة
   * مكتوبةٌ بصيغةٍ واحدة، والناسُ يكتبون بصيغٍ شتّى.
   */
  variantDrift: number;
}

export function measure(): Pulse {
  const verdicts: Record<string, number> = {};
  let understood = 0, stanceKnown = 0, personFacts = 0, abilityMatched = 0;
  let brainSplit = 0, wrongExecutions = 0, silent = 0, variantDrift = 0;

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

    if (u.service) understood++;
    if (u.stance && u.stance !== 'unknown') stanceKnown++;
    if (readPersonFacts(s).length) personFacts++;
    if (match) abilityMatched++;
    verdicts[d.verdict] = (verdicts[d.verdict] || 0) + 1;

    // انقسامُ العقلَين: أحدُهما يعرف والآخر لا.
    const aKnows = !!u.service;
    const bKnows = r.intent !== 'unknown';
    if (aKnows !== bKnows) brainSplit++;

    if (!aKnows && !bKnows && readHuman(s).intent === 'NONE' && stanceOf(s) === 'unknown') silent++;
    // ما لا يجوز تنفيذُه: نقلٌ · نفيٌ · سؤالُ «كيفاش» · شرطٌ · ماضٍ.
    if (MUST_NOT_ACT.includes(s) && d.verdict === 'execute') wrongExecutions++;

    const ref = print(s);
    for (const f of VARIANTS) { const v = f(s); if (v !== s && print(v) !== ref) variantDrift++; }
  }

  return { sentences: ALL.length, understood, stanceKnown, personFacts,
    abilityMatched, verdicts, brainSplit, wrongExecutions, silent, variantDrift };
}

/** جدولٌ يُقرأ بالعين — يُطبع عند التشغيل المباشر. */
export function render(p: Pulse): string {
  const pct = (n: number) => `${n}/${p.sentences} (${Math.round(n / p.sentences * 100)}٪)`;
  const v = Object.entries(p.verdicts).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`).join(' · ');
  return [
    `المدوّنة        : ${p.sentences} جملة`,
    `فُهم المفهوم    : ${pct(p.understood)}`,
    `عُرف الاتّجاه    : ${pct(p.stanceKnown)}`,
    `حقائقُ الشخص    : ${pct(p.personFacts)}`,
    `طابقت قدرةً     : ${pct(p.abilityMatched)}`,
    `الأحكام         : ${v}`,
    `انقسامُ العقلَين : ${pct(p.brainSplit)}   ← كلّما قلّ كان أفضل`,
    `صمتٌ تامّ        : ${pct(p.silent)}`,
    `انحرافُ الصيغة  : ${p.variantDrift}   ← كلّما قلّ كان أفضل`,
    `تنفيذٌ خاطئ      : ${p.wrongExecutions}   ← يجب أن يبقى صفرًا`,
  ].join('\n');
}
