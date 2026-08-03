import { CATEGORIES, categoryForConcept, fieldsForCategory } from './catalog';
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

export type FieldType = 'text' | 'number' | 'money' | 'select' | 'city' | 'phone' | 'toggle' | 'photos' | 'video';

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

// ── تعريفات القوالب (قابلة للتوسّع بلا لمس الكود المنطقيّ) ──
const RAW: Blueprint[] = [
  // القالب الأمّ: مشترك بين كل الإعلانات
  { id: 'base', entity: 'base', label: 'إعلان', verb: 'ينشر إعلانًا', fields: [
    { key: 'title', label: 'العنوان', type: 'text', required: true, weight: 20 },
    { key: 'price', label: 'الثمن (درهم)', type: 'money', required: true, weight: 18 },
    { key: 'city', label: 'المدينة', type: 'city', required: true, weight: 12 },
    { key: 'photos', label: 'الصور', type: 'photos', evidence: true, weight: 20, hint: 'الإعلانات بصور تبيع أسرع' },
    { key: 'desc', label: 'وصف', type: 'text', weight: 8 },
  ]},

  // منتج عامّ / إلكترونيات
  { id: 'product', entity: 'product', label: 'منتج للبيع', verb: 'ينشر منتجًا', extends: 'base', fields: [
    // الخياراتُ من `catalog.ts` — كانت قائمةً رابعةً للفئات تخالف الثلاثَ الأخرى.
    { key: 'category', label: 'الفئة', type: 'select', options: CATEGORY_LABELS, required: true, weight: 10 },
    { key: 'condition', label: 'الحالة', type: 'select', options: ['جديد', 'مستعمل', 'كالجديد'], weight: 8 },
    { key: 'warranty', label: 'فيه ضمان؟', type: 'toggle', weight: 4 },
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
    { key: 'experience', label: 'سنوات الخبرة', type: 'number', weight: 8 },
    { key: 'mobile', label: 'كتمشي عند الزبون؟', type: 'toggle', weight: 6 },
    { key: 'hours', label: 'أوقات العمل', type: 'text', weight: 6 },
    { key: 'phone', label: 'الهاتف / واتساب', type: 'phone', required: true, weight: 12 },
    { key: 'photos', label: 'صور أعمالك', type: 'photos', evidence: true, weight: 16, hint: 'صور الأعمال ترفع الثقة كثيرًا' },
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
  const base = resolveFields(id);
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
