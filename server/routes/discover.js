'use strict';
// ============================================================
// /api/discover — alias رجعي فقط. لم يعد محرّكاً مستقلاً:
// يفوّض إلى Search Engine الموحّد ثم يعيد تجميع النتائج بالشكل القديم
// الذي تتوقّعه واجهة DiscoverSections الحالية. الواجهة الجديدة تستعمل /api/search.
// (لا منطق بحث/SQL مكرّر هنا — مصدر واحد: lib/engines/search.js)
// ============================================================
const router = require('express').Router();
const searchEngine = require('../lib/engines/search');
const { parseFilters } = require('../lib/searchFilters');

router.get('/', async (req, res) => {
  const city = String(req.query.city || '').trim() || undefined;
  const q    = String(req.query.q || '').trim().slice(0, 80) || undefined;
  // المرادفاتُ التي وسّعتها الواجهةُ من قاعدة المعرفة — مفصولةٌ بـ«|».
  const terms = String(req.query.terms || '').split('|')
    .map(t => t.trim()).filter(Boolean).slice(0, 24);
  const limit = Math.min(+req.query.limit || 24, 60);
  // **المرشِّحاتُ تمرّ من هنا أيضًا.** هذا هو البابُ الذي تسلكه المحادثة
  // (`DiscoverSections`)، وكان يُسقط `category` التي ترسلها الواجهةُ منذ
  // كُتبت، ويُسقط معها سقفَ الثمن. فمن قال «بأقلّ من ٢٠٠ درهم» كان يُعرَض
  // عليه ما ثمنُه ألفان — ولا يعرف لماذا.
  const filters = parseFilters(req.query);
  try {
    const { businesses, products } = await searchEngine.execute({ city, q, terms, limit, filters });
    // إعادة تجميع النموذج الموحّد إلى المفاتيح القديمة (providers/stores/listings)
    res.json({
      city: city || null, q: q || null,
      products,
      providers: businesses.filter(b => b.source === 'provider'),
      stores:    businesses.filter(b => b.source === 'store'),
      listings:  businesses.filter(b => b.source === 'listing'),
    });
  } catch (e) { console.error('[discover]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
