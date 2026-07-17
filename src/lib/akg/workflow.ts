// ============================================================
// Workflow Registry — السجلّ السادس. حتّى «المراحل» صارت بيانات: كلّ صفحة
//   لها تسلسل مراحل (مسوّدة → تفاصيل → صور → تسعير → نشر → نجاح → فرص)
//   يُقرأ من هنا، لا يُكتب في الصفحة. PageEngine يمشي: Page → Workflow →
//   Decision → Question → UIStep → Renderer. فلا منطق مراحل في أيّ صفحة.
// ============================================================

export type Phase = 'draft' | 'collect' | 'ready' | 'success' | 'followups';

export interface WorkflowStage {
  id: string;
  label: string;
  phase: Phase;    // ربط المرحلة بطور المحرّك (لإبراز الحاليّة)
}

export interface Workflow {
  pageId: string;
  stages: WorkflowStage[];
}

// ترتيب الأطوار (لتحديد المرحلة الحاليّة من طور CreateFlow).
export const PHASE_ORDER: Record<Phase, number> = { draft: 0, collect: 1, ready: 2, success: 3, followups: 4 };

const S = (id: string, label: string, phase: Phase): WorkflowStage => ({ id, label, phase });

// التسلسل الافتراضيّ للإنشاء (يُستعمَل إن لم يوجد تخصيص).
const DEFAULT: WorkflowStage[] = [
  S('draft', 'مسوّدة', 'draft'),
  S('details', 'تفاصيل', 'collect'),
  S('pricing', 'تسعير', 'collect'),
  S('publish', 'نشر', 'ready'),
  S('success', 'تمّ', 'success'),
];

const registry = new Map<string, Workflow>();
export function registerWorkflow(wf: Workflow): void { registry.set(wf.pageId, wf); }
export function getWorkflow(pageId: string): Workflow {
  return registry.get(pageId) || { pageId, stages: DEFAULT };
}
export function allWorkflows(): Workflow[] { return Array.from(registry.values()); }

// ── تسلسلات المجالات (بيانات، لا كود في الصفحة) ──
const WFS: Workflow[] = [
  { pageId: 'universal.create', stages: [S('draft', 'الحاجة', 'draft'), S('details', 'تفاصيل', 'collect'), S('publish', 'نشر', 'ready'), S('success', 'تمّ', 'success'), S('followups', 'الخطوة الجايّة', 'followups')] },
  { pageId: 'products.create',  stages: [S('draft', 'مسوّدة', 'draft'), S('details', 'تفاصيل', 'collect'), S('photos', 'صور', 'collect'), S('pricing', 'تسعير', 'collect'), S('publish', 'نشر', 'ready'), S('success', 'تمّ', 'success'), S('followups', 'الخطوة الجايّة', 'followups')] },
  { pageId: 'cars.create',      stages: [S('draft', 'مسوّدة', 'draft'), S('vehicleInfo', 'معلومات السيّارة', 'collect'), S('papers', 'الأوراق', 'collect'), S('pricing', 'تسعير', 'collect'), S('publish', 'نشر', 'ready'), S('success', 'تمّ', 'success')] },
  { pageId: 'realEstate.create', stages: [S('draft', 'مسوّدة', 'draft'), S('details', 'تفاصيل', 'collect'), S('photos', 'صور/فيديو', 'collect'), S('pricing', 'تسعير', 'collect'), S('publish', 'نشر', 'ready'), S('success', 'تمّ', 'success')] },
  { pageId: 'services.create',  stages: [S('draft', 'مسوّدة', 'draft'), S('details', 'نشاطك', 'collect'), S('photos', 'أعمالك', 'collect'), S('publish', 'نشر', 'ready'), S('success', 'تمّ', 'success')] },
];

WFS.forEach(registerWorkflow);

// المرحلة الحاليّة من طور المحرّك (يستهلكها CreateFlow للـ Stepper).
export function currentStageIndex(wf: Workflow, phase: Phase): number {
  const order = PHASE_ORDER[phase];
  let idx = 0;
  wf.stages.forEach((s, i) => { if (PHASE_ORDER[s.phase] <= order) idx = i; });
  return idx;
}
