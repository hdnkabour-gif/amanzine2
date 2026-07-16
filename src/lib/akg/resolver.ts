// ============================================================
// Capability Resolver — الطبقة التي تفصل «ماذا يمكن فعله» عن الواجهة.
//   Question Planner لا يعرف صفحات ولا حقولًا ولا أزرارًا — يسأل فقط:
//     resolveCapabilities(need) → قائمة قدرات موحّدة (مدخلات + خدمات).
//   كلّ قدرة تعرف: هل هي أساسيّة، وماذا تحتاج لتشتغل. فإذا تغيّرت الصفحة
//   أو الحقول أو الوحدة — لا يتغيّر المُخطّط، لأنه يستهلك القدرات لا الواجهة.
// ============================================================

import { resolveDna } from './dna';
import { isFilled } from './capabilities';
import { relatedTo, followUps, type Relation } from './relations';
import type { ServiceKind } from './services';

export type CapKind = 'input' | ServiceKind;   // input = يوفّره المستخدم؛ الباقي خدمات

export interface Capability {
  id: string;            // 'input.title' أو 'ai.description'
  label: string;         // بلغة المستخدم
  kind: CapKind;
  essential: boolean;    // لازمة لإنجاز الحاجة؟
  requires: string[];    // مفاتيح مدخلات يجب توفّرها أوّلًا
  provides?: string;     // ما توفّره (للمدخل: مفتاح الحقل)
  outcome?: string;      // ماذا تُنتج (للخدمة)
  hint?: string;
}

// القائمة الموحّدة للقدرات من حاجة — مدخلات أوّلًا، ثمّ خدمات.
export function resolveCapabilities(need: string): Capability[] {
  const dna = resolveDna(need);

  // مدخلات (من حقول القالب) — كلّ حقل قدرة «input».
  const inputs: Capability[] = dna.fields.map(f => ({
    id: `input.${f.key}`,
    label: f.label,
    kind: 'input' as const,
    essential: f.required === true,
    requires: [],
    provides: f.key,
    hint: f.hint,
  }));

  // خدمات (من DNA) — كلّ خدمة قدرة، تتطلّب مدخلاتها (needs).
  const services: Capability[] = dna.services.map(s => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    essential: false,
    requires: s.needs ?? [],
    outcome: s.outcome,
  }));

  // ترتيب: الأساسيّات أوّلًا، ثمّ باقي المدخلات، ثمّ الخدمات الأقلّ اعتمادًا.
  const rank = (c: Capability) =>
    (c.kind === 'input' ? (c.essential ? 0 : 1) : 2) * 100 + c.requires.length;
  return [...inputs, ...services].sort((a, b) => rank(a) - rank(b));
}

export interface CapabilityPlan {
  satisfied: string[];        // مفاتيح مستوفاة الآن
  next?: Capability;          // القدرة الأساسيّة التالية التي تنقص (للسؤال)
  ready: Capability[];        // خدمات جاهزة للتشغيل الآن
  waiting: Capability[];      // خدمات تنتظر مدخلًا
  followUps: Relation[];      // الخطوة المجاورة بعد الفعل (من Entity Relations)
  companions: Relation[];     // علاقات عامّة للكيان
}

// خطّة قابلة للاستهلاك مباشرةً من Question Planner لاحقًا — بلا معرفة بالواجهة.
export function capabilityPlan(need: string, values: Record<string, unknown> = {}): CapabilityPlan {
  const caps = resolveCapabilities(need);
  const dna = resolveDna(need);

  const satisfied = Object.keys(values).filter(k => isFilled(values[k]));
  const has = (keys: string[]) => keys.every(k => satisfied.includes(k));

  const inputs = caps.filter(c => c.kind === 'input');
  const services = caps.filter(c => c.kind !== 'input');

  const next = inputs.find(c => c.essential && c.provides && !satisfied.includes(c.provides));
  const ready = services.filter(c => has(c.requires));
  const waiting = services.filter(c => !has(c.requires));

  return {
    satisfied,
    next,
    ready,
    waiting,
    followUps: followUps(dna.entity, dna.intent),
    companions: relatedTo(dna.entity),
  };
}
