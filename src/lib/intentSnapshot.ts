import { CONFIDENCE, MAX_CLARIFICATIONS, nextClarification, isFallback, type Signals, type ClarificationId } from './clarify';

// ============================================================
// Intent Snapshot — عقدُ الطلب الذي يرافقه من أوّل كلمةٍ إلى آخر فعل.
//
//   المشكلةُ التي يحلّها: كلُّ جزءٍ في النظام كان يُعيد تفسيرَ الحوار من
//   الصفر. الصفحةُ تعرف نيّةً، والسوقُ يتلقّى نصًّا خامًّا، والتعلّمُ يعدّ
//   حدثًا، والدعمُ البشريُّ — إن صعّدنا — لا يعرف شيئًا ممّا جرى. أربعةُ
//   تفسيراتٍ لحوارٍ واحد، وكلٌّ منها قد يخالف الآخر بصمت.
//
//   اللقطةُ **مصدرُ حقيقةٍ واحد** لهذا الطلب: ما قاله الإنسان · ما فهمناه ·
//   كم نثق · ماذا سألنا · بماذا أجاب · ماذا بقي ناقصًا · وإلى أين نمضي.
//
//   قاعدتان تحكمانها:
//
//   ① **ما يُشتقّ لا يُخزَّن.** `stage` و`resolved` و`remaining` **ليست
//      حقولًا** — دوالُّ تُحسب من `clarifications` و`confidence`. لو خُزِّنت
//      لصار في النظام حقيقتان: واحدةٌ في الحقل وأخرى في الواقع، وتتباعدان
//      عند أوّل تحديثٍ يُنسى. هذا نفسُ المبدأ الذي أزال `deliveryFee`
//      المحسوبَ في العميل، ولا استثناءَ له هنا.
//
//   ② **اللقطةُ لا تتغيّر — تُشتقّ منها لقطةٌ جديدة.** كلُّ دالّةٍ تُرجع
//      نسخةً، فيبقى تاريخُ الحوار كاملًا وقابلًا للمراجعة بدل حالةٍ واحدةٍ
//      تُكتب فوق نفسها.
// ============================================================

/** سؤالٌ طُرح، وما جرى له. */
export interface ClarificationRecord {
  id: ClarificationId | string;
  askedAt: number;
  /** هويّةُ الجواب — لا نصُّه. `null` = طُرح ولم يُجَب. */
  answeredWith: string | null;
  answeredAt: number | null;
  confidenceBefore: number;
  /** `null` ما دام بلا جواب. */
  confidenceAfter: number | null;
}

/** المرحلةُ مشتقّةٌ دائمًا — لا تُخزَّن. */
export type SnapshotStage = 'clarify' | 'confirm' | 'act' | 'escalate' | 'done';

export interface IntentSnapshot {
  /** هويّةُ هذا الطلب — تُرافقه في كلّ سجلٍّ وحدثٍ وتصعيد. */
  id: string;
  /** ما قاله الإنسانُ بلغته — لا يُعاد صوغُه أبدًا. */
  raw: string;
  intent: string;
  confidence: number;
  /** ما نعرفه: هدف · اتّجاه · كائن · مكان. مصدرُه أيًّا كان (قواعد/ذكاء/صورة). */
  signals: Signals;
  clarifications: ClarificationRecord[];
  /** الوجهةُ حين تُحسم. */
  destination?: { page?: string; url?: string };
  /** هل أكّد الإنسانُ الفهم؟ `null` = لم يُسأل بعد. */
  confirmed: boolean | null;
  openedAt: number;
  updatedAt: number;
}

