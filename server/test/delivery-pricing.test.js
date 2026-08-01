'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveDeliveryFee, FALLBACK_FEE } = require('../lib/deliveryPricing');

// ============================================================
// ثمنُ التوصيل يُحسب على الخادم — سقّاطةٌ تمنع عودةَ العطب.
//   كان `POST /api/orders/public` يأخذ `deliveryCost` من جسم الطلب، أي من
//   المتصفّح، فيستطيع الزبون إرسال 0 ويشتري بلا توصيل. هذه الاختبارات تُثبت
//   أنّ الرقم يخرج من جدول التاجر وحده.
// ============================================================

test('المدن المعروفة تأخذ ثمنَها من الجدول الافتراضيّ', () => {
  assert.equal(resolveDeliveryFee('الدار البيضاء'), 20);
  assert.equal(resolveDeliveryFee('الرباط'), 25);
  assert.equal(resolveDeliveryFee('طنجة'), 35);
});

test('المطابقة لا تتأثّر بحالة الأحرف اللاتينيّة', () => {
  assert.equal(resolveDeliveryFee('casablanca'), 20);
  assert.equal(resolveDeliveryFee('Casablanca'), 20);
  assert.equal(resolveDeliveryFee('CASABLANCA'), 20);
});

test('جدولُ التاجر يعلو على الافتراضيّ', () => {
  assert.equal(resolveDeliveryFee('الرباط', { 'الرباط': 99 }), 99);
  assert.equal(resolveDeliveryFee('مدينةٌ غريبة', { default: 55 }), 55);
});

test('مدينةٌ مجهولة أو فارغة ⇒ الافتراضيّ، لا صفر ولا مدينةٌ عشوائيّة', () => {
  assert.equal(resolveDeliveryFee('مدينةٌ لا وجود لها'), FALLBACK_FEE);
  // الفراغ خطِرٌ تحديدًا: `k.includes('')` صحيحةٌ لكلّ مفتاح، فبلا حارسٍ
  // يُحتسب ثمنُ أوّل مدينةٍ في الجدول (20) بدل الافتراضيّ.
  assert.equal(resolveDeliveryFee(''), FALLBACK_FEE);
  assert.equal(resolveDeliveryFee('   '), FALLBACK_FEE);
  assert.equal(resolveDeliveryFee(null), FALLBACK_FEE);
  assert.equal(resolveDeliveryFee(undefined), FALLBACK_FEE);
});

test('الثمنُ موجبٌ دائمًا مهما كان الجدول فاسدًا', () => {
  assert.equal(resolveDeliveryFee('الرباط', { 'الرباط': -50 }), 0);
  assert.equal(resolveDeliveryFee('الرباط', { 'الرباط': 'abc' }), 0);
});
