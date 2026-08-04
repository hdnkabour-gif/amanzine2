'use strict';

// ============================================================
// عقدُ مزوّدِ التوصيل — الشكلُ الذي يلتزم به كلُّ مزوّد.
//
//   لا يوجد API موحَّدٌ بين شركات التوصيل، ولا محاولةَ لتوحيده هنا. الموحَّدُ
//   هو **النتيجة**: مهما اختلفت الشركةُ في أسماء الحقول والمصادقة وطريقةِ
//   حساب الثمن، تخرج من هذا العقد كائناتٌ واحدة. فبقيّةُ النظام (الطلبات،
//   الشحن، الواجهة) لا تعرف «Livo» ولا «Amana» — تعرف `DeliveryQuote` فقط.
//
//   كلُّ مزوّدٍ ملفٌّ واحدٌ في providers/ يُصدِّر: meta و capabilities ودوالَّ
//   العقد. الإضافةُ = ملفٌّ جديد؛ لا تعديلَ في المسارات ولا في الواجهة.
// ============================================================

/**
 * @typedef {Object} ProviderMeta
 * @property {string} id       مُعرِّفٌ فريدٌ يطابق `delivery_providers.api_type`
 * @property {string} name     الاسمُ المعروض
 * @property {string} [country]
 * @property {string} [currency]
 * @property {string} [version]
 * @property {{hosts?: string[]}} [match]  نطاقاتُ الشركة — تُعرِّف نفسَها بنفسها
 */

/**
 * القدرات — ليست true/false بل **كيف** تعمل الميزة، لأنّ «يدعم المدن» لا
 * تكفي: الفرقُ بين جلبها من API وبين جدولٍ محلّيٍّ يغيّر سلوكَ الواجهة.
 * @typedef {Object} Capabilities
 * @property {'api'|'static'|'none'} cities
 * @property {'api'|'rules'|'none'}  pricing
 * @property {'api'|'webhook'|'none'} tracking
 * @property {boolean} cod
 * @property {boolean} pickup
 */

/**
 * نتيجةُ التسعير الموحَّدة — أيًّا كان مصدرُها (API أو قواعدُ محلّيّة).
 * @typedef {Object} DeliveryQuote
 * @property {number}  deliveryFee
 * @property {number}  codFee
 * @property {string}  currency
 * @property {number}  estimatedDays
 * @property {boolean} supported     هل تخدم الشركةُ هذه الوجهة أصلًا؟
 * @property {string|null} reason    سببُ عدم الدعم إن وُجد
 */

/**
 * @typedef {Object} ShipmentResult
 * @property {boolean} success
 * @property {string}  [shipmentId]      مُعرِّفُ الشحنة عند الشركة
 * @property {string}  [trackingNumber]
 * @property {string}  [error]
 */

/**
 * @typedef {Object} TrackingResult
 * @property {boolean} success
 * @property {string}  [status]
 * @property {Array}   [history]
 * @property {string}  [trackingNumber]
 * @property {string}  [error]
 */

/**
 * وصفُ حقلِ اعتماد. كلُّ شركةٍ تطلب شيئًا مختلفًا: هذه رمزًا واحدًا، وتلك
 * مُعرِّفَ حسابٍ **مع** مفتاح، وثالثةٌ اسمَ مستخدمٍ وكلمةَ سرّ.
 *
 *   وكان الحلُّ السابق حقلًا واحدًا اسمه «مفتاح API» يُعرَض للجميع. فمن
 *   احتاج مُعرِّفًا ثانيًا لم يجد أين يضعه، ومن لم يحتج المفتاحَ رأى حقلًا
 *   لا معنى له. والأسوأ: التاجرُ يملأ ما يظنّه صحيحًا ثمّ يُقال له «الشركة
 *   رفضت المفتاح» بلا بيانِ أيِّ حقلٍ نقص.
 *
 *   الآن يُعلن كلُّ مزوّدٍ حقولَه، فتبني الواجهةُ النموذجَ منها بلا أن تعرف
 *   اسمَ شركةٍ واحدة — وإضافةُ شركةٍ تطلب ثلاثةَ حقولٍ لا تُعدّل الواجهة.
 *
 * @typedef {Object} CredentialField
 * @property {string}  key       مفتاحُ التخزين (لاتينيّ، بلا مسافات)
 * @property {string}  label     كما يُعرَض للتاجر
 * @property {boolean} [required]
 * @property {boolean} [secret]  يُخفى في الواجهة ولا يظهر في السجلّات
 * @property {string}  [help]    أين يجده التاجر عند الشركة
 * @property {string}  [placeholder]
 * @property {'apiKey'|'apiEndpoint'|'username'|'password'} [maps]
 *           يُخزَّن في عمودٍ قياسيٍّ بدل `fields` — للحقول التي لها عمودٌ أصلًا.
 */

/** الدوالُّ التي يجب أن يُصدِّرها كلُّ مزوّد. */
const REQUIRED_METHODS = ['createShipment'];

