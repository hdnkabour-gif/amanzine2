import { resolveConcept, resolveConcepts } from './akg/kb/knowledge';
import { categoryForConcept } from './catalog';
import { priceCeiling } from './money';
import { readCondition, type Condition } from './condition';

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
}

/** أطولُ من هذا لا يُرسَل: حمايةٌ من استعلامٍ ينفخ الطلب. */
const MAX_TERMS = 24;

const clean = (t: string) => t.trim().replace(/\s+/g, ' ');

/**
 * يوسّع استعلامَ الزبون بمرادفات المفهوم من قاعدة المعرفة.
 * لا يبحث ولا يتّصل بشيء — يترجم فقط.
 */
export function expandQuery(raw: string): SearchIntent {
  const q = clean(raw || '');
  if (!q) return { raw: '', terms: [] };

  // السقفُ يُقرأ قبل المفهوم وبمعزلٍ عنه: من قال «شي حاجة بأقلّ من ١٠٠ درهم»
  // لم يُفهَم مفهومُه، وميزانيّتُه مفهومةٌ تمامًا. وربطُ الاثنين يُسقط الثانيَ
  // لعجز الأوّل.
  const maxPrice = priceCeiling(q);
  const condition = readCondition(q);

  const found = resolveConcept(q);
  if (!found) {
    // لم يُفهَم — نُرسل ما كتبه وحدَه. البحثُ لا يتعطّل لأنّ الفهمَ عجز.
    return { raw: q, terms: [q], maxPrice, condition };
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

/** معاملاتُ الطلب — مكانٌ واحدٌ يعرف شكلَ ما يُرسَل للخادم. */
export function toSearchParams(intent: SearchIntent, city?: string): URLSearchParams {
  const p = new URLSearchParams();
  if (city) p.set('city', city);
  if (intent.raw) p.set('q', intent.raw);
  // المرادفاتُ تُرسَل منفصلةً عن `q`: الخادمُ يبقى محرّكَ بحث، ولا يحتاج أن
  // يعرف أنّ «بلومبي» و«plombier» شيءٌ واحد.
  if (intent.terms.length > 1) p.set('terms', intent.terms.join('|'));
  if (intent.category) p.set('category', intent.category);
  // الميزانيّةُ تُرسَل رقمًا لا نصًّا: الخادمُ يرشّح، ولا يقرأ الدارجة.
  if (intent.maxPrice) p.set('priceMax', String(intent.maxPrice));
  if (intent.condition) p.set('condition', intent.condition);
  return p;
}
