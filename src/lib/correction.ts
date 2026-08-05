// ============================================================
// التصحيحُ الفوريّ — «لا، ماشي هادشي».
//
//   الزرُّ موجودٌ منذ مدّة: «✏️ ماشي هاكّا — صحّح». وقياسُ ما يفعله:
//
//       recordConfirm(false, confidence);   // عدّادٌ يزيد واحدًا
//       reset();                            // setText('') …
//
//   أي أنّ التصحيح **يمحو جملةَ الإنسان** ويعيده إلى خانةٍ فارغة، ويسجّل
//   أنّ شيئًا كان خطأً بلا أن يسجّل **ما هو**. فيدفع الإنسانُ ثمنَ خطئنا
//   مرّتين: يكتب من جديد، ولا يتحسّن شيءٌ حين يكتب.
//
//   ── ولماذا هذا أخطرُ ممّا يبدو ──
//   عندنا قناةٌ لما **لم نفهمه** (`learning_unknowns`: نصٌّ + عدّاد + حالة
//   يراها الأدمن). ولا قناةَ لما **فهمناه غلطًا**. والثاني أسوأُ: الصامتُ
//   يسأل، والواثقُ المخطئُ يمضي بالإنسان إلى بابٍ ليس بابَه. فأشدُّ أخطائنا
//   هو وحدَه الذي لا يُقاس.
//
//   ── ثلاث قواعد ──
//   ① **الجملةُ تبقى.** لا نمحو ما كتبه ليصحّح؛ التصحيحُ حرفٌ لا صفحة.
//   ② **نسأل عمّا ادّعيناه نحن**، لا سؤالًا عامًّا. إن قلنا «ميكانيكي ف
//      الدار البيضاء» فالخياراتُ: «ماشي ميكانيكي» · «ماشي الدار البيضاء».
//      والسؤالُ العامّ («شنو غالط؟») يُرجع العبءَ إلى الإنسان بعد أن أخطأنا.
//   ③ **التصحيحُ شخصيٌّ يُطبَّق، واقتراحٌ عامٌّ يُعرَض.** القانون #٣ يمنع
//      التعديلَ الذاتيّ: تصحيحُ فردٍ يصلح فهمَه هو فورًا، ولا يُعلّم التطبيقَ
//      كلَّه — وإلّا علّمت غلطةُ واحدٍ الناسَ جميعًا. يذهب إلى الأدمن عدًّا
//      لا حكمًا، كما تذهب المجهولات.
// ============================================================

import type { Understanding } from './akg/kb';

const LEARN_KEY = 'amanzine_learned';

/** ما يمكن أن يكون خطأً — كلٌّ منها شيءٌ **ادّعيناه** فعلًا. */
export type WrongField = 'profession' | 'city' | 'problem' | 'all';

export interface CorrectionOption {
  field: WrongField;
  /** ما يُعرَض على الزرّ — يذكر ما قلناه حرفيًّا. */
  label: string;
  /** السؤالُ الواحدُ الذي يلي الاختيار. */
  ask: string;
}

/**
 * يبني خياراتِ التصحيح **من الفهم نفسِه**.
 *
 *   لا خيارَ لحقلٍ لم نملأه: من لم نذكر له مدينةً لا يُعرَض عليه «ماشي
 *   المدينة» — وهو سؤالٌ عن شيءٍ لم يقع.
 */
export function correctionOptions(u: Understanding | null | undefined): CorrectionOption[] {
  const out: CorrectionOption[] = [];
  if (!u) return out;

  const prof = u.profession?.label;
  if (prof) out.push({ field: 'profession', label: `ماشي ${prof}`, ask: `إذن شنو كتقلّب عليه بالضبط؟` });

  if (u.problem?.name) out.push({ field: 'problem', label: `ماشي ${u.problem.name}`, ask: 'شنو هو المشكل بالضبط؟' });

  if (u.city) out.push({ field: 'city', label: `ماشي ${u.city}`, ask: 'فين نتا؟' });

  // «كلشي غالط» آخرًا دائمًا: خيارُ من لم يجد نفسه في التفاصيل. ولو جاء
  // أوّلًا لاختاره الناسُ كسلًا، فنفقد الحرفَ الذي أخطأنا فيه.
  out.push({ field: 'all', label: 'كلشي غالط', ask: 'عاود قول ليا بكلماتك — شنو بغيتي؟' });
  return out;
}

/** ما نبلّغ به الأدمنَ: فهمٌ واثقٌ ردّه صاحبُه. */
export interface Misread {
  /** نصُّ الإنسان كما كتبه — بدونه لا يمكن إصلاح شيء. */
  text: string;
  /** ما قلناه له (المُعرِّف أو الاسم). */
  said: string;
  /** أيُّ جزءٍ ردّه. */
  field: WrongField;
  /** ثقتُنا حين أخطأنا — الثقةُ العاليةُ مع الردّ أخطرُ من الضعيفة. */
  confidence: number;
}

export function buildMisread(text: string, u: Understanding | null | undefined, field: WrongField): Misread | null {
  const t = (text || '').trim();
  if (!t) return null;
  const said = field === 'city' ? (u?.city || '')
    : field === 'problem' ? (u?.problem?.name || '')
    : field === 'profession' ? (u?.profession?.label || '')
    : (u?.profession?.label || u?.problem?.name || u?.service || '');
  return { text: t, said, field, confidence: u?.confidence ?? 0 };
}

function readLearned(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const v = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

/**
 * يُطبّق تصحيحًا **لهذا الشخص وحدَه**.
 *
 *   يكتب في `amanzine_learned` — نفسُ الخريطة التي يقرؤها `matchApprovedMemory`
 *   ويرفع بها `understand` ثقتَه. فيصير الأثرُ فوريًّا: من صحّح مرّةً لا
 *   يُخطَأ عليه ثانية.
 *
 *   وحدُّه صريح: **الجملةُ التي كتبها هو**، لا قاعدةٌ عامّة. ولا يُكتب شيءٌ
 *   إن كان التصحيحُ فارغًا — «صحّحتُ إلى لا شيء» تعليمٌ للعدم.
 *
 * @returns هل كُتب شيءٌ فعلًا؟
 */
export function applyCorrection(text: string, corrected: string): boolean {
  const phrase = (text || '').trim().toLowerCase();
  const concept = (corrected || '').trim();
  if (!phrase || !concept) return false;
  if (typeof localStorage === 'undefined') return false;
  try {
    const mem = readLearned();
    mem[phrase] = concept;
    localStorage.setItem(LEARN_KEY, JSON.stringify(mem));
    return true;
  } catch { return false; }
}

/** سطرٌ يُقال للإنسان بعد أن يصحّح — الاعترافُ أرخصُ من الادّعاء. */
export function thankFor(field: WrongField): string {
  return field === 'all'
    ? 'سمح ليا — ما فهمتش مزيان. عاود قول ليا وغادي نركّز.'
    : 'شكرًا على التصحيح — عرفتها دابا، وما غاديش نعاود نفس الغلطة معاك.';
}
