// ============================================================
// Decision Layer (رقيق) — «التطبيق يقرّر أفضل واجهة».
// دالّةٌ نقيّةٌ واحدة تُجيب عن سؤالٍ واحد: ما أقلّ واجهةٍ تُوصِل هذا المستخدم لهدفه؟
// لا محرّك جديد (القانون الرابع) — تُشفّر نطاقات الثقة التي حُدِّدت في مراجعة المنتج:
//   ٩٥%+ ووجهةٌ جاهزة → نتيجة مباشرة · يوجد سؤالٌ موجّه → اسأل واحدًا ·
//   ثقةٌ متوسّطة لنيّةٍ واحدة → «فهمت أنّك… صح؟» (تأكيد) · ثقةٌ منخفضة → ترحيب.
// تُقرَّر خطوةٌ واحدة فقط، ثم يُعاد القرار بعد كلّ جواب (Fastest Interface First).
// ============================================================

export type InterfaceMode = 'direct' | 'guided' | 'confirm' | 'welcome';

export interface DecisionInput {
  intent: string;
  confidence?: number;
  steps?: unknown[];
  url?: string;
  page?: string;
}

export interface InterfaceDecision {
  mode: InterfaceMode;
  reason: string;   // شرحٌ إنسانيّ — «كلّ شيء قابل للشرح»
}

export function decideInterface(need: DecisionInput): InterfaceDecision {
  const c = need.confidence ?? 0;
  const hasDest = !!(need.url || need.page);

  // ثقةٌ شبه منعدمة أو نيّةٌ غامضة → استقبالٌ يقود، لا نتيجةٌ خاطئة.
  if (need.intent === 'unknown' && !(need.steps && need.steps.length)) {
    return { mode: 'welcome', reason: 'نيّةٌ غير واضحة — نرحّب ونقود بدل نتيجةٍ خاطئة' };
  }
  // يوجد سؤالٌ موجّه أصلًا → اسأل سؤالًا واحدًا (المحادثة القصيرة).
  if (need.steps && need.steps.length) {
    return { mode: 'guided', reason: 'النيّة تحتاج توضيحًا — سؤالٌ واحدٌ يحسم' };
  }
  // يقينٌ عالٍ ووجهةٌ جاهزة → لا تسأل، وصّل مباشرة.
  if (c >= 0.85 && hasDest) {
    return { mode: 'direct', reason: 'يقينٌ عالٍ ووجهةٌ واضحة — نتيجة مباشرة بلا أسئلة' };
  }
  // ثقةٌ منخفضة جدًّا بلا وجهة → ترحيب.
  if (c < 0.35) {
    return { mode: 'welcome', reason: 'ثقةٌ منخفضة — نرحّب ونقترح مداخل' };
  }
  // يقينٌ متوسّط لنيّةٍ واحدة → تأكيدٌ خفيف قبل المضيّ («فهمت أنّك… صح؟»).
  return { mode: 'confirm', reason: 'يقينٌ متوسّط — نؤكّد الفهم قبل أن نمشي' };
}

// نصّ التأكيد بصوت الشخصيّة — يُعرَض في وضع confirm.
export function confirmPrompt(label: string): string {
  return `فهمت أنّك باغي ${label} — صح؟`;
}
