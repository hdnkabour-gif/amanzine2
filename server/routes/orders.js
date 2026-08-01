'use strict';
const { validateOrder, sanitizeBody } = require('../middleware/validate');
const router = require('express').Router();
const auth   = require('../middleware/auth');
const crypto = require('crypto');
const { db } = require('../database');
const sync   = require('../sync');
const fetch  = require('node-fetch');

let pushNotify;
try { pushNotify = require('../routes/push').notifyUser; } catch { pushNotify = () => Promise.resolve(); }

router.get('/', auth, async (req, res) => {
  try { res.json(await db.getOrders(req.user.id)); }
  catch (e) { console.error('[orders]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, sanitizeBody, async (req, res) => {
  try {
    const order = await db.createOrder({ ...req.body, userId: req.user.id, status: 'pending' });
    await db.addLog({ userId: req.user.id, user: 'AI', action: `New order: ${order.id}`, details: order.customerName, type: 'order', severity: 'info' });
    await db.addNotification({ userId: req.user.id, type: 'info', message: `🛒 طلب جديد من ${order.customerName}` });
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
  } catch (e) { console.error('[orders]', e.message); res.status(500).json({ error: 'Server error' }); }
});

function _sendBrevoEmail(apiKey, toEmail, toName, subject, html) {
  return new Promise(resolve => {
    if (!apiKey || !toEmail) return resolve(false);
    const httpsB = require('https');
    const body = JSON.stringify({
      sender: { name: 'AMANZINE', email: 'noreply@amanzine.shop' },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject, htmlContent: html,
    });
    const r = httpsB.request({ hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      rs => { rs.resume(); resolve(rs.statusCode < 300); });
    r.on('error', () => resolve(false)); r.setTimeout(8000, () => { r.destroy(); resolve(false); });
    r.write(body); r.end();
  });
}

function _verifyHCaptcha(secret, token) {
  return new Promise(resolve => {
    const httpsH = require('https');
    const form = `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token || '')}`;
    const r = httpsH.request({ hostname: 'api.hcaptcha.com', path: '/siteverify', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) } },
      rs => { let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { resolve(!!JSON.parse(d).success); } catch { resolve(false); } }); });
    r.on('error', () => resolve(false)); r.setTimeout(8000, () => { r.destroy(); resolve(false); });
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

    if (settings.delivery?.autoSendOnApproval && providers.length > 0) {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/api/delivery/create/${order.id}`;
        console.log(`[Orders] Calling delivery API: ${url}`);
        const deliveryRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.authorization || '',
            'Content-Type': 'application/json'
          }
        });
        const deliveryResult = await deliveryRes.json();
        console.log(`[Orders] Delivery result:`, deliveryResult);
        if (deliveryResult.success) {
          await db.addLog({
            userId: req.user.id,
            user: 'System',
            action: `Auto-delivery triggered for order ${order.id}`,
            details: deliveryResult.real ? 'شحنة حقيقية' : 'محاكاة (راجع السجل)',
            type: 'delivery',
            severity: 'info'
          });
        } else {
          console.warn('Auto-delivery failed:', deliveryResult.error);
          await db.addLog({
            userId: req.user.id,
            user: 'System',
            action: `Auto-delivery failed for order ${order.id}`,
            details: deliveryResult.error || 'Unknown error',
            type: 'delivery',
            severity: 'warning'
          });
        }
      } catch (e) {
        console.error('Auto-delivery internal error:', e.message);
        await db.addLog({
          userId: req.user.id,
          user: 'System',
          action: `Auto-delivery exception for order ${order.id}`,
          details: e.message,
          type: 'delivery',
          severity: 'error'
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
      `📌 _احتفظ بكود التتبع لمتابعة طلبك_`,
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
    const prov = req.body.provider || shipSettings.delivery?.defaultProvider || 'Amana';
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
  const { userId, items, customerName, customerPhone, city, address, notes, source, couponCode, deliveryCost, captchaToken, customerEmail } = req.body;
  if (!userId || !items?.length || !customerName || !customerPhone)
    return res.status(400).json({ error: 'userId, items, name, phone required' });
  try {
    const preSettings = await db.getSettings(userId) || {};
    if (preSettings.security?.hcaptchaSecret) {
      const human = await _verifyHCaptcha(preSettings.security.hcaptchaSecret, captchaToken);
      if (!human) return res.status(400).json({ error: 'فشل التحقق الأمني — حدّث الصفحة وأعد المحاولة' });
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
    const delivery = freeShipping ? 0 : Math.min(Math.max(+deliveryCost || 0, 0), 100);
    const serverTotal = afterDiscount + delivery;

    const couponApplied = couponFreeShip || (couponDiscount > 0 && couponDiscount >= bundleDiscount);
    if (couponId && couponApplied) { try { await db.incrementCouponUse(couponId); } catch {} }

    const promoNotes = [
      discount > 0 ? `خصم ${discount} MAD (${discountSource})` : '',
      freeShipping ? 'توصيل مجاني 🚚' : '',
    ].filter(Boolean).join(' · ');

    const customerCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const { order, customer } = await db.createOrderWithCustomer(
      { userId, customerName, customerPhone, city: city||'', address: address||'',
        items: safeItems, total: serverTotal, source: source||'Storefront',
        status: 'pending', notes: [notes||'', promoNotes].filter(Boolean).join(' · '), customerCode },
      { userId, name: customerName, phone: customerPhone,
        city: city||'', address: address||'', source: source||'Storefront' }
    );

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

    res.status(201).json({ order, customerId: customer.id, applied: { discount, discountSource, freeShipping, total: serverTotal } });
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

module.exports = router;
