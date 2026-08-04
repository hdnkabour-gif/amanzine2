import { CATEGORIES, categoryForConcept, fieldsForCategory, baseFields, UNIVERSAL_KEYS, type CategoryKind } from './catalog';
import { resolveConcept } from './akg/kb/knowledge';

/** تسمياتُ الفئات — مشتقّةٌ لا مكتوبة. */
const CATEGORY_LABELS = CATEGORIES.map(c => c.label);
// ============================================================
// Blueprint Engine — قلب AMANZINE. لا نخزّن ملايين السيناريوهات، بل «قوالب».
//   نصّ المستخدم → Intent (needEngine) + Entity (هنا) → Blueprint مناسب →
//   نبني السيناريو (حقول مطلوبة/اختياريّة/ديناميكيّة) دفعة واحدة.
// القوالب ترث بعضها (Vehicle ← Car ← Electric) فلا نكرّر. والحقول لها وزن
// يغذّي «نسبة الاكتمال». مستقبلًا: Living Blueprint يتعلّم من السوق (خادم).
// ============================================================

// `tags` = قيمٌ متعدّدة (مقاسات · ألوان · تخصّصات). كان غيابُه سببَ أنّ
// المقاسَ لم يكن يُسأل عنه في المساعد أصلًا: لا نوعَ حقلٍ يقبل أكثر من قيمة.
export type FieldType = 'text' | 'number' | 'money' | 'select' | 'city' | 'phone' | 'toggle' | 'photos' | 'video' | 'tags';

export interface BField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  weight?: number;      // أثره في نسبة الاكتمال
  evidence?: boolean;   // دليل (صور/وثيقة) — Evidence Collector
  hint?: string;
}

export interface Blueprint {
  id: string;
  entity: string;
  label: string;       // عنوان السيناريو المعروض
  verb: string;        // ماذا يفعل (ينشر إعلان/ينشئ نشاط/يبني عيادة…)
  extends?: string;
  fields: BField[];
}

// ── جسرُ الكتالوج → القالب ────────────────────────────────────
// الحقولُ الأساسيّةُ لم تعد تُكتب هنا. كانت مكتوبةً مرّتين فاختلفتا:
//   الاستمارةُ تقول «اسم المنتج» والسيناريو يقول «العنوان» — حقلٌ واحدٌ
//   باسمين. والسيناريو يسأل عن المدينة والاستمارةُ لا، والاستمارةُ تسأل عن
//   المقاسات والسيناريو لا. فمن نشر من هنا فقَد مقاساته ومن نشر من هناك
//   فقَد مدينته. الآن كلاهما يقرأ `catalog.baseFields`.
const KIND_TO_TYPE: Record<string, FieldType> = {
  text: 'text', money: 'money', number: 'number', select: 'select',
  photos: 'photos', city: 'city', tags: 'tags', phone: 'phone', toggle: 'toggle',
};
const WEIGHTS: Record<string, number> = {
  title: 20, photos: 20, price: 18, city: 12, category: 10,
  desc: 8, sizes: 8, colors: 7, stock: 6, cost: 5, hashtags: 3,
};
function fromCatalog(kind: CategoryKind, keys?: readonly string[]): BField[] {
  return baseFields(kind)
    .filter(f => !keys || keys.includes(f.key))
    .map(f => ({
      key: f.key,
      label: f.label,
      type: KIND_TO_TYPE[f.kind] || 'text',
      required: f.essential,
      weight: WEIGHTS[f.key] ?? 5,
      hint: f.hint,
      ...(f.key === 'photos' ? { evidence: true } : {}),
      ...(f.key === 'category' ? { options: CATEGORY_LABELS } : {}),
    }));
}

