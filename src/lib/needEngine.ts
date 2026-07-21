import type { Page } from '../types';
import { readHuman, type HumanIntent } from './humanIntent';

// ============================================================
// needEngine — «شنو محتاج اليوم؟»
// محرّك نيّة بقواعد الدارجة: يفهم ما كتبه المستخدم بلغته الطبيعية،
// ويربطه بالوجهة الصحيحة داخل التطبيق — أو بسؤال موجّه واحد يحسم القصد.
// لا AI، لا backend — قواعد فقط (نبدأ بسيطًا، ثم نعمّقه).
// المهم: المستخدم يكتب «الماء كيقطر» لا «سباك» — والمحرّك يفهم.
// ============================================================

export type Intent =
  | 'sell' | 'create_service' | 'create_store'
  | 'buy' | 'find_pro' | 'rent' | 'book' | 'urgent'
  | 'manage' | 'unknown';

// خيار في سؤال موجّه: نصّه، ووجهته (صفحة داخلية أو رابط عام)، وخطوته التالية
export interface NeedOption {
  label: string;
  page?: Page;
  url?: string;
  next?: string;
}

// خطوة محادثة موجّهة: سؤال + خيارات
export interface NeedStep {
  q: string;
  options: NeedOption[];
}

export interface NeedResult {
  intent: Intent;
  label: string;          // وصف عربي للنيّة (يُعرض كشارة)
  color: string;          // لون الشارة (CSS var)
  tags: string[];         // تفاصيل مُستخرَجة (فئة/مكان/وقت…)
  page?: Page;            // وجهة داخل التطبيق
  url?: string;           // وجهة عامّة (السوق/اكتشف)
  next: string;           // اقتراح الخطوة التالية
  steps?: NeedStep[];     // إن كانت النيّة تحتاج توضيحًا: أسئلة موجّهة
  open?: string;          // جملة افتتاح ودّية عند وجود أسئلة
  object?: NeedObject;    // الكائن المنظّم لهذا الطلب (للتسجيل والتعلّم)
  confidence?: number;    // 0..1 — درجة اليقين. المنخفضة تعني: اسأل توضيحًا.
}

// السياق: ما يحيط بالطلب (لا الطلب وحده) — الوقت، المكان، وما نعرفه عن المستخدم.
// «بغيت سباك» فـ 23:30 ليست مثلها فـ 09:00.
export interface NeedContext {
  hour?: number;   // ساعة اليوم (0-23) — الليل يرفع الاستعجال
  city?: string;   // مدينة المستخدم — تُستعمل للتقريب إن لم يذكر مكانًا
}

// NeedObject — كل جملة، مهما اختلفت صياغتها، تتحوّل إلى هذا الكائن الموحّد.
// هو ما يعمل عليه باقي النظام (التوجيه، التسجيل، ولاحقًا Experience Graph/AI).
export interface NeedObject {
  raw: string;                                   // ما كتبه المستخدم
  intent: Intent;
  urgency: 'emergency' | 'high' | 'normal';
  language: 'darija' | 'fr/en';
  category?: string;    // صنف/نوع
  profession?: string;  // مهنة/حرفة/تخصّص
  problem?: string;     // مشكل موصوف
  target?: string;      // لِمَن
  location?: string;    // مكان/مدينة
  budget?: string;      // ميزانية مذكورة
  confidence?: number;  // درجة يقين الفهم (0..1)
  reason?: string;      // شرحٌ لكيفيّة فهم النيّة (طبقة النيّة الإنسانيّة)
  at: number;
}

// ── تطبيع الدارجة: توحيد الهمزات والتاء المربوطة وإزالة التشكيل ──
export function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const has = (t: string, words: string[]) => words.some(w => t.includes(w));

