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
];

// ── إثراءُ مفاهيم موجودة (نفس الـid المولّد) — تُوحَّد متغيّراتها بلا تكرار ──
export const ENRICH_CONCEPTS: ConceptData[] = [
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
