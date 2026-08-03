import { CATEGORY_FIELDS, type CatFieldDef } from '../data/categoryFields';
import { CONCEPTS } from './akg/kb/concepts';

// ============================================================
// الكتالوج — **مصدرٌ واحدٌ للفئات**.
//
//   العطبُ الذي وُلد منه هذا الملفّ، كما لاحظه المالك: «صفحة المساعد الذكيّ
//   تعطيني أسئلةً مغايرةً للتي في صفحة المنتجات — لماذا؟»
//
//   لأنّ الحقولَ كانت مكتوبةً **مرّتين في مكانين لا يعرف أحدُهما الآخر**:
//     • `src/data/categoryFields.ts` — ٤٠+ حقلًا حسب الفئة، تقرؤها **الاستمارة**.
//     • `src/lib/akg/pages.ts`      — ٩ حقولٍ عامّة، يقرؤها **العقل**.
//   فالعقلُ يسأل عن «الوصف» والاستمارةُ تسأل عن «الخامة» و«الموسم». ليس
//   خطأً في أحدهما — بل غيابُ مصدرٍ واحد.
//
//   وهنا يُحسَم أيضًا ما هو أعمق: **الفئةُ تُشتقّ ممّا يفهمه العقل.** كلُّ فئةٍ
//   تُعلن مفاهيمَ قاعدةِ المعرفة التي تخصّها (`concepts`)، فحين يقرأ المحرّكُ
//   «تراكسي» ⇒ `sportswear` ⇒ فئةُ «رياضة». لولا ذلك لكانت عندنا قائمتان
//   للشيء نفسِه: العقلُ يعرف `tire_shop` والاستمارةُ تعرف «أخرى».
// ============================================================

export type CategoryKind = 'product' | 'service' | 'digital';

export interface Category {
  id: string;
  icon: string;
  label: string;
  color: string;
  kind: CategoryKind;
  /** مقاساتٌ مقترحة — فارغةٌ حيث لا معنى لها. */
  sizes: string[];
  /** ألوانٌ مقترحة. */
  colors: string[];
  /** مفاهيمُ قاعدة المعرفة التي تقع في هذه الفئة — بها تُشتقّ الفئةُ من الفهم. */
  concepts: string[];
}

/** مقاساتٌ متكرّرة — تُكتب مرّةً. */
const S_LETTER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const S_SHOE = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const S_KIDS = ['0-6m', '6-12m', '1-2Y', '2-4Y', '4-6Y', '6-8Y', '8-10Y', '10-12Y'];
const C_NEUTRAL = ['أسود', 'أبيض', 'رمادي', 'بني', 'بيج', 'أزرق'];