// ── معاجم الدارجة ──────────────────────────────────────────
const URGENT = ['ضروري', 'دابا', 'عاجل', 'مستعجل', 'فيسع', 'مزربان', 'حالا', 'دغيا'];
// كلمات «الطلب» (أريد/أبحث) — تميّز «بغيت بنّاي» (يطلب) عن «أنا بنّاي» (يعلن)
const WANT = ['بغيت', 'باغي', 'نحتاج', 'خصني', 'نقلب', 'كنقلب', 'وين', 'فين', 'علاش'];
// مِهَن يُطلب أصحابها مباشرة (غير مرتبطة بمشكل موصوف)
const PROFESSIONS = ['طبيب', 'دكتور', 'محامي', 'استاذ', 'معلم', 'مدرب', 'مصور', 'خياط', 'طباخ', 'مربيه', 'مدبره'];
const SELL = ['نبيع', 'للبيع', 'بيعان', 'نسوق', 'عندي ما نبيع', 'باغي نبيع', 'بغيت نبيع'];
const BUY = ['نشري', 'شراء', 'نقلب على', 'كنقلب', 'باغي نشري', 'بغيت نشري', 'وين نلقى', 'فين نلقى'];
const RENT = ['كراء', 'نكري', 'للكراء', 'نكتري', 'نسكن'];
const BOOK = ['موعد', 'نحجز', 'حجز', 'رونديفو'];

// مشاكل شائعة → مهنة (المستخدم يصف المشكل، لا المهنة)
const PROBLEM_TO_PRO: { kw: string[]; pro: string; urgentByDefault?: boolean }[] = [
  { kw: ['الماء كيقطر', 'كيقطر', 'تقطر', 'تسريب', 'تسرب', 'صنبور', 'روبيني', 'قنوات', 'بالوعه'], pro: 'سبّاك', urgentByDefault: true },
  { kw: ['الضو طاح', 'طاح الضو', 'طياح الضو', 'كهربا', 'التيار', 'دارت شرارة', 'ما كاينش الضو', 'كورا كهربائي', 'ديسجونكتور'], pro: 'كهربائي', urgentByDefault: true },
  { kw: ['الثلاجه', 'الفريجيدير', 'ما كتبردش', 'المكيف', 'الكليماتيزور'], pro: 'تقني تبريد' },
  { kw: ['الباب', 'السرجوم', 'الحديد', 'لحام'], pro: 'حدّاد' },
  { kw: ['صباغه', 'نصبغ', 'الحيط'], pro: 'صبّاغ' },
  { kw: ['التلفون', 'الشاشه', 'الهاتف', 'البورطابل'], pro: 'تقني هواتف' },
];

// مِهَن يعلن المستخدم أنه يمارسها → إنشاء صفحة خدمة
const IAM_PRO: { kw: string[]; pro: string }[] = [
  { kw: ['كنصبغ', 'الصباغه', 'صباغ'], pro: 'صبّاغ' },
  { kw: ['حداد', 'كنلحم'], pro: 'حدّاد' },
  { kw: ['كوافور', 'كوافوره', 'حلاق'], pro: 'كوافير' },
  { kw: ['كنصايب الثلاجات', 'تقني تبريد', 'كنصلح المكيفات'], pro: 'تقني تبريد' },
  { kw: ['كنركب كاميرات', 'كاميرات', 'بارابول', 'ويفي', 'كنصلح التليفونات'], pro: 'تقني تركيبات' },
  { kw: ['سباك', 'كنصلح الماء'], pro: 'سبّاك' },
  { kw: ['بناي', 'كنبني'], pro: 'بنّاي' },
  { kw: ['نجار', 'الخشب'], pro: 'نجّار' },
];

const MARKET = '/market';
const EXPLORE = '/explore';

// أسئلة موجّهة جاهزة
const HOUSE_STEPS: NeedStep[] = [{
  q: 'شرا ولا كرا؟',
  options: [
    { label: 'شراء', url: MARKET, next: 'يعرض عقارات للبيع حسب مدينتك.' },
    { label: 'كراء', url: MARKET, next: 'يعرض عقارات للكراء حسب مدينتك.' },
  ],
}];

const proStep = (pro: string): NeedStep[] => ([{
  q: `${pro} — دابا ولا نحجز موعد؟`,
  options: [
    { label: 'دابا — مستعجل', url: `${MARKET}?urgent=1`, next: `يعرض أقرب ${pro} متاح الآن قربك.` },
    { label: 'نحجز موعد', page: 'bookings', next: `يفتح حجز موعد مع ${pro}.` },
  ],
}]);

