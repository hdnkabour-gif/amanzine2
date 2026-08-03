'use strict';
// ============================================================
// Payment Engine — واجهة موحّدة خلفها محوّلات (adapters) للطرق:
//   cod (دفع عند الاستلام) · wallet (محفظة) · transfer (تحويل بنكي)
//   cmi · stripe · paypal  (مقاعدُ مُعلَنةٌ لم تُكتب بعد — راجع ADAPTERS)
// كل الطبقات (حجز/طلب) تنادي charge() فقط → إضافة طريقة = adapter جديد
// بلا تغيير المستهلكين. يصدر أحداث payment.* على الـBus.
// ============================================================
const { db } = require('../../database');
const bus = require('./eventbus');

// ────────────────────────────────────────────────────────────
// كلُّ محوّلٍ يُعلن نفسَه: هل هو **مُنفَّذ**؟ وهل هو **مُهيَّأ**؟ سؤالان لا
// سؤالٌ واحد — وخلطُهما كان عطبًا حقيقيًّا:
//
//   المقاعدُ الثلاثة (cmi · stripe · paypal) كانت تُرجع `unavailable` حين
//   ينقص المفتاح، فإذا **ضبط التاجرُ المفتاح** رجعت `pending` — فيسجّل
//   `charge()` دفعةً في القاعدة ويُذيع `payment.pending` على الناقل، ولم
//   يُرسَل شيءٌ إلى أيّ بوّابة. أي أنّ التهيئةَ وحدَها كانت تُشغّل كذبة:
//   دفعاتٌ «قيد الانتظار» أبدًا، وزبونٌ ينتظر تحويلًا لم يبدأ.
//
//   القاعدة: **مقعدٌ غيرُ مُنفَّذٍ يبقى غيرَ متاحٍ مهما اكتملت البيئة.**
//   `implemented: false` لا يُبطله متغيّرُ بيئة. ويومَ يُكتب المحوّلُ فعلًا
//   تُقلَب الرايةُ مع الكود، لا قبلَه.
//
// شكلُ المحوّل: { implemented, configured(), charge({...}) }
// ────────────────────────────────────────────────────────────
const ADAPTERS = {
  // دفع عند الاستلام — يُنشأ كـ pending ويُؤكَّد عند التسليم
  cod: {
    implemented: true,
    configured: () => true,
    charge: async () => ({ status: 'pending', ref: 'COD' }),
  },

  // تحويل بنكي — pending حتى يؤكّد التاجرُ وصولَ المبلغ.
  // يُرجع بياناتِ الحساب إن ضبطها التاجر، وإلّا قال ذلك صراحةً: تحويلٌ بلا
  // رقمِ حسابٍ ليس طريقةَ دفعٍ بل طريقٌ مسدود.
  transfer: {
    implemented: true,
    configured: () => true,
    charge: async ({ userId }) => {
      let bank = null;
      try {
        const st = (await db.getSettings(userId)) || {};
        const b = st.payments && st.payments.bank;
        if (b && (b.rib || b.iban)) bank = { holder: b.holder || '', rib: b.rib || '', iban: b.iban || '', bankName: b.bankName || '' };
      } catch { /* الإعداداتُ تعذّرت — نُبلغ بالنقص لا نخترع حسابًا */ }
      return bank
        ? { status: 'pending', ref: 'BANK', instructions: bank }
        : { status: 'pending', ref: 'BANK', note: 'لا حسابَ بنكيٌّ مضبوطٌ في الإعدادات — الزبون لن يعرف أين يحوّل' };
    },
  },

  // المحفظة — خصم فوري إن كفى الرصيد
  wallet: {
    implemented: true,
    configured: () => true,
    charge: async ({ userId, amount }) => {
      if (!userId) return { status: 'failed', error: 'مستخدم مطلوب' };
      const r = await db.walletApply(userId, { type: 'payment', amount: -Math.abs(amount), note: 'دفع من المحفظة' });
      return r.ok ? { status: 'paid', ref: 'WALLET' } : { status: 'failed', error: r.error };
    },
  },

  // ── مقاعدُ بوّاباتٍ خارجيّة: مُعلَنةٌ ولم تُكتب بعد ──
  //    تحتاج عقدَ تاجرٍ مع البنك/المزوّد، لا سطرَ كودٍ فقط.
  cmi: {
    implemented: false,
    configured: () => !!process.env.CMI_MERCHANT_ID && !!process.env.CMI_STORE_KEY,
    charge: async () => ({ status: 'unavailable', error: 'CMI: المحوّل لم يُكتب بعد' }),
  },
  stripe: {
    implemented: false,
    configured: () => !!process.env.STRIPE_SECRET_KEY,
    charge: async () => ({ status: 'unavailable', error: 'Stripe: المحوّل لم يُكتب بعد' }),
  },
  paypal: {
    implemented: false,
    configured: () => !!process.env.PAYPAL_CLIENT_ID,
    charge: async () => ({ status: 'unavailable', error: 'PayPal: المحوّل لم يُكتب بعد' }),
  },
};

/** هل تُقبَل هذه الطريقةُ الآن؟ مُنفَّذةٌ **و** مُهيَّأة. مصدرٌ واحدٌ للجواب. */
function isAvailable(k) {
  const a = ADAPTERS[k];
  return !!a && a.implemented === true && a.configured() === true;
}

/**
 * الطرقُ وحالتُها — بثلاثِ حقائقَ منفصلة، فالواجهةُ تعرف **لماذا** لا تتاح
 * طريقةٌ ما: أهي بلا كودٍ أم بلا مفتاح؟ الجمعُ بينهما كان يُخفي الفرق.
 */
function methods() {
  return Object.keys(ADAPTERS).map(k => ({
    provider: k,
    available: isAvailable(k),
    implemented: ADAPTERS[k].implemented,
    configured: ADAPTERS[k].configured(),
  }));
}

async function charge({ provider, userId, amount, currency = 'MAD', orderId, meta = {} } = {}) {
  const adapter = ADAPTERS[provider];
  if (!adapter) return { status: 'failed', error: 'طريقة دفع غير معروفة' };
  if (!(amount >= 0)) return { status: 'failed', error: 'مبلغ غير صالح' };
  // البوّابةُ تُغلَق هنا لا داخلَ المحوّل: مقعدٌ غيرُ مُنفَّذٍ لا يُنشئ سجلَّ
  // دفعةٍ ولا يُذيع حدثًا، مهما قال متغيّرُ البيئة.
  if (!isAvailable(provider)) {
    return {
      status: 'unavailable',
      error: !adapter.implemented
        ? `${provider}: المحوّل لم يُكتب بعد`
        : `${provider}: غيرُ مُهيّأ — تنقص الاعتمادات`,
    };
  }
  const result = await adapter.charge({ userId, amount, currency, orderId, meta });
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

module.exports = { charge, confirm, methods, isAvailable, ADAPTERS };
