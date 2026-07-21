import type { NeedObject } from './needEngine';

// ============================================================
// experienceLog — بذرة «المعرفة التي تبني نفسها» + Life Memory.
// نسجّل كل تفاعل نيّة محلّيًّا: (ماذا كتب → أين ذهب → كيف). البيانات
// لا تُستدرَك بأثر رجعيّ، فنبدأ جمعها اليوم؛ الذكاء (Experience Graph/AI)
// يُبنى فوقها لاحقًا. محلّيّ بالكامل، وقابل للمسح (خصوصيّة المستخدم).
// ============================================================

export type Via = 'type' | 'example' | 'memory' | 'guided';

// Experience كيان (لا Log): قصّة الطلب كاملة — النيّة، الرحلة، السياق، الوجهة.
export interface Interaction {
  at: number;
  raw: string;            // نصّ المستخدم
  intent: string;
  what: string;           // وصف الوجهة بلغة بشريّة (يُعرض في Life Memory)
  dest: string;           // page:orders | url:/market …
  via: Via;
  object?: NeedObject;    // الكائن المنظّم وقت التفاعل
  journey?: string;       // الرحلة التي اختارها الـ Orchestrator (buying/selling/…)
  context?: any;          // لقطة سياق مختصرة (وقت/مكان/بائع؟) لتحليل لاحق
  satisfied?: boolean;    // Feedback Loop: هل لقى المستخدم مُراده؟ (أقوى من أي AI)
}

const KEY = 'amanzine_xp_log';
const CAP = 200;

export function getInteractions(): Interaction[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function logInteraction(i: Interaction): void {
  try {
    const all = getInteractions();
    all.unshift(i);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, CAP)));
  } catch { /* noop */ }
}

// آخر تفاعل بنفس النيّة (أساس «آخر مرة… تعاود؟»)
export function lastByIntent(intent: string, log?: Interaction[]): Interaction | undefined {
  return (log || getInteractions()).find(i => i.intent === intent);
}

// Feedback Loop: تسجيل رضا المستخدم عن تجربة (بالطابع الزمنيّ).
export function setSatisfaction(at: number, satisfied: boolean): void {
  try {
    const all = getInteractions();
    const it = all.find(x => x.at === at);
    if (it) { it.satisfied = satisfied; localStorage.setItem(KEY, JSON.stringify(all)); }
  } catch { /* noop */ }
}

// صحّة المعرفة: نِسَب الفهم/الرضا من التجارب المحلّية (لـ Knowledge Center).
export function knowledgeHealth(log?: Interaction[]): { total: number; understood: number; understandRate: number; unknown: number; satisfied: number; unsatisfied: number } {
  const all = log || getInteractions();
  const understood = all.filter(i => i.intent && i.intent !== 'unknown').length;
  const unknown = all.filter(i => i.intent === 'unknown').length;
  const satisfied = all.filter(i => i.satisfied === true).length;
  const unsatisfied = all.filter(i => i.satisfied === false).length;
  return { total: all.length, understood, understandRate: all.length ? understood / all.length : 1, unknown, satisfied, unsatisfied };
}

// أكثر النوايا تكرارًا (لِلَمحات مستقبليّة عن اهتمامات المستخدم)
export function intentCounts(log?: Interaction[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of (log || getInteractions())) out[i.intent] = (out[i.intent] || 0) + 1;
  return out;
}

// خصوصيّة: مسح كامل لذاكرة التفاعلات
export function clearExperience(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
