'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../lib/orderLifecycle');

// ============================================================
// دورةُ حياة الطلب — الحالاتُ قليلة، والأحداثُ لا تُحصى.
//
//   الاختبارُ المركزيّ هنا هو السؤالُ الذي يكسر نموذجَ العمود الواحد:
//   **ثلاثُ قطعٍ، رُفضت واحدةٌ وسُلِّمت اثنتان — ما الحالة؟**
//   لا `delivered` صادقةٌ ولا `returned`. الجوابُ أنّ «مُرجَعٌ جزئيًّا» ليست
//   حالةً تُخزَّن بل واقعةٌ تُستنتَج، وأنّ المبلغَ يُحسَب من الدفتر لا يُكتَب.
// ============================================================

const ORDER = {
  id: 'ord-1', total: 150, status: 'pending',
  items: [
    { productId: 'p1', productName: 'سروال', quantity: 1, price: 50 },
    { productId: 'p2', productName: 'قاميجة', quantity: 2, price: 50 },
  ],
};
const ev = (type, amountDelta = 0, payload = {}) => ({ type, amountDelta, payload });

// ── الحساب: المال يُشتقّ ولا يُخزَّن ──────────────────────────

test('المبلغُ الواجبُ تحصيلُه = الأصلُ + آثارُ الأحداث', () => {
  assert.equal(L.amountDue(150, []), 150);
  assert.equal(L.amountDue(150, [ev('discount.applied', -15)]), 135);
  assert.equal(L.amountDue(150, [ev('discount.applied', -15), ev('item.rejected', -50)]), 85);
});

test('لا يُحصَّل مبلغٌ سالب مهما تراكمت الإرجاعات', () => {
  assert.equal(L.amountDue(100, [ev('item.returned', -80), ev('item.returned', -80)]), 0);
});

test('الكسورُ تُقرَّب إلى فلسَين — لا يتسرّب خطأُ الفاصلة العائمة', () => {
  assert.equal(L.amountDue(0.1, [ev('price.adjusted', 0.2)]), 0.3);
});

// ── السؤالُ الذي كسر نموذجَ الحالة الواحدة ────────────────────

test('رُفضت قطعةٌ من ثلاثٍ: مُسلَّمٌ **و** مُرجَعٌ جزئيًّا معًا', () => {
  const events = [ev('order.delivered'), ev('item.rejected', -50, { quantity: 1 })];
  const f = L.deriveFacts(ORDER, events);
  // العمودُ الواحد يعجز عن حمل الاثنين — والاستنتاجُ يحملهما بلا تناقض.
  assert.equal(f.partiallyReturned, true);
  assert.equal(f.fullyReturned, false);
  assert.equal(f.returnedQty, 1);
  assert.equal(f.totalQty, 3);
  // والأهمّ: المالُ صحيحٌ بلا أن يكتب أحدٌ فوق أحد.
  assert.equal(f.amountDue, 100);
  assert.equal(f.originalTotal, 150);
});

test('رُدَّ كلُّ شيءٍ ⇒ ليس إرجاعًا جزئيًّا، والمبلغُ صفر', () => {
  const events = [ev('item.returned', -150, { quantity: 3 })];
  const f = L.deriveFacts(ORDER, events);
  assert.equal(f.fullyReturned, true);
  assert.equal(f.partiallyReturned, false);
  assert.equal(f.amountDue, 0);
});

test('طلبٌ بلا أحداثٍ ليس مُرجَعًا — الصمتُ ليس إرجاعًا', () => {
  const f = L.deriveFacts(ORDER, []);
  assert.equal(f.partiallyReturned, false);
  assert.equal(f.fullyReturned, false);
  assert.equal(f.amountDue, 150);
});

// ── ما ينتظر التاجر ─────────────────────────────────────────

test('طلبُ استرجاعٍ يبقى معلّقًا حتى يُنجَز', () => {
  let f = L.deriveFacts(ORDER, [ev('refund.requested')]);
  assert.deepEqual(f.pendingRequests, ['refund.requested']);
  f = L.deriveFacts(ORDER, [ev('refund.requested'), ev('refund.completed', -150)]);
  assert.deepEqual(f.pendingRequests, []);
  assert.equal(f.refunded, true);
  assert.equal(f.amountDue, 0);
});

