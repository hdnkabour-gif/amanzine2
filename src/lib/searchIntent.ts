import { resolveConcept, resolveConcepts, conceptTerms } from './akg/kb/knowledge';
import { stanceOf, type Stance } from './akg/kb';
import { categoryForConcept, type CategoryKind } from './catalog';
import { priceCeiling } from './money';
import { readCondition, type Condition } from './condition';
// نوعٌ فقط — يُمحى عند الترجمة، فلا يجرّ طبقةَ الشبكة إلى العقل.
import type { SearchFilters } from '../services/api';

// ============================================================
// نيّةُ البحث — الطبقةُ التي كانت مفقودةً بين الزبون والفهرس.
//
//   ما كان يقع: التاجرُ يُفهَم بـ١٩٧ مفهومًا لها مرادفاتٌ بالدارجة والعربيّة
//   والفرنسيّة والإنجليزيّة والـArabizi، ومُطبِّعٌ يعالج «حلااااق ← حلاق».
//   والزبونُ يبحث بـ:
//
//       LOWER(name) LIKE '%…%' OR LOWER(description) LIKE '%…%'
//
//   فمن كتب «بلومبي» أو «plombier» أو «tomobil» لا يجد شيئًا، ولو كان
//   المطلوبُ أمامه في القاعدة. **العقلُ كلُّه كان يخدم التاجرَ وحدَه.**
//
//   الطبقتان — ولا ثالثة:
//
//       استعلامُ الزبون
//            ↓  (هنا، في المتصفّح — قانون «الفهمُ لا يسكن الخادم»، ADR ③)
//       نيّةٌ مُطبَّعة: مفهوم + مرادفاتٌ بكلّ اللغات + فئة
//            ↓
//       محرّكُ البحث: يبحث في الفهارس ولا يعرف شيئًا عن الدارجة
//
//   لا تنتقل المعرفةُ إلى SQL، ولا يصير محرّكُ البحث مسؤولًا عن اللغة.
// ============================================================

export interface SearchIntent {
  /** ما كتبه الزبون كما هو. */
  raw: string;
  /** مُعرِّفُ المفهوم إن فُهم — «بلومبي» ⇒ `plumber`. */
  concept?: string;
  /** تسميةٌ عربيّةٌ للعرض: «كتبحث على: سباك». */
  label?: string;
  /** فئةُ الكتالوج إن وُجدت — تُضيّق البحثَ بلا سؤال. */
  category?: string;
  /** كلُّ ما يُكتب به هذا المفهومُ في المغرب — يُرسَل للفهرس. */
  terms: string[];
  /**
   * سقفُ الثمن إن قاله — «بأقلّ من ٢٠٠ درهم» ⇒ `200`.
   *
   *   كان يُستخرَج في `needEngine` نصًّا للعرض ثمّ يُهمَل، فيرى صاحبُ المئتَين
   *   ما ثمنُه ألفان. والمرشِّحُ قائمٌ في الخادم منذ البداية — كان ينقصه
   *   من يوصله.
   */
  maxPrice?: number;
  /**
   * حالُ السلعة إن قالها — «فران يكون **جديد**» ⇒ `new`.
   *
   *   ولا يُخمَّن: بلا كلمةٍ صريحةٍ يبقى غيرَ محدَّد. والمرشِّحُ على الخادم
   *   **يُقصي المخالفَ وحدَه** ولا يُقصي المجهول — فسلعةٌ لم يُكتَب حالُها
   *   تبقى ظاهرةً لمن يطلب جديدًا. وإلّا لَما رأى أحدٌ شيئًا حتّى يملأ
   *   كلُّ التجّار حقلًا جديدًا: مرشِّحٌ يُفرِّغ النتائجَ أسوأُ من غيابه.
   */
  condition?: Condition;
  /** أيُّ مصطلحٍ طابق وبأيّ طريق — للشرح والتصحيح، لا للعرض. */
  matched?: { term: string; via: string };
  /**
   * **الاتّجاه: هل يَطلب أم يَعرض.**
   *
   *   الشاشةُ الأولى تقرؤه وتقوله («كتقلّب على سبّاك») ثمّ تنقل الإنسانَ
   *   إلى السوق **فيسقط في الطريق**. فيصل إلى صفحةٍ تعرض له نتائجَ ولا
   *   تقول له لماذا جاءته — وقد تكون هذه أوّلَ صفحةٍ يفتحها من رابط.
   *   فيُقرأ هنا مرّةً واحدةً مع المفهوم، ويسافر في العقد نفسِه.
   */
  stance?: Stance;
  /**
   * نوعُ الفئة: سلعةٌ تُشترى أم خدمةٌ تُطلَب — يُغيّر الكلمةَ التي تُقال
   * للإنسان. «باغي تشري جلابة» صحيحة، و«باغي تشري سبّاك» ليست كلامًا.
   */
  kind?: CategoryKind;
}