/**
 * دوالٌّ اختياريّة — غيابُها يعني «هذه القدرة غيرُ مدعومة»، لا عطبًا.
 *
 *   `getTariffs` أُضيفت لأنّ «جلبَ كلِّ ما تُقدّمه الشركة» كان يعني المدنَ
 *   وحدَها. وبعضُ الشركات تنشر جدولَ أثمانها عبر API، وثمنُ التوصيل هو أوّلُ
 *   ما يسأل عنه الزبون. مَن لا يُقدّمه لا يُصدّرها، وتبقى `pricing:'rules'`.
 */
const OPTIONAL_METHODS = ['trackShipment', 'getCities', 'getTariffs', 'calculateQuote', 'testConnection'];

/** الأعمدةُ القياسيّة التي يجوز لحقلِ اعتمادٍ أن يُخزَّن فيها. */
const CREDENTIAL_COLUMNS = ['apiKey', 'apiEndpoint', 'username', 'password'];

const DEFAULT_CAPABILITIES = {
  cities: 'none', pricing: 'none', tracking: 'none', cod: false, pickup: false,
};

/**
 * يتحقّق من مطابقة وحدةٍ للعقد. يُعيد قائمةَ المشاكل (فارغةٌ = مطابِقة).
 * نرفض المزوّدَ المعطوب عند التحميل بدل أن ينفجر وقتَ إنشاء شحنةٍ حقيقيّة.
 * @param {any} mod
 * @returns {string[]}
 */
function validateProvider(mod) {
  const problems = [];
  if (!mod || typeof mod !== 'object') return ['الوحدة ليست كائنًا'];
  if (!mod.meta || typeof mod.meta.id !== 'string' || !mod.meta.id.trim()) {
    problems.push('meta.id مفقود أو ليس نصًّا');
  }
  if (!mod.meta || typeof mod.meta.name !== 'string' || !mod.meta.name.trim()) {
    problems.push('meta.name مفقود');
  }
  // `match.hosts` اختياريّ، لكنّه إن وُجد بشكلٍ خاطئٍ صار الاستدلالُ صامتًا
  // ولا يُكتشف إلّا حين لا يُعرَف مزوّدُ صفٍّ قديم. نرفضه هنا لا هناك.
  if (mod.meta && mod.meta.match !== undefined) {
    const h = mod.meta.match?.hosts;
    if (!Array.isArray(h) || h.some(x => typeof x !== 'string' || !x.trim())) {
      problems.push('meta.match.hosts يجب أن يكون مصفوفةَ نطاقاتٍ نصّيّة');
    }
  }
  // حقولُ الاعتماد اختياريّة، لكنّها إن وُجدت مشوّهةً بنت الواجهةُ نموذجًا
  // معطوبًا — والتاجرُ يملأ حقلًا لا يصل الشركةَ ولا يعرف لماذا فشل الربط.
  if (mod.meta && mod.meta.credentials !== undefined) {
    const list = mod.meta.credentials;
    if (!Array.isArray(list)) {
      problems.push('meta.credentials يجب أن يكون مصفوفة');
    } else {
      const seen = new Set();
      list.forEach((f, i) => {
        if (!f || typeof f !== 'object') { problems.push(`credentials[${i}] ليس كائنًا`); return; }
        if (typeof f.key !== 'string' || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key)) {
          problems.push(`credentials[${i}].key غيرُ صالح`);
        } else if (seen.has(f.key)) {
          problems.push(`credentials[${i}].key مكرّر: ${f.key}`);
        } else seen.add(f.key);
        if (typeof f.label !== 'string' || !f.label.trim()) problems.push(`credentials[${i}].label مفقود`);
        if (f.maps !== undefined && !CREDENTIAL_COLUMNS.includes(f.maps)) {
          problems.push(`credentials[${i}].maps غيرُ معروف: ${f.maps}`);
        }
      });
    }
  }
  for (const m of REQUIRED_METHODS) {
    if (typeof mod[m] !== 'function') problems.push(`الدالّة المطلوبة ${m}() مفقودة`);
  }
  for (const m of OPTIONAL_METHODS) {
    if (mod[m] !== undefined && typeof mod[m] !== 'function') {
      problems.push(`${m} موجودٌ لكنّه ليس دالّة`);
    }
  }
  return problems;
}

/** يملأ القدراتِ الناقصة بالافتراضيّ حتى لا يفحص المتصل وجودَ كلّ مفتاح. */
function normalizeCapabilities(caps) {
  return { ...DEFAULT_CAPABILITIES, ...(caps || {}) };
}

