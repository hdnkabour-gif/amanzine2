// ============================================================
// AMANZINE — Knowledge Layer (فهمٌ مغربيّ متعدّد اللغات). يبني فوق البيانات
//   المولّدة (knowledgeData) طبقةَ **تطبيعٍ** ومطابقةٍ تفهم المستخدم مهما كتب:
//   دارجة · عربيّة · فرنسيّة · إنجليزيّة · Arabizi. إضافةٌ خالصة — لا تمسّ
//   understand()/needEngine (تُستدعى منهما كإشارةٍ إضافيّة، وتحترم الـ Freeze).
//
//   resolveConcept('bghit mecanicien f casa') → { id:'mechanic', category:'automotive', language:'darija' }
//   resolveCity('bghit sbak f casa')          → { city:'الدار البيضاء' }
// ============================================================

import { CITIES, type ConceptData } from './knowledgeData';
import { CONCEPTS } from './concepts';
import { deArabizi } from './arabizi';
import { normArabic, normLatin } from '../../normalize';
import { resolvePlace } from './places';
import { isContainerWithContents, resolveMerchandise } from './merchandise';

// التطبيعُ من `lib/normalize.ts` — مصدرٌ واحدٌ للمشروع كلِّه. كان هنا نسخةٌ
// كاملة، وكانت أحدَ عشرَ ملفًّا آخرَ تحمل نسخًا **أضعفَ منها** بصمت.


// ── إثراءُ متغيّرات (لتغطية صياغاتٍ شائعة لم يوفّرها الملف حرفيًّا) ──
// كلماتٌ يقولها المغاربةُ ولا يحملها الملفُّ المولَّد. تُضاف هنا لا في
// `knowledgeData.ts` — ذاك مولَّدٌ، وتعديلُه يُمحى عند إعادة التوليد.
const AUGMENT: Record<string, Partial<Record<string, string[]>>> = {
  // «صالون» وحدَها: صالونُ حلاقةٍ أو تجميل. وهي أشيعُ من «محل حلاقة».
  women_s_hair_salon: { darija: ['صالون', 'صالون حلاقه', 'صالون ديال الحلاقه'] },
  // «حرايفي» جمعُ «حرفيّ» بالدارجة. كتبتُها أوّلًا تحت `handyman` — وهو
  // مُعرِّفٌ **لا وجود له**، فأسقطها `AUGMENT` بصمتٍ تامّ. ولذلك حارسٌ في
  // `knowledge-health` يمنع الآن مفتاحًا لا يقابله مفهوم.
  artisanat_et_m_tiers_manuels: { darija: ['حرايفي', 'الحرايفيه', 'صنايعي', 'حرفي'] },
  // ── **العقارُ كان كراءً وحدَه** ──────────────────────────────
  //   قِيس: «بغيت نكري دار» ⇒ عقار ✓، و«بغيت **نشري** دار» ⇒ لا شيء ⇒
  //   `BUY_PRODUCT` ⇒ «شنو محتاج بالضبط؟». وقد قال بالضبط: يريد دارًا.
  //   و«بغيت نبيع دار ديالي» ⇒ `SELL_PRODUCT` ⇒ **«أيّ منتوج؟»** — الدارُ
  //   صارت سلعةً في كتالوج، وصاحبُها يُسأل عن منتوج.
  //
  //   والسببُ أنّ «بيع» و«شراء» **متنازَعٌ عنهما** في `DISOWNED` — وذاك
  //   صوابٌ لا يُنقَض: فعلٌ عامٌّ لا يملكه أحد، وإلّا صار «بيع الأزياء»
  //   سمسارًا. فالعلاجُ **مركَّبٌ لا مفرد**: «نشري دار» تخصُّ العقارَ،
  //   و«نشري» وحدَها لا تخصُّ أحدًا. وبهذا تبقى «رجعت لدار» بلا مجال — وهي
  //   بيتُ الرجل لا صفقة.
  real_estate_agency: { darija: [
    'دار للكرا', 'دار للكراء', 'نكري دار', 'نكريها', 'دار ديال الكراء',
    'دار للبيع', 'شقه للبيع', 'شقة للبيع', 'محل للكراء', 'محل للكرا', 'محل للبيع',
    'نشري دار', 'نشري شقه', 'نشري شقة', 'نبيع دار', 'نبيع شقه', 'نبيع شقة',
    'دار ديال البيع', 'شراء دار', 'بيع دار', 'نقلب على دار', 'نقلب على شقه',
  ] },
  // **حرفٌ واحدٌ يفصل بين مطعمٍ ولا شيء.** «سندويتش» معروفةٌ و«سندويش» لا،
  //   والثانيةُ أشيعُ في الكتابة المغربيّة. فـ«مكرهتش شي سندويش طون بالحرور»
  //   ⇒ «ما فهمتش مزيان»، بينما «مكرهتش شي قهوة» تعمل. والعطبُ إملائيٌّ لا
  //   في الفهم: الاشتهاءُ مقروءٌ والمشتهى مجهول.
  restaurant:  { darija: ['سندويش', 'سندويشات', 'سندويش ديال', 'كسكروط'] },
  barber:      { fr: ['coiffeur'], en: ['hairdresser', 'haircut'] },
  plumber:     { darija: ['سباك'], en: ['plumber'] },
  mechanic:    { fr: ['mecanicien', 'mecano'], darija: ['ميكانيكي'] },
  car_wash:    { darija: ['غسل الطوموبيل', 'نغسل الطوموبيل'] },
  electrician: { darija: ['كهربائي'] },
};

