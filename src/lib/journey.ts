// ============================================================
// Journey — تسجيل الرحلة (Analytics + Seconds-to-Result + Replay + Feedback + twinId).
//   ٥ أشياء تخدم البيتا، أساسها واحد: نسجّل كل خطوة بتوقيتها.
//   → Analytics: أين يتوقّف الناس؟  → Replay: أعِد تشغيل الرحلة لتصحيح الأخطاء.
//   → Seconds: كم استغرق حتى النتيجة؟  → Feedback: 😀/😐/😞.  → twinId: احجز هويّة الكائن.
//   بلا خادم: نحفظ محليًّا (مصدر ذهبيّ لضبط الثقة/القوالب لاحقًا من سلوك حقيقيّ).
// ============================================================

const KEY = 'amanzine_journeys';
const CAP = 120;

export type JStepType = 'start' | 'build' | 'assume' | 'question' | 'answer' | 'skip' | 'publish' | 'abandon';
export interface JStep { t: number; type: JStepType; key?: string; value?: any; note?: string; }
export interface Journey {
  id: string; twinId?: string; version: number;
  raw: string; entity?: string; intent?: string; blueprint?: string;
  startedAt: number; endedAt?: number; seconds?: number;
  steps: JStep[]; published: boolean; feedback?: { mood: 'good' | 'ok' | 'bad'; note?: string };
}

const rid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let current: Journey | null = null;

function load(): Journey[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function save(list: Journey[]) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP))); } catch { /* noop */ } }

// بداية رحلة — يُستدعى حين يبني المستخدم السيناريو من جملة.
export function startJourney(raw: string): string {
  // إن بقيت رحلة سابقة مفتوحة بلا نشر → سجّلها كمنسحبة (Analytics: نقطة الخروج).
  if (current && !current.endedAt) finishJourney(false);
  current = { id: rid('j_'), version: 1, raw: raw.trim(), startedAt: Date.now(), steps: [{ t: 0, type: 'start' }], published: false };
  return current.id;
}

export function jMeta(entity?: string, intent?: string, blueprint?: string) {
  if (!current) return; current.entity = entity; current.intent = intent; current.blueprint = blueprint;
}

export function jStep(type: JStepType, data?: { key?: string; value?: any; note?: string }) {
  if (!current) return;
  current.steps.push({ t: Date.now() - current.startedAt, type, ...data });
}

// نهاية الرحلة — تحسب الثواني، وتحجز twinId إن نُشِرت، وتحفظ.
export function finishJourney(published: boolean): Journey | null {
  if (!current) return null;
  current.endedAt = Date.now();
  current.seconds = Math.round((current.endedAt - current.startedAt) / 100) / 10;
  current.published = published;
  if (published) { current.twinId = rid('twn_'); jStep('publish'); }
  else jStep('abandon');
  const list = load(); list.push(current); save(list);
  const done = current; current = null; return done;
}

export function setJourneyFeedback(id: string, mood: 'good' | 'ok' | 'bad', note?: string) {
  const list = load(); const j = list.find(x => x.id === id); if (!j) return;
  j.feedback = { mood, note }; save(list);
}

export function getJourneys(): Journey[] { return load().slice().reverse(); }

// ============================================================
// Reception funnel — قمع الاستقبال في «شنو محتاج؟» (LivingHome). منفصلٌ عن رحلة
//   النشر أعلاه. يُجيب عن أسئلة بيتا الـ١٠: زمن أوّل فهم · عدد الأدوار · أزرار أم
//   كتابة · نقطة الخروج · «شرح نفسه مرّتين». بيانات فقط، محلّيّة (بيتا مُراقَبة).
// ============================================================
const RKEY = 'amanzine_receptions';

