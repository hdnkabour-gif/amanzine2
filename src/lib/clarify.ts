// ============================================================
// محرّك الاستيضاح (Clarification Engine) — HU-2.
//
//   «ما فهمناش» تختفي من المشروع. مكانُها **السؤالُ التالي**. لكنّ الجوهر
//   ليس تبديلَ جملة، بل قلبَ المسؤوليّة: النظامُ لا يحكم على المُدخل —
//   يسأل عن **الناقص فيه**.
//
//   ثلاثةُ قوانين تحكم هذا الملفّ، وكلٌّ منها يمنع عطبًا رأيناه من قبل:
//
//   ① **السؤالُ يُشتقّ من السبب لا من النصّ.** لا `if (text.includes('مشكل'))`
//      في أيّ مكان هنا. المحرّك يقرأ **ما ينقص** (وجهة؟ كائن؟ مكان؟) ويختار
//      استيضاحًا. فيومَ يصير مصدرُ التحليل صورةً أو صوتًا أو DeepSeek بدل
//      القواعد، لا يتغيّر حرفٌ في هذا الملفّ — يتغيّر المحلّل وحده.
//
//   ② **لكلّ استيضاحٍ هويّةٌ ثابتة** (`missing_target`) لا نصُّه («مع شنو؟»).
//      النصُّ يتبدّل باللغة والأسلوب؛ المعنى يبقى. وبلا هويّةٍ ثابتةٍ لا يمكن
//      قياسُ أيِّ سؤالٍ يرفع الفهمَ فعلًا — والقياسُ هو نصفُ الفائدة.
//
//   ③ **النطاقاتُ مصدرُ حقيقةٍ واحد.** كانت عتباتُ الثقة مكتوبةً في
//      `interfaceDecision` وحدَها؛ لو كُتبت هنا ثانيةً لتباعد الاثنان بصمت.
//      تُعلَن هنا، ويستوردها القرار.
// ============================================================

/** عتباتُ الثقة — مصدرٌ واحد، يستوردها كلُّ من يقرّر. */
export const CONFIDENCE = {
  /** ≥ هذا: لا نسأل إطلاقًا، ننفّذ. */
  ACT: 0.90,
  /** ≥ هذا ودون ACT: نؤكّد فقط («فهمت أنّك… صح؟» — HU-4). */
  CONFIRM: 0.60,
} as const;

/** أقصى استيضاحين؛ الثالث إهانةٌ لا مساعدة — ننتقل لإنسان. */
export const MAX_CLARIFICATIONS = 2;

/** سببُ السؤال — لا نصُّه. */
export type ClarificationReason =
  | 'missing_target'     // مع ماذا؟ (خدمة · منتج · طلب · متجر)
  | 'missing_direction'  // يأخذ أم يعطي؟ (يشتري/يبيع)
  | 'missing_object'     // ما هو الشيء بالضبط؟
  | 'missing_place'      // أين؟
  | 'no_signal';         // لا إشارةَ إطلاقًا

/** هويّةُ السؤال — ثابتةٌ عبر اللغات والصياغات. */
export type ClarificationId = ClarificationReason;

export interface ClarificationOption {
  /** هويّةٌ ثابتةٌ للجواب — هي ما يُسجَّل، لا نصُّ الزرّ. */
  id: string;
  label: string;
  /** ما يُضيفه هذا الجواب للفهم — يُدمَج ثمّ يُعاد التحليل. */
  gives: Partial<Signals>;
}

export interface Clarification {
  id: ClarificationId;
  reason: ClarificationReason;
  question: string;
  options: ClarificationOption[];
}

/** ما نعرفه عن الطلب الآن — مهما كان مصدرُه (قواعد · ذكاء · صورة · صوت). */
export interface Signals {
  intent?: string;
  confidence?: number;
  /** هل نعرف نوعَ ما يتحدّث عنه؟ (خدمة/منتج/طلب/متجر) */
  target?: 'service' | 'product' | 'order' | 'store' | 'other';
  /** هل نعرف اتّجاهَه؟ يأخذ أم يعطي. */
  direction?: 'want' | 'offer';
  /** هل ذكر الشيءَ نفسَه؟ */
  hasObject?: boolean;
  /** هل نعرف المكان؟ */
  place?: string;
  /** هويّاتُ الاستيضاحات التي سُئلت في هذه الجلسة. */
  asked?: ClarificationId[];
}

export type ClarifyMode = 'act' | 'confirm' | 'clarify' | 'escalate';

export interface ClarifyDecision {
  mode: ClarifyMode;
  /** موجودٌ حين `mode === 'clarify'` فقط. */
  clarification?: Clarification;
  /** شرحٌ إنسانيّ — «كلّ شيء قابل للشرح» (ADR-0003). */
  why: string;
}

// ── كتالوج الاستيضاحات ───────────────────────────────────────────────────────
//
//   جدولُ بيانات، لا سلسلةَ شروطٍ على النصّ. إضافةُ استيضاحٍ = سطرٌ هنا.
//   `missing` تُجيب: هل ينقص هذا؟ — تقرأ الإشاراتِ لا الكلمات.

