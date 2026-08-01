'use strict';

// Webhook عامّ — لشركةٍ بلا API معروف: نُرسل الطلبَ إلى رابطٍ يحدّده التاجر.
// يُختار تلقائيًّا من السجلّ حين لا يطابق api_type أيَّ مزوّدٍ وكان webhookUrl مُهيّأً.

const crypto = require('crypto');
const { makeQuote } = require('../contract');

const meta = {
  id: 'webhook', name: 'Webhook عامّ', country: '*', currency: 'MAD', version: '1.0',
};

const capabilities = {
  cities: 'none', pricing: 'none', tracking: 'none', cod: true, pickup: false,
};

// الرابطُ يأتي من التاجر ⇒ هدفٌ مباشرٌ لـ SSRF نحو شبكة الخادم الداخليّة
// وخدماتِ الميتاداتا السحابيّة. الحظرُ هنا شرطُ أمانٍ لا تحسينًا.
const BLOCKED_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0|metadata\.google)/i;

function _assertSafeUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== 'https:') throw new Error('Blocked: non-HTTPS URL');
  if (BLOCKED_HOST.test(u.hostname)) throw new Error('Blocked: internal address');
  return u;
}

async function calculateQuote() {
  return makeQuote({ supported: false, reason: 'Webhook عامّ لا يُرجع ثمنًا' });
}

async function createShipment(order, cfg) {
  try {
    const u = _assertSafeUrl(cfg?.webhookUrl || '');
    // رقمُ تتبّعٍ داخليّ: الطرفُ المستقبِل لا يلتزم بإرجاع رقمٍ خاصٍّ به.
    const tracking = 'TRK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    const res = await fetch(u.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': cfg?.apiKey || '' },
      body: JSON.stringify({
        event: 'order.created',
        orderId: order.id,
        tracking,
        customer: {
          name: order.customerName, phone: order.customerPhone,
          city: order.city, address: order.address,
        },
        items: order.items,
        total: order.total,
        currency: order.currency || 'MAD',
      }),
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const data = await res.json().catch(() => ({}));
    const remote = data.trackingNumber || data.tracking || '';
    return { success: true, shipmentId: data.id || remote || tracking, trackingNumber: remote || tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { meta, capabilities, createShipment, calculateQuote, _assertSafeUrl };
