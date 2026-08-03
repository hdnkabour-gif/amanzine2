import { CITIES } from './knowledgeData';
import { PLACES, type PlaceData } from './places.data';

// ============================================================
// الأماكن — مصدرٌ واحدٌ لكلّ ما يُكتب في خانة المدينة.
//
//   يجمع مصدرَين لا ثالثَ لهما:
//     • `CITIES`  — المدنُ الكبرى بأحيائها ولهجاتها («كازا» · «دارلبيضا»)
//     • `PLACES`  — الجماعاتُ والمراكزُ الصغيرة (٤٠٥ مكانًا)
//
//   ثلاثُ قدراتٍ تُبنى فوقه:
//     ① **إكمالٌ أثناء الكتابة** — يكتب حرفًا فتظهر المطابقاتُ بالعربيّة
//        والفرنسيّة معًا. لا قائمةٌ طويلةٌ تُعرَض دفعةً واحدة.
//     ② **حلٌّ للاسم** — «kech» · «مراكش» · «Marrakech» ⇒ مكانٌ واحد.
//     ③ **مقارنةٌ لِما لا يُعرَف** — يلصق المالكُ مدنَ شركةٍ جديدة، فيقول
//        النظامُ: هذه معروفةٌ · هذه تشبه «كذا» · هذه جديدةٌ فعلًا.
//
//   والمعرفةُ **ليست ملكًا لشركةِ توصيل**. مُعرِّفُ الشركة يعيش في جدول
//   الربط؛ المكانُ يبقى عندنا ولو بُدِّلت الشركةُ عشرَ مرّات.
// ============================================================

export interface Place {
  ar: string;
  fr: string;
  /** أحياءٌ معروفةٌ إن كانت مدينةً كبرى — تُستعمل لتمييز العنوان عن المدينة. */
  districts: string[];
  /** كلُّ شكلٍ مُطبَّعٍ يُطابِق هذا المكان. */
  keys: string[];
  /** كبرى (لها أحياءٌ ولهجات) أم مركزٌ صغير. */
  major: boolean;
}

/** تطبيعٌ عربيّ — مطابقٌ لِما في `knowledge.ts` وإلّا لم يلتقِ الطرفان. */
export function normAr(s: string): string {
  return (s || '').toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[گﮒڭ]/g, 'ك').replace(/ڤ/g, 'ف').replace(/پ/g, 'ب')
    .replace(/\s+/g, ' ').trim();
}

