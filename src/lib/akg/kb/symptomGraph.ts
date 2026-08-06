// ============================================================
// Symptom Graph (v2) — التعيين الدلاليّ من كلام المستخدم إلى مشكلة. المستخدم
//   لا يقول «سبّاك»، بل «الما كيقطر». هذا الرسم يربط النمط الكلاميّ (دارجة/
//   عربيّة) بمعرّف مشكلة + ثقة. مطابقة دقيقة أوّلًا، ثمّ جزئيّة بثقة أقلّ.
//   بيانات فقط — إضافة عرَض = سطر.
// ============================================================

export interface SymptomNode {
  pattern: string;       // النمط في كلام المستخدم
  context: string;       // السياق (ماء/كهرباء/سيّارة/منزل)
  problemId: string;
  confidence: number;    // 0..1
}

export const SYMPTOM_GRAPH: SymptomNode[] = [
  // ماء
  { pattern: 'الما كيقطر', context: 'ماء', problemId: 'water_leak', confidence: 0.95 },
  { pattern: 'الما كيهرب', context: 'ماء', problemId: 'water_leak', confidence: 0.95 },
  { pattern: 'الما كيسيل', context: 'ماء', problemId: 'water_leak', confidence: 0.9 },
  { pattern: 'الما كايحر', context: 'ماء', problemId: 'water_leak', confidence: 0.85 },
  { pattern: 'الما فاض', context: 'ماء', problemId: 'water_leak', confidence: 0.9 },
  { pattern: 'فاض الما', context: 'ماء', problemId: 'water_leak', confidence: 0.9 },
  { pattern: 'الما طايح', context: 'ماء', problemId: 'water_leak', confidence: 0.85 },
  { pattern: 'تسرب', context: 'ماء', problemId: 'water_leak', confidence: 0.9 },
  { pattern: 'الواد مسدود', context: 'ماء', problemId: 'clogged_drain', confidence: 0.9 },
  { pattern: 'ما كيمشيش الما', context: 'ماء', problemId: 'clogged_drain', confidence: 0.85 },
  // كهرباء
  { pattern: 'الضو مقطوع', context: 'كهرباء', problemId: 'electrical_blackout', confidence: 0.95 },
  { pattern: 'الكهربا مقطوعة', context: 'كهرباء', problemId: 'electrical_blackout', confidence: 0.95 },
  { pattern: 'الضو كيطيح', context: 'كهرباء', problemId: 'electrical_blackout', confidence: 0.85 },
  { pattern: 'ديسجونكتور', context: 'كهرباء', problemId: 'electrical_blackout', confidence: 0.8 },
  { pattern: 'كيقصر', context: 'كهرباء', problemId: 'short_circuit', confidence: 0.85 },
  { pattern: 'دخان من البريز', context: 'كهرباء', problemId: 'short_circuit', confidence: 0.9 },
  // محرّك
  { pattern: 'الماطور كيطق طق', context: 'سيّارة', problemId: 'engine_noise', confidence: 0.9 },
  { pattern: 'الماطور كيدوي', context: 'سيّارة', problemId: 'engine_noise', confidence: 0.85 },
  { pattern: 'الماطور كيصفر', context: 'سيّارة', problemId: 'engine_noise', confidence: 0.8 },
  { pattern: 'دخان أبيض', context: 'سيّارة', problemId: 'engine_noise', confidence: 0.75 },
  { pattern: 'السيارة كتسخن', context: 'سيّارة', problemId: 'engine_overheat', confidence: 0.9 },
  { pattern: 'الماطور كيسخن', context: 'سيّارة', problemId: 'engine_overheat', confidence: 0.9 },
  // إطارات
  { pattern: 'الروي مفشوش', context: 'سيّارة', problemId: 'flat_tire', confidence: 0.95 },
  { pattern: 'الروي طافي', context: 'سيّارة', problemId: 'flat_tire', confidence: 0.9 },
  { pattern: 'الپنو خاوي', context: 'سيّارة', problemId: 'flat_tire', confidence: 0.95 },
  { pattern: 'كريفي', context: 'سيّارة', problemId: 'flat_tire', confidence: 0.85 },
  // بطارية
  { pattern: 'الباتري ماتت', context: 'سيّارة', problemId: 'battery_dead', confidence: 0.95 },
  { pattern: 'الباتري فايضة', context: 'سيّارة', problemId: 'battery_dead', confidence: 0.9 },
  { pattern: 'ما بغاتش تشعل', context: 'سيّارة', problemId: 'battery_dead', confidence: 0.85 },
  { pattern: 'ما كتقلعش', context: 'سيّارة', problemId: 'battery_dead', confidence: 0.85 },
  // ثلاجة/تبريد
  { pattern: 'الفريكو ما كتبردش', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.95 },
  { pattern: 'الفريكو ما بقاتش كتبرد', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.95 },
  { pattern: 'الفريكو سخون', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.9 },
  { pattern: 'الفريكو خربان', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.85 },
  // «الفريكو» وحدَها كانت معروفة، و«الفريجيدير» و«الثلاجة» أشيعُ منها.
  // والاسمُ هو ما يُسمّي الحرفة — فبغيابه يُقرأ العطبُ وحدَه، ويقع في أوّل
  // مصرفٍ يجده. هكذا صار صاحبُ الثلّاجة يُرسَل إلى تقنيّ حواسيب.
  { pattern: 'الفريجيدير', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.8 },
  { pattern: 'فريجيدير', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.8 },
  { pattern: 'الثلاجة', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.8 },
  { pattern: 'ثلاجة', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.8 },
  { pattern: 'الفريكو', context: 'منزل', problemId: 'fridge_not_cooling', confidence: 0.8 },
  { pattern: 'الكليما ما كتبردش', context: 'منزل', problemId: 'ac_broken', confidence: 0.9 },
  // نجارة
  { pattern: 'الباب ما كيتحلش', context: 'منزل', problemId: 'door_broken', confidence: 0.9 },
  { pattern: 'الباب ما كيسدّش', context: 'منزل', problemId: 'door_broken', confidence: 0.9 },
  { pattern: 'السرّاجة خربانة', context: 'منزل', problemId: 'door_broken', confidence: 0.85 },
  // صباغة
  { pattern: 'بغيت نصبغ', context: 'منزل', problemId: 'paint_needed', confidence: 0.9 },
  { pattern: 'محتاجة صباغة', context: 'منزل', problemId: 'paint_needed', confidence: 0.9 },
  { pattern: 'الصباغة تقشّرت', context: 'منزل', problemId: 'paint_needed', confidence: 0.85 },
  { pattern: 'بغيت صبّاغ', context: 'منزل', problemId: 'paint_needed', confidence: 0.9 },
  // بناء
  { pattern: 'بغيت نبني', context: 'منزل', problemId: 'construction_needed', confidence: 0.9 },
  { pattern: 'خاصني بنّاي', context: 'منزل', problemId: 'construction_needed', confidence: 0.9 },
  { pattern: 'كسر فالحيط', context: 'منزل', problemId: 'construction_needed', confidence: 0.85 },
  // حدادة
  { pattern: 'باب الحديد خربان', context: 'منزل', problemId: 'metalwork_needed', confidence: 0.9 },
  { pattern: 'بغيت لحام', context: 'منزل', problemId: 'metalwork_needed', confidence: 0.9 },
  { pattern: 'بغيت حدّاد', context: 'منزل', problemId: 'metalwork_needed', confidence: 0.9 },
  // حلاقة/تجميل
  { pattern: 'بغيت نحسن', context: 'خدمة', problemId: 'haircut_needed', confidence: 0.85 },
  { pattern: 'بغيت حلّاق', context: 'خدمة', problemId: 'haircut_needed', confidence: 0.9 },
  { pattern: 'تقصير الشعر', context: 'خدمة', problemId: 'haircut_needed', confidence: 0.85 },
  // معلوماتيّة
  { pattern: 'الپيسي خربان', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.9 },
  { pattern: 'الحاسوب ما كيخدمش', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.9 },
  { pattern: 'الأورديناتور بلوكا', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.85 },
  { pattern: 'الكمبيوتر بطّيء', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.8 },
  { pattern: 'عندي مشكل فالحاسوب', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.85 },
  { pattern: 'pc ما خدامش', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.85 },
  // `deArabizi` يحوّل «pc» ⇒ «بك» قبل أن يصل النصُّ هنا، فالنمطُ اللاتينيُّ
  // أعلاه لا يُطابق من `understand` أبدًا. وكان يعمل **بالمصادفة** عبر
  // مطابقةٍ جزئيّةٍ على «خدامش» — أي عبر المصرف الذي سُدّ للتوّ.
  { pattern: 'بك ما خدامش', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.85 },
  { pattern: 'بغيت نفورماتي', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.8 },
  { pattern: 'خاصني تقني', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.7 },
  { pattern: 'بغيت تقني', context: 'إلكترونيات', problemId: 'computer_broken', confidence: 0.7 },
  // شبكة/إنترنت
  { pattern: 'الويفي ماخدامش', context: 'شبكة', problemId: 'network_down', confidence: 0.9 },
  { pattern: 'النت مقطوع', context: 'شبكة', problemId: 'network_down', confidence: 0.9 },
  { pattern: 'الراوتر خربان', context: 'شبكة', problemId: 'network_down', confidence: 0.9 },
  { pattern: 'الشبكة مقطوعة', context: 'شبكة', problemId: 'network_down', confidence: 0.9 },
  { pattern: 'عندي مشكل فالشبكة', context: 'شبكة', problemId: 'network_down', confidence: 0.85 },
  { pattern: 'السيرفر خربان', context: 'شبكة', problemId: 'network_down', confidence: 0.85 },
  // هواتف
  { pattern: 'التيليفون طاح', context: 'إلكترونيات', problemId: 'phone_broken', confidence: 0.9 },
  { pattern: 'الشاشة مهرّسة', context: 'إلكترونيات', problemId: 'phone_broken', confidence: 0.9 },
  { pattern: 'الطيليفون خربان', context: 'إلكترونيات', problemId: 'phone_broken', confidence: 0.85 },
  // بستنة
  { pattern: 'تقليم الأشجار', context: 'منزل', problemId: 'garden_care', confidence: 0.9 },
  { pattern: 'بغيت بستاني', context: 'منزل', problemId: 'garden_care', confidence: 0.9 },
  { pattern: 'الحديقة محتاجة', context: 'منزل', problemId: 'garden_care', confidence: 0.85 },
  // تنظيف
  { pattern: 'بغيت ننظّف الدار', context: 'منزل', problemId: 'cleaning_needed', confidence: 0.9 },
  { pattern: 'بغيت عاملة تنظيف', context: 'منزل', problemId: 'cleaning_needed', confidence: 0.9 },
  { pattern: 'تنظيف عام', context: 'منزل', problemId: 'cleaning_needed', confidence: 0.85 },
  // نقل
  { pattern: 'بغيت نقّل الأثاث', context: 'خدمة', problemId: 'moving_needed', confidence: 0.9 },
  { pattern: 'نقل الدار', context: 'خدمة', problemId: 'moving_needed', confidence: 0.9 },
  { pattern: 'نقل الموبيليا', context: 'خدمة', problemId: 'moving_needed', confidence: 0.85 },
  // دعم دراسيّ
  { pattern: 'بغيت أستاذ', context: 'تعليم', problemId: 'tutoring_needed', confidence: 0.9 },
  { pattern: 'دعم دراسي', context: 'تعليم', problemId: 'tutoring_needed', confidence: 0.9 },
  { pattern: 'تقوية فالرياضيات', context: 'تعليم', problemId: 'tutoring_needed', confidence: 0.85 },
  // صباغة سيّارات
  { pattern: 'صباغة الطوموبيل', context: 'سيّارة', problemId: 'car_paint_needed', confidence: 0.9 },
  { pattern: 'خدوش فالطوموبيل', context: 'سيّارة', problemId: 'car_paint_needed', confidence: 0.85 },
  { pattern: 'بغيت نصبغ الطوموبيل', context: 'سيّارة', problemId: 'car_paint_needed', confidence: 0.9 },
  // موازنة/جيومتري العجلات
  { pattern: 'الطوموبيل كتجبد للجيهة', context: 'سيّارة', problemId: 'wheel_alignment', confidence: 0.9 },
  { pattern: 'العجلات كترعش', context: 'سيّارة', problemId: 'wheel_alignment', confidence: 0.9 },
  { pattern: 'خاصني جيومتري', context: 'سيّارة', problemId: 'wheel_alignment', confidence: 0.9 },
  // السخّان
  { pattern: 'السخان خربان', context: 'منزل', problemId: 'water_heater_broken', confidence: 0.9 },
  { pattern: 'ما كيسخنش الما', context: 'منزل', problemId: 'water_heater_broken', confidence: 0.9 },
  { pattern: 'الشوفاج ما خدامش', context: 'منزل', problemId: 'water_heater_broken', confidence: 0.85 },
];

