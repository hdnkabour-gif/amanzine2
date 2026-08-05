// ============================================================
// حقائقُ الشخص — «ما الذي تغيّر في عالم هذا الإنسان؟»
//
//   قياسٌ على ٣٦ جملةً من المالك: عمودُ `facts` **صفرٌ في كلّها**. والسببُ
//   ليس عطبًا في `akg/kb/facts.ts` — ذاك يجيب عن **سؤال زبونٍ عن محلّ**
//   (شحال الثمن؟ واش كاين التوصيل؟). ولا شيءَ يلتقط ما يقوله الإنسانُ
//   **عن نفسه**: «أنا خضار» · «عندي محل» · «أنا فكازا».
//
//   والفرقُ عمليّ: من قال مهنتَه مرّةً لا يُسأل عنها ثانيةً، ومن قال مدينته
//   لا تُطلَب منه في كلّ طلب.
//
//   ── الخطرُ الذي يحكم هذا الملفّ كلَّه ──
//   **حقيقةٌ خاطئةٌ تدوم أسوأُ من صفرِ حقائق.** الجملةُ تُنسى، والحقيقةُ
//   تبقى وتسمّم كلَّ ما بعدها. ولذلك:
//
//   ① **التصريحُ وحدَه يُكتَب، لا الاستنتاج.** «أنا خضار» تصريح. و«بغيت
//      نبيع طوموبيل» نيّةٌ — ومن يبيع سيّارته مرّةً ليس بائعَ سيّارات.
//      هذا أهمُّ سطرٍ هنا: أغلبُ «الذكاء» يقع في استنتاج الهويّة من النيّة.
//
//   ② **كلُّ حقيقةٍ تحمل جملتَها.** بلا مصدرٍ لا يمكن عرضُها («عرفتُ هادشي
//      من: أنا خضار») ولا مراجعتُها ولا حذفُها. وحقيقةٌ بلا مصدرٍ شائعةٌ
//      لا معرفة.
//
//   ③ **مفاتيحُ ثابتةٌ لا مفتاحٌ لكلّ جملة.** المخزنُ يُزامَن إلى الخادم
//      بسقف ٥٠٠٠ مفتاح؛ مفتاحٌ لكلّ جملةٍ يملؤه في أسبوع.
//
//   ④ **بلا تخزينٍ هنا.** دالّةٌ نقيّة: تقرأ نصًّا وتُرجع حقائق. من يكتب
//      يقرّر في مكانٍ واحد — فيُختبَر الاستخراجُ وحدَه بلا متصفّح.
// ============================================================

import { understand } from './akg/kb';
import { resolveConcept } from './akg/kb/knowledge';
import { normLoose } from './normalize';

export type PersonFactKind = 'trade' | 'city' | 'hasWorkspace' | 'sells';

export interface PersonFact {
  kind: PersonFactKind;
  /** القيمةُ المعياريّة: مُعرِّفُ مفهومٍ للمهنة، اسمُ مدينةٍ للمكان. */
  value: string;
  /** ما يُقال للإنسان: «كتبيع الخضرة». */
  say: string;
  /** الجملةُ التي قالها — بلا مصدرٍ لا تُراجَع ولا تُحذَف. */
  from: string;
}

// ── علاماتُ التصريح ───────────────────────────────────────────
//
//   «أنا X» · «راني X» · «خدام X» · «كنخدم X» — إخبارٌ عن النفس.
//   ولا تدخل «بغيت» ولا «كنقلب» ولا «محتاج»: تلك نيّاتٌ لا هويّات.
const SELF = ['انا', 'راني', 'رانا', 'حنا', 'احنا', 'خدام', 'كنخدم', 'خدامه', 'ولد', 'مول'];

/** ملكيّةُ نشاطٍ: «عندي محل» · «عندي حانوت» · «فتحت متجر». */
const OWNS_SHOP = ['عندي محل', 'عندي حانوت', 'عندي دكان', 'عندي متجر', 'عندي بوتيك',
  'عندي مغازه', 'عندي صالون', 'عندي مقهي', 'عندي مطعم', 'عندي ورشه', 'عندي كراج',
  'فتحت محل', 'فتحت متجر', 'المحل ديالي', 'الحانوت ديالي', 'المتجر ديالي'];

/**
 * عملٌ **معتاد** لا صفقةٌ واحدة: «كنبيع» عادةٌ، و«بغيت نبيع» مرّة.
 * وصيغةُ «كن…» الدارجةُ هي علامةُ الاعتياد — تشمل الحرفةَ لا التجارةَ وحدَها
 * («كنصايب الحلويات» حلوانيّ، و«كنصلح» صنايعيّ).
 */
