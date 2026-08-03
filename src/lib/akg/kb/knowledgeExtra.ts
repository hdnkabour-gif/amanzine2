// ============================================================
// AMANZINE — Knowledge Extra (توسعةٌ يدويّة مُنسَّقة). مفاهيمُ ومفرداتٌ جديدة
//   (ملابس · اتصالات/تقنية · شبكات/معلوميّات) تُدمَج مع البيانات المولّدة **بلا تكرار**:
//   إن وُجد الـid في المولّد ⇒ **تُوحَّد المتغيّرات** (إثراء)؛ وإلّا ⇒ **يُضاف مفهوم جديد**.
//   الدمج في `concepts.ts`. إضافةٌ خالصة — لا تمسّ resolveConcept/understand.
// ============================================================

import type { ConceptData } from './knowledgeData';

const C = (id: string, category: string, ar: string, darija: string, fr: string, en: string,
  v: Partial<ConceptData['variants']>, examples: string[] = []): ConceptData => ({
  id, category, concept: { ar, darija, fr, en },
  variants: { darija: v.darija || [], arabizi: v.arabizi || [], ar: v.ar || [], fr: v.fr || [], en: v.en || [] },
  examples,
});

/**
 * **مصطلحاتٌ يتنازل عنها مفهومُها.**
 *
 *   الدمجُ اتّحادٌ فقط: يُضيف ولا يحذف. فحين يُطالب مفهومٌ مولَّدٌ بمصطلحٍ
 *   عامٍّ لا يخصّه، لا سبيلَ لسحبِه — وتعديلُ `knowledgeData.ts` عبث، فهو
 *   يُولَّد من جديدٍ عند كلّ استيراد.
 *
 *   ما وقع بالقياس: `real_estate_agency` يُطالب بـ«بيع» و«شراء» — فعلان
 *   عامّان لا يخصّان السماسرة. النتيجة: **«بيع الأزياء» ⇒ سمسار عقاريّ**،
 *   وكذلك كلُّ جملةٍ فيها كلمةُ «بيع».
 *
 *   القاعدة: **الفعلُ العامُّ لا يملكه أحد.** «بيع» و«شراء» و«كراء» تصف
 *   موقفًا (stance) لا مجالًا، ويقرؤها `needEngine` من موضعٍ آخر.
 */
export const DISOWNED: Record<string, string[]> = {
  real_estate_agency: ['بيع', 'شراء'],
  // «قشاشة» في المغرب تعني المستعمَلَ تحديدًا، لا الملابسَ عامّة.
  clothing: ['قشاشة'],
};

