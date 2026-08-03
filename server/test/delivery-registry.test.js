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

// ── الاستدلالُ على المزوّد من نطاقه ───────────────────────────────────────────
//
//   العطبُ الذي وُلد منه هذا: صفٌّ حُفظ باسمٍ مكتوبٍ يدويًّا («Livo») يصل
//   قاعدةَ البيانات بـ api_type = '' ⇒ registry.resolve يُرجع null ⇒ لا مدنَ
//   ولا مفتاحَ يُفحَص ولا شحنةَ حقيقيّة، والتاجرُ يرى الشركةَ «مفعّلة».
//   الاستدلالُ يُغلق هذا الباب، والمعرفةُ تبقى في ملفّ المزوّد لا هنا.

test('الاستدلال يُعرِّف الصفَّ من نقطة نهايته حين يغيب api_type', () => {
  assert.equal(registry.suggest({ apiEndpoint: 'https://rest.livo.ma' }), 'livo');
  assert.equal(registry.suggest({ websiteUrl: 'my.livo.ma' }), 'livo');
  assert.equal(registry.suggest({ apiEndpoint: 'https://api.amana.ma/v1' }), 'amana');
});

test('الاستدلال لا يخمّن: نطاقٌ مجهولٌ أو غائبٌ يُرجع null', () => {
  assert.equal(registry.suggest({ apiEndpoint: 'https://api.chronodiali.ma' }), null);
  assert.equal(registry.suggest({ name: 'Livo' }), null, 'الاسمُ وحده ليس دليلًا');
  assert.equal(registry.suggest({}), null);
  assert.equal(registry.suggest(null), null);
});

test('الاستدلال يطابق على حدود النقطة لا على مجرّد احتواء النصّ', () => {
  // نطاقٌ يُنتهي بـ livo.ma بلا نقطةٍ فاصلة ليس Livo — وإلّا لسُلّمت مفاتيحُ
  // التاجر لموقعٍ اشترى اسمًا مشابهًا.
  assert.equal(registry.suggest({ apiEndpoint: 'https://notlivo.ma' }), null);
  assert.equal(registry.suggest({ apiEndpoint: 'https://livo.ma.evil.com' }), null);
});

test('كلُّ مزوّدٍ يُعلن نطاقاتِه بشكلٍ صحيحٍ إن أعلنها', () => {
  for (const p of registry.list()) {
    if (p.match === undefined) continue;
    assert.ok(Array.isArray(p.match.hosts), `${p.id}: match.hosts ليس مصفوفة`);
    for (const h of p.match.hosts) {
      assert.equal(typeof h, 'string');
      assert.ok(h.trim() && !h.includes('://'), `${p.id}: «${h}» يجب أن يكون نطاقًا مجرّدًا`);
    }
  }
});

test('العقد يرفض match.hosts المعطوب بدل تركه يفشل صامتًا', () => {
  const base = { meta: { id: 'x', name: 'X' }, createShipment: async () => ({ success: true }) };
  assert.deepEqual(validateProvider(base), [], 'غيابُ match مسموح');
  assert.equal(validateProvider({ ...base, meta: { ...base.meta, match: { hosts: 'livo.ma' } } }).length, 1);
  assert.equal(validateProvider({ ...base, meta: { ...base.meta, match: { hosts: [''] } } }).length, 1);
  assert.equal(validateProvider({ ...base, meta: { ...base.meta, match: { hosts: [42] } } }).length, 1);
  assert.deepEqual(validateProvider({ ...base, meta: { ...base.meta, match: { hosts: ['livo.ma'] } } }), []);
});

// ── قراءةُ الردود: افحص، لا تفترض ──────────────────────────────────────────
//
//   العطبُ الذي وُلد منه هذا كلّف ٤٤١ مدينة: Livo تُرجع `{data:{data:[…]}}`
//   والكودُ توقّع `{data:[…]}`، فرمت `.map` وصار الخطأُ يبدو عطبَ شبكةٍ أو
//   مفتاح. لا اختبارَ وحدةٍ يمسكه — يمسكه **ردٌّ حقيقيّ**، أو حارسٌ يمنع
//   الافتراضَ من أصله.

const { pickArray, pickObject } = require('../services/delivery/contract');

test('pickArray تجد المصفوفةَ مهما تداخل الردّ', () => {
  assert.deepEqual(pickArray([1, 2]), [1, 2], 'مصفوفةٌ مباشرة');
  assert.deepEqual(pickArray({ data: [1] }), [1], 'الشكلُ المتوقَّع سابقًا');
  assert.deepEqual(pickArray({ success: true, data: { data: [1, 2] } }), [1, 2], 'شكلُ Livo الحقيقيّ');
  assert.deepEqual(pickArray({ items: [3] }), [3]);
  assert.deepEqual(pickArray({ results: [4] }), [4]);
  assert.deepEqual(pickArray({ data: { cities: [5] } }, ['data.cities']), [5], 'مسارٌ مخصّص');
});