export const CATEGORIES: Category[] = [
  // ── أزياء ──────────────────────────────────────────────────
  { id: 'men', icon: '👕', label: 'ملابس رجال', color: '#3B82F6', kind: 'product',
    sizes: S_LETTER, colors: ['أسود', 'أبيض', 'رمادي', 'كحلي', 'بيج', 'أزرق', 'أحمر', 'زيتي'],
    concepts: ['garment_top', 'garment_bottom', 'garment_outerwear', 'underwear_socks',
      'mens_clothing'] },
  { id: 'women', icon: '👗', label: 'ملابس نساء', color: '#EC4899', kind: 'product',
    sizes: S_LETTER.slice(0, 6), colors: ['أسود', 'أبيض', 'وردي', 'أحمر', 'بيج', 'نبيتي', 'تركواز', 'بنفسجي'],
    concepts: ['garment_dress', 'traditional_clothing', 'womens_clothing',
      'modest_wear', 'sleepwear'] },
  { id: 'kids', icon: '🧒', label: 'أطفال', color: '#F59E0B', kind: 'product',
    sizes: S_KIDS, colors: ['أزرق', 'وردي', 'أصفر', 'أبيض', 'أحمر', 'أخضر', 'برتقالي'],
    concepts: ['kids_clothing', 'baby_clothing', 'eid_clothing'] },
  { id: 'shoes', icon: '👟', label: 'أحذية', color: '#8B5CF6', kind: 'product',
    sizes: S_SHOE, colors: C_NEUTRAL,
    concepts: ['shoe_store', 'shoe_seller'] },
  { id: 'access', icon: '👜', label: 'أكسسوارات', color: '#10B981', kind: 'product',
    sizes: [], colors: ['أسود', 'بني', 'بيج', 'ذهبي', 'فضي', 'أحمر'],
    concepts: ['fashion_accessories'] },
  // المتجرُ العامُّ للملابس. بلا مطالبةٍ صريحةٍ كانت `clothing` تسقط في
  // «خدمة» — لأنّ لها `services[]` فتلتقطها قاعدةُ «مَن يَفعل، خدمة».
  // **المطالبةُ الصريحةُ تغلب القاعدةَ دائمًا**، وهذا موضعُها الصحيح.
  { id: 'clothes', icon: '🧥', label: 'ملابس', color: '#A855F7', kind: 'product',
    sizes: S_LETTER, colors: ['أسود', 'أبيض', 'رمادي', 'بيج', 'أزرق', 'أحمر', 'أخضر'],
    concepts: ['clothing', 'used_clothing', 'fabric_shop'] },
  { id: 'sport', icon: '🏃', label: 'رياضة', color: '#22C55E', kind: 'product',
    sizes: S_LETTER, colors: ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'رمادي'],
    concepts: ['sportswear'] },

  // ── السيّارات — المجالُ الثاني للمالك. كانت **بلا فئةٍ واحدة**. ──
  { id: 'auto', icon: '🚗', label: 'سيارات وقطع غيار', color: '#EF4444', kind: 'product',
    sizes: [], colors: C_NEUTRAL,
    concepts: ['car', 'tire_shop', 'auto_parts', 'auto_spare_parts'] },
  { id: 'auto_service', icon: '🔧', label: 'خدمات السيارات', color: '#F97316', kind: 'service',
    sizes: [], colors: [],
    concepts: ['mechanic', 'car_wash', 'car_service', 'car_maintenance', 'car_diagnostics',
      'car_painting', 'car_body_repair', 'car_polishing', 'car_wrapping', 'car_interior_cleaning',
      'auto_body_paint', 'auto_electrician'] },

  // ── المعلوميّات — المجالُ الثالث. كانت **بلا فئةٍ واحدة**. ──
  { id: 'tech', icon: '💻', label: 'إلكترونيات ومعلوميات', color: '#0EA5E9', kind: 'product',
    sizes: [], colors: C_NEUTRAL,
    concepts: ['computer_hardware_store', 'computer_repair', 'mobile_phone_repair_technician'] },
  { id: 'tech_service', icon: '🛠️', label: 'خدمات تقنية', color: '#6366F1', kind: 'service',
    sizes: [], colors: [],
    concepts: ['it_support', 'computer_repair_technician_it_technician', 'mobile_phone_repair',
      'wifi_internet', 'network_technician', 'cctv_security_systems', 'satellite_receiver',
      'web_development'] },

  // ── الباقي ─────────────────────────────────────────────────
  { id: 'home', icon: '🏠', label: 'ديكور ومنزل', color: '#F97316', kind: 'product',
    sizes: [], colors: ['أسود', 'أبيض', 'بيج', 'بني', 'رمادي', 'ذهبي'],
    concepts: ['used_furniture_seller', 'furniture_upholsterer', 'interior_designer_decorator'] },
  // `concepts: []` **عن قصد** — هذه فئةُ الخدمات العامّة، وهي تُدرِك مفاهيمَها
  // **بقاعدةٍ لا بقائمة** (انظر `categoryForConcept`). القائمةُ اليدويّةُ هنا
  // كانت ستصير المصدرَ الثامن: ١٦٠ مفهومًا بلا فئة، تُكتب بيدٍ ثمّ تتخلّف
  // عن قاعدة المعرفة عند أوّل إضافة.
  { id: 'service', icon: '🔧', label: 'خدمة', color: '#8B5CF6', kind: 'service',
    sizes: [], colors: [], concepts: [] },
  { id: 'digital', icon: '💻', label: 'رقمي / دروس', color: '#0EA5E9', kind: 'digital',
    sizes: [], colors: [], concepts: [] },
  { id: 'other', icon: '📦', label: 'أخرى', color: '#6B7280', kind: 'product',
    sizes: [], colors: [], concepts: [] },
];

