// ============================================================
// Describable — «كلّ شيء يفسّر نفسه» (ADR-0003). واجهة موحّدة لا محرّك جديد:
//   كلّ كيان في السجلّات (خدمة/وحدة/صفحة/كيان/مهنة/عطل/قدرة) يُجيب عن نفس
//   الأسئلة الأربعة — ما هو؟ لماذا؟ على ماذا يعتمد؟ من يعتمد عليه؟ — عبر
//   describe(). Adapter فوق السجلّات الموجودة (القانون #2)، بلا هجرة ولا محرّك.
//   يستهلكه Control Center (ExplainPanel) واللاحقون (Living Graph/بحث) بنفس العدسة.
// ============================================================

import './pages'; // side-effect: يضمن تسجيل واصفات الصفحات
import { allModules } from './modules';
import { allServices } from './services';
import { allCapabilities as allPageCaps } from './registry';
import { allSchemas } from './schema';
import { allPageDefs } from './pageRegistry';
import { getWorkflow } from './workflow';
import { allProfessions, allProblems, allCapabilities as allKbCaps, SYMPTOM_GRAPH } from './kb';

export type EntityType =
  | 'service' | 'module' | 'page' | 'entity' | 'profession' | 'problem' | 'capability';

export interface Relation { rel: string; to: string; toType?: EntityType }

export interface Describable {
  id: string;
  type: EntityType;
  label: string;
  purpose: string;                 // لماذا وُجد
  relations: Relation[];           // على ماذا يعتمد (روابط صادرة)
  capabilities: string[];          // ما الذي يُتيحه
  usedBy: string[];                // من يعتمد عليه (روابط واردة)
  impactOfDeletion: string;        // أثر الحذف
  metadata: Record<string, unknown>;
}

const TYPE_LABEL: Record<EntityType, string> = {
  service: 'خدمة', module: 'وحدة', page: 'صفحة', entity: 'كيان',
  profession: 'مهنة', problem: 'عطل', capability: 'قدرة معرفيّة',
};

export function typeLabel(t: EntityType): string { return TYPE_LABEL[t]; }

