'use strict';
// ============================================================
// Analytics Engine — مشتركون على Event Bus (لا SQL، يقرأ تدفّق الأحداث)
// وحدات مستقلة، كل وحدة مسؤولة عن نوع أحداث:
//   Search · Business · Marketplace · Provider · Platform
// التخزين تجميعات في الذاكرة (Facade)؛ تُستبدَل بجدول/OLAP لاحقاً
// خلف نفس واجهة snapshot() دون تغيير المصدر.
// ============================================================
const bus = require('./eventbus');

const inc = (m, k, n = 1) => m.set(k, (m.get(k) || 0) + n);
const top = (m, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

// ── الحالة (تجميعات) ─────────────────────────────────────────
const S = {
  search:      { terms: new Map(), zeroResult: new Map(), total: 0 },
  business:    { views: new Map(), clicks: new Map(), contacts: new Map(), itemViews: new Map() }, // itemViews: businessId → Map(label→count)
  marketplace: { productViews: new Map(), categories: new Map() },
  provider:    { bookings: new Map(), cancellations: new Map() },
  platform:    { byCategory: new Map(), byCity: new Map(), byType: new Map(), source: new Map(), total: 0, days: new Set() },
};
function incNested(outer, bid, label) {
  if (!bid || !label) return;
  if (!outer.has(bid)) outer.set(bid, new Map());
  const inner = outer.get(bid); inner.set(label, (inner.get(label) || 0) + 1);
}

// ── الوحدات: كل وحدة تشترك في نمطها فقط ──────────────────────
function registerSearchAnalytics() {
  bus.subscribe('search.executed', e => {
    S.search.total++;
    const q = (e.payload && e.payload.q || '').trim().toLowerCase();
    if (q) inc(S.search.terms, q);
    if (q && e.payload && e.payload.resultCount === 0) inc(S.search.zeroResult, q);
  });
}
function registerBusinessAnalytics() {
  bus.subscribe('business.viewed',  e => e.businessId && inc(S.business.views, e.businessId));
  bus.subscribe('business.clicked', e => e.businessId && inc(S.business.clicks, e.businessId));
  bus.subscribe('business.contact', e => e.businessId && inc(S.business.contacts, e.businessId));
  // مشاهدات المنتجات/الخدمات لكل نشاط (للوحة التاجر: الأكثر مشاهدة)
  bus.subscribe('product.viewed', e => incNested(S.business.itemViews, e.businessId, e.payload?.name || e.payload?.productId));
  bus.subscribe('service.viewed', e => incNested(S.business.itemViews, e.businessId, e.payload?.name || e.payload?.serviceId));
}
function registerMarketplaceAnalytics() {
  bus.subscribe('product.viewed', e => { if (e.payload?.productId) inc(S.marketplace.productViews, e.payload.name || e.payload.productId); });
  bus.subscribe('listing.*',      e => { if (e.payload?.type) inc(S.marketplace.categories, e.payload.type); });
}
function registerProviderAnalytics() {
  bus.subscribe('booking.created',   e => e.businessId && inc(S.provider.bookings, e.businessId));
  bus.subscribe('booking.cancelled', e => e.businessId && inc(S.provider.cancellations, e.businessId));
}
function registerPlatformAnalytics() {
  bus.subscribe('*', e => {
    S.platform.total++;
    inc(S.platform.byCategory, e.category);
    inc(S.platform.byType, e.type);
    if (e.city) inc(S.platform.byCity, e.city);
    if (e.payload?.source) inc(S.platform.source, e.payload.source); // مصدر الزيارة
    S.platform.days.add(String(e.createdAt || '').slice(0, 10));
  });
}

let _wired = false;
function init() {
  if (_wired) return; _wired = true;
  registerSearchAnalytics();
  registerBusinessAnalytics();
  registerMarketplaceAnalytics();
  registerProviderAnalytics();
  registerPlatformAnalytics();
}

// لقطة موحّدة للوحات المعلومات
function snapshot(scope) {
  const platform = {
    totalEvents: S.platform.total,
    activeDays: S.platform.days.size,
    topCategories: top(S.platform.byCategory),
    topCities: top(S.platform.byCity),
    topTypes: top(S.platform.byType),
    topSources: top(S.platform.source),
  };
  const search = {
    totalSearches: S.search.total,
    topTerms: top(S.search.terms),
    zeroResultTerms: top(S.search.zeroResult),
  };
  const marketplace = { topProducts: top(S.marketplace.productViews), topCategories: top(S.marketplace.categories) };
  const provider = {
    topByBookings: top(S.provider.bookings),
    cancellationRate: (() => {
      const b = [...S.provider.bookings.values()].reduce((a, x) => a + x, 0);
      const c = [...S.provider.cancellations.values()].reduce((a, x) => a + x, 0);
      return b + c ? +(c / (b + c)).toFixed(3) : 0;
    })(),
  };
  const all = { platform, search, marketplace, provider };
  return scope && all[scope] ? { [scope]: all[scope] } : all;
}

// لوحة تاجر واحد (Shopify-like): مقاييس نشاطه مع CTR ومعدّل الحجز
function forBusiness(businessId) {
  const views    = S.business.views.get(businessId) || 0;
  const clicks   = S.business.clicks.get(businessId) || 0;
  const contacts = S.business.contacts.get(businessId) || 0;
  const bookings = S.provider.bookings.get(businessId) || 0;
  const items    = S.business.itemViews.get(businessId);
  return {
    businessId,
    views, clicks, contacts, bookings,
    ctr: views ? +(clicks / views).toFixed(3) : 0,
    contactRate: views ? +(contacts / views).toFixed(3) : 0,
    topItems: items ? top(items, 8) : [],
  };
}

module.exports = { init, snapshot, forBusiness, _state: S };
