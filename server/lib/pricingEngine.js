'use strict';

// ============================================================
// محرّكُ التسعير — «الثمنُ دالّةٌ لا رقم».
//
//   ثمنُ التوصيل ليس رقمًا واحدًا: يختلف بالمدينة والجهة والوزن وقيمة الطلب،
//   وقد يسقط إلى صفرٍ فوق عتبة. جدولُ مدينة⇄ثمنٍ ثابتٌ لا يعبّر عن ذلك، وكلُّ
//   حالةٍ جديدةٍ كانت تُضاف كشرطٍ في الكود.
//
//   القواعدُ بياناتٌ لا كود: التاجرُ يكتبها من لوحته، والمحرّكُ ينفّذها بترتيب
//   الأولويّة. أوّلُ قاعدةٍ مطابقةٍ تحسم، وتُذكر في `breakdown` — فالتاجرُ الذي
//   يسأل «لماذا 35 وليس 20؟» يجد الجواب بدل أن يخمّن.
//
//   دالّةٌ خالصة: لا قاعدةَ بيانات ولا شبكة ⇒ قابلةٌ للاختبار كما هي.
// ============================================================

const { makeQuote } = require('../services/delivery/contract');

/** أنواعُ القواعد المفهومة. غيرُها يُتجاهَل بدل أن يُسقط الحساب. */
const RULE_TYPES = ['city', 'region', 'weight', 'order_value', 'flat'];

const _num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/**
 * هل تنطبق القاعدةُ على هذا السياق؟
 * كلُّ حقلٍ فارغٍ في القاعدة = «لا يهمّني»، فقاعدةُ flat بلا قيودٍ تنطبق دائمًا.
 */
function _matches(rule, ctx) {
  if (rule.enabled === false) return false;
  if (!RULE_TYPES.includes(rule.ruleType)) return false;

  if (rule.cityId && rule.cityId !== ctx.cityId) return false;
  if (rule.region && rule.region !== ctx.region) return false;

  const wMin = _num(rule.weightMin), wMax = _num(rule.weightMax);
  if (wMin !== null || wMax !== null) {
    const w = Number(ctx.weight || 0);
    if (wMin !== null && w < wMin) return false;
    // الحدُّ الأعلى حصريّ: 0–1 ثمّ 1–5 لا تتداخلان عند 1 بالضبط.
    if (wMax !== null && w >= wMax) return false;
  }

  const oMin = _num(rule.orderMin), oMax = _num(rule.orderMax);
  if (oMin !== null || oMax !== null) {
    const t = Number(ctx.orderTotal || 0);
    if (oMin !== null && t < oMin) return false;
    if (oMax !== null && t > oMax) return false;
  }
  return true;
}

/**
 * يحسب عرضَ سعرٍ من قواعدَ مرتّبة.
 *
 * @param {Object} ctx        { cityId, cityName, region, weight, orderTotal, codAmount }
 * @param {Array}  rules      قواعدُ التاجر
 * @param {Object} [opts]     { fallbackFee, currency, codFeeRate }
 * @returns {import('../services/delivery/contract').DeliveryQuote & {breakdown: Array}}
 */
function evaluate(ctx = {}, rules = [], opts = {}) {
  const currency = opts.currency || 'MAD';
  const breakdown = [];

  // الأعلى أولويّةً أوّلًا؛ وعند التساوي الأضيقُ نطاقًا (قاعدةُ مدينةٍ تسبق
  // قاعدةً عامّة) كي لا يعتمد الناتجُ على ترتيب الإدخال.
  const specificity = (r) => (r.cityId ? 4 : 0) + (r.region ? 3 : 0)
    + (r.weightMin != null || r.weightMax != null ? 2 : 0)
    + (r.orderMin != null || r.orderMax != null ? 1 : 0);

  const applicable = (rules || [])
    .filter(r => _matches(r, ctx))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || specificity(b) - specificity(a));

  const winner = applicable[0] || null;

  let deliveryFee;
  if (winner) {
    deliveryFee = winner.freeShipping ? 0 : Math.max(0, Number(winner.fee) || 0);
    breakdown.push({
      rule: winner.id || winner.ruleType,
      type: winner.ruleType,
      why: winner.freeShipping ? 'توصيلٌ مجّانيّ بقاعدة' : `ثمنُ القاعدة ${deliveryFee}`,
      fee: deliveryFee,
    });
  } else {
    deliveryFee = Math.max(0, Number(opts.fallbackFee) || 0);
    breakdown.push({ rule: 'fallback', type: 'fallback', why: 'لا قاعدةَ مطابقة — الثمنُ الافتراضيّ', fee: deliveryFee });
  }

  // رسمُ الدفع عند الاستلام يُحسب فوق ثمن التوصيل ولا يُدمج فيه: دمجُهما هو
  // ما يجعل التاجرَ عاجزًا عن معرفة أين ذهب المال.
  let codFee = 0;
  const rate = Number(opts.codFeeRate) || 0;
  if (rate > 0 && Number(ctx.codAmount) > 0) {
    codFee = Math.max(0, Math.round(Number(ctx.codAmount) * rate));
    breakdown.push({ rule: 'cod', type: 'cod', why: `رسمُ COD ${(rate * 100).toFixed(1)}%`, fee: codFee });
  }

  const quote = makeQuote({
    deliveryFee, codFee, currency,
    estimatedDays: Number(opts.estimatedDays) || 0,
    supported: true,
  });
  return { ...quote, breakdown };
}

/** تطبيعُ صفٍّ من القاعدة إلى شكلٍ يفهمه المحرّك. */
function normalizeRule(r) {
  return {
    id: r.id,
    providerRowId: r.providerRowId || r.provider_row_id || null,
    ruleType: r.ruleType || r.rule_type,
    cityId: r.cityId || r.city_id || null,
    region: r.region || null,
    weightMin: _num(r.weightMin ?? r.weight_min),
    weightMax: _num(r.weightMax ?? r.weight_max),
    orderMin: _num(r.orderMin ?? r.order_min),
    orderMax: _num(r.orderMax ?? r.order_max),
    fee: Number(r.fee) || 0,
    freeShipping: !!(r.freeShipping ?? r.free_shipping),
    priority: Number(r.priority) || 0,
    enabled: (r.enabled ?? true) !== false,
  };
}

module.exports = { evaluate, normalizeRule, RULE_TYPES };