const BY_ID = new Map(CATEGORIES.map(c => [c.id, c]));

export function getCategory(id: string): Category | undefined {
  return BY_ID.get(id);
}

/**
 * الفئةُ التي يقع فيها مفهومٌ من قاعدة المعرفة — **بها يُشتقّ النموذجُ من
 * الفهم**: يكتب التاجرُ «تراكسي» فتُختار «رياضة» بمقاساتها وحقولها وحدَها.
 */
export function categoryForConcept(conceptId: string | undefined | null): Category | undefined {
  if (!conceptId) return undefined;
  const claimed = CATEGORIES.find(c => c.concepts.includes(conceptId));
  if (claimed) return claimed;

  // ── القاعدةُ بدل القائمة ──────────────────────────────────
  // ١٦٠ مفهومًا من ١٩٧ لا تطالب بها أيُّ فئةٍ صراحة. سردُها يدويًّا يُنشئ
  // مصدرًا ثامنًا يتخلّف عن قاعدة المعرفة عند أوّل إضافة. القاعدةُ بدلًا منه:
  //
  //   **مَن يَفعل، خدمة.** المفهومُ الذي تعرف قاعدةُ المعرفة ما *يفعله*
  //   (`services[]` مملوءة) هو مِهنةٌ أو حِرفةٌ أو محلٌّ يقدّم خدمات — لا سلعةٌ
  //   على رفّ. فيأخذ حقولَ الخدمة السبعةَ عشرَ بدل ثمانيةٍ عامّة.
  //
  // مقيسٌ قبل هذه القاعدة: السبّاكُ والكهربائيُّ والمصوّرُ **ثمانيةُ حقولٍ
  // متطابقةٌ حرفًا بحرف**، بينما الميكانيسيان خمسةَ عشرَ لأنّ `auto_service`
  // وحدَها كانت تُعلن مفاهيمَها.
  const c = CONCEPTS.find(x => x.id === conceptId);
  if (c && (c.services || []).length > 0) return BY_ID.get('service');
  return undefined;
}

/** الحقولُ الخاصّةُ بفئة — من `categoryFields.ts`، لا نسخةَ ثانية. */
export function fieldsForCategory(id: string): CatFieldDef[] {
  return CATEGORY_FIELDS[id] || [];
}

/**
 * الحقولُ الأساسيّةُ حسب نوع الفئة. مذكورةٌ هنا **مرّةً واحدة**، ويقرؤها
 * العقلُ والاستمارةُ معًا فلا يسأل أحدُهما عمّا لا يسأل عنه الآخر.
 */
export interface BaseField { key: string; label: string; kind: string; essential?: boolean; hint?: string }

/**
 * **المفاتيحُ الكونيّة** — ما يُسأل عنه في كلّ إعلانٍ مهما كان: منتجًا أو
 * سيّارةً أو عقارًا أو خدمة. القالبُ الأمّ في `blueprints.ts` يشتقّ منها
 * حرفيًّا بدل أن يكتبها مرّةً ثانية.
 *
 *   العطبُ الذي وُلد من غيابها: `title` كان «اسم المنتج» في الاستمارة
 *   و«العنوان» في السيناريو — **حقلٌ واحدٌ باسمين**. وكان `city` سؤالًا
 *   إجباريًّا في السيناريو وغائبًا عن الاستمارة، و`sizes`/`colors`/`stock`
 *   في الاستمارة وغائبةً عن السيناريو. فمن نشر من المساعد فقَد مقاساته،
 *   ومن نشر من الاستمارة فقَد مدينته.
 */
