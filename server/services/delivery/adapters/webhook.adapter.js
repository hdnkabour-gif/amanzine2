'use strict';

// وسيلةُ اتصال (Adapter) لا شركة: تُرسل الطلبَ إلى رابطٍ يحدّده التاجر.
//
//   الفرقُ جوهريّ. «Webhook» ليس اسمَ شركةِ توصيل، بل طريقةَ وصولٍ إليها؛
//   وحين كان مُسجَّلًا كمزوّدٍ كان تاجرٌ يربط «Chronodiali» عبر رابطٍ فيرى في
//   سجلّاته «شحنة لدى Webhook عامّ» بدل اسم شركته. والشركةُ الواحدة قد تُتاح
//   عبر أكثر من وسيلة (REST اليوم، Webhook غدًا) — وهذا مستحيلٌ إن كانت
//   الوسيلةُ نفسُها هي الهُويّة.
//
//   الوسيلةُ تُستعمل حين لا يوجد مزوّدٌ للشركة، ويُحفَظ اسمُ الشركة كما أدخله
//   التاجر.

const { makeQuote } = require('../contract');

const meta = {
  id: 'webhook', name: 'رابط مباشر (Webhook)', kind: 'adapter', version: '1.0',
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
    // Sending a webhook is not proof that a shipping company created a parcel.
    // Use the stable AMANZINE order ID for correlation; NEVER fabricate a
    // tracking number and report it as an external carrier reference.
    const res = await fetch(u.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': cfg?.apiKey || '',
        'X-Idempotency-Key': String(order.id),
      },
      body: JSON.stringify({
        event: 'order.created',
        orderId: order.id,
        clientReference: String(order.id),
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

    const payload = await res.json().catch(() => ({}));
    const data = payload && typeof payload.data === 'object' && payload.data ? payload.data : payload;
    // Generic HTTP 200/202 can mean "queued" or "received" only. A carrier
    // shipment must be identified by the remote system, not our order ID.
    const remote = String(data?.trackingNumber || data?.tracking_number || data?.tracking || '').trim();
    const remoteId = String(data?.shipmentId || data?.shipment_id || '').trim();
    if (!remote && !remoteId) return {
      success: false,
      acceptedUnconfirmed: true,
      error: 'Webhook استجاب لكن لم يُرجع رقم شحنة من الشركة — راجع لوحة الشركة أولاً ولا تعاود الإرسال قبل التأكد',
    };
    return { success: true, shipmentId: remoteId || remote, trackingNumber: remote || remoteId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { meta, capabilities, createShipment, calculateQuote, _assertSafeUrl };
