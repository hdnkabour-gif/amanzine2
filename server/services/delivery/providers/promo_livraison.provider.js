'use strict';

// ============================================================
// Promo Livraison — https://promo-livraison.ma/seller/api-parcels
//
//   شركةٌ تخالف العاداتِ في ثلاثةِ مواضع، وكلٌّ منها يكفي وحدَه لكسر
//   مزوّدٍ كُتب على النمط المعتاد:
//
//     ① **نقطةٌ واحدةٌ لكلّ شيء.** لا `/orders` ولا `/track`؛ العنوانُ نفسُه
//        للإضافة والتتبّع، ويفرّق بينهما حقلُ `action` في الجسم.
//     ② **الترميزُ `x-www-form-urlencoded` لا JSON**، والرمزُ (`token`) في
//        **الجسم** لا في ترويسة `Authorization`. فمزوّدٌ يُرسل JSON بترويسةِ
//        Bearer يتلقّى «Token invalide» وهو يظنّ المفتاحَ خاطئًا.
//     ③ **حقلُ `status` يغيّر نوعَه بين العمليّتين**: `200` (عدد) عند
//        الإضافة، و`true` (منطقيّ) عند التتبّع، و`401` عند فساد الرمز.
//        وكذلك `msg`: نصٌّ عند الإضافة، **مصفوفةُ تاريخٍ** عند التتبّع.
//
//   ولهذا لا يُفحَص النجاحُ هنا بمقارنةٍ واحدة ولا بـ`res.ok` وحدَها: كلُّها
//   قد تصل بترويسة HTTP 200 والخطأُ في الجسم. هذا نفسُ الدرس الذي كلّفنا
//   ٤٤١ مدينةً في Livo — **افحص، لا تفترض** (القاعدة في contract.js).
// ============================================================

const { makeQuote, pickArray } = require('../contract');

const meta = {
  id: 'promo_livraison',
  name: 'Promo Livraison',
  country: 'MA',
  currency: 'MAD',
  version: '1.0',
  // تُعرِّف الشركةُ نفسَها بنطاقها؛ لا أحدَ خارج هذا الملفّ يعرف اسمَ النطاق.
  match: { hosts: ['promo-livraison.ma'] },
};

const capabilities = {
  cities: 'none',    // لا نقطةَ لجلب المدن — المدينةُ تُرسَل نصًّا («ville»)
  pricing: 'none',   // لا حسابَ ثمنٍ عبر API
  tracking: 'api',
  cod: true,
  pickup: true,
};

const ENDPOINT = 'https://promo-livraison.ma/seller/api-parcels';

