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
  for (const expected of ['amana', 'jibli', 'livo', 'webhook']) {
    assert.ok(ids.includes(expected), `${expected} يجب أن يُكتشف تلقائيًّا`);
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

test('resolve يختار بـ api_type بلا حساسيّةٍ لحالة الأحرف', () => {
  assert.equal(registry.resolve({ apiType: 'livo' })?.meta.id, 'livo');
  assert.equal(registry.resolve({ apiType: 'LIVO' })?.meta.id, 'livo');
  assert.equal(registry.resolve({ apiType: ' Livo ' })?.meta.id, 'livo');
});

test('resolve يسقط إلى webhook عامٍّ عند نوعٍ مجهولٍ مع رابطٍ مُهيّأ', () => {
  assert.equal(registry.resolve({ apiType: 'chronodiali', webhookUrl: 'https://x.io/h' })?.meta.id, 'webhook');
  // بلا رابطٍ ولا نوعٍ معروف ⇒ لا مزوّد (فيسقط المتصل للمحاكاة، لا انهيار)
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

test('مزوّدٌ بلا مصدرِ ثمنٍ يُعلن عدمَ الدعم بدل اختلاق رقم', async () => {
  for (const id of ['amana', 'jibli', 'webhook']) {
    const q = await registry.get(id).calculateQuote({ city: 'الرباط' }, {});
    assert.equal(q.supported, false, `${id} يجب أن يُعلن supported=false`);
    assert.ok(q.reason, `${id} يجب أن يُعطي سببًا`);
  }
});

test('webhook يحجب SSRF نحو الشبكة الداخليّة وغيرَ HTTPS', () => {
  const { _assertSafeUrl } = require('../services/delivery/providers/webhook.provider');
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
