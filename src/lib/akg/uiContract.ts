// ============================================================
// UI Contract — العقد الوحيد بين العقل والواجهة. العقل لا يُصدّر «حقولًا» ولا
//   «أنواعًا»، بل خطوة واجهة مكتملة (UIStep): ماذا نعرض الآن، بأيّ widget،
//   بأيّ خيارات، مع الافتراضات والنسبة والأفعال. الواجهة تعرض UIStep فقط —
//   لا if ولا switch على field.type. لو بدّلنا React بـ Flutter، لا يتغيّر
//   العقل، فقط الـ Renderer. هذا يفصل «كيف يفكّر» عن «كيف يُعرَض».
// ============================================================

import { decide } from './decision';
import { planQuestion } from './planner';
import { planActions } from './actionPlanner';
import { themeOf, type DomainTheme } from './schema';
import { WIDGET, type Widget } from './widgets';

export interface UIField {
  key: string;
  widget: Widget;
  placeholder?: string;
  choices?: string[];
  required: boolean;
}

export interface UIAssumption {
  key: string;
  label: string;
  value: string;
  confidence: 'high' | 'medium';   // ✓ متأكّد · ~ خمّنّا
}

export interface UIAction {
  id: string;
  label: string;
  kind: 'primary' | 'secondary';
}

export interface UIStep {
  mode: 'question' | 'ready';   // نسأل حقلًا · أو جاهز للتنفيذ
  headline: string;             // نصّ السؤال أو عنوان الجاهزيّة
  hint?: string;
  scenarioLabel: string;        // عنوان القالب («سيّارة للبيع») — للعرض
  field?: UIField;              // الحقل المطلوب الآن (في وضع question)
  assumptions: UIAssumption[];  // «فكّرنا قبل ما نسولوك»
  progress: number;             // 0..100
  actions: UIAction[];          // الأفعال المتاحة (نشر/عرض الكل…)
  theme: DomainTheme;           // عالم المجال (لون/رمز/مزاج) — يستهلكه الـ Renderer
}

// البنّاء: من حاجة + قيَم → خطوة واجهة كاملة. مصدرها العقل، لا الصفحة.
// rejected = افتراضات صحّحها المستخدم فلا تُعرَض ولا تُنشَر.
export function buildUIStep(need: string, values: Record<string, unknown> = {}, rejected: string[] = []): UIStep {
  const dec = decide(need, values);
  const plan = planQuestion(need, values);

  const assumptions: UIAssumption[] = dec.assumed
    .filter(a => !rejected.includes(a.key))
    .map(a => ({
      key: a.key, label: a.label, value: String(a.value),
      confidence: a.kind === 'auto' ? 'high' : 'medium',
    }));

  const theme = themeOf(dec.entity);

  if (plan.askNow) {
    const q = plan.askNow;
    return {
      mode: 'question',
      headline: q.question,
      hint: q.hint,
      scenarioLabel: dec.blueprintLabel,
      field: { key: q.key, widget: WIDGET[q.type], placeholder: q.hint, choices: q.options, required: q.required },
      assumptions,
      progress: plan.progress,
      actions: [{ id: 'showAll', label: 'خلّصني دفعة وحدة ←', kind: 'secondary' }],
      theme,
    };
  }

  return {
    mode: 'ready',
    headline: 'واجد! جمعنا كل الأساسيّ ✓',
    scenarioLabel: dec.blueprintLabel,
    assumptions,
    progress: plan.progress,
    actions: [{ id: 'publish', label: 'نشر الآن', kind: 'primary' }],
    theme,
  };
}

// كامل الحقول كـ UIField (لوضع «عرض الكل») — نفس العقد، بلا منطق في الصفحة.
export function allUIFields(need: string): (UIField & { label: string })[] {
  const dec = decide(need, {});
  return dec.fields.map(f => ({
    key: f.key, label: f.label, widget: WIDGET[f.type],
    placeholder: f.hint, choices: f.options, required: f.essential,
  }));
}

// الأفعال بعد الإنجاز (تنفيذ + فرص) — يستهلكها الـ Renderer نفسه لاحقًا.
export function stepActions(need: string, values: Record<string, unknown> = {}) {
  const ap = planActions(need, values);
  return { primary: ap.primary, ai: ap.ai, share: ap.share, opportunities: ap.opportunities, ready: ap.ready };
}

