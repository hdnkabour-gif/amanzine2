'use strict';

// ============================================================
// المزامنةُ الدوريّة — أن تصل الحالةُ وحدَها.
//
//   ── العطبُ الذي وُلدت منه، مقيسًا ──
//   `delivery_status` لم يكن يتغيّر إلّا بأحد طريقين: أن يضغط **التاجرُ**
//   زرًّا في لوحته، أو أن ترسل الشركةُ إشعارًا **وكان التاجرُ قد أعدّه**
//   (وأكثرُ الشركات لا تُقدّم إشعارات أصلًا). فالزبونُ الذي يبحث بكوده في
//   واجهة المتجر يرى حالةً **مجمّدةً عند لحظة الإنشاء** — والشركةُ تعرف أنّ
//   طردَه خرج للتوزيع منذ ساعتين.
//
//   وثلاثةُ مزوّدين يُعلنون `tracking:'api'` وقادرون على الجواب. القدرةُ
//   كانت مبنيّةً ولا يستدعيها أحدٌ إلّا بإصبع.
//
//   ── الحدود، وكلُّها من واقعٍ لا من حذر ──
//   ① **لا نُخمّن حالةً.** كلمةٌ لا يعرفها `deliveryStatus` تُحفَظ نصًّا ولا
//      تُحرّك دورةَ حياة الطلب. تخمينُ «مُسلَّم» يُقفل طلبًا لم يصل صاحبَه.
//   ② **لا نستفتي المنتهي.** المُسلَّمُ والملغى لا يتغيّران.
//   ③ **سقفٌ لكلّ دورة.** Olivraison تحدّ خمسةَ طلباتٍ في الثانية، فبينَ كلِّ
//      نداءَين مهلة. ودفعةٌ من ٤٠ شحنةً تكفي دورةً كلَّ نصف ساعة.
//   ④ **الشركةُ تُقرأ في كلّ مرّة** من إعداد التاجر: قد يكون عطّلها أو بدّل
//      مفتاحَها بين دورتَين، والصفُّ المحفوظ في الطلب قديم.
// ============================================================

const registry = require('../services/delivery/registry');
const { normalizeDeliveryStatus, TERMINAL } = require('./deliveryStatus');

/** مهلةٌ بين النداءات — أدنى من سقفِ أشدّ الشركات صرامة (٥/ثانية). */
const GAP_MS = 250;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * يزامن شحنةً واحدة. **دالّةٌ خالصةُ الأثر**: تقرأ وتكتب ولا تُقرّر جدولةً —
 * فتُختبَر وحدَها بلا مؤقّت.
 *
 * @returns {Promise<{ok:boolean, changed?:boolean, status?:string, reason?:string}>}
 */
async function syncOrder(db, order) {
  const shipmentId = order.providerShipmentId || order.livoOrderId || '';
  if (!shipmentId) return { ok: false, reason: 'بلا معرّفِ شحنةٍ لدى الشركة' };

  const provs = (await db.getDeliveryProviders(order.userId) || []).filter(p => p.enabled);
  // نفسُ اختيار `shipmentAttempt`: الشركةُ التي شُحن بها إن كانت لا تزال
  // مفعّلة، وإلّا الأولى. ولا نستفتي شركةً لم تُنشئ هذه الشحنة إن وُجدت صاحبتُها.
  const row = provs.find(p => p.name === order.deliveryProvider) || provs[0];
  if (!row) return { ok: false, reason: 'لا شركةَ مفعّلة' };

  const plugin = registry.get(row.apiType);
  if (!plugin || plugin.capabilities?.tracking !== 'api' || typeof plugin.trackShipment !== 'function') {
    return { ok: false, reason: `${row.name} لا تُقدّم تتبّعًا عبر API` };
  }

  const result = await plugin.trackShipment(shipmentId, row);
  if (!result?.success) return { ok: false, reason: result?.error || 'تعذّر جلب الحالة' };

  const raw = String(result.status || '');
  const mapped = normalizeDeliveryStatus(raw);
  const patch = { deliveryStatus: raw, deliverySyncedAt: new Date().toISOString() };
  // حالةُ الطلب لا تتغيّر إلّا عند تطبيعٍ مفهوم — ولا ترتدّ إلى الوراء.
  const moved = mapped && mapped !== order.status;
  if (moved) patch.status = mapped;
  await db.updateOrder(order.id, patch);

  if (moved) {
    await db.addLog({
      userId: order.userId, user: 'System',
      action: `🔄 مزامنة ${row.name}: ${order.id}`,
      details: `${raw || '—'} ⇒ ${mapped}`, type: 'delivery', severity: 'info',
    });
    if (mapped === 'delivered') {
      await db.addNotification({
        userId: order.userId, type: 'success',
        message: `📦 وصل الطلب ${order.id} إلى الزبون`,
      });
    }
  }
  return { ok: true, changed: !!moved, status: raw };
}

/**
 * دورةٌ واحدة. تُستدعى من المؤقّت ومن الاختبار سواءً — فما يُقاس هو ما يعمل.
 * @returns {Promise<{checked:number, changed:number, failed:number}>}
 */
async function runCycle(db, { minutes = 30, limit = 40 } = {}) {
  const due = await db.getOrdersDueForTrackingSync(minutes, limit);
  let changed = 0, failed = 0;
  for (const order of due) {
    // حارسُ الحالة النهائيّة مكرَّرٌ هنا عن قصد: الاستعلامُ يُصفّي، وهذه
    // تحمي من نداءٍ مباشرٍ بقائمةٍ لم تمرّ به.
    if (TERMINAL.has(String(order.status || ''))) continue;
    try {
      const r = await syncOrder(db, order);
      if (r.ok && r.changed) changed++;
      else if (!r.ok) failed++;
    } catch { failed++; }
    await sleep(GAP_MS);
  }
  return { checked: due.length, changed, failed };
}

module.exports = { syncOrder, runCycle, GAP_MS };