// ── فهارس المطابقة: عربيّ (ar+darija) ولاتينيّ (fr+en+arabizi) ──
// كان هذا `{ id, category, concept }` فقط — فتُرمى عند الباب `services`
// (مملوءةٌ في ١٤٨ مفهومًا بمعرفةٍ مغربيّةٍ حقيقيّة) و`fields` و`examples`.
// النتيجة: قاعدةُ المعرفة تعرف أنّ السبّاكَ يفتح المجاري ويركّب السخانات،
// والتطبيقُ يسأله «التخصّصات» في خانةِ نصٍّ حرٍّ فارغة.
interface Match {
  id: string; category: string; concept: Record<string, string>;
  services?: string[]; fields?: string[]; examples?: string[];
}
const stripAl = (t: string) => t.replace(/^ال/, '');
const toks = (s: string) => s.split(/\s+/).map(stripAl).filter(t => t.length >= 2);

// حارسُ المتغيّرات: المتغيّرُ **اسمٌ للمفهوم**، لا كلمةٌ تُصادَف في أيّ جملة.
// كانت «بيع» و«شراء» متغيّرَين لوكالةٍ عقاريّة، و«واش كاين» متغيّرًا لمطعم —
// وهي كلماتٌ يقولها كلُّ الناس عن كلّ شيء. فكانت «كنبيع كسيوات ديال الدراري»
// تُفهَم **سمسارًا عقاريًّا**، و«واش كاين التوصيل» تُفهَم **مطعمًا**.
//
// والمصرفُ أسوأُ من الصمت: الصامتُ يُسأل فيُصحَّح، والمخطئُ يُرسِل الإنسانَ
// إلى مكانٍ آخر وهو واثق. ولأنّ الفهرس يفوز فيه الأطول، تكفي كلمةٌ عامّةٌ
// واحدةٌ في مفهومٍ واحدٍ لتبتلع بابًا كاملًا من الكلام.
//
// الحارسُ يُسقطها عند بناء الفهرس — للمدمَج وللمُضاف من الواجهة معًا، لأنّ
// الأدمن قد يكتب «بيع» متغيّرًا بحسن نيّة فيعيد العطبَ من الباب الخلفيّ.
const VARIANT_STOP = new Set([
  // أدواتُ استفهامٍ وإشارة
  'واش', 'كاين', 'كاينه', 'كاينين', 'فين', 'وين', 'شكون', 'شحال', 'بشحال',
  'علاش', 'امتا', 'فوقاش', 'كيفاش', 'شنو', 'اشنو', 'هاد', 'هادي', 'هادو',
  // أفعالُ طلبٍ وملكيّة
  'بغيت', 'باغي', 'بغا', 'خاصني', 'محتاج', 'عندي', 'عندك', 'عندنا', 'عندكم',
  // أفعالُ تجارةٍ عامّة — تصف الفعل لا نوعَ الشيء (القاعدة ①)
  'بيع', 'شراء', 'شرا', 'نبيع', 'كنبيع', 'يبيع', 'باع', 'نشري', 'كنشري',
  // ضمائرُ وحروفٌ وكلماتٌ حاملة
  'انا', 'احنا', 'نتا', 'نتي', 'ديال', 'ليا', 'ليك', 'شي', 'واحد',
  'من', 'في', 'على', 'مع', 'طلب', 'خدمه', 'محل', 'مول',
]);
// المتغيّرُ زائفٌ إن كانت **كلُّ** كلماته من القائمة. «مول الورد» تنجو لأنّ
// «الورد» ليست منها — الحاملُ وحدَه هو الزائف، لا الحاملُ مع المحمول.
function isJunkVariant(normalized: string): boolean {
  const words = normalized.split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  return words.every(w => VARIANT_STOP.has(w) || VARIANT_STOP.has(stripAl(w)));
}
const arIndex: { term: string; tokens: string[]; c: Match }[] = [];
const latIndex: { term: string; c: Match }[] = [];

for (const c of CONCEPTS) {
  const m: Match = {
    id: c.id, category: c.category, concept: c.concept,
    services: c.services, fields: c.fields, examples: c.examples,
  };
  const aug = AUGMENT[c.id] || {};
  for (const t of [...(c.variants.ar || []), ...(c.variants.darija || []), ...(aug.ar || []), ...(aug.darija || [])]) {
    const n = normArabic(t); if (n.length >= 2 && !isJunkVariant(n)) arIndex.push({ term: n, tokens: toks(n), c: m });
  }
  for (const t of [...(c.variants.fr || []), ...(c.variants.en || []), ...(c.variants.arabizi || []), ...(aug.fr || []), ...(aug.en || []), ...(aug.arabizi || [])]) {
    const n = normLatin(t); if (n.length >= 2) latIndex.push({ term: n, c: m });
  }
}
// المصطلحُ الأطول أخصُّ ⇒ يُفحَص أوّلًا (longest-match-wins).
arIndex.sort((a, b) => b.term.length - a.term.length);
latIndex.sort((a, b) => b.term.length - a.term.length);

