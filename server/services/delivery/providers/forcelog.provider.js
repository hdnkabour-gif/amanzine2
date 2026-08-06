'use strict';

// ============================================================
// ForceLog — https://api.forcelog.ma
//
//   ثلاثةُ أشياءَ تكسر مزوّدًا كُتب على النمط المعتاد:
//
//     ① **الردُّ مغلَّفٌ باسم العمليّة**: `{"ADD-PARCEL":{RESULT,…}}` و
//        `{"GET-TRACKING":{…}}`. فمن قرأ `data.RESULT` وجد `undefined`
//        وظنّ الشركةَ صامتة. ولا يكفي `res.ok`: الخطأُ يصل بـHTTP 200.
//     ② **المدنُ كائنٌ لا مصفوفة**: `{"34":{CODE,NAME,D_FEES,…}}` مفتاحُه
//        مُعرِّفُ المدينة. و`pickArray` تُرجع `[]` بحقّ — فتُقرأ بـ
//        `Object.entries` صراحةً، ولا يُترَك الأمرُ للتخمين.
//     ③ **حدودُ الطول مُعلَنة** في وثيقتهم (اسم ٥٠ · هاتف ١٤ · عنوان ١٠٠…)،
//        والتجاوزُ يُرفَض. نقصُّها هنا: أن تصل الشحنةُ باسمٍ مقصوصٍ خيرٌ من
//        أن تُرفَض كلُّها لأنّ زبونًا كتب عنوانًا طويلًا.
//
//   وتُقدّم ما ينفع مباشرةً: `/customer/Cities` تُرجع **ثمنَ التوصيل لكلّ
//   مدينة** (وثمنًا مختلفًا داخل نفس المدينة) — فالتسعيرُ من الشركة لا تخمينًا.
// ============================================================

const { makeQuote, readCredentials } = require('../contract');

const meta = {
  id: 'forcelog',
  name: 'ForceLog',
  country: 'MA',
  currency: 'MAD',
  version: '1.0',
  match: { hosts: ['forcelog.ma', 'api.forcelog.ma'] },
  // مفتاحٌ واحدٌ لا غير. لا اسمَ ولا رابطَ دخولٍ ولا كلمةَ مرور — سؤالُ
  // التاجر عمّا لا تطلبه الشركةُ يجعله يملأ ما لا يصل أحدًا.
  credentials: [
    {
      key: 'apiKey', label: 'مفتاح API', required: true, secret: true, maps: 'apiKey',
      placeholder: '192832558ebfb4b57325ef1292965292',
      help: 'حسابك في forcelog.ma ← الإعدادات ← «حسابي» ← «توليد مفتاح API جديد»',
    },
  ],
};

const capabilities = {
  cities: 'api',
  pricing: 'api',     // `D_FEES` لكلّ مدينة
  tracking: 'api',
  cod: true,
  pickup: true,
};

const BASE = 'https://api.forcelog.ma';
const _base = (cfg) => {
  const raw = String(cfg?.apiEndpoint || '').trim().replace(/\/+$/, '') || BASE;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

const _key = (cfg) => readCredentials(cfg, meta.credentials).apiKey || '';

/** قصُّ الحقل إلى حدِّه المُعلَن — التجاوزُ يُرفَض عندهم. */
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);

