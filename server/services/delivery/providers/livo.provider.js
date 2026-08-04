'use strict';

// Livo — https://rest.livo.ma
// مصادقة: Bearer API key. لا endpoint لحساب الثمن ⇒ التسعير بقواعدَ محلّيّة.

const { makeQuote, pickArray, pickObject } = require('../contract');

const meta = {
  id: 'livo', name: 'Livo', country: 'MA', currency: 'MAD', version: '1.0',
  // تُعرِّف Livo نفسَها بنطاقاتها؛ لا أحدَ خارج هذا الملفّ يعرف أنّها «livo.ma».
  match: { hosts: ['livo.ma'] },
  credentials: [
    { key: 'apiKey', label: 'مفتاح API', required: true, secret: true, maps: 'apiKey',
      placeholder: 'sk_live_…', help: 'my.livo.ma ← API ← Generate key' },
    { key: 'apiEndpoint', label: 'نقطة نهاية API', required: false, maps: 'apiEndpoint',
      placeholder: 'https://rest.livo.ma', help: 'اتركها فارغةً للافتراضيّ' },
  ],
};

const capabilities = {
  cities: 'api', pricing: 'rules', tracking: 'api', cod: true, pickup: true,
};

const _base = (cfg) => cfg?.apiEndpoint || 'https://rest.livo.ma';
const _headers = (cfg) => ({
  'Authorization': `Bearer ${cfg?.apiKey || ''}`,
  'Content-Type': 'application/json',
});

/**
 * ثمنُ Livo حسب المدينة (كازا 20، خارجها 35 — كما أكّده التاجر).
 * قاعدةٌ محلّيّةٌ لأنّ Livo لا تُقدّم حسابَ ثمنٍ عبر API؛ ولا يعرفها أحدٌ
 * خارج هذا الملفّ — بقيّةُ النظام ترى `DeliveryQuote` فقط.
 */
function _cityFee(city) {
  const c = String(city || '').trim().toLowerCase();
  return /casa|الدار البيضاء|دار البيضاء/.test(c) ? 20 : 35;
}

async function calculateQuote(order, cfg) {
  // تنبيه: `cost` عند Livo هو **المبلغُ المُحصَّل عند التسليم**، لا رسمُ
  // التوصيل. لا يُقرأ هنا حتّى لا يتسرّب المعنيان إلى بعضهما.
  return makeQuote({
    deliveryFee: order?.deliveryFee != null ? +order.deliveryFee : _cityFee(order?.cityName || order?.city),
    currency: meta.currency,
    estimatedDays: 2,
    supported: true,
  });
}

/**
 * مطابقةُ منتجاتنا بمنتجات Livo.
 *
 *   `POST /orders` **يرفض** الطلبَ بلا `products`، وكلُّ عنصرٍ فيها
 *   `product_id` من كتالوج Livo (`pr-xxxxxxxx`) — لا اسمُ منتجنا ولا مُعرِّفُنا.
 *   والجسرُ الوحيدُ المتاح: حقلُ `refr` في كتالوجهم، وهو موصوفٌ حرفيًّا بأنّه
 *   «الـSKU / مرجعُ الزبون» — أي مرجعُنا نحن. فإن غاب، نطابق بالاسم المُطبَّع
 *   (`id_name` عندهم = الاسمُ بحروفٍ صغيرة).
 */
async function _livoCatalog(cfg) {
  const out = new Map();                       // مفتاحٌ مُطبَّع → product_id
  // ٥ طلباتٍ في الثانية سقفُهم؛ صفحتان تكفيان لكتالوجٍ عاديّ.
  for (let skip = 0; skip < 400; skip += 200) {
    const res = await fetch(`${_base(cfg)}/products?_limit=200&_skip=${skip}`, {
      method: 'GET', headers: _headers(cfg),
    });
    if (!res.ok) break;
    const rows = pickArray(await res.json().catch(() => ({})));
    for (const p of rows) {
      const id = String(p?._id || '');
      if (!id) continue;
      for (const k of [p.refr, p.id_name, p.name]) {
        const n = _norm(k);
        if (n && !out.has(n)) out.set(n, id);
      }
    }
    if (rows.length < 200) break;
  }
  return out;
}

const _norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

/**
 * بنودُ الطلب بصيغة Livo. تُرجع `{ products, missing }` — و`missing` هي
 * أسماءُ ما لا مقابلَ له في كتالوجهم. **لا نخترع مُعرِّفًا ولا نُسقِط بندًا
 * بصمت**: طلبٌ ينقصه بندٌ طلبٌ خاطئٌ يصل إلى الزبون ناقصًا.
 */
function _mapProducts(order, catalog) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const products = [];
  const missing = [];
  for (const it of items) {
    const key = [it?.sku, it?.productName, it?.name].map(_norm).find(k => k && catalog.has(k));
    if (!key) { missing.push(it?.productName || it?.name || it?.sku || 'بندٌ بلا اسم'); continue; }
    products.push({
      product_id: catalog.get(key),
      quantity: Math.max(1, Math.min(99, Math.round(+it?.quantity || 1))),
      ...(it?.sku ? { refr: String(it.sku) } : {}),
    });
  }
  return { products, missing };
}

