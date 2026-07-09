'use strict';
// ============================================================
// /api/insights — لوحات معلومات المنصّة من Analytics Engine
// (يقرأ تدفّق الأحداث، لا SQL). auth محمي.
//   ?scope=platform|search|marketplace|provider
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const analytics = require('../lib/engines/analytics');

router.get('/', auth, (req, res) => {
  try {
    const scope = ['platform', 'search', 'marketplace', 'provider'].includes(req.query.scope) ? req.query.scope : undefined;
    res.json(analytics.snapshot(scope));
  } catch (e) { console.error('[insights]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// لوحة التاجر: مقاييس متجره فقط (businessId = store:<userId>)
router.get('/me', auth, (req, res) => {
  try { res.json(analytics.forBusiness(`store:${req.user.id}`)); }
  catch (e) { console.error('[insights/me]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
