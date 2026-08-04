'use strict';

// Amana — مصادقة Bearer، إنشاءُ طردٍ عبر /api/v1/parcels.
// مستخرَجٌ من فرعٍ شرطيٍّ كان داخل routes/delivery.js.

const { makeQuote } = require('../contract');

const meta = {
  id: 'amana', name: 'Amana', country: 'MA', currency: 'MAD', version: '1.0',
  match: { hosts: ['amana.ma'] },
  credentials: [
    { key: 'apiKey', label: 'مفتاح API (Bearer)', required: true, secret: true, maps: 'apiKey',
      help: 'حسابك التجاريّ في amana.ma ← الإعدادات ← API' },
    { key: 'apiEndpoint', label: 'نقطة نهاية API', required: false, maps: 'apiEndpoint',
      placeholder: 'https://api.amana.ma' },
  ],
};

const capabilities = {
  cities: 'none', pricing: 'none', tracking: 'none', cod: true, pickup: true,
};

const _base = (cfg) => {
  const raw = cfg?.apiEndpoint || 'https://api.amana.ma';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

async function calculateQuote(order, cfg) {
  // لا مصدرَ ثمنٍ لدى المزوّد ⇒ نُعلن عدمَ الدعم بدل اختلاق رقم.
  // مَن يقرّر عندئذٍ هو محرّكُ التسعير في الخادم (settings.deliveryCosts).
  return makeQuote({ supported: false, reason: 'Amana لا تُقدّم حسابَ ثمنٍ عبر API' });
}

async function createShipment(order, cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/api/v1/parcels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg?.apiKey || ''}` },
      body: JSON.stringify({
        apiKey: cfg?.apiKey || '',
        reference: order.id,
        receiverName: order.customerName || '',
        receiverPhone: order.customerPhone || '',
        receiverAddress: `${order.address || ''}, ${order.city || ''}`,
        description: (order.items || []).map(i => `${i.productName} x${i.quantity}`).join(', '),
        cod: order.total || 0,
        weight: order.weight != null ? order.weight : 0.5,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` };
    const tracking = data.trackingNumber || data.tracking_number || '';
    if (!tracking) return { success: false, error: 'لم تُرجع Amana رقمَ تتبّع' };
    return { success: true, shipmentId: data.id || data.parcelId || tracking, trackingNumber: tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { meta, capabilities, createShipment, calculateQuote };
