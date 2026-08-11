'use strict';
const { validateOrder, sanitizeBody } = require('../middleware/validate');
const router = require('express').Router();
const auth   = require('../middleware/auth');
const crypto = require('crypto');
const { db } = require('../database');
const mailer = require('../lib/mailer');
const verify = require('../lib/verify');
const orderVerification = require('../lib/orderVerification');
const sync   = require('../sync');
const fetch  = require('node-fetch');
const { resolveDeliveryFee } = require('../lib/deliveryPricing');
const { runShipment } = require('../lib/shipmentAttempt');
const { attachCosts } = require('../lib/orderCosting');
const logger = require('../lib/logger');

let pushNotify;
try { pushNotify = require('../routes/push').notifyUser; } catch { pushNotify = () => Promise.resolve(); }

// الطلبُ آخرُ مرحلةٍ في القمع (بديلُ الدفع حتى تُربَط أحداثُه). كان يُنشَأ من
// موضعين ولا يُصدَر من أيّهما، فبقيت `orderRate` في «عقل AMANZINE» صفرًا مهما
// بيع. مُصدِرٌ واحدٌ هنا يخدم المسارين — لا نسختان تتباعدان.
function emitOrderCreated(userId, order, source) {
  try {
    require('../lib/engines/activity').emit({
      businessId: `store:${userId}`, actor: 'visitor',
      type: 'order.created', category: 'order', visibility: 'private',
      city: order?.city || null,
      payload: { orderId: order?.id, total: +order?.total || 0, source: source || order?.source || '', ownerId: userId },
    });
  } catch { /* القياسُ لا يُسقط طلبًا حقيقيًّا */ }
}

