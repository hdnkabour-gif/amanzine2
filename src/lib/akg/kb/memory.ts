// ============================================================
// Applied Memory — إغلاق حلقة التعلّم (Observe → Suggest → Approve → APPLY).
//   المعرفة المعتمَدة بشريًّا (amanzine_learned) كانت تُخزَّن ولا تُطبَّق. هنا
//   يقرؤها understand() ويطبّقها: عبارة معتمَدة في النصّ ⇒ مهنة/عطل. هذا ليس
//   تعديلًا ذاتيًّا (القانون #3) — الإنسان هو من اعتمد في مركز التعلّم؛ نحن
//   نطبّق ما اعتمده فقط. بلا اعتماد آليّ، بلا كتابة من العقل.
// ============================================================

import { getProfession, findProfessionByLabel, allProfessions, type Profession } from './professions';
import { getProblem, allProblems, type Problem } from './problems';

const LEARN_KEY = 'amanzine_learned';

// خريطة «عبارة → مفهوم» التي اعتمدها الإنسان (SSR-safe).
export function approvedMemory(): Record<string, string> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
  } catch { return {}; }
}

export interface MemoryHit {
  phrase: string;
  concept: string;
  profession?: Profession;
  problem?: Problem;
}

// أوّل عبارة معتمَدة تظهر في النصّ، مع محاولة ربط المفهوم بمهنة/عطل مسجّل.
export function matchApprovedMemory(text: string): MemoryHit | undefined {
  const t = (text || '').toLowerCase();
  const mem = approvedMemory();
  for (const [phrase, concept] of Object.entries(mem)) {
    const p = (phrase || '').toLowerCase().trim();
    if (!p || !t.includes(p)) continue;
    const profession = getProfession(concept) || findProfessionByLabel(concept) || allProfessions().find(x => x.label === concept);
    const problem = getProblem(concept) || allProblems().find(x => x.name === concept);
    return { phrase, concept, profession, problem };
  }
  return undefined;
}
