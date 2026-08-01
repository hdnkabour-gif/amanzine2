'use strict';

// ============================================================
// ثمنُ التوصيل — مرجعٌ واحدٌ على الخادم.
//   كان الثمن يأتي من المتصفّح (`deliveryCost` في جسم الطلب) فيستطيع الزبون
//   أن يقرّر بنفسه أنّ التوصيل مجّانيّ. الخادمُ وحده يقرّر الآن، تمامًا كما
//   يُعيد حسابَ أثمانِ المنتجات من قاعدة البيانات ولا يثق بما أرسله العميل.
//
//   الدلالةُ مطابقةٌ لِما تعرضه الواجهة (`getDeliveryCost` في Storefront.tsx):
//   مطابقةٌ جزئيّةٌ بين اسم المدينة ومفاتيح الجدول، ثمّ `default`.
// ============================================================

const { defaultSettings } = require('../defaults');

const FALLBACK_FEE = 40;

const _norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

/**
 * يحسب ثمن التوصيل لمدينةٍ ما اعتمادًا على جدول أثمان التاجر.
 * @param {string} city               اسم المدينة كما أدخله الزبون
 * @param {Record<string,number>} [costs]  `settings.deliveryCosts` الخاصّ بالتاجر
 * @returns {number} ثمنٌ موجبٌ بالدرهم
 */
function resolveDeliveryFee(city, costs) {
  const table = { ...(defaultSettings.deliveryCosts || {}), ...(costs || {}) };
  const fallback = +table.default > 0 ? +table.default : FALLBACK_FEE;

  // مدينةٌ فارغة ⇒ الافتراضيّ. (بدون هذا الحارس تُطابِق `k.includes('')` أوّلَ
  // مفتاحٍ في الجدول فيُحتسب ثمنُ مدينةٍ عشوائيّة.)
  const target = _norm(city);
  if (!target) return fallback;

  for (const [k, v] of Object.entries(table)) {
    if (k === 'default') continue;
    const key = _norm(k);
    if (!key) continue;
    if (target.includes(key) || key.includes(target)) return Math.max(0, +v || 0);
  }
  return fallback;
}

module.exports = { resolveDeliveryFee, FALLBACK_FEE };