const norm = (s: string) => s.toLowerCase().trim();

// كلماتٌ عامّة (نيّة/رغبة/ضمائر) ليست أعراضًا — لا يجوز أن تُطلق مطابقةً جزئيّة
// وحدها، وإلّا «بغيت طبيب» يلتقط «بغيت» من «بغيت نصبغ» فيُرجع «صبّاغ» خطأً.
const GENERIC = new Set([
  'بغيت', 'باغي', 'بغا', 'بغينا', 'نبغي', 'كنبغي', 'خاصني', 'خاص', 'نحتاج', 'محتاج',
  'عندي', 'عندنا', 'ديال', 'هادشي', 'واحد', 'شوية', 'بزاف', 'دابا', 'نقلب', 'كنقلب',
  'الدار', 'دار', 'ولكن', 'صغير', 'كبير',
  // «عندي مشكل» بلا سياقٍ كان يطابق «عندي مشكل فالحاسوب» جزئيًّا فيقترح تقنيّ
  // معلوميّات بلا أيّ دليل. الشكوى المجرّدة يجب أن تبقى مجهولةً فيُسأل عنها.
  'مشكل', 'مشكلة', 'مشاكل', 'مشكيل', 'شي', 'حاجة', 'واش', 'شنو',
  // ── كلماتُ العطب ──
  //
  //   **العطبُ لا يُسمّي الحرفة — الشيءُ يُسمّيها.** «ما كيخدمش» يقولها
  //   المغربيُّ عن الثلّاجة والحاسوب والسيّارة والباب. وكانت المطابقةُ
  //   الجزئيّةُ تلتقطها من النمط «الحاسوب ما كيخدمش»، فتُقرأ
  //   «الفريجيدير ديالي ما كيخدمش» **عطلَ حاسوب** بثقة ٠٫٥٩ — ويُرسَل صاحبُ
  //   الثلّاجة إلى تقنيّ حواسيب، واثقًا.
  //
  //   وهو نفسُ مصرف الكلمة العامّة الذي هُدم في متغيّرات المفاهيم: تكفي
  //   كلمةٌ واحدةٌ في نمطٍ واحدٍ لتبتلع بابًا كاملًا من الشكاوى.
  'كيخدمش', 'خدامش', 'خدام', 'خدامة', 'خدامه', 'يخدم', 'تخدم',
  'خربان', 'خربانة', 'خرباتش', 'عطلان', 'واقف', 'واقفة', 'بلوكا', 'بطيء', 'بطيئة',
  'كيخدم', 'بقاتش', 'بقاش', 'ماشية', 'مشات',
]);

// نصّ → (مشكلة + ثقة). دقيق أوّلًا، ثمّ جزئيّ (كلمة مفتاحيّة حقيقيّة) بثقة أقلّ.
export function findProblemBySymptom(text: string): { problemId: string; confidence: number } | null {
  const t = norm(text);
  // دقيق — أطول نمط مطابق يفوز
  let best: { problemId: string; confidence: number } | null = null; let bestLen = 0;
  for (const n of SYMPTOM_GRAPH) {
    const p = norm(n.pattern);
    if (t.includes(p) && p.length > bestLen) { best = { problemId: n.problemId, confidence: n.confidence }; bestLen = p.length; }
  }
  if (best) return best;
  // جزئيّ — كلمة مفتاحيّة (>3 أحرف، وليست كلمةً عامّة) بثقة مخفّضة
  for (const n of SYMPTOM_GRAPH) {
    for (const part of n.pattern.split(' ')) {
      const w = norm(part);
      if (w.length > 3 && !GENERIC.has(w) && t.includes(w)) return { problemId: n.problemId, confidence: +(n.confidence * 0.65).toFixed(2) };
    }
  }
  return null;
}
