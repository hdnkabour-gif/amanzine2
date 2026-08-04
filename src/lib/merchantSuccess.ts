import type { Page } from '../types';
import type { Nudge } from '../components/CommandCenter';
import { conceptGraph } from './akg/kb/knowledgeGraph';
import { resolveConcept } from './akg/kb/knowledge';

// ============================================================
// نجاحُ التاجر — «كيف نخلّي هاد التاجر ينجح؟»
//
//   الفرقُ بين لوحةِ تحكّمٍ وموظّفٍ ذكيّ: اللوحةُ تعرض أرقامًا وتنتظر، والموظّفُ
//   يلاحظ ويقترح. والتاجرُ لا يبحث عن الميزة — الميزةُ هي التي تجيء إليه.
//
//   **والهيكلُ كان موجودًا ميّتًا.** `Nudge` مُعرَّفٌ في `CommandCenter` ومُعلَنٌ
//   في خصائصها منذ زمن، **ولا أحدَ يمرّره** — قرارٌ (DR-0005) كُتب نصفُه.
//   هذا الملفُّ هو النصفُ الناقص.
//
//   وثلاثةُ قوانينَ تحكمه:
//
//   ① **لا اقتراحَ بلا سبب.** كلُّ ملاحظةٍ تُبنى على حالةٍ حقيقيّةٍ مقيسة
//      (لا صورة · لا هاتف · خدمةٌ واحدة)، لا على جدولٍ زمنيّ. «مضى أسبوع»
//      ليست سببًا؛ «صفحتُك بلا صورة» سبب.
//
//   ② **واحدٌ في المرّة.** عشرُ ملاحظاتٍ دفعةً واحدة ضجيجٌ يُغلَق ولا يُقرأ.
//      تُرتَّب بالأثر ويُعرَض أعلاها.
//
//   ③ **لا كذبَ في الأرقام.** «المحلّات اللي عندها ٥ تصاور كتاخد تفاعل أكثر»
//      جملةٌ لا نملك دليلَها بعد. نقول ما نعرفه: **ماذا ينقص صفحتَك**، لا
//      إحصاءً مخترَعًا. الثقةُ تُبنى مرّةً وتُهدَم مرّة.
// ============================================================

/** ما نعرفه عن حالِ التاجر الآن — كلُّه من بياناتٍ قائمةٍ لا من جدولٍ جديد. */
export interface MerchantState {
  /** مهنتُه أو نشاطُه كما هو مخزَّن («حلاق» · `barber`). */
  profession?: string;
  city?: string;
  district?: string;
  phone?: string;
  /** عددُ الصور المنشورة عبر كلّ ما ينشره. */
  photoCount: number;
  /** عددُ الخدمات/التخصّصات التي أعلنها. */
  serviceCount: number;
  /** عددُ المنتجات المنشورة. */
  productCount: number;
  /** عددُ الطلبات التي وصلته. */
  orderCount: number;
  /** هل ضبط أوقاتَ العمل؟ */
  hasHours: boolean;
  /** هل فعّل الحجز؟ */
  hasBooking: boolean;
  /** أسئلةُ الزبناء التي تكرّرت بلا جواب (من المحادثات). */
  askedAboutBooking?: number;
}

interface Rule {
  id: string;
  /** هل تنطبق الآن؟ */
  when: (s: MerchantState) => boolean;
  /** الأثرُ المتوقَّع — الترتيبُ به. الأعلى يُعرَض أوّلًا. */
  impact: number;
  text: (s: MerchantState) => string;
  cta: string;
  page: Page;
}

