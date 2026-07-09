'use strict';
// ============================================================
// /api/search — المحرّك الموحّد الوحيد (يلغي Discover كمحرّك مستقل)
//   Discover = Search بدون q · Map = Search بـ view=map · نفس Ranking والفلاتر
// كل الطبقات العليا (Explore / Map / AI) تعتمد على هذا فقط.
// ============================================================
const router = require('express').Router();
const searchEngine = require('../lib/engines/search');

function parseFilters(qs) {
  const f = {};
  if (qs.category) f.category = String(qs.category).slice(0, 60);
  if (qs.verified === 'true' || qs.verified === '1') f.verified = true;
  if (qs.ratingMin != null && qs.ratingMin !== '') f.ratingMin = Math.max(0, Math.min(5, +qs.ratingMin || 0));
  if (qs.delivery === 'true' || qs.delivery === '1') f.delivery = true;
  if (qs.booking === 'true' || qs.booking === '1') f.booking = true;
  if (qs.offers === 'true' || qs.offers === '1') f.offers = true;
  if (qs.openNow === 'true' || qs.openNow === '1') f.openNow = true;
  if (qs.availableToday === 'true' || qs.availableToday === '1') f.availableToday = true;
  if (qs.priceMin != null && qs.priceMin !== '') f.priceMin = +qs.priceMin || 0;
  if (qs.priceMax != null && qs.priceMax !== '') f.priceMax = +qs.priceMax || 0;
  return f;
}

// GET /api/search?q=&city=&type=&lat=&lng=&radiusKm=&view=&<filters...>
router.get('/', async (req, res) => {
  const q     = String(req.query.q || '').trim().slice(0, 80) || undefined;
  const city  = String(req.query.city || '').trim() || undefined;
  const type  = ['store', 'service'].includes(req.query.type) ? req.query.type : undefined;
  const lat   = req.query.lat != null && req.query.lat !== '' ? +req.query.lat : undefined;
  const lng   = req.query.lng != null && req.query.lng !== '' ? +req.query.lng : undefined;
  const radiusKm = req.query.radiusKm ? Math.min(+req.query.radiusKm || 25, 100) : undefined;
  const view  = req.query.view === 'map' ? 'map' : undefined;
  const limit = Math.min(+req.query.limit || 24, 60);
  try {
    const result = await searchEngine.execute({ q, city, type, lat, lng, radiusKm, view, limit, filters: parseFilters(req.query) });
    // Activity: كل بحث حدث خاص يغذّي Search Analytics (كلمات، بلا نتائج، CTR)
    try {
      require('../lib/engines/activity').emit({ type: 'search.executed', category: 'search', visibility: 'private', city: city || null,
        payload: { q: q || '', resultCount: (result.businesses?.length || 0) + (result.products?.length || 0) } });
    } catch {}
    res.json(result);
  } catch (e) { console.error('[search]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