router.get('/', auth, async (req, res) => {
  try { res.json(await db.getOrders(req.user.id)); }
  catch (e) { console.error('[orders]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, sanitizeBody, async (req, res) => {
  try {
    const items = await attachCosts(db, req.user.id, req.body.items);
    const order = await db.createOrder({ ...req.body, items, userId: req.user.id, status: 'pending' });
    await db.addLog({ userId: req.user.id, user: 'AI', action: `New order: ${order.id}`, details: order.customerName, type: 'order', severity: 'info' });
    await db.addNotification({ userId: req.user.id, type: 'info', message: `🛒 طلب جديد من ${order.customerName}` });
    emitOrderCreated(req.user.id, order, 'dashboard');
    sync.syncOrder(req.user.id, order).catch(() => {});
    const settings = await db.getSettings(req.user.id) || {};
    pushNotify(req.user.id, '🛒 طلب جديد!', `${order.customerName} — ${order.total || 0} ${settings.brand?.currency || 'MAD'}`, { url: '/orders' }).catch(() => {});
    req.app.get('broadcast')?.(req.user.id, { event: 'order_created', data: order });
    res.status(201).json(order);
  } catch (e) { console.error('[orders]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const o = await db.getOrder(req.params.id);
    if (!o || o.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    res.json(o);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const o = await db.getOrder(req.params.id);
    if (!o || o.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    res.json(await db.updateOrder(o.id, { ...req.body, userId: req.user.id }));
  } catch (e) {
    console.error('[orders]', e.message);
    // ── **خطأُ مُدخَلٍ لا يُقدَّم خطأَ خادم** ──────────────────────
    //   كشفته رحلةٌ ذهبيّة: `status: 'حالةٌ مخترَعة'` كان يعود **500 Server
    //   error**. والقاعدةُ ترفضه بحقٍّ (قيدُ RC-P5)، لكنّ الجوابَ يقول
    //   للعميل «العطبُ عندي» وهو عنده — فيُعاد الطلبُ ويُفتَح بلاغٌ عن
    //   خادمٍ سليم. و`23514` هو رمزُ مخالفةِ قيدٍ في PostgreSQL.
    if (e.code === '23514') {
      return res.status(400).json({ error: 'قيمةٌ غيرُ مقبولة — تحقّق من حالة الطلب والمبالغ' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// -- مُرسِلٌ واحدٌ للبريد --
//   كانت هنا نسخةٌ ثانيةٌ من نداء Brevo بمهلتها ومعالجةِ أخطائها. نفسُ درسِ
//   مُرسِل واتساب الذي كُتب أربع مرّات: أيُّ إصلاحٍ يجب أن يُطبَّق مرّتين،
//   وأوّلُ من يُنسى هو الثاني. و`lib/mailer` يقبل الآن مفتاحَ تاجرٍ فتخرج
//   رسالتُه باسمه هو لا باسم المنصّة.
const _sendBrevoEmail = (apiKey, toEmail, toName, subject, html) =>
  mailer.send({ apiKey, to: toEmail, toName, subject, html }).then(r => r.sent);


// ── **لماذا فشل، لا أنّه فشل** ──────────────────────────────────
//
//   كان الجوابُ يُختصَر إلى `true/false` ويُرمى `error-codes`. فمفتاحٌ سرّيٌّ
//   خاطئ، ومفتاحان من حسابَين مختلفَين، ورمزٌ منتهٍ، وانقطاعُ شبكةٍ عنّا، وآلةٌ
//   حقيقيّة — **كلُّها تبدو شيئًا واحدًا**. فيُقال للزبون «فشل التحقق الأمني»
//   وهو إنسانٌ ضغط المربّعَ ورآه أخضر، ولا أحدَ يعرف السبب: لا هو ولا التاجر
//   ولا نحن.
//
//   والتصنيفُ يغيّر القرار، لا العبارةَ فقط:
//     · `ours`  — عطبٌ عندنا أو في إعداد التاجر ⇒ **لا يدفع ثمنَه الزبون**
//     · `stale` — الرمزُ استُهلك أو انتهت مدّتُه ⇒ يُطلَب مربّعٌ جديد
//     · `bot`   — رفضٌ حقيقيّ ⇒ يُمنع
const CAPTCHA_OURS = new Set([
  'invalid-input-secret',      // التاجرُ لصق سرًّا خاطئًا
  'sitekey-secret-mismatch',   // المفتاحان من حسابَين مختلفَين — والمربّعُ يخضرّ رغم ذلك
  'not-using-dummy-secret',    // نفسُ المعنى في وضع الاختبار (مقيسٌ من ردّ hCaptcha)
  'bad-request', 'missing-input-secret',
]);
const CAPTCHA_STALE = new Set([
  'invalid-input-response', 'timeout-or-duplicate', 'missing-input-response',
  'expired-input-response',
]);

function _verifyHCaptcha(secret, token) {
  return new Promise(resolve => {
    const httpsH = require('https');
    const form = `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token || '')}`;
    const done = (ok, codes, kind) => resolve({ ok, codes: codes || [], kind: kind || null });
    const r = httpsH.request({ hostname: 'api.hcaptcha.com', path: '/siteverify', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) } },
      rs => {
        let d = '';
        rs.on('data', c => d += c);
        rs.on('end', () => {
          let body;
          try { body = JSON.parse(d); } catch { return done(false, ['unreadable-response'], 'ours'); }
          if (body.success) return done(true);
          const codes = Array.isArray(body['error-codes']) ? body['error-codes'] : [];
          const kind = codes.some(c => CAPTCHA_OURS.has(c)) ? 'ours'
            : codes.some(c => CAPTCHA_STALE.has(c)) ? 'stale' : 'bot';
          done(false, codes, kind);
        });
      });
    // الشبكةُ عطبُنا لا عطبُ الزبون — ولا يجوز أن يُقفَل الطلبُ لأنّنا لم نصل.
    r.on('error', (e) => done(false, [`network:${e.code || 'error'}`], 'ours'));
    r.setTimeout(8000, () => { r.destroy(); done(false, ['network:timeout'], 'ours'); });
    r.write(form); r.end();
  });
}

async function _notifyCustomer(userId, order, stage) {
  try {
    if (!order?.customerPhone) return;
    const st = await db.getSettings(userId) || {};
    if (st.delivery?.notifyCustomerOnShip === false) return;
    const cur = st.brand?.currency || 'MAD';
    const store = st.brand?.name || 'متجرنا';
    const texts = {
      approved:  `مرحباً ${order.customerName}! ✅\nتم تأكيد طلبك ${order.id} (${order.total} ${cur}) وجارٍ تجهيزه.\nسنبلغك فور الشحن 🚚\n— ${store}`,
      delivered: `${order.customerName}، وصل طلبك ${order.id}! 🎉\nنتمنى أن ينال إعجابك. شكراً لثقتك بـ${store} 🙏`,
    };
    const msg = texts[stage];
    if (!msg) return;
    const token = st.social?.whatsapp?.accessToken, phoneId = st.social?.whatsapp?.pageId;
    const to = order.customerPhone.replace(/\D/g, '');
    if (token && phoneId) {
      const body = JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: msg } });
      const httpsN = require('https');
      await new Promise(resolve => {
        const r = httpsN.request({ hostname: 'graph.facebook.com', path: `/v19.0/${phoneId}/messages`, method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body) } },
          res => { res.resume(); resolve(res.statusCode < 300); });
        r.on('error', () => resolve(false)); r.setTimeout(8000, () => { r.destroy(); resolve(false); });
        r.write(body); r.end();
      });
      await db.addLog({ userId, user: 'System', action: `📣 إشعار واتساب تلقائي للزبون (${stage === 'approved' ? 'تأكيد' : 'توصيل'}): ${order.id}`, details: to, type: 'notification', severity: 'success' });
    } else {
      await db.addNotification({ userId, type: 'info', message: `📣 أشعر ${order.customerName} ${stage === 'approved' ? 'بالتأكيد' : 'بالوصول'} يدوياً: https://wa.me/${to} — (اربط واتساب API للإرسال التلقائي)` });
    }
  } catch (e) { console.warn('[notifyCustomer]', e.message); }
}

router.put('/:id/approve', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.id);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });

    await db.updateOrder(order.id, { userId: req.user.id, status: 'approved' });

    if (order.customerId) {
      const customer = await db.getCustomer(order.customerId);
      if (customer) await db.updateCustomer(order.customerId, {
        totalOrders: (customer.totalOrders || 0) + 1,
        totalSpent: (customer.totalSpent || 0) + (order.total || 0),
        lastOrderDate: new Date().toISOString().split('T')[0],
      });
    }

    for (const item of (order.items || [])) {
      if (!item.productId) continue;
      const p = await db.getProduct(item.productId);
      if (p && p.userId === req.user.id) await db.updateProduct(p.id, {
        stock: Math.max(0, (p.stock || 0) - (item.quantity || 1)),
        sales: (p.sales || 0) + (item.quantity || 1),
      });
    }

    _notifyCustomer(req.user.id, { ...order, status: 'approved' }, 'approved');

    const settings = await db.getSettings(req.user.id) || {};
    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled);
    console.log(`[Orders] Auto-delivery check: autoSendOnApproval=${settings.delivery?.autoSendOnApproval}, providers count=${providers.length}`);

    // ── الإرسالُ التلقائيُّ عند الموافقة ──────────────────────────
    //
    //   كان هذا الفرعُ **ينادي الخادمَ نفسَه عبر HTTP**:
    //       fetch(`${req.protocol}://${req.get('host')}/api/delivery/create/…`)
    //   وهي أهشُّ طريقةٍ ممكنة لاستدعاء دالّةٍ في نفس العمليّة:
    //     · `req.protocol` خلف وسيطٍ يُعطي `http` بينما المنصّةُ تفرض HTTPS،
    //       فيُعاد التوجيهُ أو يُرفَض الطلبُ — والتاجرُ لا يرى إلّا صمتًا.
    //     · تُعاد المصادقةُ ويُعاد تحليلُ الطلب من الصفر بلا داعٍ.
    //     · وهو **مسارُ شحنٍ ثانٍ** — والمشروعُ وحّد المسارَ في
    //       `lib/shipmentAttempt` بعد أن كلّفته نسختان تتباعدان.
    //
    //   النداءُ الآن مباشرٌ إلى نفس الدالّة التي يسلكها الزرُّ والمُعيدُ
    //   الدوريّ. ثلاثةُ أبوابٍ، ومسارُ شحنٍ واحد.
    if (settings.delivery?.autoSendOnApproval && providers.length > 0) {
      try {
        const prov = providers.find(p => p.name === settings.delivery?.defaultProvider) || providers[0];
        const out = await runShipment({
          userId: req.user.id, order, prov, settings,
          attempts: Number(order.deliveryAttempts || 0),
        });
        await db.addLog({
          userId: req.user.id, user: 'System',
          action: out.real
            ? `🚚 شحنٌ تلقائيٌّ عند الموافقة: ${order.id}`
            : `⚠️ الشحنُ التلقائيُّ لم ينجح: ${order.id}`,
          details: out.real
            ? `${prov.name} · تتبّع ${out.tracking}`
            : (out.retryAt ? `سيُعاد على ${out.retryAt}` : (out.apiError || 'بلا سبب')),
          type: 'delivery', severity: out.real ? 'success' : 'warning',
        });
      } catch (e) {
        console.error('[Orders] auto-delivery:', e.message);
        await db.addLog({
          userId: req.user.id, user: 'System',
          action: `Auto-delivery exception for order ${order.id}`,
          details: e.message, type: 'delivery', severity: 'error',
        });
      }
    } else {
      console.log('[Orders] Auto-delivery skipped: conditions not met');
    }

    if (order.customerId && order.total > 0) {
      try { await db.addLoyaltyPoints(req.user.id, order.customerId, order.total); } catch(e) {}
    }
    await db.addLog({ userId: req.user.id, user: 'Manager', action: `Approved order: ${order.id}`, details: order.customerName, type: 'order', severity: 'success' });
    await db.addNotification({ userId: req.user.id, type: 'success', message: `✅ تم تأكيد طلب ${order.customerName}` });

    const approveSettings = settings;
    const waToken = approveSettings.social?.whatsapp?.accessToken;
    const waPhoneId = approveSettings.social?.whatsapp?.pageId;
    const refreshedOrder = await db.getOrder(order.id);
    // العنوانُ العامّ للمنصّة — منه يُبنى رابطُ التتبّع. `PRODUCTION_URL` أوّلًا
    // (نطاقُ التاجر إن وُجد) ثمّ نطاقُ المنصّة.
    const trackBase = process.env.PRODUCTION_URL
      || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');
    const cur2 = approveSettings.brand?.currency || 'MAD';
    const brandName2 = approveSettings.brand?.name || 'المتجر';
    const itemsList2 = (refreshedOrder?.items||[]).map((i,idx) =>
      `${idx+1}. ${i.productName}${i.size?' ('+i.size+')':''}${i.color?' — '+i.color:''} × ${i.quantity||1} = ${((i.price||0)*(i.quantity||1)).toLocaleString()} ${cur2}`
    ).join('\n');

    const invoice = [
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🛍️ *${brandName2}*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ *تم تأكيد طلبك!*`,
      ``,
      `👤 *الزبون:* ${refreshedOrder?.customerName}`,
      `📱 *الهاتف:* ${refreshedOrder?.customerPhone}`,
      `📍 *المدينة:* ${refreshedOrder?.city||'—'}`,
      `🏠 *العنوان:* ${refreshedOrder?.address||'—'}`,
      ``,
      `📦 *المنتجات:*`,
      itemsList2,
      ``,
      `💰 *المجموع:* ${(refreshedOrder?.total||0).toLocaleString()} ${cur2}`,
      `🔖 *رقم الطلب:* ${refreshedOrder?.id}`,
      `🔑 *كود التتبع:* *${refreshedOrder?.customerCode||'—'}*`,
      ``,
      // ── الرابطُ لا الكودُ وحدَه ──────────────────────────────────
      //   كانت الرسالةُ تقول «احتفظ بالكود لمتابعة طلبك» **ولا صفحةَ يُدخَل
      //   فيها**: وعدٌ في رسالةٍ بلا بابٍ يفي به. والرابطُ يحمل هويّةَ المتجر
      //   والكودَ معًا، فيصل الزبونُ بضغطةٍ لا بنسخٍ ولصق.
      ...(trackBase
        ? [`🔗 تبّع طلبك: ${trackBase}/track/${req.user.id}?code=${encodeURIComponent(refreshedOrder?.customerCode||'')}`]
        : [`📌 _احتفظ بكود التتبع لمتابعة طلبك_`]),
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `🚚 سيتم الشحن خلال 24-48 ساعة`,
      `شكراً لثقتك! 🙏`,
    ].join('\n');

    await db.updateOrder(order.id, { userId: req.user.id, notes: (refreshedOrder?.notes||'') + '\n[INVOICE]' + invoice });

    if (waToken && waPhoneId && refreshedOrder?.customerPhone) {
      try {
        const body2 = JSON.stringify({ messaging_product:'whatsapp', to:refreshedOrder.customerPhone.replace(/\s/g,''), type:'text', text:{ body:invoice } });
        const https2 = require('https');
        const r2 = https2.request({ hostname:'graph.facebook.com', path:'/v19.0/' + waPhoneId + '/messages', method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + waToken, 'Content-Length':Buffer.byteLength(body2) } }, res=>res.resume());
        r2.on('error',()=>{}); r2.write(body2); r2.end();
      } catch {}
    } else {
      const waPhone = (refreshedOrder?.customerPhone||'').replace(/\D/g,'');
      if (waPhone) {
        await db.updateOrder(order.id, { userId: req.user.id, notes: (refreshedOrder?.notes||'') + '\n[WA_URL]https://wa.me/' + waPhone + '?text=' + encodeURIComponent(invoice) });
      }
    }
    const finalOrder = await db.getOrder(order.id);
    sync.syncOrder(req.user.id, finalOrder).catch(() => {});
    req.app.get('broadcast')?.(req.user.id, { event: 'order_updated', data: finalOrder });
    res.json(finalOrder);
  } catch (e) { console.error('[orders/approve]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/reject', auth, async (req, res) => {
  try {
    const o = await db.getOrder(req.params.id);
    if (!o || o.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await db.updateOrder(o.id, { userId: req.user.id, status: 'cancelled' });
    await db.addLog({ userId: req.user.id, user: 'Manager', action: `Rejected order: ${o.id}`, details: req.body.reason || '', type: 'order', severity: 'error' });
    const updated = await db.getOrder(o.id);
    req.app.get('broadcast')?.(req.user.id, { event: 'order_updated', data: updated });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/ship', auth, async (req, res) => {
  try {
    const o = await db.getOrder(req.params.id);
    if (!o || o.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    const tracking = req.body.trackingNumber || `TRK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const shipSettings = await db.getSettings(req.user.id) || {};
    // بلا اسمِ شركةٍ مكتوبٍ في الكود: إن لم يُحدَّد شيءٌ نترك الحقلَ فارغًا
    // بدل نسبةِ الشحنة إلى «Amana» لتاجرٍ لا يتعامل معها أصلًا.
    const prov = req.body.provider || shipSettings.delivery?.defaultProvider || '';
    await db.updateOrder(o.id, { userId: req.user.id, status: 'shipped', trackingNumber: tracking, deliveryProvider: prov });
    await db.addLog({ userId: req.user.id, user: 'Manager', action: `Shipped: ${o.id}`, details: tracking, type: 'delivery', severity: 'success' });
    await db.addNotification({ userId: req.user.id, type: 'success', message: `🚚 Shipped — ${tracking}` });
    const shipWaToken = shipSettings.social?.whatsapp?.accessToken;
    const shipWaPhoneId = shipSettings.social?.whatsapp?.pageId;
    const shippedOrder = await db.getOrder(o.id);
    if (shipWaToken && shipWaPhoneId && shippedOrder?.customerPhone) {
      try {
        const trackUrl = shipSettings.delivery?.trackingUrlTemplate ? shipSettings.delivery.trackingUrlTemplate.replace('{tracking}', tracking) : '';
        const shipMsg = `مرحباً ${shippedOrder.customerName}! 👋\n\n🚚 طلبك في الطريق إليك!\n\n📦 رقم التتبع: ${tracking}\n🏢 شركة التوصيل: ${prov}\n⏱️ متوقع الوصول خلال: 24-48 ساعة\n${trackUrl ? `\n🔗 تتبع طلبك: ${trackUrl}` : ''}\n\nشكراً لثقتك! 🙏`;
        const shipBody = JSON.stringify({ messaging_product:'whatsapp', to:shippedOrder.customerPhone.replace(/\s/g,''), type:'text', text:{ body:shipMsg } });
        const https3 = require('https');
        const r3 = https3.request({ hostname:'graph.facebook.com', path:`/v19.0/${shipWaPhoneId}/messages`, method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${shipWaToken}`, 'Content-Length':Buffer.byteLength(shipBody) } }, res=>res.resume());
        r3.on('error',()=>{}); r3.write(shipBody); r3.end();
      } catch {}
    } else if (shippedOrder?.customerPhone) {
      await db.addNotification({ userId: req.user.id, type: 'info', message: `📣 أشعر ${shippedOrder.customerName} بالشحن يدوياً: https://wa.me/${shippedOrder.customerPhone.replace(/\D/g, '')} — تتبع ${tracking} (اربط واتساب API للإرسال التلقائي)` });
    }
    req.app.get('broadcast')?.(req.user.id, { event: 'order_updated', data: shippedOrder });
    res.json(shippedOrder);
  } catch (e) { console.error('[orders/ship]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/deliver', auth, async (req, res) => {
  try {
    const o = await db.getOrder(req.params.id);
    if (!o || o.userId !== req.user.id) return res.status(404).json({ error: 'Not found' });
    await db.updateOrder(o.id, { userId: req.user.id, status: 'delivered' });
    await db.addLog({ userId: req.user.id, user: 'System', action: `Delivered: ${o.id}`, details: o.customerName, type: 'order', severity: 'success' });

    if (o.customerId && o.total > 0) {
      const delivSettings = await db.getSettings(req.user.id) || {};
      const pts = Math.floor(o.total * (delivSettings.loyalty?.pointsPerMAD || 1));
      try { await db.addLoyaltyPoints(req.user.id, o.customerId, pts); } catch(e) {}
    }

    const deliveredOrder = await db.getOrder(o.id);
    _notifyCustomer(req.user.id, deliveredOrder, 'delivered');
    req.app.get('broadcast')?.(req.user.id, { event: 'order_updated', data: deliveredOrder });

    const brand = ((await db.getSettings(req.user.id))||{}).brand || {};
    const storeBase = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '';
    const reviewMsg = `🎉 مبروك ${o.customerName}!\n\nوصل طلبك بنجاح من ${brand.name||'AMANZINE'} 📦\n\nنتمنى يكون عجبك كلشي 💛\n\n⭐ كنفرحو بتقييمك:\n• كيف كانت جودة المنتج؟\n• كيف كانت سرعة التوصيل؟\n• هل ستوصي بنا لأصدقائك؟\n\nرأيك مهم جداً لنا 🙏\n${storeBase ? '🔗 ' + storeBase + '/store/' + req.user.id : ''}\n\nشكراً لثقتك! 💫\n— ${brand.name||'AMANZINE'} ✨`;
    const waPhone = (o.customerPhone||'').replace(/\D/g,'');
    const reviewWaUrl = waPhone ? 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(reviewMsg) : null;

    res.json({ ...deliveredOrder, reviewWaUrl, reviewMsg });
  } catch (e) { console.error('[orders/deliver]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/public', sanitizeBody, validateOrder, async (req, res) => {
  // ملاحظة: `deliveryCost` القادم من العميل يُتجاهَل عمدًا — الخادم يحسبه بنفسه أدناه.
  const { userId, items, customerName, customerPhone, city, address, notes, source, couponCode, captchaToken, customerEmail } = req.body;
  if (!userId || !items?.length || !customerName || !customerPhone)
    return res.status(400).json({ error: 'userId, items, name, phone required' });
  try {
    const preSettings = await db.getSettings(userId) || {};

    // ── تأكيدُ النمرة: أوّلَ مرّةٍ فقط ────────────────────────────
    //   hCaptcha يمنع الآلة، ولا يمنع إنسانًا يكتب نمرةً ليست له. والدفعُ
    //   عند الاستلام يجعل الطلبَ الوهميَّ **ثمنَ توصيلٍ حقيقيًّا** يدفعه
    //   التاجر لطردٍ يُرفَض عند الباب.
    //
    //   والبرهانُ يُقرأ من القاعدة لا من الطلب: لو صُدِّق حقلٌ يرسله العميل
    //   («verified: true») لكان البابُ مفتوحًا لمن يريد إغراقَ تاجرٍ بالطلبات.
    const vp = await orderVerification.needsVerification({
      userId, phone: customerPhone, settings: preSettings,
    });
    // **والتخفيفُ يُقال لصاحبه.** حين تسقط الحمايةُ لأنّ لا قناةَ تُسلّم
    //   الرمز، يجب أن يعرف التاجرُ — وإلّا ظنّ نفسَه محميًّا وهو مكشوف.
    //   ويُكتَب مرّةً في السجلّ لا مع كلّ طلب: تحذيرٌ يتكرّر ألفَ مرّةٍ يُقرأ
    //   صفرَ مرّات.
    if (vp.undeliverable) {
      db.addLog({
        userId, user: 'System', type: 'security', severity: 'warning',
        action: '⚠️ تأكيدُ نمرة الزبون موقوف — ما كايناش قناة',
        details: 'ربط واتساب باش يرجع التأكيد يخدم ويحميك من الطلبات الوهمية',
      }).catch(() => {});
    }
    if (vp.required) {
      const ok = await verify.isVerified({ identifier: customerPhone, purpose: 'order_confirm' });
      if (!ok) {
        // 428: «مطلوبٌ شرطٌ مسبق» — تقرؤها الواجهةُ فتفتح شاشةَ الرمز، ولا
        // تعرضها خطأً عامًّا يجعل الزبونَ يظنّ أنّ الطلبَ فشل.
        return res.status(428).json({
          error: 'خاصّنا نتأكّدو من النمرة ديالك قبل ما نسجّلو الطلب',
          needsVerification: true, purpose: 'order_confirm',
          identifier: customerPhone, reason: vp.reason,
        });
      }
    }

    // ── **المربّعُ يُستهلَك مرّةً، فلا يُطلَب مرّتَين** ──────────────
    //
    //   كان الفحصُ **قبل** بوّابة تأكيد النمرة. ورمزُ hCaptcha يُستهلَك عند
    //   أوّل تحقّق: تسأل عنه ثانيةً فيردّ `timeout-or-duplicate`.
    //
    //   فكانت رحلةُ كلّ زبونٍ جديد (وهم كلُّ الزبائن في البداية):
    //       ① يضغط المربّع ✓ ⇒ نستهلك رمزَه ⇒ 428 «خاصّنا نتأكّدو من النمرة»
    //       ② يكتب الكود ⇒ **تُعاد المحاولةُ تلقائيًّا بنفس الرمز المستهلَك**
    //       ③ «فشل التحقق الأمني» — إلى الأبد. الطلبُ لا يمرّ أبدًا.
    //
    //   والمربّعُ أخضرُ أمام عينَيه. هذا هو ما رآه صاحبُ المشروع.
    //
    //   والحلُّ ليس رمزًا ثانيًا بل **ألّا نحرقه في طلبٍ لن يُنشئ شيئًا**:
    //   يُفحَص هنا، بعد اجتياز البوّابة وقبل الكتابة مباشرةً. مرّةً واحدة.
    if (preSettings.security?.hcaptchaSecret) {
      const cap = await _verifyHCaptcha(preSettings.security.hcaptchaSecret, captchaToken);
      if (!cap.ok && cap.kind === 'ours') {
        // ── **عطبُنا لا يدفع ثمنَه الزبون** ────────────────────────
        //   مفتاحٌ خاطئ أو شبكةٌ لم تصل: الحمايةُ **لم تعمل**، وليست قد رفضت.
        //   وحائطٌ سببُه إعدادُنا يقتل كلَّ طلبٍ في المتجر بلا أن يعرف أحد.
        //   نفسُ قاعدة تأكيد النمرة: ما لا يعمل يُعلَّق ويُقال، لا يُقلَب جدارًا.
        logger.error('hCaptcha unusable — order allowed through', { userId, codes: cap.codes });
        db.addLog({
          userId, user: 'System', type: 'security', severity: 'warning',
          action: '⚠️ الحمايةُ من الروبوتات (hCaptcha) ما خدماتش',
          details: `تحقّق من المفتاح السرّيّ ومفتاح الموقع — خاصّهم يكونو من نفس الحساب. (${cap.codes.join(', ') || 'ما وصلناش لـhCaptcha'})`,
        }).catch(() => {});
      } else if (!cap.ok) {
        // الرمزُ منتهٍ أو مستهلَك ⇒ الواجهةُ تمسح المربّعَ وتطلب واحدًا جديدًا.
        const stale = cap.kind === 'stale';
        return res.status(400).json({
          error: stale
            ? 'التحقّقُ الأمنيّ صلاحيتُه سالات — عاود اضغط على المربّع وصيفط'
            : 'ما قدرناش نتأكّدو أنّك ماشي روبوت — عاود اضغط على المربّع',
          captchaStale: true,
        });
      }
    }

    let subtotal = 0, totalCost = 0, giftFees = 0, itemCount = 0;
    const safeItems = [];
    for (const it of items) {
      let p = null;
      if (it.productId) { try { p = await db.getProduct(it.productId); if (p && p.userId !== userId) p = null; } catch {} }
      const price = p ? +p.price : Math.max(0, +it.price || 0);
      const qty = Math.max(1, +it.quantity || 1);
      subtotal += price * qty;
      itemCount += qty;
      if (p && +p.cost > 0) totalCost += +p.cost * qty;
      if (it.giftWrap) giftFees += 15;
      safeItems.push({ ...it, price });
    }
    subtotal += giftFees;

    const settings = await db.getSettings(userId) || {};
    const promo = settings.promotions || {};
    const bundleEnabled = promo.bundle?.enabled !== false;
    const bundleMin = Math.max(2, +promo.bundle?.minItems || 3);
    const bundlePct = Math.min(Math.max(+promo.bundle?.percent || 10, 0), 25);
    const freeShipThreshold = +promo.freeShippingThreshold > 0 ? +promo.freeShippingThreshold : 400;

    const bundleDiscount = bundleEnabled && itemCount >= bundleMin
      ? Math.round(subtotal * bundlePct / 100) : 0;

    let couponDiscount = 0, couponFreeShip = false, couponId = null;
    if (couponCode) {
      const v = await db.validateCoupon(userId, couponCode, subtotal);
      if (v.valid) { couponDiscount = v.discount; couponFreeShip = !!v.freeShipping; couponId = v.couponId; }
    }

    let discount = Math.max(bundleDiscount, couponDiscount);
    const discountSource = discount === 0 ? ''
      : bundleDiscount >= couponDiscount ? `باقة ${bundleMin}+ قطع (${bundlePct}%)` : `كوبون ${String(couponCode).toUpperCase()}`;

    if (totalCost > 0) {
      const maxSafe = Math.max(0, Math.round((subtotal - giftFees - totalCost) * 0.8));
      if (discount > maxSafe) discount = maxSafe;
    }

    const afterDiscount = Math.max(0, subtotal - discount);
    const freeShipping = couponFreeShip || afterDiscount >= freeShipThreshold;
    const delivery = freeShipping ? 0 : resolveDeliveryFee(city, settings.deliveryCosts);
    const serverTotal = afterDiscount + delivery;

    const couponApplied = couponFreeShip || (couponDiscount > 0 && couponDiscount >= bundleDiscount);
    if (couponId && couponApplied) { try { await db.incrementCouponUse(couponId); } catch {} }

    const promoNotes = [
      discount > 0 ? `خصم ${discount} MAD (${discountSource})` : '',
      freeShipping ? 'توصيل مجاني 🚚' : '',
    ].filter(Boolean).join(' · ');

    const customerCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // تُثبَّت تكلفةُ الشراء مع الثمن — وإلّا أُعيد تسعيرُ الطلب لاحقًا بتكلفةِ اليوم
    const pricedItems = await attachCosts(db, userId, safeItems);

    const { order, customer } = await db.createOrderWithCustomer(
      { userId, customerName, customerPhone, city: city||'', address: address||'',
        items: pricedItems, total: serverTotal, source: source||'Storefront',
        status: 'pending', notes: [notes||'', promoNotes].filter(Boolean).join(' · '), customerCode,
        deliveryFee: delivery },
      { userId, name: customerName, phone: customerPhone,
        city: city||'', address: address||'', source: source||'Storefront' }
    );

    emitOrderCreated(userId, order, source || 'Storefront');

    await db.addNotification({ userId, type: 'info', message: `🛒 طلب جديد من ${customerName} — ${order.total} MAD` });

    const brevoKey = settings.marketing?.brevoApiKey;
    if (brevoKey) {
      const itemsHtml = (safeItems || []).map(i => `<li>${i.productName} × ${i.quantity || 1} — ${i.price} MAD</li>`).join('');
      const orderHtml = `<h2>طلب جديد ${order.id}</h2><p>👤 ${customerName} — 📱 ${customerPhone}</p><p>📍 ${city} ${address || ''}</p><ul>${itemsHtml}</ul><p><b>الإجمالي: ${serverTotal} MAD</b></p>`;
      if (settings.brand?.email) {
        _sendBrevoEmail(brevoKey, settings.brand.email, settings.brand?.name, `🛒 طلب جديد ${order.id} — ${customerName}`, orderHtml)
          .then(ok => db.addLog({ userId, user: 'System', action: ok ? `📧 إيميل Brevo للتاجر: ${order.id}` : `⚠️ فشل إيميل Brevo للتاجر: ${order.id}`, details: settings.brand.email, type: 'notification', severity: ok ? 'success' : 'warning' }).catch(() => {}));
      }
      if (customerEmail && /.+@.+\..+/.test(customerEmail)) {
        const custHtml = `<h2>شكراً ${customerName}! 🎉</h2><p>استلمنا طلبك <b>${order.id}</b> وسنتواصل معك للتأكيد.</p><ul>${itemsHtml}</ul><p><b>الإجمالي: ${serverTotal} MAD</b></p><p>كود التتبع: <b>${customerCode}</b></p><p>— ${settings.brand?.name || 'المتجر'}</p>`;
        _sendBrevoEmail(brevoKey, customerEmail, customerName, `✅ تأكيد استلام طلبك ${order.id}`, custHtml)
          .then(ok => db.addLog({ userId, user: 'System', action: ok ? `📧 إيميل تأكيد Brevo للزبون: ${order.id}` : `⚠️ فشل إيميل الزبون: ${order.id}`, details: customerEmail, type: 'notification', severity: ok ? 'success' : 'warning' }).catch(() => {}));
      }
    }
    await db.addLog({ userId, user: 'Storefront', action: `New order: ${customerName}`, details: `${city} — ${serverTotal} MAD${promoNotes ? ' · ' + promoNotes : ''}`, type: 'order', severity: 'info' });

    // `deliveryFee` يُعاد للواجهة كي تعرض الرقم الذي احتسبه الخادم فعلًا،
    // لا الرقم الذي قدّرته هي محلّيًّا.
    res.status(201).json({ order, customerId: customer.id, applied: { discount, discountSource, freeShipping, deliveryFee: delivery, total: serverTotal } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/track/:phone', async (req, res) => {
  const { phone } = req.params;
  const { userId } = req.query;
  if (!phone || !userId) return res.status(400).json({ error: 'phone and userId required' });
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 9) return res.status(400).json({ error: 'أدخل رقم الهاتف كاملاً للتتبّع' });
  const last9 = digits.slice(-9);
  try {
    const orders = (await db.getOrders(userId)).filter(o => {
      const ph = (o.customerPhone || '').replace(/\D/g, '');
      return ph.length >= 9 && ph.slice(-9) === last9;
    });
    const STATUS_AR = { pending:'⏳ بانتظار التأكيد', approved:'✅ تم التأكيد', processing:'⚙️ جارٍ التحضير', shipped:'🚚 في الطريق', delivered:'📦 وصل', cancelled:'❌ ملغي' };
    res.json(orders.map(o => ({
      id: o.id, status: o.status, statusAr: STATUS_AR[o.status] || o.status,
      total: o.total,
      trackingNumber: o.trackingNumber, deliveryProvider: o.deliveryProvider,
      deliveryStatus: o.deliveryStatus || '',
      createdAt: o.createdAt, items: o.items,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/track-code/:code', async (req, res) => {
  const { code } = req.params;
  const { userId } = req.query;
  if (!code || !userId) return res.status(400).json({ error: 'code and userId required' });
  try {
    const order = await db.findOrderByCode(userId, code);
    if (!order) return res.status(404).json({ error: 'لم نجد طلباً بهذا الكود' });
    const STATUS_AR = { pending:'⏳ بانتظار التأكيد', approved:'✅ تم التأكيد', processing:'⚙️ جارٍ التحضير', shipped:'🚚 في الطريق', delivered:'📦 وصل', cancelled:'❌ ملغي' };
    res.json({
      id: order.id, status: order.status, statusAr: STATUS_AR[order.status] || order.status,
      total: order.total, customerCode: order.customerCode,
      trackingNumber: order.trackingNumber, deliveryProvider: order.deliveryProvider,
      deliveryStatus: order.deliveryStatus || '',
      createdAt: order.createdAt, items: order.items,
      customerName: order.customerName, city: order.city,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── دفترُ أحداث الطلب ────────────────────────────────────────────────────────
// مسارُ قراءةٍ واحدٌ ومسارُ كتابةٍ واحد. لا مسارَ تعديلٍ ولا حذف: الدفترُ الذي
// يُعدَّل ليس دفترًا، والتصحيحُ حدثٌ مضادٌّ يُسجَّل فوقه.

// GET /api/orders/:id/timeline — الطلبُ وأحداثُه ووقائعُه المستنتَجة
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const t = await db.getOrderTimeline(req.params.id, req.user.id);
    if (!t) return res.status(404).json({ error: 'Order not found' });
    res.json(t);
  } catch (e) {
    console.error('[orders/timeline]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/events — تسجيلُ حدث
router.post('/:id/events', auth, async (req, res) => {
  try {
    const r = await db.recordOrderEvent(req.params.id, req.user.id, {
      type:        String(req.body?.type || '').trim(),
      actor:       String(req.body?.actor || 'merchant').slice(0, 60),
      note:        String(req.body?.note || '').slice(0, 500),
      amountDelta: +req.body?.amountDelta || 0,
      status:      req.body?.status ? String(req.body.status).trim() : undefined,
      payload:     (req.body?.payload && typeof req.body.payload === 'object') ? req.body.payload : {},
    });
    // الرفضُ يُفصح عن سببه: «مالٌ يخرج بلا مُبرّر» لا «طلبٌ غيرُ صالح».
    if (!r.ok) return res.status(400).json({ error: r.problems.join(' · '), problems: r.problems });
    res.json(r);
  } catch (e) {
    console.error('[orders/events]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
