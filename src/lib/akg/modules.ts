// ============================================================
// MODULES — الطبقة الثالثة. كلّ Module «مجال» (سيّارات/منتجات/عقار/حرفيّون)
//   يملك: كياناته، نيّاته، صفحاته، خدماته المستعملة، سير عمله، وتحقّقه.
//   العقل يقرأ الـ Module فيعرف المجال كاملًا — لا صفحة معزولة.
//   إضافة مجال جديد = Module هنا، بلا مسّ القلب (Application DNA).
// ============================================================

import type { Intent } from '../needEngine';
import type { Page } from '../../types';
import type { Entity } from '../blueprints';

export interface ModuleWorkflow {
  step: string;         // اسم الخطوة
  via: string;          // بأيّ خدمة/فعل تتحقّق
}

export interface AppModule {
  id: string;           // 'cars'
  label: string;        // بلغة المستخدم
  entities: Entity[];   // الكيانات التي يملكها
  intents: Intent[];    // الحاجات التي يلبّيها
  pages: Page[];        // صفحاته
  services: string[];   // خدمات (Services) يستعملها — معرّفات من services.ts
  workflow: ModuleWorkflow[];  // سير العمل من الحاجة إلى الفعل
  keywords?: string[];  // مرادفات للمطابقة (دارجة/فرنسية)
}

const registry = new Map<string, AppModule>();

export function registerModule(m: AppModule): void {
  registry.set(m.id, m);
}
export function getModule(id: string): AppModule | undefined {
  return registry.get(id);
}
export function allModules(): AppModule[] {
  return Array.from(registry.values());
}

// أيّ Module يملك هذا الكيان؟ (سيّارة → Cars)
export function moduleForEntity(entity: Entity): AppModule | undefined {
  return allModules().find(m => m.entities.includes(entity));
}
// أيّ Module يلبّي هذه الحاجة؟
export function moduleForIntent(intent: Intent): AppModule | undefined {
  return allModules().find(m => m.intents.includes(intent));
}

// ── وحدات AMANZINE (منسّقة من الكيانات/الصفحات الحقيقيّة) ──
const MODULES: AppModule[] = [
  {
    id: 'products', label: 'المنتجات',
    entities: ['product'],
    intents: ['sell', 'create_store', 'manage', 'buy'],
    pages: ['products', 'publish', 'orders'],
    services: ['ai.description', 'ai.removeBg', 'ai.enhance', 'design.image', 'brand.logo',
      'share.whatsapp', 'share.social', 'share.qr', 'pay.checkout', 'ai.price'],
    keywords: ['منتج', 'بيع', 'سلعة', 'produit', 'متجر'],
    workflow: [
      { step: 'وصف المنتج', via: 'fields' },
      { step: 'تصميم الصورة', via: 'design.image' },
      { step: 'إضافة اللوغو', via: 'brand.logo' },
      { step: 'كتابة الوصف', via: 'ai.description' },
      { step: 'النشر والمشاركة', via: 'share.whatsapp' },
    ],
  },
  {
    id: 'cars', label: 'السيّارات',
    entities: ['vehicle'],
    intents: ['sell', 'buy'],
    pages: ['publish'],
    services: ['ai.description', 'ai.enhance', 'design.image', 'ai.price',
      'share.whatsapp', 'share.social', 'geo.city'],
    keywords: ['سيّارة', 'طوموبيل', 'voiture', 'golf', 'مركبة'],
    workflow: [
      { step: 'الماركة والموديل والسنة', via: 'fields' },
      { step: 'المحرّك والكيلومترات', via: 'fields' },
      { step: 'اقتراح الثمن', via: 'ai.price' },
      { step: 'الصور', via: 'ai.enhance' },
      { step: 'النشر', via: 'share.whatsapp' },
    ],
  },
  {
    id: 'realEstate', label: 'العقار والكراء',
    entities: ['realEstate', 'rental'],
    intents: ['sell', 'rent'],
    pages: ['publish'],
    services: ['design.image', 'ai.description', 'geo.city', 'geo.map',
      'share.whatsapp', 'share.social'],
    keywords: ['عقار', 'شقّة', 'دار', 'كراء', 'immobilier', 'location'],
    workflow: [
      { step: 'النوع والمساحة والغرف', via: 'fields' },
      { step: 'المدينة والموقع', via: 'geo.city' },
      { step: 'الصور والوصف', via: 'ai.description' },
      { step: 'النشر', via: 'share.whatsapp' },
    ],
  },
  {
    id: 'professions', label: 'الحرفيّون والخدمات',
    entities: ['service'],
    intents: ['create_service', 'find_pro', 'book', 'urgent'],
    pages: ['publish', 'assistant', 'bookings'],
    services: ['ai.description', 'design.image', 'geo.city',
      'share.whatsapp', 'notify.push'],
    keywords: ['خدمة', 'حرفي', 'صبّاغ', 'سبّاك', 'كهربائي', 'artisan', 'service'],
    workflow: [
      { step: 'نوع الخدمة والخبرة', via: 'fields' },
      { step: 'المدينة والتغطية', via: 'geo.city' },
      { step: 'أعمال سابقة (صور)', via: 'design.image' },
      { step: 'النشر واستقبال الطلبات', via: 'notify.push' },
    ],
  },
];

MODULES.forEach(registerModule);
