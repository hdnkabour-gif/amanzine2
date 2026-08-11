// ============================================================
// **سِجلُّ ما يُحفَظ في المتصفّح — نطاقٌ ومدّةٌ لكلّ مفتاح.**
//
//   قِيس فوُجدت خمسةُ مفاتيحَ تُكتَب في المتصفّح، لكلٍّ منها قاعدةٌ مختلفةٌ
//   كتبها مَن كتبه ولم يجمعها أحد:
//
//     ai_commerce_os_state    ← منتجاتٌ وطلباتٌ وزبناءُ ومحادثات. **لا يُمسَح
//                               عند الخروج أبدًا** (صفرُ مواضعِ حذفٍ في `src`)،
//                               ويُقرأ في فرع انقطاع الخادم مع هويّةِ الداخل
//                               **الجديد**. فمستخدمٌ ثانٍ على نفس الجهاز يرى
//                               تجارةَ الأوّل.
//     amanzine_need           ← له مدّةٌ (نصفُ ساعة) تُفحَص عند القراءة.
//     amanzine_need_stance    ← **بلا مدّة**، وله كاتبان، ويُقرأ **قبل** الحاجة
//                               في `AuthPage`. فاتّجاهُ عرضٍ متروكٌ منذ ساعاتٍ
//                               يخطف أوّلَ دخولٍ لاحقٍ إلى صفحة النشر.
//     amanzine_need_seed      ← يُكتَب في كلّ توجيهٍ و**لا قارئَ له في المشروع**.
//     amanzine_publish_seed   ← بلا مدّة، ويعبر الخروج.
//
//   والتنظيفُ كان **غيرَ متماثل**: فرعُ العرض في `AuthPage` يمسح الاتّجاهَ
//   وحدَه، وفرعُ الطلب يمسح الحاجةَ وحدَها — فكلُّ رحلةٍ تترك مفتاحَ الأخرى
//   خلفها. والخروجُ لا يمسح أيًّا منها.
//
//   ── العلاجُ سِجلٌّ لا متجرٌ جديد ──
//   لا تُنشَأ خمسةُ مخازنَ ولا طبقةُ حالةٍ جديدة. يُعلَن لكلّ مفتاحٍ **نطاقُه**
//   و**مدّتُه**، ويصير الخروجُ يمرّ على السجلّ بدل أن يسمّي مفاتيحَ بعينها —
//   لأنّ التسميةَ تنسى، والمرورَ لا ينسى.
// ============================================================

/**
 * نطاقُ المفتاح — يحدّد متى يُمحى:
 *
 *   `identity` — يخصّ حسابًا بعينه. يُمحى عند كلّ تبدّلِ هويّة (دخولٌ أو خروج).
 *   `journey`  — يخصّ رحلةً جاريةً واحدة. يُمحى عند تبدّل الهويّة وعند انتهائها.
 *   `device`   — تفضيلٌ لا يخصّ حسابًا (سِمةٌ · لغة). يبقى.
 */
export type StateScope = 'identity' | 'journey' | 'device';

export interface StateKey {
  key: string;
  scope: StateScope;
  store: 'local' | 'session';
  /** مدّةُ الصلاحيّة بالمللي — `undefined` تعني بلا انتهاء (للنطاق `device` وحدَه). */
  ttlMs?: number;
  why: string;
}

/** نصفُ ساعة — نفسُ ما كان يفحصه `amanzine_need` وحدَه، يُعمَّم الآن. */
export const JOURNEY_TTL = 30 * 60 * 1000;

export const CLIENT_STATE: StateKey[] = [
  { key: 'ai_commerce_os_state', scope: 'identity', store: 'local', ttlMs: 24 * 60 * 60 * 1000,
    why: 'نسخةُ العمل للعمل بلا شبكة — منتجاتٌ وطلباتٌ وزبناء' },
  { key: 'ai_commerce_user', scope: 'identity', store: 'local',
    why: 'إسقاطُ هويّة المستخدم؛ الخادمُ هو المرجع' },
  { key: 'ai_commerce_pending_settings', scope: 'identity', store: 'local',
    why: 'إعداداتٌ لم تُرسَل بعد' },
  { key: 'amanzine_need', scope: 'journey', store: 'session', ttlMs: JOURNEY_TTL,
    why: 'الحاجةُ المكتوبةُ في صفحة الهبوط، تُستأنَف بعد الدخول' },
  { key: 'amanzine_need_stance', scope: 'journey', store: 'session', ttlMs: JOURNEY_TTL,
    why: 'أيَعرض أم يطلب — يقرّر وجهةَ ما بعد الدخول' },
  { key: 'amanzine_publish_seed', scope: 'journey', store: 'session', ttlMs: JOURNEY_TTL,
    why: 'نصُّ ما يريد نشرَه، يُستهلَك مرّةً في `CreateFlow`' },
  { key: 'amanzine_conversation', scope: 'journey', store: 'session', ttlMs: JOURNEY_TTL,
    why: 'أدوارُ الحوار داخل الرحلة الجارية — لا تاريخَ حسابٍ ولا خادم' },
  { key: 'ai_commerce_theme', scope: 'device', store: 'local',
    why: 'سِمةٌ يختارها صاحبُ الجهاز، لا تخصّ حسابًا' },
];

