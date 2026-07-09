'use strict';
// ============================================================
// Ranking Engine — ترتيب موزون (لا نصّي)
// score = Σ (وزن × إشارة مُطبّعة 0..1). كل الإشارات تُطبّع قبل الجمع.
// الأوزان قابلة للضبط ويمكن تمريرها لكل استعلام (مثلاً رفع المسافة قرب المستخدم).
// ============================================================
const DEFAULT_WEIGHTS = {
  distance:     0.30,
  rating:       0.20,
  verified:     0.15,
  availability: 0.10,
  openNow:      0.10, // الحالة الحيّة: المفتوح الآن يتقدّم
  popularity:   0.05,
  relevance:    0.10,
};

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// إشارات مُطبّعة من كائن Business
function signals(b, ctx) {
  const maxDist = ctx.maxDistanceKm || 25;
  return {
    // كلّما قلّت المسافة زاد النقاط؛ غياب الموقع = محايد 0.5
    distance:     b.distanceKm != null ? clamp01(1 - b.distanceKm / maxDist) : 0.5,
    rating:       clamp01((+b.rating?.avg || 0) / 5),
    verified:     b.verified ? 1 : 0,
    // التوفّر: قابلية الحجز/المواعيد إشارة أولية (تُدقَّق لاحقاً بجدول التوفّر الفعلي)
    availability: (b.capabilities && (b.capabilities.booking || b.capabilities.appointments)) ? 1 : 0.5,
    // الحالة الحيّة: مفتوح=1 · غير معروف=0.5 (لا نعاقب) · مغلق=0.15
    openNow:      b.status ? (b.status.code === 'open' ? 1 : (['busy', 'quick', 'delivery', 'appointment'].includes(b.status.code) ? 0.6 : 0.15)) : 0.5,
    popularity:   clamp01((+b.rating?.count || 0) / 50),
    relevance:    b.__relevance != null ? clamp01(b.__relevance) : 0.5,
  };
}

function scoreOne(b, ctx = {}, weights = DEFAULT_WEIGHTS) {
  const s = signals(b, ctx);
  let total = 0;
  for (const k of Object.keys(weights)) total += (weights[k] || 0) * (s[k] != null ? s[k] : 0);
  return { score: +total.toFixed(4), signals: s };
}

// تُعيد نسخة مرتّبة تنازلياً مع _score و _signals لكل نتيجة
function rank(list, ctx = {}, weights = DEFAULT_WEIGHTS) {
  return list
    .map(b => { const { score, signals } = scoreOne(b, ctx, weights); return { ...b, _score: score, _signals: signals }; })
    .sort((a, b) => b._score - a._score);
}

module.exports = { rank, scoreOne, DEFAULT_WEIGHTS };