interface CatalogEntry extends Omit<Clarification, 'reason'> {
  reason: ClarificationReason;
  missing: (s: Signals) => boolean;
  /** الأضيقُ أوّلًا: نسأل عن أكثرِ ما يحسم، لا عن أوّلِ ما نجد. */
  weight: number;
}

const CATALOG: CatalogEntry[] = [
  {
    id: 'missing_target',
    reason: 'missing_target',
    weight: 100,
    question: 'المشكل مع شنو؟',
    missing: (s) => !s.target,
    options: [
      { id: 'service', label: '🔧 خدمة ولا مختصّ', gives: { target: 'service' } },
      { id: 'product', label: '🛍️ منتوج', gives: { target: 'product' } },
      { id: 'order',   label: '📦 طلب', gives: { target: 'order' } },
      { id: 'store',   label: '🏪 متجر ديالي', gives: { target: 'store' } },
      { id: 'other',   label: '✍️ شي حاجة أخرى', gives: { target: 'other' } },
    ],
  },
  {
    id: 'missing_direction',
    reason: 'missing_direction',
    weight: 90,
    question: 'واش كتقلّب على شي حاجة، ولا عندك شي حاجة تقدّمها؟',
    missing: (s) => !s.direction,
    options: [
      { id: 'want',  label: '🔎 كنقلّب', gives: { direction: 'want' } },
      { id: 'offer', label: '📣 عندي نقدّم', gives: { direction: 'offer' } },
    ],
  },
  {
    id: 'missing_object',
    reason: 'missing_object',
    weight: 70,
    question: 'شنو بالضبط؟',
    missing: (s) => !s.hasObject,
    options: [
      { id: 'describe', label: '✍️ نوصف بكلماتي', gives: { hasObject: true } },
    ],
  },
  {
    id: 'missing_place',
    reason: 'missing_place',
    weight: 50,
    question: 'فين؟',
    // المكانُ يُسأل عنه فقط بعد أن نعرف عن ماذا نتكلّم — وإلّا كان سؤالًا
    // في الفراغ: «فين؟» قبل «شنو؟» تُشعر الإنسانَ أنّ النظام لا يتابعه.
    missing: (s) => !s.place && !!s.target,
    options: [
      { id: 'my_city', label: '📍 فمدينتي', gives: { place: 'me' } },
      { id: 'pick',    label: '🗺️ نختار مدينة', gives: { place: 'pick' } },
    ],
  },
  {
    id: 'no_signal',
    reason: 'no_signal',
    weight: 10,
    question: 'قول ليا بكلماتك: شنو محتاج دابا؟',
    missing: () => true,      // الملاذُ الأخير — يطابق دائمًا
    options: [
      { id: 'free_text', label: '✍️ نكتب', gives: { hasObject: true } },
    ],
  },
];

/** الاستيضاحُ المناسب، أو null إن لم يبقَ ما يُسأل عنه. */
export function nextClarification(s: Signals): Clarification | null {
  const asked = new Set(s.asked || []);
  const candidates = CATALOG
    .filter(c => !asked.has(c.id) && c.missing(s))
    .sort((a, b) => b.weight - a.weight);
  const c = candidates[0];
  if (!c) return null;
  return { id: c.id, reason: c.reason, question: c.question, options: c.options };
}

/**
 * القرار: ننفّذ · نؤكّد · نستوضح · ننتقل لإنسان.
 *
 *   عددُ الأسئلة ليس ثابتًا — النطاقُ يقرّره. وبعد استيضاحين بلا ارتفاعٍ في
 *   الفهم، السؤالُ الثالث ليس مساعدةً: ننتقل للكونسيرج (ADR-0006).
 */
export function clarify(s: Signals): ClarifyDecision {
  const c = s.confidence ?? 0;

  if (c >= CONFIDENCE.ACT) {
    return { mode: 'act', why: `يقينٌ ${pct(c)} — لا داعيَ لسؤال` };
  }
  if (c >= CONFIDENCE.CONFIRM) {
    return { mode: 'confirm', why: `يقينٌ ${pct(c)} — نؤكّد الفهم قبل أن نمشي` };
  }

  const askedCount = (s.asked || []).length;
  if (askedCount >= MAX_CLARIFICATIONS) {
    return { mode: 'escalate', why: `سألنا ${askedCount} ولم يرتفع الفهم — إنسانٌ خيرٌ من سؤالٍ ثالث` };
  }

  const clarification = nextClarification(s);
  if (!clarification) {
    return { mode: 'escalate', why: 'ما بقى سؤالٌ مفيد — ننتقل لإنسان' };
  }
  return { mode: 'clarify', clarification, why: `ينقص: ${clarification.reason}` };
}

/** يدمج جوابَ المستخدم في الإشارات ويسجّل أنّ السؤال طُرح. */
export function applyAnswer(s: Signals, id: ClarificationId, optionId: string): Signals {
  const entry = CATALOG.find(c => c.id === id);
  const opt = entry?.options.find(o => o.id === optionId);
  return {
    ...s,
    ...(opt?.gives || {}),
    asked: [...(s.asked || []), id],
  };
}

const pct = (c: number) => `${Math.round(c * 100)}٪`;

/** لأغراض الاختبار والتشخيص — كلُّ الهويّات المعروفة. */
export const CLARIFICATION_IDS = CATALOG.map(c => c.id);