const HABITUAL_SELL = ['كنبيع', 'كنبيعو', 'كنشري ونبيع', 'تاجر', 'كنتاجر'];
const HABITUAL_CRAFT = ['كنصايب', 'كنصنع', 'كنصلح', 'كنخيط', 'كنطيب', 'كنركب',
  'كنغسل', 'كنصبغ', 'كنقص', 'كنحلق', 'كندير', 'صنايعي', 'حرفي'];

/**
 * ما يُبطل كلَّ تصريح: صيغةٌ لا تُلزم صاحبَها.
 *
 *   «قال ليا الزبون أنا خضار» ليست تصريحًا عنك. و«ماشي أنا خضار» نفيٌ.
 *   و«واش أنا خضار؟» سؤال. الكتابةُ على أيٍّ منها تسجّل هويّةً لم يقلها أحد.
 */
const BLOCKERS = ['قال ليا', 'قالت ليا', 'كيقول', 'الزبون', 'ماشي انا', 'واش انا',
  'شي واحد', 'صاحبي', 'خويا', 'كيفاش', 'واش نقدر', 'يمكن'];

/**
 * أفعالُ النيّة. وجودُها يُبطل دلالةَ «أنا» على الهويّة: «أنا بغيت نبيع
 * مواد التنظيف» **نيّةٌ لا حرفة** — الضميرُ هنا يسبق فعلًا، لا يصف صاحبَه.
 * ومن باع مرّةً ليس تاجرًا. أمّا «عندي محل» فتقف بنفسها ولا تُبطَل.
 */
const INTENT_VERBS = ['بغيت', 'باغي', 'بغينا', 'محتاج', 'خاصني', 'كنقلب', 'نقلب'];

const hit = (t: string, arr: string[]) => arr.some(w => t.includes(normLoose(w)));

/**
 * يقرأ حقائقَ الشخص من جملةٍ واحدة.
 *
 *   يُرجع `[]` عند أدنى شكّ. فالصمتُ هنا مجّانيّ (تُسأل الجملةُ التالية)،
 *   والخطأُ يدوم.
 */
export function readPersonFacts(raw: string): PersonFact[] {
  const t = normLoose(raw || '');
  if (!t || t.length < 4) return [];

  // صيغةٌ لا تُلزم ⇒ لا حقيقةَ مهما بدت الجملةُ صريحة.
  if (hit(t, BLOCKERS)) return [];

  const u = understand(raw);
  // النفيُ يُبطل، وصيغةُ غيرِ الالتزام كذلك (نقلٌ · شرطٌ · سؤالُ إمكان).
  if (u.negated || (u.mood && !u.mood.executable)) return [];

  const out: PersonFact[] = [];
  // «أنا» وحدَها ليست تصريحًا إن تبعها فعلُ نيّة.
  const declares = hit(t, SELF) && !hit(t, INTENT_VERBS);
  const owns = hit(t, OWNS_SHOP);
  const sellsHabitually = hit(t, HABITUAL_SELL);
  const craftsHabitually = hit(t, HABITUAL_CRAFT) && !hit(t, INTENT_VERBS);

  // ── الحرفة ──
  //   يُشترَط **تصريحٌ** («أنا خضار») أو **ملكيّةُ محلّ** («عندي محل ديال
  //   الخضرة») أو **بيعٌ معتاد** («كنبيع مواد التنظيف»). ولا يكفي أن تحمل
  //   الجملةُ مفهومًا: «بغيت ميكانيكي» فيها `mechanic` وصاحبُها ليس ميكانيكيًّا.
  if (u.service && (declares || owns || sellsHabitually || craftsHabitually)) {
    // **اسمٌ عربيٌّ لا مُعرِّفٌ تقنيّ.** كشفه تشغيلُ التطبيق: كان الشريطُ
    // يعرض «كتخدم ف greengrocer». والقانون ١٠ صريح — المستخدمُ لا يرى
    // المحرّكات. ولم يكشفه اختبارٌ لأنّ لا أحدَ سأل: بأيّ لغةٍ يُعرَض؟
    const c = resolveConcept(raw)?.concept;
    const label = u.profession?.label || c?.darija || c?.ar || u.service;
    out.push({ kind: 'trade', value: u.service, say: `كتخدم ف ${label}`, from: raw });
    if (sellsHabitually) out.push({ kind: 'sells', value: u.service, say: `كتبيع ${label}`, from: raw });
  }

  // ── المحلّ ──
  if (owns) out.push({ kind: 'hasWorkspace', value: 'true', say: 'عندك محلّ', from: raw });

  // ── المدينة ──
  //   المدينةُ تُقبَل بلا اشتراط تصريح: «بغيت سباك ف طنجة» تقول أين هو،
  //   مهما كانت نيّتُه. وهي الحقيقةُ الوحيدةُ التي لا تحتاج إعلانَ هويّة.
  if (u.city) out.push({ kind: 'city', value: u.city, say: `ف ${u.city}`, from: raw });

  return out;
}