export const EXTRA_CONCEPTS: ConceptData[] = [
  // ── ملابس (تفصيل) ──
  C('kids_clothing', 'fashion', 'ملابس الأطفال', 'حوايج الدراري', 'Vêtements enfants', 'Children clothing',
    { darija: ['حوايج الدراري', 'كسوة الدراري', 'لباس الاطفال', 'حوايج صغار'], ar: ['ملابس الأطفال', 'ملابس أطفال', 'كسوة الأطفال'], fr: ['vetements enfants', 'habits enfants'], en: ['children clothing', 'kids clothes'] },
    ['بغيت نشري حوايج للدراري', 'واش عندكم كسوة العيد للصغار؟']),
  C('mens_clothing', 'fashion', 'ملابس رجالية', 'حوايج الرجال', 'Vêtements hommes', 'Men clothing',
    { darija: ['حوايج الرجال', 'كسوة الرجال', 'لباس رجال'], ar: ['ملابس رجالية', 'ملابس الرجال'], fr: ['vetements hommes', 'habits hommes'], en: ['men clothing', 'menswear'] },
    ['فين كاين محل كسوة الرجال مزيان؟']),
  C('womens_clothing', 'fashion', 'ملابس نسائية', 'حوايج النسا', 'Vêtements femmes', 'Women clothing',
    { darija: ['حوايج النسا', 'كسوة النسا', 'لباس نساء', 'لباس النسا'], ar: ['ملابس نسائية', 'ملابس النساء'], fr: ['vetements femmes', 'habits femmes'], en: ['women clothing', 'womenswear'] },
    ['بغيت نبيع قشاشة ديال النسا']),
  C('used_clothing', 'fashion', 'ملابس مستعملة', 'قشاشة', 'Vêtements occasion', 'Second-hand clothing',
    { darija: ['قشاشة', 'حوايج مستعملة', 'لباس مستعمل', 'فريپ', 'frip'], ar: ['ملابس مستعملة', 'ملابس مستعمَلة'], fr: ['vetements occasion', 'friperie'], en: ['second hand clothes', 'used clothes'] },
    ['بغيت نشري قشاشة رخيصة']),

  // ── اتصالات / تقنية ──
  C('wifi_internet', 'electronics', 'إنترنت وواي-فاي', 'الواي فاي', 'Internet / Wi-Fi', 'Internet & Wi-Fi',
    { darija: ['واي فاي', 'الواي فاي', 'انترنت', 'الانترنت', 'انطرنيت', 'الانطرنيت', 'أنترنيت', 'انترنيت', 'كونيكسيون', 'الاشارة ضعيفة', 'الانترنت كيقطع', 'راوتر', 'مودم', 'أدسل', 'adsl'], arabizi: ['wifi', 'internet', 'connexion', 'router', 'modem'], ar: ['إنترنت', 'واي فاي', 'مودم', 'راوتر', 'إشارة'], fr: ['internet', 'wifi', 'connexion', 'modem', 'routeur', 'debit'], en: ['internet', 'wifi', 'connection', 'modem', 'router', 'signal'] },
    ['الواي فاي كيقطع', 'بغيت نركب إنترنت فالدار', 'الإشارة ضعيفة']),
  C('satellite_receiver', 'electronics', 'تركيب/إصلاح البارابول والريسيفر', 'البارابول', 'Parabole / Récepteur', 'Satellite & Receiver',
    { darija: ['بارابول', 'البارابول', 'ريسيفر', 'الريسيفر', 'ديمو', 'التلفزة ما شاعلاش', 'القنوات تقطعات', 'دمو', 'قنوات'], arabizi: ['parabole', 'recepteur', 'demo', 'satellite'], ar: ['طبق', 'مستقبل', 'ريسيفر', 'قنوات', 'إشارة تلفاز'], fr: ['parabole', 'recepteur', 'demo', 'chaines'], en: ['satellite dish', 'receiver', 'channels'] },
    ['البارابول ما جايب والو', 'بغيت نركب ريسيفر جديد', 'القنوات تقطعات']),

  // ── شبكات / معلوميّات ──
  C('network_technician', 'digital', 'تقني شبكات', 'تقني شبكات', 'Technicien réseau', 'Network technician',
    { darija: ['تقني شبكات', 'كابلاج', 'الكابلاج', 'سيرفر', 'السيرفر', 'سويتش', 'الشبكة الداخلية', 'فيبر', 'شبكة'], arabizi: ['reseau', 'cablage', 'server', 'switch', 'fibre', 'network'], ar: ['تقني شبكات', 'كابلات', 'خادم', 'موزع', 'شبكة داخلية', 'ألياف'], fr: ['technicien reseau', 'cablage', 'serveur', 'switch', 'reseau', 'fibre'], en: ['network technician', 'cabling', 'server', 'switch', 'network', 'fiber'] },
    ['بغيت تقني شبكات يركب ليا الإنترنت فالشركة', 'عندي مشكل فالسيرفر', 'بغيت نبدل الكابلاج']),
  C('it_support', 'digital', 'تقني معلوميّات', 'تقني معلوميات', 'Technicien informatique', 'IT technician',
    { darija: ['تقني معلوميات', 'معلوميات', 'انفورماتيك', 'مساعدة تقنية', 'فورماتاج', 'فيروسات', 'نظام'], arabizi: ['informatique', 'formatage', 'it', 'depannage informatique'], ar: ['تقني معلوماتية', 'معلوماتية', 'دعم تقني', 'تهيئة', 'فيروسات'], fr: ['technicien informatique', 'informatique', 'formatage', 'depannage', 'virus'], en: ['it technician', 'it support', 'formatting', 'virus removal'] },
    ['فين كاين تقني معلوميات قريب؟', 'الحاسوب مليان فيروسات']),
  C('cybersecurity', 'digital', 'أمن سيبرانيّ', 'أمان سيبراني', 'Cybersécurité', 'Cybersecurity',
    { darija: ['أمان سيبراني', 'الامن السيبراني', 'حماية', 'اختراق', 'firewall', 'جدار ناري'], arabizi: ['cybersecurite', 'securite', 'firewall', 'hack'], ar: ['أمن سيبراني', 'حماية', 'جدار ناري', 'اختراق'], fr: ['cybersecurite', 'securite', 'pare-feu', 'protection'], en: ['cybersecurity', 'firewall', 'protection', 'security'] },
    ['بغيت نأمّن الشبكة ديال الشركة']),

  // ── خدماتُ السيّارات الناقصة ──
  // من زيارةٍ ميدانيّةٍ لمحلّ غسلٍ في الدار البيضاء: صاحبُ المحلّ عدّد سبعَ
  // خدمات، ولم يفهم المحرّكُ منها إلّا اثنتين. الثلاثةُ هنا لم تكن موجودةً
  // أصلًا، فكان جوابُ «الزربية موسخة» **بائعَ سجّاد** — خطأٌ أسوأ من الصمت.
  C('carpet_cleaning', 'home', 'غسل الزرابي والسجّاد', 'غسل الزرابي', 'Nettoyage de tapis', 'Carpet cleaning',
    // الفعلُ لا المصدرَ وحده: «شي واحد يغسل ليا الزرابي» هي الصيغةُ المنطوقة،
    // و«غسل الزرابي» صيغةُ كتابةٍ. القاموسُ الذي يعرف المصدرَ فقط لا يفهم الناس.
    { darija: ['غسل الزرابي', 'غسيل الزرابي', 'تنظيف الزرابي', 'كنغسل الزرابي', 'غسل الزربية', 'الزربية موسخة', 'تنظيف السجاد', 'غسل السجاد', 'تنظيف الموكيت', 'غسل الموكيت',
      'يغسل الزرابي', 'يغسل ليا الزرابي', 'نغسل الزرابي', 'تغسل الزرابي', 'ينقي الزرابي', 'ينضف الزرابي'],
      arabizi: ['ghsel zrabi', 'nettoyage tapis'], ar: ['غسل السجاد', 'تنظيف السجاد', 'غسيل الزرابي', 'تنظيف الموكيت'],
      fr: ['nettoyage tapis', 'lavage tapis', 'nettoyage moquette'], en: ['carpet cleaning', 'rug cleaning', 'carpet washing'] },
    ['الزربية موسخة', 'بغيت شي واحد يغسل ليا الزرابي', 'عندي زرابي خاصها غسيل']),

  C('engine_cleaning', 'automotive', 'تنظيف محرّك السيّارة', 'تنظيف الموطور', 'Nettoyage moteur', 'Engine cleaning',
    { darija: ['تنظيف الموطور', 'غسل الموطور', 'تنظيف المحرك', 'غسل المحرك', 'الموطور عامر بالزيت', 'المحرك عامر بالزيت', 'نضافة الموطور'],
      arabizi: ['nettoyage moteur', 'lavage moteur'], ar: ['تنظيف المحرك', 'غسل المحرك', 'تنظيف محرك السيارة'],
      fr: ['nettoyage moteur', 'lavage moteur', 'degraissage moteur'], en: ['engine cleaning', 'engine wash', 'engine degreasing'] },
    ['المحرك عامر بالزيت', 'بغيت نغسل الموطور']),

  // «طولوري» (tôlerie) — السمكرة. المفهومُ المدمج `auto_body_paint` فيه «طولي»
  // وحدَها، وهي صيغةٌ لا ينطقها أحد. الحرفيّ نطقها «طولوري» ولم تُفهَم.
  C('car_body_repair', 'automotive', 'سمكرة السيّارات', 'طولوري', 'Tôlerie', 'Auto body repair',
    // «دريساج» (redressage) خدمةٌ يسمّيها الحرفيّ باسمها ولا تُكتب في أيّ قاموس.
    { darija: ['طولوري', 'طوليري', 'تولوري', 'طولري', 'سمكرة', 'سمكري', 'مول الطولوري', 'كنصلح الهيكل',
      'دريساج', 'ادريساج', 'الدريساج', 'تدريساج', 'كندرس', 'خدش فالبارشوك', 'بوسة فالطوموبيل', 'صدمة فالطوموبيل'],
      arabizi: ['tolerie', 'toleri', 'debosselage', 'carrosserie', 'redressage', 'dressage'], ar: ['سمكرة', 'إصلاح هيكل السيارة', 'إصلاح الصدمات', 'تقويم الصفائح'],
      fr: ['tolerie', 'carrosserie', 'debosselage', 'redressage', 'reparation carrosserie'], en: ['body repair', 'panel beating', 'dent repair'] },
    ['عندي خدش فالبارشوك', 'ضربت البارشوك بغيت طولوري', 'بغيت دريساج']),

  // الدرّاجةُ الناريّة كيانٌ مستقلّ. كانت `motorcycle_mechanic` موجودةً بلا
  // المركبة نفسِها، فـ«بغيت نشري موطور» لا تُفهَم. وهي أيضًا نصفُ الغموض في
  // «موطور» (انظر ambiguity.ts) — بلا هذا المفهوم لا معنى للسؤال أصلًا.
  C('motorcycle', 'automotive', 'درّاجة ناريّة', 'موطور', 'Moto', 'Motorcycle',
    { darija: ['موطور', 'الموطور', 'موتور', 'بيكالا', 'دراجة نارية', 'الدراجة النارية', 'سكوتر', 'تريبورتور'],
      arabizi: ['moto', 'scooter', 'bikala'], ar: ['دراجة نارية', 'درّاجة ناريّة', 'دراجات نارية'],
      fr: ['moto', 'scooter', 'motocyclette'], en: ['motorcycle', 'motorbike', 'scooter'] },
    ['بغيت نشري موطور', 'الموطور ديالي خربان']),

  // «برودويات ديال… stickage» — من جواب صاحب المحلّ. خدمةٌ ثالثةٌ لم نكن
  // نعرف اسمَها: لصقُ الأغشية على الزجاج والهيكل. كانت «ستيكاج» ⇒ لا شيء.
  C('car_wrapping', 'automotive', 'ستيكاج وتغليف السيّارات', 'ستيكاج', 'Stickage / Covering', 'Car wrapping',
    { darija: ['ستيكاج', 'سطيكاج', 'الستيكاج', 'ستيكرز', 'لصق الزجاج', 'تغليف الطوموبيل', 'كوفرينغ', 'فيلم واقي', 'تفميم', 'الفيمي'],
      arabizi: ['stickage', 'covering', 'wrapping', 'vitres teintees'], ar: ['تغليف السيارات', 'ملصقات السيارات', 'تظليل الزجاج'],
      fr: ['stickage', 'covering', 'film protecteur', 'vitres teintees'], en: ['car wrapping', 'vinyl wrap', 'window tint'] },
    ['بغيت ستيكاج للطوموبيل', 'شحال التفميم ديال الزاج؟']),

  // خدمةٌ مستقلّةٌ عند الحرفيّ: ثمنُها منفصل، ووقتُها منفصل، ويُطلَب وحدَه
  // («بغيت نغسل غير لداخل»). القِطَعُ الداخليّة ليست مفاهيم — لكنّ غسلها خدمة.
  C('car_interior_cleaning', 'automotive', 'تنظيف داخل السيّارة', 'غسل لداخل', 'Nettoyage intérieur auto', 'Car interior cleaning',
    { darija: ['غسل لداخل', 'نغسل لداخل', 'غسيل لداخل', 'تنظيف لداخل', 'نسبيري لداخل', 'سبيري لداخل',
      'غسل الكوسانات', 'نغسل الكوسانات', 'تنظيف الكوسان', 'غسل الكوسان', 'تنظيف المقاعد', 'غسل البلافون',
      'تنظيف البلافون', 'غسل الموكيط', 'تنظيف الموكيط', 'طبعة فالكوسان', 'شامبوان لداخل', 'لافاج غير لداخل'],
      arabizi: ['nettoyage interieur', 'interieur auto', 'shampoing sieges'], ar: ['تنظيف داخلي', 'غسل المقاعد', 'تنظيف السقف الداخلي'],
      fr: ['nettoyage interieur', 'shampoing sieges', 'nettoyage habitacle'], en: ['interior cleaning', 'seat shampoo', 'interior detailing'] },
    ['بغيت نغسل غير لداخل', 'عندي طبعة فالكوسان', 'بغيت نسبيري لداخل ديال الطوموبيل']),
];

