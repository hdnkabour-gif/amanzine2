'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const https  = require('https');
const crypto = require('crypto');
const { db } = require('../database');

// استيراد مزود Livo
const livoProvider = require('../services/delivery/providers/livo.provider');

// ── ترحيلٌ لمرّةٍ واحدة: settings.delivery.providers ⇒ delivery_providers ──────
// شركاتٌ أُضيفت عبر «البسيط» أو «واتساب» أو «وصفة URL» كانت تُحفَظ في الإعدادات
// فقط ولا تصل الجدول ⇒ يراها التاجر مفعّلةً بينما الخادمُ لا يراها إطلاقًا.
// يُنفَّذ كسولًا عند أوّل قراءة، وهو فعلٌ عديمُ الأثر إن أُعيد (idempotent).
async function _absorbLegacyProviders(userId, existing) {
  let settings;
  try { settings = await db.getSettings(userId); } catch { return existing; }
  const legacy = settings?.delivery?.providers;
  if (!Array.isArray(legacy) || !legacy.length) return existing;

  const seen = new Set(existing.map(p => String(p.name || '').trim().toLowerCase()));
  for (const lp of legacy) {
    const key = String(lp?.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    try {
      await db.upsertDeliveryProvider({
        userId,
        name: lp.name, logo: lp.logo || '🚚', mode: lp.mode || 'api',
        enabled: lp.enabled !== false,
        websiteUrl: lp.websiteUrl || '', loginUrl: lp.loginUrl || '',
        username: lp.username || '', password: lp.password || '',
        addOrderPage: lp.addOrderPage || '', livraisonBonPage: lp.livraisonBonPage || '',
        ramassagePage: lp.ramassagePage || '',
        apiKey: lp.apiKey || '', apiEndpoint: lp.apiEndpoint || '',
        // وضعُ «وصفة URL» كان يخبّئ نوعَه ورابطَه داخل fields — نرفعهما لعموديهما
        // كي يجدهما delivery-auto.js، فهو يبحث في الجدول لا في الإعدادات.
        apiType: lp.apiType || lp.fields?.apiType || '',
        webhookUrl: lp.webhookUrl || lp.fields?.webhookUrl || '',
        fields: lp.fields || {},
      });
      seen.add(key);
    } catch (e) { console.warn('[delivery/absorb]', lp?.name, e.message); }
  }

  // الإعدادات تفقد نسختها ⇒ مصدرُ حقيقةٍ واحدٌ من الآن.
  try {
    await db.saveSettings(userId, { ...settings, delivery: { ...settings.delivery, providers: [] } });
  } catch (e) { console.warn('[delivery/absorb] settings cleanup', e.message); }

  return db.getDeliveryProviders(userId);
}

router.get('/', auth, async (req, res) => {
  try {
    let rows = await db.getDeliveryProviders(req.user.id);
    rows = await _absorbLegacyProviders(req.user.id, rows);
    res.json(rows);
  }
  catch (e) { console.error('[delivery]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const id = await db.upsertDeliveryProvider({ ...req.body, userId: req.user.id });
    await db.addLog({ userId: req.user.id, user: 'Manager', action: `Delivery provider saved: ${req.body.name}`, details: '', type: 'delivery', severity: 'info' });
    res.json({ ok: true, id, providers: await db.getDeliveryProviders(req.user.id) });
  } catch (e) { console.error('[delivery]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.deleteDeliveryProvider(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/delivery/create/:orderId — create real delivery shipment
// Supports: Amana, Jibli, Livo, generic webhook, or falls back to simulation
router.post('/create/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled);
    if (!providers.length) return res.status(400).json({ error: 'No delivery provider configured' });

    // 🔹 اختيار Livo أولاً إذا كان موجوداً، وإلا استخدم الأول
    let prov = providers.find(p => p.apiType === 'livo');
    if (!prov) prov = providers[0];

    console.log(`[Delivery] Using provider: ${prov.name} (apiType: ${prov.apiType})`);

    const settings = await db.getSettings(req.user.id) || {};
    const tracking = 'TRK-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const failures = [];
    const steps = [{
      label: 'تجهيز بيانات الشحنة',
      ok: true,
      detail: `${order.customerName} · ${order.customerPhone} · ${order.city} · COD ${order.total} ${settings.brand?.currency || 'MAD'}`,
    }];
    const manualCopy = [
      `الاسم: ${order.customerName}`,
      `الهاتف: ${order.customerPhone}`,
      `المدينة: ${order.city}`,
      `العنوان: ${order.address}`,
      `المنتجات: ${(order.items || []).map(i => `${i.productName} ×${i.quantity}`).join('، ')}`,
      `المبلغ عند الاستلام (COD): ${order.total} ${settings.brand?.currency || 'MAD'}`,
      `مرجع الطلب: ${order.customerCode || order.id}`,
    ].join('\n');
    const openUrl = prov.addOrderPage || prov.websiteUrl || '';

    // ── Livo API ──────────────────────────────────────────────────
    if (prov.apiType === 'livo' && prov.apiKey) {
      console.log('[Delivery] Entering Livo branch');
      try {
        const livoData = {
          customerName: order.customerName,
          phone: order.customerPhone,
          city: order.city,
          address: order.address,
          codAmount: order.total,
          notes: order.notes || '',
        };
        console.log('[Delivery] Calling Livo createOrder with data:', livoData);
        const result = await livoProvider.createOrder(livoData, prov.apiKey, prov.apiEndpoint || 'https://rest.livo.ma');
        console.log('[Delivery] Livo result:', result);
        if (result.success) {
          const realTracking = result.trackingNumber;
          steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Livo API)`, ok: true, detail: `POST ${prov.apiEndpoint || 'https://rest.livo.ma'}/orders` });
          steps.push({ label: 'استلام رقم التتبع من الشركة', ok: true, detail: realTracking });
          await db.updateOrder(order.id, {
            status: 'processing',
            trackingNumber: realTracking,
            deliveryProvider: prov.name,
            livoOrderId: result.livoOrderId,
          });
          await db.addLog({
            userId: req.user.id,
            user: 'System',
            action: `✅ شحنة حقيقية عبر Livo API: ${order.id}`,
            details: `تتبع: ${realTracking}`,
            type: 'delivery',
            severity: 'success'
          });
          await db.addNotification({
            userId: req.user.id,
            type: 'success',
            message: `📦 أُنشئت شحنة حقيقية لدى ${prov.name} — تتبع: ${realTracking}`
          });
          return res.json({ success: true, tracking: realTracking, provider: prov.name, real: true, via: 'livo-api', steps, manual: { copyText: manualCopy, openUrl } });
        } else {
          failures.push(`Livo API: ${result.error}`);
          steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Livo API)`, ok: false, error: result.error });
        }
      } catch (e) {
        console.error('[Delivery/Livo]', e.message);
        failures.push(`Livo API: ${e.message}`);
        steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Livo API)`, ok: false, error: e.message });
      }
    }

    // ── Amana API ──────────────────────────────────────────────────
    if (prov.apiType === 'amana' && prov.apiKey) {
      try {
        const payload = JSON.stringify({
          apiKey: prov.apiKey,
          reference: order.id,
          receiverName: order.customerName,
          receiverPhone: order.customerPhone,
          receiverAddress: `${order.address}, ${order.city}`,
          description: (order.items || []).map(i => `${i.productName} x${i.quantity}`).join(', '),
          cod: order.total,
          weight: 0.5,
        });
        const result = await _post(prov.apiEndpoint || 'api.amana.ma', '/api/v1/parcels', {
          'Authorization': `Bearer ${prov.apiKey}`,
        }, payload);
        const data = JSON.parse(result);
        const realTracking = data.trackingNumber || data.tracking_number || tracking;
        steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Amana API)`, ok: true, detail: `POST ${prov.apiEndpoint || 'api.amana.ma'}/api/v1/parcels` });
        steps.push({ label: 'استلام رقم التتبع من الشركة', ok: true, detail: realTracking });
        await db.updateOrder(order.id, { status: 'processing', trackingNumber: realTracking, deliveryProvider: prov.name });
        await db.addLog({ userId: req.user.id, user: 'System', action: `✅ شحنة حقيقية عبر Amana API: ${order.id}`, details: `تتبع: ${realTracking}`, type: 'delivery', severity: 'success' });
        await db.addNotification({ userId: req.user.id, type: 'success', message: `📦 أُنشئت شحنة حقيقية لدى ${prov.name} — تتبع: ${realTracking}` });
        return res.json({ success: true, tracking: realTracking, provider: prov.name, real: true, via: 'amana-api', steps, manual: { copyText: manualCopy, openUrl } });
      } catch (e) {
        console.warn('[Delivery/Amana]', e.message);
        failures.push(`Amana API: ${e.message}`);
        steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Amana API)`, ok: false, error: e.message });
      }
    }

    // ── Jibli API ──────────────────────────────────────────────────
    if (prov.apiType === 'jibli' && prov.apiKey) {
      try {
        const payload = JSON.stringify({
          token: prov.apiKey,
          order_ref: order.id,
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          city: order.city,
          address: order.address,
          price: order.total,
          products: (order.items || []).map(i => ({ name: i.productName, qty: i.quantity })),
        });
        const result = await _post(prov.apiEndpoint || 'api.jibli.ma', '/v1/orders/create', {
          'X-API-Key': prov.apiKey,
        }, payload);
        const data = JSON.parse(result);
        const realTracking = data.tracking || data.code || tracking;
        steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Jibli API)`, ok: true, detail: `POST ${prov.apiEndpoint || 'api.jibli.ma'}/v1/orders/create` });
        steps.push({ label: 'استلام رقم التتبع من الشركة', ok: true, detail: realTracking });
        await db.updateOrder(order.id, { status: 'processing', trackingNumber: realTracking, deliveryProvider: prov.name });
        await db.addLog({ userId: req.user.id, user: 'System', action: `✅ شحنة حقيقية عبر Jibli API: ${order.id}`, details: `تتبع: ${realTracking}`, type: 'delivery', severity: 'success' });
        await db.addNotification({ userId: req.user.id, type: 'success', message: `📦 أُنشئت شحنة حقيقية لدى ${prov.name} — تتبع: ${realTracking}` });
        return res.json({ success: true, tracking: realTracking, provider: prov.name, real: true, via: 'jibli-api', steps, manual: { copyText: manualCopy, openUrl } });
      } catch (e) {
        console.warn('[Delivery/Jibli]', e.message);
        failures.push(`Jibli API: ${e.message}`);
        steps.push({ label: `إرسال بيانات الشحنة إلى ${prov.name} (Jibli API)`, ok: false, error: e.message });
      }
    }

    // ── Generic webhook ────────────────────────────────────────────
    if (prov.webhookUrl) {
      try {
        const u = new URL(prov.webhookUrl);
        const host = u.hostname;
        const BLOCKED = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0|metadata\.google|169\.254\.169\.254)/i;
        if (u.protocol !== 'https:' || BLOCKED.test(host)) {
          console.warn('[Delivery/Webhook] Blocked SSRF attempt to:', prov.webhookUrl);
          throw new Error('Blocked: internal or non-HTTPS URL');
        }
        const payload = JSON.stringify({
          event: 'order.created',
          orderId: order.id,
          tracking,
          customer: { name: order.customerName, phone: order.customerPhone, city: order.city, address: order.address },
          items: order.items,
          total: order.total,
          currency: settings.brand?.currency || 'MAD',
        });
        await _post(u.hostname, u.pathname, {
          'X-Webhook-Secret': prov.apiKey || '',
        }, payload);
        await db.updateOrder(order.id, { status: 'processing', trackingNumber: tracking, deliveryProvider: prov.name });
        steps.push({ label: `إرسال الطلب إلى نظام ${prov.name} (Webhook)`, ok: true, detail: u.hostname });
        await db.addLog({ userId: req.user.id, user: 'System', action: `✅ شحنة حقيقية عبر Webhook: ${order.id}`, details: `تتبع: ${tracking}`, type: 'delivery', severity: 'success' });
        await db.addNotification({ userId: req.user.id, type: 'success', message: `📦 أُرسل الطلب لنظام ${prov.name} عبر Webhook — تتبع: ${tracking}` });
        return res.json({ success: true, tracking, provider: prov.name, real: true, via: 'webhook', steps, manual: { copyText: manualCopy, openUrl } });
      } catch (e) {
        console.warn('[Delivery/Webhook]', e.message);
        failures.push(`Webhook: ${e.message}`);
        steps.push({ label: `إرسال الطلب إلى نظام ${prov.name} (Webhook)`, ok: false, error: e.message });
      }
    }

    // ── Simulation fallback ──────────────────────────────────────────
    const why = failures.length ? failures.join(' · ') : 'لا يوجد مفتاح API أو Webhook مهيأ لهذه الشركة';
    if (!failures.length) steps.push({ label: `لا قناة ربط حقيقية مهيأة لشركة ${prov.name}`, ok: false, error: 'أضف مفتاح API أو Webhook من صفحة التوصيل، أو استخدم الإدخال اليدوي' });
    steps.push({ label: 'توليد رقم تتبع داخلي (محاكاة — لم يصل للشركة)', ok: true, detail: tracking });
    await db.updateOrder(order.id, { status: 'processing', trackingNumber: tracking, deliveryProvider: prov.name });
    await db.addLog({ userId: req.user.id, user: 'System', action: `⚠️ محاكاة (لم يُرسل فعلياً): ${order.id}`, details: `${prov.name} — ${tracking} — السبب: ${why}`, type: 'delivery', severity: 'warning' });
    await db.addNotification({ userId: req.user.id, type: 'warning', message: `⚠️ طلب ${order.id}: لم يُرسل لشركة ${prov.name} — أدخله يدوياً في موقعها (السبب: ${why})` });
    res.json({ success: true, tracking, provider: prov.name, real: false, apiError: why, openUrl, steps, manual: { copyText: manualCopy, openUrl } });
  } catch (e) { console.error('[delivery/create]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// Legacy route kept for compatibility
router.post('/simulate/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });
    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled);
    if (!providers.length) return res.status(400).json({ error: 'No delivery provider configured' });
    const prov    = providers[0];
    const tracking = 'TRK-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    await db.updateOrder(order.id, { status: 'processing', trackingNumber: tracking, deliveryProvider: prov.name });
    await db.addLog({ userId: req.user.id, user: 'System', action: `⚠️ محاكاة (مسار قديم): ${order.id}`, details: `${prov.name} — ${tracking}`, type: 'delivery', severity: 'warning' });
    res.json({ success: true, tracking, provider: prov.name, real: false, orderUrl: prov.addOrderPage || prov.websiteUrl });
  } catch (e) { console.error('[delivery/simulate]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/delivery/test-connection — server-side URL reachability test
router.post('/test-connection', auth, async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.json({ ok: false, error: 'رابط غير صالح' });
  let parsed;
  try { parsed = new URL(url); } catch { return res.json({ ok: false, error: 'صيغة الرابط غير صحيحة' }); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return res.json({ ok: false, error: 'البروتوكول غير مدعوم' });
  const BLOCKED_TEST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1|0\.0\.0\.0|metadata\.google)/i;
  if (BLOCKED_TEST.test(parsed.hostname)) return res.json({ ok: false, error: 'عنوان IP داخلي غير مسموح به' });
  const start = Date.now();
  try {
    const mod = parsed.protocol === 'https:' ? require('https') : require('http');
    await new Promise((resolve, reject) => {
      const r = mod.request(
        { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: parsed.pathname || '/', method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } },
        resolve
      );
      r.on('error', reject);
      r.setTimeout(7000, () => { r.destroy(); reject(new Error('Timeout')); });
      r.end();
    });
    const ms = Date.now() - start;
    res.json({ ok: true, info: `${ms}ms — ${parsed.hostname}` });
  } catch (e) {
    res.json({ ok: false, error: e.message || 'لا يمكن الوصول للموقع' });
  }
});

// ── Livo-specific endpoints (optional) ──────────────────────────────────────

// GET /api/delivery/cities — fetch cities from Livo
router.get('/cities', auth, async (req, res) => {
  try {
    const providers = await db.getDeliveryProviders(req.user.id);
    const prov = providers.find(p => p.enabled && p.apiType === 'livo');
    if (!prov) return res.status(404).json({ error: 'لا يوجد مزود Livo مفعل' });
    const result = await livoProvider.getCities(prov.apiKey, prov.apiEndpoint || 'https://rest.livo.ma');
    if (result.success) {
      return res.json({ success: true, cities: result.cities });
    }
    return res.status(500).json({ error: result.error || 'فشل جلب المدن من Livo' });
  } catch (e) {
    console.error('[delivery/cities]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/delivery/fees — fetch public fees from Livo
router.get('/fees', auth, async (req, res) => {
  try {
    const providers = await db.getDeliveryProviders(req.user.id);
    const prov = providers.find(p => p.enabled && p.apiType === 'livo');
    if (!prov) return res.status(404).json({ error: 'لا يوجد مزود Livo مفعل' });
    const result = await livoProvider.getFees(prov.apiKey, prov.apiEndpoint || 'https://rest.livo.ma');
    if (result.success) {
      return res.json({ success: true, fees: result.fees });
    }
    return res.status(500).json({ error: result.error || 'فشل جلب الرسوم من Livo' });
  } catch (e) {
    console.error('[delivery/fees]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/delivery/track/:orderId — يجلب الحالة الحيّة من Livo عند الطلب (يدوي، بدون polling تلقائي)
router.post('/track/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    if (!order.livoOrderId) {
      return res.status(400).json({
        error: order.deliveryProvider === 'Livo'
          ? 'هذه الشحنة أُنشئت قبل تفعيل التتبع — لا يوجد معرف Livo محفوظ لها'
          : 'هذا الطلب غير مرتبط بشحنة Livo حقيقية'
      });
    }

    const providers = await db.getDeliveryProviders(req.user.id);
    const prov = providers.find(p => p.enabled && p.apiType === 'livo');
    if (!prov) return res.status(400).json({ error: 'لا يوجد مزود Livo مفعل' });

    const result = await livoProvider.getOrderStatus(order.livoOrderId, prov.apiKey, prov.apiEndpoint || 'https://rest.livo.ma');
    if (!result.success) return res.status(502).json({ error: result.error || 'تعذّر جلب الحالة من Livo' });

    await db.updateOrder(order.id, {
      deliveryStatus: result.status || '',
      deliverySyncedAt: new Date().toISOString(),
    });
    await db.addLog({
      userId: req.user.id, user: 'System',
      action: `تحديث حالة Livo: ${order.id}`, details: result.status || '(بدون حالة)',
      type: 'delivery', severity: 'info'
    });

    res.json({ success: true, status: result.status || '', history: result.history || [], trackingNumber: result.trackingNumber || order.trackingNumber });
  } catch (e) {
    console.error('[delivery/track]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function _post(hostname, path, extraHeaders, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...extraHeaders },
    };
    const r = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    r.on('error', reject);
    r.setTimeout(10000, () => { r.destroy(); reject(new Error('Timeout')); });
    r.write(body);
    r.end();
  });
}

module.exports = router;
