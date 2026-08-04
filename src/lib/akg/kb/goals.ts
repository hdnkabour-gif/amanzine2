import { extractContexts } from './contexts';
import { CONCEPTS } from './concepts';

// ============================================================
// حاجةُ الحياة — ما وراء الطلب.
//
//   المغربيُّ لا يقول «بغيت محفظة ومئزر وأقلام». يقول **«بنتي داخلة
//   للمدرسة»**. وقياسٌ ميدانيّ:
//
//       «بنتي داخلة للمدرسة»  ⇒ نيّةٌ مجهولة  (والسياق `occasion=مدرسة` مكتشَف!)
//       «غادي نتزوج»          ⇒ نيّةٌ مجهولة
//       «عندي مولود جديد»     ⇒ **عرضُ خدمة** — أبٌ جديدٌ يُعامَل كتاجر
//
//   السياقُ كان يُكتشَف **ولا أحدَ يستهلكه**. وهذا الملفُّ هو المستهلك: يربط
//   المناسبةَ بما تحتاجه فعلًا.
//
//   **ولماذا فوق `contexts.ts` لا بجانبه؟** لأنّ «عرس» و«مدرسة» و«عيد»
//   مصطلحاتٌ مُعرَّفةٌ هناك منذ زمن. نسخُها هنا يعني إملاءَين لشيءٍ واحد
//   ينحرفان بصمت. القانون: **مصدرٌ واحدٌ للحقيقة.** ولا تُضاف هنا إلّا
//   المناسباتُ التي لا يعرفها السياقُ أصلًا (المولود · السفر · الدار الجديدة).
//
//   ولا يخترع هذا الملفُّ مفاهيمَ: كلُّ `concepts` يُفحَص عند الإقلاع، وما لا
//   وجودَ له في المعرفة يسقط. مفهومٌ وهميٌّ وعدٌ لا يُوفى.
// ============================================================

export interface LifeNeed {
  id: string;
  /** الاسمُ كما يُعرَض للإنسان. */
  label: string;
  /**
   * قيمةُ `occasion` في `contexts.ts` إن كانت المناسبةُ معروفةً هناك.
   * فارغةٌ لِما لا يعرفه السياقُ بعد.
   */
  occasion?: string;
  /** عباراتٌ لا يعرفها السياق — تُضاف هنا لا هناك (السياقُ يصف سلعةً، لا حالَ إنسان). */
  says: string[];
  /** ما يحتاجه صاحبُ هذه الحاجة — مُعرِّفاتُ مفاهيمَ حقيقيّة. */
  concepts: string[];
  /** ما نسأله أوّلًا. سؤالٌ واحدٌ يكفي — والباقي يأتي من الجواب. */
  ask: string;
  /** بأيّ نيّةٍ نبدأ حين لا تقول الجملةُ فعلًا صريحًا. */
  intent: 'buy' | 'find_pro';
}

const RAW: LifeNeed[] = [
  {
    id: 'school', label: 'الدخول المدرسيّ', occasion: 'مدرسة',
    says: ['داخلة للمدرسة', 'داخل للمدرسة', 'غادي يقرا', 'غادية تقرا', 'دخلة ديال المدرسة',
      'الدخول المدرسي', 'بدا القراية', 'بدات القراية', 'rentree scolaire'],
    concepts: ['bookstore_stationery', 'kids_clothing', 'private_tutor', 'tailor', 'moving_company'],
    ask: 'مبروك 👏 شنو خاصّها دابا — حوايج، أدوات القراية، ولا نقل مدرسيّ؟',
    intent: 'buy',
  },
  {
    id: 'wedding', label: 'العرس', occasion: 'عرس',
    says: ['غادي نتزوج', 'غادية نتزوج', 'باغي نتزوج', 'قربات الفرحة', 'دايرين عرس',
      'عندي عرس', 'كنوجد لعرس', 'je me marie'],
    concepts: ['traditional_clothing', 'photographer', 'event_planner_wedding_planner', 'caterer',
      'makeup_artist', 'beauty_salon', 'jeweler', 'pastry_chef', 'car_rental',
      'event_equipment_rental'],
    ask: 'مبروك ❤️ من أين نبداو — القفطان، القاعة، التصوير، ولا الحلويات؟',
    intent: 'find_pro',
  },
  {
    id: 'new_baby', label: 'مولودٌ جديد',
    says: ['عندي مولود', 'مولود جديد', 'جاني مولود', 'ولدات مراتي', 'عندي بيبي',
      'رزقنا بمولود', 'ازداد لي', 'nouveau ne', 'bebe'],
    concepts: ['pharmacy', 'baby_clothing', 'kids_clothing', 'photographer', 'doctor_gp'],
    ask: 'الله يجعلو من الصالحين 🤍 شنو خاصّك — حوايج الصغير، حفاضات، سرير، ولا طبيب أطفال؟',
    intent: 'buy',
  },
  {
    id: 'moving_home', label: 'دارٌ جديدة',
    says: ['تنقلت لدار', 'دار جديدة', 'مشيت لدار جديدة', 'غادي نتنقل', 'خذيت دار',
      'كريت دار', 'دخلت لدار جديدة', 'demenagement'],
    concepts: ['moving_company_furniture_transport', 'house_painter', 'electrician', 'plumber',
      'carpenter', 'used_furniture_seller', 'cleaning_company', 'aluminum_pvc_windows'],
    ask: 'بالمبروك 🏡 شنو خاصّك أوّلًا — نقل الأثاث، صباغة، كهرباء، ولا أثاث؟',
    intent: 'find_pro',
  },
  {
    id: 'travel', label: 'سفر',
    says: ['غادي نسافر', 'باغي نسافر', 'مسافر', 'غادي للخارج', 'عندي سفرية', 'voyage'],
    concepts: ['travel_agency', 'car_rental', 'photographer', 'tailor'],
    ask: 'تسافر بالسلامة ✈️ شنو خاصّك — تذكرة، كراء طوموبيل، ولا شي حوايج؟',
    intent: 'find_pro',
  },
  {
    id: 'eid', label: 'العيد', occasion: 'عيد',
    says: [],
    concepts: ['traditional_clothing', 'kids_clothing', 'butcher', 'beauty_salon', 'barber', 'pastry_chef'],
    ask: 'عواشر مبروكة 🌙 شنو كتقلّب عليه — حوايج، حلويات، ولا حلاقة؟',
    intent: 'buy',
  },
  {
    id: 'ramadan', label: 'رمضان', occasion: 'رمضان',
    says: [],
    concepts: ['pastry_chef', 'food_and_grocery', 'butcher', 'restaurant', 'home_kitchen'],
    ask: 'رمضان مبارك 🌙 شنو خاصّك — حلويات، ماكلة، ولا شي حاجة أخرى؟',
    intent: 'buy',
  },
];