// ── إثراءُ مفاهيم موجودة (نفس الـid المولّد) — تُوحَّد متغيّراتها بلا تكرار ──
export const ENRICH_CONCEPTS: ConceptData[] = [
  // ── من الزيارة الميدانيّة أيضًا ──
  // «صباغة السيارات» كانت تُحسَم لـ`car` لأنّ المفهوم يعرف «صباغة طوموبيل»
  // وحدها، فيبقى «سيارات» أطولَ مطابقةٍ موجودة. جوابٌ خاطئ لا صمت.
  C('car_painting', 'automotive', 'صباغة السيّارات', 'صباغة الطوموبيل', 'Peinture auto', 'Car painting',
    { darija: ['صباغة السيارات', 'صباغة سيارات', 'كنصبغ الطوموبيل', 'نصبغ الطوموبيل', 'نصبغ السيارة', 'صباغة الباب', 'صباغة جزء', 'صباغة كاملة', 'برييون', 'لبرييون', 'ابريون', 'البرييون'],
      ar: ['صباغة السيارات', 'طلاء السيارات', 'إعادة صباغة'],
      fr: ['peinture voiture', 'peinture carrosserie'], en: ['car paint', 'auto paint job'] },
    ['بغيت نصبغ الباب', 'شحال صباغة السيارات كاملة؟']),
  // «بغيت نلمّع الطوموبيل» كانت تُحسَم لـ`car`: المفهوم يعرف الاسم «تلميع»
  // ولا يعرف الفعل «نلمّع». والناسُ تتكلّم بالأفعال لا بالمصادر.
  C('car_polishing', 'automotive', 'تلميع السيّارات', 'بوليش', 'Polissage auto', 'Car polishing',
    { darija: ['نلمع الطوموبيل', 'نلمّع الطوموبيل', 'كنلمّع', 'بغيت نلمع', 'بوليش الطوموبيل', 'بوليساج', 'البوليساج', 'بوليساج الطوموبيل', 'تلميع سيراميك', 'إزالة الخدوش الخفيفة'],
      ar: ['تلميع السيارة', 'تلميع سيراميك'], fr: ['polissage', 'lustrage'], en: ['polishing', 'ceramic coating'] },
    ['بغيت البوليش', 'بغيت نلمّع الطوموبيل']),

  C('cctv_security_systems', 'electronics', 'كاميرات المراقبة', 'كاميرات المراقبة', 'Caméras de surveillance', 'Surveillance cameras',
    { darija: ['كاميرات', 'كاميرات المراقبة', 'كاميرا', 'مراقبة', 'رؤية ليلية', 'انذار', 'كشف الحركة', 'dvr', 'nvr'], arabizi: ['camera', 'cameras', 'surveillance', 'dvr', 'nvr'], ar: ['كاميرات مراقبة', 'رؤية ليلية', 'إنذار', 'كشف حركة'], fr: ['cameras surveillance', 'vision nocturne', 'alarme'], en: ['surveillance cameras', 'cctv', 'night vision', 'alarm'] },
    ['بغيت نركب كاميرات فالمحل', 'واش نقدر نشوف الكاميرا من الهاتف؟']),
  C('mobile_phone_repair', 'electronics', 'إصلاح الهاتف', 'إصلاح التيليفون', 'Réparation téléphone', 'Phone repair',
    { darija: ['تيليفون', 'بورطابل', 'الشاشة مهرسة', 'البطارية كتفرغ', 'ما كيشارجيش', 'الشاحن'], arabizi: ['telephone', 'portable', 'ecran', 'batterie'], ar: ['هاتف', 'جوال', 'شاشة', 'بطارية', 'شاحن'], fr: ['telephone', 'ecran casse', 'batterie'], en: ['phone screen', 'battery', 'charger'] },
    ['الشاشة مهرسة', 'البطارية كتفرغ بسرعة']),
  C('computer_repair', 'electronics', 'إصلاح الحاسوب', 'إصلاح البيسي', 'Réparation ordinateur', 'Computer repair',
    { darija: ['بيسي', 'لابتوب', 'حاسوب', 'تقيل بزاف', 'disque dur', 'قرص صلب', 'فورماتاج', 'الشاشة ما شاعلاش'], arabizi: ['pc', 'laptop', 'ordinateur', 'disque', 'formatage'], ar: ['حاسوب', 'محمول', 'قرص صلب', 'ذاكرة', 'تهيئة'], fr: ['ordinateur', 'disque dur', 'formatage', 'lent'], en: ['computer', 'hard drive', 'formatting', 'slow'] },
    ['البيسي تقيل بزاف', 'بغيت فورماتاج']),
  // ══════════════════════════════════════════════════════════════
  //  الملابس — المجالُ الأوّل الذي يبدأ به المالك.
  //
  //  قِيس قبل الكتابة: ٩ من ١٥ جملةً واقعيّةً كانت **لا تُفهَم**، وهي أعلى
  //  نسبةِ فشلٍ في المجالات الثلاثة. السببُ أنّ المفهومَ الوحيد `clothing`
  //  كان يحمل أربعَ كلماتٍ عامّة («حوايج · ملابس · لباس · قشاشة») — والناسُ
  //  لا يكتبون «ملابس»، يكتبون **اسمَ القطعة**: «جلابة»، «تراكسي»، «بلغة».
  //
  //  التقسيمُ هنا بالقطعة لا بالجنس (رجال/نساء/أطفال)، لأنّ ما يكتبه الإنسان
  //  هو القطعة، والجنسُ يُستنتَج منها أو يُسأل عنه. وهو نفسُه سببُ خطأٍ رأيناه:
  //  «بغيت نبيع تراكسي» كانت تُقرأ **وكالةَ عقار** (تراكسي ≈ «تراس»).
  // ══════════════════════════════════════════════════════════════
  C('garment_top', 'fashion', 'قمصان وتيشيرتات', 'قميجة وتيشيرت', 'Hauts / T-shirts', 'Tops & shirts',
    { darija: ['قميجة', 'قميص', 'تيشيرت', 'تي شيرت', 'مايوه', 'بولو', 'سويتشيرت', 'سويت شيرت', 'كنزة', 'تريكو'], arabizi: ['tshirt', 't-shirt', 'chemise', 'polo', 'sweat', 'pull'], ar: ['قميص', 'تيشيرت', 'كنزة', 'سترة خفيفة'], fr: ['chemise', 'tshirt', 'polo', 'pull', 'sweat'], en: ['shirt', 'tshirt', 'polo', 'sweater', 'hoodie'] },
    ['بغيت قميص أبيض', 'كنبيع تيشيرتات']),
  C('garment_bottom', 'fashion', 'سراويل', 'سروال', 'Pantalons', 'Pants',
    { darija: ['سروال', 'سراويل', 'جينز', 'دجين', 'بنطلون', 'شورط', 'شورت', 'سروال قصير', 'كارغو'], arabizi: ['pantalon', 'jean', 'jeans', 'short', 'cargo'], ar: ['سروال', 'بنطلون', 'جينز', 'شورت'], fr: ['pantalon', 'jean', 'short'], en: ['pants', 'trousers', 'jeans', 'shorts'] },
    ['بغيت سروال جينز', 'عندي سراويل للبيع']),
  C('garment_dress', 'fashion', 'فساتين وبلوزات نسائية', 'روب وبلوزة', 'Robes', 'Dresses',
    { darija: ['روب', 'فستان', 'بلوزة', 'بلايز', 'جيب', 'تنورة', 'روب سواريه'], arabizi: ['robe', 'jupe', 'blouse'], ar: ['فستان', 'بلوزة', 'تنورة', 'فستان سهرة'], fr: ['robe', 'jupe', 'blouse'], en: ['dress', 'skirt', 'blouse'] },
    ['بغيت بلوزة نسائية', 'كنبيع الروبات']),
  C('garment_outerwear', 'fashion', 'جواكت ومعاطف', 'فيست وكبوط', 'Vestes & manteaux', 'Jackets & coats',
    { darija: ['فيست', 'جاكيط', 'جاكيت', 'كبوط', 'معطف', 'بلوزون', 'كوستيم', 'بدلة', 'جيليه', 'دوديون'], arabizi: ['veste', 'manteau', 'blouson', 'costume', 'gilet', 'doudoune'], ar: ['جاكيت', 'معطف', 'بدلة', 'صديري'], fr: ['veste', 'manteau', 'costume', 'gilet'], en: ['jacket', 'coat', 'suit', 'vest'] },
    ['بغيت كوستيم للعرس', 'كنبيع الجاكيطات']),
  C('sportswear', 'fashion', 'ملابس رياضية', 'تراكسي', 'Vêtements de sport', 'Sportswear',
    { darija: ['تراكسي', 'طراكسي', 'سورفيتمو', 'جوغينغ', 'حوايج الرياضة', 'لباس رياضي', 'مايو الرياضة'], arabizi: ['tracksuit', 'survetement', 'jogging', 'sport'], ar: ['ملابس رياضية', 'بدلة رياضية'], fr: ['survetement', 'jogging', 'sport'], en: ['tracksuit', 'sportswear', 'jogging'] },
    ['بغيت نبيع تراكسي', 'كنقلب على سورفيتمو']),
  C('shoe_store', 'fashion', 'أحذية', 'صباط', 'Chaussures', 'Footwear',
    { darija: ['صباط', 'صبابط', 'بلغة', 'بابوش', 'سباردينة', 'سبرديلة', 'سندالة', 'صندالة', 'كوطي', 'بوط', 'شبشب', 'نعالة'], arabizi: ['chaussure', 'basket', 'sandale', 'botte', 'sneakers'], ar: ['حذاء', 'أحذية', 'صندل', 'بلغة', 'بابوج'], fr: ['chaussures', 'baskets', 'sandales', 'bottes'], en: ['shoes', 'sneakers', 'sandals', 'boots'] },
    ['بغيت صباط رجالي', 'بغيت نشري بابوش']),
  C('fashion_accessories', 'fashion', 'إكسسوارات الأزياء', 'كاسكيطة وصاك', 'Accessoires', 'Fashion accessories',
    { darija: ['كاسكيطة', 'شابو', 'شاش', 'حزام', 'سنطورة', 'صاك', 'ساك', 'محفظة', 'بورطفاي', 'لنيط', 'خاتم', 'سلسلة'], arabizi: ['casquette', 'ceinture', 'sac', 'portefeuille'], ar: ['قبعة', 'وشاح', 'حزام', 'حقيبة', 'محفظة'], fr: ['casquette', 'echarpe', 'ceinture', 'sac'], en: ['cap', 'scarf', 'belt', 'bag', 'wallet'] },
    ['بغيت كاسكيطة', 'كنبيع الصاكات']),
  C('traditional_clothing', 'fashion', 'اللباس التقليدي المغربي', 'جلابة وقفطان', 'Habit traditionnel', 'Traditional wear',
    { darija: ['جلابة', 'جلابه', 'الجلابة', 'قفطان', 'القفطان', 'طاكشيطة', 'تاكشيطة', 'قندورة', 'سلهام', 'برنوس', 'جابادور', 'فوقية', 'مجدول'], arabizi: ['jellaba', 'djellaba', 'caftan', 'takchita', 'gandoura', 'selham'], ar: ['جلابة', 'قفطان', 'تكشيطة', 'قندورة', 'برنس'], fr: ['djellaba', 'caftan', 'takchita', 'gandoura'], en: ['djellaba', 'caftan', 'takchita'] },
    ['بغيت طاكشيطة للعرس', 'كنبيع الجلابات']),
  C('eid_clothing', 'fashion', 'كسوة العيد', 'كسوة العيد', 'Habits de fête', 'Eid clothing',
    // «كسوة» و«الكسوة» مجرّدتَين تعنيان الملابسَ عامّةً ويملكهما `clothing`.
    // ما يخصّ العيدَ هو ما قُيِّد به وحدَه — والعيدُ **سياقٌ** يلتقطه
    // `contexts.ts` من كلمة «العيد» نفسِها لا من «كسوة».
    { darija: ['كسوة العيد', 'حوايج العيد', 'لباس العيد', 'كسوة لعيد'], ar: ['كسوة العيد', 'ملابس العيد'], fr: ['habits de fete', 'tenue aid'], en: ['eid clothes'] },
    ['عندي كسوة العيد', 'بغيت كسوة العيد للدراري']),
  C('used_clothing', 'fashion', 'سوق الملابس المستعملة', 'جوطية', 'Marché aux puces', 'Flea market',
    { darija: ['جوطية', 'الجوطية', 'جوطيه', 'سوق البالي', 'فريب', 'فريپ', 'حوايج بالية'], arabizi: ['joutia', 'friperie', 'frip'], ar: ['سوق مستعمل', 'سوق البالة'], fr: ['joutia', 'friperie', 'marche aux puces'], en: ['flea market', 'thrift'] },
    ['بغيت جوطية قريبة', 'فين كاينة الجوطية؟']),
  C('underwear_socks', 'fashion', 'ملابس داخلية وجوارب', 'سلاوي وتريكو', 'Sous-vêtements', 'Underwear & socks',
    { darija: ['تقاشر', 'سلاوي', 'ملابس داخلية', 'كيلوط', 'مايوه دياخل'], arabizi: ['chaussettes', 'sous vetement', 'slip'], ar: ['جوارب', 'ملابس داخلية'], fr: ['chaussettes', 'sous-vetements'], en: ['socks', 'underwear'] },
    ['كنبيع التقاشر']),
  C('fabric_shop', 'fashion', 'أقمشة وخياطة', 'الطوب والخياطة', 'Tissus', 'Fabric',
    { darija: ['طوب', 'الطوب', 'قماش', 'اقمشة', 'خيط', 'الخيط', 'زواق', 'سفيفة', 'عقاد'], arabizi: ['tissu', 'tissus', 'fil'], ar: ['قماش', 'أقمشة', 'خيوط'], fr: ['tissu', 'tissus', 'mercerie'], en: ['fabric', 'textile'] },
    ['بغيت طوب ديال الجلابة']),

  // ── السيّارات: ما كان ناقصًا (المجالُ الأقوى أصلًا — ٣ فجوات) ──
  C('car_service', 'automotive', 'تبديل الزيت والفلاتر', 'الفيدانج', 'Vidange', 'Oil change',
    { darija: ['فيدانج', 'الفيدانج', 'تبديل الزيت', 'نبدل الزيت', 'الزيت', 'فيلطر', 'فلتر الزيت'], arabizi: ['vidange', 'huile', 'filtre'], ar: ['تغيير الزيت', 'زيت المحرك', 'فلتر'], fr: ['vidange', 'huile moteur', 'filtre'], en: ['oil change', 'engine oil', 'filter'] },
    ['بغيت نبدل الزيت', 'وقت الفيدانج']),
  C('tire_shop', 'automotive', 'العجلات والبنيوات', 'البنيو', 'Pneus', 'Tires',
    { darija: ['بنيو', 'بنوات', 'البنيو', 'عجلة', 'عجلات', 'كوطشو', 'تجويف', 'إيكيليبراج'], arabizi: ['pneu', 'pneus', 'roue', 'equilibrage'], ar: ['إطار', 'إطارات', 'عجلة', 'ترصيص'], fr: ['pneu', 'pneus', 'roue', 'equilibrage'], en: ['tire', 'tyres', 'wheel', 'balancing'] },
    ['بغيت نشري بنيو', 'البنيو مثقوب']),
  C('car_diagnostics', 'automotive', 'الفحص الإلكتروني للسيارة', 'الديانيوستيك', 'Diagnostic auto', 'Car diagnostic',
    // «ديagnostic» كان خطأً مطبعيًّا: `normArabic` تحذف اللاتينيّةَ فيبقى «دي» —
    // مصطلحٌ من حرفين يوجد داخل «كنـدي‍ر» و«ديال» و«جديد»، فيبتلع كلَّ جملةٍ
    // فيها أيٌّ منها. و«سكانير» ماسحُ مستنداتٍ قبل أن يكون جهازَ فحصِ سيّارات.
    { darija: ['ديانيوستيك', 'فحص إلكتروني', 'الفحص ديال الطوموبيل', 'فاليز الفحص'], arabizi: ['diagnostic', 'diag', 'scanner', 'valise'], ar: ['فحص إلكتروني', 'تشخيص العطب'], fr: ['diagnostic', 'valise diagnostic'], en: ['car diagnostic', 'obd scan'] },
    ['بغيت ديانيوستيك', 'ضو المحرك شعل']),

  // ── المعلوميّات: ما كان ناقصًا (٤ فجوات) ──
  C('it_support', 'electronics', 'تركيب نظام التشغيل', 'تركيب ويندوز', 'Installation système', 'OS install',
    { darija: ['نركب ويندوز', 'ويندوز', 'تنصيب النظام', 'نصبت النظام', 'لينكس', 'اوفيس'], arabizi: ['windows install', 'linux', 'office'], ar: ['نظام تشغيل', 'ويندوز'], fr: ['installation systeme', 'windows'], en: ['windows install', 'os install'] },
    ['بغيت نركب ويندوز', 'بغيت فورماتاج للبيسي']),
  C('web_development', 'electronics', 'تصميم المواقع والتطبيقات', 'صناعة المواقع', 'Création de sites', 'Web development',
    { darija: ['موقع', 'ديري ليا موقع', 'يدير ليا موقع', 'ويب سايت', 'تطبيق', 'ابليكاسيون', 'متجر إلكتروني', 'سايت'], arabizi: ['site', 'website', 'web', 'application', 'app'], ar: ['موقع إلكتروني', 'تطبيق', 'متجر إلكتروني', 'برمجة'], fr: ['site web', 'application', 'developpement'], en: ['website', 'web app', 'development'] },
    ['بغيت واحد يدير ليا موقع', 'بغيت تطبيق لمحلّي']),
  C('computer_repair', 'electronics', 'أقراص وذاكرة', 'ديسك دور وفلاشة', 'Stockage', 'Storage hardware',
    { darija: ['ديسك دور', 'ديسك', 'قرص صلب', 'فلاشة', 'كارط ميموار', 'رام', 'ذاكرة', 'اس اس دي'], arabizi: ['disque dur', 'ssd', 'flash', 'ram', 'carte memoire'], ar: ['قرص صلب', 'ذاكرة', 'فلاشة'], fr: ['disque dur', 'ssd', 'ram', 'cle usb'], en: ['hard drive', 'ssd', 'ram', 'usb'] },
    ['بغيت ديسك دور', 'بغيت نزيد رام']),
  // ══════════════════════════════════════════════════════════════
  // مجالُ الملابس — المجالُ الأوّل للمالك.
  //
  //   قِيس قبل هذه الدفعة: ١١٣ مصطلحًا يستعملها المغاربةُ في البيع والشراء،
  //   يفهم منها المحرّكُ ٣٩ ويوجّهها صحيحًا. الباقي: ٦١ لا تُفهَم إطلاقًا،
  //   و١٣ تُفهَم وتذهب لغير مكانها.
  //
  //   القاعدةُ التي أُلزِمُ بها نفسي هنا بعد خطأٍ سابق: **لا مُعرِّفَ جديدٌ
  //   لمعنًى موجود.** كلُّ ما تحته إثراءٌ لمفهومٍ قائم — «هودي» تذهب إلى
  //   `garment_top` لا إلى مفهومٍ جديدٍ اسمُه `hoodie`. المفاهيمُ الجديدةُ
  //   الوحيدةُ هي ما لا مقابلَ له: الحجابُ والبيجامة.
  // ══════════════════════════════════════════════════════════════

  // المتجرُ العامّ. «حوايج» و«كسوة» و«لبسة» — أكثرُ ما يُكتب في المغرب.
  C('clothing', 'fashion', 'ملابس', 'حوايج', 'Vêtements', 'Clothing',
    // «كسوة» مجرّدةً تعني الملابسَ عامّةً — والعيدُ **سياقٌ** يلتقطه
    // `contexts.ts` من كلمة «العيد» نفسِها، لا معنًى مخبوءٌ في «كسوة».
    // «قشاشة» يملكها `used_clothing`.
    { darija: ['حوايج', 'حويج', 'حويجات', 'كسوة', 'الكسوة', 'لبسة', 'اللبسة', 'لباس', 'اللباس',
      'حوايج ديال البيع', 'كنبيع الحوايج', 'كنبيع الكسوة', 'عندي كسوة', 'عندي حوايج',
      'لبسة الدار', 'لبسة الخروج', 'لبسة الخدمة', 'تصبينة',
      // **تغطيةُ النيّة لا المرادف**: خمسُ جملٍ مختلفةٍ تمامًا تقول شيئًا
      // واحدًا — «عندي محلّ ملابس». قياسُ المرادفات وحدَه كان يقول إنّ
      // «ملابس» مغطّاة، و«بوتيك» و«حانوت ديال الحوايج» لا تُفهَمان أصلًا.
      'بوتيك', 'البوتيك', 'حانوت ديال الحوايج', 'حانوت ديال الملابس',
      'محل ديال الحوايج', 'محل حوايج', 'عندي محل حوايج', 'مغازة ديال الحوايج'],
      arabizi: ['hwayj', 'kiswa', 'lebsa', 'libas', 'sapes'],
      ar: ['ملابس', 'ثياب', 'أزياء', 'ألبسة', 'موضة', 'مستلزمات الملابس', 'بيع الملابس', 'بيع الأزياء'],
      fr: ['vetement', 'vetements', 'habit', 'habits', 'mode', 'pret a porter', 'pret-a-porter', 'tenue',
        'boutique', 'magasin de vetements', 'pret a porter femme'],
      en: ['clothes', 'clothing', 'fashion', 'garment', 'apparel', 'outfit', 'wear', 'ready to wear',
        'boutique', 'clothing store', 'clothes shop'] },
    ['عندي كسوة للبيع', 'كنبيع الحوايج', 'بغيت نبيع اللباس']),

  // رجال — كانت «رجالي» و«ديال الرجال» لا تُفهَم.
  C('mens_clothing', 'fashion', 'ملابس رجالية', 'حوايج ديال الرجال', 'Vêtements homme', 'Menswear',
    // «ديال الرجال» مجرّدةً خرجت إلى `contexts.ts`: وصفٌ لا موصوف. بقاؤها
    // هنا كان يجعلها تغلب «صباط» في «صباط ديال الرجال» فيضيع الحذاء.
    { darija: ['حوايج ديال الرجال', 'كسوة ديال الرجال', 'حوايج رجالية'],
      arabizi: ['rjal'],
      ar: ['ملابس رجالية', 'ملابس للرجال', 'أزياء رجالية'],
      fr: ['vetement homme', 'vetements homme', 'mode homme'],
      en: ['menswear', 'mens clothing', 'men clothing'] },
    ['عندي حوايج ديال الرجال', 'كنبيع ملابس رجالية']),

  // نساء — «حريمي» و«ديال العيالات» أكثرُ ما يُقال في السوق.
  C('womens_clothing', 'fashion', 'ملابس نسائية', 'حوايج ديال العيالات', 'Vêtements femme', 'Womenswear',
    { darija: ['حوايج ديال العيالات', 'حوايج نسائية', 'كسوة ديال العيالات'],
      arabizi: ['nssa', '3yalat'],
      ar: ['ملابس نسائية', 'سيدات', 'أزياء نسائية'],
      fr: ['vetement femme', 'vetements femme', 'mode femme'],
      en: ['womenswear', 'womens clothing'] },
    ['عندي حوايج ديال العيالات', 'كنبيع ملابس نسائية']),

  // أطفال — «دراري» أكثرُ ما يُقال، ولم تكن تُفهَم.
  C('kids_clothing', 'fashion', 'ملابس الأطفال', 'حوايج ديال الدراري', 'Vêtements enfant', 'Kids clothing',
    { darija: ['حوايج ديال الدراري', 'دراري', 'الدراري', 'كسوة ديال الدراري', 'حوايج الصغار'],
      arabizi: ['drari'],
      ar: ['ملابس أطفال', 'ملابس الأطفال', 'ملابس صغار'],
      fr: ['vetement enfant', 'vetements enfant', 'mode enfant'],
      en: ['kids clothing', 'children clothing', 'toddler'] },
    ['عندي حوايج ديال الدراري', 'كنبيع ملابس أطفال']),

  // رُضّع — «بيبي» و«مواليد» غيرُ مفهومتين.
  C('baby_clothing', 'fashion', 'ملابس رضّع', 'حوايج ديال البيبي', 'Vêtements bébé', 'Baby clothing'
    , { darija: ['حوايج ديال البيبي', 'بيبي', 'البيبي', 'حوايج المواليد'],
      arabizi: ['mawalid'],
      ar: ['ملابس رضع', 'ملابس المواليد', 'رضيع', 'مواليد', 'حديث الولادة', 'ملابس حديثي الولادة'],
      fr: ['vetement bebe', 'nouveau ne', 'nouveau-ne', 'layette'],
      en: ['baby clothing', 'infant'] },
    ['عندي حوايج ديال البيبي', 'كنبيع ملابس مواليد']),

  // فوقيّات: قميص · تيشيرت · هودي · سويت — كلُّها قطعةٌ تُلبَس فوق.
  C('garment_top', 'fashion', 'قمصان وتيشيرتات', 'شوميز وتيشورت', 'Hauts', 'Tops',
    { darija: ['شوميز', 'الشوميز', 'تيشورت', 'التيشورت', 'مايوه', 'هودي', 'الهودي', 'سويت', 'السويت', 'سويتر', 'كسويطة'],
      arabizi: ['chemise', 'tshirt', 't-shirt', 'hoodie', 'sweat', 'pull', 'polo'],
      ar: ['قميص', 'قميص رسمي', 'قميص كلاسيكي', 'تيشيرت', 'تي شيرت', 'بولو', 'كنزة', 'سترة صوفية'],
      fr: ['chemise', 't-shirt', 'tee shirt', 'polo', 'pull', 'sweat', 'sweatshirt', 'haut'],
      en: ['shirt', 't-shirt', 'tee', 'polo', 'hoodie', 'sweater', 'sweatshirt', 'top'] },
    ['عندي تيشورت للبيع', 'كنبيع الشوميز']),

  // تحتيّات: سروال · بنطلون · جينز.
  C('garment_bottom', 'fashion', 'سراويل', 'سروال وجينز', 'Bas', 'Bottoms',
    { darija: ['سروال', 'السروال', 'سراول', 'جين', 'الجين', 'سروال جين', 'شورط', 'الشورط', 'بيرمودا'],
      arabizi: ['pantalon', 'jean', 'jeans', 'short', 'sarwal'],
      ar: ['سروال', 'بنطلون', 'جينز', 'دينيم', 'شورت'],
      fr: ['pantalon', 'jean', 'jeans', 'denim', 'short', 'bermuda'],
      en: ['pants', 'trousers', 'jeans', 'denim', 'shorts'] },
    ['عندي سروال جين للبيع', 'كنبيع البنطلونات']),

  // جواكت ومعاطف — «بالطو» و«سترة» غيرُ مفهومتين.
  C('garment_outerwear', 'fashion', 'جواكت ومعاطف', 'جاكيط وبالطو', 'Vestes et manteaux', 'Outerwear',
    { darija: ['جاكيط', 'الجاكيط', 'بالطو', 'البالطو', 'كبّوط', 'دوديون', 'بلوزون', 'كوبّة'],
      arabizi: ['veste', 'manteau', 'baltou', 'blouson', 'doudoune'],
      ar: ['جاكيت', 'سترة', 'معطف', 'بالطو', 'جاكيت جلد', 'معطف شتوي'],
      fr: ['veste', 'manteau', 'blouson', 'doudoune', 'parka', 'trench'],
      en: ['jacket', 'coat', 'blazer', 'parka', 'puffer', 'outerwear'] },
    ['عندي بالطو للبيع', 'كنبيع الجواكت']),

  // اللباس التقليديّ — «جلابية» و«عباية» كانتا غائبتين.
  C('traditional_clothing', 'fashion', 'اللباس التقليدي المغربي', 'جلابة وقفطان', 'Tenue traditionnelle', 'Traditional wear',
    { darija: ['جلابة', 'الجلابة', 'جلابية', 'جلاليب', 'قفطان', 'القفطان', 'تكشيطة', 'التكشيطة',
      'عباية', 'العباية', 'قندورة', 'سلهام', 'برنوس', 'منصورية', 'فوقية', 'لباس تقليدي'],
      arabizi: ['jellaba', 'djellaba', 'caftan', 'kaftan', 'takchita', 'abaya', 'gandoura', 'selham'],
      ar: ['جلابة', 'جلابية', 'قفطان', 'تكشيطة', 'عباية', 'قندورة', 'سلهام', 'اللباس التقليدي', 'زي تقليدي'],
      fr: ['djellaba', 'jellaba', 'caftan', 'takchita', 'abaya', 'gandoura', 'tenue traditionnelle'],
      en: ['djellaba', 'caftan', 'kaftan', 'takchita', 'abaya', 'traditional dress'] },
    ['عندي قفطان للبيع', 'كنبيع الجلابات']),

  // فساتين — «روب» تُقال أكثرَ من «فستان».
  C('garment_dress', 'fashion', 'فساتين وبلوزات نسائية', 'روب وفستان', 'Robes', 'Dresses',
    { darija: ['روب', 'الروب', 'فستان', 'الفستان', 'روب ديال العرس', 'روب ديال السواريه'],
      arabizi: ['robe', 'dress', 'fostan'],
      ar: ['فستان', 'فساتين', 'فستان سهرة', 'فستان زفاف', 'فستان مناسبات'],
      fr: ['robe', 'robe de soiree', 'robe de mariee'],
      en: ['dress', 'gown', 'evening dress', 'wedding dress'] },
    ['عندي روب ديال العرس', 'كنبيع الفساتين']),

  // رياضيّ — «ترينينغ» و«سبور» غيرُ مفهومتين.
  C('sportswear', 'fashion', 'ملابس رياضية', 'تراكسي', 'Survêtement', 'Sportswear',
    { darija: ['تراكسي', 'التراكسي', 'ترينينغ', 'الترينينغ', 'سبور', 'سپور', 'بدلة رياضية', 'جوغينغ', 'ليكرا ديال الرياضة'],
      arabizi: ['tracksuit', 'training', 'survetement', 'sport', 'jogging'],
      ar: ['ملابس رياضية', 'بدلة رياضية', 'ملابس السبور', 'زي رياضي'],
      fr: ['survetement', 'training', 'jogging', 'tenue de sport', 'sportswear'],
      en: ['tracksuit', 'sportswear', 'training suit', 'activewear', 'gym wear'] },
    ['عندي تراكسي للبيع', 'كنبيع ملابس السبور']),

  // كسوةُ العيد — مناسبةٌ لها موسمُها وسعرُها، وهي بابُ المالك الأوّل.
  C('eid_clothing', 'fashion', 'كسوة العيد', 'كسوة العيد', 'Tenue de l’Aïd', 'Eid outfit',
    // «كسوة» مجرّدةً يملكها `clothing`. هذا المفهومُ يملك ما قُيِّد بالعيد
    // وحدَه — وإلّا صار كلُّ من قال «كسوة» بائعَ عيد.
    { darija: ['كسوة العيد', 'لبسة العيد', 'كسوة ديال العيد', 'حوايج العيد', 'لبسة ديال العيد', 'حويج العيد'],
      arabizi: ['kiswat l3id', 'tenue aid', 'eid outfit'],
      ar: ['ملابس العيد', 'كسوة العيد', 'لباس العيد', 'ملابس عيد الفطر', 'ملابس عيد الأضحى'],
      fr: ['tenue aid', 'habits aid', 'vetement aid'],
      en: ['eid outfit', 'eid clothes', 'festive outfit'] },
    ['عندي كسوة العيد للبيع', 'كنبيع حوايج العيد ديال الدراري']),

  // المستعمَل — «بالة» و«فريب» سوقٌ ضخمٌ في المغرب.
  C('used_clothing', 'fashion', 'سوق الملابس المستعملة', 'بالة', 'Friperie', 'Second-hand clothes',
    { darija: ['بالة', 'البالة', 'فريب', 'الفريب', 'حوايج مستعملة', 'حوايج قديمة', 'جوطية ديال الحوايج'],
      arabizi: ['bala', 'friperie', 'frip', 'joutia'],
      ar: ['ملابس مستعملة', 'ملابس قديمة', 'سوق الملابس المستعملة'],
      fr: ['friperie', 'vetements occasion', 'seconde main'],
      en: ['second hand clothes', 'thrift', 'used clothing'] },
    ['كنبيع البالة', 'عندي حوايج مستعملة']),

  // الأقمشة والخياطة — «تسوارت» و«خيّاطة».
  C('fabric_shop', 'fashion', 'أقمشة وخياطة', 'طوب وخياطة', 'Tissus et couture', 'Fabric and tailoring',
    // «خياطة» و«couture» يملكهما `tailor` — مهنةٌ لا سلعة. من يبحث عن خيّاطٍ
    // يريد إنسانًا يخيط له، لا محلًّا يبيع القماش.
    { darija: ['طوب', 'الطوب', 'تسوارت', 'صوف', 'حرير', 'كتان', 'مخمل', 'ساتان'],
      arabizi: ['tissu', 'tissus', 'fabric'],
      ar: ['أقمشة', 'قماش', 'تفصيل', 'قطن', 'كتان', 'حرير', 'صوف', 'مخمل', 'شيفون'],
      fr: ['tissu', 'tissus', 'mercerie', 'coton', 'lin', 'soie', 'laine'],
      en: ['fabric', 'textile', 'cloth', 'tailoring', 'cotton', 'linen', 'silk', 'wool'] },
    ['كنبيع الطوب', 'عندي أقمشة للبيع']),

  // ── مفهومان جديدان: لا مقابلَ لهما في القاعدة ────────────────
  // القاعدةُ التي أُلزِمُ بها نفسي: لا مُعرِّفَ جديدٌ لمعنًى موجود. هذان
  // وحدَهما لم يجدا مالكًا — والحجابُ سوقٌ قائمٌ بذاته في المغرب.

  // ملابسُ محتشمة: الحجابُ والخمارُ لم يكونا مفهومَين أصلًا.
  C('modest_wear', 'fashion', 'ملابس محتشمة وحجاب', 'حجاب', 'Voile et mode modeste', 'Modest wear',
    { darija: ['حجاب', 'الحجاب', 'خمار', 'الخمار', 'سبنية', 'إيشارب', 'طرحة', 'بوني', 'حوايج محتشمة'],
      arabizi: ['hijab', 'khimar', 'voile', 'foulard', 'sebnia'],
      ar: ['حجاب', 'خمار', 'إيشارب', 'طرحة', 'ملابس محتشمة', 'أزياء محتشمة', 'غطاء رأس'],
      fr: ['voile', 'hijab', 'foulard', 'khimar', 'mode modeste'],
      en: ['hijab', 'khimar', 'headscarf', 'veil', 'modest wear', 'modest fashion'] },
    ['كنبيع الحجاب', 'عندي خمارات للبيع']),

  // ملابسُ النوم: «بيجامة» كانت غيرَ مفهومة.
  C('sleepwear', 'fashion', 'ملابس النوم', 'بيجامة', 'Pyjamas', 'Sleepwear',
    { darija: ['بيجامة', 'البيجامة', 'بيجاما', 'حوايج النعاس', 'لبسة النعاس', 'روب دو شامبر'],
      arabizi: ['pyjama', 'pijama', 'bijama'],
      ar: ['بيجامة', 'ملابس النوم', 'قميص نوم', 'روب منزلي'],
      fr: ['pyjama', 'pyjamas', 'chemise de nuit', 'robe de chambre'],
      en: ['pyjamas', 'pajamas', 'sleepwear', 'nightgown', 'nightwear'] },
    ['عندي بيجامات للبيع', 'كنبيع حوايج النعاس']),

];

