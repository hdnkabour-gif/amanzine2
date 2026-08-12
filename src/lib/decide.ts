// ============================================================
// **مالكٌ واحدٌ للوجهة الدلاليّة.**
//
//   قِيست ستُّ عائلاتٍ تقرّر «أين يذهب هذا الطلب»، وكلٌّ منها تقرّر وحدَها:
//
//     ①  `NeedResult.page/url`            ← يقرؤها `NeedFirst`
//     ②  تجاوزُ الاتّجاه في `NeedFirst`   ← عرضٌ ⇒ نشر، وإلّا ⇒ سوق
//     ③  `AuthPage.resumeNeed`            ← يُعيد الاشتقاقَ من اتّجاهٍ مخزَّن
//     ④  `Decision.dest`                  ← الظهرُ القانونيّ، ويُقرأ في
//                                            `LivingHome` **وحدَها**
//     ⑤  توجيهُ `AssistantPage` المباشر   ← `r.page`/`opt.page` بلا سياسةٍ أصلًا
//     ⑥  بذرةُ النشر                      ← تقرّر ما بعد الدخول
//
//   والأثرُ ليس ترتيبًا: نفسُ الجملة تُرسِل إنسانًا إلى مكانَين مختلفَين بحسب
//   الشاشة التي كتبها فيها. و③ **يسبق** ما كتبه للتوّ، فاتّجاهٌ قديمٌ يغلب
//   حاجةً طازجة.
//
//   ── وهذا الملفُّ لا يفهم شيئًا جديدًا ──
//   لا عقلَ يُبنى هنا. يُنادى ما هو مبنيٌّ **بترتيبٍ واحد** ويُخرَج حكمٌ واحد:
//
//     understand → parseNeed → abilityFor → decideExecution → decideInterface
//
//   والفرقُ أنّ الترتيبَ صار في موضعٍ واحدٍ بدل أن تعيد كلُّ شاشةٍ تركيبَه —
//   فتختلف. والراوترُ **ينفّذ** ما هنا ولا يُعيد تفسيره.
//
//   وما ليس من شغل هذا الملفّ: `navigate` و`setPage` والرجوعُ والألسنةُ
//   وإغلاقُ النوافذ والروابطُ العامّةُ وتنقّلُ الأدمن — تلك **ميكانيكا** لا
//   قرارُ عمل، وخلطُها بالقرار هو ما جعل العدَّ ستًّا أوّلَ مرّة.
// ============================================================

import { understand, type Understanding } from './akg/kb';
import { parseNeed, type NeedResult } from './needEngine';
import { abilityFor, entityAccepts, VERB_MAP, OBJECT_MAP, type Ability } from './abilities';
import { decideExecution, type Decision } from './executionPolicy';
import { decideInterface, type InterfaceDecision } from './interfaceDecision';
import type { Page } from '../types';

/**
 * **حدُّ التصديق** — دون هذا لا يُبنى على القراءة شيء.
 *
 *   قارئةُ الأفعال تسقط على `settings` بثقة ٠٫٣٥ حين لا تعرف الهدف، فيُفتَح
 *   بابُ الإعدادات لمن قال «بغيت نمشي الحي عندي غير 10 دراهم». والقراءاتُ
 *   الصحيحةُ تحمل ٠٫٧٠–٠٫٨٥، فالحدُّ يفصلهما بوضوح.
 */
export const READ_ENOUGH = 0.5;

export interface CanonicalDecision {
  /** ما فُهم — يُحسَب **مرّةً واحدةً** لكلّ فعلِ مستخدم. */
  u: Understanding;
  need: NeedResult;
  ability: Ability | null;
  /** نفّذ · أكّد · اسأل · اشرح · ارفض · مازال. */
  verdict: Decision['verdict'];
  /** ما يُقال للإنسان. */
  say: string;
  /** **الوجهةُ الدلاليّةُ الوحيدة.** الراوترُ ينفّذها ولا يُعيد تفسيرَها. */
  dest?: Decision['dest'];
  /** شكلُ العرض المقابل للحكم. */
  mode: InterfaceDecision['mode'];
  /** حين الحكمُ `soon`: ما فُهم وأيُّ مجالٍ بلا باب — ليُسجَّل الطلب. */
  boundary?: Decision['boundary'];
  trace: string[];
}

