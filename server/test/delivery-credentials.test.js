'use strict';
const test = require('node:test');
const assert = require('node:assert');
const {
  validateProvider, readCredentials, missingCredentials,
} = require('../services/delivery/contract');
const registry = require('../services/delivery/registry');

// ============================================================
// بياناتُ الاعتماد — **يُعلنها المزوّد، ولا تعرفها الواجهة**.
//
//   كان في الصفحة حقلٌ واحدٌ اسمُه «مفتاح API» يُعرَض لكلّ الشركات. فمن تطلب
//   شركتُه مُعرِّفًا **مع** مفتاح لم يجد أين يضع الثاني، ومن لا تطلب شركتُه
//   مفتاحًا رأى حقلًا لا معنى له. والأسوأُ أنّ التحقّق كان يسأل عن `apiKey`
//   وحدَه: فيمرّ نصفُ اعتمادٍ ثمّ تَرفضه الشركة، فيقرأ التاجرُ «رفضت الشركةُ
//   المفتاح» ويُبدّل مفتاحًا سليمًا مرارًا بلا جدوى.
//
//   هذه الاختباراتُ تحرس ثلاثةَ أشياء: أنّ الوصفَ مُتحقَّقٌ منه عند التحميل،
//   وأنّ القراءة مصدرُها واحدٌ مهما اختلف مكانُ التخزين، وأنّ الناقصَ يُسمّى.
// ============================================================

const SPEC = [
  { key: 'token', label: 'الرمز', required: true, secret: true, maps: 'apiKey' },
  { key: 'sellerId', label: 'مُعرِّف البائع', required: false },
  { key: 'zone', label: 'المنطقة', required: true },
];

test('القيمةُ تُقرأ من الحقيبة أو من العمود القياسيّ — بلا علمِ المزوّد', () => {
  // من العمود (صفٌّ قديمٌ حُفظ قبل وجود الحقيبة)
  assert.equal(readCredentials({ apiKey: 'K1' }, SPEC).token, 'K1');
  // من الحقيبة
  assert.equal(readCredentials({ fields: { token: 'K2' } }, SPEC).token, 'K2');
  // حقلٌ بلا عمودٍ قياسيّ يُقرأ من الحقيبة وحدَها
  assert.equal(readCredentials({ fields: { zone: 'nord' } }, SPEC).zone, 'nord');
});

test('ما أدخله التاجرُ اليوم يغلب مفتاحًا قديمًا منسيًّا في العمود', () => {
  // لولا هذه الأولويّة لظلَّ `api_key` قديمٌ يغلب ما كُتب الآن، فيُجرَّب
  // مفتاحٌ منتهٍ ويُقال «رفضت الشركة» بينما الصحيحُ محفوظٌ ولا يُقرأ.
  const v = readCredentials({ apiKey: 'قديم', fields: { token: 'جديد' } }, SPEC);
  assert.equal(v.token, 'جديد');
});

test('الفارغُ في الحقيبة لا يحجب العمود — مسحُ حقلٍ ليس إلغاءَ الاعتماد', () => {
  assert.equal(readCredentials({ apiKey: 'K', fields: { token: '  ' } }, SPEC).token, 'K');
});

test('الناقصُ يُسمّى بالاسم — لا «رفضت الشركةُ المفتاح»', () => {
  const miss = missingCredentials({ apiKey: 'K' }, SPEC);
  assert.deepEqual(miss, ['المنطقة']);          // الرمزُ موجود، والمُعرِّفُ غيرُ إجباريّ
  assert.deepEqual(missingCredentials({}, SPEC), ['الرمز', 'المنطقة']);
  assert.deepEqual(missingCredentials({ apiKey: 'K', fields: { zone: 'n' } }, SPEC), []);
});

test('غيابُ الوصف لا يكسر شيئًا — مزوّدٌ قديمٌ بلا تصريح', () => {
  assert.deepEqual(readCredentials({ apiKey: 'K' }, undefined), {});
  assert.deepEqual(missingCredentials({ apiKey: 'K' }, undefined), []);
});

// ── التحقّقُ من الوصف عند التحميل ──────────────────────────────
// وصفٌ مشوّهٌ يبني نموذجًا معطوبًا في الواجهة: التاجرُ يملأ حقلًا لا يصل
// الشركةَ. يُرفَض المزوّدُ عند التحميل لا عند أوّل شحنةٍ لزبون.

const base = { meta: { id: 'x', name: 'X' }, createShipment: async () => ({}) };
const withCreds = (c) => ({ ...base, meta: { ...base.meta, credentials: c } });

test('وصفٌ ليس مصفوفةً يُرفَض', () => {
  assert.ok(validateProvider(withCreds({ token: 1 })).some(p => /مصفوفة/.test(p)));
});

test('مفتاحٌ غيرُ صالحٍ أو مكرّرٌ يُرفَض', () => {
  assert.ok(validateProvider(withCreds([{ key: 'لا لاتينيّ', label: 'ل' }])).some(p => /key غيرُ صالح/.test(p)));
  assert.ok(validateProvider(withCreds([
    { key: 'a', label: 'A' }, { key: 'a', label: 'B' },
  ])).some(p => /مكرّر/.test(p)));
});

test('تسميةٌ مفقودةٌ تُرفَض — حقلٌ بلا اسمٍ لا يُملأ', () => {
  assert.ok(validateProvider(withCreds([{ key: 'a' }])).some(p => /label مفقود/.test(p)));
});

test('`maps` إلى عمودٍ غيرِ موجودٍ يُرفَض — وإلّا كُتبت القيمةُ في العدم', () => {
  assert.ok(validateProvider(withCreds([{ key: 'a', label: 'A', maps: 'nope' }])).some(p => /maps/.test(p)));
});

test('وصفٌ سليمٌ يُقبَل', () => {
  assert.deepEqual(validateProvider(withCreds(SPEC)), []);
});

test('كلُّ مزوّدٍ مسجَّلٍ يُصرّح بحقولٍ سليمةٍ وبحقلٍ إجباريٍّ واحدٍ على الأقلّ', () => {
  registry._reset();
  const all = registry.list();
  assert.ok(all.length >= 4, 'عددُ المزوّدين أقلُّ من المتوقَّع');
  for (const p of all) {
    assert.ok(Array.isArray(p.credentials) && p.credentials.length,
      `المزوّد ${p.id} لا يُصرّح بحقول اعتماد — ستعرض له الواجهةُ حقلًا عامًّا`);
    assert.ok(p.credentials.some(f => f.required),
      `المزوّد ${p.id} بلا حقلٍ إجباريّ — سيمرّ التحقّقُ بلا اعتمادٍ إطلاقًا`);
    // السرُّ يُعلَن سرًّا: الواجهةُ تُخفيه ولا يُسجَّل.
    for (const f of p.credentials) {
      if (/key|token|secret|password/i.test(f.key)) {
        assert.ok(f.secret, `${p.id}.${f.key} اعتمادٌ حسّاسٌ غيرُ مُعلَنٍ سرًّا`);
      }
    }
  }
});
