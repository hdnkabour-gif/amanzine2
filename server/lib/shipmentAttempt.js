'use strict';

// ============================================================
// محاولةُ الشحن — **مسارٌ واحدٌ** يسلكه التاجرُ حين يضغط، ويسلكه المُعيد.
//
//   ── لماذا خرج من المسار ──
//   `routes/delivery.js` كان يملك المحاولةَ كلَّها داخل مُعالِج HTTP: ترجمةُ
//   المدينة، وإثراءُ البنود بالـSKU، وحلُّ المزوّد، والكتابةُ عند النجاح،
//   والسقوطُ إلى الإدخال اليدويّ. فلمّا لزم إعادةُ المحاولة آليًّا لم يكن
//   أمامَ الإعادة إلّا نسخُ الشيءِ نفسِه — نسختان تتباعدان عند أوّل تعديل،
//   والفارقُ بينهما يظهر في شحنةٍ حقيقيّةٍ لزبونٍ حقيقيّ.
//
//   ── والعطبُ الذي وُلد من أجله ──
//   `lib/retryQueue.js` بُني ومعه اختبارُه، **ولم يستدعِه أحد**. فكان أيُّ
//   عطبٍ عابرٍ لدى الشركة (مهلة · 503 · انقطاعُ شبكة) يُعامَل معاملةَ العطب
//   الدائم: «سجّل الطلبَ في موقع الشركة يدويًّا وأدخل رقمَ التتبّع». أي أنّ
//   دقيقتَي انقطاعٍ تُحوَّلان عملًا يدويًّا على التاجر — والشحنةُ قد لا تُرسَل
//   أبدًا إن انشغل. الطابورُ يميّز العابرَ من الدائم، وهذا الملفّ يُنفّذ حكمَه.
//
//   ── حدُّه ──
//   لا يقرّر شيئًا بنفسه: `retryQueue.decide` وحدَه يقول أيُعاد أم لا ومتى.
//   وهذا الملفّ ينفّذ ويكتب. فمن أراد تغييرَ سياسة الإعادة يغيّر ملفًّا واحدًا.
// ============================================================

const { db } = require('../database');
const registry = require('../services/delivery/registry');
const cityEngine = require('./cityEngine');
const { decide } = require('./retryQueue');

/** أقصى ما يُحاوَل قبل أن يُطلَب الإدخالُ اليدويّ. */
const MAX_ATTEMPTS = 5;

/**
 * يحاول إنشاءَ شحنةٍ حقيقيّة، ويكتب النتيجةَ في الطلب.
 *
 * @param {object} p
 * @param {string} p.userId صاحبُ الطلب — نطاقُ كلِّ قراءةٍ وكتابة.
 * @param {object} p.order  الطلبُ كما هو في القاعدة.
 * @param {object} p.prov   صفُّ شركة التوصيل المختارة.
 * @param {object} p.settings إعداداتُ التاجر (العملة…).
 * @param {number} p.attempts كم مرّةً حوولت هذه الشحنةُ من قبل.
 * @returns {Promise<{real:boolean, tracking:string, via?:string, steps:object[],
 *                    needsManual?:boolean, retryAt?:string, apiError?:string}>}
 */