// ── المحرّك ─────────────────────────────────────────────────
function coreParse(raw: string): NeedResult {
  const t = normalize(raw);
  const urgent = has(t, URGENT);
  const wants = has(t, WANT);

  // 1) مشكل عاجل موصوف (أهمّ حالة): «الماء كيقطر»، «طاح الضو»
  for (const p of PROBLEM_TO_PRO) {
    if (has(t, p.kw)) {
      const isUrgent = urgent || p.urgentByDefault;
      return {
        intent: isUrgent ? 'urgent' : 'find_pro',
        label: isUrgent ? 'عاجل' : 'حِرفي',
        color: isUrgent ? 'var(--red,#F5484A)' : 'var(--info,#3B82F6)',
        tags: [`المشكل → ${p.pro}`, ...(isUrgent ? ['اليوم'] : [])],
        url: isUrgent ? `${MARKET}?urgent=1` : MARKET,
        next: isUrgent
          ? `أقرب ${p.pro} متاح الآن — بلا ما تبحث بنفسك.`
          : `${p.pro} متاحون قربك حسب التقييم.`,
      };
    }
  }

  // 2) «أنا كندير…» → إنشاء صفحة خدمة (فقط إن كان يعلن عن نفسه، لا إن كان يطلب حرفيًّا)
  for (const p of IAM_PRO) {
    if (!wants && has(t, p.kw)) {
      return {
        intent: 'create_service',
        label: 'إنشاء خدمة',
        color: 'var(--mint,#12A150)',
        tags: [`مهنة → ${p.pro}`],
        page: 'publish',
        next: `ننشئ صفحة «${p.pro}» ديالك — أمانزين يبني السيناريو المناسب من جملتك.`,
      };
    }
  }

  // 3) «عندي محل…» → إنشاء متجر
  if (has(t, ['عندي محل', 'محل ديالي', 'مطعم', 'كافي', 'سناك', 'حانوت', 'بقاله'])) {
    return {
      intent: 'create_store',
      label: 'إنشاء متجر',
      color: 'var(--mint,#12A150)',
      tags: ['نوع → متجر/مطعم'],
      page: 'settings',
      next: 'نجهّز متجرك — الاسم، الشعار، والمنتجات — وننشره للزبناء.',
    };
  }

  // 4) عقار (كراء/شراء دار)
  if (has(t, ['دار', 'شقه', 'منزل', 'ستوديو', 'فيلا', 'محل تجاري']) || has(t, RENT)) {
    // «عندي … للكراء/للبيع» = عرض (نشر) → محرّك السيناريوهات؛ وإلّا = بحث → السوق.
    const offering = has(t, ['عندي', 'عندنا', 'كنكري', 'للكراء عندي']) && !wants;
    if (offering) {
      return {
        intent: has(t, RENT) ? 'rent' : 'sell',
        label: has(t, RENT) ? 'كراء' : 'عقار للبيع',
        color: 'var(--mint,#12A150)',
        tags: has(t, RENT) ? ['عرض كراء'] : ['عرض عقار'],
        page: 'publish',
        next: 'نبنيو إعلان العقار من جملتك مباشرة.',
      };
    }
    return {
      intent: has(t, RENT) ? 'rent' : 'buy',
      label: 'عقار',
      color: 'var(--info,#3B82F6)',
      tags: has(t, RENT) ? ['كراء'] : [],
      open: 'مزيان 👍 كتقلب على عقار.',
      steps: HOUSE_STEPS,
      next: 'نوجّهك للعقارات المناسبة بسؤال واحد.',
      url: MARKET,
    };
  }

  // 5) بيع عام → النشر الموحّد مباشرة (روح AMANZINE: من جملة، لا من نموذج)
  if (has(t, SELL)) {
    return {
      intent: 'sell',
      label: 'بيع',
      color: 'var(--ember,#FF6A00)',
      tags: [],
      page: 'publish',
      next: 'نفتح النشر الذكيّ — تكتب أو تصوّر وأمانزين يهيّئ الإعلان تلقائيًّا.',
    };
  }

  // 5.5) طلب مهنة عامّة بالاسم: «كنقلب على طبيب»
  if (has(t, PROFESSIONS)) {
    const pro = PROFESSIONS.find(p => t.includes(p)) || 'مختصّ';
    // طبيب بلا تخصّص = يقين منخفض ⇒ نسأل «شنو التخصّص؟» قبل التوجيه.
    if ((pro === 'طبيب' || pro === 'دكتور') && !has(t, ['اسنان', 'عظام', 'جلد', 'اطفال', 'عيون', 'قلب', 'عام'])) {
      return {
        intent: 'find_pro', label: 'حِرفي', color: 'var(--info,#3B82F6)', tags: ['تخصّص → طبيب'],
        open: 'واخّا 👍 باغي طبيب.',
        steps: [{ q: 'شنو التخصّص؟', options: [
          { label: 'عامّ', url: MARKET, next: 'أطبّاء عامّون متاحون قربك.' },
          { label: 'أسنان', url: MARKET, next: 'أطبّاء أسنان قربك.' },
          { label: 'عظام', url: MARKET, next: 'أطبّاء عظام قربك.' },
          { label: 'جلد', url: MARKET, next: 'أطبّاء جلد قربك.' },
          { label: 'أطفال', url: MARKET, next: 'أطبّاء أطفال قربك.' },
        ] }],
        next: 'نحدّد التخصّص باش نوصلك بالأنسب.',
      };
    }
    return {
      intent: urgent ? 'urgent' : 'find_pro',
      label: urgent ? 'عاجل' : 'حِرفي',
      color: urgent ? 'var(--red,#F5484A)' : 'var(--info,#3B82F6)',
      tags: [`تخصّص → ${pro}`, ...(urgent ? ['اليوم'] : [])],
      url: urgent ? `${MARKET}?urgent=1` : MARKET,
      next: `نوصلك بأقرب ${pro} متاح${urgent ? ' الآن' : ''} قربك.`,
    };
  }

  // 6) طلب حِرفي بالاسم: «بغيت سباك»، «بغيت بناي»
  for (const p of IAM_PRO) {
    if (has(t, [p.pro, ...p.kw]) && wants) {
      return {
        intent: urgent ? 'urgent' : 'find_pro',
        label: urgent ? 'عاجل' : 'حِرفي',
        color: urgent ? 'var(--red,#F5484A)' : 'var(--info,#3B82F6)',
        tags: [`حرفة → ${p.pro}`],
        open: `واخّا 👍 باغي ${p.pro}.`,
        steps: proStep(p.pro),
        next: `نوصلك بأقرب ${p.pro} مناسب.`,
      };
    }
  }

  // 7) موعد/حجز
  if (has(t, BOOK)) {
    return {
      intent: 'book',
      label: 'حجز',
      color: 'var(--purple,#8B5CF6)',
      tags: [],
      page: 'bookings',
      next: 'يفتح الحجوزات — تختار المزوّد والوقت المناسب.',
    };
  }

  // 8) شراء / بحث عام
  if (has(t, BUY) || has(t, ['صباط', 'تليفون', 'حوايج', 'موبيليا', 'ماكله'])) {
    return {
      intent: 'buy',
      label: 'شراء',
      color: 'var(--info,#3B82F6)',
      tags: [],
      url: MARKET,
      next: 'يعرض السوق نتائج مطابقة قربك، حسب الثمن.',
    };
  }

  // 9) إدارة/متابعة (بائع): طلبات، مبيعات، رسائل…
  if (has(t, ['الطلبات', 'شحال بعت', 'المبيعات', 'الارباح', 'الاحصائيات'])) {
    return { intent: 'manage', label: 'متابعة', color: 'var(--ember,#FF6A00)', tags: [], page: 'orders', next: 'يفتح طلباتك وحالاتها.' };
  }
  if (has(t, ['الرسايل', 'رسايل', 'الزبناء', 'محادثات'])) {
    return { intent: 'manage', label: 'متابعة', color: 'var(--ember,#FF6A00)', tags: [], page: 'conversations', next: 'يفتح رسائل زبنائك في مكان واحد.' };
  }

  // 10) غير مفهوم → اقتراح التصفّح
  return {
    intent: 'unknown',
    label: 'بحث',
    color: 'var(--ink3,#7E877F)',
    tags: [],
    url: EXPLORE,
    next: 'ما فهمناش بالضبط — نوجّهك لاكتشف كل شيء، أو جرّب صياغة أخرى.',
  };
}

