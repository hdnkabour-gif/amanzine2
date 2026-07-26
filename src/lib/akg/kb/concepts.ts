// ============================================================
// AMANZINE — Concepts (المصدر الموحّد). يدمج المفاهيم المولّدة آليًّا
//   (`knowledgeData`) مع التوسعة اليدويّة (`knowledgeExtra`) **بلا تكرار**:
//   نفس الـid ⇒ تُوحَّد المتغيّرات (union)؛ id جديد ⇒ يُضاف. مصدرٌ واحدٌ يستهلكه
//   `knowledge.ts` و`knowledgeGraph.ts`. إضافةٌ خالصة.
// ============================================================

import { CONCEPTS as GENERATED, type ConceptData } from './knowledgeData';
import { EXTRA_CONCEPTS, ENRICH_CONCEPTS } from './knowledgeExtra';

const uniq = (a: string[] = []) => Array.from(new Set(a.filter(Boolean)));
function mergeVariants(a: ConceptData['variants'], b: ConceptData['variants']): ConceptData['variants'] {
  const langs = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const out: ConceptData['variants'] = {};
  for (const l of langs) out[l] = uniq([...((a || {})[l] || []), ...((b || {})[l] || [])]);
  return out;
}

const byId = new Map<string, ConceptData>();
for (const c of GENERATED) byId.set(c.id, { ...c });
// إثراء + إضافة: نفس الـid يُوحّد؛ الجديد يُضاف.
for (const c of [...ENRICH_CONCEPTS, ...EXTRA_CONCEPTS]) {
  const ex = byId.get(c.id);
  if (ex) {
    byId.set(c.id, {
      ...ex,
      category: ex.category || c.category,
      concept: { ...c.concept, ...ex.concept },
      variants: mergeVariants(ex.variants, c.variants),
      services: uniq([...(ex.services || []), ...(c.services || [])]),
      examples: uniq([...(ex.examples || []), ...(c.examples || [])]),
    });
  } else {
    byId.set(c.id, { ...c });
  }
}

export const CONCEPTS: ConceptData[] = Array.from(byId.values());
export type { ConceptData };
