// ============================================================
// World State — «متى» و«في أيّ ظرف» يحدث الطلب. بيع الملابس في رمضان ليس
//   مثل الشتاء ولا العيد. هذه الطبقة تعطي إشارات الزمن/الموسم/المناسبة التي
//   تغذّي Context ثمّ Decision Engine (أولويّات، اقتراحات، نبرة).
//   ملاحظة صادقة: رمضان/العيد يعتمدان التقويم الهجريّ — نتركهما كإشارة
//   يضبطها الأدمن (occasions) بدل حسابٍ تقريبيّ قد يُخطئ.
// ============================================================

export type PartOfDay = 'صباح' | 'ظهر' | 'مساء' | 'ليل';
export type Season = 'شتاء' | 'ربيع' | 'صيف' | 'خريف';

export interface WorldState {
  hour: number;
  partOfDay: PartOfDay;
  weekend: boolean;        // في المغرب: السبت/الأحد
  lateNight: boolean;
  month: number;          // 1..12
  season: Season;
  occasions: string[];    // ['رمضان','العيد','الدخول المدرسي'…] — بعضها من الأدمن
}

function partOfDay(h: number): PartOfDay {
  if (h >= 5 && h < 12) return 'صباح';
  if (h >= 12 && h < 16) return 'ظهر';
  if (h >= 16 && h < 21) return 'مساء';
  return 'ليل';
}

function seasonOf(month: number): Season {
  if (month === 12 || month <= 2) return 'شتاء';
  if (month <= 5) return 'ربيع';
  if (month <= 8) return 'صيف';
  return 'خريف';
}

// مناسبات قابلة للحساب بثبات (لا هجريّة): الدخول المدرسيّ ~ شتنبر.
function deterministicOccasions(month: number): string[] {
  const o: string[] = [];
  if (month === 9) o.push('الدخول المدرسي');
  if (month === 7 || month === 8) o.push('العطلة الصيفية');
  return o;
}

// الحالة الحاليّة للعالم — مع إمكان حقن مناسبات من الأدمن (رمضان/العيد…).
export function getWorldState(now: Date = new Date(), adminOccasions: string[] = []): WorldState {
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDay(); // 0=أحد … 6=سبت
  return {
    hour,
    partOfDay: partOfDay(hour),
    weekend: day === 0 || day === 6,
    lateNight: hour >= 22 || hour < 6,
    month,
    season: seasonOf(month),
    occasions: [...deterministicOccasions(month), ...adminOccasions],
  };
}

// وسم موسميّ مختصر للعرض/النبرة («صيف» ، «رمضان»…).
export function seasonTag(w: WorldState = getWorldState()): string {
  return w.occasions[0] ?? w.season;
}