const BY_KEY = new Map(CLIENT_STATE.map(k => [k.key, k]));
const areaOf = (s: 'local' | 'session') =>
  (s === 'local' ? globalThis.localStorage : globalThis.sessionStorage);

/** يُغلَّف كلُّ ما يُكتَب بختمِ وقتٍ ومالك — بلا هذا لا تُفحَص مدّةٌ ولا هويّة. */
interface Envelope<T> { v: 1; at: number; owner?: string; data: T }

/**
 * يكتب قيمةً مختومةً.
 *
 *   `owner` يُمرَّر لمفاتيح النطاق `identity`: لا يكفي المسحُ عند الخروج، لأنّ
 *   المتصفّحَ قد يُغلَق فجأةً فيبقى ما كُتب. فالقراءةُ نفسُها تفحص المالك.
 */
export function writeState<T>(key: string, data: T, owner?: string): void {
  const k = BY_KEY.get(key);
  if (!k) return;                                   // مفتاحٌ غيرُ مُعلَنٍ لا يُكتَب
  try {
    areaOf(k.store).setItem(key, JSON.stringify({ v: 1, at: Date.now(), owner, data } as Envelope<T>));
  } catch { /* حصّةٌ ممتلئةٌ أو تخزينٌ ممنوع ⇒ لا نكسر شيئًا */ }
}

/**
 * يقرأ قيمةً ويُسقطها إن انتهت مدّتُها أو كان مالكُها غيرَ الحاضر.
 *
 *   **المالكُ يُفحَص قبل المدّة**: قيمةٌ لغيرِ الداخلِ الحاضر لا تُقرأ ولو كانت
 *   طازجة — وهذا هو ما يمنع أن يرى الثاني تجارةَ الأوّل.
 */
export function readState<T>(key: string, owner?: string): T | null {
  const k = BY_KEY.get(key);
  if (!k) return null;
  try {
    const raw = areaOf(k.store).getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (!env || env.v !== 1) { areaOf(k.store).removeItem(key); return null; }
    if (k.scope === 'identity' && env.owner && owner && env.owner !== owner) {
      areaOf(k.store).removeItem(key); return null;   // ليست لهذا الحساب
    }
    if (k.ttlMs && Date.now() - (env.at || 0) > k.ttlMs) { areaOf(k.store).removeItem(key); return null; }
    return env.data;
  } catch { return null; }
}

/** يقرأ ثمّ يمحو — للمفاتيح التي تُستهلَك مرّةً واحدة. */
export function consumeState<T>(key: string, owner?: string): T | null {
  const v = readState<T>(key, owner);
  clearState(key);
  return v;
}

export function clearState(key: string): void {
  const k = BY_KEY.get(key);
  if (!k) return;
  try { areaOf(k.store).removeItem(key); } catch { /* noop */ }
}

/**
 * **يُمحى كلُّ ما لا يخصّ الجهازَ عند تبدّل الهويّة.**
 *
 *   يُنادى عند الخروج وعند الدخول معًا. والمرورُ على السجلّ لا على أسماءٍ
 *   مكتوبةٍ هو كلُّ الفكرة: `store.tsx` كان يمسح `ai_commerce_user` وحدَه —
 *   مفتاحًا واحدًا من ثمانية — لأنّ من كتب السطرَ كتب ما يذكره.
 */
export function clearIdentityState(): void {
  for (const k of CLIENT_STATE) if (k.scope !== 'device') clearState(k.key);
}

/** يُمحى ما يخصّ الرحلةَ وحدَها — عند انتهائها أو عند «من جديد». */
export function clearJourneyState(): void {
  for (const k of CLIENT_STATE) if (k.scope === 'journey') clearState(k.key);
}
