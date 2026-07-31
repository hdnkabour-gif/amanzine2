'use strict';

// Livo API integration provider
// Documentation: https://rest.livo.ma

/**
 * اختبار اتصال Livo API باستخدام مفتاح API
 * @param {string} apiKey - مفتاح API من لوحة Livo
 * @param {string} baseUrl - نقطة نهاية API (افتراضي https://rest.livo.ma)
 * @returns {Promise<boolean>}
 */
async function testConnection(apiKey, baseUrl = 'https://rest.livo.ma') {
  try {
    const response = await fetch(`${baseUrl}/auth/keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.ok; // 200 يعني صحيح
  } catch (error) {
    console.error('[Livo] Test connection error:', error.message);
    return false;
  }
}

/**
 * إنشاء شحنة في Livo
 * @param {Object} orderData - بيانات الطلب من AMANZINE
 * @param {string} apiKey - مفتاح API
 * @param {string} baseUrl - نقطة نهاية API (افتراضي https://rest.livo.ma)
 * @returns {Promise<{success: boolean, livoOrderId?: string, trackingNumber?: string, error?: string}>}
 */
async function createOrder(orderData, apiKey, baseUrl = 'https://rest.livo.ma') {
  try {
    // تحويل بيانات AMANZINE إلى صيغة Livo المطلوبة
    const payload = {
      recipientName: orderData.customerName || orderData.recipientName || '',
      phone: orderData.phone || '',
      city: orderData.city || '',
      address: orderData.address || '',
      cod: orderData.codAmount || orderData.total || 0,
      notes: orderData.notes || '',
    };

    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Livo] Create order failed:', result);
      return { success: false, error: result.message || 'فشل إنشاء الشحنة في Livo' };
    }

    if (result.success && result.data) {
      return {
        success: true,
        livoOrderId: result.data._id,
        trackingNumber: result.data.tracking_number || result.data._id,
      };
    } else {
      return { success: false, error: result.message || 'استجابة غير متوقعة من Livo' };
    }
  } catch (error) {
    console.error('[Livo] Create order error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * جلب حالة شحنة من Livo
 * @param {string} orderId - معرف الشحنة في Livo (livo_order_id)
 * @param {string} apiKey - مفتاح API
 * @param {string} baseUrl - نقطة نهاية API
 * @returns {Promise<{success: boolean, status?: string, trackingNumber?: string, history?: Array, error?: string}>}
 */
async function getOrderStatus(orderId, apiKey, baseUrl = 'https://rest.livo.ma') {
  try {
    const response = await fetch(`${baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Livo] Get order status failed:', result);
      return { success: false, error: result.message || 'فشل جلب حالة الشحنة' };
    }

    if (result.success && result.data) {
      return {
        success: true,
        status: result.data.status,
        trackingNumber: result.data.tracking_number,
        history: result.data.history || [],
      };
    } else {
      return { success: false, error: result.message || 'استجابة غير متوقعة' };
    }
  } catch (error) {
    console.error('[Livo] Get order status error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * جلب قائمة المدن المدعومة من Livo
 * @param {string} apiKey - مفتاح API
 * @param {string} baseUrl - نقطة نهاية API
 * @returns {Promise<{success: boolean, cities?: Array, error?: string}>}
 */
async function getCities(apiKey, baseUrl = 'https://rest.livo.ma') {
  try {
    const response = await fetch(`${baseUrl}/cities`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    if (response.ok && result.success) {
      return { success: true, cities: result.data || [] };
    }
    return { success: false, error: result.message || 'فشل جلب المدن' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * جلب رسوم التوصيل العامة من Livo
 * @param {string} apiKey - مفتاح API
 * @param {string} baseUrl - نقطة نهاية API
 * @returns {Promise<{success: boolean, fees?: Object, error?: string}>}
 */
async function getFees(apiKey, baseUrl = 'https://rest.livo.ma') {
  try {
    const response = await fetch(`${baseUrl}/fees/public`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    if (response.ok && result.success) {
      return { success: true, fees: result.data || {} };
    }
    return { success: false, error: result.message || 'فشل جلب الرسوم' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  testConnection,
  createOrder,
  getOrderStatus,
  getCities,
  getFees,
};