// ── تعريفات القوالب (قابلة للتوسّع بلا لمس الكود المنطقيّ) ──
const RAW: Blueprint[] = [
  // القالب الأمّ: المفاتيحُ الكونيّةُ وحدَها — ما يصلح لسيّارةٍ وعقارٍ ومنتج.
  // المقاسُ واللونُ ليسا هنا: لا مقاسَ لشقّة.
  { id: 'base', entity: 'base', label: 'إعلان', verb: 'ينشر إعلانًا',
    fields: fromCatalog('product', UNIVERSAL_KEYS) },

  // منتج عامّ / إلكترونيات — بقيّةُ أساسِ المنتج: فئة · مخزون · ألوان · مقاسات · تكلفة.
  { id: 'product', entity: 'product', label: 'منتج للبيع', verb: 'ينشر منتجًا', extends: 'base', fields: [
    ...fromCatalog('product').filter(f => !UNIVERSAL_KEYS.includes(f.key as any)),
    { key: 'condition', label: 'الحالة', type: 'select', options: ['جديد', 'مستعمل', 'كالجديد'], weight: 8 },
  ]},

  // مركبة (سيّارة)
  { id: 'vehicle', entity: 'vehicle', label: 'سيّارة للبيع', verb: 'ينشر إعلان سيّارة', extends: 'base', fields: [
    { key: 'brand', label: 'الماركة', type: 'text', required: true, weight: 10 },
    { key: 'model', label: 'الموديل', type: 'text', required: true, weight: 8 },
    { key: 'year', label: 'السنة', type: 'number', required: true, weight: 8 },
    { key: 'mileage', label: 'الكيلومترات', type: 'number', weight: 8, hint: 'المشترون يسألون عنها كثيرًا' },
    { key: 'fuel', label: 'نوع الوقود', type: 'select', options: ['بنزين', 'مازوط', 'كهربائي', 'هجين'], weight: 6 },
    { key: 'gearbox', label: 'ناقل الحركة', type: 'select', options: ['عاديّة', 'أوتوماتيك'], weight: 5 },
    { key: 'condition', label: 'الحالة', type: 'select', options: ['ممتازة', 'جيّدة', 'تحتاج إصلاح'], weight: 5 },
    { key: 'papers', label: 'البطاقة الرمادية', type: 'toggle', evidence: true, weight: 4 },
  ]},

  // عقار
  { id: 'realEstate', entity: 'realEstate', label: 'عقار', verb: 'ينشر إعلان عقار', extends: 'base', fields: [
    { key: 'kind', label: 'النوع', type: 'select', options: ['شقة', 'دار', 'فيلا', 'ستوديو', 'أرض', 'محل'], required: true, weight: 10 },
    { key: 'area', label: 'المساحة (م²)', type: 'number', weight: 8 },
    { key: 'rooms', label: 'عدد الغرف', type: 'number', weight: 7 },
    { key: 'district', label: 'الحي', type: 'text', weight: 6 },
    { key: 'video', label: 'فيديو', type: 'video', evidence: true, weight: 8, hint: 'العقارات بفيديو تُكرى أسرع' },
  ]},

  // كراء (يشترك مع مركبة/عقار عبر الكيان الفرعيّ، لكن يضيف حقول الكراء)
  { id: 'rental', entity: 'rental', label: 'للكراء', verb: 'ينشر إعلان كراء', extends: 'base', fields: [
    { key: 'dailyPrice', label: 'الثمن اليوميّ', type: 'money', weight: 10 },
    { key: 'deposit', label: 'الضمانة', type: 'money', weight: 6 },
    { key: 'insurance', label: 'التأمين متضمَّن؟', type: 'toggle', weight: 6 },
  ]},

  // نشاط مهنيّ / خدمة (نجّار، كهربائي، طبيب…)
  { id: 'service', entity: 'service', label: 'نشاط مهنيّ', verb: 'ينشئ صفحة نشاط', fields: [
    { key: 'profession', label: 'المهنة', type: 'text', required: true, weight: 16 },
    { key: 'specialties', label: 'التخصّصات', type: 'text', weight: 10, hint: 'مثلاً: مطابخ، أبواب، خزائن' },
    { key: 'city', label: 'المدينة', type: 'city', required: true, weight: 12 },
    // **الحيُّ يصنع القُرب.** «كوافير في الدار البيضاء» لا تعني شيئًا لمن يسكن
    // على بُعد عشرين كيلومترًا؛ «كوافير في حي الألفة» تعني «هادا قريب منّي».
    // وكان `resolveCity` يستخرجه من الجملة ثمّ يُرمى لأنّ لا حقلَ يستقبله —
    // نفسُ عطبِ «لا سؤالَ بلا مستقرّ» مقلوبًا: جوابٌ بلا خانة.
    { key: 'district', label: 'الحيّ', type: 'text', weight: 11, hint: 'الزبناء كيقلّبو على اللي قريب منهم' },
    // **الترتيبُ هو التجربة.** القالبُ يُعرَض بترتيب إعلانه لا بأوزانه، وكانت
    // الصورةُ تاسعةً بعد ثمانية حقول. الصورةُ والهاتفُ هما ما يصنع الصفحةَ
    // فعلًا؛ الخبرةُ والأوقاتُ تحسينٌ يأتي بعد أن يرى التاجرُ محلَّه حيًّا.
    // **الصورةُ قبل الحقول.** الوزنُ ١٦ كان يساوي وزنَ المهنة، فتقع الصورةُ
    // تاسعةً بعد ثمانية حقول. والتاجرُ في محلّه يرى محلَّه في الشاشة **قبل**
    // أن يكتب شيئًا — تلك اللحظةُ هي ما يجعله يقول «واو»، لا خانةُ الخبرة.
    // ولذلك صارت إجباريّة: صفحةُ حرفيٍّ بلا صورةٍ لا تُقنع أحدًا.
    { key: 'photos', label: 'صوّر محلّك أو خدمتك', type: 'photos', evidence: true, required: true, weight: 20, hint: 'صورةٌ وحدة كافية دابا — الصور كترفع الثقة بزّاف' },
    { key: 'phone', label: 'الهاتف / واتساب', type: 'phone', required: true, weight: 12 },
    { key: 'hours', label: 'أوقات العمل', type: 'text', weight: 6, hint: 'مثلاً: من 9 حتى 8' },
    { key: 'mobile', label: 'كتمشي عند الزبون؟', type: 'toggle', weight: 6 },
    { key: 'experience', label: 'سنوات الخبرة', type: 'number', weight: 8 },
  ]},
];

