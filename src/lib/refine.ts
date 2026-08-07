// ============================================================
// **الذكاءُ يملأ الفراغَ ولا يمسح ما قُرئ.**
//
//   البوّابةُ (`understandHybrid`) مبنيّةٌ منذ زمنٍ ولا تبلغ الشاشةَ الرئيسيّة:
//   تُنادى من `AssistantPage` وحدَها. وربطُها بالسذاجة — أن تحلّ محلَّ
//   `understand()` — **يخسر أكثرَ ممّا يربح**، لأنّ العقدَين ليسا واحدًا:
//
//       understand()            ⇒ ٢١ حقلًا (فعل · اتّجاه · غموض · غاية · حال ·
//                                  خدماتٌ متعدّدة · نفيٌ · مزاج · وقائع…)
//       UnderstandingResult     ⇒ ٨ حقول  (نيّة · مهنة · مشكل · مدينة…)
//
//   فمن استبدل الأوّلَ بالثاني أسقط ثلثَي ما يعرفه التطبيقُ عن الجملة، ثمّ
//   انتظر شبكةً ليفعل. ولذلك القاعدةُ هنا **حرفيّة**: حقلٌ مقروءٌ لا يُمَسّ،
//   وحقلٌ فارغٌ وحدَه يُملأ.
//
//   وجوابُ الذكاء **يعود من بابنا لا من بابه**: يُعطينا نصًّا («Casablanca»،
//   «plombier») فنمرّره على `resolveCity`/`resolveConcept`. ما عرفناه قُبِل،
//   وما لم نعرفه رُدّ. أي أنّ الذكاءَ لا يسمّي مُعرِّفًا داخليًّا ولا يفتح
//   بابًا غيرَ مبنيّ — يقترح كلمةً، والمعرفةُ تحكم.
// ============================================================

import type { Understanding } from './akg/kb';
import { resolveCity, resolveConcept } from './akg/kb/knowledge';
import type { UnderstandingResult } from './understanding';

export interface Refinement {
  u: Understanding;
  /** ما مُلئ فعلًا — فارغةٌ تعني أنّ الذكاءَ لم يزد شيئًا. */
  filled: string[];
}

/**
 * يدمج جوابَ الذكاء في الفهم القائم **ملءَ فراغٍ لا استبدالًا**.
 *
 *   لا يُمَسّ أبدًا: `action` · `stance` · `ambiguity` · `goal` · `negated` ·
 *   `services` · `facts` — لأنّ العقدَ البعيدَ لا يحمل لها مقابلًا أصلًا،
 *   فكلُّ ما يقوله عنها صمتٌ لا نفي. والصمتُ لا يمحو قراءةً.
 */
export function refine(base: Understanding, ai: UnderstandingResult | null): Refinement {
  if (!ai || ai.source !== 'llm') return { u: base, filled: [] };

  const filled: string[] = [];
  const next: Understanding = { ...base };

  // ── المدينة ──────────────────────────────────────────────
  //   الذكاءُ يردّ «Casablanca»/«Casa» والقاعدةُ تخزّن «الدار البيضاء»، فلو
  //   قُبِل نصُّه كما هو لصار البحثُ بمدينةٍ لا وجودَ لها في الجدول ⇒ صفرُ
  //   نتائجَ **بصمت**، وهو أسوأُ من ألّا يُقرأ شيء.
  if (!next.city && ai.city) {
    const c = resolveCity(String(ai.city));
    if (c?.city) {
      next.city = c.city;
      if (!next.district && c.district) next.district = c.district;
      filled.push('city');
    }
  }

  // ── الخدمة/المهنة ────────────────────────────────────────
  //   `service` هو مُعرِّفٌ قانونيٌّ تُبنى عليه القدرةُ والبحثُ والوجهة، فلا
  //   يُكتَب فيه نصٌّ حرٌّ من الذكاء. يُحلّ أوّلًا: عُرف ⇒ قُبِل، وإلّا رُدّ.
  if (!next.service) {
    for (const cand of [ai.profession, ai.object, ai.problem]) {
      if (!cand) continue;
      const hit = resolveConcept(String(cand));
      if (!hit) continue;
      next.service = hit.id;
      if (!next.category && hit.category) next.category = hit.category;
      filled.push('service');
      break;
    }
  }

  if (!filled.length) return { u: base, filled: [] };

  // الثقةُ ترتفع لأنّ فراغًا امتلأ — لا لأنّ الذكاءَ تكلّم. ولو لم يُملأ شيءٌ
  // لبقيت كما كانت (المخرجُ أعلاه)، وإلّا صار مجرّدُ النداء يرفع اليقين.
  next.confidence = Math.max(base.confidence, Math.min(ai.confidence ?? 0, 0.85));
  next.reasoning = [...base.reasoning, `🤝 كمّل الفهم: ${filled.join(' · ')}`];
  return { u: next, filled };
}