// مفاهيمُ وقتِ التشغيل: ما يضيفه الأدمن من الواجهة يُحفَظ في القاعدة، ولو بقي
// هناك لما أثّر في الفهم أبدًا (الفهارس تُبنى عند تحميل الوحدة). هذه الدالّة
// تُدخِله في نفس الفهرسين ثمّ تُعيد الفرز، فيعمل فورًا بلا إعادة نشر.
export function registerRuntimeConcepts(list: ConceptData[]): number {
  let added = 0;
  for (const c of list || []) {
    if (!c?.id || !c.variants) continue;
    const m: Match = {
      id: c.id, category: c.category, concept: c.concept || {},
      services: c.services, fields: c.fields, examples: c.examples,
    };
    for (const t of [...(c.variants.ar || []), ...(c.variants.darija || [])]) {
      const n = normArabic(t); if (n.length >= 2 && !isJunkVariant(n)) { arIndex.push({ term: n, tokens: toks(n), c: m }); added++; }
    }
    for (const t of [...(c.variants.fr || []), ...(c.variants.en || []), ...(c.variants.arabizi || [])]) {
      const n = normLatin(t); if (n.length >= 2) { latIndex.push({ term: n, c: m }); added++; }
    }
  }
  if (added) {
    arIndex.sort((a, b) => b.term.length - a.term.length);
    latIndex.sort((a, b) => b.term.length - a.term.length);
  }
  return added;
}
// الأطول أوّلًا (أدقّ مطابقة)
arIndex.sort((a, b) => b.term.length - a.term.length);
latIndex.sort((a, b) => b.term.length - a.term.length);
// فهرسٌ فرعيّ للمطابقة بالكلمات (متعدّد الكلمات فقط، الأكثر كلماتٍ أوّلًا = الأخصّ)
const arTokenIndex = arIndex.filter(e => e.tokens.length >= 2).sort((a, b) => b.tokens.length - a.tokens.length);

export type UnderLangDetect = 'darija' | 'ar' | 'fr' | 'en' | 'mixed';
export interface ConceptResolution {
  id: string; category: string; concept: Record<string, string>; language: UnderLangDetect;
  /** ما يفعله هذا المفهوم — يُغذّي سؤالَ «شنو كتخدم؟» بخياراتٍ حقيقيّة. */
  services?: string[];
  /** لبناتُ المعلومة التي تخصّه (Knowledge Blocks). */
  fields?: string[];
  examples?: string[];
  /**
   * **الدليل**: أيُّ مصطلحٍ طابق، وبأيّ طريق. بدونه يبقى الفهمُ صندوقًا
   * أسودَ: نعرف أنّ «تراكسي» صارت `sportswear` ولا نعرف لماذا — فلا نستطيع
   * تصحيحَ خطأٍ ولا شرحَ قرارٍ للتاجر.
   */
  matched?: { term: string; via: 'composite' | 'exact' | 'latin' | 'tokens' | 'container' };
}

// قواعد تركيبيّة: مجموعاتٌ يجب أن تُصيب كلُّها (فعل + مفعول…) ⇒ خدمة. تحلّ ترتيب
// الكلمات وتخلّلها: «يغسل ليا الطوموبيل» · «الماكينة ديال الخياطة». لها الأولويّة.
// المركبة: كلُّ ما يُغسَل ويُصبَغ ويُصلَح. أُضيفت الشاحنةُ والدرّاجة من جردٍ
// ميدانيٍّ في محلّ غسل — كان «بغيت نغسل الكاميو» لا يُفهَم أصلًا.
const CAR = ['طوموبيل', 'طونوبيل', 'طموبيل', 'سياره', 'سيارات', 'لوطو', 'كرهبه',
  'كاميو', 'كمييو', 'كاميون', 'شاحنه', 'فان', 'طاكسي',
  'voiture', 'auto', 'car', 'tomobil', 'camion', 'truck'];

// قِطَعُ المركبة. لا تُصبح مفاهيمَ مستقلّة (القاعدة ①: القطعةُ ليست خدمة)،
// لكنّها **قرينةٌ** أنّ الحديث عن مركبة: «شرطة فالبارشوك» بلا ذكر طوموبيل.
const CAR_PART = ['بارشوك', 'البارشوك', 'ليزان', 'لزان', 'فيروج', 'الفيروج', 'كابو', 'الكابو',
  'الباب القدامي', 'الباب لوراني', 'لوراني', 'القدامي', 'الجناح', 'الرفراف', 'الصدام',
  'كوسان', 'الكوسان', 'الكوسانات', 'بلافون', 'البلافون', 'الموكيط', 'موكيط', 'طابلو',
  'pare choc', 'aile', 'capot', 'coussin', 'plafond', 'moquette'];

// أفعالُ الخدمة تغلب اسمَ المركبة. بدون هذه القواعد كان `car` مصرفًا يبتلع
// كلَّ جملةٍ لم تُطابَق: «بغيت بوليساج الطوموبيل» ⇒ سيّارة، فيُرسَل مَن يريد
// تلميعًا إلى سوق شراء السيّارات. والسببُ بنيويّ: الفهرس يفوز فيه الأطول،
// و«طوموبيل» أطولُ من «نرش» — فالاسمُ يغلب الفعل دائمًا. القاعدةُ التركيبيّة
// تُصحّح ذلك لأنّها تُفحَص قبل الفهرس وتشترط الاثنين معًا.
const WASH_V = ['غسل', 'يغسل', 'نغسل', 'تغسيل', 'غسله', 'غسلة', 'نظف', 'ينظف', 'نضف', 'نقي',
  'نرش', 'يرش', 'رشة', 'سبيري', 'نسبيري', 'شامبوان',
  'lavage', 'laver', 'wash', 'clean', 'nettoyage', 'rincage'];
