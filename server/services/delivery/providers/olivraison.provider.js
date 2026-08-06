'use strict';

// ============================================================
// Olivraison — https://partners.olivraison.com (OpenAPI 3.0.3)
//
//   تخالف مَن قبلها في ثلاثةِ مواضعَ يجب أن تُعالَج هنا لا في المسارات:
//
//     ① **مصادقةٌ بخطوتين.** لا مفتاحَ يُرسَل مع كلّ طلب: يُبادَل
//        `apiKey`+`secretKey` برمزٍ (JWT) صلاحيتُه سبعةُ أيّام، ثمّ يُرسَل
//        `Authorization: Bearer`. فلو سُجّل الدخولُ عند كلّ نداءٍ لأُحرق
//        سقفُ **٥ طلباتٍ في الثانية** على المصادقة وحدَها. الرمزُ يُخبَّأ.
//     ② **نقطتان للإنشاء.** `/package` تُنشئ الشحنةَ **مؤكَّدةً** فورًا،
//        و`/package/new` تُنشئها `CREATED` قابلةً للتعديل. نستعمل الثانية
//        كما توصي وثيقتُهم — فمن أخطأ في عنوانٍ يُصلحه قبل أن يمرّ.
//     ③ **`price` هو المبلغُ المُحصَّل من الزبون** (COD)، لا رسمُ التوصيل.
//        وضعُ الرسم هنا خطأُ مالٍ يُحصّل ٢٠ درهمًا بدل ثمن الطلب — وقع
//        حرفيًّا مع Livo في هذا المشروع.
//
//   وتُقدّم ما لا تُقدّمه غيرُها: **فحصُ الأرقام المشبوهة** — من رجعت شحناتُه
//   أكثرَ من ثلاثِ مرّاتٍ يُعرَف قبل الشحن لا بعده.
// ============================================================

const { makeQuote, pickArray, pickObject, readCredentials } = require('../contract');

const meta = {
  id: 'olivraison',
  name: 'Olivraison',
  country: 'MA',
  currency: 'MAD',
  version: '1.0',
  match: { hosts: ['olivraison.com', 'partners.olivraison.com'] },
  // **ما تطلبه هذه الشركةُ بالضبط، لا أكثر.** لا اسمَ ولا رابطَ موقعٍ ولا
  // صفحةَ دخول: تلك أشياءُ نعرفها نحن، وسؤالُ التاجر عنها يُوهمه أنّها
  // مطلوبةٌ منه فيملأ ما لا يصل الشركةَ أبدًا.
  credentials: [
    {
      key: 'apiKey', label: 'مفتاح API', required: true, secret: true, maps: 'apiKey',
      placeholder: 'api-xxxxxxxxxxxxxxxxxxx',
      help: 'حسابك في olivraison.com ← الملف الشخصيّ ← «Intégration API» ← «Afficher mes accès»',
    },
    {
      key: 'secretKey', label: 'المفتاح السرّيّ (Secret)', required: true, secret: true,
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      help: 'من نفس الصفحة — يُعرَض بجانب مفتاح API',
    },
  ],
};

const capabilities = {
  cities: 'api',      // GET /cities تُرجع الاسمَ والثمن
  pricing: 'api',     // نفسُ النقطة: `price` لكلّ مدينة
  tracking: 'api',
  cod: true,
  pickup: true,
};

