'use strict';
// ============================================================
// Universal Business Engine — طبقة تجميع (Facade) لا طبقة تخزين
// ------------------------------------------------------------
// مصدر الحقيقة يبقى الجداول القائمة (products/settings/providers/listings).
// هذه الطبقة لا تملك بيانات مستقلة ولا منطقاً مكرراً — مسؤوليتها فقط:
//   1) Normalization: كل مصدر → نموذج Business واحد
//   2) البحث الموحّد (search / searchNearby)
//   3) الملف الموحّد (getProfile) بأقسام يقودها Capabilities
//   4) إخفاء اختلاف المصادر خلف واجهة Adapter واحدة
// إضافة نوع نشاط جديد مستقبلاً = Adapter جديد فقط، بلا لمس بقية النظام.
// عند إنشاء جدول `businesses` لاحقاً: يتغيّر داخل الـ Adapters فقط،
// ويبقى عقد Business + BusinessService ثابتاً.
// ============================================================
const { db } = require('../database');
const presentation = require('./engines/presentation');
const { computeStatus, smartAvailability } = require('./engines/status');

const num = (x) => (x != null && !isNaN(+x)) ? +x : null;

// ── Capabilities Engine ───────────────────────────────────────
// القدرات (لا الـ type) هي ما يقود الواجهة. نشاط قد يجمع عدة وظائف
// (صيدلية: products+delivery+booking+services؛ ورشة: services+booking+products).
const CAP_KEYS = ['products', 'services', 'booking', 'delivery', 'offers', 'chat', 'appointments', 'marketplace'];
function capabilities(partial = {}) {
  const c = {};
  for (const k of CAP_KEYS) c[k] = !!partial[k];
  return c;
}

// الأقسام: Capabilities + توفّر البيانات تقرّر أيّها يظهر (gate)،
// وPresentation Registry يقرّر الترتيب حسب نوع العرض (kind) — فصلٌ تام.
const SECTION_ORDER = ['about', 'products', 'services', 'offers', 'booking', 'gallery', 'reviews', 'location', 'contact'];
function sectionsFor(business) {
  const c = business.capabilities || {};
  const gate = {
    about:    true,
    products: !!c.products,
    services: !!c.services,
    offers:   !!c.offers,
    booking:  !!(c.booking || c.appointments),
    gallery:  Array.isArray(business.gallery) && business.gallery.length > 0,
    reviews:  true,
    location: !!business.location,
    contact:  !!(business.contact && (business.contact.phone || business.contact.whatsapp)),
  };
  const enabled = SECTION_ORDER.filter(s => gate[s]);
  // الترتيب من Presentation Registry حسب kind (يسقط إلى type ثم default)
  return presentation.orderSections(business.kind || business.type, enabled);
}

function baseBusiness(over) {
  return {
    source: '', id: '', type: '', ownerId: '',
    name: '', description: '', city: '', location: null,
    image: '', gallery: [],
    verified: false, rating: { avg: 0, count: 0 },
    contact: { phone: '', whatsapp: '' },
    categories: [], capabilities: capabilities(), status: null, availability: null, href: '',
    ...over,
  };
}

// ── Adapters: كل مصدر يحوّل صفوفه إلى Business (بلا منطق مكرر) ──
const StoreAdapter = {
  source: 'store',
  search: (opts) => db.discoverStores(opts),
  normalize(s) {
    const brand = s.brand || {};
    return baseBusiness({
      source: 'store', id: s.storeId, type: 'store', ownerId: s.storeId,
      name: s.name || brand.name || 'متجر', description: s.description || brand.description || '',
      city: s.city || brand.city || '',
      location: (num(s.latitude) != null && num(s.longitude) != null) ? { lat: +s.latitude, lng: +s.longitude } : null,
      image: s.logo || brand.logo || '',
      verified: !!s.verified, rating: { avg: +s.ratingAvg || 0, count: +s.ratingCount || 0 },
      contact: { phone: brand.phone || '', whatsapp: brand.whatsapp || brand.phone || '' },
      capabilities: capabilities({ products: true, offers: true, chat: true }),
      status: computeStatus({ workStart: s.workStart || brand.workStart, workEnd: s.workEnd || brand.workEnd, override: s.statusOverride || brand.statusOverride }),
      productCount: +s.productCount || 0,
      href: `/business/store/${s.storeId}`,
    });
  },
  async getProfile(id) {
    const settings = await db.getSettings(id);
    if (!settings || !settings.brand) return null;
    const brand = settings.brand;
    const [products, providers] = await Promise.all([
      db.getProducts(id).then(ps => ps.filter(p => p.status === 'published')).catch(() => []),
      db.getProviders(id, { status: 'approved' }).catch(() => []),
    ]);
    const hasDelivery = !!(settings.deliveryCosts && Object.keys(settings.deliveryCosts).length) || !!settings.delivery?.enabled;
    const business = this.normalize({ storeId: id, brand, name: brand.name, description: brand.description, city: brand.city, logo: brand.logo, workStart: brand.workStart, workEnd: brand.workEnd, statusOverride: brand.statusOverride });
    business.capabilities = capabilities({
      products: products.length > 0,
      services: products.some(p => p.type === 'service') || providers.length > 0,
      booking:  providers.length > 0,
      delivery: hasDelivery,
      offers:   true,
      chat:     true,
    });
    business.gallery = products.map(p => p.imageUrl).filter(Boolean).slice(0, 12);
    return {
      business,
      sections: sectionsFor(business),
      data: {
        products: products.map(p => ({ id: p.id, name: p.name, price: p.price, imageUrl: p.imageUrl, emoji: p.emoji, type: p.type })),
        providers: providers.map(ProviderAdapter.normalize),
        openingHours: { start: brand.workStart || '', end: brand.workEnd || '' },
      },
    };
  },
};

