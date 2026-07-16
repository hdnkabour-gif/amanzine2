// ============================================================
// Capabilities Engine — المرحلة ٢. الصفحة لم تعد كودًا مستقلًّا، بل «مجموعة
//   قدرات» (Services) قابلة للاستدعاء. هذا المحرّك يعرف — لأيّ صفحة وبأيّ
//   قيَم حاليّة — أيّ قدرات متاحة الآن وأيّها ينتظر مدخلًا (مثلًا «إزالة
//   الخلفيّة» تحتاج صورة). أيّ صفحة تعرض أزرارها من هنا، لا من كود مكرّر.
// ============================================================

import { getService, type AppService } from './services';
import { getPageCapability } from './registry';
import type { Page } from '../../types';

export interface CapabilityState {
  service: AppService;
  available: boolean;   // جاهزة للتشغيل الآن؟
  missing: string[];    // مفاتيح المدخلات الناقصة (needs غير المستوفاة)
}

// هل القيمة مُدخَلة فعلًا؟ (فارغ/غير موجود/مصفوفة فارغة = ناقص)
export function isFilled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// حالة قدرة واحدة بالنظر إلى القيَم الحاليّة.
export function capabilityState(serviceId: string, values: Record<string, unknown> = {}): CapabilityState | undefined {
  const service = getService(serviceId);
  if (!service) return undefined;
  const missing = (service.needs ?? []).filter(k => !isFilled(values[k]));
  return { service, available: missing.length === 0, missing };
}

// كلّ قدرات صفحة، مرتّبة: المتاحة أوّلًا، مع سبب الانتظار للبقيّة.
export function capabilitiesForPage(page: Page, values: Record<string, unknown> = {}): CapabilityState[] {
  const cap = getPageCapability(page);
  const ids = cap?.services ?? [];
  const states = ids
    .map(id => capabilityState(id, values))
    .filter(Boolean) as CapabilityState[];
  return states.sort((a, b) => Number(b.available) - Number(a.available));
}

// عدّاد سريع: كم قدرة متاحة الآن من أصل كم (للعرض «٣/٧ جاهزة»).
export function capabilityReadiness(page: Page, values: Record<string, unknown> = {}): { ready: number; total: number } {
  const states = capabilitiesForPage(page, values);
  return { ready: states.filter(s => s.available).length, total: states.length };
}