/** تطبيعٌ لاتينيّ — يزيل النبرات والشرطات: «Sabaâ Aïyoun» ⇒ «sabaa aiyoun». */
export function normLat(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** الشكلُ المُطبَّعُ أيًّا كانت لغةُ الكتابة. */
export function normPlace(s: string): string {
  return /[؀-ۿ]/.test(s || '') ? normAr(s) : normLat(s);
}

// ── الدمج: الكبرى أوّلًا، ثمّ الصغرى بلا تكرار ────────────────
const byKey = new Map<string, Place>();
const all: Place[] = [];

function register(p: Place) {
  all.push(p);
  for (const k of p.keys) if (k && !byKey.has(k)) byKey.set(k, p);
}

for (const c of CITIES) {
  const keys = new Set<string>();
  for (const v of [c.ar, c.darija, c.fr, c.en, ...(c.aliases || [])]) {
    const n = normPlace(String(v || ''));
    if (n.length >= 2) keys.add(n);
  }
  register({
    ar: c.ar, fr: c.fr || c.ar,
    districts: (c.districts || []).filter(d => d && !d.startsWith('(')),
    keys: [...keys], major: true,
  });
}

for (const p of PLACES as PlaceData[]) {
  const keys = new Set<string>();
  for (const v of [p.ar, p.fr, ...(p.aliases || [])]) {
    const n = normPlace(String(v || ''));
    if (n.length >= 2) keys.add(n);
  }
  // مكانٌ تعرفه المدنُ الكبرى سلفًا (تازة · تيفلت · الحسيمة …).
  //
  //   **يُدمَج ولا يُتجاهَل.** أوّلُ صيغةٍ هنا كانت `continue`، فكانت «تيفلت»
  //   الموجودةُ في المدن الكبرى **بلا اسمٍ فرنسيّ** تبتلع مدخلَنا كلَّه —
  //   ومعه المفتاحُ اللاتينيّ `tiflet`. النتيجة: من كتب «tiflet» لا يجد
  //   شيئًا، ومن كتب «تيفلت» يجد. المعرفةُ تُضاف ولا تُلغى.
  const host = [...keys].map(k => byKey.get(k)).find(Boolean);
  if (host) {
    for (const k of keys) if (!byKey.has(k)) { host.keys.push(k); byKey.set(k, host); }
    if (!host.fr || host.fr === host.ar) host.fr = p.fr;
    continue;
  }
  register({ ar: p.ar, fr: p.fr, districts: [], keys: [...keys], major: false });
}

export const PLACE_COUNT = all.length;
export function allPlaces(): Place[] { return all; }

/**
 * أماكنُ اعتمدها الإنسانُ في مركز المعرفة — تدخل الفهرسَ فورًا.
 *
 *   بلا هذه الدالّة كان المكانُ المعتمَدُ يُخزَّن في المتصفّح ولا يعرفه
 *   المحرّكُ أبدًا: الفهارسُ تُبنى عند تحميل الوحدة. نفسُ العطب الذي عولج
 *   في `registerRuntimeConcepts` للمفاهيم — والحلُّ نفسُه.
 */
export function registerLearnedPlaces(names: string[]): number {
  let added = 0;
  for (const raw of names || []) {
    const name = String(raw || '').trim();
    const n = normPlace(name);
    if (n.length < 2 || byKey.has(n)) continue;
    // الاسمُ كما كتبه الإنسانُ هو الاسمُ المعروض — لا نترجم ما لا نعرف.
    register({ ar: name, fr: name, districts: [], keys: [n], major: false });
    added++;
  }
  return added;
}

/** استرجاعُ ما اعتُمد سابقًا عند إقلاع التطبيق. */
export function loadLearnedPlaces(): number {
  try {
    if (typeof localStorage === 'undefined') return 0;
    return registerLearnedPlaces(JSON.parse(localStorage.getItem('amanzine_learned_places') || '[]'));
  } catch { return 0; }
}

/** حلُّ اسمٍ إلى مكان — أيًّا كانت لغتُه أو إملاؤه. */
export function resolvePlace(input: string): Place | undefined {
  const n = normPlace(input);
  if (n.length < 2) return undefined;
  return byKey.get(n);
}

/**
 * **الإكمالُ أثناء الكتابة.** يكتب المالكُ حرفًا فتظهر المطابقاتُ — لا
 * القائمةُ كلُّها. البدايةُ تسبق الاحتواء، والكبرى تسبق الصغرى: من كتب
 * «تا» يريد «تازة» قبل «تاسيلتانت».
 */
export function suggestPlaces(query: string, limit = 8): Place[] {
  const n = normPlace(query);
  if (n.length < 1) return all.filter(p => p.major).slice(0, limit);
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (const p of all) {
    if (p.keys.some(k => k.startsWith(n))) starts.push(p);
    else if (p.keys.some(k => k.includes(n))) contains.push(p);
    if (starts.length >= limit * 2) break;
  }
  const rank = (a: Place, b: Place) =>
    (b.major ? 1 : 0) - (a.major ? 1 : 0) || a.ar.length - b.ar.length;
  return [...starts.sort(rank), ...contains.sort(rank)].slice(0, limit);
}

// ── المقارنة: هل هذا الاسمُ جديدٌ فعلًا؟ ───────────────────────

/** مسافةُ ليفنشتاين — تُقاس على المُطبَّع، لا على المكتوب. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1, cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

export type PlaceVerdict =
  | { kind: 'known'; input: string; place: Place }
  | { kind: 'similar'; input: string; place: Place; distance: number; why: string }
  | { kind: 'district'; input: string; place: Place; why: string }
  | { kind: 'new'; input: string };

/**
 * حكمٌ على اسمٍ واحد. الأحكامُ أربعة، وترتيبُها متعمَّد:
 *
 *   `known`    — معروفٌ حرفيًّا
 *   `district` — **حيٌّ داخل مدينةٍ لا مدينة**. «عين الشق» ليست مدينةً بل
 *                حيًّا في الدار البيضاء، وإضافتُها مدينةً تُفسد البحثَ لاحقًا.
 *   `similar`  — إملاءٌ آخرُ لمكانٍ معروف («Rissani» / «Risani»)
 *   `new`      — جديدٌ فعلًا، يستحقّ الإضافة
 */
export function judgePlace(input: string, maxDistance = 2): PlaceVerdict {
  const raw = (input || '').trim();
  const n = normPlace(raw);
  if (n.length < 2) return { kind: 'new', input: raw };

  const exact = byKey.get(n);
  if (exact) return { kind: 'known', input: raw, place: exact };

  // حيٌّ داخل مدينة؟ يُفحَص قبل التشابه: الحيُّ يُطابِق مدينتَه تمامًا.
  for (const p of all) {
    for (const d of p.districts) {
      if (normPlace(d) === n) {
        return { kind: 'district', input: raw, place: p, why: `حيٌّ داخل «${p.ar}»` };
      }
    }
  }

  // أقربُ إملاءٍ معروف. النسبةُ تُقاس بطول الاسم: خطأُ حرفٍ في اسمٍ من
  // أربعة أحرفٍ ليس كخطأِ حرفٍ في اسمٍ من عشرين.
  let best: { place: Place; d: number } | null = null;
  for (const p of all) {
    for (const k of p.keys) {
      if (Math.abs(k.length - n.length) > maxDistance) continue;
      const d = distance(n, k);
      if (d <= maxDistance && (!best || d < best.d)) best = { place: p, d };
    }
  }
  if (best) {
    return {
      kind: 'similar', input: raw, place: best.place, distance: best.d,
      why: `يشبه «${best.place.ar}» (${best.place.fr}) بفارق ${best.d} حرفًا`,
    };
  }
  return { kind: 'new', input: raw };
}

/**
 * حكمٌ على قائمةٍ ملصوقة. يلصق المالكُ مدنَ شركةٍ جديدة — مفصولةً بأسطرٍ أو
 * فواصلَ أو «·» — فيرى ما يعرفه النظامُ سلفًا وما لا يعرفه.
 */
export function judgePlaceList(text: string, maxDistance = 2): {
  known: PlaceVerdict[]; similar: PlaceVerdict[]; district: PlaceVerdict[]; fresh: PlaceVerdict[];
} {
  const items = (text || '')
    .split(/[\n\r·|;,\t]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
  const seen = new Set<string>();
  const out = { known: [] as PlaceVerdict[], similar: [] as PlaceVerdict[], district: [] as PlaceVerdict[], fresh: [] as PlaceVerdict[] };
  for (const it of items) {
    const key = normPlace(it);
    if (seen.has(key)) continue;      // المكرَّرُ في اللصق لا يُحسَب مرّتين
    seen.add(key);
    const v = judgePlace(it, maxDistance);
    if (v.kind === 'known') out.known.push(v);
    else if (v.kind === 'district') out.district.push(v);
    else if (v.kind === 'similar') out.similar.push(v);
    else out.fresh.push(v);
  }
  return out;
}
