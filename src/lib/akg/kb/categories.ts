// ============================================================
// Category Registry — المجالات العشرة للسوق المغربيّ كبيانات. تربط القطاع
//   بأيقونته ومهنه وكياناته، وتوجّه أيّ Schema/Module نضيفه تاليًا (بيانات).
// ============================================================

export interface Category {
  id: string;
  label: string;
  icon: string;
  professions?: string[];   // ids من Profession Registry
  entities?: string[];      // كيانات مرتبطة (product/vehicle/service/realEstate…)
  priority: 1 | 2 | 3;      // 1=MVP · 2=توسيع · 3=تخصّص
}

const registry = new Map<string, Category>();
export function registerCategory(c: Category): void { registry.set(c.id, c); }
export function getCategory(id: string): Category | undefined { return registry.get(id); }
export function allCategories(): Category[] { return Array.from(registry.values()); }
export function categoriesByPriority(p: 1 | 2 | 3): Category[] {
  return allCategories().filter(c => c.priority === p);
}

// ── العشرة (من خارطة المجالات في الملفّ) ──
const SEED: Category[] = [
  { id: 'home', label: 'الخدمات المنزليّة', icon: '🏠', professions: ['plumber', 'electrician', 'painter', 'carpenter', 'ac_tech', 'appliance_repair', 'cleaner', 'gardener'], entities: ['service'], priority: 1 },
  { id: 'automotive', label: 'السيّارات', icon: '🚗', professions: ['mechanic', 'diagnostic', 'tire_technician', 'auto_electrician', 'auto_painter'], entities: ['vehicle', 'service'], priority: 1 },
  { id: 'realEstate', label: 'العقار', icon: '🏡', entities: ['realEstate', 'rental'], priority: 1 },
  { id: 'food', label: 'الأكل والمطاعم', icon: '🍽️', entities: ['product', 'service'], priority: 2 },
  { id: 'health', label: 'الصحّة', icon: '🏥', entities: ['service'], priority: 2 },
  { id: 'products', label: 'المنتجات الاستهلاكيّة', icon: '🛍️', entities: ['product'], priority: 1 },
  { id: 'craftsmen', label: 'الحرفيّون', icon: '🛠️', professions: ['mason', 'blacksmith', 'barber'], entities: ['service'], priority: 1 },
  { id: 'transport', label: 'النقل والمواصلات', icon: '🚖', professions: ['mover'], entities: ['service'], priority: 2 },
  { id: 'education', label: 'التعليم والتكوين', icon: '📚', professions: ['tutor'], entities: ['service'], priority: 3 },
  { id: 'sports', label: 'الرياضة والترفيه', icon: '⚽', entities: ['service'], priority: 3 },
];

SEED.forEach(registerCategory);
