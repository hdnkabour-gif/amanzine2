// ============================================================
// Knowledge Foundation Pack v1 — نقطة الدخول للنواة المعرفيّة (٦ سجلّات).
//   بيانات مُنظّمة تغذّي الاستدلال/البحث دون مسّ المعماريّة (تحترم الـ Freeze).
//   understand(text) هو الجسر: نصّ خام → {مفهوم، مهنة، مشكلة، مدينة، فئة}.
//   يستهلكه inference.ts فيصبح مدفوعًا بالبيانات لا بالخرائط المتصلّبة.
// ============================================================

export * from './vocabulary';
export * from './professions';
export * from './problems';
export * from './tools';
export * from './geo';
export * from './categories';

import { conceptsIn, normalize, type VocabEntry } from './vocabulary';
import { matchProblem, type Problem } from './problems';
import { findProfessionByLabel, getProfession, type Profession } from './professions';
import { cityInText } from './geo';

export interface Understanding {
  concepts: VocabEntry[];       // مفاهيم مذكورة (سيّارة/مازوط/سبّاك…)
  problem?: Problem;            // عطل مطابق (إن وُجد)
  profession?: Profession;      // مهنة مستنتَجة (من المشكلة أو المفردات)
  city?: string;               // مدينة مذكورة
}

// الجسر إلى المحرّكات: يفهم النصّ عبر السجلّات الستّة.
export function understand(text: string): Understanding {
  const concepts = conceptsIn(text);
  const problem = matchProblem(text);
  const city = cityInText(text);

  // المهنة: من المشكلة أوّلًا، وإلّا من مفهوم مهنة مذكور صراحةً.
  let profession: Profession | undefined = problem ? getProfession(problem.profession) : undefined;
  if (!profession) {
    const profConcept = concepts.find(c => c.kind === 'profession');
    if (profConcept) profession = findProfessionByLabel(profConcept.concept);
  }

  return { concepts, problem, profession, city };
}

// تطبيع مصطلح واحد (للبحث/المرادفات).
export function resolveTerm(term: string) { return normalize(term); }
