'use strict';
// ============================================================
// /api/payment — طرق الدفع + بدء الدفع (Payment Engine)
//   GET  /methods        → الطرق المتاحة (حسب اعتمادات env)
//   POST /charge         → بدء عملية دفع (auth)
//   POST /:id/confirm    → تأكيد (auth — للتاجر: COD/تحويل)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const payment = require('../lib/engines/payment');

router.get('/methods', (req, res) => res.json({ methods: payment.methods() }));

router.post('/charge', auth, async (req, res) => {
  const { provider, amount, currency, orderId } = req.body || {};
  try {
    const r = await payment.charge({ provider, userId: req.user.id, amount: +amount, currency, orderId });
    const code = r.status === 'failed' ? 400 : r.status === 'unavailable' ? 503 : 200;
    res.status(code).json(r);
  } catch (e) { console.error('[payment]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/confirm', auth, async (req, res) => {
  const status = ['paid', 'failed', 'refunded'].includes(req.body?.status) ? req.body.status : 'paid';
  try { res.json(await payment.confirm(req.params.id, status)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
