'use strict';

// ============================================================
// محرّكُ المدن — طبقةُ الترجمة بين مدينةِ AMANZINE ومُعرِّفِ كلّ شركة.
//
//   التاجرُ يرى «الدار البيضاء» دائمًا. وكلُّ شركةٍ تستقبل مُعرِّفَها هي:
//
//       الدار البيضاء ──┬── Livo   → 18
//                       ├── Amana  → CASA001
//                       └── Jibli  → 98765
//
//   بلا هذه الطبقة يكون اسمُ المدينة نصًّا حرًّا يُرسَل كما هو، فترفضه الشركةُ
//   أو تُسلّم إلى مدينةٍ أخرى. ومعها يصير تبديلُ الشركة بلا أثرٍ على ما يراه
//   التاجر — وهو الغرضُ كلُّه.
//
//   المعجمُ مُولَّدٌ من قاعدة المعرفة (scripts/emit-cities.mjs)، لا مكتوبٌ هنا:
//   قائمةٌ ثانيةٌ في الخادم تعني مصدرَ حقيقةٍ يتباعد.
// ============================================================

let CITIES = [];
try {
  CITIES = require('../generated/cities.json');
} catch {
  console.warn('[cityEngine] معجم المدن غير مُولَّد — شغّل: npm run gen:cities');
}

/** تطبيعٌ عربيّ: تشكيل، همزات، تاء مربوطة، ألف مقصورة، مسافات. */
function normAr(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^؀-ۿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تطبيعٌ لاتينيّ: لهجات، فواصل، مسافات. */
function normLat(s) {
  return String(s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const _index = new Map();   // مصطلحٌ مُطبَّع → مدينة
for (const c of CITIES) {
  for (const term of [c.name, ...(c.aliases || [])]) {
    const ar = normAr(term);
    if (ar.length >= 3) _index.set(ar, c);
    const lat = normLat(term);
    if (lat.length >= 3) _index.set(lat, c);
  }
}

/**
 * يُحوِّل نصًّا حرًّا إلى مدينةٍ معياريّة.
 * @param {string} text  «casa» · «الدار البيضاء» · «CASABLANCA»
 * @returns {{id:string,name:string}|null}
 */
function resolve(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;

  const ar = normAr(raw), lat = normLat(raw);
  // مطابقةٌ تامّةٌ أوّلًا — أدقُّ من الاحتواء وتمنع «سلا» من التقاط «سلاوي».
  const exact = _index.get(ar) || _index.get(lat);
  if (exact) return { id: exact.id, name: exact.name, region: exact.region || '' };

  // ثمّ احتواءٌ بأطول مصطلحٍ مطابق، كي لا تسبق «فاس» إلى «فاس الجديد».
  let best = null, bestLen = 0;
  for (const [term, c] of _index) {
    if (term.length <= bestLen) continue;
    const hay = /[؀-ۿ]/.test(term) ? ar : lat;
    if (hay && hay.includes(term)) { best = c; bestLen = term.length; }
  }
  return best ? { id: best.id, name: best.name, region: best.region || '' } : null;
}

/** كلُّ المدن المعياريّة. */
function all() {
  return CITIES.map(c => ({ id: c.id, name: c.name, region: c.region || '' }));
}

/** مدينةٌ بمُعرِّفها. */
function byId(id) {
  const c = CITIES.find(x => x.id === id);
  return c ? { id: c.id, name: c.name, region: c.region || '' } : null;
}

/**
 * يُطابق قائمةَ مدنِ شركةٍ بالمدن المعياريّة.
 * يُعيد المُطابَقَ والمجهولَ معًا — المجهولُ مُعلَنٌ لا مُبتلَع، فالتاجرُ
 * يحتاج أن يعرف أنّ مدينةً لدى الشركة لم تُفهَم بدل أن تختفي بصمت.
 * @param {Array<{id:string,name:string}>} providerCities
 */
function matchAll(providerCities) {
  const matched = [], unmatched = [];
  for (const pc of providerCities || []) {
    const hit = resolve(pc.name);
    if (hit) matched.push({ cityId: hit.id, cityName: hit.name, externalId: String(pc.id), externalName: pc.name });
    else unmatched.push({ externalId: String(pc.id), externalName: pc.name });
  }
  return { matched, unmatched };
}

module.exports = { resolve, all, byId, matchAll, normAr, normLat, size: CITIES.length };
