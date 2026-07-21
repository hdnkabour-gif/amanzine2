// ============================================================
// Capability Registry (v2) — الاستدلال يعتمد على «القدرات» لا أسماء المهن
//   فقط. سبّاك = {repair_leak, install_pipe, unclog_drain}. المشكلة تطلب
//   قدرات، والقدرات تُنجزها مهن. بيانات فقط (تحترم الـ Freeze).
// ============================================================

export type CapCategory = 'repair' | 'install' | 'diagnose' | 'maintain' | 'inspect' | 'replace' | 'configure' | 'clean' | 'transport';

export interface Capability {
  id: string;
  nameAr: string;
  nameFr?: string;
  category: CapCategory;
  requiredSkills: string[];
  professions: string[];        // المهن التي تملكها (ids)
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
}

const registry = new Map<string, Capability>();
export function registerCapability(c: Capability): void { registry.set(c.id, c); }
export function getCapability(id: string): Capability | undefined { return registry.get(id); }
export function allCapabilities(): Capability[] { return Array.from(registry.values()); }

const CAPS: Capability[] = [
  // سباكة
  { id: 'repair_leak', nameAr: 'تصليح تسربات', nameFr: 'Réparer une fuite', category: 'repair', requiredSkills: ['تشخيص التسربات', 'أدوات السباكة'], professions: ['plumber'], complexity: 'moderate' },
  { id: 'install_pipe', nameAr: 'تركيب أنابيب', nameFr: 'Installer des tuyaux', category: 'install', requiredSkills: ['قياس', 'لحام', 'وصلات'], professions: ['plumber'], complexity: 'moderate' },
  { id: 'unclog_drain', nameAr: 'تسليك مجاري', nameFr: 'Déboucher', category: 'repair', requiredSkills: ['مضخة التسليك'], professions: ['plumber'], complexity: 'moderate' },
  { id: 'install_heater', nameAr: 'تركيب سخّان', category: 'install', requiredSkills: ['توصيل', 'كهرباء/غاز'], professions: ['plumber'], complexity: 'moderate' },
  // كهرباء
  { id: 'diagnose_electrical', nameAr: 'تشخيص أعطال الكهرباء', nameFr: 'Diagnostiquer', category: 'diagnose', requiredSkills: ['قراءة المخطّطات', 'جهاز القياس'], professions: ['electrician'], complexity: 'complex' },
  { id: 'repair_wiring', nameAr: 'تصليح الأسلاك', nameFr: 'Réparer le câblage', category: 'repair', requiredSkills: ['تمديد', 'عزل', 'فيوزات'], professions: ['electrician'], complexity: 'expert' },
  { id: 'replace_fuse', nameAr: 'تبديل القاطع/الفيوز', category: 'replace', requiredSkills: ['فصل التيار'], professions: ['electrician'], complexity: 'simple' },
  // سيارات
  { id: 'diagnose_engine', nameAr: 'تشخيص المحرّك', nameFr: 'Diagnostiquer le moteur', category: 'diagnose', requiredSkills: ['قراءة الأكواد', 'اختبار الضغط'], professions: ['mechanic'], complexity: 'expert' },
  { id: 'repair_engine', nameAr: 'إصلاح المحرّك', category: 'repair', requiredSkills: ['فكّ وتركيب'], professions: ['mechanic'], complexity: 'expert' },
  { id: 'repair_tire', nameAr: 'تصليح الإطارات', nameFr: 'Réparer un pneu', category: 'repair', requiredSkills: ['فكّ الإطار', 'رقعة', 'ضغط'], professions: ['tire_technician'], complexity: 'simple' },
  { id: 'balance_tire', nameAr: 'موازنة العجلات', category: 'maintain', requiredSkills: ['موازنة'], professions: ['tire_technician'], complexity: 'moderate' },
  { id: 'diagnose_battery', nameAr: 'تشخيص البطارية', category: 'diagnose', requiredSkills: ['قياس الجهد'], professions: ['auto_electrician'], complexity: 'simple' },
  { id: 'replace_battery', nameAr: 'تبديل البطارية', category: 'replace', requiredSkills: ['توصيل الأقطاب'], professions: ['auto_electrician'], complexity: 'simple' },
  // أجهزة
  { id: 'diagnose_cooling', nameAr: 'تشخيص التبريد', nameFr: 'Diagnostiquer le refroidissement', category: 'diagnose', requiredSkills: ['قياس الضغط', 'فحص الضاغط'], professions: ['appliance_repair'], complexity: 'complex' },
  { id: 'recharge_gas', nameAr: 'تعمير الغاز', nameFr: 'Recharger en gaz', category: 'repair', requiredSkills: ['مقياس الضغط', 'خراطيم الغاز'], professions: ['appliance_repair'], complexity: 'expert' },
];

CAPS.forEach(registerCapability);

// ربط المهنة → قدراتها (مشتقّ من القدرات).
export function capabilitiesOfProfession(prof: string): string[] {
  return allCapabilities().filter(c => c.professions.includes(prof)).map(c => c.id);
}