const DIRT_N = ['موسخ', 'موسخه', 'مسخه', 'متسخه', 'وسخ', 'طبعه', 'بقعه', 'تراب'];

// ── الملابس: من زيارةٍ ميدانيّةٍ لبائعةٍ تبيع من بيتها ──
// اللبسُ اسمُ جنسٍ واحد، والذي يُفرِّق المفهومَ هو **لِمَن**: نفسُ كلمة «كسوة»
// تعني بضاعتَين مختلفتَين في محلٍّ واحد. ولذلك قاعدةٌ تركيبيّة (لبس + متلقٍّ)
// لا متغيّراتٌ منفصلة: «كسوة لبنتي» و«كسوة ليا» لا يفترقان إلّا بالمتلقّي.
const CLOTHES_N = ['كسوه', 'كساوي', 'كسيوات', 'كسوات', 'حوايج', 'ملابس', 'لباس', 'قشاشه',
  'فستان', 'فساتين', 'قاميجه', 'قمصان', 'تيشورت', 'سروال', 'سراول', 'جلابه',
  'tenue', 'habits', 'vetements', 'clothes', 'robe'];
const KIDS_N = ['دراري', 'صغار', 'بنتي', 'ولدي', 'طفل', 'اطفال', 'رضيع', 'بيبي', 'مولود',
  'ولاد', 'صغير', 'صغيره', 'enfant', 'enfants', 'bebe', 'kids', 'baby'];
const WOMEN_N = ['نسا', 'نساء', 'مرا', 'مرتي', 'خيتي', 'بنات', 'femme', 'femmes', 'women'];
const MEN_N = ['رجال', 'راجل', 'خويا', 'homme', 'hommes', 'men'];

const COMPOSITE: { id: string; category: string; all: string[][] }[] = [
  // الأخصُّ أوّلًا: «لداخل» تُحوّل الغسلَ إلى خدمةٍ أخرى بثمنٍ ووقتٍ مختلفَين.
  // لو جاءت قاعدةُ الغسل العامّ قبلها لابتلعت «بغيت نسبيري لداخل» — والقواعدُ
  // تُفحَص بالترتيب، فالترتيبُ هنا **جزءٌ من المعنى** لا تفصيلُ كتابة.
  { id: 'car_interior_cleaning', category: 'automotive', all: [WASH_V, ['لداخل', 'الداخل', 'داخلي', 'interieur', 'الكوسان', 'كوسان', 'بلافون', 'الموكيط', 'موكيط']] },
  { id: 'car_wash', category: 'automotive', all: [WASH_V, CAR] },
  { id: 'car_wash', category: 'automotive', all: [DIRT_N, CAR] },       // «طوموبيل عندي مسخة»
  { id: 'car_wash', category: 'automotive', all: [WASH_V, CAR_PART] },  // «نغسل الكوسانات»
  { id: 'car_polishing', category: 'automotive', all: [['بوليش', 'بوليساج', 'تلميع', 'نلمع', 'لمع', 'polissage', 'lustrage', 'polish'], [...CAR, ...CAR_PART]] },
  { id: 'car_painting', category: 'automotive', all: [['صباغه', 'صباغة', 'نصبغ', 'يصبغ', 'صبغ', 'لبريون', 'لبرييون', 'ابريون', 'peinture', 'apprêt', 'appret', 'paint'], [...CAR, ...CAR_PART]] },
  // متناظرةٌ مع صباغة السيّارة: الفعلُ نفسُه، والمفعولُ يحسم. بلا هذه كانت
  // «بغيت نصبغ الدار» تسقط في صباغة السيّارات — أو لا تُفهَم أصلًا.
  { id: 'painter', category: 'home_services', all: [['صباغه', 'صباغة', 'نصبغ', 'يصبغ', 'صبغ', 'مبيض', 'نبيض', 'peinture'], ['دار', 'الدار', 'بيت', 'البيت', 'حيط', 'الحيوط', 'شقه', 'الشقه', 'سقف', 'غرفه', 'الصالون', 'محل', 'المحل']] },
  { id: 'car_wrapping', category: 'automotive', all: [['ستيكاج', 'سطيكاج', 'ستيكرز', 'تغليف', 'كوفرينغ', 'تفميم', 'stickage', 'covering', 'wrapping'], [...CAR, ...CAR_PART, 'زاج', 'الزاج']] },
  { id: 'car_body_repair', category: 'automotive', all: [['شرطه', 'خدشه', 'خدش', 'ضربه', 'بوسه', 'صدمه', 'طق', 'مهرس', 'raye', 'rayure', 'bosse', 'dent'], [...CAR, ...CAR_PART]] },
  { id: 'mechanic', category: 'automotive', all: [['يصلح', 'صلح', 'نصلح', 'مصلح', 'عطل', 'عطب', 'خربان', 'reparer', 'repair', 'fix', 'panne', 'frein'], CAR] },
  { id: 'sewing_machine_repair', category: 'home_services', all: [['ماكينه', 'ماكينة', 'machine', 'makina'], ['خياطه', 'خياطة', 'couture', 'sewing', 'خيط']] },
  // الملابس: المتلقّي يحسم. «كسيوات ديال الدراري» ≠ «كساوي ليا أنا» — نفس
  // اللفظ، وبضاعتان لا تلتقيان. وبلا هذه القواعد كانت تُقرأ «ملابس» عامّةً،
  // فتُعرَض على الأمّ التي تسأل عن ابنتها أثوابُ نساءٍ بمقاساتٍ لا تنفعها.
];

