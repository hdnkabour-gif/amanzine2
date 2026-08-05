import { normLoose, normLatin } from '../../normalize';
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
  /**
   * مُعرِّفٌ ثابتٌ لا يتغيّر بتغيّر الاسم المعروض.
   *
   *   `delivery_provider_city_mappings.city_id` يربط مدينتَنا بمُعرِّف الشركة.
   *   ولو كان المفتاحُ هو الاسمَ المعروضَ لانكسر كلُّ ربطٍ يومَ نُصحّح إملاءً
   *   («الدارالبيضاء» ⇐ «الدار البيضاء»). المُعرِّفُ يُشتقّ من الاسم الفرنسيّ
   *   لأنّه أثبتُ إملاءً، ولا يُشتقّ من العربيّ إلّا عند غيابه.
   */
  id: string;
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
export const normAr = normLoose;   // كان نسخةً محلّيّة

/** تطبيعٌ لاتينيّ — يزيل النبرات والشرطات: «Sabaâ Aïyoun» ⇒ «sabaa aiyoun». */
export const normLat = normLatin;   // كان نسخةً محلّيّة

/** الشكلُ المُطبَّعُ أيًّا كانت لغةُ الكتابة. */
export function normPlace(s: string): string {
  return /[؀-ۿ]/.test(s || '') ? normAr(s) : normLat(s);
}

// ── الدمج: الكبرى أوّلًا، ثمّ الصغرى بلا تكرار ────────────────
const byKey = new Map<string, Place>();
const byId = new Map<string, Place>();
/** فهرسُ الأحياء: اسمُ الحيّ ⇐ مدينتُه. يُستعمل في تفكيك الأسماء المركّبة. */
const districtByKey = new Map<string, Place>();
const all: Place[] = [];

/** مُعرِّفٌ لاتينيٌّ قصير: «Aït Melloul» ⇐ `ait_melloul`. */
function slugify(fr: string, ar: string): string {
  const base = normLat(fr) || normLat(ar);
  if (base) return base.replace(/ /g, '_');
  // اسمٌ عربيٌّ محضٌ بلا مقابلٍ لاتينيّ — المُعرِّفُ يُبنى من حروفه المُطبَّعة.
  return 'ar_' + normAr(ar).replace(/ /g, '_');
}

