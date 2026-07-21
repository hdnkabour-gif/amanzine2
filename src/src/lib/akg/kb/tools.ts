// ============================================================
// Tool & Material Registry — الأدوات والموادّ كمعرفة مرتبطة بالمهن. تُثري
//   الاستدلال («يحتاج أنبوب PVC») والاقتراح («لعلاج التسرّب: مفتاح إنجليزيّ»)
//   بلا كود — بيانات فقط.
// ============================================================

export interface Tool {
  id: string;
  label: string;
  kind: 'tool' | 'material';
  aliases: string[];          // دارجة/فرنسيّة/إنجليزيّة
  profession?: string;        // المهنة المرتبطة (id)
  materials?: string[];       // موادّ مرتبطة (ids)
}

const registry = new Map<string, Tool>();
export function registerTool(t: Tool): void { registry.set(t.id, t); }
export function getTool(id: string): Tool | undefined { return registry.get(id); }
export function allTools(): Tool[] { return Array.from(registry.values()); }
export function toolsForProfession(prof: string): Tool[] {
  return allTools().filter(t => t.profession === prof);
}

const SEED: Tool[] = [
  { id: 'wrench', label: 'مفتاح إنجليزيّ', kind: 'tool', aliases: ['clé anglaise', 'wrench', 'مفتاح'], profession: 'plumber' },
  { id: 'pvc_pipe', label: 'أنبوب PVC', kind: 'material', aliases: ['tuyau PVC', 'pvc pipe', 'أنبوب'], profession: 'plumber' },
  { id: 'multimeter', label: 'مقياس متعدّد', kind: 'tool', aliases: ['multimètre', 'multimeter', 'أفوميتر'], profession: 'electrician' },
  { id: 'saw', label: 'منشار', kind: 'tool', aliases: ['scie', 'saw', 'منشار كهربائيّ'], profession: 'carpenter' },
  { id: 'diag_device', label: 'جهاز تشخيص', kind: 'tool', aliases: ['appareil diagnostic', 'obd', 'دياڭنوستيك'], profession: 'mechanic' },
  { id: 'tire', label: 'إطار', kind: 'material', aliases: ['pneu', 'tire', 'پنو', 'روضة'], profession: 'tire_tech' },
  { id: 'battery', label: 'بطارية', kind: 'material', aliases: ['batterie', 'battery', 'باتري'], profession: 'mechanic' },
  { id: 'paint', label: 'صباغة', kind: 'material', aliases: ['peinture', 'paint', 'صباغ'], profession: 'painter' },
];

SEED.forEach(registerTool);