async function runShipment({ userId, order, prov, settings, attempts = 0 }) {
  const failures = [];
  const steps = [];
  const currency = settings?.brand?.currency || 'MAD';

  // ترجمةُ المدينة إلى مُعرِّفِ الشركة قبل الإرسال. التاجرُ كتب «كازا» أو
  // «الدار البيضاء»؛ الشركةُ تريد 18. غيابُ الخريطة ليس عطبًا — نُرسل الاسمَ
  // كما كان ونُسجّل الملاحظة.
  const canonical = cityEngine.resolve(order.city);
  let externalCityId = null;
  if (canonical) {
    try { externalCityId = await db.getExternalCityId(userId, prov.id, canonical.id); }
    catch { /* الخريطةُ اختياريّة */ }
  }
  if (canonical && !externalCityId) {
    steps.push({
      label: `مدينة «${canonical.name}» بلا مُعرِّفٍ لدى ${prov.name}`,
      ok: true,
      detail: 'يُرسَل الاسمُ نصًّا — زامِن المدن من صفحة التوصيل لدقّةٍ أعلى',
    });
  }

  // ── إثراءُ البنود بالـSKU ─────────────────────────────────────
  // بعضُ الشركات تطلب مُعرِّفَ منتجٍ من كتالوجها هي، والجسرُ الوحيدُ إليه حقلُ
  // «مرجع الزبون» — أي الـSKU عندنا. البنودُ تحمل `productId` ولا تحمل الـSKU،
  // فيُقرأ هنا مرّةً واحدة. المزوّدُ يبقى نقيًّا: لا قاعدةَ بياناتٍ في ملفّ شركة.
  let enrichedItems = order.items || [];
  try {
    const catalog = await db.getProducts(userId);
    const bySku = new Map(catalog.map(p => [p.id, p.sku]));
    enrichedItems = enrichedItems.map(it => ({ ...it, sku: it.sku || bySku.get(it.productId) || '' }));
  } catch { /* الإثراءُ تحسينٌ لا شرط */ }

  const chosen = registry.resolve(prov);
  if (chosen) {
    const plugin = chosen.handler;
    const label = `إرسال بيانات الشحنة إلى ${prov.name} (${chosen.label})`;
    try {
      const result = await plugin.createShipment(
        {
          ...order,
          items: enrichedItems,
          currency,
          // المزوّدُ يُفضّل المُعرِّفَ إن وُجد، ويقع على الاسم إن لم يوجد.
          cityId: externalCityId || undefined,
          cityName: canonical?.name || order.city,
        },
        prov
      );
      if (result.success) {
        const realTracking = result.trackingNumber || result.shipmentId || '';
        steps.push({ label, ok: true, detail: plugin.meta.id });
        steps.push({ label: 'استلام رقم التتبع من الشركة', ok: true, detail: realTracking });
        await db.updateOrder(order.id, {
          status: 'processing',
          trackingNumber: realTracking,
          deliveryProvider: prov.name,
          providerId: plugin.meta.id,
          // مُعرِّفُ المدينة عند الشركة يُحفَظ في الطلب: بعد سنةٍ تبقى الشحنةُ
          // قابلةً لإعادة البناء حتى لو تغيّرت خرائطُ المدن أو الشركةُ نفسُها.
          providerCityId: externalCityId || '',
          providerShipmentId: result.shipmentId || '',
          // العمودُ القديم يُملأ معه حتى تتوقّف القراءاتُ القديمة عنه.
          livoOrderId: result.shipmentId || '',
          // النجاحُ يُطفئ الإعادة — وإلّا بقي الطلبُ يُعاد بعد أن شُحن.
          deliveryStatus: '',
          deliveryRetryAt: null,
          deliveryAttempts: 0,
        });
        await db.addLog({
          userId, user: 'System',
          action: `✅ شحنة حقيقية عبر ${chosen.label}: ${order.id}`,
          details: `تتبع: ${realTracking}${attempts ? ` (بعد ${attempts} محاولة)` : ''}`,
          type: 'delivery', severity: 'success',
        });
        await db.addNotification({
          userId, type: 'success',
          message: `📦 أُنشئت شحنة حقيقية لدى ${prov.name} — تتبع: ${realTracking}`,
        });
        return { real: true, tracking: realTracking, via: plugin.meta.id, steps };
      }
      failures.push(`${chosen.label}: ${result.error}`);
      steps.push({ label, ok: false, error: result.error });
    } catch (e) {
      console.error(`[Delivery/${plugin.meta.id}]`, e.message);
      failures.push(`${chosen.label}: ${e.message}`);
      steps.push({ label, ok: false, error: e.message });
    }
  }

  // ── فشل: أعابرٌ فيُعاد، أم دائمٌ فيُطلَب الإنسان؟ ────────────────
  const why = failures.length ? failures.join(' · ')
    : 'لا يوجد مفتاح API أو Webhook مهيأ لهذه الشركة';
  if (!failures.length) {
    steps.push({
      label: `لا قناة ربط حقيقية مهيأة لشركة ${prov.name}`, ok: false,
      error: 'أضف مفتاح API أو Webhook من صفحة التوصيل، أو استخدم الإدخال اليدوي',
    });
  }

  const verdict = decide({ error: why, attempts, maxAttempts: MAX_ATTEMPTS });
  if (verdict.retry) {
    steps.push({
      label: 'عطبٌ عابرٌ لدى الشركة — سنُعيد المحاولةَ تلقائيًّا', ok: true,
      detail: `${verdict.reason} · التالية: ${new Date(verdict.nextAttemptAt).toLocaleString('ar-MA')}`,
    });
    await db.updateOrder(order.id, {
      status: 'processing',
      deliveryProvider: prov.name,
      deliveryStatus: 'retry_scheduled',
      deliveryRetryAt: verdict.nextAttemptAt,
      deliveryAttempts: attempts + 1,
      trackingNumber: '',
    });
    await db.addLog({
      userId, user: 'System',
      action: `🔁 إعادةُ محاولةٍ مجدوَلة: ${order.id}`,
      details: `${prov.name} — ${verdict.reason} — السبب: ${why}`,
      type: 'delivery', severity: 'warning',
    });
    // إشعارٌ واحدٌ عند أوّل جدولةٍ فقط: التاجرُ لا يحتاج خمسَ رسائلَ عن
    // انقطاعٍ لا يدَ له فيه، ويحتاج أن يعرف أنّ الطلبَ ليس منسيًّا.
    if (attempts === 0) {
      await db.addNotification({
        userId, type: 'info',
        message: `🔁 طلب ${order.id}: ${prov.name} ما جاوبتش دابا — غانعاودو بوحدنا، ما تدير والو.`,
      });
    }
    return { real: false, tracking: '', steps, retryAt: verdict.nextAttemptAt, apiError: why };
  }

  // ── لا رقمَ تتبّعٍ مُفبرك ───────────────────────────────────────
  //   كان يُولَّد `TRK-XXXXXX` ويُكتَب في **نفس حقل** رقمِ التتبّع الحقيقيّ،
  //   فيظهر أخضرَ في بطاقة الطلب ويُطبَع على الفاتورة التي تُسلَّم للزبون.
  //   `trackingNumber` معناه من الآن واحدٌ لا ثانيَ له: رقمٌ جاء من شركةِ
  //   توصيل. وحين لا نُرسل، نقول إنّنا لم نُرسل ونطلب الإدخالَ اليدويّ.
  steps.push({
    label: 'لم يُولَّد رقمُ تتبّع — لم تُرسَل الشحنةُ فعلًا', ok: false,
    error: 'أدخل الرقمَ من موقع الشركة بعد تسجيل الطلب فيه',
  });
  await db.updateOrder(order.id, {
    status: 'processing',
    deliveryProvider: prov.name,
    deliveryStatus: 'manual_required',
    deliveryRetryAt: null,
    deliveryAttempts: attempts,
    trackingNumber: '',
  });
  await db.addLog({
    userId, user: 'System',
    action: `⚠️ لم تُرسَل — إدخالٌ يدويٌّ مطلوب: ${order.id}`,
    details: `${prov.name} — ${verdict.reason} — السبب: ${why}`,
    type: 'delivery', severity: 'warning',
  });
  await db.addNotification({
    userId, type: 'warning',
    message: `⚠️ طلب ${order.id}: لم يُرسل لشركة ${prov.name} — سجّله في موقعها وأدخل رقمَ التتبّع (السبب: ${why})`,
  });
  return { real: false, tracking: '', steps, needsManual: true, apiError: why };
}

module.exports = { runShipment, MAX_ATTEMPTS };
