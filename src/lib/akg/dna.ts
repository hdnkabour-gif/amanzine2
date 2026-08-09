// ============================================================
// Application DNA — العقل يعرف التطبيق كما يعرفه المطوّر.
//   من جملة المستخدم، نستخرج المسار الكامل ونربط كلّ شيء بكلّ شيء:
//   Need → Intent → Entity → Module → Page → Fields → Actions → Services → Next
//   هذا هو الفرق بين «سجلّ صفحات» و«DNA للتطبيق»: مسار متّصل قابل للتتبّع،
//   يغذّي التوجيه، ومخطّط الأسئلة، والاستوديو.
// ============================================================

import { parseNeed, type Intent } from '../needEngine';
import { classifyEntity, resolveBlueprint, type Entity, type BField } from '../blueprints';
import { moduleForEntity, moduleForIntent, type AppModule } from './modules';
import { getServices, type AppService } from './services';
import { describeIntent } from './kb/actions';
import { relatedTo, followUps, type Relation } from './relations';
import { pageForIntent, pagesForEntity, getPageCapability, type PageCapability, type PageField, type PageAction } from './registry';
import { resolveConcept } from './kb/knowledge';

export interface DnaPath {
  need: string;             // الجملة كما كتبها المستخدم
  intent: Intent;           // ماذا يريد أن يفعل
  entity: Entity;           // على أيّ شيء
  module?: AppModule;       // أيّ مجال يملكه
  page?: PageCapability;    // أيّ صفحة تُلبّيه
  fields: BField[];         // حقول القالب (Blueprint) الكاملة
  essentials: PageField[];  // الحقول الأساسيّة (وضع «الأساسيّات»)
  actions: PageAction[];    // الأزرار/الأفعال المتاحة
  services: AppService[];   // القدرات المشتركة (AI/QR/مشاركة…)
  next?: string;            // الخطوة التالية المقترحة
  workflow: { step: string; via: string }[];  // سير عمل المجال
  companions: Relation[];   // علاقات الكيان العامّة (الكيان بداية Graph)
  followUps: Relation[];    // الخطوة المجاورة بعد هذا الفعل (بلا if)
  verb: string;             // فعل القالب («ينشر إعلان سيّارة») — للعرض
  blueprintLabel: string;   // عنوان القالب («سيّارة للبيع») — للعرض
}

// أيّ صفحة أنسب لهذا الكيان ضمن هذه النيّة؟
function bestPage(intent: Intent, entity: Entity): PageCapability | undefined {
  // نُفضّل صفحة تخدم الكيان صراحةً وتُلبّي النيّة؛ وإلّا حسب النيّة.
  const byEntity = pagesForEntity(entity).filter(p => p.intents.includes(intent));
  if (byEntity.length) {
    // المنتج له صفحته الخاصّة؛ باقي الكيانات تمرّ عبر النشر الكونيّ.
    const own = byEntity.find(p => p.page === 'products' && entity === 'product');
    return own || byEntity.find(p => p.page === 'publish') || byEntity[0];
  }
  return pageForIntent(intent);
}

// المُحلّل الرئيسيّ — يبني المسار الكامل من جملة واحدة.
export function resolveDna(raw: string): DnaPath {
  const need = raw.trim();
  const intent = parseNeed(need).intent;
  const { blueprint, entity, fields } = resolveBlueprint(intent, need);
  const module = moduleForEntity(entity) || moduleForIntent(intent);
  const page = bestPage(intent, entity);

  const essentials = page ? page.fields.filter(f => f.essential) : [];
  const actions = page?.actions ?? [];
  // الخدمات: اتّحاد خدمات الصفحة وخدمات المجال (بلا تكرار).
  const svcIds = Array.from(new Set([...(page?.services ?? []), ...(module?.services ?? [])]));
  const services = getServices(svcIds);
  const next = page?.next;
  const workflow = module?.workflow ?? [];
  const companions = relatedTo(entity);
  const follows = followUps(entity, intent);

  // العنوانُ يقول **ما فُهم**، لا «منتج للبيع» العامّة ولا صدى ما كتبه المستخدم.
  //   «عندي كسوة للبيع» ⇒ «كسوة العيد» — فيرى الإنسانُ أنّ النظامَ فهمه فعلًا.
  //   وإن لم يُفهَم شيءٌ بعينه بقي العنوانُ العامُّ: لا ندّعي دقّةً لا نملكها.
  const named = resolveConcept(need)?.concept?.ar;
  // «سيارة — سيّارة للبيع» تكرارٌ لا إفادة. والمقارنةُ تُجرَّد من الشدّة أوّلًا،
  // وإلّا لم تُطابق «سيّارة» «سيارة» فبقي التكرارُ ظاهرًا.
  const bare = (t: string) => t.replace(/[\u064B-\u0652]/g, '');
  const redundant = !!named &&
    (bare(blueprint.label).includes(bare(named)) || bare(named).includes(bare(blueprint.label)));
  const blueprintLabel = named && !redundant ? `${named} — ${blueprint.label}` : blueprint.label;

  return { need, intent, entity, module, page, fields, essentials, actions, services, next, workflow, companions, followUps: follows, verb: blueprint.verb, blueprintLabel };
}

// نسخة خفيفة للعرض/التتبّع — أسماء فقط (للاستوديو أو السجلّات).
export function traceDna(raw: string): string[] {
  const d = resolveDna(raw);
  return [
    `الحاجة: ${d.need}`,
    `النيّة: ${describeIntent(d.intent)}`,
    `الكيان: ${d.entity}`,
    `الوحدة: ${d.module?.label ?? '—'}`,
    `الصفحة: ${d.page?.title ?? '—'}`,
    `الحقول: ${d.fields.map(f => f.label).join('، ') || '—'}`,
    `الأفعال: ${d.actions.map(a => a.label).join('، ') || '—'}`,
    `الخدمات: ${d.services.map(s => s.label).join('، ') || '—'}`,
    `التالي: ${d.next ?? '—'}`,
  ];
}

export { classifyEntity, getPageCapability };
