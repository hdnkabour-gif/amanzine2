'use strict';
// ============================================================
// /api/track — استقبال أحداث المشاهدة/النقر من الواجهة (عام، محدود المعدّل)
// يترجمها إلى Activity events → يلتقطها Analytics/Recommendation عبر الـBus.
//   POST { kind:'business'|'product'|'service', action:'viewed'|'clicked',
//          businessId, name?, productId?, source? }
// أحداث خاصة (visibility:private) فلا تظهر في الـFeed العام.
// ============================================================
const router = require('express').Router();
const activity = require('../lib/engines/activity');

// 'need' = تجربة نيّة من «شنو محتاج اليوم؟» (توحيد عقل الواجهة مع الخادم):
//   { kind:'need', action:'resolved'|'satisfied'|'unsatisfied', name:<العبارة>, source:<النيّة>, city }
// 'clarify' = سؤالُ استيضاحٍ (HU-2): `name` هويّةُ السؤال (وهويّةُ الجواب بعد
//   نقطتين)، و`source` مقدارُ تغيّر الثقة بالمئة. الهويّاتُ لا النصوص — كي
//   يبقى القياسُ صالحًا حين تتبدّل الصياغةُ أو اللغة.
const KINDS = ['business', 'product', 'service', 'need', 'clarify'];
const ACTIONS = ['viewed', 'clicked', 'contact', 'searched', 'resolved', 'satisfied', 'unsatisfied', 'asked', 'answered'];

router.post('/', (req, res) => {
  const { kind, action, businessId, name, productId, serviceId, source, city } = req.body || {};
  if (!KINDS.includes(kind) || !ACTIONS.includes(action)) return res.status(400).json({ error: 'bad event' });
  try {
    activity.emit({
      businessId: businessId ? String(businessId).slice(0, 80) : null,
      actor: 'visitor',
      type: `${kind}.${action}`,
      category: kind,
      visibility: 'private',
      city: city ? String(city).slice(0, 40) : null,
      payload: {
        name: name ? String(name).slice(0, 120) : undefined,
        productId: productId ? String(productId).slice(0, 80) : undefined,
        serviceId: serviceId ? String(serviceId).slice(0, 80) : undefined,
        source: source ? String(source).slice(0, 40) : undefined,
      },
    });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
