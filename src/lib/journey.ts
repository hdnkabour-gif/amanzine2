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