/** العنوانُ من إعداد التاجر إن غيّرته الشركةُ يومًا، وإلّا الافتراضيّ. */
const _url = (cfg) => {
  const raw = String(cfg?.apiEndpoint || '').trim() || ENDPOINT;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

/**
 * النجاح — الحقلُ الذي يغيّر نوعَه.
 *
 *   `=== 200` وحدَها تُسقط التتبّعَ الناجح (يُعيد `true`).
 *   `=== true` وحدَها تُسقط الإضافةَ الناجحة (تُعيد `200`).
 *   `res.ok` وحدَها تقبل «الرمز منتهٍ» نجاحًا، لأنّ الخطأ يصل في الجسم.
 *
 * فنفحص الأشكالَ الثلاثةَ صراحةً، ونقبل النصَّ `'200'` لأنّ ترميزَ النماذج
 * يُعيد الأعدادَ نصوصًا في بعض التهيئات.
 */
function _ok(data) {
  const s = data?.status;
  return s === true || s === 200 || s === '200';
}

/** رسالةُ الخطأ — `msg` نصٌّ أحيانًا ومصفوفةٌ أحيانًا؛ لا نفترض أيَّهما. */
function _err(data, res) {
  const m = data?.msg;
  if (typeof m === 'string' && m.trim()) return m.trim();
  if (Array.isArray(m) && m.length) {
    const last = m[m.length - 1];
    if (last && typeof last === 'object' && last.status) return String(last.status);
  }
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  return `HTTP ${res?.status || '؟'}`;
}

/** طلبٌ واحدٌ إلى النقطة الوحيدة — بترميز النماذج والرمزِ في الجسم. */
async function _post(fields, cfg) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  body.append('token', cfg?.apiKey || '');
  const res = await fetch(_url(cfg), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function calculateQuote(order, cfg) {
  return makeQuote({
    // إن كان التاجرُ قد حدّد رسمًا في إعداداته احترمناه؛ وإلّا فلا ندّعي رقمًا.
    deliveryFee: order?.deliveryFee != null ? +order.deliveryFee : 0,
    currency: meta.currency,
    estimatedDays: 2,
    supported: true,
    reason: order?.deliveryFee != null ? null : 'Promo Livraison لا تُقدّم حسابَ ثمنٍ عبر API',
  });
}

async function createShipment(order, cfg) {
  try {
    const items = Array.isArray(order?.items) ? order.items : [];

    // وصفُ البضاعة وكمّيّتُها الكلّيّة — حقلان مسطّحان تطلبهما الشركة إلى
    // جانب `products[]` المفصَّلة. نرسل الاثنين كما في وثيقتهم.
    const names = items.map(i => i.productName || i.name || '').filter(Boolean);
    const totalQty = items.reduce((n, i) => n + Math.max(1, +i.quantity || 1), 0);

    const fields = {
      action: 'add',
      name: order?.customerName || '',
      phone: order?.customerPhone || '',
      marchandise: names.join(' · ') || 'Commande',
      marchandise_qty: totalQty || 1,
      ville: order?.cityName || order?.city || '',
      adresse: order?.address || '',
      note: order?.notes || '',
      // `stock = 0` أي أنّ البضاعة عند التاجر لا في مستودع الشركة — وهو
      // حالُ مَن يبيع من بيته، وهو الافتراضيُّ في وثيقتهم.
      stock: 0,
      // ⚠️ `price` عند شركات الدفع-عند-التسليم هو **المبلغُ المُحصَّل من
      // الزبون**، لا رسمُ التوصيل. وضعُ رسم التوصيل هنا خطأُ مالٍ يُحصّل
      // ٢٠ درهمًا بدل ثمن الطلب — وقع حرفيًّا مع Livo في هذا المشروع.
      price: order?.total != null ? +order.total : 0,
    };

    // `products[0][sku]` — ترميزُ الأقواس المتداخلة الذي تنتظره PHP.
    // الـSKU يأتي مُثرًى من المسار (يقرأه من الكتالوج)، ويقع على المُعرِّف
    // إن لم يكن للمنتج SKU — فالشركةُ ترفض عنصرًا بلا مرجع.
    items.forEach((it, i) => {
      fields[`products[${i}][sku]`] = it.sku || it.productId || `ITEM-${i + 1}`;
      fields[`products[${i}][qty]`] = Math.max(1, +it.quantity || 1);
    });

    const { res, data } = await _post(fields, cfg);
    if (!_ok(data)) return { success: false, error: _err(data, res) };

    const tracking = String(data.tracking || '').trim();
    // رقمُ التتبّع هو الأثرُ الوحيد الذي يربط طلبَنا بشحنتهم. بلا رقمٍ لا
    // نُعلن نجاحًا: التاجرُ يرى «تمّ» ولا يجد الشحنةَ عندهم — أسوأُ من فشلٍ صريح.
    if (!tracking) return { success: false, error: 'لم تُرجع Promo Livraison رقمَ تتبّع' };
    return { success: true, shipmentId: tracking, trackingNumber: tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function trackShipment(shipmentId, cfg) {
  try {
    const { res, data } = await _post({ action: 'track', tracking: shipmentId }, cfg);
    if (!_ok(data)) return { success: false, error: _err(data, res) };

    // `msg` هنا **مصفوفةُ تاريخ** لا رسالة. `pickArray` تفحص الشكلَ ولا
    // تفترضه، فلو غلّفتها الشركةُ يومًا في `data` بقي الأمرُ يعمل.
    const raw = pickArray(data, ['msg']);
    const history = raw.map(h => ({
      status: h?.status || '',
      state: h?.etat || '',
      at: h?.time || '',
      // ألوانُ الشركة تُعرَض كما هي — لوحةُ التاجر تُلوّن بها بلا اجتهاد.
      statusColor: h?.colorstatus || '',
      stateColor: h?.coloretat || '',
    })).filter(h => h.status || h.state);

    const last = history[history.length - 1] || null;
    return {
      success: true,
      status: last?.status || '',
      history,
      trackingNumber: String(data.tracking || shipmentId || ''),
      // اسمُ الموزّع ورقمُه — «الغاماسور» الذي يسأل عنه الزبون. تُرجعه هذه
      // الشركةُ ولا تُرجعه أكثرُها، فلا نُضيّعه.
      courier: data.delivery && typeof data.delivery === 'object'
        ? { name: data.delivery.name || '', phone: data.delivery.phone || '' }
        : null,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * فحصُ الاتّصال — لا نقطةَ مخصَّصةً عندهم، فنستعمل تتبّعًا برقمٍ لا وجودَ له.
 * الرمزُ الفاسدُ يُجيب «Token invalide» (401)، والرمزُ السليمُ يُجيب بشيءٍ
 * آخر — وهذا وحدَه يفرّق بين «المفتاح خاطئ» و«الشحنة غيرُ موجودة».
 */
async function testConnection(cfg) {
  try {
    const { res, data } = await _post({ action: 'track', tracking: '__ping__' }, cfg);
    const msg = _err(data, res);
    if (data?.status === 401 || /token/i.test(msg)) {
      return { success: false, error: msg || 'الرمز غيرُ صالحٍ أو منتهٍ' };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { meta, capabilities, createShipment, trackShipment, calculateQuote, testConnection };
