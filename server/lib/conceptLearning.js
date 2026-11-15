'use strict';
// ============================================================
// **تعلُّمُ المفاهيم — مصدرٌ واحدٌ لقناتَي التعلّم.**
//
//   كانت قناتان لا تعرف إحداهما الأخرى:
//     ① بحثٌ بلا نتيجة ⇒ `/api/knowledge/misses/:id/resolve` ⇒ **تصل المعرفة**
//     ② فهمُ الذكاء    ⇒ `/api/ai/judge-unknown`           ⇒ **تبديلُ حالةٍ ثمّ لا شيء**
//
//   فكان المشغّلُ يعتمد في الثانية ويظنّ أنّه علّم النظام، ولا يتغيّر سلوكُ
//   التطبيق إطلاقًا: نفسُ الكلمة تُصعَّد إلى الذكاء غدًا وتستهلك حصّةً ومالًا
//   من جديد. وقناتان تتباعدان أسوأُ من واحدةٍ ناقصة.
//
//   هنا **عمليّةٌ واحدة** يستدعيها البابان: «أضِف هذه الألفاظَ مرادفاتٍ
//   لهذا المفهوم». ومن قوانين المشروع: لا مرادفَ يُسرَق من مفهومٍ آخر،
//   ولا كتابةَ بلا لقطةٍ تسمح بالتراجع.
// ============================================================
const { db } = require('../database');

// **ويُطوى شكلُ الحرف هنا كما يُطوى في مولِّد الفهرس، وإلّا صار الحارسُ أعمى.**
//
//   هذه الدالّةُ تُطبّع اللفظَ ثمّ يُبحَث عنه في `builtin-variants.json`.
//   والمولِّدُ يطوي «گ» و«ڭ» إلى «ك»، فالمفتاحُ هناك «كاراج». فلو لم تَطوِ
//   هذه الدالّةُ مثلَه، لبحثت عن «گاراج» فلم تجده — فيَسمح حارسُ التعارض
//   لمفهومٍ جديدٍ بسرقةِ لفظٍ مملوكٍ، بلا اعتراضٍ ولا رسالة. وهو **نفسُ**
//   صنفِ الصمتِ الذي وُجد هذا الحارسُ ليمنعه.
//
//   ويطابق طيَّ المسافات هناك أيضًا: «مول   الحانوت» و«مول الحانوت» لفظٌ واحد.
const normTerm = (x) => String(x || '').toLowerCase().trim()
  .replace(/[\u064B-\u065F]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[\u06AF\u06AD]/g, 'ك').replace(/\u06A4/g, 'ف').replace(/\u067E/g, 'ب')
  .replace(/\s+/g, ' ');

const LANGS = ['ar', 'darija', 'fr', 'en', 'arabizi'];
const arr = (v) => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []);

// المفاهيمُ المدمجة (١٨٣ مفهومًا في src/lib/akg/kb) — يولّدها
// `npm run gen:variants`. بدونها كان الحارسُ أدناه يقارن بـ custom_concepts
// وحدها، فيسمح لمفهومٍ جديدٍ بسرقة «سبّاك» من `plumber` المدمج بلا اعتراض.
let BUILTIN = null;
function builtinVariants() {
  if (BUILTIN) return BUILTIN;
  try { BUILTIN = require('../generated/builtin-variants.json'); }
  catch { BUILTIN = {}; console.warn('[knowledge] ⚠️  لا فهرسَ للمرادفات المدمجة — شغّل `npm run gen:variants`'); }
  return BUILTIN;
}

