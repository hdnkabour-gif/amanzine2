// ============================================================
// Problem Registry (v2) — المحور. المستخدم يبدأ من المشكلة لا من المهنة:
//   «الما كيقطر» · «الفريكو ما كتبردش». كلّ مشكلة: أعراض (٤ لغات)، خطورة،
//   طوارئ، حلول (مهنة + قدرات + أدوات)، أسباب، مشاكل مرتبطة، وقاية، تصنيف.
//   المطابقة الكلاميّة في symptomGraph. بيانات فقط (تحترم الـ Freeze).
// ============================================================

export interface ProblemSolution {
  profession: string;            // معرّف المهنة الحالّة
  capabilities: string[];        // القدرات المطلوبة (Capability Registry)
  tools?: string[];
  materials?: string[];
  estimatedDuration?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Problem {
  id: string;
  name: string;
  description?: string;
  symptoms: { darija?: string[]; arabic?: string[]; french?: string[]; english?: string[] };
  severity: 'low' | 'medium' | 'high' | 'critical';
  emergency: boolean;
  solutions: ProblemSolution[];
  causes?: string[];
  related?: string[];
  prevention?: string[];
  category: string;
  subcategory?: string;
  requiredExperience?: 'beginner' | 'intermediate' | 'expert';
}

export const PROBLEMS: Record<string, Problem> = {
  water_leak: {
    id: 'water_leak', name: 'تسرّب ماء', description: 'تسرّب الماء من الأنابيب أو الصنابير',
    symptoms: { darija: ['الما كيقطر', 'الما كيهرب', 'الما كيسيل', 'الما كايحر'], arabic: ['الماء يقطر', 'الماء يتسرّب'], french: ["fuite d'eau", 'goutte'], english: ['water leak', 'dripping'] },
    severity: 'high', emergency: true,
    solutions: [{ profession: 'plumber', capabilities: ['repair_leak', 'install_pipe'], tools: ['wrench'], materials: ['pvc_pipe'], estimatedDuration: '1-2 ساعات', difficulty: 'medium' }],
    causes: ['صدأ الأنابيب', 'تركيب خاطئ', 'ضغط عالٍ'], related: ['clogged_drain'], prevention: ['فحص دوريّ'],
    category: 'السباكة', subcategory: 'التسربات', requiredExperience: 'intermediate',
  },
  clogged_drain: {
    id: 'clogged_drain', name: 'انسداد الصرف', symptoms: { darija: ['الواد مسدود', 'ما كيمشيش الما', 'الطوموبة مسدودة'], arabic: ['المجرى مسدود'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'plumber', capabilities: ['unclog_drain'], estimatedDuration: '1 ساعة', difficulty: 'medium' }],
    related: ['water_leak'], category: 'السباكة', subcategory: 'التسليك', requiredExperience: 'intermediate',
  },
  electrical_blackout: {
    id: 'electrical_blackout', name: 'انقطاع الكهرباء', symptoms: { darija: ['الضو مقطوع', 'الكهربا مقطوعة', 'الضو كيطيح', 'ديسجونكتور'], arabic: ['التيار مقطوع'], french: ["coupure d'électricité"], english: ['power outage'] },
    severity: 'high', emergency: true,
    solutions: [{ profession: 'electrician', capabilities: ['diagnose_electrical', 'replace_fuse'], tools: ['multimeter'], estimatedDuration: '1-3 ساعات', difficulty: 'medium' }],
    causes: ['قاطع كهربائيّ', 'حمولة زائدة', 'عطب أسلاك'], related: ['short_circuit'], category: 'الكهرباء', subcategory: 'الأعطال', requiredExperience: 'expert',
  },
  short_circuit: {
    id: 'short_circuit', name: 'ماس كهربائيّ', symptoms: { darija: ['كيقصر', 'دخان من البريز', 'الفيش سخن', 'شعلات النار'], arabic: ['ماس كهربائيّ'] },
    severity: 'critical', emergency: true,
    solutions: [{ profession: 'electrician', capabilities: ['diagnose_electrical', 'repair_wiring'], tools: ['multimeter'], difficulty: 'hard' }],
    related: ['electrical_blackout'], category: 'الكهرباء', subcategory: 'الأعطال', requiredExperience: 'expert',
  },
  engine_noise: {
    id: 'engine_noise', name: 'صوت في المحرّك', symptoms: { darija: ['الماطور كيطق طق', 'الماطور كيدوي', 'الماطور كيصفر', 'دخان أبيض'], arabic: ['المحرك يحدث صوتاً'], french: ['bruit moteur'], english: ['engine knocking'] },
    severity: 'high', emergency: false,
    solutions: [{ profession: 'mechanic', capabilities: ['diagnose_engine', 'repair_engine'], tools: ['diag_device'], materials: ['oil'], estimatedDuration: '2-4 ساعات', difficulty: 'hard' }],
    causes: ['نقص الزيت', 'الصمامات', 'المحامل'], related: ['engine_overheat'], category: 'السيارات', subcategory: 'المحرّك', requiredExperience: 'expert',
  },
  engine_overheat: {
    id: 'engine_overheat', name: 'المحرّك يسخن', symptoms: { darija: ['السيارة كتسخن', 'الماطور كيسخن', 'الرادياتور كيغلي'], arabic: ['المحرك يسخن'] },
    severity: 'critical', emergency: true,
    solutions: [{ profession: 'mechanic', capabilities: ['diagnose_engine', 'repair_engine'], tools: ['diag_device'], difficulty: 'hard' }],
    related: ['engine_noise'], category: 'السيارات', subcategory: 'التبريد', requiredExperience: 'expert',
  },
  flat_tire: {
    id: 'flat_tire', name: 'إطار مثقوب', symptoms: { darija: ['الروي مفشوش', 'الروي طافي', 'الپنو خاوي', 'كريفي'], arabic: ['الإطار مثقوب'], french: ['pneu crevé'], english: ['flat tire'] },
    severity: 'medium', emergency: true,
    solutions: [{ profession: 'tire_technician', capabilities: ['repair_tire', 'balance_tire'], materials: ['tire'], estimatedDuration: '30 دقيقة', difficulty: 'easy' }],
    causes: ['مسمار', 'تآكل', 'ضغط منخفض'], related: [], category: 'السيارات', subcategory: 'الإطارات', requiredExperience: 'beginner',
  },
  battery_dead: {
    id: 'battery_dead', name: 'بطارية فارغة', symptoms: { darija: ['الباتري ماتت', 'الباتري فايضة', 'ما بغاتش تشعل', 'ما كتقلعش'], arabic: ['البطارية فارغة'], french: ['batterie morte'], english: ['dead battery'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'auto_electrician', capabilities: ['diagnose_battery', 'replace_battery'], tools: ['multimeter'], materials: ['battery'], estimatedDuration: '30 دقيقة', difficulty: 'easy' }],
    causes: ['الأنوار مفتوحة', 'عمر البطارية', 'الدينمو'], related: [], category: 'السيارات', subcategory: 'الكهرباء', requiredExperience: 'beginner',
  },
  fridge_not_cooling: {
    id: 'fridge_not_cooling', name: 'الثلّاجة لا تبرّد', symptoms: { darija: ['الفريكو ما كتبردش', 'الفريكو ما بقاتش كتبرد', 'الفريكو سخون', 'الفريكو خربان'], arabic: ['الثلاجة لا تبرد'], french: ['frigo ne refroidit pas'], english: ['fridge not cooling'] },
    severity: 'high', emergency: true,
    solutions: [{ profession: 'appliance_repair', capabilities: ['diagnose_cooling', 'recharge_gas'], tools: ['multimeter'], estimatedDuration: '2-4 ساعات', difficulty: 'hard' }],
    causes: ['نقص الغاز', 'عطل الضاغط', 'ثرموستات'], related: ['ac_broken'], category: 'الأجهزة المنزلية', subcategory: 'التبريد', requiredExperience: 'expert',
  },
  ac_broken: {
    id: 'ac_broken', name: 'مكيّف لا يبرّد', symptoms: { darija: ['الكليما ما كتبردش', 'المكيف خربان', 'كليماتيزور ما خدامش'], arabic: ['المكيف لا يبرد'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'ac_tech', capabilities: ['diagnose_cooling', 'recharge_gas'], estimatedDuration: '1-2 ساعات', difficulty: 'medium' }],
    related: ['fridge_not_cooling'], category: 'الأجهزة المنزلية', subcategory: 'التبريد', requiredExperience: 'expert',
  },
  door_broken: {
    id: 'door_broken', name: 'باب لا يُغلق/يُفتح', symptoms: { darija: ['الباب ما كيتحلش', 'الباب ما كيسدّش', 'السرّاجة خربانة', 'الباب كيصرصر'], arabic: ['الباب لا يغلق'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'carpenter', capabilities: [], estimatedDuration: '1 ساعة', difficulty: 'easy' }],
    related: [], category: 'النجارة', subcategory: 'الأبواب', requiredExperience: 'beginner',
  },
  // ── تغطية إضافيّة: مهن كانت بلا مسار عرَض→عطل (بيتا الدار البيضاء) ──
  paint_needed: {
    id: 'paint_needed', name: 'صباغة المنزل', symptoms: { darija: ['بغيت نصبغ الدار', 'الدار محتاجة صباغة', 'الحيط قديم', 'الصباغة تقشّرت', 'بغيت صبّاغ'], arabic: ['المنزل يحتاج دهان'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'painter', capabilities: [], estimatedDuration: 'يوم', difficulty: 'easy' }],
    category: 'الصباغة', requiredExperience: 'beginner',
  },
  construction_needed: {
    id: 'construction_needed', name: 'أشغال بناء', symptoms: { darija: ['بغيت نبني', 'خاصني بنّاي', 'كسر فالحيط', 'بغيت نبني حيط', 'أشغال بناء'], arabic: ['أعمال بناء'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'mason', capabilities: [], estimatedDuration: 'أيّام', difficulty: 'hard' }],
    category: 'البناء', requiredExperience: 'expert',
  },
  metalwork_needed: {
    id: 'metalwork_needed', name: 'أشغال حديد/لحام', symptoms: { darija: ['باب الحديد خربان', 'بغيت لحام', 'شباك ديال الحديد', 'بغيت حدّاد', 'حديد مكسور'], arabic: ['أعمال حديد'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'blacksmith', capabilities: [], estimatedDuration: 'ساعات', difficulty: 'medium' }],
    category: 'الحدادة', requiredExperience: 'intermediate',
  },
  haircut_needed: {
    id: 'haircut_needed', name: 'حلاقة/تجميل', symptoms: { darija: ['بغيت نحسن', 'حلاقة', 'تقصير الشعر', 'بغيت حلّاق', 'كوافير'], arabic: ['قص شعر'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'barber', capabilities: [], estimatedDuration: '30 دقيقة', difficulty: 'easy' }],
    category: 'التجميل', requiredExperience: 'beginner',
  },
  computer_broken: {
    id: 'computer_broken', name: 'عطل حاسوب', symptoms: { darija: ['الپيسي خربان', 'الحاسوب ما كيخدمش', 'الويندوز طاح', 'الأورديناتور بلوكا', 'بغيت تقني إعلاميات', 'الكمبيوتر بطّيء', 'pc ما خدامش', 'عندي مشكل فالحاسوب', 'بغيت نفورماتي', 'خاصني تقني'], arabic: ['الحاسوب معطّل', 'الحاسوب بطيء'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'it_tech', capabilities: [], estimatedDuration: 'ساعات', difficulty: 'medium' }],
    category: 'المعلوماتيّة', requiredExperience: 'intermediate',
  },
  network_down: {
    id: 'network_down', name: 'عطل شبكة/إنترنت', symptoms: { darija: ['الويفي ماخدامش', 'النت مقطوع', 'الراوتر خربان', 'الشبكة مقطوعة', 'عندي مشكل فالشبكة', 'السيرفر خربان', 'الكابل مقطوع', 'بغيت نركب الشبكة'], arabic: ['الشبكة معطّلة', 'انقطاع الإنترنت'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'it_tech', capabilities: [], estimatedDuration: 'ساعات', difficulty: 'medium' }],
    category: 'المعلوماتيّة', requiredExperience: 'intermediate',
  },
  phone_broken: {
    id: 'phone_broken', name: 'عطل هاتف', symptoms: { darija: ['التيليفون طاح', 'الشاشة مهرّسة', 'البورطابل ما كيشعلش', 'بغيت نصلح التيليفون', 'الطيليفون خربان'], arabic: ['الهاتف معطّل'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'phone_tech', capabilities: [], estimatedDuration: 'ساعة', difficulty: 'medium' }],
    category: 'الهواتف', requiredExperience: 'intermediate',
  },
  garden_care: {
    id: 'garden_care', name: 'العناية بالحديقة', symptoms: { darija: ['الحديقة محتاجة', 'تقليم الأشجار', 'العشب طويل', 'بغيت بستاني', 'جنان'], arabic: ['صيانة حديقة'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'gardener', capabilities: [], estimatedDuration: 'ساعات', difficulty: 'easy' }],
    category: 'البستنة', requiredExperience: 'beginner',
  },
  cleaning_needed: {
    id: 'cleaning_needed', name: 'تنظيف', symptoms: { darija: ['بغيت ننظّف الدار', 'تنظيف عام', 'الدار موسخة', 'بغيت عاملة تنظيف', 'تنظيف بعد الأشغال'], arabic: ['تنظيف المنزل'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'cleaner', capabilities: [], estimatedDuration: 'ساعات', difficulty: 'easy' }],
    category: 'التنظيف', requiredExperience: 'beginner',
  },
  moving_needed: {
    id: 'moving_needed', name: 'نقل الأثاث', symptoms: { darija: ['بغيت نقّل الأثاث', 'نقل الدار', 'حمّالة', 'بغيت نبدّل الدار', 'نقل الموبيليا'], arabic: ['نقل أثاث'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'mover', capabilities: [], estimatedDuration: 'نصف يوم', difficulty: 'medium' }],
    category: 'النقل', requiredExperience: 'beginner',
  },
  tutoring_needed: {
    id: 'tutoring_needed', name: 'دعم دراسيّ', symptoms: { darija: ['بغيت أستاذ', 'دعم دراسي', 'تقوية فالرياضيات', 'ساعات إضافية', 'أستاذ ديال الدعم'], arabic: ['دروس دعم'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'tutor', capabilities: [], estimatedDuration: 'ساعة', difficulty: 'easy' }],
    category: 'التعليم', requiredExperience: 'intermediate',
  },
  car_paint_needed: {
    id: 'car_paint_needed', name: 'صباغة سيّارة', symptoms: { darija: ['صباغة الطوموبيل', 'الطوموبيل خاصها صباغة', 'خدوش فالطوموبيل', 'بغيت نصبغ الطوموبيل', 'الطونوبيل مخدوشة'], arabic: ['دهان سيارة'] },
    severity: 'low', emergency: false,
    solutions: [{ profession: 'auto_painter', capabilities: [], estimatedDuration: 'أيّام', difficulty: 'medium' }],
    category: 'صباغة السيّارات', requiredExperience: 'intermediate',
  },
  wheel_alignment: {
    id: 'wheel_alignment', name: 'موازنة/جيومتري العجلات', symptoms: { darija: ['الطوموبيل كتجبد للجيهة', 'العجلات كترعش', 'خاصني جيومتري', 'الروضة ماشي متوازنة', 'الطوموبيل كتهز'], arabic: ['اهتزاز العجلات'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'tire_tech', capabilities: ['balance_tire'], estimatedDuration: 'ساعة', difficulty: 'medium' }],
    category: 'العجلات', requiredExperience: 'intermediate',
  },
  water_heater_broken: {
    id: 'water_heater_broken', name: 'عطل السخّان', symptoms: { darija: ['السخان خربان', 'ما كيسخنش الما', 'الشوفاج ما خدامش', 'بغيت نركّب سخان', 'السخان ما كيخدمش'], arabic: ['عطل السخان'] },
    severity: 'medium', emergency: false,
    solutions: [{ profession: 'plumber', capabilities: ['install_heater', 'repair_leak'], estimatedDuration: '1-2 ساعات', difficulty: 'medium' }],
    category: 'السباكة', subcategory: 'السخّانات', requiredExperience: 'intermediate',
  },
};

export function getProblem(id: string): Problem | undefined { return PROBLEMS[id]; }
export function allProblems(): Problem[] { return Object.values(PROBLEMS); }
export function problemsBySeverity(s: Problem['severity']): Problem[] { return allProblems().filter(p => p.severity === s); }