const BP = new Map(RAW.map(b => [b.id, b]));

// ميتا القالب (عنوان/فعل) — لِيشتقّها Schema Registry بلا تكرار.
export function blueprintMeta(id: string): { label: string; verb: string } | undefined {
  const b = BP.get(id);
  return b ? { label: b.label, verb: b.verb } : undefined;
}

// دمج حقول القالب مع أصوله (الوراثة) — الأصل أولًا ثمّ الإضافات.
export function resolveFields(id: string): BField[] {
  const b = BP.get(id);
  if (!b) return [];
  const parent = b.extends ? resolveFields(b.extends) : [];
  const seen = new Set(parent.map(f => f.key));
  return [...parent, ...b.fields.filter(f => !seen.has(f.key))];
}

// ── مصنّف الكيان: من النصّ → الكيان (سيّارة/عقار/مهنة/منتج) ──
const CAR = ['طوموبيل', 'سيارة', 'سيّارة', 'طونوبيل', 'بي ام', 'bmw', 'golf', 'مرسيدس', 'audi', 'اودي', 'رونو', 'renault', 'مركبة', 'دراجة', 'موطور'];
const REALE = ['دار', 'شقة', 'شقّة', 'منزل', 'فيلا', 'ستوديو', 'أرض', 'ارض', 'محل تجاري', 'عقار', 'ريان'];
const PRO = ['نجّار', 'نجار', 'حدّاد', 'حداد', 'كهربائي', 'سبّاك', 'سباك', 'صبّاغ', 'صباغ', 'طبيب', 'دكتور', 'محامي', 'كوافور', 'كوافير', 'حلاق', 'ميكانيكي', 'بنّاي', 'بناي', 'خياط', 'طباخ', 'مصور'];

export type Entity = 'vehicle' | 'realEstate' | 'service' | 'product' | 'rental';

const has = (t: string, w: string[]) => w.some(x => t.includes(x));

export function classifyEntity(raw: string): Entity {
  const t = (raw || '').toLowerCase();
  if (has(t, PRO) || /أنا\s|كن(صبغ|لحم|بني)|معلّم|معلم/.test(t)) return 'service';
  if (has(t, CAR)) return 'vehicle';
  if (has(t, REALE)) return 'realEstate';
  return 'product';
}

// اختيار القالب من (النيّة + الكيان). الكراء يغلّف الكيان.
/** حقولُ الفئة (من `categoryFields`) بشكل حقلِ القالب — بلا نسخِ التعريفات. */
function categoryExtraFields(raw: string): BField[] {
  const cat = categoryForConcept(resolveConcept(raw)?.id);
  if (!cat) return [];
  const TYPE: Record<string, FieldType> = {
    select: 'select', multiselect: 'select', text: 'text',
    textarea: 'text', number: 'number', boolean: 'toggle',
  };
  return fieldsForCategory(cat.id).map(f => ({
    key: f.id, label: f.label, type: TYPE[f.type] || 'text',
    options: f.options, required: f.required, hint: f.hint,
    weight: f.required ? 7 : 3,
  }));
}

