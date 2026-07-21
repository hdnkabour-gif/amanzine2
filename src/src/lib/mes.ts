// ============================================================
// MES — Moroccan Experience System (دليل صياغة، لا Framework). المبدأ: الصدق
//   والدفء بالدارجة. «ما لقيناش دابا، ولكن غادي نقلبو ليك» بدل «لا توجد نتائج».
//   نصوص مركزيّة تستهلكها الواجهات + تسجيل ملاحظات المستخدم (تذهب لحلقة
//   التعلّم نفسها — trackAPI + سجلّ محلّي) لتقودنا البيانات في البيتا.
// ============================================================

import { trackAPI } from '../services/api';

export const MES = {
  // بحث/نتائج
  searching: 'كنقلبو ليك…',
  noResults: (q?: string) => q
    ? `ما لقيناش «${q}» دابا — ولكن سجّلنا طلبك وغادي نقلبو ليك.`
    : 'ما لقيناش دابا — ولكن غادي نقلبو ليك.',
  noProviders: 'عاد بدينا فهاد المدينة — طلبك تسجّل، وملّي يوصل مزوّد قريب غادي تلقاه هنا.',
  tryWider: 'جرّب كلمة أخرى، ولا وسّع البحث لمدينة أخرى.',
  // أخطاء
  error: 'وقع مشكل صغير — عاود المحاولة. إلا تكرّر، قول لينا من زرّ «بلّغ».',
  offline: 'الاتصال مقطوع — اللي كتشوف محفوظ محلّيًّا حتى يرجع الإنترنت.',
  // نجاح/دفء
  found: 'وجدنا ليك ✓',
  thanks: 'شكرًا — وصلنا صوتك 🙏',
} as const;

// ملاحظة مستخدم (مشكل/اقتراح) → نفس حلقة التعلّم: الخادم (إن اتّصل) + سجلّ محلّي.
const FEEDBACK_KEY = 'amanzine_feedback';

export interface UserFeedback { at: number; text: string; page?: string }

export function reportProblem(text: string, page?: string): void {
  const t = (text || '').trim();
  if (!t) return;
  try {
    const all: UserFeedback[] = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
    all.unshift({ at: Date.now(), text: t, page });
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all.slice(0, 100)));
  } catch { /* noop */ }
  // إشارة تعلّم قويّة للخادم (fire-and-forget، آمنة أوفلاين/ديمو)
  try { trackAPI.need('unsatisfied', { raw: `[بلاغ] ${t}`, intent: 'feedback' }); } catch { /* noop */ }
}

export function getFeedback(): UserFeedback[] {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]'); } catch { return []; }
}