const BASE = 'https://partners.olivraison.com';
const _base = (cfg) => {
  const raw = String(cfg?.apiEndpoint || '').trim().replace(/\/+$/, '') || BASE;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

// ── الرمزُ المخبَّأ ─────────────────────────────────────────────
//
//   صلاحيّتُه سبعةُ أيّام؛ نُخبّئه ستّةً ونصفَ احتياطًا لفارق الساعة. المفتاحُ
//   هو `apiKey` لا مُعرِّفُ الصفّ: تاجرٌ واحدٌ قد يربط نفسَ الحساب مرّتين،
//   ولا معنى لرمزَين. وتُمحى الخبيئةُ عند أوّل ٤٠١ فيُعاد الدخولُ تلقائيًّا.
const _tokens = new Map();
const TOKEN_TTL = 6.5 * 24 * 60 * 60 * 1000;

function _forget(key) { _tokens.delete(key); }

async function _login(cfg) {
  const c = readCredentials(cfg, meta.credentials);
  if (!c.apiKey || !c.secretKey) {
    return { ok: false, error: 'ينقص مفتاح API أو المفتاح السرّيّ' };
  }
  const hit = _tokens.get(c.apiKey);
  if (hit && hit.at + TOKEN_TTL > Date.now()) return { ok: true, token: hit.token, key: c.apiKey };

  const res = await fetch(`${_base(cfg)}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: c.apiKey, secretKey: c.secretKey }),
  });
  const data = await res.json().catch(() => ({}));
  const token = String(data?.token || '').trim();
  if (!res.ok || !token) {
    return { ok: false, error: data?.description || data?.message || `فشل تسجيل الدخول (HTTP ${res.status})` };
  }
  _tokens.set(c.apiKey, { token, at: Date.now() });
  return { ok: true, token, key: c.apiKey };
}

/**
 * نداءٌ مصادَقٌ عليه. يُعيد الدخولَ **مرّةً واحدة** عند ٤٠١ — فالرمزُ قد
 * يُبطَل عندهم قبل انتهاء مدّته، ولا يجوز أن تفشل شحنةٌ لهذا السبب وحدَه.
 */
async function _call(cfg, path, { method = 'GET', body } = {}, retried = false) {
  const auth = await _login(cfg);
  if (!auth.ok) return { ok: false, error: auth.error, data: {} };
  const res = await fetch(`${_base(cfg)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401 && !retried) {
    _forget(auth.key);
    return _call(cfg, path, { method, body }, true);
  }
  const data = await res.json().catch(() => ({}));
  // شكلُ الخطأ عندهم مُعلَنٌ في الوثيقة: `{code, description}`.
  if (!res.ok) {
    return { ok: false, error: data?.description || data?.message || `HTTP ${res.status}`, data };
  }
  return { ok: true, data };
}

// ── إنشاءُ الشحنة ─────────────────────────────────────────────
async function createShipment(order, cfg) {
  try {
    const items = Array.isArray(order?.items) ? order.items : [];
    const names = items.map(i => i.productName || i.name || '').filter(Boolean);

    const body = {
      // `description` مطلوبٌ بثلاثة أحرفٍ على الأقلّ في مخطّطهم.
      description: (names.join(' · ') || 'Commande').slice(0, 200),
      name: order?.customerName || '',
      // ⚠️ المبلغُ المُحصَّل من الزبون — لا رسمُ التوصيل.
      price: order?.total != null ? +order.total : 0,
      comment: order?.notes || '',
      orderId: order?.id != null ? String(order.id) : '',
      partnerTrackingID: order?.id != null ? String(order.id) : '',
      destination: {
        name: order?.customerName || '',
        phone: order?.customerPhone || '',
        city: order?.cityName || order?.city || '',
        streetAddress: order?.address || '',
      },
    };
    // `fullfillment` لا يُرسَل إلّا مع `inventory:true` (بضاعةٌ في مستودعهم).
    // ومن يبيع من بيته ليست بضاعتُه عندهم، فإرسالُ مراجعَ لا يعرفونها يُرفَض.
    if (order?.fromWarehouse === true && items.length) {
      body.inventory = true;
      body.fullfillment = items.map((it, i) => ({
        id: String(it.providerProductId || it.sku || it.productId || ''),
        name: it.productName || it.name || `عنصر ${i + 1}`,
        quantity: Math.max(1, +it.quantity || 1),
        reference: String(it.sku || it.productId || ''),
      }));
    }

    // `/package/new` لا `/package`: تُنشأ `CREATED` فتُصحَّح قبل التأكيد.
    const r = await _call(cfg, '/package/new', { method: 'POST', body });
    if (!r.ok) return { success: false, error: r.error };

    const obj = pickObject(r.data) || r.data || {};
    const tracking = String(obj.trackingID || obj.trackingId || '').trim();
    // بلا رقمٍ لا نُعلن نجاحًا: التاجرُ يرى «تمّ» ولا يجد الشحنةَ عندهم.
    if (!tracking) return { success: false, error: 'لم تُرجع Olivraison رقمَ تتبّع' };
    return { success: true, shipmentId: tracking, trackingNumber: tracking };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── التتبّع ───────────────────────────────────────────────────
async function trackShipment(shipmentId, cfg) {
  try {
    const r = await _call(cfg, `/package/${encodeURIComponent(shipmentId)}`);
    if (!r.ok) return { success: false, error: r.error };

    const p = pickObject(r.data) || r.data || {};
    const history = pickArray(p, ['history']).map(h => ({
      status: String(h?.status || ''),
      at: h?.updateAt || '',
      note: String(h?.msg || ''),
    })).filter(h => h.status);

    return {
      success: true,
      status: String(p.status || history[history.length - 1]?.status || ''),
      history,
      trackingNumber: String(p.trackingID || shipmentId || ''),
      // اسمُ الموزّع ورقمُه — «الغاماسور» الذي يسأل عنه الزبون.
      courier: p.transport && typeof p.transport === 'object'
        ? { name: p.transport.currentDriverName || '', phone: p.transport.currentDriverPhone || '' }
        : null,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── المدنُ والأثمان — نقطةٌ واحدةٌ تُعطي الاثنين ────────────────
async function getCities(cfg) {
  try {
    const r = await _call(cfg, '/cities');
    if (!r.ok) return { success: false, error: r.error };
    const cities = pickArray(r.data).map(c => ({
      // لا مُعرِّفَ لديهم — الاسمُ هو المفتاح، وهو ما يُرسَل في `destination.city`.
      id: String(c?.name || ''),
      name: String(c?.name || ''),
      price: +c?.price || 0,
      deliverable: true,
    })).filter(c => c.name);
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
    tariffs: r.cities.map(c => ({ city: c.name, deliveryFee: c.price, currency: meta.currency })),
  };
}

async function calculateQuote(order, cfg) {
  const wanted = String(order?.cityName || order?.city || '').trim().toLowerCase();
  const r = await getCities(cfg);
  if (!r.success) {
    return makeQuote({ currency: meta.currency, estimatedDays: 1, supported: true, reason: r.error });
  }
  const hit = r.cities.find(c => c.name.trim().toLowerCase() === wanted);
  if (!hit) {
    return makeQuote({
      currency: meta.currency, supported: false,
      reason: wanted ? `Olivraison لا تُوصّل إلى «${order?.cityName || order?.city}»` : 'لم تُذكر المدينة',
    });
  }
  return makeQuote({ deliveryFee: hit.price, currency: meta.currency, estimatedDays: 1, supported: true });
}

/**
 * **فحصُ الأرقام المشبوهة** — ما لا تُقدّمه شركةٌ أخرى في الكتالوج.
 *
 *   من رجعت شحناتُه أكثرَ من ثلاثِ مرّاتٍ يُعرَف **قبل** الشحن. والرفضُ
 *   يكلّف التاجرَ رسمَ ذهابٍ وإياب، فمعرفتُه مسبقًا مالٌ لا معلومة.
 *   ليست في العقد بعد — تُستدعى صراحةً ممّن يعرفها، ولا يُكسَر مَن لا يملكها.
 */
async function checkDestination(phone, cfg) {
  try {
    const r = await _call(cfg, `/package/blacklisted-destinations/${encodeURIComponent(phone)}`);
    if (!r.ok) return { success: false, error: r.error };
    const d = pickObject(r.data) || r.data || {};
    return {
      success: true,
      phone: String(d.phone || phone),
      returned: +d.count || 0,
      delivered: +d.deliveredCount || 0,
      risky: d.blacklisted === true,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/** فحصُ الاتّصال: تسجيلُ الدخول وحدَه يُثبت أنّ المفتاحين صحيحان. */
async function testConnection(cfg) {
  try {
    const c = readCredentials(cfg, meta.credentials);
    _forget(c.apiKey);                      // لا نُثبت صحّةَ رمزٍ قديمٍ مخبَّأ
    const auth = await _login(cfg);
    return auth.ok ? { success: true } : { success: false, error: auth.error };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = {
  meta, capabilities,
  createShipment, trackShipment, getCities, getTariffs, calculateQuote, testConnection,
  checkDestination,
};