// ── طبقة السياق: تُثري النيّة بما يحيط بها (لا الطلب وحده) ──
// budget: «ب 1000 درهم» · الوقت: الليل يرفع الاستعجال · المكان: مدينة المستخدم.
function enrich(r: NeedResult, t: string, ctx: NeedContext): NeedResult {
  const consumer = r.intent === 'buy' || r.intent === 'find_pro' || r.intent === 'rent' || r.intent === 'urgent';

  // ميزانية مذكورة: «ب1000 درهم»، «فحدود 500 درهم»
  const bud = t.match(/(\d[\d.,]*)\s*(درهم|dh|dhs|درهما)/);
  if (bud && consumer) r.tags = [...r.tags, `ميزانية: ${bud[1]} درهم`];

  // مكان: إن لم يذكر المستخدم مكانًا وعندنا مدينته (\b لا يعمل مع العربية، فنبحث مباشرة)
  const mentionsPlace = /(الحي|حي |زنقه|شارع|دوار|حومه|الدار البيضاء|الرباط|مراكش|طنجه|اكادير|فاس|مكناس|وجده|سلا|تطوان)/.test(t);
  if (ctx.city && consumer && !mentionsPlace) r.tags = [...r.tags, `قربك: ${ctx.city}`];

  // الوقت: طلب حِرفي في الليل → غالبًا مستعجل
  const night = ctx.hour != null && (ctx.hour >= 22 || ctx.hour < 6);
  if (night && r.intent === 'find_pro') {
    r.intent = 'urgent';
    r.label = 'عاجل';
    r.color = 'var(--red,#F5484A)';
    r.tags = [...r.tags, 'الوقت: ليل — غالبًا مستعجل'];
    r.next = `الوقت متأخّر — نوجّهك مباشرة لأقرب مختصّ متاح الآن.`;
    r.url = r.url && r.url.includes('urgent') ? r.url : `${MARKET}?urgent=1`;
    r.steps = undefined; // في الليل لا نضيّع الوقت بأسئلة
  } else if (night && r.intent === 'urgent') {
    r.tags = [...r.tags, 'الوقت: ليل'];
  }
  return r;
}