// قواعدُ الملابس **احتياطيّةٌ لا سابقة** — وهذا موضعُها لا COMPOSITE.
//
//   المتلقّي يحسم حين لا يحسم غيرُه: «كسوة لبنتي» ملابسُ أطفال. لكنّها لو
//   فُحصت قبل الفهرس لابتلعت ما هو أخصُّ منها: «حوايج للبيبي» ملابسُ رُضّع
//   لا ملابسُ أطفال، و«كسوة العيد ديال الدراري» مناسبةٌ لا فئةُ عمر —
//   ومفهوماهما موجودان في الفهرس. أسقطت القاعدةُ الأخصَّ حين سبقته.
//
//   فالترتيب: يُسأل الفهرسُ أوّلًا، فإن صمت سألنا المتلقّي. الأخصُّ أوّلًا،
//   حرفيًّا — وهي نفسُ القاعدة التي تحكم ترتيب COMPOSITE من الداخل.
const CLOTHING_BY_RECIPIENT: { id: string; all: string[][] }[] = [
  { id: 'kids_clothing',   all: [CLOTHES_N, KIDS_N] },
  { id: 'womens_clothing', all: [CLOTHES_N, WOMEN_N] },
  { id: 'mens_clothing',   all: [CLOTHES_N, MEN_N] },
];

function conceptById(id: string): Record<string, string> {
  return CONCEPTS.find(c => c.id === id)?.concept || { ar: id };
}

// فئاتٌ مُنسَّقة (الملف يترك أغلبها فارغة) — تُكمِّل، لا تُلغي فئةً موجودة.
const CATEGORY_BY_ID: Record<string, string> = {
  car: 'automotive', mechanic: 'automotive', car_wash: 'automotive', car_service: 'automotive',
  tire_shop: 'automotive', car_tinting: 'automotive', auto_parts: 'automotive',
  plumber: 'home_services', electrician: 'home_services', carpenter: 'home_services',
  painter: 'home_services', tiler: 'home_services', mason: 'home_services',
  contractor: 'home_services', plasterer: 'home_services', locksmith: 'home_services',
  network_installer: 'home_services', curtain_maker: 'home_services',
  barber: 'beauty', tailor: 'fashion', cobbler: 'fashion',
  butcher: 'food_grocery', grocer: 'food_grocery', bakery: 'food_grocery', perfumer: 'food_grocery',
  pharmacy: 'health', doctor_gp: 'health', dentist: 'health', nutritionist: 'health',
  psychologist: 'health', pet_shop: 'health',
  cafe: 'food_dining', restaurant: 'food_dining',
  phone_repair: 'electronics', graphic_designer: 'digital', recruitment_agency: 'services',
  florist: 'retail', blacksmith: 'home_services',
};
// الفئةُ الفعّالة لمفهوم. تُصدَّر لأنّ conceptGraph كان يقارن الفئة **الخام**،
// فيرى فئتين مختلفتين لنفس المعنى. مصدرٌ واحدٌ للفئة يمنع هذا الانقسام.
//
// والحارس: كانت ٩٠ مهنةً تحمل رأسَ جدولٍ من CSV («| الدارجة | العربية | …»)
// كفئة. وهو نصٌّ غيرُ فارغ، فكان يسبق CATEGORY_BY_ID ويجعل التسعين كلَّها
// «نفس الفئة» — فتُعرَض مغسلةُ سيّاراتٍ كخدمةٍ مرتبطةٍ بالصيدليّة. نُظِّفت
// البيانات، والحارسُ هنا يمنع عودة العطب من أيّ استيرادٍ قادم.
const CAT_JUNK = /\||الدارجة\s*\||^\s*$/;
export function categoryFor(id: string, dataCat: string): string {
  const c = String(dataCat || '').trim();
  return (c && !CAT_JUNK.test(c) ? c : '') || CATEGORY_BY_ID[id] || '';
}

// resolveConcept — يفهم المفهوم (خدمة/مهنة) من نصٍّ بأيّ لغة/كتابة.
/** معرفةُ مفهومٍ بمُعرِّفه — للقواعد التركيبيّة التي تُنتج مُعرِّفًا لا مُطابَقة. */
function knowledgeOf(id: string): Pick<ConceptResolution, 'services' | 'fields' | 'examples'> {
  const c = CONCEPTS.find(x => x.id === id);
  return c ? { services: c.services, fields: c.fields, examples: c.examples } : {};
}

