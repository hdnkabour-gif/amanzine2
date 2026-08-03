'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../database');

router.get('/', auth, async (req, res) => {
  try { res.json(await db.getLoyaltyAll(req.user.id)); }
  catch (e) { console.error('[loyalty]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:customerId', auth, async (req, res) => {
  try {
    const loyalty = await db.getLoyalty(req.user.id, req.params.customerId);
    res.json(loyalty || { points: 0, totalEarned: 0, tier: 'silver' });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { customerId, amount } = req.body;
    const pts = parseFloat(amount);
    if (!customerId || !isFinite(pts) || pts <= 0) return res.status(400).json({ error: 'customerId and positive amount required' });
    await db.addLoyaltyPoints(req.user.id, customerId, pts);
    const loyalty = await db.getLoyalty(req.user.id, customerId);
    res.json(loyalty || { points: 0, totalEarned: 0, tier: 'silver' });
  } catch (e) { console.error('[loyalty]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// صرفُ النقاط — كان مفقودًا تمامًا: `redeemLoyaltyPoints` موجودةٌ في طبقة
// القاعدة ولا مسارَ يستدعيها. برنامجُ ولاءٍ تُمنَح فيه النقاطُ ولا تُصرَف
// ليس برنامجَ ولاء.
router.post('/redeem', auth, async (req, res) => {
  try {
    const { customerId, points } = req.body || {};
    const pts = Math.floor(Number(points));
    if (!customerId || !isFinite(pts) || pts <= 0) {
      return res.status(400).json({ error: 'customerId ونقاطٌ موجبةٌ مطلوبان' });
    }
    const r = await db.redeemLoyaltyPoints(req.user.id, customerId, pts);
    if (!r.ok) {
      return res.status(400).json({
        error: r.reason === 'insufficient'
          ? `الرصيدُ ${r.points} نقطة — لا يكفي لصرف ${pts}`
          : 'قيمةٌ غيرُ صالحة',
        points: r.points,
      });
    }
    await db.addLog({
      userId: req.user.id, user: 'المدير',
      action: `صرفُ ${r.redeemed} نقطة ولاء`, details: `الزبون ${customerId}`,
      type: 'settings', severity: 'info',
    });
    res.json({ ok: true, redeemed: r.redeemed, points: r.points });
  } catch (e) { console.error('[loyalty]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
