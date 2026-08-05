'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { mergeValue, validateBatch, isKnownKey, knownKeys } = require('../lib/userMemory');

// ============================================================
// ذاكرةُ المستخدم — الدمجُ قبل كلّ شيء.
//
//   العطبُ الذي تحرسه هذه الاختبارات **صامت**: هاتفٌ تعلّم «طرطاقة» وحاسوبٌ
//   تعلّم «اونصومبل»، فإن فازت آخرُ كتابةٍ مُحيت إحداهما ولا يشتكي أحد —
//   المستخدمُ لا يعرف أنّ التطبيقَ كان يعرف شيئًا ثمّ نسيه.
//
//   ولذلك تُختبَر كلُّ استراتيجيّةٍ بسؤالٍ واحد: **هل ضاع شيءٌ كان موجودًا؟**
// ============================================================

// ── merge_object: اتّحادُ المفاتيح ─────────────────────────────
test('جهازان يتعلّمان عبارتَين مختلفتَين ⇒ تبقى الاثنتان', () => {
  const phone = { 'طرطاقة': 'baby_onesies' };
  const laptop = { 'اونصومبل': 'clothing_sets' };
  const { value } = mergeValue('amanzine_learned', phone, laptop);
  assert.deepEqual(value, { 'طرطاقة': 'baby_onesies', 'اونصومبل': 'clothing_sets' });
});

test('الوافدُ يفوز عند تصادم المفتاح نفسِه — تصحيحٌ لا ضياع', () => {
  const { value } = mergeValue('amanzine_learned',
    { 'كسوة': 'clothing' }, { 'كسوة': 'kids_clothing' });
  assert.equal(value['كسوة'], 'kids_clothing');
});

test('الوافدُ الفارغُ لا يمحو المخزون — مسحُ متصفّحٍ ليس أمرَ نسيان', () => {
  // متصفّحٌ نُظّف يرفع `{}`. لو استُبدل لضاعت ذاكرةُ سنةٍ في نقرة.
  const { value } = mergeValue('amanzine_learned', { 'طرطاقة': 'baby_onesies' }, {});
  assert.deepEqual(value, { 'طرطاقة': 'baby_onesies' });
});

test('لا مخزونَ بعد ⇒ الوافدُ يصير المخزون', () => {
  const { value, added } = mergeValue('amanzine_learned', undefined, { a: '1' });
  assert.deepEqual(value, { a: '1' });
  assert.equal(added, 1);
});

test('`added` تعدّ الجديدَ فقط — لا رفعَ يُحسب تعلُّمًا', () => {
  const stored = { a: '1', b: '2' };
  assert.equal(mergeValue('amanzine_learned', stored, { a: '1' }).added, 0);
  assert.equal(mergeValue('amanzine_learned', stored, { a: '9' }).added, 1);
  assert.equal(mergeValue('amanzine_learned', stored, { c: '3' }).added, 1);
});

test('السقفُ يمنع النموَّ بلا حدّ — والأقدمُ يخرج أوّلًا', () => {
  const big = {};
  for (let i = 0; i < 2010; i++) big[`k${i}`] = String(i);
  const { value } = mergeValue('amanzine_learned', {}, big);
  const keys = Object.keys(value);
  assert.equal(keys.length, 2000);
  assert.equal(keys.includes('k0'), false, 'الأقدمُ لم يخرج');
  assert.equal(keys.includes('k2009'), true, 'الأحدثُ خرج');
});

// ── append_array: اتّحادٌ بالمُعرِّف ────────────────────────────
test('الرحلاتُ تتّحد بلا تكرار', () => {
  const a = [{ id: 'j1', seconds: 5 }];
  const b = [{ id: 'j2', seconds: 9 }];
  const { value } = mergeValue('amanzine_journeys', a, b);
  assert.deepEqual(value.map(x => x.id), ['j1', 'j2']);
});

test('نفسُ الرحلة تُحدَّث لا تُكرَّر — قد تكون اكتملت بعد رفعها ناقصة', () => {
  const a = [{ id: 'j1', published: false }];
  const b = [{ id: 'j1', published: true }];
  const { value, added } = mergeValue('amanzine_journeys', a, b);
  assert.equal(value.length, 1);
  assert.equal(value[0].published, true);
  assert.equal(added, 0, 'التحديثُ ليس إضافة');
});

test('سقفُ المصفوفة يُبقي الأحدث', () => {
  const many = Array.from({ length: 130 }, (_, i) => ({ id: `j${i}` }));
  const { value } = mergeValue('amanzine_journeys', [], many);
  assert.equal(value.length, 120);
  assert.equal(value[value.length - 1].id, 'j129');
});

// ── replace ───────────────────────────────────────────────────
test('«آخرُ زيارة» تُستبدَل — لا معنى لدمجها', () => {
  const { value } = mergeValue('amanzine_last_visit', 100, 200);
  assert.equal(value, 200);
});

// ── الحارس ────────────────────────────────────────────────────
test('المفتاحُ غيرُ المُعلَن يُرفَض — الجدولُ ليس مكبًّا', () => {
  assert.equal(isKnownKey('amanzine_learned'), true);
  assert.equal(isKnownKey('whatever_i_want'), false);
  assert.ok(validateBatch({ whatever_i_want: {} }).some(p => /غيرُ معروف/.test(p)));
});

test('حمولةٌ ضخمةٌ تُرفَض — ذاكرةُ شخصٍ لا تُقاس بالميغابايت', () => {
  const huge = { amanzine_learned: { x: 'ب'.repeat(600 * 1024) } };
  assert.ok(validateBatch(huge).some(p => /الحجم/.test(p)));
});

test('حمولةٌ فارغةٌ أو مشوّهةٌ تُرفَض بوضوح', () => {
  assert.ok(validateBatch(null).length);
  assert.ok(validateBatch([]).length);
  assert.ok(validateBatch({}).length);
});

test('حمولةٌ سليمةٌ تمرّ', () => {
  assert.deepEqual(validateBatch({ amanzine_learned: { a: 'b' }, amanzine_journeys: [] }), []);
});

test('كلُّ مفتاحٍ مُعلَنٍ له استراتيجيّةٌ معروفة', () => {
  const ok = ['merge_object', 'append_array', 'replace'];
  for (const k of knownKeys()) {
    assert.ok(ok.includes(k.strategy), `${k.key}: استراتيجيّةٌ مجهولة «${k.strategy}»`);
    if (k.strategy === 'append_array') {
      assert.ok(k.dedupeBy, `${k.key}: مصفوفةٌ بلا مفتاحِ تمييز ⇒ تكرارٌ عند كلّ مزامنة`);
    }
  }
});
