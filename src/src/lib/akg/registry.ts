// ============================================================
// Application Knowledge Graph (AKG) — العقل يعرف التطبيق نفسه.
//   لا يقرأ الكود، بل كلّ صفحة «تصف نفسها»: ما غرضها، أيّ حاجات تُلبّي،
//   أيّ حقول تُدير، وأيّ أفعال تُتيح، وبأيّ أوضاع (محادثة/استمارة/أساسيّات).
//   الفائدة: العقل يبني الحوار من قدرات الصفحة الحقيقيّة، لا من افتراضات،
//   ويعرف «أين» يُلبّي حاجة المستخدم. هذا هو الجسر بين Module والـ Brains.
// ============================================================

import type { Intent } from '../needEngine';
import type { Page } from '../../types';
import type { Entity } from '../blueprints';

// نوع الحقل — نفس مفردات Blueprint حتّى يتّصل الاثنان بلا ترجمة.
export type FieldKind =
  | 'text' | 'number' | 'money' | 'select' | 'city' | 'phone'
  | 'toggle' | 'photos' | 'video' | 'tags';

// وضع التفاعل مع الصفحة (طلب المستخدم الثلاثيّ).
export type CapMode = 'conversation' | 'form' | 'basics';

export interface PageField {
  key: string;
  label: string;          // بالدارجة/العربية — كما يراها المستخدم
  kind: FieldKind;
  essential?: boolean;    // من «الأساسيّات»: أقلّ ما يلزم للفعل
  evidence?: boolean;     // دليل (صور/وثيقة)
  hint?: string;
}

export interface PageAction {
  key: string;
  label: string;          // ما يراه المستخدم على الزرّ («شارك على واتساب»)
  outcome: string;        // ماذا يحدث فعلًا («يفتح واتساب برسالة جاهزة»)
  primary?: boolean;
}

export interface PageCapability {
  page: Page;             // يطابق currentPage والتوجيه — لا اختراع
  title: string;
  purpose: string;        // سطر واحد بلغة المستخدم: لماذا توجد هذه الصفحة
  intents: Intent[];      // أيّ حاجات تُلبّيها هذه الصفحة
  entities?: Entity[];    // أيّ كيانات (Blueprint) تنشرها/تُديرها
  fields: PageField[];    // ما تُديره من حقول
  actions: PageAction[];  // ما يمكن فعله هنا
  modes: CapMode[];       // الأوضاع المدعومة
  module?: string;        // الوحدة (Module) التي تنتمي إليها — معرّف من modules.ts
  services?: string[];    // خدمات (Services) تستعملها — معرّفات من services.ts
  next?: string;          // الخطوة التالية المقترحة بعد الفعل الرئيسيّ
  keywords?: string[];    // مرادفات تساعد المطابقة (دارجة/فرنسية)
}

// ── السجلّ (Registry) — كلّ صفحة تُسجّل واصفها، بلا مسّ القلب ──
const registry = new Map<Page, PageCapability>();

export function registerPage(cap: PageCapability): void {
  registry.set(cap.page, cap);
}
export function getPageCapability(page: Page): PageCapability | undefined {
  return registry.get(page);
}
export function allCapabilities(): PageCapability[] {
  return Array.from(registry.values());
}

// ── استعلامات العقل ──────────────────────────────────────────

// أيّ صفحة تُلبّي هذه الحاجة؟ (أوّل تطابق مباشر عبر intents)
export function pageForIntent(intent: Intent): PageCapability | undefined {
  return allCapabilities().find(c => c.intents.includes(intent));
}

// كلّ الصفحات التي تخدم كيانًا معيّنًا (سيّارة/عقار/منتج…).
export function pagesForEntity(entity: Entity): PageCapability[] {
  return allCapabilities().filter(c => c.entities?.includes(entity));
}

// «الأساسيّات» — الحقول الجوهريّة فقط (وضع: أعطِني الأساسيّات ونُكمل).
export function essentialFields(page: Page): PageField[] {
  return getPageCapability(page)?.fields.filter(f => f.essential) ?? [];
}

// الفعل الرئيسيّ للصفحة (الزرّ الأهمّ).
export function primaryAction(page: Page): PageAction | undefined {
  const cap = getPageCapability(page);
  return cap?.actions.find(a => a.primary) ?? cap?.actions[0];
}

// وصف مقروء للصفحة — يستعمله العقل/الأدمن ليعرف ماذا تفعل الصفحة.
export function describePage(page: Page): string {
  const c = getPageCapability(page);
  if (!c) return '';
  const acts = c.actions.map(a => a.label).join(' · ');
  return `${c.title}: ${c.purpose} — تُتيح: ${acts}`;
}

// إحصاء تغطية الرسم (كم صفحة تعرف نفسها، وكم فعلًا/حقلًا).
export function akgStats(): { pages: number; fields: number; actions: number; intents: number } {
  const caps = allCapabilities();
  const intents = new Set<Intent>();
  let fields = 0, actions = 0;
  for (const c of caps) {
    fields += c.fields.length;
    actions += c.actions.length;
    c.intents.forEach(i => intents.add(i));
  }
  return { pages: caps.length, fields, actions, intents: intents.size };
}