async function createShipment(order, cfg) {
  try {
    // ── العقدُ الحقيقيّ (OpenAPI: AddOrderRequest) ─────────────
    // كان ما نرسله يخالفه في أربعةِ مواضعَ، كلٌّ منها يكفي وحدَه لإفشال الطلب
    // أو — وهو الأسوأ — لإنجاحه خاطئًا:
    //
    //  ① المستلِمُ في `target` **مُعشَّشًا**، وكنّا نرسله مسطّحًا
    //     (`recipientName`/`phone`/`city`) فيردّ: «"target" is required».
    //  ② `products` **إجباريّة** بمُعرِّفات Livo، وكنّا لا نرسلها أصلًا.
    //  ③ `cost` عندهم **المبلغُ المُحصَّل عند التسليم**، وكنّا نرسل فيه
    //     رسمَ التوصيل. لو قُبل الطلبُ لحصّل الموزّعُ عشرين درهمًا بدل ثمنِ
    //     الطلب كلِّه — خطأُ مالٍ لا خطأُ تكامل.
    //  ④ الطلبُ يُنشَأ `draft` ما لم نقل `status: 'pending'`. والمسوّدةُ
    //     **لا تدخل دورةَ التوصيل ولا تظهر في لوحتهم** — وهذا بالضبط ما
    //     لاحظه المالك: رقمُ تتبّعٍ عندنا ولا أثرَ للطلب عندهم.
    const target = {
      name:    order.customerName || order.recipientName || '',
      phone:   order.phone || order.customerPhone || '',
      city:    order.cityName || order.city || '',
      address: order.address || '',
    };
    if (!target.name || !target.city || !target.address) {
      return { success: false, error: 'Livo تتطلّب اسمَ المستلِم ومدينتَه وعنوانَه' };
    }

    const catalog = await _livoCatalog(cfg);
    if (!catalog.size) {
      return { success: false, error: 'تعذّر قراءةُ كتالوج Livo — تحقّق من مفتاح API' };
    }
    const { products, missing } = _mapProducts(order, catalog);
    if (missing.length) {
      return {
        success: false,
        error: `منتجاتٌ غيرُ مسجّلةٍ في مستودع Livo: ${missing.join(' · ')} — سجّلها عندهم أو وحّد الـSKU`,
      };
    }
    if (!products.length) return { success: false, error: 'الطلبُ بلا بنودٍ — Livo ترفض طلبًا فارغًا' };

    const payload = {
      // المبلغُ المُحصَّل عند التسليم — لا رسمُ التوصيل.
      cost: Math.max(0, +(order.codAmount != null ? order.codAmount : order.total) || 0),
      target,
      products,
      // بلا هذا يبقى الطلبُ مسوّدةً لا يراها أحد.
      status: 'pending',
      ...(order.notes ? { comment: String(order.notes).slice(0, 2000) } : {}),
      ...(order.id ? { client_order_id: String(order.id).slice(0, 100) } : {}),
      ...(order.desiredDate ? { desired_date: order.desiredDate } : {}),
    };

    const res = await fetch(`${_base(cfg)}/orders`, {
      method: 'POST', headers: _headers(cfg), body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      // رسائلُهم في `data.en_message`/`data.fr_message`، لا في `message`.
      // وكنّا نقرأ `result.message` فنعرض «HTTP 400» بلا سببٍ يُقرأ.
      const err = (result && result.data) || {};
      // `type: 'prompt'` ليس فشلًا بل طلبُ تأكيد (هاتفٌ مكرَّرٌ خلال ٣٠ دقيقة).
      const kind = err.type === 'prompt' ? 'تأكيدٌ مطلوب: ' : '';
      return { success: false, error: kind + (err.fr_message || err.en_message || err.error || `HTTP ${res.status}`) };
    }

    const d = pickObject(result);
    if (result.success && d && d._id) {
      return { success: true, shipmentId: d._id, trackingNumber: d._id, status: d.status };
    }
    return { success: false, error: 'استجابةٌ غيرُ متوقّعة من Livo' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function trackShipment(shipmentId, cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/orders/${shipmentId}`, { method: 'GET', headers: _headers(cfg) });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (result && result.data) || {};
      return { success: false, error: err.fr_message || err.en_message || `HTTP ${res.status}` };
    }
    const d = pickObject(result);
    if (result.success && d) {
      return {
        success: true,
        status: d.status,
        // مُعرِّفُ Livo نفسُه هو رقمُ التتبّع — لا حقلَ `tracking_number` عندهم.
        trackingNumber: d._id,
        returnStatus: d.return_status || null,
        history: pickArray(d, ['history']),
      };
    }
    return { success: false, error: result.message || 'استجابةٌ غيرُ متوقّعة' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getCities(cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/cities`, { method: 'GET', headers: _headers(cfg) });
    const result = await res.json().catch(() => ({}));
    if (res.ok && result.success) {
      // Livo تُرجع `{success, data:{data:[…]}}` — لا `{success, data:[…]}`.
      // كان الكودُ يقرأ `result.data` فيجد كائنًا وترمي `.map`، فبقيت ٤٤١
      // مدينةً غيرَ مقروءةٍ ولا يُصلحها مفتاحٌ صحيح. `pickArray` تفحص لا تفترض.
      // `canOrder` تقول أيَّ مدينةٍ تُسلَّم فيها الطلبات. عرضُ مدينةٍ لا
      // تُسلَّم فيها يعني طلبًا يُرفَض بعد أن يملأه التاجر.
      const cities = pickArray(result).map(c => ({
        id: String(c._id || c.id || c.code || ''),
        name: String(c.name || c.label || c.city || ''),
        deliverable: c.canOrder !== false,
        pickup: c.canPickup === true,
      })).filter(c => c.id && c.name && c.deliverable);
      return { success: true, cities };
    }
    return { success: false, error: result.message || 'فشل جلب المدن' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testConnection(cfg) {
  try {
    const res = await fetch(`${_base(cfg)}/auth/keys`, { method: 'GET', headers: _headers(cfg) });
    return res.ok;
  } catch { return false; }
}

module.exports = {
  meta, capabilities,
  createShipment, trackShipment, getCities, calculateQuote, testConnection,
};
