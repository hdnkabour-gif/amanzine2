'use strict';
// ============================================================
// قراءةُ المرشِّحات من سلسلة الاستعلام — **بابٌ واحدٌ لكلّ الأبواب**.
//
//   ── ما كشفه القياس ──
//   كانت `parseFilters` تسكن داخل `routes/search.js` وحدَه. و`/api/discover`
//   — وهو **الطريقُ الذي تسلكه المحادثة** — يقرأ `city` و`q` و`terms` ثمّ
//   يُسقط كلَّ ما عداه بصمت. والواجهةُ (`toSearchParams`) كانت ترسل
//   `category` منذ كُتبت: تُرسَل، وتصل، وتُرمى. لا خطأً يظهر، ولا نتيجةً
//   تتحسّن — بابٌ يُغلَق على من طرقه.
//
//   ── والصفرُ ليس «بلا حدّ» ──
//   كان: `f.priceMax = +qs.priceMax || 0`. فأيُّ قيمةٍ لا تُقرأ رقمًا تصير
//   **سقفًا بصفر**، ويُصفّى بها كلُّ شيء: نتيجةٌ فارغةٌ بلا سبب. المرشِّحُ
//   الفاسدُ يجب أن يُهمَل لا أن يُطبَّق — والمرشِّحُ الذي يبتلع النتائج
//   صامتًا أسوأُ من غيابه.
// ============================================================

/** رقمٌ موجبٌ معقول، أو `undefined`. لا صفرَ من نصٍّ فاسد. */
function money(v) {
  if (v == null || v === '') return undefined;
  const n = Number(String(v).replace(/[\s,]/g, ''));
  return Number.isFinite(n) && n > 0 && n <= 100000000 ? n : undefined;
}

const on = (v) => v === true || v === 'true' || v === '1';

/** يقرأ المرشِّحاتِ المعروفةَ فقط — ما لا يُعرَف لا يُمرَّر. */
function parseFilters(qs = {}) {
  const f = {};
  if (qs.category) f.category = String(qs.category).slice(0, 60);
  if (on(qs.verified)) f.verified = true;
  if (qs.ratingMin != null && qs.ratingMin !== '') f.ratingMin = Math.max(0, Math.min(5, +qs.ratingMin || 0));
  if (on(qs.delivery)) f.delivery = true;
  if (on(qs.booking)) f.booking = true;
  if (on(qs.offers)) f.offers = true;
  if (on(qs.openNow)) f.openNow = true;
  if (on(qs.availableToday)) f.availableToday = true;
  const min = money(qs.priceMin), max = money(qs.priceMax);
  if (min != null) f.priceMin = min;
  if (max != null) f.priceMax = max;
  return f;
}

module.exports = { parseFilters, money };