function register(p: Omit<Place, 'id'> & { id?: string }): Place {
  let id = p.id || slugify(p.fr, p.ar);
  // تصادمُ مُعرِّفَين (بلديّتان بالاسم نفسِه في إقليمَين) — يُرقَّم ولا يُدهَس.
  if (byId.has(id)) { let n = 2; while (byId.has(`${id}_${n}`)) n++; id = `${id}_${n}`; }
  const place = { ...p, id } as Place;
  all.push(place);
  byId.set(id, place);
  for (const k of place.keys) if (k && !byKey.has(k)) byKey.set(k, place);
  for (const d of place.districts) {
    const n = normPlace(d);
    if (n.length >= 3 && !districtByKey.has(n)) districtByKey.set(n, place);
  }
  return place;
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

/** البحثُ بالمُعرِّف الثابت — ما يخزّنه جدولُ ربطِ شركات التوصيل. */
export function placeById(id: string): Place | undefined {
  return byId.get(String(id || '').trim());
}

/**
 * كلماتٌ إداريّةٌ لا تصنع مكانًا جديدًا. «الرشيدية المدينة» هي الرشيدية،
 * و«عين السبع الحي الصناعي» هي عين السبع.
 */
const ADMIN_WORDS = new Set([
  'المدينه', 'مدينه', 'الحي', 'حي', 'الصناعي', 'الصناعيه', 'جماعه', 'الجماعه',
  'اقليم', 'الاقليم', 'عماله', 'جهه', 'الجهه', 'قياده', 'دائره', 'مركز', 'باشويه',
  'ville', 'centre', 'commune', 'province', 'prefecture', 'region', 'cercle',
  'zone', 'industrielle', 'quartier', 'municipalite', 'sud', 'nord', 'est', 'ouest',
]);

/**
 * **تفكيكُ الاسم المركّب.** قوائمُ شركات التوصيل لا تكتب «تمسية» وحدَها، بل
 * «Temsia Agadir» و«Temsia Chtouka Ait Baha» و«الرشيدية المدينة». هذه ليست
 * ثلاثَ مدنٍ بل مدينةٌ واحدةٌ مُخصَّصة، وقياسُ التشابه لا يلتقطها لأنّ الفارقَ
 * كلماتٌ لا حروف.
 *
 *   يُجرَّب أطولُ نافذةٍ أوّلًا: «سيدي بنور» تسبق «سيدي».
 *   والباقي يُفحَص: إن كان كلماتٍ إداريّةً أو أماكنَ معروفةً فالتخصيصُ مؤكَّد.
 */
function decompose(n: string): { hit: Place; isDistrict: boolean; rest: string[]; sure: boolean } | null {
  const t = n.split(' ').filter(Boolean);
  if (t.length < 2) return null;
  for (let len = t.length - 1; len >= 1; len--) {
    for (let i = 0; i + len <= t.length; i++) {
      const key = t.slice(i, i + len).join(' ');
      if (key.length < 4) continue;      // نافذةٌ قصيرةٌ تُطابِق بالمصادفة
      // **المدينةُ تسبق الحيّ.** «تمارة» مُدرَجةٌ حيًّا في الرباط وهي مدينةٌ
      // قائمةٌ بذاتها؛ لو قُدّم فهرسُ الأحياءِ لصارت «تمارة الجديدة» حيًّا في
      // الرباط. الاسمُ الذي يعرفه المكانُ نفسُه أصدقُ من الاسم الذي يعرفه جارُه.
      const asCity = byKey.get(key);
      const d = asCity ? undefined : districtByKey.get(key);
      const p = asCity || d;
      if (!p) continue;
      const rest = [...t.slice(0, i), ...t.slice(i + len)];
      const sure = rest.every(w =>
        ADMIN_WORDS.has(w) || byKey.has(w) || districtByKey.has(w) ||
        p.districts.some(x => normPlace(x) === w));
      // إن لم يكن الباقي معروفًا، نقبل التخصيصَ فقط حين يتصدّر الاسمُ المعروفُ
      // السطر — فهكذا تكتب الشركاتُ: المدينةُ أوّلًا ثمّ التخصيص.
      if (!sure && i !== 0) continue;
      return { hit: p, isDistrict: !!d, rest, sure };
    }
  }
  return null;
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
  const hits = [...starts.sort(rank), ...contains.sort(rank)];

  // **من أخطأ في الكتابة لا يُترَك بلا شيء.** «tmara» ليست بدايةً لِـ«temara»
  // ولا جزءًا منها، فكانت القائمةُ تخرج فارغةً ويظنّ الكاتبُ أنّ مدينتَه
  // مجهولة. القربُ يُقاس حين يعجز الاحتواء — لا قبلَه، كي لا يُزاحِم البعيدُ
  // القريبَ.
  if (!hits.length && n.length >= 3) {
    const near: { p: Place; d: number }[] = [];
    for (const p of all) {
      let best = 99;
      for (const k of p.keys) {
        if (Math.abs(k.length - n.length) > 2) continue;
        const d = distance(n, k);
        if (d < best) best = d;
      }
      if (best <= 2) near.push({ p, d: best });
    }
    near.sort((a, b) => a.d - b.d || (b.p.major ? 1 : 0) - (a.p.major ? 1 : 0));
    return near.slice(0, limit).map(x => x.p);
  }
  return hits.slice(0, limit);
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
  | { kind: 'known'; input: string; place: Place; why?: string }
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
  const asDistrict = districtByKey.get(n);
  if (asDistrict) {
    return { kind: 'district', input: raw, place: asDistrict, why: `حيٌّ داخل «${asDistrict.ar}»` };
  }

  // اسمٌ مركّب؟ «Temsia Agadir» ليست مدينةً جديدة. يُفحَص قبل التشابه لأنّ
  // الفارقَ هنا كلماتٌ لا حروف، فلا تراه مسافةُ ليفنشتاين أبدًا.
  const parts = decompose(n);
  if (parts) {
    const extra = parts.rest.join(' ');
    if (parts.isDistrict) {
      return {
        kind: 'district', input: raw, place: parts.hit,
        why: `حيٌّ داخل «${parts.hit.ar}»${extra ? ` (${extra})` : ''}`,
      };
    }
    return {
      kind: 'known', input: raw, place: parts.hit,
      why: parts.sure ? `«${parts.hit.ar}» مع تخصيصٍ إداريّ` : `«${parts.hit.ar}» متبوعةً بـ«${extra}»`,
    };
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