// يبني الكائن المنظّم من النتيجة + النصّ + السياق (يقرأ الوسوم «مفتاح → قيمة»).
function buildNeedObject(r: NeedResult, raw: string, ctx: NeedContext): NeedObject {
  const t = normalize(raw);
  const o: NeedObject = {
    raw: raw.trim(),
    intent: r.intent,
    urgency: r.intent === 'urgent' ? 'emergency' : has(t, URGENT) ? 'high' : 'normal',
    language: /[a-z]/i.test(raw) ? 'fr/en' : 'darija',
    at: Date.now(),
  };
  for (const tag of r.tags) {
    const i = tag.indexOf('→');
    if (i < 0) continue;
    const key = tag.slice(0, i).trim();
    const val = tag.slice(i + 1).trim();
    if (key.includes('حرفة') || key.includes('مهنة') || key.includes('تخصّص') || key.includes('المشكل')) o.profession = val;
    else if (key.includes('صنف') || key.includes('نوع') || key.includes('مجال')) o.category = val;
    else if (key.includes('لِمَن')) o.target = val;
  }
  const bud = t.match(/(\d[\d.,]*)\s*(درهم|dh|dhs)/);
  if (bud) o.budget = `${bud[1]} درهم`;
  const place = r.tags.find(x => x.startsWith('قربك') || x.startsWith('المكان') || x.startsWith('مكان'));
  o.location = (place ? place.split(':').pop()?.trim() : undefined) || ctx.city;
  return o;
}

// درجة اليقين: تحدّد متى يُوجّه المحرّك مباشرة، ومتى يسأل توضيحًا.
function confidenceOf(r: NeedResult): number {
  if (r.steps && r.steps.length) return 0.5;   // يحتاج جوابًا واحدًا قبل الحسم (أولويّة)
  if (r.intent === 'unknown') return 0.3;
  if (r.intent === 'urgent') return 0.97;
  if (['create_service', 'create_store', 'sell', 'manage', 'book'].includes(r.intent)) return 0.9;
  if (['find_pro', 'rent'].includes(r.intent)) return 0.86;
  if (r.intent === 'buy') return r.tags.length ? 0.8 : 0.6;
  return 0.7;
}

