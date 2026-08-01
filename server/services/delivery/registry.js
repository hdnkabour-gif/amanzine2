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
const SUFFIX = '.provider.js';

/** @type {Map<string, any>} */
const _registry = new Map();
/** @type {Array<{file:string, problems:string[]}>} */
const _rejected = [];
let _loaded = false;

function _loadOnce() {
  if (_loaded) return;
  _loaded = true;

  let files = [];
  try {
    files = fs.readdirSync(PROVIDERS_DIR).filter(f => f.endsWith(SUFFIX));
  } catch (e) {
    console.warn('[delivery/registry] تعذّر قراءة مجلّد المزوّدين:', e.message);
    return;
  }

  for (const file of files.sort()) {
    const full = path.join(PROVIDERS_DIR, file);
    let mod;
    try {
      mod = require(full);
    } catch (e) {
      _rejected.push({ file, problems: [`فشل التحميل: ${e.message}`] });
      console.warn(`[delivery/registry] ✗ ${file}: ${e.message}`);
      continue;
    }
    const problems = validateProvider(mod);
    if (problems.length) {
      _rejected.push({ file, problems });
      console.warn(`[delivery/registry] ✗ ${file}: ${problems.join(' · ')}`);
      continue;
    }
    const id = mod.meta.id.trim().toLowerCase();
    if (_registry.has(id)) {
      _rejected.push({ file, problems: [`مُعرِّفٌ مكرّر: ${id}`] });
      console.warn(`[delivery/registry] ✗ ${file}: مُعرِّفٌ مكرّر "${id}"`);
      continue;
    }
    mod.capabilities = normalizeCapabilities(mod.capabilities);
    _registry.set(id, mod);
  }

  console.log(`[delivery/registry] حُمِّل ${_registry.size} مزوّدًا: ${[..._registry.keys()].join(', ') || '—'}`);
}

/** مزوّدٌ بمُعرِّفه، أو null. */
function get(id) {
  _loadOnce();
  if (!id) return null;
  return _registry.get(String(id).trim().toLowerCase()) || null;
}

/** كلُّ المزوّدين المسجَّلين — للوحة الإدارة. */
function list() {
  _loadOnce();
  return [..._registry.values()].map(p => ({ ...p.meta, capabilities: p.capabilities }));
}

/**
 * يختار المزوّدَ المناسبَ لصفٍّ من `delivery_providers`.
 * الترتيب: api_type صراحةً ⇒ ثمّ webhook عامٌّ إن كان مُهيّأً ⇒ ثمّ لا شيء
 * (فيسقط المتصل إلى المحاكاة). لا اسمَ شركةٍ مكتوبٌ هنا.
 * @param {{apiType?:string, webhookUrl?:string}} row
 */
function resolve(row) {
  _loadOnce();
  if (!row) return null;
  const byType = get(row.apiType);
  if (byType) return byType;
  if (row.webhookUrl) return get('webhook');
  return null;
}

/** المزوّدون المرفوضون وأسبابُهم — تشخيصٌ لا يُخفى. */
function rejected() {
  _loadOnce();
  return [..._rejected];
}

/** لإعادة المسح في الاختبارات. */
function _reset() {
  _registry.clear();
  _rejected.length = 0;
  _loaded = false;
}

module.exports = { get, list, resolve, rejected, _reset, PROVIDERS_DIR };