/**
 * **مطابقةُ المصطلح القصير تحتاج حدًّا.**
 *
 *   وقع مرّتين في القياس نفسِه:
 *     «تصبينة» ⇒ بقّال    — لأنّ «صبي» تقع داخلها
 *     «garment» ⇒ سيّارة  — لأنّ فكَّ الـArabizi يعطي «كارمنت»، وفيها «كار»
 *   وقبلهما «دي» (من خطأٍ مطبعيّ) كانت تجعل «كندير الحلويات» تشخيصَ سيّارات.
 *
 *   العربيّةُ تلصق سوابقَها فلا تصلح المطابقةُ بالكلمة الكاملة («الحلاق» يجب
 *   أن تُطابق «حلاق»). لكنّ مصطلحًا من ثلاثة أحرفٍ أو أقلّ يقع داخل عشرات
 *   الكلمات بلا معنًى — فيُشترط له حدٌّ: بدايةُ كلمةٍ أو بعد «ال».
 */
const SHORT = 3;

/**
 * **السوابقُ تلتصق، والوسطُ لا يُطابَق.**
 *
 *   كان المصطلحُ الطويل يُطابَق بالاحتواء المجرّد، فوقع هذا حرفيًّا:
 *       «الز**بناء**»  ⇒ **بنّاء**   — «وريني الزبناء ديالي» تطلب معلّمَ بناء
 *   وهو نفسُ صنف «مكتب ⇒ كتب» الذي هُدم في جدول البضائع، لكنّه هنا في
 *   **فهرس المفاهيم** — وأخطر، لأنّ الفهرسَ يحكم كلَّ جملة.
 *
 *   ولا يصلح اشتراطُ الكلمة الكاملة: العربيّةُ تلصق سوابقَها («الحلاق» ·
 *   «للحلاق» · «وبالحلاق») ولواحقَها («حلاقين» · «حلاقة»). فالشرطُ على
 *   **البداية وحدَها**: أن يبدأ المصطلحُ عند حدِّ كلمةٍ بعد سوابقَ معروفة.
 */
const PREFIX = '[وفبكل]{0,2}(ال)?';
const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function hitsArabic(term: string, text: string): boolean {
  if (!text) return false;
  const start = `(^|\\s)${PREFIX}${esc(term)}`;
  // المصطلحُ القصيرُ يُشترَط له طرفاه معًا: من ثلاثة أحرفٍ يقع داخل عشرات
  // الكلمات بلا معنًى («دي» في «كنـدير» و«ديال»).
  return term.length > SHORT
    ? new RegExp(start).test(text)
    : new RegExp(`${start}(\\s|$)`).test(text);
}

/**
 * ومسارُ الـArabizi أضيقُ بعد: نصٌّ إنجليزيٌّ أو فرنسيٌّ سليمٌ يُفكّ إلى حروفٍ
 * عربيّةٍ لا معنى لها («clothes» ⇒ «كلوثس»)، فتصادفُ داخلَها مصطلحًا قصيرًا
 * مصادفةً محضة. هنا **تُشترَط الكلمةُ الكاملة** مهما كان طولُ المصطلح — فمن
 * كتب Arabizi حقيقيًّا («sbak») يُفكّ إلى كلمةٍ كاملة («سباك») ولا يتضرّر.
 */
function hitsArabizi(term: string, text: string): boolean {
  if (!text) return false;
  return new RegExp(`(^|\\s)${PREFIX}${esc(term)}(\\s|$)`).test(text);
}

