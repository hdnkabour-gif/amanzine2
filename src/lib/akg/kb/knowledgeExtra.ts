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
    { darija: ['واي فاي', 'الواي فاي', 'انترنت', 'الانترنت', 'كونيكسيون', 'الاشارة ضعيفة', 'الانترنت كيقطع', 'راوتر', 'مودم'], arabizi: ['wifi', 'internet', 'connexion', 'router', 'modem'], ar: ['إنترنت', 'واي فاي', 'مودم', 'راوتر', 'إشارة'], fr: ['internet', 'wifi', 'connexion', 'modem', 'routeur', 'debit'], en: ['internet', 'wifi', 'connection', 'modem', 'router', 'signal'] },
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
];
