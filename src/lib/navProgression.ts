import { PAGE_IDS, type Page } from '../types';

// ============================================================
// قائمةٌ تكبر مع المستخدم — HU-7 / HU-5.
//
//   القائمةُ تعرض ٢٥ أداةً لمن دخل قبل ثلاثين ثانية. مَن جاء يبحث عن سبّاكٍ
//   يرى «الكوبونات» و«استوديو البانر» و«المحفظة»، ومَن جاء يبيع يرى كلَّ
//   شيءٍ دفعةً واحدةً فلا يعرف من أين يبدأ. معيارُ البيتا الذي كتبه المالك:
//   «هل يعرف خلال ٣٠ ثانية ماذا يفعل، دون أن يقرأ أيَّ شرح؟»
//
//   ثلاثةُ قوانين تحكم هذا الملفّ:
//
//   ① **الكشفُ بالدليل لا بالوقت.** لا مؤقّتَ ولا «يوم ٣». القسمُ يظهر حين
//      يصير له معنى: «الزبائن» حين يوجد زبون، «التوصيل» حين يوجد طلب. وهذا
//      هو `DR-0005` نفسُه (القانون ١٢): القدرةُ تُظهِر قسمَها.
//
//   ② **ما ظهر لا يختفي.** حذفُ منتجاتك لا يسحب منك صفحةَ المنتجات — قائمةٌ
//      تتقلّص تحت يد المستخدم أسوأُ من قائمةٍ طويلة. الزياراتُ تُحفَظ.
//
//   ③ **لا شيءَ يُحبَس.** «كلّ الأدوات» زرٌّ دائم. الإخفاءُ ترتيبُ أولويّاتٍ
//      لا منعٌ — ولو مُنع لصار الكشفُ التدريجيُّ حجبًا.
// ============================================================

/** ما يُرى في الدقيقة الأولى: البابُ، والحوار، والنشر، والعمل، والحساب. */
export const CORE_PAGES: Page[] = [
  'home', 'assistant', 'publish', 'orders', 'conversations',
  'profile', 'guide', 'settings',
];

/** ما يعرفه النظامُ عن المستخدم الآن — أدلّةٌ لا تخمين. */
export interface NavEvidence {
  products: number;
  services: number;
  orders: number;
  customers: number;
  /** صفحاتٌ زارها من قبل — تبقى ظاهرةً مهما تغيّرت البيانات. */
  visited?: Page[];
}

/**
 * شرطُ ظهورِ كلِّ صفحةٍ ليست أساسيّة. غيابُ الصفحة من هنا يعني «تظهر دائمًا»
 * (صفحاتُ أدمن المنصّة مثلًا — يرشّحها `NavBar` بصلاحيّاتها لا بهذا).
 */
const REVEALS: Partial<Record<Page, (e: NavEvidence) => boolean>> = {
  dashboard: e => e.products > 0 || e.orders > 0 || e.customers > 0,
  products:  e => e.products > 0,
  services:  e => e.services > 0,
  bookings:  e => e.services > 0 || e.orders > 0,
  customers: e => e.customers > 0 || e.orders > 0,
  coupons:   e => e.products > 0,

  banner:    e => e.products > 0,
  editor:    e => e.products > 0,
  import:    e => e.customers > 0 || e.products > 0,

  wallet:        e => e.orders > 0,
  delivery:      e => e.orders > 0,
  notifications: e => e.orders > 0 || e.customers > 0,
  connections:   e => e.products > 0 || e.orders > 0,
  insights:      e => e.orders > 0,
  analytics:     e => e.orders > 0,
};

/** هل تُعرَض هذه الصفحةُ الآن؟ */
export function isRevealed(page: Page, e: NavEvidence): boolean {
  if (CORE_PAGES.includes(page)) return true;
  if ((e.visited || []).includes(page)) return true;   // ما ظهر لا يختفي
  const rule = REVEALS[page];
  return rule ? rule(e) : true;
}

/** كم أداةً ما زالت مخفيّة — يُعرَض بجانب «كلّ الأدوات» فلا يبدو الزرُّ زخرفة. */
export function hiddenCount(pages: Page[], e: NavEvidence): number {
  return pages.filter(p => !isRevealed(p, e)).length;
}

// ── ذاكرةُ الزيارات ─────────────────────────────────────────
const VISITED_KEY = 'amanzine_visited_pages';

export function readVisited(): Page[] {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // نُرشّح بما هو صفحةٌ فعلًا: تخزينٌ قديمٌ أو مُلاعَبٌ لا يُدخل هويّاتٍ وهميّة.
    const known = new Set<string>(PAGE_IDS as readonly string[]);
    return arr.filter((x): x is Page => typeof x === 'string' && known.has(x));
  } catch { return []; }
}

/** يُسجّل زيارةً ويُرجع القائمةَ الجديدة (أو نفسَها إن لم يتغيّر شيء). */
export function rememberVisit(page: Page, current: Page[]): Page[] {
  if (current.includes(page)) return current;
  const next = [...current, page];
  try { localStorage.setItem(VISITED_KEY, JSON.stringify(next)); } catch { /* التخزينُ محجوب */ }
  return next;
}

// ── تفضيلُ «كلّ الأدوات» ────────────────────────────────────
const SHOW_ALL_KEY = 'amanzine_nav_show_all';

export function readShowAll(): boolean {
  try { return localStorage.getItem(SHOW_ALL_KEY) === '1'; } catch { return false; }
}

export function writeShowAll(v: boolean): void {
  try { localStorage.setItem(SHOW_ALL_KEY, v ? '1' : '0'); } catch { /* التخزينُ محجوب */ }
}