export function resolveBlueprint(intent: string, raw: string): { blueprint: Blueprint; fields: BField[]; entity: Entity } {
  const entity = classifyEntity(raw);
  let id: string;
  if (intent === 'create_service' || entity === 'service') id = 'service';
  else if (intent === 'rent') id = 'rental';
  else if (entity === 'vehicle') id = 'vehicle';
  else if (entity === 'realEstate') id = 'realEstate';
  else id = 'product';
  const blueprint = BP.get(id)!;

  // القالبُ يعرف ما يعرفه نموذجُ المنتج: «عندي كسوة للبيع» ⇒ فئةُ الأطفال ⇒
  // نفسُ أسئلتها. كان المساعدُ يسأل ثلاثةَ أسئلةٍ عامّةٍ والاستمارةُ تسأل
  // عشرةً خاصّة — سؤالان مختلفان عن الشيء الواحد، وهو ما لاحظه المالك.
  const found = resolveConcept(raw);
  const cat = categoryForConcept(found?.id);
  // المقاساتُ والألوانُ تُقترَح من الفئة نفسِها — «كسوة العيد» ⇒ مقاساتُ
  // الأطفال، «صباط» ⇒ ٣٥…٤٦. بلا هذا يبقى السؤالُ صندوقًا فارغًا يُملأ يدويًّا،
  // وقد كان لا يُسأل أصلًا.
  //
  // والتخصّصاتُ تُقترَح من **قاعدة المعرفة نفسِها**: تعرف أنّ السبّاكَ يفتح
  // المجاري ويركّب السخانات ويصلح التسربات — ستُّ خدماتٍ مكتوبةٌ منذ شهور.
  // وكان التطبيقُ يسأله «التخصّصات» في خانةِ نصٍّ حرٍّ فارغة. المعرفةُ كانت
  // تُرمى عند الباب لأنّ `resolveConcept` يُرجع المُعرِّفَ والتسميةَ فقط.
  const known = found?.services || [];
  const base = resolveFields(id).map(f =>
    cat && f.key === 'sizes' && cat.sizes.length ? { ...f, options: cat.sizes } :
    cat && f.key === 'colors' && cat.colors.length ? { ...f, options: cat.colors } :
    f.key === 'specialties' && known.length
      ? { ...f, type: 'tags' as FieldType, options: known, hint: 'اختر ما كتخدم — ولا زيد اللي ناقص' }
      : f);
  const seen = new Set(base.map(f => f.key));
  const extra = categoryExtraFields(raw).filter(f => !seen.has(f.key));
  return { blueprint, fields: [...base, ...extra], entity };
}

const isFilled = (f: BField, v: any) => f.type === 'toggle' ? v != null : v != null && String(v).trim() !== '';

// ── Question Planner: ما السؤال التالي؟ (محادثة، لا نموذج كامل) ──
// أوّلًا الحقول المطلوبة (بالوزن)، ثمّ الأهمّ اختياريًّا حتى يكفي الاكتمال (~75٪).
// هكذا نسأل الأنسب التالي بدل عرض ٤٠ حقلًا دفعة واحدة.
export function planNext(fields: BField[], values: Record<string, any>, enough = 75): BField | null {
  const unfilled = fields.filter(f => !isFilled(f, values[f.key]));
  const req = unfilled.filter(f => f.required).sort((a, b) => (b.weight || 4) - (a.weight || 4));
  if (req.length) return req[0];
  if (completeness(fields, values).score >= enough) return null; // يكفي — دعه ينشر
  return unfilled.sort((a, b) => (b.weight || 4) - (a.weight || 4))[0] || null;
}

// ── Smart Completeness Score: نسبة اكتمال + أفضل حقل ناقص يرفعها ──
export function completeness(fields: BField[], values: Record<string, any>): { score: number; next?: { label: string; gain: number; hint?: string } } {
  const total = fields.reduce((s, f) => s + (f.weight || 4), 0) || 1;
  let filled = 0;
  const missing: BField[] = [];
  for (const f of fields) {
    const v = values[f.key];
    const ok = f.type === 'toggle' ? v != null : v != null && String(v).trim() !== '';
    if (ok) filled += f.weight || 4; else missing.push(f);
  }
  const score = Math.round((filled / total) * 100);
  const best = missing.sort((a, b) => (b.weight || 4) - (a.weight || 4))[0];
  return {
    score,
    next: best ? { label: best.label, gain: Math.round(((best.weight || 4) / total) * 100), hint: best.hint } : undefined,
  };
}