export function resolveConcept(text: string): ConceptResolution | null {
  if (!text) return null;
  const hasArabic = /[؀-ۿ]/.test(text);
  const hasLatin = /[a-z]/i.test(text);
  const ta = normArabic(text);                       // مطابقة العربيّة المكتوبة عربيًّا
  const tda = normArabic(deArabizi(text));           // مطابقة الدارجة اللاتينيّة (bghit sbak)
  const tl = normLatin(text);                         // مطابقة fr/en/arabizi
  const blob = `${ta} ${tda} ${tl}`;

  // القواعد التركيبيّة أوّلًا (كلّ مجموعةٍ يجب أن تُصيب). نتجاهل التطبيعات الفارغة.
  const hits = (terms: string[]) => terms.some(w => {
    const na = normArabic(w), nl = normLatin(w);
    return (na.length >= 2 && blob.includes(na)) || (nl.length >= 2 && blob.includes(nl));
  });
  for (const r of COMPOSITE) {
    if (r.all.every(hits)) return {
      id: r.id, category: categoryFor(r.id, r.category), concept: conceptById(r.id),
      language: hasArabic ? 'darija' : 'en', ...knowledgeOf(r.id),
      matched: { term: r.all.map(g => g[0]).join(' + '), via: 'composite' },
    };
  }

  // الوعاءُ يُؤجَّل ولا يُلغى: «حانوت ديال الحوت» بائعُ سمكٍ لا بقّال، لكنّ
  // «عندي حانوت» بقّالٌ حقًّا. فنحتفظ بمطابقة الوعاء جانبًا ونُكمل البحث —
  // فإن حسم المحتوى فهو الحكم، وإن صمت رجعنا للوعاء. الإصلاحُ بلا صمتٍ جديد.
  let deferredContainer: ConceptResolution | null = null;

  // الأخصّ أوّلًا: الفهرسان مرتّبان بطول المصطلح تنازليًّا، فـ«بيع حواسيب» تسبق
// «حاسوب». بدونه كان أوّلُ مفهومٍ في الترتيب يفوز مهما كان مصطلحه عامًّا.
// العربيّة: مطابقةٌ متّصلة (أدقّ) أوّلًا.
  for (const { term, c } of arIndex) {
    if (hitsArabic(term, ta) || hitsArabizi(term, tda)) {
      // `via:'container'` دليلٌ صريحٌ على أنّ المطابقَ اسمُ المكان لا بضاعتُه —
      // فمن قرأ الأثرَ عرف أنّ هذا **افتراضٌ** لا قراءةُ ما قاله الإنسان.
      if (isContainerWithContents(term, ta, tda)) {
        deferredContainer ||= { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
          language: 'darija', services: c.services, fields: c.fields, examples: c.examples,
          matched: { term, via: 'container' } };
        continue;
      }
      // تخصيصٌ يُحسّن العامَّ ولا يبتلع الأخصّ: «كسوة» وحدَها ملابسٌ عامّة،
      // و«كسوة لبنتي» ملابسُ أطفال. لا يُطبَّق إلّا حين يكون الفهرسُ قد وقف
      // عند `clothing` العامّة — فـ`baby_clothing` و`eid_clothing` لا تُمَسّان،
      // وهما ما كسرَته القاعدةُ حين كانت تسبق الفهرس.
      if (c.id === 'clothing') {
        const spec = CLOTHING_BY_RECIPIENT.find(r => r.all.every(hits));
        if (spec) {
          return { id: spec.id, category: categoryFor(spec.id, 'fashion'), concept: conceptById(spec.id),
            language: 'darija', matched: { term, via: 'composite' } };
        }
      }
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
        language: 'darija', services: c.services, fields: c.fields, examples: c.examples,
        matched: { term, via: 'exact' } };
    }
  }
  // البضاعةُ تدلّ على الحرفة — بعد الفهرس لأنّ اسمَ الحرفة أدقُّ من اسم
  // بضاعتها («خضّار» أصرحُ من «الخضرة»)، وقبل اللاتينيّة لأنّ الجملةَ عربيّة.
  // هنا يُفهَم «عندي محل ديال الخضرة»: المغربيُّ يقول ما يبيع لا ما يُسمّى.
  const merch = resolveMerchandise(ta, tda);
  if (merch) {
    return { id: merch.id, category: categoryFor(merch.id, ''), concept: conceptById(merch.id),
      language: hasArabic ? 'darija' : 'en', ...knowledgeOf(merch.id),
      matched: { term: merch.term, via: 'exact' } };
  }

  // اللاتينيّة (fr/en/arabizi).
  for (const { term, c } of latIndex) {
    if (tl && new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(tl)) {
      const lang: UnderLangDetect = hasArabic && hasLatin ? 'mixed' : /(je |un |le |la |cherche|besoin)/.test(tl) ? 'fr' : hasLatin ? 'en' : 'darija';
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
        language: lang, services: c.services, fields: c.fields, examples: c.examples,
        matched: { term, via: 'latin' } };
    }
  }
  // العربيّة: مطابقةٌ بالكلمات (تحلّ ترتيب/تخلّل الكلمات: «الماكينة ديال الخياطة»).
  const textToks = new Set([...toks(ta), ...toks(tda)]);
  for (const { tokens, c } of arTokenIndex) {
    if (tokens.every(t => textToks.has(t))) {
      return { id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
        language: 'darija', services: c.services, fields: c.fields, examples: c.examples,
        matched: { term: tokens.join(' '), via: 'tokens' } };
    }
  }
  // آخرُ ما يُسأل: لِمَن اللبس؟ لا تصل هنا جملةٌ عرف الفهرسُ لها مفهومًا.
  for (const r of CLOTHING_BY_RECIPIENT) {
    if (r.all.every(hits)) {
      return { id: r.id, category: categoryFor(r.id, 'fashion'), concept: conceptById(r.id),
        language: hasArabic ? 'darija' : 'en', matched: { term: r.id, via: 'composite' } };
    }
  }
  // ولا شيءَ حسم المحتوى ⇒ الوعاءُ يعود. «حانوت ديال المواد الغذائيّة» يبقى
  // بقّالًا — أُصلح الخطأُ بلا أن نُورِث المكانَ صمتًا.
  return deferredContainer;
}

