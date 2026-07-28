// ============================================================
// AMANZINE — Concepts (المصدر الموحّد). يدمج المفاهيم المولّدة آليًّا
//   (`knowledgeData`) مع التوسعة اليدويّة (`knowledgeExtra`) **بلا تكرار**:
//   نفس الـid ⇒ تُوحَّد المتغيّرات (union)؛ id جديد ⇒ يُضاف. مصدرٌ واحدٌ يستهلكه
//   `knowledge.ts` و`knowledgeGraph.ts`. إضافةٌ خالصة.
// ============================================================

import { CONCEPTS as GENERATED, type ConceptData, type ConceptStance, type ConceptLinks } from './knowledgeData';
import { EXTRA_CONCEPTS, ENRICH_CONCEPTS } from './knowledgeExtra';
// مولَّدٌ من CSV عبر scripts/import-knowledge.mjs — يُدمَج بنفس قاعدة الـid.
import { IMPORTED_CONCEPTS } from './knowledgeExtra.generated';

const uniq = (a: string[] = []) => Array.from(new Set(a.filter(Boolean)));

// دمج اتّجاهٍ (stance/asks): اتّحادٌ بلا تكرار، ويُعيد undefined إن خلا الطرفان
// فلا نُثقل المفاهيم بحقولٍ فارغة.
function mergeStance(a?: ConceptStance, b?: ConceptStance): ConceptStance | undefined {
  if (!a && !b) return undefined;
  const offer = uniq([...(a?.offer || []), ...(b?.offer || [])]);
  const seek  = uniq([...(a?.seek  || []), ...(b?.seek  || [])]);
  if (!offer.length && !seek.length) return undefined;
  return { ...(offer.length ? { offer } : {}), ...(seek.length ? { seek } : {}) };
}

function mergeLinks(a?: ConceptLinks, b?: ConceptLinks): ConceptLinks | undefined {
  if (!a && !b) return undefined;
  const out: ConceptLinks = {};
  for (const k of ['related', 'needs', 'sells', 'near'] as const) {
    const v = uniq([...((a as any)?.[k] || []), ...((b as any)?.[k] || [])]);
    if (v.length) (out as any)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function mergeVariants(a: ConceptData['variants'], b: ConceptData['variants']): ConceptData['variants'] {
  const langs = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const out: ConceptData['variants'] = {};
  for (const l of langs) out[l] = uniq([...((a || {})[l] || []), ...((b || {})[l] || [])]);
  return out;
}

const byId = new Map<string, ConceptData>();
// نسخةٌ آمنة: النسخ السطحيّ يُبقي `variants` مشترَكًا مع knowledgeData،
// فأيّ دمجٍ لاحقٍ كان سيعدّل المصدر المولّد نفسه.
for (const c of GENERATED) byId.set(c.id, { ...c, variants: { ...c.variants } });
// إثراء + إضافة: نفس الـid يُوحّد؛ الجديد يُضاف.
for (const c of [...ENRICH_CONCEPTS, ...EXTRA_CONCEPTS, ...IMPORTED_CONCEPTS]) {
  const ex = byId.get(c.id);
  if (ex) {
    byId.set(c.id, {
      ...ex,
      category: ex.category || c.category,
      concept: { ...c.concept, ...ex.concept },
      variants: mergeVariants(ex.variants, c.variants),
      services: uniq([...(ex.services || []), ...(c.services || [])]),
      examples: uniq([...(ex.examples || []), ...(c.examples || [])]),
      stance: mergeStance(ex.stance, c.stance),
      asks:   mergeStance(ex.asks,   c.asks),
      links:  mergeLinks(ex.links,   c.links),
    });
  } else {
    byId.set(c.id, { ...c, variants: { ...c.variants } });
  }
}

export const CONCEPTS: ConceptData[] = Array.from(byId.values());
export type { ConceptData };
