// ============================================================
// Action Planner — طبقة التنفيذ. AMANZINE ليس نظام فهم فقط، بل نظام تنفيذ.
//   يحوّل القرار المكتمل إلى أفعال حقيقيّة (نشر · مشاركة · QR · واتساب · AI)
//   ثمّ يقترح الخطوة المجاورة (opportunities) من Entity Relations — بلا if.
//   يستهلك DNA + Decision + Relations، ولا يعرف تفاصيل الواجهة (يعطي
//   معرّفات أفعال/خدمات تنفّذها الصفحة).
// ============================================================

import { resolveDna } from './dna';
import { decide } from './decision';
import { capabilitiesForPage } from './capabilities';
import { primaryAction } from './registry';
import type { Relation } from './relations';

export type ActionKind = 'primary' | 'ai' | 'share' | 'route';

export interface PlannedAction {
  id: string;          // معرّف فعل/خدمة تنفّذه الصفحة
  label: string;
  outcome: string;
  kind: ActionKind;
  available: boolean;  // جاهز الآن (استوفى مدخلاته)؟
}

export interface ActionPlan {
  ready: boolean;                 // الأساسيّات مكتملة → يمكن التنفيذ؟
  primary?: PlannedAction;        // الفعل الرئيسيّ (نشر/إضافة)
  ai: PlannedAction[];            // توليد الذكاء (وصف/ثمن/تحسين صورة)
  share: PlannedAction[];         // مشاركة (واتساب/سوشل/QR)
  opportunities: Relation[];      // خطوات مجاورة بعد الإنجاز (الفرص)
}

export function planActions(need: string, values: Record<string, unknown> = {}): ActionPlan {
  const dna = resolveDna(need);
  const d = decide(need, values);
  const ready = !d.askNow;

  // الفعل الرئيسيّ من واصف الصفحة.
  const pageId = dna.page?.page;
  const pa = pageId ? primaryAction(pageId) : undefined;
  const primary: PlannedAction | undefined = pa
    ? { id: pa.key, label: pa.label, outcome: pa.outcome, kind: 'primary', available: ready }
    : undefined;

  // القدرات المتاحة للصفحة بالنظر للقيَم الحاليّة → نصنّفها.
  const caps = pageId ? capabilitiesForPage(pageId, values) : [];
  const ai: PlannedAction[] = caps
    .filter(c => c.service.kind === 'ai' || c.service.kind === 'media')
    .map(c => ({ id: c.service.id, label: c.service.label, outcome: c.service.outcome, kind: 'ai', available: c.available }));
  const share: PlannedAction[] = caps
    .filter(c => c.service.kind === 'share')
    .map(c => ({ id: c.service.id, label: c.service.label, outcome: c.service.outcome, kind: 'share', available: c.available }));

  return { ready, primary, ai, share, opportunities: dna.followUps };
}
