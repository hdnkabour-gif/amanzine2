'use strict';
const test = require('node:test');
const assert = require('node:assert');
const payment = require('../lib/engines/payment');

// ============================================================
// الدفع — BROKEN_CHAINS#⑤.
//
//   المقاعدُ الثلاثة كانت تُرجع `unavailable` حين ينقص المفتاح، فإذا **ضُبط
//   المفتاح** رجعت `pending`: يُسجَّل دفعٌ في القاعدة ويُذاع `payment.pending`
//   ولم يُرسَل شيءٌ لأيّ بوّابة. التهيئةُ وحدَها كانت تُشغّل كذبة.
// ============================================================

const SEATS = ['cmi', 'stripe', 'paypal'];

test('مقعدٌ غيرُ مُنفَّذٍ يبقى غيرَ متاحٍ مهما اكتملت البيئة', async () => {
  const saved = { ...process.env };
  process.env.CMI_MERCHANT_ID = 'x';
  process.env.CMI_STORE_KEY   = 'y';
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.PAYPAL_CLIENT_ID  = 'pp';
  try {
    for (const p of SEATS) {
      assert.equal(payment.isAvailable(p), false, `${p} صار متاحًا بمتغيّرِ بيئةٍ وحدَه`);
      const r = await payment.charge({ provider: p, userId: 'u1', amount: 100 });
      assert.equal(r.status, 'unavailable', `${p} قَبِل دفعةً بلا محوّل`);
      assert.ok(!r.paymentId, `${p} أنشأ سجلَّ دفعةٍ لشيءٍ لم يُرسَل`);
    }
  } finally {
    for (const k of ['CMI_MERCHANT_ID', 'CMI_STORE_KEY', 'STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_ID']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k];
    }
  }
});

test('«لا كود» و«لا مفتاح» حالتان مختلفتان تُعلَنان', () => {
  const m = payment.methods();
  const byId = Object.fromEntries(m.map(x => [x.provider, x]));
  for (const p of SEATS) {
    assert.equal(byId[p].implemented, false, `${p} يدّعي أنّه مُنفَّذ`);
    assert.equal(byId[p].available, false);
    assert.equal(typeof byId[p].configured, 'boolean', 'التهيئةُ حقيقةٌ منفصلةٌ تُقال');
  }
  for (const p of ['cod', 'transfer', 'wallet']) {
    assert.equal(byId[p].implemented, true);
    assert.equal(byId[p].available, true, `${p} يجب أن يعمل بلا تهيئة`);
  }
});

test('كلُّ محوّلٍ يُعلن نفسَه — لا قائمةَ ثانيةً تتباعد عنه', () => {
  for (const [id, a] of Object.entries(payment.ADAPTERS)) {
    assert.equal(typeof a.implemented, 'boolean', `${id}: بلا رايةِ تنفيذ`);
    assert.equal(typeof a.configured, 'function', `${id}: بلا فحصِ تهيئة`);
    assert.equal(typeof a.charge, 'function', `${id}: بلا دالّةِ خصم`);
  }
});

test('طريقةٌ مجهولةٌ تُرفَض ولا تُنشئ شيئًا', async () => {
  const r = await payment.charge({ provider: 'bitcoin', userId: 'u1', amount: 10 });
  assert.equal(r.status, 'failed');
  assert.ok(!r.paymentId);
});

test('مبلغٌ سالبٌ يُرفَض قبل أيّ محوّل', async () => {
  const r = await payment.charge({ provider: 'cod', userId: 'u1', amount: -5 });
  assert.equal(r.status, 'failed');
});
