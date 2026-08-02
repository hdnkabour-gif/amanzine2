// ────────────────────────────────────────────────────────────────
// تكلفةُ الطلب — نظيرُ `server/lib/orderCosting.js` بالحرف
//
// نسختان لأنّ الواجهةَ تحسب حين ينقطع الخادم، لا لأنّ الصيغةَ مختلفة.
// الصيغةُ واحدة، ويحرسها `test/brain/orderCosting.test.ts` بنفس الأمثلة
// المستعملة في `server/test/order-costing.test.js`.
//
// قاعدتان تُصلحان ما كان معطوبًا:
//  ① تكلفةُ الشراء تُقرأ من البند إن كانت مُلتقَطةً وقتَ الطلب — لا من
//    بطاقةِ المنتج اليوم. وإلّا انقلب ربحُ الشهر الماضي خسارةً لمجرّد أنّ
//    التاجر حدّث ثمنَ الشراء.
//  ② رسمُ التوصيل داخلَ `total`، فهو إيرادٌ محصَّلٌ ومصروفٌ مدفوع. طرحُه
//    يجعله محايدًا؛ تركُه كان يضخّم الربح.
// ────────────────────────────────────────────────────────────────

export interface CostableItem { productId?: string; quantity?: number; cost?: number | string | null }
export interface CostableOrder { total?: number; items?: CostableItem[]; deliveryFee?: number; codFee?: number }
export interface CostableProduct { id: string; cost?: number }

export interface Money {
  revenue: number; goods: number; shipping: number;
  cost: number; profit: number; margin: number;
}

export function unitCost(item: CostableItem, products: CostableProduct[]): number {
  if (item && item.cost !== undefined && item.cost !== null && item.cost !== '') {
    return Math.max(0, Number(item.cost) || 0);
  }
  const p = (products || []).find(x => x && x.id === item?.productId);
  return Math.max(0, Number(p?.cost) || 0);
}

export function goodsCost(order: CostableOrder, products: CostableProduct[]): number {
  return (order?.items || []).reduce(
    (s, it) => s + unitCost(it, products) * Math.max(1, Number(it?.quantity) || 1),
    0
  );
}

export function shippingCost(order: CostableOrder): number {
  return Math.max(0, Number(order?.deliveryFee) || 0) + Math.max(0, Number(order?.codFee) || 0);
}

export function orderCost(order: CostableOrder, products: CostableProduct[]): number {
  return goodsCost(order, products) + shippingCost(order);
}

/** `orders` يجب أن تكون بلا ملغاة. */
export function summarize(orders: CostableOrder[], products: CostableProduct[]): Money {
  const list = orders || [];
  const revenue  = list.reduce((s, o) => s + (Number(o?.total) || 0), 0);
  const goods    = list.reduce((s, o) => s + goodsCost(o, products), 0);
  const shipping = list.reduce((s, o) => s + shippingCost(o), 0);
  const cost     = goods + shipping;
  const profit   = revenue - cost;
  return {
    revenue, goods, shipping, cost, profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
  };
}
