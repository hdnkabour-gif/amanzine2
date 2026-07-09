'use strict';
// ============================================================
// /api/ai/ask — بحث بالذكاء (لغة طبيعية → نيّة → Search Engine)
// عام، محدود المعدّل (تحت /api/ai/ في index.js). لا يكشف إلا نتائج عامة.
// ============================================================
const router = require('express').Router();
const ai = require('../lib/engines/ai');

router.post('/ask', async (req, res) => {
  const q = String(req.body?.q || '').trim().slice(0, 200);
  const lat = req.body?.lat != null ? +req.body.lat : undefined;
  const lng = req.body?.lng != null ? +req.body.lng : undefined;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await ai.ask({ q, lat, lng }));
  } catch (e) { console.error('[ai/ask]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