// حارسُ التعارض — مصدرٌ واحد. كان مكرَّرًا في POST وPUT، وكان يفحص
// custom_concepts فقط. المرادفُ الذي يملكه مفهومان يجعل الفهم عشوائيًّا:
// فهرسُ التنفيذ عالميٌّ عبر اللغات، وأوّلُ إصابةٍ تفوز — فالمفهومُ الثاني
// يصير غيرَ قابلٍ للوصول إليه بتلك الكلمة، بلا أيّ رسالةٍ لأحد.
async function conceptConflicts(c, selfId) {
  const terms = (o) => {
    const out = new Set();
    for (const k of LANGS) for (const w of (o?.[k] || [])) out.add(normTerm(w));
    return out;
  };
  const mine = terms(c.variants);
  for (const v of Object.values(c.concept || {})) if (v) mine.add(normTerm(String(v)));

  const errors = [];
  const bi = builtinVariants();
  for (const w of mine) {
    const ownerId = bi[w];
    if (ownerId && ownerId !== selfId) errors.push(`«${w}» يملكه المفهوم المدمج «${ownerId}» — أضِفه إليه بدل إنشاء مفهومٍ ينازعه`);
  }
  for (const row of await db.listCustomConcepts()) {
    if (row.id === selfId) continue;   // تعديلُ النفس ليس تعارضًا
    const theirs = terms(row.variants);
    for (const v of Object.values(row.concept || {})) if (v) theirs.add(normTerm(String(v)));
    for (const w of mine) if (theirs.has(w)) errors.push(`«${w}» يستعمله المفهوم «${row.id}» (اسمًا أو مرادفًا) — اختر كلمةً أدقّ`);
  }
  return errors;
}

function normalizeConcept(body) {
  const variants = {};
  for (const l of LANGS) { const v = arr(body?.variants?.[l]); if (v.length) variants[l] = v; }
  const pair = (o) => {
    const out = {};
    for (const k of ['offer', 'seek']) { const v = arr(o?.[k]); if (v.length) out[k] = v; }
    return out;
  };
  const links = {};
  for (const k of ['related', 'needs', 'sells', 'near']) { const v = arr(body?.links?.[k]); if (v.length) links[k] = v; }
  const concept = {};
  for (const l of ['ar', 'darija', 'fr', 'en']) { const v = String(body?.concept?.[l] || '').trim(); if (v) concept[l] = v; }
  return {
    id: String(body?.id || '').trim().toLowerCase(),
    category: String(body?.category || '').trim(),
    concept, variants, stance: pair(body?.stance), asks: pair(body?.asks), links,
    services: arr(body?.services), examples: arr(body?.examples),
    status: body?.status === 'published' ? 'published' : 'draft',
  };
}

/**
 * **الوصلة**: ألفاظٌ ⇒ مرادفاتٌ دائمةٌ في مفهومٍ قائمٍ أو جديد.
 *
 *   يُدمَج اتّحادًا لا استبدالًا — فلا يمحو تعلُّمُ اليوم تعلُّمَ أمس.
 *   والمفهومُ قد يكون **مدمجًا** (لا صفَّ له في `custom_concepts`): يُنشأ
 *   صفُّ إثراءٍ بنفس المعرّف، و`concepts.ts` يدمجه فوق المدمج.
 *
 * @returns {Promise<{ok:boolean, errors?:string[], concept?:object}>}
 */
async function learnVariant({ conceptId, terms, lang, reason, byUserId, category }) {
  const id = String(conceptId || '').trim().toLowerCase();
  const learn = arr(terms);
  if (!id || !learn.length) return { ok: false, errors: ['لا مفهومَ ولا لفظ'] };
  const L = LANGS.includes(lang) ? lang : (/[\u0600-\u06FF]/.test(learn[0]) ? 'darija' : 'en');

  const existing = await db.getCustomConcept(id);
  const base = existing || {
    id, category: String(category || '').trim(),
    concept: { ar: id }, variants: {}, stance: {}, asks: {},
    links: {}, services: [], examples: [],
  };
  const merged = { ...(base.variants || {}) };
  merged[L] = Array.from(new Set([...(merged[L] || []), ...learn]));

  const c = normalizeConcept({ ...base, variants: merged, status: 'published' });
  const errors = await conceptConflicts(c, id);
  if (errors.length) return { ok: false, errors };

  const saved = await db.upsertCustomConcept({
    ...c,
    source: base.source || 'learned',
    createdBy: base.created_by || byUserId || null,
    reason: reason || 'learn',
  });
  return { ok: true, concept: saved };
}

module.exports = { LANGS, arr, normTerm, builtinVariants, conceptConflicts, normalizeConcept, learnVariant };
