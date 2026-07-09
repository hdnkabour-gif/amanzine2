'use strict';
// ============================================================
// Payment Engine — واجهة موحّدة خلفها محوّلات (adapters) للطرق:
//   cod (دفع عند الاستلام) · wallet (محفظة) · transfer (تحويل بنكي)
//   cmi · stripe · paypal  (مقاعد تُفعَّل عند ضبط اعتمادات env)
// كل الطبقات (حجز/طلب) تنادي charge() فقط → إضافة طريقة = adapter جديد
// بلا تغيير المستهلكين. يصدر أحداث payment.* على الـBus.
// ============================================================
const { db } = require('../../database');
const bus = require('./eventbus');

// كل adapter: async ({ userId, amount, currency, orderId, meta }) → { status, ref, redirectUrl? }
const ADAPTERS = {
  // دفع عند الاستلام — يُنشأ كـ pending ويُؤكَّد عند التسليم
  cod: async () => ({ status: 'pending', ref: 'COD' }),

  // تحويل بنكي — pending حتى تأكيد التاجر
  transfer: async () => ({ status: 'pending', ref: 'BANK' }),

  // المحفظة — خصم فوري إن كفى الرصيد
  wallet: async ({ userId, amount }) => {
    if (!userId) return { status: 'failed', error: 'مستخدم مطلوب' };
    const r = await db.walletApply(userId, { type: 'payment', amount: -Math.abs(amount), note: 'دفع من المحفظة' });
    return r.ok ? { status: 'paid', ref: 'WALLET' } : { status: 'failed', error: r.error };
  },

  // ── مقاعد بوابات خارجية: تُفعَّل عند توفّر الاعتمادات في env ──
  cmi: async ({ amount, orderId }) => {
    if (!process.env.CMI_MERCHANT_ID || !process.env.CMI_STORE_KEY) return { status: 'unavailable', error: 'CMI غير مُهيّأ' };
    // TODO: توليد نموذج CMI الموقّع (hash) وإعادة redirectUrl — يتطلّب اعتمادات التاجر
    return { status: 'pending', ref: 'CMI', redirectUrl: null, note: 'seam: أضف اعتمادات CMI' };
  },
  stripe: async ({ amount, currency }) => {
    if (!process.env.STRIPE_SECRET_KEY) return { status: 'unavailable', error: 'Stripe غير مُهيّأ' };
    return { status: 'pending', ref: 'STRIPE', note: 'seam: أضف STRIPE_SECRET_KEY' };
  },
  paypal: async () => {
    if (!process.env.PAYPAL_CLIENT_ID) return { status: 'unavailable', error: 'PayPal غير مُهيّأ' };
    return { status: 'pending', ref: 'PAYPAL', note: 'seam: أضف PAYPAL_CLIENT_ID' };
  },
};

function methods() {
  return Object.keys(ADAPTERS).map(k => ({
    provider: k,
    available: ['cod', 'transfer', 'wallet'].includes(k) ||
      (k === 'cmi' && !!process.env.CMI_MERCHANT_ID) ||
      (k === 'stripe' && !!process.env.STRIPE_SECRET_KEY) ||
      (k === 'paypal' && !!process.env.PAYPAL_CLIENT_ID),
  }));
}

async function charge({ provider, userId, amount, currency = 'MAD', orderId, meta = {} } = {}) {
  const adapter = ADAPTERS[provider];
  if (!adapter) return { status: 'failed', error: 'طريقة دفع غير معروفة' };
  if (!(amount >= 0)) return { status: 'failed', error: 'مبلغ غير صالح' };
  const result = await adapter({ userId, amount, currency, orderId, meta });
  if (result.status === 'unavailable') return result;
  const payment = await db.createPayment({ userId, orderId, provider, amount, currency, status: result.status, ref: result.ref || '' });
  bus.publish({ version: 1, id: payment.id, type: `payment.${result.status}`, category: 'payment', businessId: userId ? `store:${userId}` : null, visibility: 'private', createdAt: new Date().toISOString(), payload: { provider, amount, orderId } });
  return { ...result, paymentId: payment.id };
}

async function confirm(paymentId, status = 'paid') {
  await db.updatePaymentStatus(paymentId, status);
  bus.publish({ version: 1, id: paymentId, type: `payment.${status}`, category: 'payment', visibility: 'private', createdAt: new Date().toISOString(), payload: { paymentId } });
  return { ok: true };
}

module.exports = { charge, confirm, methods, ADAPTERS };