export interface Reception {
  id: string; startedAt: number;
  firstIntentAt?: number;       // متى كُتبت أوّل جملة
  firstUnderstoodMs?: number;   // زمن من الدخول حتى أوّل فهم
  turns: number;                // عدد الرسائل/الاختيارات المتبادلة
  usedText: boolean; usedButton: boolean;
  repeated: boolean;            // أعاد شرح نفسه (تشابه جملتين)
  lastStep?: string;            // آخر خطوة قبل الخروج (نقطة الخروج)
  /** `escalate`: عجز النظامُ فسُلّم لإنسان — نتيجةٌ مشروعةٌ تُقاس، لا خروجٌ صامت. */
  outcome?: 'routed' | 'reset' | 'idle' | 'escalate';
  ended: boolean;
}

let rcpt: Reception | null = null;
let rcptIntents: string[] = [];

function rload(): Reception[] { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch { return []; } }
function rsave(l: Reception[]) { try { localStorage.setItem(RKEY, JSON.stringify(l.slice(-CAP))); } catch { /* noop */ } }

// تشابهٌ بسيط بنسبة الكلمات المشتركة (لكشف «شرح نفسه مرّتين») — لا Levenshtein ثقيل.
function similar(a: string, b: string): boolean {
  const na = a.trim().toLowerCase(), nb = b.trim().toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(/\s+/), wb = nb.split(/\s+/);
  const common = wa.filter(w => w.length > 2 && wb.includes(w)).length;
  return common >= Math.min(wa.length, wb.length) * 0.6;
}

export function receptionStart() {
  if (rcpt && !rcpt.ended) receptionEnd('idle'); // استقبالٌ سابقٌ مفتوح → أغلقه
  rcpt = { id: rid('r_'), startedAt: Date.now(), turns: 0, usedText: false, usedButton: false, repeated: false, ended: false };
  rcptIntents = [];
}

// دورٌ من المستخدم: جملةٌ مكتوبة (text) أو اختيارُ زرّ (button).
export function receptionTurn(text: string, source: 'text' | 'button') {
  if (!rcpt) receptionStart();
  const r = rcpt!;
  r.turns++;
  if (source === 'text') r.usedText = true; else r.usedButton = true;
  if (!r.firstIntentAt) r.firstIntentAt = Date.now();
  if (source === 'text') {
    if (rcptIntents.some(p => similar(p, text))) r.repeated = true;
    rcptIntents.push(text);
  }
}

export function receptionUnderstood() {
  if (!rcpt || rcpt.firstUnderstoodMs != null) return;
  rcpt.firstUnderstoodMs = Date.now() - rcpt.startedAt;
}

export function receptionStep(step: string) { if (rcpt) rcpt.lastStep = step; }

export function receptionEnd(outcome: Reception['outcome']) {
  if (!rcpt || rcpt.ended) return;
  rcpt.ended = true; rcpt.outcome = outcome;
  const l = rload(); l.push(rcpt); rsave(l);
  rcpt = null; rcptIntents = [];
}

export function getReceptions(): Reception[] { return rload().slice().reverse(); }

// إحصاءات الاستقبال للبيتا: متوسّط زمن أوّل فهم، متوسّط الأدوار، نسبة الأزرار مقابل
// الكتابة، نسبة «شرح نفسه مرّتين»، نقطة الخروج الأكثر.
export function receptionStats() {
  const l = rload();
  if (!l.length) return { total: 0, avgUnderstoodMs: 0, avgTurns: 0, understoodRate: 0, buttonRate: 0, textRate: 0, repeatedRate: 0, topExit: null as null | { step: string; count: number } };
  const understood = l.filter(r => r.firstUnderstoodMs != null);
  const avgUnderstoodMs = understood.length ? Math.round(understood.reduce((s, r) => s + (r.firstUnderstoodMs || 0), 0) / understood.length) : 0;
  const avgTurns = Math.round((l.reduce((s, r) => s + r.turns, 0) / l.length) * 10) / 10;
  const pct = (n: number) => Math.round((n / l.length) * 100);
  const exit: Record<string, number> = {};
  for (const r of l) if (r.lastStep) exit[r.lastStep] = (exit[r.lastStep] || 0) + 1;
  const top = Object.entries(exit).sort((a, b) => b[1] - a[1])[0];
  return {
    total: l.length, avgUnderstoodMs, avgTurns,
    understoodRate: pct(understood.length),   // نسبة الجلسات التي فُهم فيها أوّل طلب
    buttonRate: pct(l.filter(r => r.usedButton).length),
    textRate: pct(l.filter(r => r.usedText).length),
    repeatedRate: pct(l.filter(r => r.repeated).length),
    topExit: top ? { step: top[0], count: top[1] } : null,
  };
}

