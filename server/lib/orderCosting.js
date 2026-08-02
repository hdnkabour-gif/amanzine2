'use strict';

// ────────────────────────────────────────────────────────────────
// تكلفةُ الطلب — مصدرٌ واحدٌ لحساب الربح
//
// كان الثمنُ يُثبَّت لحظةَ الطلب (`safeItems` تحفظ `price`) والتكلفةُ لا.
// فكان التحليلُ يُعيد تسعيرَ طلبِ أمسِ بتكلفةِ اليوم: يرفع التاجرُ ثمنَ
// الشراء في بطاقة المنتج، فينقلب ربحُ طلبٍ مُسلَّمٍ منذ شهرٍ خسارةً.
// الحلّ: تُلتقط التكلفةُ في البند نفسِه، ويُقرأ الالتقاطُ أوّلًا.
//
// وكان رسمُ التوصيل داخلَ `total` (إيرادًا) ولا يُطرح أبدًا، فيُحسب ربحًا
// صافيًا وهو مالُ شركةِ التوصيل. هنا يُطرح.
// ────────────────────────────────────────────────────────────────

/** تكلفةُ الوحدة: الملتقَطُ في البند أوّلًا، ثمّ منتجُ اليوم للطلبات القديمة. */
function unitCost(item, products) {
  if (item && item.cost !== undefined && item.cost !== null && item.cost !== '') {
    return Math.max(0, +item.cost || 0);
  }
  const p = (products || []).find(x => x && x.id === item?.productId);
  return Math.max(0, +(p && p.cost) || 0);
}

/** تكلفةُ بضاعةِ طلبٍ واحد. */
function goodsCost(order, products) {
  return (order?.items || []).reduce(
    (s, it) => s + unitCost(it, products) * Math.max(1, +it?.quantity || 1),
    0
  );
}

/** ما يُدفَع لشركة التوصيل — مُحصَّلٌ من الزبون داخل `total`، فليس ربحًا. */
function shippingCost(order) {
  return Math.max(0, +order?.deliveryFee || 0) + Math.max(0, +order?.codFee || 0);
}

/** تكلفةُ الطلب كاملةً. */
function orderCost(order, products) {
  return goodsCost(order, products) + shippingCost(order);
}

/**
 * حصيلةُ مجموعةِ طلبات. `orders` يجب أن تكون **بلا ملغاة**.
 * @returns {{revenue:number, goods:number, shipping:number, cost:number, profit:number, margin:number}}
 */
function summarize(orders, products) {
  const list = orders || [];
  const revenue  = list.reduce((s, o) => s + (+o?.total || 0), 0);
  const goods    = list.reduce((s, o) => s + goodsCost(o, products), 0);
  const shipping = list.reduce((s, o) => s + shippingCost(o), 0);
  const cost     = goods + shipping;
  const profit   = revenue - cost;
  return {
    revenue, goods, shipping, cost, profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
  };
}

/**
 * يُثبّت تكلفةَ الشراء في بنود الطلب قبل حفظه.
 * لا يثق بـ`cost` القادمِ من العميل — يقرؤه من منتجات صاحب المتجر وحدَه.
 */
async function attachCosts(db, userId, items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];
  let products = [];
  try { products = await db.getProducts(userId); } catch { products = []; }
  return list.map(it => {
    const p = products.find(x => x && x.id === it?.productId);
    const { cost: _ignored, ...rest } = it || {};
    return p ? { ...rest, cost: Math.max(0, +p.cost || 0) } : { ...rest };
  });
}

module.exports = { unitCost, goodsCost, shippingCost, orderCost, summarize, attachCosts };
