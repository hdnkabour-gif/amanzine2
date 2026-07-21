import { getInteractions, type Interaction } from '../experienceLog';

// ============================================================
// Candidate Knowledge — Observation → Candidate → Validated (لا اعتماد آليّ).
// نُنقّب أنماط التجارب المتكرّرة (نفس العبارة تقود لنفس المفهوم)، فنقترحها
// «مرشّحة» بثقة وعدد تجارب — ثم المدير يعتمدها فتصبح Validated بإصدار جديد.
// السبب: خطأ في المعرفة أخطر من غيابها.
// ============================================================

export interface Candidate {
  id: string;
  phrase: string;      // العبارة كما كتبها المستخدمون
  concept: string;     // المفهوم المهيمن (مهنة/صنف)
  support: number;     // عدد التجارب
  confidence: number;  // 0..1 (هيمنة المفهوم + الرضا)
  satisfaction: number;
}

const LEARN_KEY = 'amanzine_learned';
const VER_KEY = 'amanzine_kb_version';

export function kbVersion(): number {
  try { return Number(localStorage.getItem(VER_KEY) || '1'); } catch { return 1; }
}

// اعتماد مرشّحة ⇒ معرفة مُثبَّتة + رفع الإصدار (Versioning مبسّط، محلّيّ).
export function validateCandidate(phrase: string, concept: string): number {
  try {
    const m = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
    m[phrase.toLowerCase()] = concept;
    localStorage.setItem(LEARN_KEY, JSON.stringify(m));
    const next = kbVersion() + 1;
    localStorage.setItem(VER_KEY, String(next));
    return next;
  } catch { return kbVersion(); }
}

export function mineCandidates(minSupport = 3, log?: Interaction[]): Candidate[] {
  const all = log || getInteractions();
  const validated = (() => { try { return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}'); } catch { return {}; } })();

  const groups = new Map<string, Interaction[]>();
  for (const i of all) {
    const phrase = (i.object?.raw || i.raw || '').trim();
    if (!phrase) continue;
    const key = phrase.toLowerCase();
    if (validated[key]) continue; // مُثبَّتة سلفًا
    const arr = groups.get(key) || [];
    arr.push(i); groups.set(key, arr);
  }

  const out: Candidate[] = [];
  for (const [, items] of groups) {
    if (items.length < minSupport) continue;
    const counts = new Map<string, number>();
    for (const it of items) {
      const c = it.object?.profession || it.object?.category || it.what;
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    }
    if (!counts.size) continue;
    const [concept, cCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const dominance = cCount / items.length;
    const satTotal = items.filter(x => x.satisfied != null).length;
    const satRate = satTotal ? items.filter(x => x.satisfied === true).length / satTotal : 0.7;
    const confidence = Math.min(0.999, dominance * 0.7 + satRate * 0.3);
    out.push({ id: `cand:${items[0].raw}`, phrase: items[0].object?.raw || items[0].raw, concept, support: items.length, confidence, satisfaction: satRate });
  }
  return out.sort((a, b) => b.support - a.support);
}
