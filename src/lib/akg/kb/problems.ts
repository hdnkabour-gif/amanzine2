// ============================================================
// Problem Registry — «المشكلة» كنقطة دخول. المستخدم لا يعرف اسم الحرفة، بل
//   يصف عطلًا: «الما كيسيل»، «الماطور كيطق طق». هذا السجلّ يربط الأعراض
//   (بالدارجة) بالمهنة الحالّة + الخطورة + الطوارئ + أدوات/منتجات مرتبطة.
//   يغذّي الاستدلال: نصّ العطل → مهنة، بلا if في المحرّك (بيانات).
// ============================================================

export interface Problem {
  id: string;
  label: string;             // «تسرّب ماء»
  symptoms: string[];        // عبارات دارجة يطابقها الاستدلال
  severity: 'low' | 'medium' | 'high';
  emergency: boolean;
  profession: string;        // معرّف المهنة الحالّة (Profession Registry)
  tools?: string[];
  products?: string[];
}

const registry: Problem[] = [];
export function registerProblem(p: Problem): void { registry.push(p); }
export function allProblems(): Problem[] { return registry.slice(); }

const norm = (s: string) => s.trim().toLowerCase();

// نصّ → أفضل مشكلة مطابقة (أطول عرَض مطابق يفوز).
export function matchProblem(text: string): Problem | undefined {
  const t = norm(text);
  let best: Problem | undefined; let bestLen = 0;
  for (const p of registry) {
    for (const s of p.symptoms) {
      const k = norm(s);
      if (k.length >= 3 && t.includes(k) && k.length > bestLen) { best = p; bestLen = k.length; }
    }
  }
  return best;
}

// ── البذرة v1 (أعراض دارجة → مهنة) ──
const SEED: Problem[] = [
  { id: 'water_leak', label: 'تسرّب ماء', symptoms: ['تسرب', 'الما كيسيل', 'كيقطر الما', 'تقطير', 'كيسرب الما', 'فيه الما'], severity: 'high', emergency: true, profession: 'plumber', tools: ['wrench'], products: ['pvc_pipe'] },
  { id: 'clogged_drain', label: 'انسداد الصرف', symptoms: ['مسدود', 'الواد مسدود', 'ما كيمشيش الما', 'الطوموبة مسدودة'], severity: 'medium', emergency: false, profession: 'plumber' },
  { id: 'no_hot_water', label: 'سخّان لا يعمل', symptoms: ['السخان خربان', 'ما كاينش الما السخون', 'الشوفاج ما خدامش'], severity: 'medium', emergency: false, profession: 'plumber' },
  { id: 'power_cut', label: 'انقطاع الكهرباء', symptoms: ['الضو مقطوع', 'ما كاينش الضو', 'كورت سيركوي', 'الكهرباء مقطوعة', 'ديسجونكتور'], severity: 'high', emergency: true, profession: 'electrician' },
  { id: 'short_circuit', label: 'ماس كهربائيّ', symptoms: ['كيقصر', 'شعلات النار', 'دخان من البريز', 'الفيش سخن'], severity: 'high', emergency: true, profession: 'electrician' },
  { id: 'door_broken', label: 'باب لا يُغلق', symptoms: ['الباب ما كيسدّش', 'الباب مكسور', 'السرّاجة خربانة', 'الباب كيصرصر'], severity: 'low', emergency: false, profession: 'carpenter' },
  { id: 'paint_cracked', label: 'تشقّق الصباغة', symptoms: ['الصباغة متشققة', 'كيطيح الصباغ', 'الحيط متوسّخ', 'رطوبة فالحيط'], severity: 'low', emergency: false, profession: 'painter' },
  { id: 'ac_broken', label: 'مكيّف لا يبرّد', symptoms: ['الكليما ما كتبردش', 'المكيف خربان', 'كليماتيزور ما خدامش'], severity: 'medium', emergency: false, profession: 'ac_tech' },
  { id: 'engine_overheat', label: 'المحرّك يسخن', symptoms: ['السيارة كتسخن', 'الماطور كيسخن', 'الرادياتور كيغلي', 'دخان من الكابو'], severity: 'high', emergency: true, profession: 'mechanic' },
  { id: 'engine_noise', label: 'صوت في المحرّك', symptoms: ['الماطور كيطق طق', 'الماطور كيهز', 'صوت فالموطور', 'كيعمل ضجة'], severity: 'medium', emergency: false, profession: 'mechanic', tools: ['diag_device'] },
  { id: 'brakes_weak', label: 'فرامل ضعيفة', symptoms: ['الفرام ماشي مزيان', 'الفرامل ضعاف', 'كيصفر الفران'], severity: 'high', emergency: true, profession: 'mechanic' },
  { id: 'battery_dead', label: 'بطارية فارغة', symptoms: ['الباتري مات', 'ما كتبديش', 'الطونوبيل ما كتقلعش'], severity: 'medium', emergency: false, profession: 'mechanic', products: ['battery'] },
  { id: 'flat_tire', label: 'إطار مثقوب', symptoms: ['الروي مفشوش', 'پنو مثقوب', 'كريفي', 'الروضة خاوية'], severity: 'medium', emergency: true, profession: 'tire_tech', products: ['tire'] },
  { id: 'car_diag', label: 'ضوء عطل في التابلو', symptoms: ['الدبة كتومض', 'ضو الموطور شعل', 'كود خطأ', 'الكمبيوتر كيشير'], severity: 'medium', emergency: false, profession: 'diagnostic', tools: ['diag_device'] },
  { id: 'phone_screen', label: 'شاشة هاتف مكسورة', symptoms: ['الشاشة مهرّسة', 'تيليفون طاح', 'الشاشة كحلة'], severity: 'low', emergency: false, profession: 'phone_tech' },
  { id: 'no_internet', label: 'انقطاع الإنترنت/الشبكة', symptoms: ['ما كاينش الأنترنت', 'الواي فاي ما خدامش', 'الروتور خربان', 'الكاميرات ما خدماش'], severity: 'medium', emergency: false, profession: 'it_tech' },
];

SEED.forEach(registerProblem);
