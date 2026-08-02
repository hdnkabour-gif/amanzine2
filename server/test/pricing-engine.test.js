'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, normalizeRule } = require('../lib/pricingEngine');

// ============================================================
// «الثمنُ دالّةٌ لا رقم» — هذه الاختبارات هي العقدُ الذي يُثبت ذلك.
//   القواعدُ بياناتٌ يكتبها التاجر، والنتيجةُ يجب أن تكون قابلةً للشرح دائمًا.
// ============================================================

const CASA = 'city-casa', RABAT = 'city-rabat';

test('بلا قواعد ⇒ الثمنُ الافتراضيّ، والسببُ مذكور', () => {
  const q = evaluate({ cityId: CASA }, [], { fallbackFee: 40 });
  assert.equal(q.deliveryFee, 40);
  assert.equal(q.breakdown[0].type, 'fallback');
});

test('قاعدةُ مدينةٍ تسبق القاعدةَ العامّة مهما كان ترتيبُ الإدخال', () => {
  const rules = [
    normalizeRule({ id: 'r-flat', ruleType: 'flat', fee: 35 }),
    normalizeRule({ id: 'r-casa', ruleType: 'city', cityId: CASA, fee: 20 }),
  ];
  assert.equal(evaluate({ cityId: CASA }, rules, { fallbackFee: 99 }).deliveryFee, 20);
  // والعكس: مدينةٌ أخرى تقع على العامّة لا على الافتراضيّ
  assert.equal(evaluate({ cityId: RABAT }, rules, { fallbackFee: 99 }).deliveryFee, 35);
  // الترتيبُ المعكوس لا يغيّر الناتج
  assert.equal(evaluate({ cityId: CASA }, rules.slice().reverse(), { fallbackFee: 99 }).deliveryFee, 20);
});

test('الأولويّةُ الصريحةُ تعلو على الخصوصيّة', () => {
  const rules = [
    normalizeRule({ id: 'a', ruleType: 'city', cityId: CASA, fee: 20, priority: 0 }),
    normalizeRule({ id: 'b', ruleType: 'flat', fee: 5, priority: 10 }),
  ];
  const q = evaluate({ cityId: CASA }, rules, { fallbackFee: 99 });
  assert.equal(q.deliveryFee, 5);
  assert.equal(q.breakdown[0].rule, 'b');
});

test('شرائحُ الوزن لا تتداخل عند الحدّ', () => {
  const rules = [
    normalizeRule({ id: 'w1', ruleType: 'weight', weightMin: 0, weightMax: 1, fee: 20 }),
    normalizeRule({ id: 'w2', ruleType: 'weight', weightMin: 1, weightMax: 5, fee: 30 }),
  ];
  assert.equal(evaluate({ weight: 0.5 }, rules, {}).deliveryFee, 20);
  // 1 بالضبط تخصّ الشريحة الثانية — الحدُّ الأعلى حصريّ
  assert.equal(evaluate({ weight: 1 }, rules, {}).deliveryFee, 30);
  assert.equal(evaluate({ weight: 4.9 }, rules, {}).deliveryFee, 30);
  // خارج كلّ الشرائح ⇒ الافتراضيّ
  assert.equal(evaluate({ weight: 9 }, rules, { fallbackFee: 60 }).deliveryFee, 60);
});

test('التوصيلُ المجّانيّ فوق عتبةِ قيمةِ الطلب', () => {
  const rules = [
    normalizeRule({ id: 'free', ruleType: 'order_value', orderMin: 500, freeShipping: true, priority: 5 }),
    normalizeRule({ id: 'flat', ruleType: 'flat', fee: 35 }),
  ];
  assert.equal(evaluate({ orderTotal: 600 }, rules, {}).deliveryFee, 0);
  assert.equal(evaluate({ orderTotal: 499 }, rules, {}).deliveryFee, 35);
});

test('قاعدةُ الجهة تُغطّي كلَّ مدنها', () => {
  const rules = [normalizeRule({ id: 'south', ruleType: 'region', region: 'dakhla', fee: 65 })];
  assert.equal(evaluate({ region: 'dakhla' }, rules, { fallbackFee: 40 }).deliveryFee, 65);
  assert.equal(evaluate({ region: 'rabat-sale' }, rules, { fallbackFee: 40 }).deliveryFee, 40);
});

test('رسمُ COD منفصلٌ عن ثمن التوصيل ولا يُدمج فيه', () => {
  const q = evaluate({ codAmount: 1000 }, [], { fallbackFee: 30, codFeeRate: 0.01 });
  assert.equal(q.deliveryFee, 30);
  assert.equal(q.codFee, 10);
  // الفصلُ هو ما يجعل التاجر يعرف أين ذهب المال
  assert.ok(q.breakdown.some(b => b.type === 'cod'));
});

test('القاعدةُ المعطّلة لا تُطبَّق', () => {
  const rules = [normalizeRule({ id: 'off', ruleType: 'city', cityId: CASA, fee: 5, enabled: false })];
  assert.equal(evaluate({ cityId: CASA }, rules, { fallbackFee: 40 }).deliveryFee, 40);
});

test('نوعُ قاعدةٍ مجهولٌ يُتجاهَل ولا يُسقط الحساب', () => {
  const rules = [normalizeRule({ id: 'x', ruleType: 'teleport', fee: 1 })];
  assert.equal(evaluate({}, rules, { fallbackFee: 40 }).deliveryFee, 40);
});

test('الثمنُ موجبٌ دائمًا مهما كانت القاعدةُ فاسدة', () => {
  const rules = [normalizeRule({ id: 'bad', ruleType: 'flat', fee: -50 })];
  assert.equal(evaluate({}, rules, {}).deliveryFee, 0);
  assert.equal(evaluate({}, [normalizeRule({ id: 'b2', ruleType: 'flat', fee: 'abc' })], {}).deliveryFee, 0);
});

test('كلُّ نتيجةٍ تحمل شرحَها', () => {
  const q = evaluate({ cityId: CASA }, [normalizeRule({ id: 'r', ruleType: 'city', cityId: CASA, fee: 20 })], {});
  assert.ok(Array.isArray(q.breakdown) && q.breakdown.length);
  assert.ok(q.breakdown[0].why, 'كلُّ سطرٍ في التفصيل يحتاج سببًا مقروءًا');
});
