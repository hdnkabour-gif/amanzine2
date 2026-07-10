'use strict';
// ============================================================
// /api/knowledge — إدارة طبقة المعرفة (أدمن فقط) — DR-0002
// عرض عمليات البحث بلا نتيجة وربطها بفئة (أول خطوة نحو نموّ القاموس).
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const knowledge = require('../lib/engines/knowledge');
const learning = require('../lib/engines/learning');

// حارس أدمن: دور admin، أو بريد ضمن ADMIN_EMAILS. آمن افتراضيًا (المنع هو الأصل).
function admin(req, res, next) {
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const email = (req.user && req.user.email || '').toLowerCase();
  const ok = req.user && (req.user.role === 'admin' || (email && allow.includes(email)));
  if (!ok) return res.status(403).json({ error: 'Admin only' });
  next();
}

// قائمة عمليات البحث بلا نتيجة (الأكثر تكرارًا أولًا) — مادة مراجعة القاموس.
router.get('/misses', auth, admin, async (req, res) => {
  try {
    const status = String(req.query.status || 'open');
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    res.json({ misses: await knowledge.listMisses({ status, limit }) });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// جودة البحث (نسبة النجاح المجهّلة) — DR-0003 §6.b. مادة لوحة «عقل AMANZINE».
router.get('/quality', auth, admin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    res.json(await knowledge.searchQuality({ days }));
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// عقل AMANZINE (Learning Score + القمع + جودة البحث + أكثر ما لا يُفهَم) — DR-0004، مجهّل.
router.get('/brain', auth, admin, async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 365);
    res.json(await learning.brain({ days }));
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ربط عنقود بحث بفئة (resolve) أو تجاهله (ignore).
router.post('/misses/:id/resolve', auth, admin, async (req, res) => {
  try {
    const { category, status } = req.body || {};
    const st = status === 'ignored' ? 'ignored' : 'resolved';
    if (st === 'resolved' && !category) return res.status(400).json({ error: 'category required' });
    const row = await knowledge.resolveMiss(req.params.id, { category, status: st, adminId: req.user.id });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ miss: row });
  } catch (e) { console.error('[knowledge]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