const RULES: Rule[] = [
  // ── ما يمنع الصفحةَ من العمل أصلًا ─────────────────────────
  {
    id: 'no_phone', impact: 100, page: 'settings', cta: 'زيد الرقم',
    when: s => !s.phone,
    text: () => 'الرقم ديالك ناقص — الزبون كيشوف الصفحة وما كيقدرش يتّصل بيك.',
  },
  {
    id: 'no_photo', impact: 95, page: 'products', cta: 'صوّر دابا',
    when: s => s.photoCount === 0,
    text: () => 'صفحتك بلا حتى تصويرة. صورة وحدة ديال المحلّ كتبدّل كلشي.',
  },
  {
    id: 'no_city', impact: 90, page: 'settings', cta: 'حدّد المدينة',
    when: s => !s.city,
    text: () => 'ما حدّدتيش المدينة — الناس اللي قراب منّك ما غاديش يلقاوك.',
  },
  // ── ما يجعل الصفحةَ تُقنع ──────────────────────────────────
  {
    id: 'no_district', impact: 70, page: 'settings', cta: 'زيد الحيّ',
    when: s => !!s.city && !s.district,
    text: s => `عندك المدينة (${s.city}) وما عندكش الحيّ. الزبون كيقلّب على اللي حداه.`,
  },
  {
    id: 'few_services', impact: 65, page: 'products', cta: 'زيد الخدمات',
    when: s => s.serviceCount <= 1,
    text: s => {
      // **الاقتراحُ من المعرفة لا من العدم.** نقول له ما يقدّمه أمثالُه فعلًا.
      const known = s.profession ? conceptGraph(resolveConcept(s.profession)?.id || '')?.services || [] : [];
      const extra = known.slice(0, 3).join(' · ');
      return extra
        ? `زيد شي خدمات أخرى باش تبان أكثر — بحال: ${extra}.`
        : 'زيد الخدمات اللي كتقدّم — كلّ خدمة كتزيد فرصة يلقاوك بيها.';
    },
  },
  {
    id: 'no_hours', impact: 55, page: 'settings', cta: 'حدّد الأوقات',
    when: s => !s.hasHours,
    text: () => 'ما حدّدتيش أوقات الخدمة — الزبون كيسول «واش محلول دابا؟».',
  },
  // ── ما يجيء بعد أن تعمل الصفحة ─────────────────────────────
  {
    id: 'few_photos', impact: 40, page: 'products', cta: 'زيد تصاور',
    when: s => s.photoCount > 0 && s.photoCount < 3,
    text: s => `عندك ${s.photoCount} تصويرة. زيد تصاور ديال الخدمة باش الزبون يشوف الخدمة قبل ما يجي.`,
  },
  {
    id: 'booking_asked', impact: 85, page: 'bookings', cta: 'فعّل الحجز',
    when: s => !s.hasBooking && (s.askedAboutBooking || 0) >= 2,
    text: s => `${s.askedAboutBooking} زبناء سولوك على الحجز. واش نفعّلوه ليك؟`,
  },
  {
    id: 'first_product', impact: 45, page: 'products', cta: 'زيد منتوج',
    when: s => s.orderCount > 0 && s.productCount === 0,
    text: () => 'كتوصلك طلبات وما عندكش منتوجات مسجّلة — زيدهم باش الطلب يمشي وحدو.',
  },
];

/**
 * ملاحظاتُ اليوم — مرتّبةً بالأثر.
 *
 *   `limit` افتراضُه واحد: عشرُ ملاحظاتٍ دفعةً واحدة ضجيجٌ يُغلَق ولا يُقرأ.
 */
export function nudgesFor(state: MerchantState, limit = 1): Nudge[] {
  return RULES
    .filter(r => { try { return r.when(state); } catch { return false; } })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, Math.max(0, limit))
    .map(r => ({ id: r.id, text: r.text(state), cta: r.cta, page: r.page }));
}

/** كلُّ المُعرِّفات — يقرؤها حارسٌ يمنع اقتراحًا بلا صفحةٍ يقود إليها. */
export function allNudgeRules(): { id: string; page: Page; impact: number }[] {
  return RULES.map(r => ({ id: r.id, page: r.page, impact: r.impact }));
}