let _seq = 0;
const newId = () => `sn_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/** يفتح لقطةً من أوّل جملة. */
export function openSnapshot(raw: string, analysis: { intent: string; confidence?: number; signals?: Signals }): IntentSnapshot {
  const now = Date.now();
  return {
    id: newId(),
    raw: String(raw || ''),
    intent: analysis.intent || 'unknown',
    confidence: clamp(analysis.confidence ?? 0),
    signals: { ...(analysis.signals || {}) },
    clarifications: [],
    confirmed: null,
    openedAt: now,
    updatedAt: now,
  };
}

/** يسجّل أنّ سؤالًا طُرح. */
export function askClarification(s: IntentSnapshot, id: ClarificationId | string): IntentSnapshot {
  // السؤالُ نفسُه لا يُسجَّل مرّتين: لو أُعيد رسمُ الشاشة صار العدّادُ يقيس
  // إعادةَ الرسم لا الحوار.
  if (s.clarifications.some(c => c.id === id && c.answeredWith === null)) return s;
  return {
    ...s,
    clarifications: [...s.clarifications, {
      id, askedAt: Date.now(), answeredWith: null, answeredAt: null,
      confidenceBefore: s.confidence, confidenceAfter: null,
    }],
    updatedAt: Date.now(),
  };
}

/** يسجّل الجوابَ ويُحدّث الفهم — هنا يقع الارتفاعُ الذي نقيسه. */
export function answerClarification(
  s: IntentSnapshot,
  id: ClarificationId | string,
  optionId: string,
  next: { confidence?: number; signals?: Partial<Signals>; intent?: string } = {},
): IntentSnapshot {
  const now = Date.now();
  const after = next.confidence != null ? clamp(next.confidence) : s.confidence;
  let hit = false;
  const clarifications = s.clarifications.map(c => {
    if (hit || c.id !== id || c.answeredWith !== null) return c;
    hit = true;
    return { ...c, answeredWith: optionId, answeredAt: now, confidenceAfter: after };
  });
  // جوابٌ على سؤالٍ لم يُسجَّل طرحُه: نسجّله كاملًا بدل أن نفقده.
  if (!hit) {
    clarifications.push({
      id, askedAt: now, answeredWith: optionId, answeredAt: now,
      confidenceBefore: s.confidence, confidenceAfter: after,
    });
  }
  return {
    ...s,
    intent: next.intent || s.intent,
    confidence: after,
    signals: { ...s.signals, ...(next.signals || {}), asked: clarifications.map(c => c.id as ClarificationId) },
    clarifications,
    updatedAt: now,
  };
}

/** «فهمت أنّك… صحيح؟» — جوابُ الإنسان. */
export function confirmSnapshot(s: IntentSnapshot, accepted: boolean): IntentSnapshot {
  return { ...s, confirmed: accepted, updatedAt: Date.now() };
}

/** الوجهةُ حين تُحسم. */
export function withDestination(s: IntentSnapshot, destination: { page?: string; url?: string }): IntentSnapshot {
  return { ...s, destination, updatedAt: Date.now() };
}

// ── المشتقّات: تُحسب ولا تُخزَّن ─────────────────────────────────────────────

/** ما سُئل وأُجيب. */
export function resolved(s: IntentSnapshot): string[] {
  return s.clarifications.filter(c => c.answeredWith !== null).map(c => String(c.id));
}

/** ما سُئل ولم يُجَب — سؤالٌ معلّقٌ ينتظر. */
export function pending(s: IntentSnapshot): string[] {
  return s.clarifications.filter(c => c.answeredWith === null).map(c => String(c.id));
}

/** ما لم يُسأل بعدُ وما زال ناقصًا — من محرّك الاستيضاح، لا من قائمةٍ ثانية. */
export function remaining(s: IntentSnapshot): string[] {
  const asked = new Set(s.clarifications.map(c => String(c.id)));
  const out: string[] = [];
  let sig: Signals = { ...s.signals, asked: [...asked] as ClarificationId[] };
  // نمشي في السلسلة حتى ينفد الناقص — بلا تكرارٍ ولا حلقةٍ لا تنتهي.
  for (let i = 0; i < 8; i++) {
    const c = nextClarification(sig);
    if (!c || asked.has(c.id)) break;
    // الملاذُ الأخير ليس نقصًا — إدراجُه يجعل «ما بقي» يَعِد بسؤالٍ لا معنى له.
    if (!isFallback(c.id)) out.push(c.id);
    asked.add(c.id);
    sig = { ...sig, asked: [...asked] as ClarificationId[] };
  }
  return out;
}

/** كم ارتفع الفهمُ بفضل الأسئلة — المقياسُ الذي يحكم على السؤال. */
export function confidenceGain(s: IntentSnapshot): number {
  const answered = s.clarifications.filter(c => c.confidenceAfter !== null);
  if (!answered.length) return 0;
  return round2(answered.reduce((sum, c) => sum + ((c.confidenceAfter as number) - c.confidenceBefore), 0));
}

/**
 * المرحلة — مشتقّةٌ من الثقة وعدد الأسئلة، بنفس نطاقات `clarify`.
 * لا نسخةَ ثانيةً من العتبات هنا: تُستورَد.
 */
export function stageOf(s: IntentSnapshot): SnapshotStage {
  if (s.confirmed === true) return 'done';
  if (s.confidence >= CONFIDENCE.ACT) return 'act';
  if (s.confidence >= CONFIDENCE.CONFIRM) return 'confirm';
  if (s.clarifications.length >= MAX_CLARIFICATIONS) return 'escalate';
  return 'clarify';
}

/**
 * الشكلُ المسطّح الذي يُرسَل للخادم/التعلّم/التصعيد.
 * **بلا نصّ المستخدم** حين لا يُطلب: التصعيدُ لإنسانٍ يحتاجه، والقياسُ لا.
 */
export function toTelemetry(s: IntentSnapshot, { includeRaw = false } = {}) {
  return {
    id: s.id,
    intent: s.intent,
    confidence: round2(s.confidence),
    stage: stageOf(s),
    clarifications: s.clarifications.map(c => String(c.id)),
    resolved: resolved(s),
    remaining: remaining(s),
    gain: confidenceGain(s),
    confirmed: s.confirmed,
    turns: s.clarifications.length,
    ms: s.updatedAt - s.openedAt,
    ...(includeRaw ? { raw: s.raw } : {}),
  };
}

/** ملخّصٌ إنسانيّ لِما فهمناه — نصُّ «فهمت أنّك…» يُبنى من العقد لا من الصفحة. */
export function summarize(s: IntentSnapshot, labels: Record<string, string> = {}): string {
  const parts: string[] = [];
  const t = s.signals.target, d = s.signals.direction;
  if (labels[s.intent]) parts.push(labels[s.intent]);
  if (d) parts.push(d === 'want' ? 'كتقلّب' : 'كتعرض');
  if (t && labels[t]) parts.push(labels[t]);
  if (s.signals.place && s.signals.place !== 'me') parts.push(`ف${s.signals.place}`);
  return parts.join(' ');
}

const clamp = (n: number) => Math.max(0, Math.min(1, Number(n) || 0));
const round2 = (n: number) => Math.round(n * 100) / 100;