// ============================================================
// Decision log — «هل Decision Layer يعمل، وهل أخطأ؟». يسجّل لكلّ قرار: الوضع
//   المختار + النيّة، وقبول/رفض التأكيد. يُجيب: كم مرّة direct/guided/confirm/
//   welcome؟ وكم نسبة قبول «صح؟»؟ وما النيّات الأكثر؟ (Decision Dashboard).
// ============================================================
const DKEY = 'amanzine_decisions';
type Bucket = 'low' | 'mid' | 'high';
interface YN { y: number; n: number }
interface DecisionLog {
  modes: Record<string, number>; intents: Record<string, number>; reasons: Record<string, number>;
  unknown: number; confirmYes: number; confirmNo: number;
  // قبول/رفض «صح؟» موزّعًا حسب الثقة — يكشف: هل الخطأ في الفهم (parseNeed) أم في القرار؟
  conf: Record<Bucket, YN>;
  // جُمَل «ما لم نفهمه» بترددها — يجب أن يبدأ التقاطها قبل البيتا (كنز تطوير المعرفة).
  unknownTexts: Record<string, number>;
  // أثرُ كلّ استيضاح (HU-2): كم مرّةً سُئل · كم مرّةً أُجيب · كم رفع الفهم.
  // السؤالُ الذي يُسأل كثيرًا ولا يرفع الثقةَ سؤالٌ سيّئٌ يجب أن يُبدَّل —
  // ولا يُعرَف ذلك إلّا بقياسه، ولذلك لكلّ استيضاحٍ هويّةٌ ثابتة.
  clarify: Record<string, { asked: number; answered: number; lifted: number; sumGain: number }>;
}
function emptyLog(): DecisionLog { return { modes: {}, intents: {}, reasons: {}, unknown: 0, confirmYes: 0, confirmNo: 0, conf: { low: { y: 0, n: 0 }, mid: { y: 0, n: 0 }, high: { y: 0, n: 0 } }, unknownTexts: {}, clarify: {} }; }
const bucketOf = (c: number): Bucket => c < 0.5 ? 'low' : c < 0.7 ? 'mid' : 'high';

function dload(): DecisionLog { try { const v = JSON.parse(localStorage.getItem(DKEY) || 'null'); if (v && v.modes && v.conf) return v; } catch { /* noop */ } return emptyLog(); }
function dsave(d: DecisionLog) { try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch { /* noop */ } }

// Learning loop — نبلّغ الخادم بما لم نفهمه (fire-and-forget، لا يكسر شيئًا عند الفشل).
function reportUnknown(text: string) {
  try {
    if (typeof fetch === 'undefined') return;
    fetch('/api/ai/report-unknown', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ text }),
    }).catch(() => { /* بلا شبكة ⇒ يبقى محليًّا في unknownTexts */ });
  } catch { /* noop */ }
}

export function recordDecision(mode: string, intent: string, reason?: string, raw?: string) {
  const d = dload();
  d.modes[mode] = (d.modes[mode] || 0) + 1;
  if (intent === 'unknown') {
    d.unknown++;
    const t = (raw || '').trim().slice(0, 80);
    if (t) { if (!d.unknownTexts) d.unknownTexts = {}; d.unknownTexts[t] = (d.unknownTexts[t] || 0) + 1; reportUnknown(t); }
  } else d.intents[intent] = (d.intents[intent] || 0) + 1;
  if (reason) d.reasons[reason] = (d.reasons[reason] || 0) + 1;
  dsave(d);
}

// ── أثرُ الاستيضاح (HU-2) ────────────────────────────────────────────────────
//
//   المقياسُ الوحيدُ الذي يهمّ في سؤالٍ: **هل رفع الفهمَ؟** نسجّل الثقةَ قبله
//   وبعده. سؤالٌ يُسأل مئةَ مرّةٍ ولا يرفع شيئًا هو ضريبةٌ على المستخدم لا
//   مساعدةً له — والبياناتُ وحدَها تكشف ذلك، لا الحدس.

