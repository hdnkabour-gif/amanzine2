import type { Page } from '../types';

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
const SELL_STEPS: NeedStep[] = [{
  q: 'شنو باغي تبيع؟',
  options: [
    { label: 'منتج', page: 'products', next: 'يفتح إضافة منتج — صورة، ثمن، ونشر.' },
    { label: 'خدمة', page: 'services', next: 'يفتح إنشاء خدمة — تصف عملك وأسعارك.' },
    { label: 'عقار', url: MARKET, next: 'ينشر عقارك في السوق.' },
    { label: 'سيارة', url: MARKET, next: 'ينشر سيارتك في السوق.' },
  ],
}];

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
export function parseNeed(raw: string): NeedResult {
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
        page: 'services',
        next: `ننشئ صفحة «${p.pro}» ديالك فدقيقتين — تظهر للباحثين قربك.`,
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

  // 5) بيع عام → سؤال موجّه: شنو باغي تبيع؟
  if (has(t, SELL)) {
    return {
      intent: 'sell',
      label: 'بيع',
      color: 'var(--ember,#FF6A00)',
      tags: [],
      open: 'فهمت 👍 باغي تبيع.',
      steps: SELL_STEPS,
      next: 'نختار نوع ما تبيعه، ونفتح النموذج المناسب.',
    };
  }

  // 5.5) طلب مهنة عامّة بالاسم: «كنقلب على طبيب»
  if (has(t, PROFESSIONS)) {
    const pro = PROFESSIONS.find(p => t.includes(p)) || 'مختصّ';
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

// أمثلة تدرِّب المستخدم على الكتابة الطبيعية (تظهر تحت الخانة)
export const NEED_EXAMPLES: string[] = [
  'بغيت نبيع',
  'الماء كيقطر ضروري',
  'بغيت نشري لبنتي صباط',
  'أنا كوافورة',
  'بغيت دار للكراء فالحي الحسني',
  'عندي محل للمأكولات',
  'كنقلب على طبيب',
  'بغيت بناي اليوم مع 15:00',
];