export interface DecideCtx {
  lastProduct?: { id: string; name: string };
  /** نتيجةُ حاجةٍ محسوبةٌ سلفًا (`orchestrate`) — تُمرَّر فلا تُعاد. */
  need?: NeedResult;
  /**
   * فهمٌ محسوبٌ سلفًا. موضعان يحتاجانه:
   *   ① منعُ تكرار العمل الدلاليّ حين يكون المُنادي قد قرأ الجملةَ (RC-P6).
   *   ② مسارُ الذكاء الخارجيّ: `refine` تُكمّل الفراغَ فيصير الفهمُ **أغنى**
   *      من إعادة القراءة، فإعادةُ `understand` تمحو ما ملأه.
   */
  u?: Understanding;
}

/**
 * الحكمُ القانونيُّ الواحد لنصٍّ واحد.
 *
 *   يُنادى **مرّةً لكلّ فعلِ مستخدم**. ومن ناداه فقد حصل على الفهم والقدرة
 *   والحكم والوجهة والشكل معًا — فلا يحتاج أن يُعيد اشتقاقَ أيٍّ منها، وهذا
 *   هو ما يمنع تكرارَ العمل الدلاليّ (RC-P6) من نفس الباب الذي يوحّد الوجهة.
 */
export function decideFor(raw: string, ctx: DecideCtx = {}): CanonicalDecision {
  const q = String(raw || '').trim();
  const u = ctx.u || understand(q);
  const need = ctx.need || parseNeed(q, {} as never);

  // الفعلُ الضعيفُ لا يبلغ الكتالوج: ٠٫٣٥ لا تفتح بابًا ولا تُغلقه.
  const act = (u.action?.confidence ?? 0) >= READ_ENOUGH ? u.action : null;
  const ability = abilityFor({
    action: act, intent: (need as { intent?: string })?.intent,
    stance: u.stance, service: u.service,
  });

  // العجزُ يُسأل عنه المجالُ لا الكتالوج: أيقبل هذا الكيانُ هذا الفعلَ أصلًا؟
  const av = act ? VERB_MAP[act.verb] : undefined;
  const ae = act ? OBJECT_MAP[act.object] : undefined;
  const impossible = !!(av && ae && !entityAccepts(av, ae));

  const d = decideExecution(u, ability || undefined, impossible,
    { lastProduct: ctx.lastProduct, raw: q });
  const iface = decideInterface({ ...(need as object), hasInput: true } as never, d.verdict);

  return { u, need, ability, verdict: d.verdict, say: d.say || '', dest: d.dest,
    mode: iface.mode, boundary: d.boundary, trace: d.trace };
}

/**
 * **الوجهةُ صيغةً صالحةً للراوتر — ولا تُشتقّ إلّا من حكمٍ حاسم.**
 *
 *   ①  `ask`/`explain`/`refuse`/`soon` **لا وجهةَ لها**. سؤالٌ يُطرَح ثمّ
 *      يُنقَل صاحبُه إلى صفحةٍ أخرى سؤالٌ مرميّ — وهذا بالضبط ما كانت تفعله
 *      الشاشاتُ حين قرأت `NeedResult.page` بمعزلٍ عن الحكم.
 *   ②  و`dest.page` عند قدرات البحث تقول «أين تعيش القدرة» (`home`) لا «أين
 *      يُساق الآن»، فلا تصلح وجهةً. وجهةُ الباحث سوقٌ باستعلامه.
 */
export function targetOf(d: CanonicalDecision, raw = ''): { page?: Page; url?: string } {
  if (d.verdict !== 'execute' && d.verdict !== 'confirm') return {};
  if (d.dest?.page) return { page: d.dest.page };

  // الباحثُ: سوقٌ بالاستعلام والمدينة — لا صفحةٌ فارغةٌ ولا نصٌّ خام.
  if (d.ability?.verb === 'seek') {
    const q = String(raw || '').trim();
    const city = d.u.city ? `&city=${encodeURIComponent(d.u.city)}` : '';
    return { url: q ? `/market?q=${encodeURIComponent(q)}${city}` : '/market' };
  }
  const n = d.need as { page?: string; url?: string };
  if (n?.url) return { url: n.url };
  if (n?.page) return { page: n.page as Page };
  return {};
}