async function _req(cfg, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${_base(cfg)}${path}`, {
    method,
    headers: {
      'X-API-Key': _key(cfg),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * يفتح الغلافَ باسم العمليّة ويحكم على `RESULT`.
 *
 *   `res.ok` وحدَها تقبل «Parcel Not Found» نجاحًا — يصل بـHTTP 200 والخطأُ
 *   في الجسم. وهذا نفسُ الدرس الذي كلّفنا ٤٤١ مدينةً في Livo: **افحص، لا تفترض**.
 */
function _unwrap(data, envelope) {
  const box = (data && typeof data === 'object' && data[envelope]) || data || {};
  const ok = String(box?.RESULT || '').toUpperCase() === 'SUCCESS';
  return { ok, box, error: box?.MESSAGE || 'ردٌّ غيرُ مفهومٍ من ForceLog' };
}

// ── إنشاءُ الشحنة ─────────────────────────────────────────────
async function createShipment(order, cfg) {
  try {
    const items = Array.isArray(order?.items) ? order.items : [];
    const names = items.map(i => i.productName || i.name || '').filter(Boolean);

    const body = {
      ORDER_NUM: cut(order?.id ?? '', 20),
      RECEIVER: cut(order?.customerName, 50),
      PHONE: cut(String(order?.customerPhone || '').replace(/\s+/g, ''), 14),
      CITY: cut(order?.providerCityId || order?.cityName || order?.city, 50),
      ADDRESS: cut(order?.address, 100),
      COMMENT: cut(order?.notes, 100),
      PRODUCT_NATURE: cut(names.join(' · ') || 'Commande', 100),
      // ⚠️ `COD` هو المبلغُ المُحصَّل من الزبون — لا رسمُ التوصيل.
      COD: order?.total != null ? +order.total : 0,
      CAN_OPEN: order?.noOpen === true ? 0 : 1,
    };
    // `STOCK` لبضاعةٍ في مستودعهم بصيغة «مرجع:كمّيّة». ومن يبيع من بيته
    // ليست بضاعتُه عندهم، فإرسالُ مراجعَ لا يعرفونها يُرفَض.
    if (order?.fromWarehouse === true && items.length) {
      body.STOCK = items
        .map(i => `${i.sku || i.productId || ''}:${Math.max(1, +i.quantity || 1)}`)
        .filter(s => !s.startsWith(':'))
        .join(',');
    }

    const { res, data } = await _req(cfg, '/customer/Parcels/AddParcel', { method: 'POST', body });
    const { ok, box, error } = _unwrap(data, 'ADD-PARCEL');
    if (!ok) return { success: false, error: error || `HTTP ${res.status}` };

    const parcel = box['NEW-PARCEL'] || {};
    const tracking = String(parcel.TRACKING_NUMBER || '').trim();
    if (!tracking) return { success: false, error: 'لم تُرجع ForceLog رقمَ تتبّع' };
    return { success: true, shipmentId: tracking, trackingNumber: tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── التتبّع ───────────────────────────────────────────────────
async function trackShipment(shipmentId, cfg) {
  try {
    const { res, data } = await _req(cfg, `/customer/Parcels/GetTracking?Code=${encodeURIComponent(shipmentId)}`);
    const { ok, box, error } = _unwrap(data, 'GET-TRACKING');
    if (!ok) return { success: false, error: error || `HTTP ${res.status}` };

    const history = (Array.isArray(box.HISTORY) ? box.HISTORY : []).map(h => ({
      status: String(h?.STATUS_NAME || h?.STATUS_CODE || ''),
      code: String(h?.STATUS_CODE || ''),
      city: String(h?.CITY_NAME || ''),
      at: h?.TIME || '',
    })).filter(h => h.status);

    return {
      success: true,
      // الوثيقةُ تقول إنّ التاريخ مرتّبٌ تصاعديًّا — فالأخيرُ هو الحالُ الآن.
      status: history[history.length - 1]?.status || '',
      history,
      trackingNumber: String(box.TRACKING_NUMBER || shipmentId || ''),
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── المدنُ والأثمان ───────────────────────────────────────────
/**
 * `/customer/Cities` تُرجع **كائنًا** مفتاحُه مُعرِّفُ المدينة:
 *   `{ "34": { CODE:"CAS", NAME:"Casablanca", D_FEES:"30", D_FEES_SAME_CITY:"20" } }`
 * وهذا المُعرِّفُ هو ما يُرسَل في `CITY` عند الإنشاء وفي `RelaunchZone`.
 */
function _cityRows(data) {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data)) return data.map(c => ({ id: String(c?.id || c?.CODE || ''), c }));
  return Object.entries(data)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([id, c]) => ({ id: String(id), c }));
}

async function getCities(cfg) {
  try {
    const { res, data } = await _req(cfg, '/customer/Cities');
    if (!res.ok) return { success: false, error: data?.MESSAGE || `HTTP ${res.status}` };
    const cities = _cityRows(data).map(({ id, c }) => ({
      id,
      name: String(c.NAME || c.CODE || ''),
      code: String(c.CODE || ''),
      price: +c.D_FEES || 0,
      priceSameCity: +c.D_FEES_SAME_CITY || 0,
      deliverable: true,
    })).filter(c => c.id && c.name);
    if (!cities.length) return { success: false, error: 'لم تُرجع ForceLog أيَّ مدينة' };
    return { success: true, cities };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getTariffs(cfg) {
  const r = await getCities(cfg);
  if (!r.success) return { success: false, error: r.error };
  return {
    success: true,
    tariffs: r.cities.map(c => ({
      city: c.name, deliveryFee: c.price, sameCityFee: c.priceSameCity, currency: meta.currency,
    })),
  };
}

async function calculateQuote(order, cfg) {
  const wanted = String(order?.cityName || order?.city || '').trim().toLowerCase();
  const r = await getCities(cfg);
  if (!r.success) {
    return makeQuote({ currency: meta.currency, estimatedDays: 2, supported: true, reason: r.error });
  }
  const hit = r.cities.find(c => c.name.trim().toLowerCase() === wanted || c.code.toLowerCase() === wanted);
  if (!hit) {
    return makeQuote({
      currency: meta.currency, supported: false,
      reason: wanted ? `ForceLog لا تُوصّل إلى «${order?.cityName || order?.city}»` : 'لم تُذكر المدينة',
    });
  }
  // ثمنٌ أقلُّ داخل نفس المدينة — تُعلنه الشركةُ ولا يُخمَّن.
  const sameCity = String(order?.originCity || '').trim().toLowerCase() === hit.name.trim().toLowerCase();
  const fee = sameCity && hit.priceSameCity ? hit.priceSameCity : hit.price;
  return makeQuote({
    deliveryFee: fee, currency: meta.currency,
    // وثيقتُهم: ٢٤ ساعةً للمدن الكبرى و٤٨ لغيرها. لا نعرف الصنفَ من API،
    // فنُعلن الأطولَ — الوعدُ الأقصرُ الذي يُخلَف أسوأُ من الأطول الذي يُوفى.
    estimatedDays: 2, supported: true,
  });
}

/** فحصُ الاتّصال: نقطةُ الصحّة لا تُثبت المفتاح، فنقرأ المدنَ — وهي مصادَقة. */
async function testConnection(cfg) {
  try {
    if (!_key(cfg)) return { success: false, error: 'ينقص مفتاح API' };
    const r = await getCities(cfg);
    return r.success ? { success: true } : { success: false, error: r.error };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  meta, capabilities,
  createShipment, trackShipment, getCities, getTariffs, calculateQuote, testConnection,
};