// يبني كلّ الأوصاف في تمريرة واحدة مع خرائط الاعتماد العكسيّة (usedBy).
export function describeAll(): Describable[] {
  const modules = allModules();
  const services = allServices();
  const pageCaps = allPageCaps();
  const schemas = allSchemas();
  const pageDefs = allPageDefs();
  const professions = allProfessions();
  const problems = allProblems();
  const kbCaps = allKbCaps();

  // ── خرائط عكسيّة (من يعتمد على من) ──
  const serviceUsers = new Map<string, string[]>();   // serviceId → [module/page labels]
  modules.forEach(m => m.services.forEach(s => push(serviceUsers, s, `وحدة «${m.label}»`)));
  pageCaps.forEach(p => (p.services ?? []).forEach(s => push(serviceUsers, s, `صفحة «${p.title}»`)));

  const professionUsers = new Map<string, string[]>(); // professionId → [problem names]
  const capabilityUsers = new Map<string, string[]>(); // kb capId → [problem names]
  problems.forEach(pr => pr.solutions.forEach(sol => {
    push(professionUsers, sol.profession, `عطل «${pr.name}»`);
    (sol.capabilities ?? []).forEach(c => push(capabilityUsers, c, `عطل «${pr.name}»`));
  }));

  const problemUsers = new Map<string, string[]>();    // problemId → [symptom patterns]
  SYMPTOM_GRAPH.forEach(n => push(problemUsers, n.problemId, `عرَض «${n.pattern}»`));

  const entityUsers = new Map<string, string[]>();     // entity → [page titles]
  pageDefs.forEach(d => { if (d.entity) push(entityUsers, d.entity, `صفحة «${d.title}»`); });

  const out: Describable[] = [];

  // ── خدمات ──
  for (const s of services) {
    const users = serviceUsers.get(s.id) ?? [];
    out.push({
      id: s.id, type: 'service', label: s.label,
      purpose: (s as { outcome?: string }).outcome || s.label,
      relations: [
        ...((s as { needs?: string[] }).needs ?? []).map(n => ({ rel: 'يحتاج حقل', to: n })),
        ...((s as { provides?: string }).provides ? [{ rel: 'يوفّر', to: (s as { provides?: string }).provides as string }] : []),
      ],
      capabilities: [String((s as { kind?: string }).kind ?? '')].filter(Boolean),
      usedBy: users,
      impactOfDeletion: users.length ? `يُعطِّل: ${users.join('، ')}` : 'يتيم — حذفه بلا أثر مباشر',
      metadata: { kind: (s as { kind?: string }).kind },
    });
  }

  // ── وحدات ──
  for (const m of modules) {
    const users = pageDefs.filter(d => d.module === m.id).map(d => `صفحة «${d.title}»`);
    out.push({
      id: m.id, type: 'module', label: m.label, purpose: `مجال: ${m.label}`,
      relations: m.services.map(s => ({ rel: 'يستعمل خدمة', to: s, toType: 'service' as EntityType })),
      capabilities: [], usedBy: users,
      impactOfDeletion: users.length ? `يُيتِّم: ${users.join('، ')}` : 'لا صفحة تعتمد عليه',
      metadata: { services: m.services.length },
    });
  }

  // ── صفحات (واصفات) ──
  for (const d of pageDefs) {
    const wf = getWorkflow(d.id);
    out.push({
      id: d.id, type: 'page', label: d.title, purpose: d.title,
      relations: [
        ...(d.module ? [{ rel: 'ضمن وحدة', to: d.module, toType: 'module' as EntityType }] : []),
        ...(d.entity ? [{ rel: 'يعمل على كيان', to: d.entity, toType: 'entity' as EntityType }] : []),
      ],
      capabilities: (d as { permissions?: string[] }).permissions ?? [],
      usedBy: [],
      impactOfDeletion: 'تختفي نقطة دخول للمستخدم',
      metadata: { renderer: (d as { renderer?: string }).renderer, stages: wf.stages.map(s => s.label) },
    });
  }

  // ── كيانات (Schemas) ──
  for (const sc of schemas) {
    const users = entityUsers.get(sc.entity) ?? [];
    out.push({
      id: sc.entity, type: 'entity', label: sc.theme?.mood || sc.entity,
      purpose: `كيان «${sc.theme?.mood || sc.entity}» — ${sc.fields.length} حقل`,
      relations: [{ rel: 'سمة (theme)', to: sc.theme?.id || sc.entity }],
      capabilities: [], usedBy: users,
      impactOfDeletion: users.length ? `يُعطِّل: ${users.join('، ')}` : 'لا صفحة تشتقّ منه',
      metadata: { fields: sc.fields.length, accent: sc.theme?.accent },
    });
  }

  // ── مهن ──
  for (const p of professions) {
    const users = professionUsers.get(p.id) ?? [];
    out.push({
      id: p.id, type: 'profession', label: p.label, purpose: `مهنة: ${p.label}`,
      relations: [
        ...(p.sector ? [{ rel: 'قطاع', to: p.sector }] : []),
        ...(p.capabilities ?? []).map(c => ({ rel: 'قدرة', to: c })),
        ...(p.related ?? []).map(r => ({ rel: 'مهنة مرتبطة', to: r, toType: 'profession' as EntityType })),
        ...(p.tools ?? []).map(t => ({ rel: 'أداة', to: t })),
      ],
      capabilities: p.capabilities ?? [], usedBy: users,
      impactOfDeletion: users.length ? `تفقد حلّها: ${users.join('، ')}` : 'لا عطل يشير إليها',
      metadata: { sector: p.sector, skills: (p.skills ?? []).length },
    });
  }

  // ── أعطال ──
  for (const pr of problems) {
    const users = problemUsers.get(pr.id) ?? [];
    const profs = pr.solutions.map(s => s.profession);
    const caps = pr.solutions.flatMap(s => s.capabilities ?? []);
    out.push({
      id: pr.id, type: 'problem', label: pr.name, purpose: `عطل: ${pr.name}`,
      relations: [
        ...profs.map(pf => ({ rel: 'يحلّه', to: pf, toType: 'profession' as EntityType })),
        ...caps.map(c => ({ rel: 'يتطلّب قدرة', to: c, toType: 'capability' as EntityType })),
      ],
      capabilities: caps, usedBy: users,
      impactOfDeletion: users.length ? `تفقد وجهتها: ${users.join('، ')}` : 'لا عرَض يشير إليه',
      metadata: { severity: (pr as { severity?: string }).severity, solutions: pr.solutions.length },
    });
  }

  // ── قدرات معرفيّة ──
  for (const c of kbCaps) {
    const users = capabilityUsers.get(c.id) ?? [];
    out.push({
      id: c.id, type: 'capability', label: c.nameAr, purpose: `قدرة: ${c.nameAr}`,
      relations: (c.professions ?? []).map(p => ({ rel: 'تملكها مهنة', to: p, toType: 'profession' as EntityType })),
      capabilities: [], usedBy: users,
      impactOfDeletion: users.length ? `يفقدها: ${users.join('، ')}` : 'يتيمة — لا عطل يطلبها',
      metadata: { category: c.category, complexity: c.complexity },
    });
  }

  return out;
}

export function describe(type: EntityType, id: string): Describable | undefined {
  return describeAll().find(d => d.type === type && d.id === id);
}

export function describableTypes(): { type: EntityType; label: string; count: number }[] {
  const all = describeAll();
  return (Object.keys(TYPE_LABEL) as EntityType[]).map(t => ({
    type: t, label: TYPE_LABEL[t], count: all.filter(d => d.type === t).length,
  }));
}

function push(map: Map<string, string[]>, key: string, val: string) {
  const arr = map.get(key) ?? [];
  arr.push(val);
  map.set(key, arr);
}
