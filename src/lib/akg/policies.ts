// ============================================================
// Policies — الطبقة الخامسة (سياسات تشغيل). ليست قرار محتوى (Decision) ولا
//   سؤالًا (Question) ولا قدرة (Capability). إنها قواعد حوكمة: «تصفّح بحرّية،
//   لكن النشر يتطلّب دخولًا» · «حساب جديد: إعلانان كحدّ أقصى» · «مدينة مجهولة:
//   اسأل عنها». فصلها يجعل النظام أنظف: تُضاف/تُعدّل قاعدة بلا لمس أيّ Brain.
// ============================================================

export type PolicyAction = 'browse' | 'publish' | 'contact' | 'book';
export type PolicyDecision = 'allow' | 'ask' | 'deny';
export type PolicyRemedy = 'login' | 'askCity' | 'limit';

export interface PolicyContext {
  authed: boolean;
  accountAgeDays?: number;   // عمر الحساب بالأيّام
  adsPublished?: number;     // عدد الإعلانات المنشورة
  city?: string;
}

export interface PolicyResult {
  decision: PolicyDecision;
  rule?: string;             // القاعدة التي طُبّقت
  reason?: string;           // رسالة للمستخدم
  remedy?: PolicyRemedy;     // كيف يُحلّ المنع
}

type Rule = (action: PolicyAction, ctx: PolicyContext) => PolicyResult | null;

// القواعد تُقيَّم بالترتيب؛ أوّل ask/deny يفوز. تُسجَّل بلا مسّ الباقي.
const rules: Rule[] = [];
export function registerPolicy(r: Rule): void { rules.push(r); }

// ── سياسات AMANZINE الأساسيّة ──
// «لا تسجيل مُجبر» — التصفّح دائمًا مسموح.
registerPolicy((action) =>
  action === 'browse' ? { decision: 'allow', rule: 'freeBrowse' } : null);

// النشر يتطلّب دخولًا — لكن فقط عند النشر (أوّل فعل يتطلّب هويّة).
registerPolicy((action, ctx) =>
  action === 'publish' && !ctx.authed
    ? { decision: 'ask', rule: 'publishNeedsLogin', reason: 'سجّل الدخول باش ننشرو إعلانك (نحتافظو بما كتبتي).', remedy: 'login' }
    : null);

// حساب جديد (اليوم الأوّل): إعلانان كحدّ أقصى (مكافحة السبام).
registerPolicy((action, ctx) =>
  action === 'publish' && ctx.authed && (ctx.accountAgeDays ?? 99) < 1 && (ctx.adsPublished ?? 0) >= 2
    ? { decision: 'deny', rule: 'newAccountLimit', reason: 'الحسابات الجديدة محدودة بإعلانين اليوم. عاود غدًا 🌱', remedy: 'limit' }
    : null);

// مدينة مجهولة عند النشر → اسأل عنها (للنتائج القريبة).
registerPolicy((action, ctx) =>
  action === 'publish' && ctx.authed && !ctx.city
    ? { decision: 'ask', rule: 'unknownCity', reason: 'فينا مدينة؟ باش يبان إعلانك للناس القريبين.', remedy: 'askCity' }
    : null);

// تقييم السياسة — أوّل قاعدة تُقرّر ask/deny تفوز؛ وإلّا allow.
export function checkPolicy(action: PolicyAction, ctx: PolicyContext): PolicyResult {
  for (const r of rules) {
    const res = r(action, ctx);
    if (res && res.decision !== 'allow') return res;
  }
  return { decision: 'allow' };
}
