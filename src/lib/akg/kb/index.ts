// ============================================================
// Knowledge Foundation Pack v2 — النواة المعرفيّة (Modules مستقلّة). المحور:
//   المشكلة. understand(text) يفهم المستخدم من كلامه (دارجة) حتّى لو لم يذكر
//   اسم المهنة — عبر Symptom Graph → Problem → Solution(profession+
//   capabilities) → Geo/Context. مع خطوات استدلال قابلة للتفسير (reasoning).
//   بيانات فقط تغذّي inference/search — تحترم الـ Freeze.
// ============================================================

export * from './vocabulary';
export * from './professions';
export * from './problems';
export * from './symptomGraph';
export * from './capabilities';
export * from './tools';
export * from './geo';
export * from './categories';
export * from './memory';
export * from './arabizi';

import { conceptsIn, normalize, type VocabEntry } from './vocabulary';
import { deArabizi } from './arabizi';
import { getProblem, type Problem } from './problems';
import { findProblemBySymptom } from './symptomGraph';
import { getProfession, findProfessionByLabel, type Profession } from './professions';
import { cityInText } from './geo';
import { matchApprovedMemory } from './memory';

export interface Understanding {
  problem?: Problem;               // المشكلة المستنتَجة
  profession?: Profession;         // المهنة الحالّة
  capabilities: string[];          // القدرات المطلوبة
  concepts: VocabEntry[];          // مفاهيم مذكورة
  city?: string;
  context: { urgent: boolean; night: boolean; weekend: boolean };
  confidence: number;              // 0..1
  reasoning: string[];             // خطوات الاستدلال (تفسير)
  learned?: { phrase: string; concept: string }; // معرفة معتمَدة بشريًّا طُبِّقت
}

const has = (t: string, arr: string[]) => arr.some(w => t.includes(w));

// الجسر إلى المحرّكات — يفهم النصّ عبر السجلّات (المشكلة أوّلًا).
export function understand(input: string): Understanding {
  // 0) طبقة اللاتينيّة — «bghit 3andi mouchkil» → «بغيت عندي مشكل» قبل أيّ قراءة.
  const text = deArabizi(input);
  const t = text.toLowerCase().trim();
  const reasoning: string[] = [];
  if (text !== input) reasoning.push('🔤 حوّلنا الكتابة اللاتينيّة إلى دارجة');
  const concepts = conceptsIn(text);

  // 1) Symptom Graph — من العرَض إلى المشكلة.
  let problem: Problem | undefined;
  let problemConf = 0;
  const sym = findProblemBySymptom(text);
  if (sym) {
    problem = getProblem(sym.problemId);
    problemConf = sym.confidence;
    if (problem) reasoning.push(`🔍 عرَض → مشكلة «${problem.name}» (ثقة ${problemConf})`);
  }

  // 2) المهنة: من حلّ المشكلة أوّلًا، وإلّا من مفهوم مهنة مذكور.
  let profession: Profession | undefined;
  let capabilities: string[] = [];
  let profConf = 0;
  if (problem?.solutions?.length) {
    const sol = problem.solutions[0];
    profession = getProfession(sol.profession);
    capabilities = sol.capabilities ?? [];
    profConf = +(problemConf * 0.95).toFixed(2);
    if (profession) reasoning.push(`👤 المهنة الحالّة «${profession.label}» (ثقة ${profConf})`);
  }
  if (!profession) {
    const pc = concepts.find(c => c.kind === 'profession');
    if (pc) { profession = findProfessionByLabel(pc.concept); if (profession) { profConf = 0.7; reasoning.push(`👤 المهنة من المفردات «${profession.label}»`); } }
  }

  // 2.5) المعرفة المعتمَدة بشريًّا (Applied Memory) — إغلاق حلقة التعلّم.
  //   عبارة اعتمدها الإنسان في مركز التعلّم ⇒ تُطبَّق الآن (لا تعديل ذاتيّ).
  let learned: { phrase: string; concept: string } | undefined;
  const mem = matchApprovedMemory(text);
  if (mem) {
    learned = { phrase: mem.phrase, concept: mem.concept };
    if (!profession && mem.profession) { profession = mem.profession; profConf = Math.max(profConf, 0.9); }
    if (!problem && mem.problem) { problem = mem.problem; problemConf = Math.max(problemConf, 0.9); }
    reasoning.push(`🧠 معرفة معتمَدة: «${mem.phrase}» ⇒ ${profession?.label || problem?.name || mem.concept}`);
  }

  // 3) الموقع.
  const city = cityInText(text);
  if (city) reasoning.push(`📍 الموقع «${city}»`);

  // 4) السياق (طارئ/ليل/عطلة).
  const context = {
    urgent: has(t, ['دابا', 'الآن', 'عاجل', 'طوارئ', 'بزربة']) || problem?.emergency === true,
    night: has(t, ['الليل', 'ليلا', 'ف الليل']),
    weekend: has(t, ['الجمعة', 'السبت', 'الأحد', 'ويكاند']),
  };
  if (context.urgent) reasoning.push('⏰ سياق: طارئ');

  // 5) الثقة الكلّيّة.
  let confidence = 0.2;
  if (problem && profession) confidence = Math.max(Math.min(problemConf, profConf), 0.3);
  else if (profession) confidence = 0.45;
  else if (concepts.length) confidence = 0.35;
  // معرفة معتمَدة بشريًّا ترفع الثقة (الإنسان أكّدها).
  if (learned && profession) confidence = Math.max(confidence, 0.85);
  else if (learned) confidence = Math.max(confidence, 0.6);

  return { problem, profession, capabilities, concepts, city, context, confidence, reasoning, learned };
}

export function resolveTerm(term: string) { return normalize(term); }
