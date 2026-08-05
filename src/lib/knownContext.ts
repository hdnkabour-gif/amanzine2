// ============================================================
// ما نعرفه سلفًا — «لا يسأل التطبيقُ سؤالًا يعرف جوابَه».
//
//   قياسٌ كشف الخرق: `signalsFrom` تملأ المكانَ من `o?.location` — أي ممّا
//   كتبه المستخدمُ **في هذه الجملة وحدَها**. فالتاجرُ الذي قال مدينتَه
//   الأسبوعَ الماضي يُسأل عنها ثانيةً، وكأنّ التطبيقَ لم يره قطّ.
//
//   وكان هذا مستحيلَ الإصلاح قبل يومين: ما نعرفه عن الشخص كان يعيش في
//   `localStorage` ويموت مع المتصفّح. صار ممكنًا حين نجت الذاكرةُ إلى الخادم.
//
//   ── القاعدةُ التي لا تُكسَر ──
//   **الجملةُ الحاضرةُ تغلب الذاكرة.** من قال «فطنجة» اليوم فهو في طنجة،
//   ولو كانت ذاكرتُنا تقول الدار البيضاء. الذاكرةُ تملأ **الفراغ** فقط،
//   ولا تُصحّح إنسانًا في حاضره — وإلّا صار «الفهمُ» عنادًا.
//
//   ── ولماذا يُذكَر السبب ──
//   حين لا نسأل، يجب أن نقول لماذا: «ما سولتكش على المدينة حيت قلتيها من
//   قبل». الصمتُ بلا تفسيرٍ يبدو تخمينًا، والتفسيرُ يجعله ذاكرة.
// ============================================================

import type { Signals } from './clarify';

/** ما يعرفه التطبيقُ عن هذا الشخص الآن. */
export interface KnownContext {
  city?: string;
  /** نشاطُه إن عُرف («محل خضر») — يمنع سؤالَ «شنو كتدير؟» لمن قالها. */
  activity?: string;
  /** هل يملك نشاطًا مسجَّلًا؟ يحسم «متجر ديالي» بلا سؤال. */
  hasWorkspace?: boolean;
}

const GRAPH_KEY = 'amanzine_user_graph';

function readLocal(key: string): Record<string, unknown> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const v = JSON.parse(localStorage.getItem(key) || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}

/**
 * يجمع ما نعرفه. يقرأ **متزامنًا** من المرآة المحلّيّة التي تملؤها
 * `syncMemory()` من الخادم عند الإقلاع — فلا انتظارَ شبكةٍ في مسار الفهم.
 *
 * @param profile ما يعرفه الحسابُ نفسُه (مدينةُ الملفّ، وجودُ نشاط)
 */
export function knownAbout(profile?: { city?: string; hasWorkspace?: boolean }): KnownContext {
  const graph = readLocal(GRAPH_KEY);
  const out: KnownContext = {};

  // ترتيبُ الثقة: ملفُّ الحساب أوثقُ من استنتاجٍ من كلامٍ سابق.
  const city = profile?.city || (typeof graph.city === 'string' ? graph.city : '');
  if (city && String(city).trim()) out.city = String(city).trim();

  const act = graph.activity;
  if (typeof act === 'string' && act.trim()) out.activity = act.trim();

  if (profile?.hasWorkspace !== undefined) out.hasWorkspace = profile.hasWorkspace;
  else if (typeof graph.hasWorkspace === 'boolean') out.hasWorkspace = graph.hasWorkspace;

  return out;
}

export interface EnrichResult {
  signals: Signals;
  /** ما مُلئ من الذاكرة — تعرضه الواجهةُ سببًا لعدم السؤال. */
  filled: { field: string; value: string; why: string }[];
}

/**
 * يملأ الفراغَ ممّا نعرفه — **ولا يمسّ ما قاله المستخدمُ الآن**.
 *
 *   هذا هو موضعُ الخطأ الذي يقع فيه أغلبُ «الذكاء»: أن يُصحّح الإنسانَ
 *   بذاكرته. من كتب «انا ف طنجة» فهو في طنجة، انتهى.
 */
export function enrichSignals(signals: Signals, known: KnownContext): EnrichResult {
  const filled: EnrichResult['filled'] = [];
  const out: Signals = { ...signals };

  if (!out.place && known.city) {
    out.place = known.city;
    filled.push({ field: 'place', value: known.city, why: 'قلتيها من قبل' });
  }

  // «متجر ديالي» لا يُسأل عنه لمن له نشاطٌ مسجَّل ويعرض شيئًا.
  if (!out.target && known.hasWorkspace && out.direction === 'offer') {
    out.target = 'store';
    filled.push({ field: 'target', value: 'store', why: 'عندك محلّ مسجّل' });
  }

  return { signals: out, filled };
}

/** جملةٌ دارجيّةٌ تشرح لماذا لم نسأل — الصمتُ بلا تفسيرٍ يبدو تخمينًا. */
export function explainFilled(filled: EnrichResult['filled']): string {
  if (!filled.length) return '';
  const F: Record<string, string> = { place: 'المدينة', target: 'نوع الحاجة', direction: 'الاتّجاه' };
  return filled.map(f => `ما سولتكش على ${F[f.field] || f.field} — ${f.why}`).join(' · ');
}