// ── طبقة النيّة الإنسانيّة → محادثة موجّهة ──────────────────
// تُترجم «ماذا يحاول الإنسان أن يفعل؟» إلى ترحيبٍ + سؤالٍ واحدٍ يقود للمسار الصحيح،
// بدل قفزةٍ خاطئةٍ لنموذج. تُبنى على نفس بنية NeedStep فتظهر مباشرةً في الواجهة.
function humanResult(intent: HumanIntent): NeedResult | null {
  switch (intent) {
    case 'HELP':
      return {
        intent: 'find_pro', label: 'مساعدة', color: 'var(--info,#3B82F6)', tags: [],
        open: 'فهمت أنّك محتاج مساعدة 🤝 نكتشفو المشكل بجوج، خطوة بخطوة — آش وقع بالضبط؟',
        steps: [{ q: 'أشنو نوع المشكل؟', options: [
          { label: '💧 الماء (تسرّب، صنبور، بالوعة…)', url: `${MARKET}?urgent=1`, next: 'نوصلوك بأقرب سبّاك متاح قربك.' },
          { label: '⚡ الكهرباء (الضو، التيار…)', url: `${MARKET}?urgent=1`, next: 'نوصلوك بأقرب كهربائي متاح قربك.' },
          { label: '❄️ جهاز خربان (ثلّاجة، مكيّف، تلفون…)', url: MARKET, next: 'نوصلوك بتقني الأجهزة المناسب.' },
          { label: '💻 حاسوب / شبكة / إنترنت', url: `${MARKET}?q=${encodeURIComponent('تقني معلوماتيّة')}`, next: 'نوصلوك بتقني معلوماتيّة قربك.' },
          { label: '🔨 حاجة أخرى فالدار (باب، صباغة، خشب…)', url: MARKET, next: 'نوصلوك بالحرفيّ المناسب قربك.' },
        ] }],
        next: 'نفهمو المشكل باش نوصلوك بالمختصّ الصحيح — بلا ما تبحث بنفسك.',
      };
    case 'SELF':
      return {
        intent: 'create_service', label: 'تعريف', color: 'var(--mint,#12A150)', tags: [],
        open: 'فهمت أنّك مزوّد خدمة 👋 مرحبا بيك — نعرفوك مزيان باش نوصّلوك للناس اللي محتاجينك.',
        steps: [{ q: 'شنو نوع الخدمة اللي كتقدّم؟', options: [
          { label: '🔧 حرفيّ / صنايعي (سبّاك، كهربائي، نجّار…)', page: 'publish', next: 'ننشئ صفحة الخدمة ديالك من وصفك مباشرة.' },
          { label: '🎓 مهنيّ (طبيب، محامي، أستاذ، مصوّر…)', page: 'publish', next: 'ننشئ صفحة مهنيّة ليك يلقّاوها الزبناء.' },
          { label: '🏪 عندي محلّ / متجر', page: 'settings', next: 'نجهّزو المتجر ديالك وننشروه.' },
          { label: '✍️ حاجة أخرى — نوضّح بكلماتي', page: 'publish', next: 'كتب التفاصيل وأمانزين يبني الإعلان.' },
        ] }],
        next: 'نعرفو الخدمة ديالك باش نوصّلوها للزبناء المناسبين.',
      };
    case 'SELL':
      return {
        intent: 'sell', label: 'بيع', color: 'var(--ember,#FF6A00)', tags: [],
        open: 'فهمت أنّك باغي تبيع 👍 نعاونوك — غير قول لينا شنو.',
        steps: [{ q: 'شنو باغي تبيع؟', options: [
          { label: '📦 سلعة / منتج', page: 'publish', next: 'نبنيو الإعلان من وصفٍ ولا تصويرة.' },
          { label: '🚗 سيّارة / مركبة', page: 'publish', next: 'نبنيو إعلان السيّارة من جملتك.' },
          { label: '🏠 عقار (دار، محلّ، أرض…)', page: 'publish', next: 'نبنيو إعلان العقار مباشرة.' },
          { label: '🔧 خدمة كنقدّمها', page: 'publish', next: 'ننشئ صفحة الخدمة ديالك.' },
        ] }],
        next: 'نحدّدو شنو باغي تبيع باش نبنيو الإعلان المناسب.',
      };
    case 'BUY':
      return {
        intent: 'buy', label: 'شراء', color: 'var(--info,#3B82F6)', tags: [],
        open: 'فهمت أنّك كتقلب على شي حاجة 👋 نلقّيوها ليك — شنو هي؟',
        steps: [{ q: 'شنو باغي تشري؟', options: [
          { label: '📱 إلكترونيك (تليفون، حاسوب…)', url: MARKET, next: 'نعرضو ليك المتوفّر قربك حسب الثمن.' },
          { label: '👕 حوايج / لباس', url: MARKET, next: 'نعرضو ليك أقرب النتائج.' },
          { label: '🛋️ أثاث / موبيليا', url: MARKET, next: 'نعرضو ليك المتوفّر قربك.' },
          { label: '🔎 حاجة أخرى — نكتب بالتفصيل', url: EXPLORE, next: 'كتب اللي محتاج ونقلّبو ليك.' },
        ] }],
        next: 'نحدّدو شنو باغي تشري باش نلقّيوه ليك بسرعة.',
      };
    case 'EXPLORE':
      return {
        intent: 'unknown', label: 'اكتشاف', color: 'var(--ink3,#7E877F)', tags: [],
        open: 'مرحبا بيك 👋 دخل تشوف على راحتك — ملّي تلقى شي حاجة تعجبك ولا محتاجها، غير گولها لينا.',
        steps: [{ q: 'من أين تحبّ تبدا؟', options: [
          { label: '🛍️ نشوف السوق (سلع وخدمات قربي)', url: MARKET, next: 'نعرضو ليك المتوفّر قربك.' },
          { label: '🧰 نشوف الخدمات والحرفيّين', url: `${MARKET}?type=service`, next: 'نعرضو ليك المزوّدين قربك.' },
          { label: '✨ نشوف الجديد', url: EXPLORE, next: 'نعرضو ليك آخر ما نُشر.' },
          { label: '✍️ عندي شي فبالي — نكتبو', url: EXPLORE, next: 'كتب اللي محتاج ونقلّبو ليك.' },
        ] }],
        next: 'اكتشف على راحتك، والعقل معاك ملّي تحتاجه.',
      };
    case 'QUESTION':
      return {
        intent: 'find_pro', label: 'مساعدة', color: 'var(--info,#3B82F6)', tags: [],
        open: 'مرحبا بيك 👋 أنا هنا نعاونك — ما تحتاجش تعرف تستعمل التطبيق، غير قول لي أش حاب تدير.',
        steps: [{ q: 'أش حاب تدير دابا؟', options: [
          { label: '🔎 كنقلب على شي حاجة ولا مختصّ', url: MARKET, next: 'كتب اللي محتاج ونلقّيوه ليك.' },
          { label: '🏷️ بغيت نبيع ولا نعلن', page: 'publish', next: 'نبنيو الإعلان ديالك بسهولة.' },
          { label: '🧑‍🔧 عندي خدمة / محلّ نقدّمو', page: 'publish', next: 'ننشئ صفحتك يلقّاوها الزبناء.' },
          { label: '🧭 غير كنجرّب نشوف', url: EXPLORE, next: 'نكتشفو التطبيق معاك.' },
        ] }],
        next: 'نبداو بسؤالٍ بسيط ونمشيو معاك خطوة بخطوة.',
      };
    default:
      return null;
  }
}

