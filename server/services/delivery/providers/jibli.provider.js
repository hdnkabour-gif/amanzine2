'use strict';

// Jibli — مصادقة X-API-Key، إنشاءُ طلبٍ عبر /v1/orders/create.
// مستخرَجٌ من فرعٍ شرطيٍّ كان داخل routes/delivery.js.

const { makeQuote } = require('../contract');

const meta = {
  id: 'jibli', name: 'Jibli', country: 'MA', currency: 'MAD', version: '1.0',
  match: { hosts: ['jibli.ma'] },
};

const capabilities = {
  cities: 'none', pricing: 'none', tracking: 'none', cod: true, pickup: true,
};

const _base = (cfg) => {
  const raw = cfg?.apiEndpoint || 'https://api.jibli.ma';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

async function calculateQuote(order, cfg) {
  return makeQuote({ supported: false, reason: 'Jibli لا تُقدّم حسابَ ثمنٍ عبر API' });
}

async function createShipment(order, cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/v1/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': cfg?.apiKey || '' },
      body: JSON.stringify({
        token: cfg?.apiKey || '',
        order_ref: order.id,
        customer_name: order.customerName || '',
        customer_phone: order.customerPhone || '',
        city: order.city || '',
        address: order.address || '',
        price: order.total || 0,
        // اسمُ الحقل يخصّ Jibli وحدها ولا يتسرّب خارج هذا الملفّ.
        products: (order.items || []).map(i => ({ name: i.productName, qty: i.quantity })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data.message || `HTTP ${res.status}` };
    const tracking = data.tracking || data.code || '';
    if (!tracking) return { success: false, error: 'لم تُرجع Jibli رقمَ تتبّع' };
    return { success: true, shipmentId: data.id || tracking, trackingNumber: tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { meta, capabilities, createShipment, calculateQuote };
