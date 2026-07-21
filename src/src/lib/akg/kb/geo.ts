// ============================================================
// Administrative Geography Registry — الجغرافيا الإداريّة المغربيّة كبيانات:
//   جهة → مدن → أحياء + رمز بريديّ. تُفعّل widget الموقع، «قربي»، والبحث
//   حسب المنطقة. بيانات فقط (تحترم الـ Freeze).
//   v1: الجهات الـ12 + المدن الكبرى + أحياء الدار البيضاء (عيّنة قابلة للتوسّع).
// ============================================================

export interface Region {
  id: string;
  label: string;
  cities: string[];
}

const regions: Region[] = [
  { id: 'tanger-tetouan', label: 'طنجة-تطوان-الحسيمة', cities: ['طنجة', 'تطوان', 'الحسيمة', 'العرائش', 'شفشاون'] },
  { id: 'oriental', label: 'الشرق', cities: ['وجدة', 'الناظور', 'بركان', 'تاوريرت'] },
  { id: 'fes-meknes', label: 'فاس-مكناس', cities: ['فاس', 'مكناس', 'تازة', 'صفرو'] },
  { id: 'rabat-sale', label: 'الرباط-سلا-القنيطرة', cities: ['الرباط', 'سلا', 'القنيطرة', 'تمارة', 'الخميسات'] },
  { id: 'beni-mellal', label: 'بني ملال-خنيفرة', cities: ['بني ملال', 'خنيفرة', 'الفقيه بن صالح', 'خريبكة'] },
  { id: 'casablanca-settat', label: 'الدار البيضاء-سطات', cities: ['الدار البيضاء', 'المحمدية', 'سطات', 'برشيد', 'الجديدة'] },
  { id: 'marrakech-safi', label: 'مراكش-آسفي', cities: ['مراكش', 'آسفي', 'الصويرة', 'اليوسفية'] },
  { id: 'draa-tafilalet', label: 'درعة-تافيلالت', cities: ['الرشيدية', 'ورزازات', 'زاكورة', 'تنغير'] },
  { id: 'souss-massa', label: 'سوس-ماسة', cities: ['أكادير', 'إنزكان', 'تارودانت', 'تيزنيت'] },
  { id: 'guelmim', label: 'كلميم-واد نون', cities: ['كلميم', 'طانطان', 'سيدي إفني', 'آسا'] },
  { id: 'laayoune', label: 'العيون-الساقية الحمراء', cities: ['العيون', 'بوجدور', 'السمارة'] },
  { id: 'dakhla', label: 'الداخلة-وادي الذهب', cities: ['الداخلة', 'أوسرد'] },
];

// أحياء/مقاطعات الدار البيضاء (عيّنة v1).
const CASA_DISTRICTS = ['عين الشق', 'الحيّ المحمّدي', 'مرس السلطان', 'سيدي البرنوصي', 'الفداء', 'الحيّ الحسني', 'عين السبع', 'المعاريف', 'درب السلطان', 'سباتة', 'بوركون', 'عين الذياب'];

// رموز بريديّة (عيّنة).
const POSTAL: Record<string, string> = { 'الدار البيضاء': '20000', 'الرباط': '10000', 'فاس': '30000', 'مراكش': '40000', 'طنجة': '90000', 'أكادير': '80000', 'وجدة': '60000' };

const cityIndex = new Map<string, Region>();
regions.forEach(r => r.cities.forEach(c => cityIndex.set(c, r)));

export function allRegions(): Region[] { return regions.slice(); }
export function allCities(): string[] { return regions.flatMap(r => r.cities); }
export function citiesOf(regionId: string): string[] { return regions.find(r => r.id === regionId)?.cities ?? []; }
export function regionOfCity(city: string): Region | undefined { return cityIndex.get(city.trim()); }
export function districtsOf(city: string): string[] { return city.trim() === 'الدار البيضاء' ? CASA_DISTRICTS.slice() : []; }
export function postalOf(city: string): string | undefined { return POSTAL[city.trim()]; }

// أوّل مدينة مذكورة في نصّ (لاستدلال المدينة).
export function cityInText(text: string): string | undefined {
  const t = text.trim();
  return allCities().find(c => t.includes(c));
}

export function geoSize(): { regions: number; cities: number } {
  return { regions: regions.length, cities: allCities().length };
}