/**
 * **لا وعدَ بما لا نملك.** المفهومُ المذكورُ هنا وغيرُ الموجودِ في المعرفة
 * يُعرَض على المستخدم ثمّ لا يُنتج نتيجةً واحدة. يسقط عند الإقلاع بصمتٍ —
 * ويكشفه اختبارٌ باسمه كي لا يمرّ الخطأُ دون أن يُرى.
 */
const KNOWN = new Set(CONCEPTS.map(c => c.id));
export const LIFE_NEEDS: LifeNeed[] = RAW.map(n => ({
  ...n, concepts: n.concepts.filter(id => KNOWN.has(id)),
}));

/** مفاهيمُ ذُكرت هنا ولا وجودَ لها في المعرفة — للاختبار وحدَه. */
export function phantomConcepts(): string[] {
  return RAW.flatMap(n => n.concepts.filter(id => !KNOWN.has(id)).map(id => `${n.id}: ${id}`));
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();

/**
 * حاجةُ الحياة في نصّ — إن وُجدت.
 *
 *   العبارةُ الصريحةُ أوّلًا («غادي نتزوج»)، ثمّ المناسبةُ التي يكتشفها
 *   السياق («ديال العرس»). والترتيبُ متعمَّد: مَن قال «غادي نتزوج» يُخبِر عن
 *   حاله، ومَن قال «قفطان ديال العرس» يصف سلعةً — الأوّلُ يستحقّ الاقتراحَ
 *   الواسع، والثاني يعرف ما يريد.
 */
export function detectLifeNeed(raw: string): LifeNeed | undefined {
  return saidLifeNeed(raw) || occasionLifeNeed(raw);
}

/**
 * **ما قاله عن حاله صراحةً.** «غادي نتزوج» · «تنقلت لدار جديدة».
 *
 *   يُفصَل عن المناسبة لأنّ الفرقَ بينهما فرقُ سلوك: مَن أخبر عن حاله يستحقّ
 *   الاقتراحَ الواسعَ ولو ذكر شيئًا بعينه («تنقلت **لدار**» فيها مفهومُ
 *   العقار وليس طلبًا لعقار)، ومَن وصف سلعةً بمناسبتها («قفطان ديال العرس»)
 *   يعرف ما يريد فلا يُثرثَر عليه.
 */
export function saidLifeNeed(raw: string): LifeNeed | undefined {
  const t = norm(raw);
  if (t.length < 3) return undefined;
  // الأطولُ أوّلًا كي لا تبتلع عبارةٌ قصيرةٌ أخرى أدقَّ منها.
  const said = LIFE_NEEDS
    .flatMap(n => n.says.map(s => ({ n, s: norm(s) })))
    .filter(x => x.s && t.includes(x.s))
    .sort((a, b) => b.s.length - a.s.length)[0];
  return said?.n;
}

/** المناسبةُ التي يكتشفها السياق — أضعفُ دلالةً، فتُشترَط بعدم ذكرِ شيءٍ بعينه. */
export function occasionLifeNeed(raw: string): LifeNeed | undefined {
  const occ = extractContexts(raw).find(c => c.kind === 'occasion');
  return occ ? LIFE_NEEDS.find(n => n.occasion === occ.value) : undefined;
}

/** الأسماءُ المعروضةُ لمفاهيم الحاجة — جاهزةٌ للعرض بلا بحثٍ ثانٍ. */
export function needSuggestions(need: LifeNeed): { id: string; label: string }[] {
  return need.concepts
    .map(id => { const c = CONCEPTS.find(x => x.id === id); return c ? { id, label: c.concept.ar || id } : null; })
    .filter((x): x is { id: string; label: string } => !!x);
}
