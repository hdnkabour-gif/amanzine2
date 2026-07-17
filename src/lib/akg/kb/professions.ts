// ============================================================
// Profession Registry — المهن كمعرفة: قطاع، تخصّصات، مهارات، قدرات، مهن
//   مرتبطة، أدوات. ليست كلمات، بل «أنطولوجيا» تغذّي الاستدلال والاقتراح.
//   بيانات فقط (تحترم الـ Freeze) — إضافة مهنة = سطر، لا كود.
// ============================================================

export interface Profession {
  id: string;                    // 'plumber'
  label: string;                 // 'سبّاك'
  sector: string;                // معرّف فئة (home/automotive/construction…)
  specializations: string[];
  skills: string[];
  capabilities: string[];        // ['bookable','locatable','urgent','quotable']
  related?: string[];            // مهن مرتبطة (ids)
  tools?: string[];              // أدوات (ids من Tool Registry)
}

const registry = new Map<string, Profession>();
export function registerProfession(p: Profession): void { registry.set(p.id, p); }
export function getProfession(id: string): Profession | undefined { return registry.get(id); }
export function allProfessions(): Profession[] { return Array.from(registry.values()); }
export function professionsBySector(sector: string): Profession[] {
  return allProfessions().filter(p => p.sector === sector);
}
// بحث بالاسم/التخصّص (لمطابقة الدارجة عبر Vocabulary لاحقًا).
export function findProfessionByLabel(label: string): Profession | undefined {
  const t = label.trim();
  return allProfessions().find(p => p.label === t || p.specializations.includes(t));
}

// ── البذرة v1 (قطاعات الملفّ العشرة، مهن مغربيّة شائعة) ──
const SEED: Profession[] = [
  { id: 'plumber', label: 'سبّاك', sector: 'home', specializations: ['تسربات', 'سخانات', 'صرف صحّي', 'تركيب حمّامات'], skills: ['لحام أنابيب', 'كشف التسرب'], capabilities: ['bookable', 'locatable', 'urgent', 'quotable'], related: ['electrician', 'mason'], tools: ['wrench', 'pvc_pipe'] },
  { id: 'electrician', label: 'كهربائي', sector: 'home', specializations: ['تمديدات', 'أعطال', 'إنارة', 'لوحات كهرباء'], skills: ['قراءة المخطّطات', 'كشف الأعطال'], capabilities: ['bookable', 'locatable', 'urgent', 'quotable'], related: ['plumber', 'ac_tech'], tools: ['multimeter'] },
  { id: 'painter', label: 'صبّاغ', sector: 'home', specializations: ['دهان داخليّ', 'ديكور', 'واجهات'], skills: ['تحضير الجدران', 'خلط الألوان'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['mason', 'carpenter'] },
  { id: 'carpenter', label: 'نجّار', sector: 'home', specializations: ['مطابخ', 'أبواب', 'خزائن', 'أثاث'], skills: ['قياس', 'تجميع', 'تشطيب'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['painter', 'blacksmith'], tools: ['saw'] },
  { id: 'mason', label: 'بنّاي', sector: 'construction', specializations: ['بناء', 'تبليط', 'جبس'], skills: ['قراءة التصاميم', 'الخرسانة'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['plumber', 'electrician', 'blacksmith'] },
  { id: 'blacksmith', label: 'حدّاد', sector: 'construction', specializations: ['أبواب حديد', 'شبابيك', 'درابزين'], skills: ['لحام', 'قصّ المعادن'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['mason', 'carpenter'] },
  { id: 'ac_tech', label: 'تقني تبريد', sector: 'home', specializations: ['مكيّفات', 'ثلّاجات', 'تجميد'], skills: ['شحن الغاز', 'كشف التسرب'], capabilities: ['bookable', 'locatable', 'urgent'], related: ['electrician'] },
  { id: 'mechanic', label: 'ميكانيكي', sector: 'automotive', specializations: ['محرّك', 'علبة السرعات', 'فرامل', 'تعليق'], skills: ['تشخيص', 'إصلاح'], capabilities: ['bookable', 'locatable', 'urgent', 'quotable'], related: ['diagnostic', 'tire_tech'], tools: ['diag_device'] },
  { id: 'diagnostic', label: 'تقني تشخيص', sector: 'automotive', specializations: ['فحص إلكترونيّ', 'أكواد الأعطال'], skills: ['قراءة الأكواد'], capabilities: ['bookable', 'locatable'], related: ['mechanic'], tools: ['diag_device'] },
  { id: 'tire_tech', label: 'تقني عجلات', sector: 'automotive', specializations: ['تبديل الإطارات', 'توازن', 'جيومتري'], skills: ['موازنة'], capabilities: ['bookable', 'locatable'], related: ['mechanic'] },
  { id: 'auto_painter', label: 'صبّاغ سيّارات', sector: 'automotive', specializations: ['صباغة', 'بوليساج', 'إزالة الخدوش'], skills: ['رشّ الصباغة'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['mechanic'] },
  { id: 'barber', label: 'حلّاق / كوّافير', sector: 'beauty', specializations: ['حلاقة', 'تصفيف', 'حلاقة ذقن'], skills: ['قصّ'], capabilities: ['bookable', 'locatable'] },
  { id: 'it_tech', label: 'تقني معلوماتيّة', sector: 'it', specializations: ['شبكات', 'إصلاح حواسيب', 'كاميرات مراقبة'], skills: ['تركيب', 'صيانة'], capabilities: ['bookable', 'locatable', 'quotable'], related: ['electrician'] },
  { id: 'phone_tech', label: 'تقني هواتف', sector: 'it', specializations: ['إصلاح شاشات', 'برمجة', 'بطاريات'], skills: ['لحام دقيق'], capabilities: ['bookable', 'locatable'] },
  { id: 'gardener', label: 'بستانيّ', sector: 'home', specializations: ['تشذيب', 'عشب', 'ريّ'], skills: ['تقليم'], capabilities: ['bookable', 'locatable'] },
  { id: 'cleaner', label: 'عامل تنظيف', sector: 'home', specializations: ['تنظيف منازل', 'ما بعد الأشغال', 'واجهات'], skills: [], capabilities: ['bookable', 'locatable'] },
  { id: 'mover', label: 'نقل الأثاث', sector: 'transport', specializations: ['نقل', 'تغليف', 'فكّ وتركيب'], skills: [], capabilities: ['bookable', 'locatable', 'quotable'] },
  { id: 'tutor', label: 'أستاذ دعم', sector: 'education', specializations: ['رياضيات', 'فيزياء', 'لغات'], skills: ['شرح'], capabilities: ['bookable', 'locatable'] },
];

SEED.forEach(registerProfession);
