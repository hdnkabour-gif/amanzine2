// ============================================================
// Entity Relations — الكيان ليس نهاية، بل بداية Graph. السيّارة مرتبطة
//   بالتشخيص والميكانيكي والتأمين والقطع والغسل والعجلات… لذا «بعت سيّارة»
//   يقترح تلقائيًّا «تأمين؟ غسل؟ بيع العجلات؟ شري أخرى؟» بلا أيّ if — كلّه
//   بحثٌ في بيانات. هذا يغذّي Action Planner لاحقًا باقتراح الخطوة المجاورة.
// ============================================================

import type { Intent } from '../needEngine';
import type { Entity } from '../blueprints';

export interface Relation {
  label: string;        // اقتراح بلغة المستخدم (دارجة)
  intent?: Intent;      // إلى أيّ حاجة يقود (إن وُجد)
  note?: string;        // تفسير مختصر
}

interface EntityNode {
  entity: Entity;
  label: string;
  // «رفقاء» الكيان — علاقات عامّة تُثري الرحلة في أيّ وقت.
  companions: Relation[];
  // بعد فعلٍ معيّن (بيع/كراء/شراء…): ماذا يُقترح؟ (مفتاح = النيّة).
  after: Partial<Record<Intent, Relation[]>>;
}

const NODES: Record<Entity, EntityNode> = {
  vehicle: {
    entity: 'vehicle', label: 'سيّارة',
    companions: [
      { label: 'دياگنوستيك (تشخيص)', intent: 'find_pro' },
      { label: 'ميكانيكي', intent: 'find_pro' },
      { label: 'تأمين السيّارة', intent: 'find_pro' },
      { label: 'قطع الغيار', intent: 'buy' },
      { label: 'بوليساج وتلميع', intent: 'find_pro' },
      { label: 'غسل السيّارة', intent: 'find_pro' },
      { label: 'العجلات (بنيوات)', intent: 'buy' },
    ],
    after: {
      sell: [
        { label: 'غسل السيّارة قبل التسليم', intent: 'find_pro' },
        { label: 'بيع العجلات القديمة', intent: 'sell' },
        { label: 'شري سيّارة أخرى', intent: 'buy' },
      ],
      buy: [
        { label: 'تأمين السيّارة', intent: 'find_pro', note: 'مطلوب قانونيًّا' },
        { label: 'دياگنوستيك قبل الاستعمال', intent: 'find_pro' },
        { label: 'بوليساج', intent: 'find_pro' },
      ],
    },
  },
  realEstate: {
    entity: 'realEstate', label: 'عقار',
    companions: [
      { label: 'نقل الأثاث', intent: 'find_pro' },
      { label: 'تنظيف', intent: 'find_pro' },
      { label: 'صبّاغ', intent: 'find_pro' },
      { label: 'نجّار', intent: 'find_pro' },
      { label: 'كهربائي', intent: 'find_pro' },
      { label: 'أثاث', intent: 'buy' },
    ],
    after: {
      sell: [
        { label: 'تنظيف قبل التسليم', intent: 'find_pro' },
        { label: 'نقل الأثاث', intent: 'find_pro' },
      ],
      rent: [
        { label: 'صبّاغ للتجديد', intent: 'find_pro' },
        { label: 'تنظيف', intent: 'find_pro' },
        { label: 'أثاث', intent: 'buy' },
      ],
    },
  },
  rental: {
    entity: 'rental', label: 'كراء',
    companions: [
      { label: 'تأمين', intent: 'find_pro' },
      { label: 'تنظيف', intent: 'find_pro' },
    ],
    after: {
      rent: [
        { label: 'تنظيف بعد الاستعمال', intent: 'find_pro' },
        { label: 'تأمين', intent: 'find_pro' },
      ],
    },
  },
  product: {
    entity: 'product', label: 'منتج',
    companions: [
      { label: 'توصيل', intent: 'find_pro' },
      { label: 'تغليف', intent: 'buy' },
      { label: 'تصوير احترافيّ', intent: 'find_pro' },
    ],
    after: {
      sell: [
        { label: 'نشر منتج آخر', intent: 'sell' },
        { label: 'كوبون تخفيض للزبناء', intent: 'manage' },
        { label: 'ربط التوصيل', intent: 'find_pro' },
      ],
    },
  },
  service: {
    entity: 'service', label: 'خدمة',
    companions: [
      { label: 'أدوات ومعدّات', intent: 'buy' },
      { label: 'حرفيّون مكمّلون', intent: 'find_pro' },
    ],
    after: {
      create_service: [
        { label: 'نشر أعمال سابقة (صور)', intent: 'create_service' },
        { label: 'استقبال المواعيد', intent: 'book' },
      ],
      find_pro: [
        { label: 'حرفيّ مكمّل للمهمّة', intent: 'find_pro' },
      ],
    },
  },
};

// رفقاء الكيان — علاقات عامّة (لإثراء الرحلة في أيّ لحظة).
export function relatedTo(entity: Entity): Relation[] {
  return NODES[entity]?.companions ?? [];
}

// الخطوة المجاورة بعد فعلٍ معيّن — يغذّي اقتراحات ما بعد الإنجاز (بلا if).
export function followUps(entity: Entity, intent: Intent): Relation[] {
  return NODES[entity]?.after[intent] ?? [];
}

// حجم الرسم (لعرض الاستوديو).
export function relationsSize(): { entities: number; edges: number } {
  const entities = Object.keys(NODES).length;
  let edges = 0;
  for (const n of Object.values(NODES)) {
    edges += n.companions.length;
    for (const arr of Object.values(n.after)) edges += arr?.length ?? 0;
  }
  return { entities, edges };
}