/** أطولُ من هذا لا يُرسَل: حمايةٌ من استعلامٍ ينفخ الطلب. */
const MAX_TERMS = 24;

const clean = (t: string) => t.trim().replace(/\s+/g, ' ');

/**
 * يوسّع استعلامَ الزبون بمرادفات المفهوم من قاعدة المعرفة.
 * لا يبحث ولا يتّصل بشيء — يترجم فقط.
 *
 * @param knownConcept مفهومٌ **قُرئ من قبل** في هذه الجملة نفسِها. من قرأ
 *   الجملةَ مرّةً يمرّر ما قرأ ولا نقرؤها ثانيةً هنا: القاعدةُ ㉒ — تحليلٌ
 *   واحدٌ للجملة. وحَكَمان في مشهدٍ واحدٍ يختلفان يومًا، فيُعرَض للإنسان
 *   مفهومٌ ويُبحَث له عن آخر.
 */
export function expandQuery(raw: string, knownConcept?: string): SearchIntent {
  const q = clean(raw || '');
  if (!q) return { raw: '', terms: [] };

  // السقفُ يُقرأ قبل المفهوم وبمعزلٍ عنه: من قال «شي حاجة بأقلّ من ١٠٠ درهم»
  // لم يُفهَم مفهومُه، وميزانيّتُه مفهومةٌ تمامًا. وربطُ الاثنين يُسقط الثانيَ
  // لعجز الأوّل.
  const maxPrice = priceCeiling(q);
  const condition = readCondition(q);

  if (knownConcept) {
    const terms = [...new Set([q, ...conceptTerms(knownConcept, MAX_TERMS)])].slice(0, MAX_TERMS);
    return {
      raw: q, concept: knownConcept,
      category: categoryForConcept(knownConcept)?.id,
      kind: categoryForConcept(knownConcept)?.kind,
      stance: stanceOf(q, knownConcept),
      terms, maxPrice, condition,
    };
  }

  const found = resolveConcept(q);
  if (!found) {
    // لم يُفهَم — نُرسل ما كتبه وحدَه. البحثُ لا يتعطّل لأنّ الفهمَ عجز.
    // والاتّجاهُ يُقرأ حتّى بلا مفهوم: «باغي نبيع شي حاجة» اتّجاهٌ واضحٌ
    // وإن لم يُعرَف الشيء.
    return { raw: q, terms: [q], stance: stanceOf(q), maxPrice, condition };
  }

  const terms = new Set<string>([q]);
  // تسمياتُ المفهوم بكلّ اللغات: «سباك» · «بلومبي» · «Plombier» · «Plumber».
  for (const v of Object.values(found.concept || {})) {
    const t = clean(String(v || ''));
    if (t.length >= 2) terms.add(t);
  }
  // وما يفعله — الزبونُ يبحث بالخدمة لا بالمهنة: «فتح المجاري».
  for (const s of found.services || []) {
    const t = clean(s);
    if (t.length >= 3 && terms.size < MAX_TERMS) terms.add(t);
  }

  return {
    raw: q,
    concept: found.id,
    label: found.concept?.ar || undefined,
    category: categoryForConcept(found.id)?.id,
    kind: categoryForConcept(found.id)?.kind,
    stance: stanceOf(q, found.id),
    terms: [...terms].slice(0, MAX_TERMS),
    matched: found.matched,
    maxPrice, condition,
  };
}

