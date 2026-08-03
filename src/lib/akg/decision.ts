// ============================================================
// Decision Engine — «فكّر قبل ما تسأل». يجلس بين Capability Resolver و
//   Question Planner. الـ Resolver يقول «ما الذي يمكن»؛ هذا يقرّر لكلّ حقل:
//     have (موجود) · auto (استنتج واملأ) · confirm (افترض وأكّد) ·
//     ai (الذكاء يولّده) · ask (اسأل الآن) · optional (لاحقًا).
//   يدمج: قيَم المستخدم + Inference + User Graph + World State + required.
//   ثمّ يعطي Question Planner سؤالًا واحدًا فقط — فيصير المُخطّط غبيًّا تمامًا،
//   لا يعرف شيئًا عن الصفحات ولا الاستنتاج.
// ============================================================

import { resolveDna } from './dna';
import { isFilled } from './capabilities';
import { inferValues, CONF } from '../inference';
import { userInferences } from './userGraph';
import { getWorldState, type WorldState } from './world';
import type { Intent } from '../needEngine';
import type { Entity, FieldType } from '../blueprints';

export type DecisionKind = 'have' | 'auto' | 'confirm' | 'ai' | 'ask' | 'optional';
export type DecisionSource = 'value' | 'inference' | 'user' | 'ai' | 'none';

export interface FieldDecision {
  key: string;
  label: string;
  kind: DecisionKind;
  essential: boolean;
  value?: unknown;         // للـ auto/confirm/have
  confidence?: number;
  source: DecisionSource;
  /**
   * **لماذا؟** الكلمةُ التي أنتجت هذه القيمة. بدونها يبقى القرارُ صندوقًا
   * أسودَ: نعرض «الموسم: شتاء» ولا نستطيع أن نقول للتاجر لماذا، فلا يثق
   * ولا يصحّح. ومعها: «الموسم: شتاء — لأنّك قلت شتوية».
   */
  because?: string;
  // بيانات العرض (حتى تبقى الصفحة واجهة فقط تقرأ القرار):
  type: FieldType;
  options?: string[];
  hint?: string;
}

export interface Decisions {
  need: string;
  intent: Intent;
  entity: Entity;
  verb: string;                // «ينشر إعلان سيّارة» — للعرض
  blueprintLabel: string;      // «سيّارة للبيع» — للعرض
  fields: FieldDecision[];
  askNow?: FieldDecision;      // السؤال الوحيد التالي (لِـ Question Planner)
  assumed: FieldDecision[];    // auto/confirm — «فكّرنا قبل ما نسولوك»
  aiOffers: FieldDecision[];   // حقول يقدر الذكاء يولّدها
  world: WorldState;
}

// أعلى استنتاج (قيمة+ثقة) لكلّ مفتاح من كلّ المصادر.
type Signal = { value: unknown; confidence: number; source: DecisionSource; because?: string };
function bestSignals(entity: Entity, need: string): Map<string, Signal> {
  const map = new Map<string, Signal>();
  const add = (key: string, value: unknown, confidence: number, source: DecisionSource, because?: string) => {
    const cur = map.get(key);
    if (!cur || confidence > cur.confidence) map.set(key, { value, confidence, source, because });
  };
  for (const i of inferValues(entity, need)) add(i.key, i.value, i.confidence, 'inference', i.because);
  for (const u of userInferences(entity)) add(u.key, u.value, u.confidence, 'user', u.because);
  return map;
}

export function decide(need: string, values: Record<string, unknown> = {}, adminOccasions: string[] = []): Decisions {
  const dna = resolveDna(need);
  const world = getWorldState(new Date(), adminOccasions);
  const signals = bestSignals(dna.entity, need);
  // الحقول التي يقدر الذكاء أن يولّدها (من خدمات لها provides).
  const aiProvidable = new Set(dna.services.map(s => s.provides).filter(Boolean) as string[]);

  const fields: FieldDecision[] = dna.fields.map(f => {
    const essential = f.required === true;
    const base = { key: f.key, label: f.label, essential, type: f.type, options: f.options, hint: f.hint };
    // 1) القيمة موجودة أصلًا.
    if (isFilled(values[f.key])) {
      return { ...base, kind: 'have' as const, value: values[f.key], source: 'value' as const };
    }
    // 2) إشارة (استنتاج/مستخدم) عالية/متوسّطة الثقة → املأ أو أكّد.
    const sig = signals.get(f.key);
    if (sig && sig.confidence >= CONF.confirm) {
      const kind: DecisionKind = sig.confidence >= CONF.auto ? 'auto' : 'confirm';
      return { ...base, kind, value: sig.value, confidence: sig.confidence, source: sig.source, because: sig.because };
    }
    // 3) أساسيّ وناقص → اسأل (حتّى لو قدر الذكاء يقترحه، الحقل مطلوب من المستخدم).
    if (essential) {
      return { ...base, kind: 'ask' as const, source: 'none' as const };
    }
    // 4) غير أساسيّ والذكاء يقدر يولّده (وصف/ثمن…) → نعرضه لا نسأله.
    if (aiProvidable.has(f.key)) {
      return { ...base, kind: 'ai' as const, source: 'ai' as const };
    }
    // 5) غير أساسيّ → لاحقًا (تفاصيل).
    return { ...base, kind: 'optional' as const, source: 'none' as const };
  });

  const askNow = fields.find(f => f.kind === 'ask');
  const assumed = fields.filter(f => f.kind === 'auto' || f.kind === 'confirm');
  const aiOffers = fields.filter(f => f.kind === 'ai');

  return { need, intent: dna.intent, entity: dna.entity, verb: dna.verb, blueprintLabel: dna.blueprintLabel, fields, askNow, assumed, aiOffers, world };
}