// resolveConcepts (جمع) — **كلُّ** ما تحمله الجملة، لا أوّلَ ما تصادف.
//
// جاء من زيارةٍ ميدانيّةٍ لمحلّ غسلٍ في الدار البيضاء. قال صاحبُه:
//   «غسل السيارات، تلميع، طولوري، صباغة، غسل الزرابي، غسل كامل، المحرك»
// سبعُ خدمات — وأرجع المحرّكُ `car_wash` وحدَها، لأنّ resolveConcept يقف
// عند أوّل إصابة. فيُسجَّل المحلُّ بخدمةٍ من سبع، وستُّ خدماتٍ لا يجدها أحد.
//
// وهذا ما يجعل الجسرَ (provider_concepts) قابلًا للتعبئة تلقائيًّا من جملةٍ
// واحدة: نقترح على صاحب المحلّ ما فهمناه، ويُصحّح — بدل أن نطلب منه أن
// يختار من قائمةٍ من ١٨٣ مفهومًا.
//
// المطابقةُ **غيرُ متداخلة**: كلُّ مقطعٍ من النصّ يُستهلَك مرّةً واحدة، وإلّا
// أرجعت «غسل السيارات» مفهومَي الغسل والسيّارة معًا فتضخّم الضجيج.
export function resolveConcepts(text: string, max = 8): ConceptResolution[] {
  if (!text) return [];
  const out: ConceptResolution[] = [];
  const seen = new Set<string>();
  const ta = normArabic(text);
  const tda = normArabic(deArabizi(text));
  const taken: Array<[number, number]> = [];       // مقاطعُ استُهلكت
  const free = (at: number, len: number) => !taken.some(([s, e]) => at < e && at + len > s);

  for (const src of [ta, tda]) {
    if (!src) continue;
    for (const { term, c } of arIndex) {
      if (out.length >= max) break;
      if (seen.has(c.id)) continue;
      const at = src.indexOf(term);
      if (at < 0 || !free(at, term.length)) continue;
      taken.push([at, at + term.length]);
      seen.add(c.id);
      out.push({ id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
        language: 'darija', services: c.services, fields: c.fields, examples: c.examples,
        matched: { term, via: 'exact' } });
    }
  }

  // القواعدُ التركيبيّةُ أيضًا — كانت تُفحَص في المفرد وحدَه.
  //   «بغيت نغسل الطوموبيل ونصبغ الدار» ⇒ كانت تُرجع الغسلَ فقط، لأنّ
  //   «نصبغ الدار» قاعدةٌ تركيبيّةٌ (فعل + مفعول) لا مصطلحٌ في الفهرس.
  //   فتضيع نصفُ الجملة صامتةً — وهي الحالةُ التي وُلدت من أجلها هذه الدالّة.
  for (const r of COMPOSITE) {
    if (out.length >= max || seen.has(r.id)) continue;
    const anyHit = r.all.every(g => g.some(w => {
      const na = normArabic(w), nl = normLatin(w);
      return (na.length >= 2 && (ta.includes(na) || tda.includes(na)))
          || (nl.length >= 2 && normLatin(text).includes(nl));
    }));
    if (!anyHit) continue;
    seen.add(r.id);
    out.push({ id: r.id, category: categoryFor(r.id, r.category), concept: conceptById(r.id),
      language: 'darija', ...knowledgeOf(r.id),
      matched: { term: r.all.map(g => g[0]).join(' + '), via: 'composite' } });
  }

  const tl = normLatin(text);
  if (tl) {
    for (const { term, c } of latIndex) {
      if (out.length >= max) break;
      if (seen.has(c.id)) continue;
      if (!new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(tl)) continue;
      seen.add(c.id);
      out.push({ id: c.id, category: categoryFor(c.id, c.category), concept: c.concept,
        language: 'en', services: c.services, fields: c.fields, examples: c.examples,
        matched: { term, via: 'latin' } });
    }
  }
  return out;
}

// ── المدن: فهرسُ أسماءٍ وأسماءٍ بديلةٍ (عربيّة/لاتينيّة) → مدينة قانونيّة ──
interface CityMatch { city: string; districts: string[]; }
const cityArIndex: { term: string; c: CityMatch }[] = [];
const cityLatIndex: { term: string; c: CityMatch }[] = [];
for (const city of CITIES) {
  const c: CityMatch = { city: city.ar, districts: city.districts };
  const arTerms = [city.ar, city.darija, ...city.aliases].filter(t => /[؀-ۿ]/.test(t));
  const latTerms = [city.fr, city.en, ...city.aliases].filter(t => /[a-z]/i.test(t));
  for (const t of arTerms) { const n = normArabic(t); if (n.length >= 3) cityArIndex.push({ term: n, c }); }
  for (const t of latTerms) { const n = normLatin(t); if (n.length >= 3) cityLatIndex.push({ term: n, c }); }
}
cityArIndex.sort((a, b) => b.term.length - a.term.length);
cityLatIndex.sort((a, b) => b.term.length - a.term.length);

export interface CityResolution { city: string; district?: string; }
export function resolveCity(text: string): CityResolution | null {
  if (!text) return null;
  const ta = normArabic(text);
  const tl = normLatin(text);
  for (const { term, c } of cityArIndex) if (ta.includes(term)) return { city: c.city, district: districtIn(ta, c) };
  for (const { term, c } of cityLatIndex) if (new RegExp(`(^|\\s)${term}(\\s|$)`).test(tl)) return { city: c.city };
  // **الأماكنُ الصغيرة.** الفهرسُ أعلاه يحمل ٤٥ مدينةً كبرى بأحيائها؛ وعندنا
  // ٤٠٩ أماكنَ في `places.ts`. لولا هذا السطرِ لعرف المُنتقي «تيفلت» ولم
  // يعرفها المحرّك — عقلان يختلفان على المكان الواحد.
  const p = resolvePlace(text);
  if (p) return { city: p.ar };
  return null;
}
function districtIn(ta: string, c: CityMatch): string | undefined {
  for (const d of c.districts) { const n = normArabic(d); if (n.length >= 3 && ta.includes(n)) return d; }
  return undefined;
}

export function knowledgeStats() {
  return { concepts: CONCEPTS.length, cities: CITIES.length, arTerms: arIndex.length, latTerms: latIndex.length };
}