/** سطرٌ يشرح ما تعلّمناه — يُعرَض ليُراجَع، لا ليُخفى. */
export function describeFacts(facts: PersonFact[]): string {
  if (!facts.length) return '';
  return facts.map(f => f.say).join(' · ');
}

// ── الكتابة ───────────────────────────────────────────────────
//
//   موضعٌ واحدٌ يكتب، ويحترم **عقدَ `knownContext`** حرفيًّا: يقرأ ثلاثةَ
//   مفاتيحَ لا غير (`city` · `activity` · `hasWorkspace`). فلو كتبنا
//   `profession` — كما يفعل `akg/userGraph.ts` المفصول — لما رآها أحد،
//   وصار عندنا شكلان لرسمٍ واحد.
//
//   والسقفُ: مفاتيحُ ثابتةٌ لا مفتاحٌ لكلّ جملة. المخزنُ يُزامَن بسقف ٥٠٠٠
//   مفتاحٍ على الخادم، ومفتاحٌ لكلّ جملةٍ يملؤه في أسبوع.

const GRAPH_KEY = 'amanzine_user_graph';

/** ما تُكتَب فيه كلُّ حقيقة — ثابتٌ ومحدود. */
const SLOT: Record<PersonFactKind, string> = {
  trade: 'activity', city: 'city', hasWorkspace: 'hasWorkspace', sells: 'sells',
};

function readGraph(): Record<string, unknown> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const v = JSON.parse(localStorage.getItem(GRAPH_KEY) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

/**
 * يحفظ ما تعلّمناه عن الشخص.
 *
 *   **الجديدُ يغلب القديم** — من قال «أنا فطنجة» اليوم فهو في طنجة ولو كان
 *   بالدار البيضاء أمس. الناسُ ينتقلون ويغيّرون حرفَهم، وذاكرةٌ لا تُحدَّث
 *   تصير عنادًا.
 *
 *   وكلُّ حقيقةٍ تُحفَظ مع **جملتها ووقتها** في `_src` — فتُعرَض ليراجعها
 *   صاحبُها، وتُحذَف حين يقول «ماشي هادشي». وبلا ذلك تصير المعرفةُ شائعةً
 *   لا يُعرَف من أين جاءت.
 *
 * @returns ما كُتب فعلًا (فارغةٌ إن لم يتغيّر شيء)
 */
export function rememberFacts(facts: PersonFact[]): PersonFact[] {
  if (!facts.length || typeof localStorage === 'undefined') return [];
  const g = readGraph();
  const src = (g._src && typeof g._src === 'object' ? g._src : {}) as Record<string, unknown>;
  const written: PersonFact[] = [];
  for (const f of facts) {
    const slot = SLOT[f.kind];
    const value: unknown = f.kind === 'hasWorkspace' ? true : f.value;
    if (JSON.stringify(g[slot]) === JSON.stringify(value)) continue;   // لا كتابةَ بلا تغيير
    g[slot] = value;
    src[slot] = { from: f.from.slice(0, 120), at: Date.now() };
    written.push(f);
  }
  if (!written.length) return [];
  g._src = src;
  try { localStorage.setItem(GRAPH_KEY, JSON.stringify(g)); } catch { return []; }
  return written;
}

/** ما نعرفه ومن أين — تعرضه الواجهةُ ليراجعه صاحبُه. */
export function factSources(): { slot: string; value: string; from: string }[] {
  const g = readGraph();
  const src = (g._src || {}) as Record<string, { from?: string }>;
  return Object.entries(src)
    .filter(([slot]) => g[slot] !== undefined)
    .map(([slot, v]) => ({ slot, value: String(g[slot]), from: String(v?.from || '') }));
}

/**
 * ينسى حقيقةً. **الشرطُ الذي يجعل الكتابةَ آمنة**: ما لا يُنسى لا يُكتَب،
 * لأنّ خطأً دائمًا أسوأُ من جهلٍ مؤقّت. يُستدعى من حلقة «ماشي هادشي».
 */
export function forgetFact(slot: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const g = readGraph();
  if (!(slot in g)) return false;
  delete g[slot];
  const src = (g._src && typeof g._src === 'object' ? g._src : {}) as Record<string, unknown>;
  delete src[slot];
  g._src = src;
  try { localStorage.setItem(GRAPH_KEY, JSON.stringify(g)); return true; } catch { return false; }
}
