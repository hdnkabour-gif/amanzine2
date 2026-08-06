'use strict';

// ============================================================
// تطبيعُ حالة الشحنة — **مكانٌ واحد**.
//
//   لكلّ شركةٍ مفرداتُها: «Livré» و«DELIVERED» و«تم التسليم» و«En cours de
//   livraison». والقاعدةُ عندنا خمسُ حالاتٍ لا غير. والتطبيعُ يمنع تسرُّبَ
//   مفردات الشركات إلى دورة حياة الطلب.
//
//   ── ولماذا ملفٌّ مستقلّ ──
//   كان الجدولُ داخل `routes/webhooks.js` وحدَه. ولمّا صارت المزامنةُ الدوريّةُ
//   تحتاجه نُسخ — ونسختان تنحرفان بصمت: تُضاف «refusé» في إحداهما فتُقرأ
//   الشحنةُ ملغاةً حين يصل الإشعار، وسليمةً حين تُستفتى الشركة. نفسُ الطلب،
//   جوابان، والفرقُ أيُّ مسارٍ سبق.
// ============================================================

/**
 * مفرداتُ الشركات ⇒ حالاتُ AMANZINE. المفاتيحُ **مطبَّعةٌ مسبقًا**:
 * حروفٌ صغيرةٌ بلا مسافاتٍ زائدة (انظر `normalizeDeliveryStatus`).
 */
const STATUS_MAP = {
  // وصل
  delivered: 'delivered', livre: 'delivered', 'livré': 'delivered', completed: 'delivered',
  'تم التسليم': 'delivered', 'وصل': 'delivered',
  // في الطريق
  shipped: 'shipped', in_transit: 'shipped', transit: 'shipped', 'en cours': 'shipped',
  'en cours de livraison': 'shipped', picked_up: 'shipped', pickup: 'shipped',
  'في الطريق': 'shipped', out_for_delivery: 'shipped',
  // جارٍ التحضير
  processing: 'processing', pending: 'processing', created: 'processing',
  confirmed: 'processing', new_parcel: 'processing', 'nouveau': 'processing',
  waiting_pickup: 'processing', in_progress: 'shipped',
  // انتهى بلا تسليم
  cancelled: 'cancelled', canceled: 'cancelled', returned: 'cancelled',
  refused: 'cancelled', 'refusé': 'cancelled', 'annulé': 'cancelled', annule: 'cancelled',
  'ملغي': 'cancelled', 'مرتجع': 'cancelled',
};

/** حالاتٌ لا تتغيّر بعدها — لا تُستفتى الشركةُ عنها ثانيةً. */
const TERMINAL = new Set(['delivered', 'cancelled']);

/**
 * @param {string} raw ما قالته الشركة
 * @returns {string|null} حالةٌ معروفة، أو `null` **عمدًا**: كلمةٌ مجهولةٌ
 *   تُحفَظ نصًّا ولا تُحرِّك دورةَ حياة الطلب بالتخمين. تخمينُ «مُسلَّم» من
 *   كلمةٍ لا نعرفها يُقفل طلبًا لم يصل صاحبَه.
 */
function normalizeDeliveryStatus(raw) {
  const k = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!k) return null;
  return STATUS_MAP[k] || STATUS_MAP[k.replace(/\s+/g, '_')] || null;
}

module.exports = { STATUS_MAP, TERMINAL, normalizeDeliveryStatus };
