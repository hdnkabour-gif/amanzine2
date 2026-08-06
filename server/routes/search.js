'use strict';
// ============================================================
// /api/search — المحرّك الموحّد الوحيد (يلغي Discover كمحرّك مستقل)
//   Discover = Search بدون q · Map = Search بـ view=map · نفس Ranking والفلاتر
// كل الطبقات العليا (Explore / Map / AI) تعتمد على هذا فقط.
// ============================================================
const router = require('express').Router();
const searchEngine = require('../lib/engines/search');
// قارئُ المرشِّحاتِ نُقل إلى `lib/searchFilters` ليقرأه هذا البابُ و«discover»
// معًا — كان هنا وحدَه، والمحادثةُ تدخل من الباب الآخر فتفقد كلَّ مرشِّح.
const { parseFilters } = require('../lib/searchFilters');

// GET /api/search?q=&city=&type=&lat=&lng=&radiusKm=&view=&<filters...>
router.get('/', async (req, res) => {
  const q     = String(req.query.q || '').trim().slice(0, 80) || undefined;
  const city  = String(req.query.city || '').trim() || undefined;
  // مرادفاتُ المفهوم من قاعدة المعرفة، وسّعتها الواجهةُ قبل الإرسال.
  const terms = String(req.query.terms || '').split('|').map(t => t.trim()).filter(Boolean).slice(0, 24);
  const type  = ['store', 'service'].includes(req.query.type) ? req.query.type : undefined;
  const lat   = req.query.lat != null && req.query.lat !== '' ? +req.query.lat : undefined;
  const lng   = req.query.lng != null && req.query.lng !== '' ? +req.query.lng : undefined;
  const radiusKm = req.query.radiusKm ? Math.min(+req.query.radiusKm || 25, 100) : undefined;
  const view  = req.query.view === 'map' ? 'map' : undefined;
  const limit = Math.min(+req.query.limit || 24, 60);
  try {
    const result = await searchEngine.execute({ q, terms, city, type, lat, lng, radiusKm, view, limit, filters: parseFilters(req.query) });
    // Activity: كل بحث حدث خاص يغذّي Search Analytics (كلمات، بلا نتائج، CTR)
    try {
      require('../lib/engines/activity').emit({ type: 'search.executed', category: 'search', visibility: 'private', city: city || null,
        payload: { q: q || '', resultCount: (result.businesses?.length || 0) + (result.products?.length || 0) } });
    } catch {}
    res.json(result);
  } catch (e) { console.error('[search]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