// ── الحرّاس: الدفترُ لا يُعدَّل، فالخطأُ فيه يبقى أبدًا ──────────

test('نوعُ حدثٍ مجهولٍ يُرفَض', () => {
  assert.ok(L.validateEvent(ev('order.teleported'), ORDER, []).some(p => /غيرُ معروف/.test(p)));
});

test('حدثٌ لا يمسّ المال لا يجوز أن يحمل مبلغًا', () => {
  // «تغيّر العنوان» بمبلغٍ يعني مالًا تحرّك بلا سببٍ مكتوب.
  assert.ok(L.validateEvent(ev('address.changed', -20), ORDER, []).some(p => /amount_delta/.test(p)));
  assert.deepEqual(L.validateEvent(ev('address.changed', 0), ORDER, []), []);
});

test('لا يُردُّ أكثرُ ممّا يجب تحصيلُه', () => {
  assert.deepEqual(L.validateEvent(ev('item.returned', -150), ORDER, []), []);
  assert.ok(L.validateEvent(ev('item.returned', -151), ORDER, []).some(p => /أكبرُ من/.test(p)));
  // وبعد خصمٍ سابق، السقفُ ينزل معه — لا يُقاس على الأصل.
  const after = [ev('discount.applied', -50)];
  assert.ok(L.validateEvent(ev('item.returned', -101), ORDER, after).some(p => /أكبرُ من/.test(p)));
});

test('استرجاعٌ بلا طلبِ استرجاعٍ يُرفَض — مالٌ يخرج بلا مُبرّر', () => {
  assert.ok(L.validateEvent(ev('refund.completed', -50), ORDER, []).some(p => /بلا refund.requested/.test(p)));
  assert.deepEqual(L.validateEvent(ev('refund.completed', -50), ORDER, [ev('refund.requested')]), []);
});

test('استرجاعان لطلبٍ واحدٍ يُرفَض ثانيهما', () => {
  const existing = [ev('refund.requested'), ev('refund.completed', -50)];
  assert.ok(L.validateEvent(ev('refund.completed', -50), ORDER, existing).some(p => /بلا/.test(p)));
});

// ── الانتقالات ──────────────────────────────────────────────

test('المُسلَّمُ لا يعود قيدَ الانتظار، والملغى لا يُشحَن', () => {
  assert.equal(L.canTransition('delivered', 'pending'), false);
  assert.equal(L.canTransition('cancelled', 'shipped'), false);
  assert.equal(L.canTransition('pending', 'confirmed'), true);
  assert.equal(L.canTransition('shipped', 'delivered'), true);
  // البقاءُ في المكان مسموح: حدثٌ يُسجَّل بلا تغييرِ حالة.
  assert.equal(L.canTransition('shipped', 'shipped'), true);
  // `closed` مفردةٌ مهجورةٌ تُترجَم إلى `delivered` — فهي **نفسُ** المكان
  //   لا مكانٌ بعده. والعهدُ المقصود هو أنّها نهاية: لا رجوعَ منها.
  assert.equal(L.canonicalState('closed'), 'delivered');
  assert.equal(L.canTransition('closed', 'delivered'), true);   // بقاءٌ في المكان
  assert.equal(L.canTransition('closed', 'pending'), false);
  assert.equal(L.canTransition('closed', 'shipped'), false);
});

test('حدثٌ بانتقالٍ ممنوعٍ يُرفَض', () => {
  const delivered = { ...ORDER, status: 'delivered' };
  assert.ok(L.validateEvent({ ...ev('order.confirmed'), status: 'pending' }, delivered, [])
    .some(p => /انتقالٌ ممنوع/.test(p)));
});

test('الحالاتُ ستٌّ لا ستَّ عشرة — الغنى في الأحداث', () => {
  // يُكتب العددُ صراحةً: زيادةُ حالةٍ قرارٌ معماريٌّ لا سهو. كلُّ ما يُغري
  // بإضافة حالةٍ («مُرجَعٌ جزئيًّا») هو في الحقيقة استنتاجٌ أو حدث.
  assert.equal(L.STATES.length, 6);
  assert.ok(!L.STATES.includes('partially_returned'));
  assert.ok(!L.STATES.includes('refund_requested'));
  assert.ok(L.isKnownEvent('item.rejected'));
  assert.ok(L.isKnownEvent('refund.requested'));
});
