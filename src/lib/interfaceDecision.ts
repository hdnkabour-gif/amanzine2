// ============================================================
// Decision Layer (رقيق) — «التطبيق يقرّر أفضل واجهة».
// دالّةٌ نقيّةٌ واحدة تُجيب عن سؤالٍ واحد: ما أقلّ واجهةٍ تُوصِل هذا المستخدم لهدفه؟
// لا محرّك جديد (القانون الرابع) — تُشفّر نطاقات الثقة التي حُدِّدت في مراجعة المنتج:
//   ٩٥%+ ووجهةٌ جاهزة → نتيجة مباشرة · يوجد سؤالٌ موجّه → اسأل واحدًا ·
//   ثقةٌ متوسّطة لنيّةٍ واحدة → «فهمت أنّك… صح؟» (تأكيد) · ثقةٌ منخفضة → ترحيب.
// تُقرَّر خطوةٌ واحدة فقط، ثم يُعاد القرار بعد كلّ جواب (Fastest Interface First).
// ============================================================

import { CONFIDENCE, MAX_CLARIFICATIONS } from './clarify';

// `clarify` = عندنا سؤالُ استيضاحٍ مبنيٌّ على **الناقص** (HU-2).
// `escalate` = سألنا ما يكفي بلا ارتفاعٍ في الفهم ⇒ إنسان (ADR-0006).
// و`welcome` تقلّصت لمعناها الحقيقيّ: **لا مُدخلَ أصلًا**. كانت تبتلع كلَّ
// ثقةٍ منخفضة، وهذا هو «ما فهمناش» بلباسٍ مهذَّب.
export type InterfaceMode = 'direct' | 'guided' | 'confirm' | 'clarify' | 'escalate' | 'welcome';

export interface DecisionInput {
  intent: string;
  confidence?: number;
  steps?: unknown[];
  url?: string;
  page?: string;
  /** هل كتب المستخدمُ شيئًا أصلًا؟ الفارقُ بين «لا نفهم» و«لا مُدخل». */
  hasInput?: boolean;
  /** كم استيضاحًا سُئل في هذه الجلسة — يقرّر متى ننتقل لإنسان. */
  askedCount?: number;
}

export interface InterfaceDecision {
  mode: InterfaceMode;
  reason: string;   // شرحٌ إنسانيّ — «كلّ شيء قابل للشرح»
}

export function decideInterface(need: DecisionInput): InterfaceDecision {
  const c = need.confidence ?? 0;
  const hasDest = !!(need.url || need.page);

  // لا مُدخلَ أصلًا → ترحيب. هذه وحدَها حالةُ الترحيب: أن يدخل الإنسانُ ولم
  // يقل شيئًا بعد. أمّا أن يقول ولا نفهم، فذاك سؤالٌ لا ترحيب.
  if (need.hasInput === false) {
    return { mode: 'welcome', reason: 'لا مُدخلَ بعد — نرحّب ونقترح مداخل' };
  }
  // يوجد سؤالٌ موجّه أصلًا → اسأل سؤالًا واحدًا (المحادثة القصيرة).
  if (need.steps && need.steps.length) {
    return { mode: 'guided', reason: 'النيّة تحتاج توضيحًا — سؤالٌ واحدٌ يحسم' };
  }
  // يقينٌ عالٍ ووجهةٌ جاهزة → لا تسأل، وصّل مباشرة.
  if (c >= CONFIDENCE.ACT && hasDest) {
    return { mode: 'direct', reason: 'يقينٌ عالٍ ووجهةٌ واضحة — نتيجة مباشرة بلا أسئلة' };
  }
  // يقينٌ متوسّط → تأكيدٌ خفيف قبل المضيّ («فهمت أنّك… صح؟» — HU-4).
  if (c >= CONFIDENCE.CONFIRM) {
    return { mode: 'confirm', reason: 'يقينٌ متوسّط — نؤكّد الفهم قبل أن نمشي' };
  }
  // دون ذلك: **نسأل**، ولا نعتذر. وبعد استيضاحين بلا ارتفاع ⇒ إنسان.
  if ((need.askedCount ?? 0) >= MAX_CLARIFICATIONS) {
    return { mode: 'escalate', reason: 'سألنا ما يكفي بلا ارتفاعٍ في الفهم — إنسانٌ خيرٌ من سؤالٍ ثالث' };
  }
  return { mode: 'clarify', reason: 'ما فهمنا كفايةً — نسأل عن الناقص بدل أن نعتذر' };
}

// نصّ التأكيد بصوت الشخصيّة — يُعرَض في وضع confirm.
export function confirmPrompt(label: string): string {
  return `فهمت أنّك باغي ${label} — صح؟`;
}