const ProviderAdapter = {
  source: 'provider',
  search: (opts) => db.discoverProviders(opts),
  normalize(p) {
    return baseBusiness({
      source: 'provider', id: p.id, type: 'service', ownerId: p.storeId || p.userId || '',
      name: p.name, description: p.bio || '', city: p.city || '',
      location: (num(p.latitude) != null && num(p.longitude) != null) ? { lat: +p.latitude, lng: +p.longitude } : null,
      image: p.avatarUrl || '',
      verified: !!p.isVerified, rating: { avg: +p.ratingAvg || 0, count: +p.ratingCount || 0 },
      contact: { phone: p.phone || '', whatsapp: p.phone || '' },
      categories: Array.isArray(p.serviceLabels) ? p.serviceLabels : (p.services || []).map(s => s.serviceLabel),
      capabilities: capabilities({ services: true, booking: true, appointments: true, chat: true }),
      href: p.storeId ? `/business/store/${p.storeId}` : `/business/provider/${p.id}`,
    });
  },
  async getProfile(id) {
    const p = await db.getProviderById(id);
    if (!p) return null;
    const [services, availability] = await Promise.all([
      db.getProviderServices(id).catch(() => []),
      db.getAvailabilityTemplates(id).catch(() => []),
    ]);
    const business = this.normalize({ ...p, services });
    business.availability = smartAvailability(availability); // متاح اليوم/غداً/هذا الأسبوع
    return { business, sections: sectionsFor(business), data: { services, availability } };
  },
};

const ListingAdapter = {
  source: 'listing',
  search: (opts) => db.getPublicListings(opts),
  normalize(l) {
    const isService = l.type === 'service';
    return baseBusiness({
      source: 'listing', id: l.id, type: isService ? 'service' : 'store', ownerId: l.vendorId || '',
      name: l.name, description: l.description || '', city: l.city || '',
      image: (l.images && l.images[0]) || '', gallery: l.images || [],
      rating: { avg: +l.ratingAvg || 0, count: +l.ratingCount || 0 },
      contact: { phone: l.sellerPhone || '', whatsapp: l.sellerPhone || '' },
      categories: l.category ? [l.category] : [],
      capabilities: capabilities({ products: !isService, services: isService, marketplace: true }),
      price: +l.price || 0,
      href: `/business/listing/${l.id}`,
    });
  },
  async getProfile(id) {
    const l = await db.getListing(id);
    if (!l || l.status !== 'approved') return null;
    db.incrementListingViews(id).catch(() => {});
    const business = this.normalize(l);
    return { business, sections: sectionsFor(business), data: { price: +l.price || 0, images: l.images || [] } };
  },
};

const ADAPTERS = { store: StoreAdapter, provider: ProviderAdapter, listing: ListingAdapter };

// أي المصادر تُستعلَم لنوع مطلوب (النوع للتصفية فقط — القدرات هي الحقيقة)
function sourcesForType(type) {
  if (type === 'store')   return ['store', 'listing'];
  if (type === 'service') return ['provider', 'listing'];
  return ['store', 'provider', 'listing'];
}

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// ── الواجهة الوحيدة التي تعتمد عليها كل الطبقات العليا ─────────
// (Discover / Universal Search / Map / AI ⇒ BusinessService فقط)
const BusinessService = {
  capabilities, sectionsFor, CAP_KEYS, SECTION_ORDER, adapters: ADAPTERS,

  async search({ city, q, type, limit = 24 } = {}) {
    const sources = sourcesForType(type);
    const settled = await Promise.allSettled(sources.map(src => {
      const listingType = src === 'listing' ? (type === 'store' ? 'product' : type) : type;
      return ADAPTERS[src].search({ city, q, type: listingType, limit });
    }));
    const out = [];
    settled.forEach((r, i) => {
      if (r.status !== 'fulfilled' || !Array.isArray(r.value)) return;
      const adapter = ADAPTERS[sources[i]];
      for (const row of r.value) out.push(adapter.normalize(row));
    });
    return out;
  },

  // المنتجات تنتمي لنشاط، فلا تُعامَل كـ Business مستقل
  async searchProducts({ city, q, limit = 24 } = {}) {
    try { return await db.discoverProducts({ city, q, limit }); }
    catch { return []; }
  },

  // للخريطة: نفس المصدر، مع تصفية بالموقع والمسافة
  async searchNearby({ lat, lng, radiusKm = 25, city, q, type, limit = 60 } = {}) {
    const all = await this.search({ city, q, type, limit });
    const origin = (num(lat) != null && num(lng) != null) ? { lat: +lat, lng: +lng } : null;
    const withLoc = all.filter(b => b.location);
    if (!origin) return withLoc;
    return withLoc
      .map(b => ({ ...b, distanceKm: +haversineKm(origin, b.location).toFixed(2) }))
      .filter(b => b.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },

  // مرادف يستعمله الذكاء الاصطناعي لاحقاً (نية → استعلام)
  find(opts) { return this.search(opts); },

  async getProfile(source, id) {
    const adapter = ADAPTERS[source];
    if (!adapter) return null;
    return adapter.getProfile(id);
  },
};

// الواجهة الوحيدة: BusinessService (search / searchProducts / searchNearby /
// find / getProfile). كل الطبقات العليا تعتمد عليها فقط.
module.exports = BusinessService;
