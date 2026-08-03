'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const crypto = require('crypto');
const { db } = require('../database');

// سجلُّ المزوّدين — يكتشفهم بمسح المجلّد. لا استيرادَ باسم شركةٍ هنا.
const registry = require('../services/delivery/registry');
const cityEngine = require('../lib/cityEngine');
const pricing = require('../lib/pricingEngine');
const { resolveDeliveryFee } = require('../lib/deliveryPricing');

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
    // شركةٌ أُضيفت من الوضع «البسيط» لا تحمل نوعًا إطلاقًا؛ نستدلُّ عليه من
    // نطاقها وإلّا وصلت الجدولَ بلا مزوّدٍ فبقيت شحناتُها محاكاةً إلى الأبد.
    const legacyType = lp.apiType || lp.fields?.apiType || registry.suggest(lp) || '';
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
        apiType: legacyType,
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
    const body = { ...req.body, userId: req.user.id };
    // صفٌّ بلا `api_type` = صفٌّ بلا مزوّد = محاكاةٌ صامتة. إن دلَّ نطاقُه على
    // مزوّدٍ مسجَّلٍ نُثبّته في العمود بدل تركه فارغًا ليُكتشَف الخللُ لاحقًا
    // عند أوّل شحنة. الاستدلالُ من `meta.match` لا من اسمٍ مكتوبٍ يدويًّا.
    let adopted = null;
    if (!String(body.apiType || '').trim()) {
      adopted = registry.suggest(body);
      if (adopted) body.apiType = adopted;
    }
    const id = await db.upsertDeliveryProvider(body);
    await db.addLog({
      userId: req.user.id, user: 'Manager',
      action: `Delivery provider saved: ${req.body.name}`,
      details: adopted ? `تُعرَّف تلقائيًّا كمزوّد ${adopted}` : '',
      type: 'delivery', severity: 'info',
    });
    res.json({ ok: true, id, adopted, providers: await db.getDeliveryProviders(req.user.id) });
  } catch (e) { console.error('[delivery]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.deleteDeliveryProvider(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/delivery/create/:orderId — إنشاءُ شحنةٍ حقيقيّة.
// المزوّدُ يُحدَّد من السجلّ لا من فروعٍ باسم شركة؛ وعند غيابه تُستعمل المحاكاة.
router.post('/create/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled);
    if (!providers.length) return res.status(400).json({ error: 'No delivery provider configured' });

    // اختيارُ الشركة: ما طلبه التاجرُ صراحةً، ثمّ الافتراضيّةُ في الإعدادات،
    // ثمّ الأولى. كان الاختيارُ يُفضّل Livo بالقوّة ويتجاهل `req.body` تمامًا،
    // فيُنشئ الشحنةَ لدى شركةٍ غير التي اختارها التاجر.
    const preSettings = await db.getSettings(req.user.id) || {};
    const wanted = String(req.body?.provider || req.body?.providerId || '').trim().toLowerCase();
    const prov =
      (wanted && providers.find(p => p.id === req.body?.providerId
                                  || String(p.name).toLowerCase() === wanted
                                  || String(p.apiType).toLowerCase() === wanted)) ||
      providers.find(p => p.name === preSettings.delivery?.defaultProvider) ||
      providers[0];

    console.log(`[Delivery] Using provider: ${prov.name} (apiType: ${prov.apiType})`);

    const settings = preSettings;
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

    // ── قناةُ الربط عبر السجلّ ─────────────────────────────────────
    // لا فروعَ باسم شركة: السجلُّ يختار المزوّدَ من api_type (أو webhook عامًّا)،
    // والنتيجةُ تخرج بشكلٍ واحدٍ مهما اختلفت الشركة. إضافةُ شركةٍ = ملفٌّ جديد
    // في services/delivery/providers، بلا لمسِ هذا المسار.
    // ترجمةُ المدينة إلى مُعرِّفِ الشركة قبل الإرسال. التاجرُ كتب «كازا» أو
    // «الدار البيضاء»؛ الشركةُ تريد 18. غيابُ الخريطة ليس عطبًا — نُرسل الاسمَ
    // كما كان (سلوكُ ما قبل هذه الطبقة) ونُسجّل الملاحظة.
    const canonical = cityEngine.resolve(order.city);
    let externalCityId = null;
    if (canonical) {
      try { externalCityId = await db.getExternalCityId(req.user.id, prov.id, canonical.id); }
      catch { /* الخريطةُ اختياريّة */ }
    }
    if (canonical && !externalCityId) {
      steps.push({
        label: `مدينة «${canonical.name}» بلا مُعرِّفٍ لدى ${prov.name}`,
        ok: true,
        detail: 'يُرسَل الاسمُ نصًّا — زامِن المدن من صفحة التوصيل لدقّةٍ أعلى',
      });
    }

    const chosen = registry.resolve(prov);
    if (chosen) {
      const plugin = chosen.handler;
      const label = `إرسال بيانات الشحنة إلى ${prov.name} (${chosen.label})`;
      try {
        const result = await plugin.createShipment(
          {
            ...order,
            currency: settings.brand?.currency || 'MAD',
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
          });
          await db.addLog({
            userId: req.user.id, user: 'System',
            action: `✅ شحنة حقيقية عبر ${chosen.label}: ${order.id}`,
            details: `تتبع: ${realTracking}`, type: 'delivery', severity: 'success',
          });
          await db.addNotification({
            userId: req.user.id, type: 'success',
            message: `📦 أُنشئت شحنة حقيقية لدى ${prov.name} — تتبع: ${realTracking}`,
          });
          return res.json({
            success: true, tracking: realTracking, provider: prov.name, real: true,
            via: plugin.meta.id, steps, manual: { copyText: manualCopy, openUrl },
          });
        }
        failures.push(`${chosen.label}: ${result.error}`);
        steps.push({ label, ok: false, error: result.error });
      } catch (e) {
        console.error(`[Delivery/${plugin.meta.id}]`, e.message);
        failures.push(`${chosen.label}: ${e.message}`);
        steps.push({ label, ok: false, error: e.message });
      }
    }

    // ── Simulation fallback ──────────────────────────────────────────
    const why = failures.length ? failures.join(' · ') : 'لا يوجد مفتاح API أو Webhook مهيأ لهذه الشركة';
    if (!failures.length) steps.push({ label: `لا قناة ربط حقيقية مهيأة لشركة ${prov.name}`, ok: false, error: 'أضف مفتاح API أو Webhook من صفحة التوصيل، أو استخدم الإدخال اليدوي' });
    // ── لا رقمَ تتبّعٍ مُفبرك ───────────────────────────────────────
    //   كان يُولَّد `TRK-XXXXXX` ويُكتَب في **نفس حقل** رقمِ التتبّع الحقيقيّ،
    //   فيظهر في بطاقة الطلب بلونٍ أخضرَ ويُطبَع على الفاتورة التي تُسلَّم
    //   للزبون. لا شيءَ بعدها يميّز رقمًا جاء من الشركة عن رقمٍ اخترعناه —
    //   والتاجرُ يفتح موقعَ الشركة فلا يجد شيئًا، بحقّ.
    //
    //   `trackingNumber` معناه من الآن **واحدٌ لا ثانيَ له**: رقمٌ جاء من
    //   شركةِ توصيل. وحين لا نُرسل، نقول إنّنا لم نُرسل ونطلب الإدخالَ اليدويّ.
    steps.push({ label: 'لم يُولَّد رقمُ تتبّع — لم تُرسَل الشحنةُ فعلًا', ok: false, error: 'أدخل الرقمَ من موقع الشركة بعد تسجيل الطلب فيه' });
    await db.updateOrder(order.id, {
      status: 'processing',
      deliveryProvider: prov.name,
      deliveryStatus: 'manual_required',
      trackingNumber: '',
    });
    await db.addLog({ userId: req.user.id, user: 'System', action: `⚠️ لم تُرسَل — إدخالٌ يدويٌّ مطلوب: ${order.id}`, details: `${prov.name} — السبب: ${why}`, type: 'delivery', severity: 'warning' });
    await db.addNotification({ userId: req.user.id, type: 'warning', message: `⚠️ طلب ${order.id}: لم يُرسل لشركة ${prov.name} — سجّله في موقعها وأدخل رقمَ التتبّع (السبب: ${why})` });
    res.json({ success: true, tracking: '', provider: prov.name, real: false, needsManual: true, apiError: why, openUrl, steps, manual: { copyText: manualCopy, openUrl } });
  } catch (e) { console.error('[delivery/create]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// (حُذف `POST /simulate/:orderId`: مسارٌ قديمٌ يفبرك رقمَ تتبّعٍ ويكتبه في
//  حقلِ الرقم الحقيقيّ — نفسُ العطب الذي أُصلح أعلاه، بمدخلٍ ثانٍ. لم تكن
//  تناديه أيُّ شاشة؛ إبقاؤه كان يعني بابًا خلفيًّا يُعيد الكذبة.)

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

// ── نقاطٌ تعتمد على القدرات لا على اسم الشركة ────────────────────────────────

/** يختار أوّلَ مزوّدٍ مفعّلٍ يملك القدرةَ المطلوبة بالوضع المطلوب. */
async function _pickCapable(userId, capability, mode) {
  const providers = (await db.getDeliveryProviders(userId)).filter(p => p.enabled);
  for (const row of providers) {
    const chosen = registry.resolve(row);
    const plugin = chosen?.handler;
    if (plugin && plugin.capabilities?.[capability] === mode) return { row, plugin };
  }
  return null;
}

// GET /api/delivery/cities — من أيّ مزوّدٍ يُعلن cities:'api'
router.get('/cities', auth, async (req, res) => {
  try {
    const found = await _pickCapable(req.user.id, 'cities', 'api');
    if (!found) return res.status(404).json({ error: 'لا يوجد مزوّد مفعّل يدعم جلب المدن' });
    const result = await found.plugin.getCities(found.row);
    if (result.success) return res.json({ success: true, provider: found.plugin.meta.id, cities: result.cities });
    return res.status(502).json({ error: result.error || 'فشل جلب المدن' });
  } catch (e) {
    console.error('[delivery/cities]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/delivery/quote — عرضُ سعرٍ موحَّد (DeliveryQuote) لمدينةٍ ما.
// حلّ محلّ /fees الذي كان يُرجع شكلَ Livo الخام.
router.get('/quote', auth, async (req, res) => {
  try {
    const providers = (await db.getDeliveryProviders(req.user.id)).filter(p => p.enabled);
    if (!providers.length) return res.status(400).json({ error: 'No delivery provider configured' });
    const city = String(req.query.city || '');
    const canonical = cityEngine.resolve(city);
    const settings = await db.getSettings(req.user.id) || {};
    const quotes = [];
    for (const row of providers) {
      const chosen = registry.resolve(row);
      const plugin = chosen?.handler;
      if (!plugin) continue;
      const total = +req.query.total || 0;
      const weight = +req.query.weight || 0;
      try {
        // الشركةُ التي تُسعّر عبر API هي الأدرى بثمنها. ومَن لا يملك مصدرًا
        // (pricing:'rules' أو 'none') يُسعَّر بقواعد التاجر — لا برقمٍ مخترع.
        let q;
        if (plugin.capabilities?.pricing === 'api' && typeof plugin.calculateQuote === 'function') {
          q = await plugin.calculateQuote({ city, cityId: canonical?.id, total, weight }, row);
        }
        if (!q || q.supported === false) {
          const rules = await db.getPricingRules(req.user.id, row.id);
          q = pricing.evaluate(
            { cityId: canonical?.id, cityName: canonical?.name, region: canonical?.region,
              weight, orderTotal: total, codAmount: total },
            rules,
            { fallbackFee: resolveDeliveryFee(city, settings.deliveryCosts),
              currency: settings.brand?.currency || 'MAD' }
          );
        }
        quotes.push({ providerId: plugin.meta.id, providerName: row.name, ...q });
      } catch (e) {
        quotes.push({ providerId: plugin.meta.id, providerName: row.name, supported: false, reason: e.message });
      }
    }
    res.json({ success: true, city, canonical, quotes });
  } catch (e) {
    console.error('[delivery/quote]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/delivery/track/:orderId — حالةٌ حيّةٌ من أيّ مزوّدٍ يُعلن tracking:'api'
router.post('/track/:orderId', auth, async (req, res) => {
  try {
    const order = await db.getOrder(req.params.orderId);
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    const shipmentId = order.providerShipmentId || order.livoOrderId;
    if (!shipmentId) {
      return res.status(400).json({
        error: 'هذه الشحنة لا تحمل معرّفًا لدى الشركة — أُنشئت قبل تفعيل التتبّع أو لم تُرسل فعليًّا'
      });
    }

    const found = await _pickCapable(req.user.id, 'tracking', 'api');
    if (!found) return res.status(400).json({ error: 'لا يوجد مزوّد مفعّل يدعم التتبّع' });

    const result = await found.plugin.trackShipment(shipmentId, found.row);
    if (!result.success) return res.status(502).json({ error: result.error || 'تعذّر جلب الحالة' });

    await db.updateOrder(order.id, {
      deliveryStatus: result.status || '',
      deliverySyncedAt: new Date().toISOString(),
    });
    await db.addLog({
      userId: req.user.id, user: 'System',
      action: `تحديث حالة ${found.plugin.meta.name}: ${order.id}`,
      details: result.status || '(بدون حالة)', type: 'delivery', severity: 'info'
    });

    res.json({
      success: true, status: result.status || '', history: result.history || [],
      trackingNumber: result.trackingNumber || order.trackingNumber,
    });
  } catch (e) {
    console.error('[delivery/track]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/delivery/verify/:providerRowId — تحقّقٌ حقيقيٌّ خطوةً خطوة.
//
//   «اختبار الاتصال» القديم كان يُرسل طلبَ HEAD إلى موقع الشركة ويقول «تستجيب».
//   وهذا لا يُثبت شيئًا عمّا يهمّ: هل المفتاحُ صحيح؟ هل الشركةُ تقبلنا؟ هل
//   نستطيع قراءةَ مدنها؟ فكان التاجرُ يرى «✅» ثمّ تفشل أوّلُ شحنةٍ حقيقيّة.
//   هنا كلُّ فحصٍ يُنفَّذ فعلًا ويُعاد بنتيجته وسببِها.
router.post('/verify/:providerRowId', auth, async (req, res) => {
  const checks = [];
  let unmatchedCities = [];
  const add = (key, label, ok, detail) => checks.push({ key, label, ok, detail: detail || '' });
  try {
    const rows = await db.getDeliveryProviders(req.user.id);
    const row = rows.find(r => r.id === req.params.providerRowId);
    if (!row) return res.status(404).json({ error: 'شركة التوصيل غير موجودة' });

    add('saved', 'الشركة مسجّلة في قاعدة البيانات', true, row.name);
    add('enabled', 'الشركة مفعّلة', !!row.enabled,
      row.enabled ? '' : 'مُعطّلة — لن تُستعمل في الشحن');

    // صفوفٌ حُفظت قبل أن يصير النوعُ حقلًا ظاهرًا: نُثبّت مزوّدَها الآن إن
    // كان نطاقُها قاطعًا، فالتحقّقُ الذي يكتشف العطبَ ولا يُصلحه نصفُ تحقّق.
    if (!String(row.apiType || '').trim()) {
      const guess = registry.suggest(row);
      if (guess) {
        try {
          await db.upsertDeliveryProvider({ ...row, userId: req.user.id, apiType: guess });
          row.apiType = guess;
          add('adopted', 'نوع الشركة', true, `عُرِّفت تلقائيًّا كمزوّد «${guess}» من نطاقها وحُفظ`);
        } catch (e) {
          add('adopted', 'نوع الشركة', false, `تعذّر حفظ النوع المستدَلّ: ${e.message}`);
        }
      }
    }

    const chosen = registry.resolve(row);
    if (!chosen) {
      add('plugin', 'قناة الربط', false,
        `لا مزوّدَ لـ«${row.apiType || '—'}» ولا رابطَ webhook — الشحنُ سيسقط إلى المحاكاة`);
      return res.json({ success: false, provider: row.name, checks, unmatched: [] });
    }
    add('plugin', 'قناة الربط', true, `${chosen.label} (${chosen.kind === 'provider' ? 'مزوّد' : 'وسيلة اتصال'})`);

    const plugin = chosen.handler;
    add('credentials', 'بيانات الاعتماد مُدخَلة', !!row.apiKey,
      row.apiKey ? 'مفتاحٌ محفوظٌ ومشفَّر' : 'لا مفتاح — أدخِله أوّلًا');

    // الفحصُ الحقيقيّ: المفتاحُ يُجرَّب على الشركة نفسِها.
    if (typeof plugin.testConnection === 'function') {
      if (!row.apiKey) {
        add('auth', 'الشركة تقبل المفتاح', false, 'لا مفتاحَ ليُجرَّب');
      } else {
        try {
          const ok = await plugin.testConnection(row);
          add('auth', 'الشركة تقبل المفتاح', !!ok,
            ok ? 'ردَّت الشركةُ بالقبول' : 'رفضت الشركةُ المفتاح أو انتهت صلاحيّتُه');
        } catch (e) {
          add('auth', 'الشركة تقبل المفتاح', false, e.message);
        }
      }
    } else {
      add('auth', 'الشركة تقبل المفتاح', null, 'هذه القناة لا تُقدّم فحصَ اعتماد');
    }

    // قراءةُ بياناتٍ فعليّة — أقوى دليلٍ على أنّ الربط يعمل.
    //
    //   وما يُقرَأ يُحفَظ: كان التحقّقُ يجلب مدنَ الشركة ثمّ يرميها، فيقول
    //   «✅ قرأنا 42 مدينة» ويقول بعده «لم تُزامَن بعد» — التاجرُ يرى الربطَ
    //   ناجحًا والتطبيقَ بلا معلوماتِ الشركة. الجلبُ نفسُه هو المزامنة.
    if (plugin.capabilities?.cities === 'api' && typeof plugin.getCities === 'function') {
      try {
        const r = await plugin.getCities(row);
        if (!r.success) {
          add('data', 'قراءة بيانات من الشركة', false, r.error || 'فشلت القراءة');
        } else {
          const list = r.cities || [];
          const { matched, unmatched } = cityEngine.matchAll(list);
          let saved = 0;
          try { saved = await db.saveCityMappings(req.user.id, row.id, matched); }
          catch (e) { console.warn('[delivery/verify] حفظ الخرائط', e.message); }
          add('data', 'قراءة بيانات من الشركة', true,
            `${list.length} مدينة · رُبطت ${saved}`
            + (unmatched.length ? ` · ${unmatched.length} بلا مطابقة` : ''));
          unmatchedCities = unmatched;
        }
      } catch (e) {
        add('data', 'قراءة بيانات من الشركة', false, e.message);
      }
    }

    // الخرائطُ المحفوظة — هل رُبطت العناصرُ فعلًا؟
    try {
      const maps = await db.getCityMappings(req.user.id, row.id);
      add('mapping', 'المدن مربوطة بمُعرِّفات الشركة', maps.length > 0,
        maps.length ? `${maps.length} مدينة` : 'لم تُزامَن بعد — الشحنُ سيرسل اسمَ المدينة نصًّا');
    } catch { /* الخرائطُ اختياريّة */ }

    const failed = checks.filter(c => c.ok === false);
    // المدنُ التي لم يفهمها المحرّك تخرج صراحةً: تُعرَض هنا لا عند أوّل شحنةٍ فاشلة.
    res.json({ success: failed.length === 0, provider: row.name, checks, unmatched: unmatchedCities });
  } catch (e) {
    console.error('[delivery/verify]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── خرائط المدن ──────────────────────────────────────────────────────────────

// GET /api/delivery/cities/canonical — مدنُ AMANZINE المعياريّة (ما يراه التاجر)
router.get('/cities/canonical', auth, (req, res) => {
  res.json({ success: true, cities: cityEngine.all() });
});

// POST /api/delivery/sync-cities/:providerRowId — يجلب مدنَ الشركة ويُطابقها
router.post('/sync-cities/:providerRowId', auth, async (req, res) => {
  try {
    const rows = await db.getDeliveryProviders(req.user.id);
    const row = rows.find(r => r.id === req.params.providerRowId);
    if (!row) return res.status(404).json({ error: 'شركة التوصيل غير موجودة' });

    const chosen = registry.resolve(row);
    const plugin = chosen?.handler;
    if (!plugin || typeof plugin.getCities !== 'function' || plugin.capabilities?.cities !== 'api') {
      return res.status(400).json({ error: `${row.name} لا تُقدّم قائمةَ مدنٍ عبر API` });
    }

    const result = await plugin.getCities(row);
    if (!result.success) return res.status(502).json({ error: result.error || 'فشل جلب المدن' });

    const { matched, unmatched } = cityEngine.matchAll(result.cities);
    const saved = await db.saveCityMappings(req.user.id, row.id, matched);

    await db.addLog({
      userId: req.user.id, user: 'System',
      action: `🗺️ مزامنة مدن ${row.name}`,
      details: `${saved} مُطابَقة · ${unmatched.length} بلا مطابقة`,
      type: 'delivery', severity: unmatched.length ? 'warning' : 'success',
    });

    // المجهولُ يُعاد صراحةً: مدينةٌ لدى الشركة لم تُفهَم يجب أن يراها التاجر
    // بدل أن تختفي، وإلّا اكتشفها عند أوّل شحنةٍ فاشلة.
    res.json({ success: true, provider: row.name, matched: saved, unmatched });
  } catch (e) {
    console.error('[delivery/sync-cities]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/delivery/city-mappings/:providerRowId — الخريطة المحفوظة
router.get('/city-mappings/:providerRowId', auth, async (req, res) => {
  try {
    res.json({ success: true, mappings: await db.getCityMappings(req.user.id, req.params.providerRowId) });
  } catch (e) {
    console.error('[delivery/city-mappings]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── قواعد التسعير ────────────────────────────────────────────────────────────

router.get('/pricing-rules', auth, async (req, res) => {
  try { res.json({ success: true, rules: await db.listPricingRules(req.user.id) }); }
  catch (e) { console.error('[delivery/rules]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.post('/pricing-rules', auth, async (req, res) => {
  try {
    const b = req.body || {};
    if (!pricing.RULE_TYPES.includes(b.ruleType)) {
      return res.status(400).json({ error: `نوعُ قاعدةٍ غيرُ مدعوم — المتاح: ${pricing.RULE_TYPES.join(', ')}` });
    }
    const id = await db.upsertPricingRule({ ...b, userId: req.user.id });
    res.json({ success: true, id, rules: await db.listPricingRules(req.user.id) });
  } catch (e) { console.error('[delivery/rules]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/pricing-rules/:id', auth, async (req, res) => {
  try {
    await db.deletePricingRule(req.params.id, req.user.id);
    res.json({ success: true, rules: await db.listPricingRules(req.user.id) });
  } catch (e) { console.error('[delivery/rules]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/delivery/registry — المزوّدون المتاحون وقدراتُهم (للوحة الإدارة)
router.get('/registry', auth, (req, res) => {
  res.json({ providers: registry.list(), rejected: registry.rejected() });
});

// ── Helper ────────────────────────────────────────────────────────────────────

module.exports = router;
