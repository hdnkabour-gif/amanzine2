// ============================================================
// Question Planner — «المخطّط الغبيّ». لا يعرف صفحات ولا حقولًا ولا استنتاجًا.
//   يسأل الـ Decision Engine فقط: «شنو نسول دابا؟» فيأخذ askNow (سؤال واحد)
//   ويصوغه بالدارجة. يكرّر حتى تكتمل الأساسيّات. كلّ الذكاء فوقه — هو مجرّد
//   مُحاوِر. هذا يجعل تغيير الصفحات/الحقول لا يمسّه إطلاقًا.
// ============================================================

import { decide, type FieldDecision } from './decision';
import type { FieldType } from '../blueprints';

export interface PlannerQuestion {
  key: string;
  label: string;
  question: string;    // صياغة السؤال بالدارجة
  type: FieldType;     // نوع الحقل (لعرض عنصر التحكّم)
  options?: string[];
  hint?: string;
  required: boolean;
}

export interface PlannerState {
  need: string;
  askNow?: PlannerQuestion;    // السؤال الوحيد التالي (أو لا شيء = اكتمل)
  assumed: FieldDecision[];    // «فكّرنا قبل ما نسولوك» — للعرض
  aiOffers: FieldDecision[];   // حقول يقدر الذكاء يولّدها
  progress: number;            // 0..100 نسبة الأساسيّات المُنجزة
  complete: boolean;           // لا سؤال أساسيّ ناقص
}

// صياغة السؤال بالدارجة حسب مفتاح الحقل (مع بديل عامّ).
const QMAP: Record<string, string> = {
  title: 'شنو سميّة اللي كتبيع؟',
  price: 'بشحال؟',
  city: 'فينا مدينة؟',
  photos: 'عندك شي تصاور؟',
  desc: 'وصف قصير؟',
  brand: 'أشمن ماركة؟',
  model: 'أشمن موديل؟',
  year: 'أشمن عام؟',
  mileage: 'شحال دار من كيلومتر؟',
  fuel: 'أشمن مازوط ولا بنزين؟',
  category: 'فأشمن فئة؟',
  profession: 'أشمن حرفة/خدمة؟',
  specialties: 'أشمن تخصّص؟',
  experience: 'شحال دبخبرة؟',
  dailyPrice: 'بشحال فاليوم؟',
};

function phrase(key: string, label: string): string {
  return QMAP[key] || `أعطينا ${label}`;
}

// الحالة الحاليّة للمحادثة — يشتقّها كاملةً من الـ Decision Engine.
export function planQuestion(need: string, values: Record<string, unknown> = {}): PlannerState {
  const d = decide(need, values);
  const essentials = d.fields.filter(f => f.essential);
  const doneEssentials = essentials.filter(f => f.kind === 'have' || f.kind === 'auto').length;
  const progress = essentials.length ? Math.round((doneEssentials / essentials.length) * 100) : 100;

  const a = d.askNow;
  const askNow: PlannerQuestion | undefined = a
    ? { key: a.key, label: a.label, question: phrase(a.key, a.label), type: a.type, options: a.options, hint: a.hint, required: a.essential }
    : undefined;

  return {
    need,
    askNow,
    assumed: d.assumed,
    aiOffers: d.aiOffers,
    progress,
    complete: !askNow,
  };
}
