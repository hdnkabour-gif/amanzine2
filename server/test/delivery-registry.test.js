'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../services/delivery/registry');
const { validateProvider, normalizeCapabilities, makeQuote } = require('../services/delivery/contract');

// ============================================================
// سجلُّ المزوّدين والعقد — سقّاطةٌ تحرس مبدأً معماريًّا:
//   لا جزءَ من النظام يعرف اسمَ شركةِ توصيل، عدا ملفِّ المزوّد نفسِه.
//   وإضافةُ شركةٍ = إسقاطُ ملفٍّ في المجلّد، لا تعديلُ كود.
// ============================================================

test('السجلّ يكتشف المزوّدين بمسح المجلّد بلا خريطةٍ ثابتة', () => {
  const ids = registry.list().map(p => p.id).sort();
  for (const expected of ['amana', 'jibli', 'livo']) {
    assert.ok(ids.includes(expected), `${expected} يجب أن يُكتشف تلقائيًّا`);
  }
  // webhook وسيلةُ اتصالٍ لا شركة ⇒ خارج قائمة المزوّدين
  assert.ok(!ids.includes('webhook'), 'webhook ليس شركةَ توصيل');
});

test('الوسائل تُكتشف في مجلّدها المستقلّ', () => {
  const ids = registry.listAdapters().map(a => a.id).sort();
  assert.deepEqual(ids, ['url-recipe', 'webhook']);
  for (const a of registry.listAdapters()) {
    assert.equal(a.kind, 'adapter', `${a.id} يجب أن يُعلن أنّه وسيلة`);
  }
});

test('لا مزوّدَ مرفوضًا — كلُّ ملفٍّ في المجلّد يطابق العقد', () => {
  assert.deepEqual(registry.rejected(), []);
});

test('كلُّ مزوّدٍ مسجَّلٍ يُعلن قدراتِه كاملةً', () => {
  for (const p of registry.list()) {
    for (const key of ['cities', 'pricing', 'tracking', 'cod', 'pickup']) {
      assert.notEqual(p.capabilities[key], undefined, `${p.id}: القدرة ${key} مفقودة`);
    }
  }
});

test('resolve يختار الشركةَ بـ api_type بلا حساسيّةٍ لحالة الأحرف', () => {
  for (const t of ['livo', 'LIVO', ' Livo ']) {
    const r = registry.resolve({ apiType: t });
    assert.equal(r?.handler.meta.id, 'livo');
    assert.equal(r?.kind, 'provider');
  }
});

test('شركةٌ بلا مزوّد تُنفَّذ عبر وسيلةٍ وتحتفظ باسمها', () => {
  const r = registry.resolve({ apiType: 'chronodiali', webhookUrl: 'https://x.io/h', name: 'Chronodiali' });
  assert.equal(r?.handler.meta.id, 'webhook');
  assert.equal(r?.kind, 'adapter');
  // جوهرُ الفصل: الاسمُ المعروض اسمُ الشركة لا اسمُ الوسيلة.
  assert.match(r.label, /Chronodiali/);
});

test('وصفةُ URL تُحَلّ كوسيلةٍ مسجَّلة لا كمسارٍ خارج السجلّ', () => {
  const r = registry.resolve({ apiType: 'url-recipe', name: 'شركة محلّيّة' });
  assert.equal(r?.handler.meta.id, 'url-recipe');
  assert.equal(r?.kind, 'adapter');
});

test('بلا نوعٍ معروفٍ ولا رابط ⇒ لا شيء (محاكاة، لا انهيار)', () => {
  assert.equal(registry.resolve({ apiType: 'chronodiali' }), null);
  assert.equal(registry.resolve(null), null);
});

test('العقد يرفض وحدةً ناقصةً بسببٍ مفهوم', () => {
  assert.ok(validateProvider(null).length);
  assert.ok(validateProvider({}).length);
  assert.ok(validateProvider({ meta: { id: 'x', name: 'X' } }).some(p => /createShipment/.test(p)));
  assert.deepEqual(
    validateProvider({ meta: { id: 'x', name: 'X' }, createShipment: async () => ({}) }),
    []
  );
});

test('makeQuote يُطبّع القيمَ الشاذّة ولا يسمح بثمنٍ سالب', () => {
  const q = makeQuote({ deliveryFee: -5, codFee: 'abc' });
  assert.equal(q.deliveryFee, 0);
  assert.equal(q.codFee, 0);
  assert.equal(q.currency, 'MAD');
  assert.equal(q.supported, true);
});

test('normalizeCapabilities يملأ الناقصَ بالافتراضيّ', () => {
  const c = normalizeCapabilities({ cities: 'api' });
  assert.equal(c.cities, 'api');
  assert.equal(c.pricing, 'none');
  assert.equal(c.cod, false);
});

test('تسعيرُ Livo قاعدةٌ محلّيّةٌ محبوسةٌ داخل المزوّد', async () => {
  const livo = registry.get('livo');
  const casa = await livo.calculateQuote({ city: 'الدار البيضاء' }, {});
  const other = await livo.calculateQuote({ city: 'طنجة' }, {});
  assert.equal(casa.deliveryFee, 20);
  assert.equal(other.deliveryFee, 35);
  assert.equal(casa.currency, 'MAD');
});

test('مَن لا مصدرَ ثمنٍ لديه يُعلن عدمَ الدعم بدل اختلاق رقم', async () => {
  const all = [registry.get('amana'), registry.get('jibli'),
               registry.getAdapter('webhook'), registry.getAdapter('url-recipe')];
  for (const mod of all) {
    const id = mod.meta.id;
    const q = await mod.calculateQuote({ city: 'الرباط' }, {});
    assert.equal(q.supported, false, `${id} يجب أن يُعلن supported=false`);
    assert.ok(q.reason, `${id} يجب أن يُعطي سببًا`);
  }
});

test('webhook يحجب SSRF نحو الشبكة الداخليّة وغيرَ HTTPS', () => {
  const { _assertSafeUrl } = require('../services/delivery/adapters/webhook.adapter');
  for (const bad of [
    'http://example.com/hook',          // غير HTTPS
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.5/hook',
    'https://192.168.1.9/hook',
    'https://169.254.169.254/latest',   // ميتاداتا سحابيّة
    'https://metadata.google.internal/x',
  ]) {
    assert.throws(() => _assertSafeUrl(bad), undefined, `يجب حجب ${bad}`);
  }
  assert.doesNotThrow(() => _assertSafeUrl('https://api.example.com/hook'));
});
