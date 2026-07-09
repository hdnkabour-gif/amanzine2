'use strict';
// ============================================================
// Search Engine — Pipeline موحّد
//   Query → Normalize → Intent → Business Engine → Ranking → Response
// كل الطبقات العليا (Discover / Universal Search / AI) تنادي execute()
// ولا تعرف مصدر البيانات. تعيد { intent, filters, weights, businesses, products }.
// ============================================================
const business = require('../business');
const ranking = require('./ranking');
const mapEngine = require('./map');

// إشارات نيّة الخدمة (عربي/دارجة/فرنسي) — تحدّد أن الاستعلام خدمة لا منتج
const SERVICE_TERMS = [
  'سباك', 'كهربائي', 'نجار', 'دهان', 'صباغ', 'ميكانيكي', 'حداد', 'بناء', 'تنظيف',
  'مكيف', 'تكييف', 'مبرد', 'مصور', 'حلاق', 'خياط', 'بستنة', 'نقل', 'ديكور', 'تركيب', 'صيانة', 'إصلاح',
  'plombier', 'electricien', 'électricien', 'menuisier', 'peintre', 'mecanicien', 'mécanicien',
  'nettoyage', 'climatisation', 'photographe', 'coiffeur', 'transport', 'reparation', 'réparation', 'installation',
];
const NEARBY_TERMS = ['قريب', 'قريبة', 'بجواري', 'بالقرب', 'حداي', 'nearby', 'proche', 'près', 'pres', 'autour'];
const INTENT_VERBS = ['أريد', 'بغيت', 'محتاج', 'نحتاج', 'كنقلب', 'je cherche', 'cherche', 'besoin', 'veux'];

const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

// 1) Normalize + 2) Intent
function detectIntent(rawQuery) {
  const q = norm(rawQuery);
  if (!q) return { kind: 'general', nearby: false, cleaned: '', matched: [] };
  const hitService = SERVICE_TERMS.filter(t => q.includes(t));
  const hitNearby  = NEARBY_TERMS.some(t => q.includes(t));
  const hitVerb    = INTENT_VERBS.some(t => q.includes(t));
  // خدمة إذا وُجد مصطلح خدمة، أو فعل نيّة + غياب دلائل منتج واضحة
  const kind = hitService.length ? 'service' : 'general';
  return { kind, nearby: hitNearby, verb: hitVerb, cleaned: q, matched: hitService };
}

// نسبة مطابقة نصية 0..1 (تُغذّي إشارة relevance في Ranking)
function relevance(b, q) {
  if (!q) return 0.5;
  const name = norm(b.name), cats = (b.categories || []).map(norm).join(' '), desc = norm(b.description);
  if (name === q) return 1;
  if (name.startsWith(q)) return 0.85;
  if (name.includes(q)) return 0.7;
  if (cats.includes(q)) return 0.6;
  if (desc.includes(q)) return 0.4;
  // مطابقة جزئية بكلمة من الاستعلام
  const words = q.split(' ').filter(Boolean);
  if (words.some(w => name.includes(w) || cats.includes(w))) return 0.5;
  return 0.15;
}

// Universal Filters — تُطبَّق على النموذج الموحّد بعد التطبيع (مصدر واحد لكل الأنواع)
function applyFilters(list, f = {}) {
  return list.filter(b => {
    if (f.category && !(b.categories || []).some(c => String(c).toLowerCase().includes(String(f.category).toLowerCase()))) return false;
    if (f.verified && !b.verified) return false;
    if (f.ratingMin != null && (+b.rating?.avg || 0) < +f.ratingMin) return false;
    if (f.delivery && !(b.capabilities && b.capabilities.delivery)) return false;
    if (f.booking  && !(b.capabilities && (b.capabilities.booking || b.capabilities.appointments))) return false;
    if (f.offers   && !(b.capabilities && b.capabilities.offers)) return false;
    if (f.openNow  && !(b.status && b.status.code === 'open')) return false;
    if (f.availableToday && !(b.availability && (b.availability.code === 'today'))) return false;
    if (f.priceMax != null && b.price != null && +b.price > +f.priceMax) return false;
    if (f.priceMin != null && b.price != null && +b.price < +f.priceMin) return false;
    return true;
  });
}

// 3-5) Engine → Ranking → Response
// Discover = Search بدون Query: نفس المحرّك، بلا q → يرتّب Ranking حسب
// المسافة/التقييم/الموثوقية/الشعبية فيظهر "قريب/الأعلى تقييماً/رائج" تلقائياً.
async function execute({ q, city, lat, lng, type, radiusKm, limit = 24, weights, filters: userFilters = {}, view } = {}) {
  const intent = detectIntent(q);
  const effectiveType = type || (intent.kind === 'service' ? 'service' : undefined);
  // خريطة أو نيّة "قريب" → بحث بالموقع
  const wantNearby = (view === 'map' || intent.nearby) && lat != null && lng != null;

  const filters = {
    city: city || null, type: effectiveType || null, nearby: !!wantNearby, q: q || null,
    ...userFilters,
  };

  let businesses = wantNearby
    ? await business.searchNearby({ lat, lng, radiusKm: radiusKm || 25, city, q, type: effectiveType, limit })
    : await business.search({ city, q, type: effectiveType, limit });

  businesses = applyFilters(businesses, userFilters);

  for (const b of businesses) b.__relevance = relevance(b, intent.cleaned);
  const ranked = ranking.rank(businesses, { maxDistanceKm: radiusKm || 25 }, weights);
  ranked.forEach(b => { delete b.__relevance; });

  // المنتجات (تنتمي لنشاط) — تُعرض عندما لا تكون النيّة خدمة صرفة
  let products = intent.kind === 'service' ? [] : await business.searchProducts({ city, q, limit });
  if (userFilters.priceMax != null) products = products.filter(p => +p.price <= +userFilters.priceMax);
  if (userFilters.priceMin != null) products = products.filter(p => +p.price >= +userFilters.priceMin);

  const out = { intent, filters, weights: weights || ranking.DEFAULT_WEIGHTS, businesses: ranked, products };

  // عرض الخريطة: عقد خريطة ثابت (viewport/markers/clusters/legend) من Map Engine
  if (view === 'map') {
    out.map = mapEngine.build(ranked, { center: (lat != null && lng != null) ? { lat: +lat, lng: +lng } : null, radiusKm: radiusKm || 25 });
    out.markers = out.map.markers;     // اختصار متوافق
    out.viewport = out.map.viewport;
  }
  return out;
}

module.exports = { execute, detectIntent, relevance, applyFilters };
