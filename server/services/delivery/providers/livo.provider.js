'use strict';

// Livo — https://rest.livo.ma
// مصادقة: Bearer API key. لا endpoint لحساب الثمن ⇒ التسعير بقواعدَ محلّيّة.

const { makeQuote } = require('../contract');

const meta = {
  id: 'livo', name: 'Livo', country: 'MA', currency: 'MAD', version: '1.0',
};

const capabilities = {
  cities: 'api', pricing: 'rules', tracking: 'api', cod: true, pickup: true,
};

const _base = (cfg) => cfg?.apiEndpoint || 'https://rest.livo.ma';
const _headers = (cfg) => ({
  'Authorization': `Bearer ${cfg?.apiKey || ''}`,
  'Content-Type': 'application/json',
});

/**
 * ثمنُ Livo حسب المدينة (كازا 20، خارجها 35 — كما أكّده التاجر).
 * قاعدةٌ محلّيّةٌ لأنّ Livo لا تُقدّم حسابَ ثمنٍ عبر API؛ ولا يعرفها أحدٌ
 * خارج هذا الملفّ — بقيّةُ النظام ترى `DeliveryQuote` فقط.
 */
function _cityFee(city) {
  const c = String(city || '').trim().toLowerCase();
  return /casa|الدار البيضاء|دار البيضاء/.test(c) ? 20 : 35;
}

async function calculateQuote(order, cfg) {
  return makeQuote({
    deliveryFee: order?.cost != null ? +order.cost : _cityFee(order?.city),
    currency: meta.currency,
    estimatedDays: 2,
    supported: true,
  });
}

async function createShipment(order, cfg) {
  try {
    const quote = await calculateQuote(order, cfg);
    const payload = {
      recipientName: order.customerName || order.recipientName || '',
      phone:   order.phone || order.customerPhone || '',
      city:    order.city || '',
      address: order.address || '',
      cod:     order.codAmount != null ? order.codAmount : (order.total || 0),
      // الحقلُ الذي كانت Livo ترفض الطلبَ بدونه: "cost" is required
      cost:    quote.deliveryFee,
      notes:   order.notes || '',
    };

    const res = await fetch(`${_base(cfg)}/orders`, {
      method: 'POST', headers: _headers(cfg), body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) return { success: false, error: result.message || `HTTP ${res.status}` };
    if (result.success && result.data) {
      return {
        success: true,
        shipmentId: result.data._id,
        trackingNumber: result.data.tracking_number || result.data._id,
      };
    }
    return { success: false, error: result.message || 'استجابةٌ غيرُ متوقّعة من Livo' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function trackShipment(shipmentId, cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/orders/${shipmentId}`, { method: 'GET', headers: _headers(cfg) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: result.message || `HTTP ${res.status}` };
    if (result.success && result.data) {
      return {
        success: true,
        status: result.data.status,
        trackingNumber: result.data.tracking_number,
        history: result.data.history || [],
      };
    }
    return { success: false, error: result.message || 'استجابةٌ غيرُ متوقّعة' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getCities(cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/cities`, { method: 'GET', headers: _headers(cfg) });
    const result = await res.json().catch(() => ({}));
    if (res.ok && result.success) {
      // التطبيعُ إلى {id,name} يحدث هنا — الواجهةُ لا ترى شكلَ Livo الخام.
      const cities = (result.data || []).map(c => ({
        id: String(c._id || c.id || c.code || ''),
        name: String(c.name || c.label || c.city || ''),
      })).filter(c => c.id && c.name);
      return { success: true, cities };
    }
    return { success: false, error: result.message || 'فشل جلب المدن' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testConnection(cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/auth/keys`, { method: 'GET', headers: _headers(cfg) });
    return res.ok;
  } catch { return false; }
}

module.exports = {
  meta, capabilities,
  createShipment, trackShipment, getCities, calculateQuote, testConnection,
};
