'use strict';
// ============================================================
// /api/payment — طرق الدفع + الأداءات (Payment Engine)
//   GET  /            → أداءاتُ التاجر (auth) — **القراءةُ التي لم تكن**
//   GET  /methods     → الطرق المتاحة وحالتُها الثلاثيّة
//   POST /charge      → بدء عملية دفع (auth)
//   POST /:id/confirm → تأكيدُ وصول المبلغ (auth — للتاجر: COD/تحويل)
//
//   ── ما كان مقطوعًا ──
//   كلُّ هذا المسار كان **بلا مُنادٍ واحدٍ في الواجهة**: تُنشَأ الدفعاتُ ولا
//   تُقرَأ، وتُعلن `MAKE_PAYMENT` و`VIEW_PAYMENTS` صفحةَ المحفظة، وصفحةُ
//   المحفظة لا تعرف أنّ هذا المسارَ موجود. والفهرسُ `idx_payments_user`
//   مبنيٌّ لاستعلامٍ لم يُكتب — أوضحُ دليلٍ على نيّةٍ لم تكتمل.
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { db } = require('../database');
const payment = require('../lib/engines/payment');

// أداءاتُ هذا التاجر وحدَه. لا مُعامِلَ `userId` من العميل: الهويّةُ من
// الرمز لا من الجسم — وإلّا صارت القراءةُ بابًا إلى سجلّ غيره.
router.get('/', auth, async (req, res) => {
  try {
    res.json(await db.listPayments(req.user.id, req.query.limit));
  } catch (e) { console.error('[payment]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/methods', (req, res) => res.json({ methods: payment.methods() }));

router.post('/charge', auth, async (req, res) => {
  const { provider, amount, currency, orderId } = req.body || {};
  try {
    const r = await payment.charge({ provider, userId: req.user.id, amount: +amount, currency, orderId });
    const code = r.status === 'failed' ? 400 : r.status === 'unavailable' ? 503 : 200;
    res.status(code).json(r);
  } catch (e) { console.error('[payment]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ── التأكيدُ يُقيَّد بمالكه ───────────────────────────────────
//
//   كان يأخذ أيَّ `:id` ويكتب عليه: `updatePaymentStatus` لا تعرف صاحبَ
//   الدفعة. فأيُّ تاجرٍ مصادَقٍ يستطيع أن يُعلن دفعةَ تاجرٍ آخرَ «مُستردّة»
//   أو «مدفوعة». والمسارُ كان بلا بابٍ في الواجهة فبقيت الثغرةُ نائمة —
//   وفتحُ البابِ اليومَ يوقظها إن لم تُغلَق الآن.
router.post('/:id/confirm', auth, async (req, res) => {
  const status = ['paid', 'failed', 'refunded'].includes(req.body?.status) ? req.body.status : 'paid';
  try {
    const p = await db.getPayment(req.params.id);
    if (!p || p.userId !== req.user.id) return res.status(404).json({ error: 'Payment not found' });
    res.json(await payment.confirm(p.id, status));
  } catch (e) { console.error('[payment]', e.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
