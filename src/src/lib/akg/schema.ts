// ============================================================
// Form Schema + Schema Registry — النظام صار Data-driven. كلّ مجال يُعرّف
//   بـ Schema واحد (حقول + قدرات + Theme)، مسجّل مركزيًّا. إضافة مجال جديد
//   (طبّ/تعليم/سياحة) = Schema + Capabilities + Relations — بلا صفحة معقّدة.
//   الحقول تُشتقّ من القالب (blueprints) فلا تكرار؛ الـ Theme يحقّق «كلّ مجال
//   له عالمه» عبر UIStep.theme الذي يستهلكه الـ Renderer.
// ============================================================

import { resolveFields, blueprintMeta, type Entity, type BField } from '../blueprints';
import { moduleForEntity } from './modules';
import { WIDGET, type Widget } from './widgets';

export interface DomainTheme {
  id: string;
  accent: string;   // لون المجال
  soft: string;     // خلفيّة خفيفة للمجال
  icon: string;     // رمز المجال
  mood: string;     // «عالم السيّارات»…
}

export interface FieldSchema {
  key: string;
  label: string;
  widget: Widget;
  required: boolean;
  essential: boolean;
  choices?: string[];
  hint?: string;
}

export interface FormSchema {
  entity: Entity;
  blueprintId: string;
  label: string;          // «سيّارة للبيع»
  verb: string;           // «ينشر إعلان سيّارة»
  fields: FieldSchema[];  // مشتقّة من القالب (data-driven)
  capabilities: string[]; // خدمات المجال
  theme: DomainTheme;
}

// ── تسجيل المجالات: كيان → (قالب + Theme) ──
interface SchemaSeed { entity: Entity; blueprintId: string; theme: DomainTheme; }

const SEEDS: SchemaSeed[] = [
  { entity: 'product',    blueprintId: 'product',    theme: { id: 'product',    accent: '#0a8f6f', soft: 'rgba(10,143,111,.12)',  icon: '🛍️', mood: 'المتجر' } },
  { entity: 'vehicle',    blueprintId: 'vehicle',    theme: { id: 'vehicle',    accent: '#3B6FE0', soft: 'rgba(59,111,224,.14)',  icon: '🚗', mood: 'عالم السيّارات' } },
  { entity: 'realEstate', blueprintId: 'realEstate', theme: { id: 'realEstate', accent: '#C77D2E', soft: 'rgba(199,125,46,.14)',  icon: '🏠', mood: 'العقار' } },
  { entity: 'rental',     blueprintId: 'rental',     theme: { id: 'rental',     accent: '#6C5CE7', soft: 'rgba(108,92,231,.14)',  icon: '🔑', mood: 'الكراء' } },
  { entity: 'service',    blueprintId: 'service',    theme: { id: 'service',    accent: '#D4A017', soft: 'rgba(212,160,23,.14)',  icon: '🛠️', mood: 'الحرفيّون والخدمات' } },
];

const registry = new Map<Entity, SchemaSeed>(SEEDS.map(s => [s.entity, s]));

function toFieldSchema(f: BField): FieldSchema {
  return {
    key: f.key, label: f.label, widget: WIDGET[f.type],
    required: f.required === true, essential: f.required === true,
    choices: f.options, hint: f.hint,
  };
}

// يبني Schema كاملًا للكيان (حقول من القالب + قدرات المجال + Theme).
export function getSchema(entity: Entity): FormSchema {
  const seed = registry.get(entity) || registry.get('product')!;
  const meta = blueprintMeta(seed.blueprintId) || { label: 'إعلان', verb: 'ينشر' };
  const fields = resolveFields(seed.blueprintId).map(toFieldSchema);
  const capabilities = moduleForEntity(entity)?.services ?? [];
  return { entity, blueprintId: seed.blueprintId, label: meta.label, verb: meta.verb, fields, capabilities, theme: seed.theme };
}

export function allSchemas(): FormSchema[] {
  return SEEDS.map(s => getSchema(s.entity));
}

export function themeOf(entity: Entity): DomainTheme {
  return (registry.get(entity) || registry.get('product')!).theme;
}