export const UNIVERSAL_KEYS = ['title', 'price', 'city', 'photos', 'desc'] as const;

const BASE_PRODUCT: BaseField[] = [
  { key: 'title',    label: 'اسم المنتج',   kind: 'text',   essential: true, hint: 'واضح ومختصر' },
  { key: 'price',    label: 'الثمن (درهم)', kind: 'money',  essential: true },
  { key: 'city',     label: 'المدينة',      kind: 'city',   essential: true },
  { key: 'category', label: 'الفئة',        kind: 'select', essential: true },
  { key: 'photos',   label: 'الصور',        kind: 'photos', essential: true, hint: 'المنتجات بصور تبيع أسرع' },
  { key: 'desc',     label: 'الوصف',        kind: 'text' },
  { key: 'stock',    label: 'الكمّيّة',      kind: 'number' },
  { key: 'colors',   label: 'الألوان',      kind: 'tags' },
  { key: 'sizes',    label: 'المقاسات',     kind: 'tags' },
  // ثمنُ الشراء: خاصٌّ بالتاجر، لا يراه الزبون. بدونه يُحسَب الربحُ من صفرٍ
  // فيظهر هامشًا ١٠٠٪ — وهو ما كان يقع لكلّ ما يُنشر من المساعد.
  { key: 'cost',     label: 'ثمن الشراء',   kind: 'money',  hint: 'خاصٌّ بك — به يُحسَب ربحُك الحقيقيّ' },
  { key: 'hashtags', label: 'الهاشتاغات',   kind: 'tags',   hint: 'تزيد الوصول' },
];

const BASE_SERVICE: BaseField[] = [
  { key: 'title',    label: 'اسم الخدمة',   kind: 'text',   essential: true },
  { key: 'price',    label: 'الثمن',        kind: 'money',  essential: true },
  { key: 'city',     label: 'المدينة',      kind: 'city',   essential: true },
  { key: 'category', label: 'الفئة',        kind: 'select', essential: true },
  { key: 'photos',   label: 'صورٌ من عملك', kind: 'photos', hint: 'أعمالٌ سابقةٌ تُقنع أكثرَ من أيّ وصف' },
  { key: 'desc',     label: 'الوصف',        kind: 'text' },
  { key: 'duration', label: 'المدّة',        kind: 'text' },
  { key: 'workArea', label: 'منطقة العمل',  kind: 'text',   essential: true },
];

const BASE_DIGITAL: BaseField[] = [
  { key: 'title',    label: 'الاسم',        kind: 'text',   essential: true },
  { key: 'price',    label: 'الثمن',        kind: 'money',  essential: true },
  { key: 'city',     label: 'المدينة',      kind: 'city' },
  { key: 'category', label: 'الفئة',        kind: 'select', essential: true },
  { key: 'photos',   label: 'صورةُ الغلاف', kind: 'photos' },
  { key: 'desc',     label: 'الوصف',        kind: 'text' },
];

export function baseFields(kind: CategoryKind): BaseField[] {
  return kind === 'service' ? BASE_SERVICE : kind === 'digital' ? BASE_DIGITAL : BASE_PRODUCT;
}

/**
 * **كلُّ** ما يُسأل عنه لفئةٍ ما: الأساسيُّ ثمّ الخاصّ. هذه هي الدالّةُ التي
 * يجب أن يقرأها كلُّ من يسأل — الاستمارةُ والمساعدُ وشريطُ القدرات.
 */
export function allFieldsFor(categoryId: string): { base: BaseField[]; specific: CatFieldDef[] } {
  const cat = getCategory(categoryId);
  return {
    base: baseFields(cat?.kind || 'product'),
    specific: fieldsForCategory(categoryId),
  };
}