/**
 * جملةٌ تحمل أكثرَ من حاجة: «بغيت نغسل الطوموبيل ونصبغ الدار».
 * تُستعمل حين يُراد عرضُ أقسامٍ متعدّدة، لا لتوسيع استعلامٍ واحد.
 */
export function expandAll(raw: string, max = 3): SearchIntent[] {
  const q = clean(raw || '');
  if (!q) return [];
  const out = resolveConcepts(q, max).map(c => ({
    raw: q,
    concept: c.id,
    label: c.concept?.ar,
    category: categoryForConcept(c.id)?.id,
    terms: [...new Set([
      ...Object.values(c.concept || {}).map(v => clean(String(v || ''))).filter(t => t.length >= 2),
      ...(c.services || []).map(clean).filter(t => t.length >= 3),
    ])].slice(0, MAX_TERMS),
    matched: c.matched,
    maxPrice: priceCeiling(q), condition: readCondition(q),
  }));
  return out.length ? out : [expandQuery(q)];
}

/**
 * **عقدُ البحث — شكلٌ واحدٌ يعرف ما يُرسَل للخادم.**
 *
 *   كان هذا المكانُ قائمًا ولا يناديه إلّا `DiscoverSections`. وبقيّةُ
 *   الأبواب — الشاشةُ الأولى · السوقُ · المساعدُ · المنسِّق — بنى كلٌّ
 *   منها سلسلتَه بيدِه. فأربعةُ أبوابٍ لسؤالٍ واحد، وثلاثةٌ منها تُسقط
 *   المرادفاتِ والسقفَ والحال. والنداءُ ينجح، والنتيجةُ صفر، ولا رسالة.
 *
 *   `SearchFilters` هو النوعُ القائمُ في `services/api` الذي يقبله
 *   `businessAPI.search`. فيُبنى منه مرّةً، وتُشتقّ منه سلسلةُ الرابط —
 *   ولا يُخترَع عقدٌ ثانٍ.
 */
export function toSearchFilters(intent: SearchIntent, city?: string): SearchFilters {
  const f: SearchFilters = {};
  if (city) f.city = city;
  // ── **«شي حاجة بأقلّ من ٢٠٠ درهم»** ────────────────────────────
  //   لا مفهومَ في هذه الجملة ولا يُراد: «شي حاجة» تعني **أيّ شيء**،
  //   والمعنى كلُّه في السقف. وإرسالُ الجملة كـ`q` يطلب من الفهرس اسمًا
  //   يحوي «بأقلّ من ٢٠٠ درهم» — فيرجع صفرٌ، والميزانيّةُ مفهومةٌ تمامًا.
  //   فحين لا يُفهَم مفهومٌ **ويُفهَم سقفٌ**، السقفُ هو الطلب.
  const budgetOnly = !intent.concept && intent.maxPrice != null;
  if (intent.raw && !budgetOnly) f.q = intent.raw;
  // المرادفاتُ تُرسَل منفصلةً عن `q`: الخادمُ يبقى محرّكَ بحث، ولا يحتاج أن
  // يعرف أنّ «بلومبي» و«plombier» شيءٌ واحد.
  if (intent.terms.length > 1) f.terms = intent.terms.join('|');
  if (intent.category) f.category = intent.category;
  // الميزانيّةُ تُرسَل رقمًا لا نصًّا: الخادمُ يرشّح، ولا يقرأ الدارجة.
  if (intent.maxPrice) f.priceMax = intent.maxPrice;
  if (intent.condition) f.condition = intent.condition;
  return f;
}

/** نفسُ العقد سلسلةً — للرابط الذي يُفتَح في المتصفّح. مُشتقٌّ لا موازٍ. */
export function toSearchParams(intent: SearchIntent, city?: string): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(toSearchFilters(intent, city))) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    p.set(k, String(v));
  }
  return p;
}
