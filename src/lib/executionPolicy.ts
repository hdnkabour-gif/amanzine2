// ============================================================
// سياسةُ التنفيذ — **المكانُ الوحيد** الذي يقول: نفّذ، أم اسأل، أم لا تفعل.
//
//   كان القرارُ مبعثرًا في أربعة ملفّات: عتباتُ الثقة في `clarify`، والنقصُ
//   في `actions.needs`، وصيغةُ الكلام في `mood`، والغموضُ في `ambiguity`.
//   وكلٌّ منها يعرف جزءًا ولا أحدَ يعرف الحصيلة.
//
//   وخطرُ التبعثر ليس فوضى الترتيب، بل **الثقب**: طبقةٌ تقول «لا أعرف»
//   وأخرى تقول «واثق»، فيُنفَّذ الفعلُ لأنّ أحدًا لم يجمع الصوتَين. ولأنّ
//   كلَّ طبقةٍ تُستدعى من مكانٍ مختلف، لا يمكن اختبارُ الحصيلة إطلاقًا.
//
//   ── ما هذه الطبقةُ وما ليست ──
//   لا تفهم شيئًا جديدًا. تأخذ ما فهمته الطبقاتُ وتُخرج **حكمًا واحدًا**
//   مع سببه. فالفهمُ يبقى موزّعًا، والقرارُ يصير في مكانٍ واحدٍ يُختبَر.
//
//   ── الترتيبُ جزءٌ من المعنى ──
//   يبدأ بما يمنع الفعلَ مهما بلغت الثقة. فمن نقل كلامَ زبونٍ لا يُنفَّذ له
//   شيءٌ ولو كانت الجملةُ واضحةً تمامًا — الوضوحُ ليس إذنًا.
// ============================================================

import { CONFIDENCE } from './clarify';
import type { Understanding } from './akg/kb';

export type Verdict =
  | 'execute'   // نفّذ الآن
  | 'confirm'   // اعرض ما فهمتَ واطلب «واخّا»
  | 'ask'       // ينقص شيء — سؤالٌ واحد
  | 'explain'   // ليس طلبًا أصلًا — اشرح ولا تفعل
  | 'refuse';   // لا نملك فعلًا لهذا

export interface Decision {
  verdict: Verdict;
  /** ما يُقال للإنسان بالدارجة. */
  say: string;
  /** أثرُ القرار — أيُّ طبقةٍ حسمت ولماذا. يُعرَض عند الشكوى ويُصحَّح به. */
  trace: string[];
}

/** أفعالٌ لا تُسترجَع — تُؤكَّد دائمًا مهما بلغت الثقة. */
const DESTRUCTIVE = new Set(['delete']);

/**
 * الحكمُ الواحد.
 *
 * @param u ما فهمته الطبقات
 * @param canDo هل يملك التطبيقُ فعلًا لهذه النيّة؟ (حدُّ القدرة)
 */
export function decideExecution(u: Understanding, canDo = true): Decision {
  const trace: string[] = [];

  // ① صيغةُ الكلام تسبق كلَّ شيء: من يحكي عن غيره لا يُنفَّذ له فعلٌ ولو
  //    كانت جملتُه واضحة. **الوضوحُ ليس إذنًا.**
  if (u.mood && !u.mood.executable) {
    trace.push(`صيغة: ${u.mood.mood} (${u.mood.reason})`);
    return { verdict: 'explain', say: u.mood.say, trace };
  }

  // ② النفي: أبطل الاتّجاه، فلا نُخمّن ما يريده.
  if (u.negated) {
    trace.push('نفيٌ صريح');
    return { verdict: 'ask', say: 'فهمتُ أنّك ما بغيتيش هادشي — قول ليا شنو بغيتي.', trace };
  }

  // ③ حدُّ القدرة: الفهمُ يُقاس بما نستطيع فعلَه. وقولُ «ما نقدرش» بصراحةٍ
  //    خيرٌ من فعلٍ ناقصٍ يُوهم أنّه تمّ.
  if (!canDo) {
    trace.push('خارجَ ما يقدر عليه التطبيق');
    return { verdict: 'refuse', say: 'هادشي ما نقدرش نديرو دابا — ولكن نقدر نعاونك ف حاجة قريبة منّو.', trace };
  }

  // ④ غموضٌ معجميّ: كلمةٌ لمعنيَين بلا قرينة.
  if (u.ambiguity) {
    trace.push(`غموض: «${u.ambiguity.term}»`);
    return { verdict: 'ask', say: u.ambiguity.ask, trace };
  }

  // ⑤ نقصٌ معلوم: «بدّل الثمن» بلا منتج.
  if (u.action?.needs?.length) {
    const need = u.action.needs.find(n => !/^تأكيد/.test(n));
    if (need) {
      trace.push(`ينقص: ${need}`);
      return { verdict: 'ask', say: need, trace };
    }
  }

  // ⑥ ما لا يُسترجَع يُؤكَّد — **بعد** اكتمال الفهم لا قبله، وإلّا سألنا
  //    التأكيدَ على فعلٍ لم نفهمه بعد.
  if (u.action && DESTRUCTIVE.has(u.action.verb)) {
    trace.push('فعلٌ لا يُسترجَع');
    return { verdict: 'confirm', say: 'واش متأكّد؟ هادشي ما كيرجعش.', trace };
  }

  // ⑦ الثقة — آخرَ ما يُنظَر فيه. عتبةٌ واحدةٌ مشتركةٌ مع `clarify`، فلا
  //    يختلف عقلان على نفس الجملة.
  const c = u.confidence ?? 0;
  if (c >= CONFIDENCE.ACT) {
    trace.push(`يقين ${Math.round(c * 100)}٪`);
    return { verdict: 'execute', say: '', trace };
  }
  if (c >= CONFIDENCE.CONFIRM) {
    trace.push(`يقين ${Math.round(c * 100)}٪ — دون حدّ التنفيذ`);
    return { verdict: 'confirm', say: 'فهمت. واش هادشي هو اللي بغيتي؟', trace };
  }
  trace.push(`يقين ${Math.round(c * 100)}٪ — ضعيف`);
  return { verdict: 'ask', say: 'ما فهمتش مزيان — تقدر توضّح ليا بجملة أخرى؟', trace };
}

/** سطرٌ واحدٌ يشرح القرار — يُعرَض حين يشتكي الإنسانُ من الفهم. */
export function explainDecision(d: Decision): string {
  return `${d.verdict} ← ${d.trace.join(' · ')}`;
}
