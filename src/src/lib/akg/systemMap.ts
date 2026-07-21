// ============================================================
// System Map — «التطبيق يعرف نفسه». يحسب صورة النظام من السجلّات فقط (لا من
//   الكود — القانون #2): ماذا يوجد، ما المترابط، وما «اليتامى/الفجوات»
//   (خدمة لا تستعملها أيّ صفحة، مهنة يشير إليها عطل وهي غير مسجّلة…).
//   قراءة فقط — قلب Control Center الذي يجعله مفيدًا لا مجرّد لوحة.
// ============================================================

import './pages';         // side-effect: يضمن تسجيل واصفات الصفحات قبل الحساب
import { allModules } from './modules';
import { allServices } from './services';
import { allCapabilities as allPageCaps } from './registry';
import { allSchemas } from './schema';
import { allPageDefs } from './pageRegistry';
import {
  allProfessions, allProblems, allCapabilities as allKbCaps, vocabSize, geoSize, SYMPTOM_GRAPH,
} from './kb';

export interface SystemIssue { kind: string; detail: string; }

export interface SystemMap {
  counts: Record<string, number>;
  orphanServices: string[];       // خدمات لا تستعملها أيّ صفحة/وحدة
  orphanKbCapabilities: string[]; // قدرات معرفيّة لا يطلبها أيّ عطل
  issues: SystemIssue[];          // روابط مكسورة (سلامة السجلّات)
}

export function computeSystemMap(): SystemMap {
  const modules = allModules();
  const services = allServices();
  const pageCaps = allPageCaps();
  const schemas = allSchemas();
  const pageDefs = allPageDefs();
  const professions = allProfessions();
  const problems = allProblems();
  const kbCaps = allKbCaps();

  const serviceIds = new Set(services.map(s => s.id));
  const kbCapIds = new Set(kbCaps.map(c => c.id));
  const profIds = new Set(professions.map(p => p.id));
  const problemIds = new Set(problems.map(p => p.id));

  // استعمال الخدمات (اتّحاد صفحات + وحدات).
  const usedServices = new Set<string>();
  pageCaps.forEach(p => (p.services ?? []).forEach(s => usedServices.add(s)));
  modules.forEach(m => m.services.forEach(s => usedServices.add(s)));

  // قدرات معرفيّة مطلوبة من الأعطال.
  const usedKbCaps = new Set<string>();
  problems.forEach(p => p.solutions.forEach(s => (s.capabilities ?? []).forEach(c => usedKbCaps.add(c))));

  const orphanServices = services.map(s => s.id).filter(id => !usedServices.has(id));
  const orphanKbCapabilities = kbCaps.map(c => c.id).filter(id => !usedKbCaps.has(id));

  // ── سلامة السجلّات (روابط مكسورة) ──
  const issues: SystemIssue[] = [];
  for (const m of modules) for (const s of m.services) if (!serviceIds.has(s)) issues.push({ kind: 'module→service', detail: `الوحدة «${m.label}» تشير لخدمة غير مسجّلة: ${s}` });
  for (const p of pageCaps) for (const s of (p.services ?? [])) if (!serviceIds.has(s)) issues.push({ kind: 'page→service', detail: `الصفحة «${p.title}» تشير لخدمة غير مسجّلة: ${s}` });
  for (const pr of problems) for (const sol of pr.solutions) {
    if (!profIds.has(sol.profession)) issues.push({ kind: 'problem→profession', detail: `العطل «${pr.name}» يشير لمهنة غير مسجّلة: ${sol.profession}` });
    for (const c of (sol.capabilities ?? [])) if (!kbCapIds.has(c)) issues.push({ kind: 'problem→capability', detail: `العطل «${pr.name}» يشير لقدرة غير مسجّلة: ${c}` });
  }
  for (const n of SYMPTOM_GRAPH) if (!problemIds.has(n.problemId)) issues.push({ kind: 'symptom→problem', detail: `العرَض «${n.pattern}» يشير لعطل غير مسجّل: ${n.problemId}` });

  return {
    counts: {
      modules: modules.length,
      services: services.length,
      pages: pageCaps.length,
      pageDefs: pageDefs.length,
      entities: schemas.length,
      professions: professions.length,
      problems: problems.length,
      kbCapabilities: kbCaps.length,
      symptoms: SYMPTOM_GRAPH.length,
      vocabulary: vocabSize(),
      cities: geoSize().cities,
    },
    orphanServices,
    orphanKbCapabilities,
    issues,
  };
}
