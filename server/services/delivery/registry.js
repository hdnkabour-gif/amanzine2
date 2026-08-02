'use strict';

// ============================================================
// سجلُّ المزوّدين — اكتشافٌ تلقائيٌّ بمسح المجلّد.
//
//   لا خريطةَ ثابتةً من نوع { livo, amana } في الكود: كلُّ ملفٍّ ينتهي بـ
//   `.provider.js` داخل providers/ يُحمَّل ويُسجَّل بـ meta.id. إضافةُ شركةٍ
//   غدًا = إسقاطُ ملفٍّ في المجلّد، بلا لمسِ المسارات ولا الواجهة.
//
//   المزوّدُ المخالفُ للعقد يُرفَض عند التحميل مع سببٍ في السجلّ — أفضلُ من
//   انفجارٍ صامتٍ وقتَ إنشاء شحنةٍ حقيقيّة لزبون.
// ============================================================

const fs = require('fs');
const path = require('path');
const { validateProvider, normalizeCapabilities } = require('./contract');

const PROVIDERS_DIR = path.join(__dirname, 'providers');
const ADAPTERS_DIR = path.join(__dirname, 'adapters');

/** الشركات. @type {Map<string, any>} */
const _registry = new Map();
/** وسائلُ الاتصال. @type {Map<string, any>} */
const _adapters = new Map();
/** @type {Array<{file:string, problems:string[]}>} */
const _rejected = [];
let _loaded = false;

function _scan(dir, suffix, target, label) {
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith(suffix));
  } catch (e) {
    console.warn(`[delivery/registry] تعذّر قراءة مجلّد ${label}:`, e.message);
    return;
  }
  for (const file of files.sort()) {
    let mod;
    try {
      mod = require(path.join(dir, file));
    } catch (e) {
      _rejected.push({ file, problems: [`فشل التحميل: ${e.message}`] });
      console.warn(`[delivery/registry] ✗ ${file}: ${e.message}`);
      continue;
    }
    // العقدُ واحدٌ للاثنين: كلاهما يُنشئ شحنةً ويُرجع النتيجةَ الموحَّدة.
    const problems = validateProvider(mod);
    if (problems.length) {
      _rejected.push({ file, problems });
      console.warn(`[delivery/registry] ✗ ${file}: ${problems.join(' · ')}`);
      continue;
    }
    const id = mod.meta.id.trim().toLowerCase();
    if (target.has(id)) {
      _rejected.push({ file, problems: [`مُعرِّفٌ مكرّر: ${id}`] });
      console.warn(`[delivery/registry] ✗ ${file}: مُعرِّفٌ مكرّر "${id}"`);
      continue;
    }
    mod.capabilities = normalizeCapabilities(mod.capabilities);
    target.set(id, mod);
  }
}

function _loadOnce() {
  if (_loaded) return;
  _loaded = true;
  _scan(PROVIDERS_DIR, '.provider.js', _registry, 'المزوّدين');
  _scan(ADAPTERS_DIR, '.adapter.js', _adapters, 'الوسائل');
  console.log(
    `[delivery/registry] ${_registry.size} مزوّد (${[..._registry.keys()].join(', ') || '—'})`
    + ` · ${_adapters.size} وسيلة (${[..._adapters.keys()].join(', ') || '—'})`
  );
}

/** مزوّدٌ بمُعرِّفه، أو null. */
function get(id) {
  _loadOnce();
  if (!id) return null;
  return _registry.get(String(id).trim().toLowerCase()) || null;
}

/** وسيلةُ اتصالٍ بمُعرِّفها، أو null. */
function getAdapter(id) {
  _loadOnce();
  if (!id) return null;
  return _adapters.get(String(id).trim().toLowerCase()) || null;
}

/** كلُّ المزوّدين المسجَّلين — للوحة الإدارة. */
function list() {
  _loadOnce();
  return [..._registry.values()].map(p => ({ ...p.meta, capabilities: p.capabilities }));
}