function _cl(d: DecisionLog, id: string) {
  if (!d.clarify) d.clarify = {};
  if (!d.clarify[id]) d.clarify[id] = { asked: 0, answered: 0, lifted: 0, sumGain: 0 };
  return d.clarify[id];
}

/** سُئل استيضاحٌ — يُسجَّل بهويّته لا بنصّه. */
export function recordClarificationAsked(id: string, confidenceBefore = 0) {
  const d = dload();
  _cl(d, id).asked++;
  dsave(d);
  _report({ kind: 'clarify', action: 'asked', name: id, source: String(Math.round(confidenceBefore * 100)) });
}

/** أُجيب — وهذا هو موضعُ الحقيقة: كم ارتفعت الثقة؟ */
export function recordClarificationAnswered(id: string, optionId: string, before = 0, after = 0) {
  const d = dload();
  const c = _cl(d, id);
  c.answered++;
  const gain = after - before;
  if (gain > 0) { c.lifted++; c.sumGain += gain; }
  dsave(d);
  _report({ kind: 'clarify', action: 'answered', name: `${id}:${optionId}`, source: String(Math.round(gain * 100)) });
}

/**
 * لقطةُ الطلب عند إغلاقه (وجهةٌ أو تصعيد) — العقدُ كاملًا في سجلٍّ واحد.
 *
 *   بدل أن يُعيد كلُّ مستهلكٍ تركيبَ الحوار من أحداثٍ متفرّقة، تُرسَل اللقطةُ
 *   كما هي: كم دورًا · ما سُئل · ما بقي · كم ارتفع الفهم. وبلا نصّ المستخدم
 *   — القياسُ لا يحتاجه، والخصوصيّةُ تُصان افتراضًا لا استثناءً.
 */
export function recordSnapshot(t: { id: string; intent: string; stage: string; turns: number; gain: number; remaining: string[] }) {
  _report({
    kind: 'clarify', action: 'resolved',
    name: `${t.intent}:${t.stage}`,
    source: `t${t.turns}g${Math.round(t.gain * 100)}r${t.remaining.length}`,
  });
}

/** إحصاءُ الاستيضاحات — أيُّ سؤالٍ يستحقّ البقاء. */
export function clarifyStats() {
  const d = dload();
  return Object.entries(d.clarify || {}).map(([id, c]) => ({
    id,
    asked: c.asked,
    answered: c.answered,
    answerRate: c.asked ? Math.round((c.answered / c.asked) * 100) : null,
    // «رفع الفهم» = نسبةُ الأجوبة التي زادت الثقة، ومتوسّطُ الزيادة.
    liftRate: c.answered ? Math.round((c.lifted / c.answered) * 100) : null,
    avgGain: c.lifted ? Math.round((c.sumGain / c.lifted) * 100) : null,
  })).sort((a, b) => b.asked - a.asked);
}

// نفسُ قناةِ القياس الموجودة (`/api/track`) — لا مسارَ ثانٍ يتباعد عنها.
function _report(body: Record<string, string>) {
  try {
    if (typeof fetch === 'undefined') return;
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify(body),
    }).catch(() => { /* بلا شبكة ⇒ يبقى محليًّا */ });
  } catch { /* noop */ }
}

// قبول «فهمت أنّك… صح؟» (✅) أو رفضه (❌) موزّعًا حسب الثقة — أثمن إشارةٍ على دقّة الفهم.
export function recordConfirm(accepted: boolean, confidence = 0) {
  const d = dload();
  const b = bucketOf(confidence);
  if (accepted) { d.confirmYes++; d.conf[b].y++; } else { d.confirmNo++; d.conf[b].n++; }
  dsave(d);
}