/**
 * يستخرج **مصفوفةً** من ردٍّ لا نتحكّم في شكله.
 *
 *   عطبٌ حقيقيٌّ كلّفنا ٤٤١ مدينة: Livo تُرجع `{success, data:{data:[…]}}`
 *   بينما توقّع الكودُ `{success, data:[…]}`. و`|| []` لم تحمِ، لأنّ الكائنَ
 *   قيمةٌ صادقة فتُستدعى `.map` عليه وترمي — فيصير الخطأُ «فشلت القراءة»
 *   وكأنّه عطبُ شبكةٍ أو مفتاح، ولا أحدَ يشكّ في التحليل.
 *
 *   لا مزوّدَ بعد اليوم يفترض شكلًا. القاعدة: **افحص، لا تفترض.**
 *
 * @param {any} payload الردُّ الخام
 * @param {string[]} [paths] مساراتٌ إضافيّةٌ تُجرَّب قبل الافتراضيّة
 * @returns {any[]} مصفوفةٌ دائمًا — فارغةٌ إن لم تُوجد
 */
function pickArray(payload, paths = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  // الأشكالُ الشائعةُ لدى شركات التوصيل، بالترتيب.
  const candidates = [...paths, 'data.data', 'data', 'items', 'results', 'list', 'cities', 'records'];
  for (const path of candidates) {
    let cur = payload;
    for (const key of path.split('.')) {
      if (!cur || typeof cur !== 'object') { cur = undefined; break; }
      cur = cur[key];
    }
    if (Array.isArray(cur)) return cur;
  }
  return [];
}

/**
 * يستخرج **كائنًا** من ردٍّ متداخل — نفسُ المبدأ لشحنةٍ أو تتبّع.
 * @returns {object|null}
 */
function pickObject(payload, paths = []) {
  if (!payload || typeof payload !== 'object') return null;
  for (const path of [...paths, 'data.data', 'data', 'result', 'order', 'shipment']) {
    let cur = payload;
    for (const key of path.split('.')) {
      if (!cur || typeof cur !== 'object') { cur = undefined; break; }
      cur = cur[key];
    }
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) return cur;
  }
  return null;
}

/** بناءُ عرضِ سعرٍ موحَّدٍ من قيمٍ جزئيّة. */
function makeQuote(partial = {}) {
  return {
    deliveryFee:   Math.max(0, +partial.deliveryFee || 0),
    codFee:        Math.max(0, +partial.codFee || 0),
    currency:      partial.currency || 'MAD',
    estimatedDays: +partial.estimatedDays || 0,
    supported:     partial.supported !== false,
    reason:        partial.reason || null,
  };
}

/**
 * يقرأ قيمَ الاعتماد لمزوّدٍ من صفّ الإعداد — **مصدرٌ واحدٌ للقراءة**.
 *
 *   القيمُ تسكن مكانَين: أعمدةٌ قياسيّةٌ قديمة (`api_key`, `api_endpoint`…)
 *   وحقيبةُ `fields` العامّة. ولو قرأ كلُّ مزوّدٍ بنفسه لتفرّقت القاعدة، وعاد
 *   كلُّ ملفٍّ يعرف أين تُخزَّن الأشياء — وهو ما تتجنّبه هذه الطبقةُ أصلًا.
 *
 *   المزوّدُ يقول «أريد `token` و`sellerId`»، ويأخذهما. لا يعرف أنّ الأوّلَ
 *   في عمودٍ والثاني في JSONB، ولا يتغيّر إن انتقلا غدًا.
 *
 * @param {object} cfg صفُّ `delivery_providers` كما تُعيده القاعدة
 * @param {CredentialField[]} [spec] وصفُ الحقول (meta.credentials)
 * @returns {Record<string,string>}
 */
function readCredentials(cfg, spec) {
  const out = {};
  const bag = (cfg && typeof cfg.fields === 'object' && cfg.fields) || {};
  for (const f of Array.isArray(spec) ? spec : []) {
    if (!f || typeof f.key !== 'string') continue;
    // الحقيبةُ أوّلًا: ما كتبه التاجرُ صراحةً لهذا الحقل يغلب العمودَ القديم،
    // وإلّا لظلّ مفتاحٌ قديمٌ منسيٌّ في `api_key` يغلب ما أدخله اليوم.
    const v = bag[f.key] != null && String(bag[f.key]).trim() !== ''
      ? bag[f.key]
      : (f.maps ? cfg?.[f.maps] : undefined);
    out[f.key] = v == null ? '' : String(v);
  }
  return out;
}

/**
 * الحقولُ المطلوبةُ الناقصة — لتقول الواجهةُ **أيَّ** حقلٍ ينقص بالاسم،
 * بدل «رفضت الشركةُ المفتاح» التي لا تدلّ على شيء.
 * @returns {string[]} تسمياتُ الحقول الناقصة
 */
function missingCredentials(cfg, spec) {
  const vals = readCredentials(cfg, spec);
  return (Array.isArray(spec) ? spec : [])
    .filter(f => f.required && !String(vals[f.key] || '').trim())
    .map(f => f.label);
}

module.exports = {
  REQUIRED_METHODS, OPTIONAL_METHODS, DEFAULT_CAPABILITIES, CREDENTIAL_COLUMNS,
  validateProvider, normalizeCapabilities, makeQuote, pickArray, pickObject,
  readCredentials, missingCredentials,
};