/** كلُّ وسائل الاتصال المسجَّلة. */
function listAdapters() {
  _loadOnce();
  return [..._adapters.values()].map(a => ({ ...a.meta, capabilities: a.capabilities }));
}

/**
 * يختار مَن يُنفّذ الشحنةَ لصفٍّ من `delivery_providers`.
 *
 * الشركةُ أوّلًا: إن وُجد مزوّدٌ باسم api_type فهو الأدرى بشركته. وإلّا فوسيلةُ
 * اتصالٍ عامّة — ويبقى **اسمُ الشركة كما أدخله التاجر**، لأنّ «Chronodiali عبر
 * رابط» شركةٌ لها اسم، لا «شحنة لدى Webhook».
 *
 * @param {{apiType?:string, webhookUrl?:string, name?:string}} row
 * @returns {{handler:any, kind:'provider'|'adapter', label:string}|null}
 */
function resolve(row) {
  _loadOnce();
  if (!row) return null;

  const provider = get(row.apiType);
  if (provider) return { handler: provider, kind: 'provider', label: provider.meta.name };

  const adapter = getAdapter(row.apiType) || (row.webhookUrl ? getAdapter('webhook') : null);
  if (adapter) {
    return { handler: adapter, kind: 'adapter', label: `${row.name || 'شركة'} · ${adapter.meta.name}` };
  }
  return null;
}

/** نطاقُ رابطٍ بلا بروتوكولٍ ولا مسار، أو '' إن لم يكن رابطًا. */
function _host(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  try { return new URL(s.includes('://') ? s : `https://${s}`).hostname.toLowerCase(); }
  catch { return ''; }
}

/**
 * يستدلُّ على المزوّد من نطاقات الصفّ حين يكون `api_type` فارغًا.
 *
 *   الصفُّ الذي حُفظ باسمٍ مكتوبٍ يدويًّا («Livo») بلا `api_type` كان يسقط
 *   إلى المحاكاة صامتًا: لا مدنَ ولا تتبّعَ ولا شحنةً حقيقيّة، والتاجرُ يرى
 *   الشركةَ «مفعّلة». الاستدلالُ هنا لا يعرف اسمَ شركةٍ واحدة: كلُّ مزوّدٍ
 *   يُعلن نطاقاتِه في `meta.match.hosts`، والمعرفةُ تبقى في ملفّه.
 *
 * @param {{apiType?:string, apiEndpoint?:string, websiteUrl?:string}} row
 * @returns {string|null} مُعرِّفُ المزوّد، أو null إن لم يكن الاستدلالُ قاطعًا
 */
function suggest(row) {
  _loadOnce();
  if (!row) return null;
  const hosts = [_host(row.apiEndpoint), _host(row.websiteUrl)].filter(Boolean);
  if (!hosts.length) return null;

  const hits = new Set();
  for (const p of _registry.values()) {
    for (const known of p.meta.match?.hosts || []) {
      const k = String(known).trim().toLowerCase();
      if (!k) continue;
      // مطابقةُ لاحقةٍ على حدود النقطة: `rest.livo.ma` تطابق `livo.ma`،
      // و`notlivo.ma` لا تطابقها.
      if (hosts.some(h => h === k || h.endsWith(`.${k}`))) hits.add(p.meta.id);
    }
  }
  // نطاقٌ يدّعيه مزوّدان ⇒ الاستدلالُ غيرُ قاطع، فلا نختار نيابةً عن التاجر.
  return hits.size === 1 ? [...hits][0] : null;
}

/** المزوّدون المرفوضون وأسبابُهم — تشخيصٌ لا يُخفى. */
function rejected() {
  _loadOnce();
  return [..._rejected];
}

/** لإعادة المسح في الاختبارات. */
function _reset() {
  _registry.clear();
  _adapters.clear();
  _rejected.length = 0;
  _loaded = false;
}

module.exports = {
  get, getAdapter, list, listAdapters, resolve, suggest, rejected, _reset,
  PROVIDERS_DIR, ADAPTERS_DIR,
};