export function decisionStats() {
  const d = dload();
  const totalModes = Object.values(d.modes).reduce((s, n) => s + n, 0);
  const confirmTotal = d.confirmYes + d.confirmNo;
  const topIntents = Object.entries(d.intents).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => ({ intent: k, count: v }));
  const topReasons = Object.entries(d.reasons).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ reason: k, count: v }));
  const topUnknown = Object.entries(d.unknownTexts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ text: k, count: v }));
  const rate = (yn: YN) => { const t = yn.y + yn.n; return t ? Math.round((yn.y / t) * 100) : null; };
  return {
    modes: d.modes, totalModes, topIntents, topReasons, topUnknown, unknown: d.unknown,
    confirmYes: d.confirmYes, confirmNo: d.confirmNo,
    confirmAcceptRate: confirmTotal ? Math.round((d.confirmYes / confirmTotal) * 100) : null,
    // قبول التأكيد حسب الثقة: ثقةٌ عالية برفضٍ عالٍ ⇒ مشكلة فهمٍ لا قرار.
    acceptByConfidence: { low: rate(d.conf.low), mid: rate(d.conf.mid), high: rate(d.conf.high) },
  };
}

// ============================================================
// Trend — لقطةٌ يوميّة تُلتقَط مرّةً في اليوم، لتُظهر اللوحة الاتّجاه (↑/↓) لا
//   الحالة فقط. «Unknown ٧ · ↑+٣ من أمس». يجب أن تبدأ قبل البيتا كي يوجد تاريخ.
// ============================================================
const SKEY = 'amanzine_snapshots';
interface Snap { date: string; understoodRate: number; unknown: number; confirmReject: number; users: number; }

function sload(): Snap[] { try { return JSON.parse(localStorage.getItem(SKEY) || '[]'); } catch { return []; } }

// تُلتقَط لقطة اليوم إن لم تُلتقَط بعد (تُستدعى عند فتح لوحة البيتا).
export function snapshotDaily() {
  const today = new Date().toISOString().slice(0, 10);
  const l = sload();
  if (l.some(s => s.date === today)) return;
  const r = receptionStats(); const d = decisionStats();
  const ct = d.confirmYes + d.confirmNo;
  l.push({ date: today, understoodRate: r.understoodRate, unknown: d.unknown, confirmReject: ct ? Math.round((d.confirmNo / ct) * 100) : 0, users: r.total });
  try { localStorage.setItem(SKEY, JSON.stringify(l.slice(-30))); } catch { /* noop */ }
}

// فرقُ اليوم عن آخر لقطةٍ سابقة (null إن لم يوجد تاريخٌ كافٍ بعد).
export function trend(): { understoodRate: number; unknown: number; confirmReject: number; users: number } | null {
  const l = sload();
  if (l.length < 2) return null;
  const cur = l[l.length - 1], prev = l[l.length - 2];
  return {
    understoodRate: cur.understoodRate - prev.understoodRate,
    unknown: cur.unknown - prev.unknown,
    confirmReject: cur.confirmReject - prev.confirmReject,
    users: cur.users - prev.users,
  };
}

// إحصاءات خفيفة للبيتا (Analytics): معدّل الثواني، نسبة النشر، توزيع الرضا، نقطة الخروج الأكثر.
export function journeyStats() {
  const list = load();
  const done = list.filter(j => j.published);
  const avgSec = done.length ? Math.round((done.reduce((s, j) => s + (j.seconds || 0), 0) / done.length) * 10) / 10 : 0;
  const fb = { good: 0, ok: 0, bad: 0 };
  for (const j of list) if (j.feedback) fb[j.feedback.mood]++;
  // نقطة الخروج: آخر سؤال في الرحلات المنسحبة
  const drop: Record<string, number> = {};
  for (const j of list) if (!j.published) { const q = [...j.steps].reverse().find(s => s.type === 'question'); if (q?.key) drop[q.key] = (drop[q.key] || 0) + 1; }
  const topDrop = Object.entries(drop).sort((a, b) => b[1] - a[1])[0];
  return { total: list.length, published: done.length, publishRate: list.length ? Math.round((done.length / list.length) * 100) : 0, avgSec, feedback: fb, topDrop: topDrop ? { key: topDrop[0], count: topDrop[1] } : null };
}
