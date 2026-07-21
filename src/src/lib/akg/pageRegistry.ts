// ============================================================
// Page Registry — السجلّ الخامس. الصفحة صارت بيانات: كلّ صفحة (products.create،
//   cars.create…) تشير إلى كيان + نوع + صلاحيّات + بذرة، ومنها تُشتقّ Schema
//   و Theme و Capabilities (بلا تكرار). PageEngine يقرأ التعريف ويرسم — فلا
//   نكتب ProductsPage/CarsPage بعد اليوم، بل نضيف تعريفًا فقط.
//   السجلّات الخمسة: Schema · Capability · Relation · Component · Page.
// ============================================================

import type { Entity } from '../blueprints';
import type { PolicyAction } from './policies';
import { getSchema, type FormSchema } from './schema';

export type PageKind = 'create' | 'universal';   // (list/edit/import… لاحقًا)

export interface PageDef {
  id: string;               // 'products.create'
  module: string;           // 'products'
  kind: PageKind;
  title: string;
  entity?: Entity;          // نطاق الصفحة (للاشتقاق)
  seed?: string;            // بذرة الحاجة (للإنشاء المُوجَّه)
  permissions: PolicyAction[];  // ما تتطلّبه (النشر يحتاج دخولًا…)
  renderer: 'create';       // أيّ محرّك يرسمها
}

const registry = new Map<string, PageDef>();
export function registerPageDef(def: PageDef): void { registry.set(def.id, def); }
export function getPageDef(id: string): PageDef | undefined { return registry.get(id); }
export function allPageDefs(): PageDef[] { return Array.from(registry.values()); }

// Schema الصفحة (مشتقّ من كيانها) — للـ PageEngine/الاستوديو.
export function pageSchema(id: string): FormSchema | undefined {
  const d = registry.get(id);
  return d?.entity ? getSchema(d.entity) : undefined;
}

// ── تعريفات الصفحات (بيانات، لا كود) ──
const DEFS: PageDef[] = [
  { id: 'universal.create',  module: 'universal',  kind: 'universal', title: 'افعل أيّ شيء',   permissions: ['publish'], renderer: 'create' },
  { id: 'products.create',   module: 'products',   kind: 'create', title: 'أضف منتجًا',        entity: 'product',    seed: 'نبيع منتج',   permissions: ['publish'], renderer: 'create' },
  { id: 'cars.create',       module: 'cars',       kind: 'create', title: 'أعلن عن سيّارة',     entity: 'vehicle',    seed: 'نبيع سيّارة', permissions: ['publish'], renderer: 'create' },
  { id: 'realEstate.create', module: 'realEstate', kind: 'create', title: 'أعلن عن عقار',       entity: 'realEstate', seed: 'نبيع عقار',   permissions: ['publish'], renderer: 'create' },
  { id: 'services.create',   module: 'professions',kind: 'create', title: 'أعلن عن نشاطك',      entity: 'service',    seed: 'أنا حرفي',    permissions: ['publish'], renderer: 'create' },
];

DEFS.forEach(registerPageDef);