// المدخل العام: يفهم النيّة ثم يُثريها بالسياق (Understanding = طلب + سياق).
export function parseNeed(raw: string, ctx: NeedContext = {}): NeedResult {
  // طبقةٌ أولى — «ماذا يحاول هذا الإنسان أن يفعل؟» قبل تصنيف المهنة/المنتج.
  const human = readHuman(raw);
  const hr = human.intent !== 'NONE' ? humanResult(human.intent) : null;
  if (hr) {
    hr.confidence = confidenceOf(hr);
    hr.object = buildNeedObject(hr, raw, ctx);
    if (hr.object) { hr.object.confidence = hr.confidence; hr.object.reason = human.reason; }
    return hr;
  }
  const r = enrich(coreParse(raw), normalize(raw), ctx);
  r.confidence = confidenceOf(r);
  r.object = buildNeedObject(r, raw, ctx);
  if (r.object) r.object.confidence = r.confidence;
  return r;
}

// أمثلة تدرِّب المستخدم على الكتابة الطبيعية (تظهر تحت الخانة)
export const NEED_EXAMPLES: string[] = [
  'أنا كنبيع',              // نيّة بيع مبهمة → نسأل شنو
  'عندي مشكل فالدار',       // مساعدة (لا عقار)
  'أنا نجّار',               // تعريفٌ بالنفس
  'خاصني سباك',             // طلبُ حرفيّ
  'الماء كيقطر ضروري',       // عَرَضٌ موصوف → عاجل
  'واش ممكن تعاونّي؟',       // سؤالٌ عامّ → ترحيبٌ وإرشاد
  'بغيت نشري لبنتي صباط',    // شراءٌ محدّد
  'عندي محل للمأكولات',      // صاحب متجر
  'كنقلب على طبيب',          // مهنة بالاسم
  'بغيت دار للكراء فالحي الحسني',
];