test('pickArray تُرجع مصفوفةً دائمًا — لا ترمي أبدًا', () => {
  for (const bad of [null, undefined, 0, '', 'نصّ', { data: {} }, { data: 'x' }, { a: 1 }]) {
    const r = pickArray(bad);
    assert.ok(Array.isArray(r), `${JSON.stringify(bad)}: لم تُرجع مصفوفة`);
    assert.equal(r.length, 0);
  }
});

test('pickObject تجد الكائنَ ولا تخلطه بمصفوفة', () => {
  assert.deepEqual(pickObject({ data: { _id: 'a' } }), { _id: 'a' });
  assert.deepEqual(pickObject({ data: { data: { _id: 'b' } } }), { _id: 'b' }, 'شكلٌ متداخل');
  assert.equal(pickObject({ data: [1, 2] }), null, 'مصفوفةٌ ليست كائنَ شحنة');
  assert.equal(pickObject(null), null);
  assert.equal(pickObject('نصّ'), null);
});

test('لا مزوّدَ يقرأ الردَّ بافتراضِ شكلٍ — القاعدة مفروضة', () => {
  const fs = require('fs'), path = require('path');
  const dir = path.join(__dirname, '..', 'services', 'delivery', 'providers');
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.provider.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // القاعدةُ تخصّ **ردَّ الشركة** لا بياناتِنا: `(order.items || []).map`
    // آمنةٌ لأنّ الشكلَ لنا. المقصودُ ما نقرؤه من الخارج.
    const RESPONSE = '(?:result|response|json|payload|body|data)';
    // `(result.data || []).map` — الكائنُ قيمةٌ صادقة فلا يحميه `|| []`.
    assert.ok(!new RegExp(`\\(\\s*${RESPONSE}(\\.\\w+)*\\s*\\|\\|\\s*\\[\\]\\s*\\)\\s*\\.map`).test(src),
      `${f}: يفترض أنّ ردَّ الشركة مصفوفة — استعمل pickArray`);
    // ولا يقرأ `result.data.x` مباشرةً بلا فحصِ التداخل.
    assert.ok(!/result\.data\.\w/.test(src),
      `${f}: يقرأ result.data مباشرةً — استعمل pickObject`);
  }
});

// ============================================================
// رقمُ التتبّع يعني شيئًا واحدًا: رقمٌ جاءَ من شركةِ توصيل.
//
//   كان مسارُ الشحن يفبرك `TRK-XXXXXX` حين يعجز عن الإرسال، ويكتبه في
//   **نفس الحقل** الذي يحمل الرقمَ الحقيقيّ. فيظهر في بطاقة الطلب بلونٍ
//   أخضرَ ويُطبَع على الفاتورة التي تُسلَّم للزبون — والتاجرُ يفتح موقعَ
//   الشركة فلا يجد شيئًا، بحقّ. ومسارٌ قديمٌ ثانٍ (`/simulate`) كان يفعلها
//   أيضًا بلا أن تناديه أيُّ شاشة.
// ============================================================

test('لا مسارَ يفبرك رقمَ تتبّعٍ ويكتبه في حقل الرقم الحقيقيّ', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'routes');

  for (const f of fs.readdirSync(dir).filter(x => x.startsWith('delivery'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // أسطرُ الكودِ وحدَها: التعليقاتُ تشرح العطبَ فتذكر النصّ بالضرورة.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

    const fabricates = /trackingNumber\s*:\s*tracking\b/.test(code)
      && /const\s+tracking\s*=\s*['"`]TRK-/.test(code);
    assert.ok(!fabricates,
      `${f}: يكتب رقمًا مُولَّدًا محلّيًّا في trackingNumber — الحقلُ لِما جاء من الشركة وحدَه`);
  }
});

test('حين لا تُرسَل الشحنةُ تُعلَن الحالةُ ولا يُخترَع رقم', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'delivery.js'), 'utf8');
  assert.ok(/deliveryStatus:\s*'manual_required'/.test(src),
    'مسارُ العجز يجب أن يُعلن manual_required — لا أن يصمت');
  assert.ok(!/router\.post\('\/simulate/.test(src),
    'المسارُ القديم `/simulate` بابٌ خلفيٌّ يُعيد الفبركة');
});
