'use strict';
const router = require('express').Router();
const auth   = require('../middleware/auth');
const { db } = require('../database');
const { MASK, maskSettings, stripMasked } = require('../lib/secrets');

// H-1: الأسرار لا تُعاد للمتصفح — تُستبدل بقناع ثابت (أي XSS لن يجد ما يسرقه)
router.get('/', auth, async (req, res) => {
  try {
    const settings = await db.getSettings(req.user.id);
    res.json(maskSettings(settings || {}));
  } catch (e) { console.error('[settings]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.put('/', auth, async (req, res) => {
  try {
    const existing = await db.getSettings(req.user.id) || {};
    // H-1: قيمة القناع الواردة من الواجهة تعني "أبقِ السر المخزّن كما هو"
    const merged = deepMerge(existing, stripMasked(req.body));
    await db.saveSettings(req.user.id, merged);
    await db.addLog({ userId: req.user.id, user: 'Manager', action: 'Settings updated', details: Object.keys(req.body).join(', '), type: 'settings', severity: 'info' });
    res.json(maskSettings(merged));
  } catch (e) { console.error('[settings]', e.message); res.status(500).json({ error: 'Server error' }); }
});

router.get('/logs', auth, async (req, res) => {
  try { res.json(await db.getLogs(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/notifications', auth, async (req, res) => {
  try { res.json(await db.getNotifications(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/notifications/read', auth, async (req, res) => {
  try {
    await db.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/notifications', auth, async (req, res) => {
  try {
    await db.clearNotifications(req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/templates', auth, async (req, res) => {
  try { res.json(await db.getTemplates(req.user.id)); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/templates', auth, async (req, res) => {
  try {
    await db.saveTemplates(req.user.id, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Export data
router.get('/export', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const data = {
      exportedAt: new Date().toISOString(),
      products: await db.getProducts(uid),
      orders: await db.getOrders(uid),
      customers: await db.getCustomers(uid),
      // H-1: التصدير يمرّ عبر المتصفح — الأسرار تبقى مقنَّعة هنا أيضاً
      settings: maskSettings(await db.getSettings(uid)),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="commerce-export.json"');
    res.json(data);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    // H-2: منع Prototype Pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key] && typeof target[key] === 'object') {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// QR Code for catalog
router.get('/qr', auth, async (req, res) => {
  try {
    const settings = await db.getSettings(req.user.id) || {};
    const baseUrl = process.env.PRODUCTION_URL || `http://localhost:${process.env.PORT||3001}`;
    const catalogUrl = `${baseUrl}/store/${req.user.id}`;
    res.json({ url: catalogUrl, userId: req.user.id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/settings/server-config — tells frontend which services are active at env/server level
// Returns booleans only — NEVER exposes secrets
router.get('/server-config', auth, (req, res) => {
  res.json({
    cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
    supabase:   !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    openai:     !!(process.env.OPENAI_API_KEY),
    gemini:     !!(process.env.GEMINI_API_KEY),
    claude:     !!(process.env.ANTHROPIC_API_KEY),
    deepseek:   !!(process.env.DEEPSEEK_API_KEY),
    grok:       !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY),
    mistral:    !!(process.env.MISTRAL_API_KEY),
    whatsapp:   !!(process.env.META_VERIFY_TOKEN),
  });
});

// POST /api/settings/verify-connection — proxy for connection verification (avoid CORS)
router.post('/verify-connection', auth, async (req, res) => {
  let { service, token, pageId, apiKey } = req.body;
  const https = require('https');

  // H-1: الواجهة ترى الأسرار مقنَّعة — عند وصول القناع نستعمل السر المخزّن
  if ([token, apiKey, req.body.apiSecret, req.body.secretKey].includes(MASK)) {
    try {
      const st = (await db.getSettings(req.user.id)) || {};
      const aiKeys = { openai: st.ai?.apiKey, gemini: st.ai?.geminiKey, claude: st.ai?.claudeKey, deepseek: st.ai?.deepseekKey, grok: st.ai?.grokKey, mistral: st.ai?.mistralKey };
      if (apiKey === MASK) {
        apiKey = (service === 'brevo' ? st.marketing?.brevoApiKey
                : service === 'cloudinary' ? st.cloudinaryApiKey
                : aiKeys[service]) || apiKey;
        req.body.apiKey = apiKey;
      }
      if (token === MASK)  token  = st.social?.[service]?.accessToken || token;
      if (req.body.apiSecret === MASK) req.body.apiSecret = st.cloudinaryApiSecret || req.body.apiSecret;
      if (req.body.secretKey === MASK) req.body.secretKey = st.security?.hcaptchaSecret || req.body.secretKey;
    } catch {}
  }

  function httpsGet(hostname, path, headers) {
    return new Promise((resolve, reject) => {
      const req2 = https.request({ hostname, path, headers, method: 'GET' }, r => {
        let data = ''; r.on('data', c => data += c); r.on('end', () => resolve({ status: r.statusCode, body: data }));
      });
      req2.on('error', reject); req2.setTimeout(8000, () => { req2.destroy(); reject(new Error('Timeout')); });
      req2.end();
    });
  }

  try {
    if (service === 'openai') {
      const r = await httpsGet('api.openai.com', '/v1/models', { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.data) return res.json({ ok: true, info: `${data.data.length} models available` });
      return res.json({ ok: false, error: data.error?.message || 'Invalid key' });
    }

    if (service === 'gemini') {
      const r = await httpsGet('generativelanguage.googleapis.com', `/v1/models?key=${apiKey}`, { 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.models) return res.json({ ok: true, info: `${data.models.length} models` });
      return res.json({ ok: false, error: data.error?.message || 'Invalid key' });
    }

    if (service === 'claude') {
      // التحقق عبر SDK الرسمي — قائمة النماذج تؤكد صلاحية المفتاح
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey });
        const page = await anthropic.models.list();
        const n = (page.data || []).length;
        return res.json({ ok: true, info: `${n} نموذج متاح` });
      } catch (e) {
        return res.json({ ok: false, error: e.status === 401 ? 'المفتاح غير صحيح' : e.message });
      }
    }

    if (service === 'deepseek') {
      const r = await httpsGet('api.deepseek.com', '/models', { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.data) return res.json({ ok: true, info: `${data.data.length} نموذج` });
      return res.json({ ok: false, error: data.error?.message || 'Invalid key' });
    }

    if (service === 'grok') {
      const r = await httpsGet('api.x.ai', '/v1/models', { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.data) return res.json({ ok: true, info: `${data.data.length} نموذج` });
      return res.json({ ok: false, error: data.error?.message || data.error || 'Invalid key' });
    }

    if (service === 'mistral') {
      const r = await httpsGet('api.mistral.ai', '/v1/models', { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.data) return res.json({ ok: true, info: `${data.data.length} نموذج` });
      return res.json({ ok: false, error: data.error?.message || 'Invalid key' });
    }

    if (['facebook', 'instagram', 'whatsapp', 'messenger'].includes(service)) {
      const r = await httpsGet('graph.facebook.com', `/v19.0/me?access_token=${token}`, { 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (!data.error && data.id) {
        if (pageId) {
          const r2 = await httpsGet('graph.facebook.com', `/v19.0/${pageId}?access_token=${token}&fields=name,id`, {});
          const d2 = JSON.parse(r2.body);
          if (!d2.error) return res.json({ ok: true, name: d2.name || data.name, id: d2.id });
        }
        return res.json({ ok: true, name: data.name, id: data.id });
      }
      return res.json({ ok: false, error: data.error?.message || 'Invalid token' });
    }

    if (service === 'cloudinary') {
      const { cloudName, apiKey: cldKey, apiSecret } = req.body;
      if (!cloudName || !cldKey || !apiSecret) return res.json({ ok: false, error: 'Missing credentials' });
      const auth64 = Buffer.from(`${cldKey}:${apiSecret}`).toString('base64');
      const r = await httpsGet('api.cloudinary.com', `/v1_1/${cloudName}/usage`, { 'Authorization': `Basic ${auth64}` });
      const data = JSON.parse(r.body);
      if (r.status === 200 && !data.error) return res.json({ ok: true, info: data.credits ? `${data.credits.usage} credits` : 'متصل' });
      return res.json({ ok: false, error: data.error?.message || 'Invalid credentials' });
    }

    if (service === 'brevo') {
      const r = await httpsGet('api.brevo.com', '/v3/account', { 'api-key': apiKey, 'Content-Type': 'application/json' });
      const data = JSON.parse(r.body);
      if (r.status === 200 && data.email) return res.json({ ok: true, info: `حساب: ${data.email}` });
      return res.json({ ok: false, error: data.message || 'مفتاح غير صحيح' });
    }

    if (service === 'hcaptcha') {
      // التحقق الحقيقي من المفتاح السري: siteverify برمز وهمي —
      // مفتاح خاطئ يرجع invalid-input-secret، الصحيح يرجع invalid-input-response
      const { secretKey } = req.body;
      const form = `secret=${encodeURIComponent(secretKey || apiKey || '')}&response=test`;
      const body = await new Promise((resolve, reject) => {
        const rq = https.request({ hostname: 'api.hcaptcha.com', path: '/siteverify', method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(form) } },
          rs => { let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>resolve(d)); });
        rq.on('error', reject); rq.setTimeout(8000, () => { rq.destroy(); reject(new Error('Timeout')); });
        rq.write(form); rq.end();
      });
      const data = JSON.parse(body);
      const codes = data['error-codes'] || [];
      if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret'))
        return res.json({ ok: false, error: 'المفتاح السري غير صحيح' });
      return res.json({ ok: true, info: 'المفتاح السري سليم' });
    }

    res.json({ ok: false, error: 'Unknown service' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// POST /api/settings/verify-all — batch test all configured connections
router.post('/verify-all', auth, async (req, res) => {
  const settings = await db.getSettings(req.user.id) || {};
  const results  = {};
  const https2   = require('https');

  function httpsGet2(hostname, path, headers) {
    return new Promise((resolve) => {
      const r = https2.request({ hostname, path, headers: { 'Content-Type': 'application/json', ...headers }, method: 'GET' }, resp => {
        let data = ''; resp.on('data', c => data += c); resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on('error', () => resolve({ status: 0, body: '{}' }));
      r.setTimeout(7000, () => { r.destroy(); resolve({ status: 0, body: '{}' }); });
      r.end();
    });
  }

  const checks = [];

  if (settings.ai?.apiKey) {
    checks.push(httpsGet2('api.openai.com', '/v1/models', { 'Authorization': `Bearer ${settings.ai.apiKey}` }).then(r => {
      try { const d = JSON.parse(r.body); results.openai = { ok: r.status === 200 && !!d.data, info: d.data ? `${d.data.length} نموذج` : d.error?.message }; } catch { results.openai = { ok: false }; }
    }));
  }

  if (settings.ai?.geminiKey) {
    checks.push(httpsGet2('generativelanguage.googleapis.com', `/v1/models?key=${settings.ai.geminiKey}`, {}).then(r => {
      try { const d = JSON.parse(r.body); results.gemini = { ok: r.status === 200 && !!d.models, info: d.models ? `${d.models.length} نموذج` : d.error?.message }; } catch { results.gemini = { ok: false }; }
    }));
  }

  for (const platform of ['whatsapp', 'facebook', 'instagram']) {
    const s = settings.social?.[platform];
    if (s?.accessToken) {
      checks.push(httpsGet2('graph.facebook.com', `/v19.0/me?access_token=${s.accessToken}`, {}).then(r => {
        try { const d = JSON.parse(r.body); results[platform] = { ok: !d.error && !!d.id, info: d.name || d.error?.message }; } catch { results[platform] = { ok: false }; }
      }));
    }
  }

  if (settings.supabaseUrl && settings.supabaseKey) {
    try {
      const u = new URL(settings.supabaseUrl);
      checks.push(httpsGet2(u.hostname, '/rest/v1/', { 'apikey': settings.supabaseKey }).then(r => {
        results.supabase = { ok: r.status < 400 };
      }));
    } catch {}
  }

  if (settings.cloudinaryCloudName && settings.cloudinaryApiKey && settings.cloudinaryApiSecret) {
    const auth64 = Buffer.from(`${settings.cloudinaryApiKey}:${settings.cloudinaryApiSecret}`).toString('base64');
    checks.push(httpsGet2('api.cloudinary.com', `/v1_1/${settings.cloudinaryCloudName}/usage`, { 'Authorization': `Basic ${auth64}` }).then(r => {
      try { const d = JSON.parse(r.body); results.cloudinary = { ok: r.status === 200 && !d.error, info: d.credits ? `${d.credits.usage} credits` : undefined }; } catch { results.cloudinary = { ok: false }; }
    }));
  }

  await Promise.all(checks);
  res.json(results);
});

// GET /api/settings/backups — list available backups
router.get('/backups', auth, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  // الدوامُ يُقال، لا يُفترَض: نسخةٌ على قرص الحاوية تُمحى مع كلّ نشر، وعرضُها
  // كأنّها محفوظةٌ يبني قرارَ التاجر («عندي نسخة») على شيءٍ غيرِ موجود.
  const backup = require('../lib/backup');
  const loc = backup.location();
  if (!fs.existsSync(loc.dir)) return res.json({ backups: [], durable: loc.durable, note: loc.why });
  const files = fs.readdirSync(loc.dir)
    .filter(f => f.includes(req.user.id))
    .sort().reverse().slice(0, 10)
    .map(f => ({
      filename: f,
      date: f.split(req.user.id + '-')[1]?.replace('.json','') || f,
      size: fs.statSync(path.join(loc.dir, f)).size,
      durable: loc.durable,
    }));
  res.json({
    backups: files,
    durable: loc.durable,
    ...(loc.durable ? {} : { warning: `⚠️ نسخٌ مؤقّتة — ${loc.why}` }),
  });
});

router.get('/backups/:filename', auth, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const filename = path.basename(req.params.filename);
  if (!filename.includes(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
  const filepath = path.join(require('../lib/backup').location().dir, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Backup not found' });
  res.download(filepath);
});

// POST /api/settings/test-whatsapp — send a real test WhatsApp message to merchant's own number
router.post('/test-whatsapp', auth, async (req, res) => {
  const settings = await db.getSettings(req.user.id) || {};
  const { to } = req.body;
  const waToken  = settings.social?.whatsapp?.accessToken;
  const waPhoneId= settings.social?.whatsapp?.pageId;
  if (!waToken || !waPhoneId) return res.status(400).json({ ok: false, error: 'WhatsApp غير مربوط — أدخل Phone ID و Access Token أولاً' });
  if (!to) return res.status(400).json({ ok: false, error: 'أدخل رقم الهاتف لإرسال الرسالة التجريبية' });

  const https2 = require('https');
  const cleanTo = to.replace(/[\s\-\(\)]/g, '');
  const msg = `✅ رسالة تجريبية من AMANZINE\n\nإذا وصلتك هذه الرسالة فإن ربط WhatsApp Business يعمل بشكل صحيح! 🎉\n\nوقت الإرسال: ${new Date().toLocaleString('ar-MA')}`;
  const body = JSON.stringify({ messaging_product: 'whatsapp', to: cleanTo, type: 'text', text: { body: msg } });

  return new Promise(resolve => {
    const reqW = https2.request({
      hostname: 'graph.facebook.com',
      path: `/v19.0/${waPhoneId}/messages`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${waToken}`, 'Content-Length': Buffer.byteLength(body) },
    }, respW => {
      let d = '';
      respW.on('data', c => d += c);
      respW.on('end', () => {
        try {
          const r = JSON.parse(d);
          if (r.messages?.[0]?.id) { res.json({ ok: true, info: `تم الإرسال إلى ${cleanTo}` }); }
          else { res.json({ ok: false, error: r.error?.message || 'فشل الإرسال' }); }
        } catch { res.json({ ok: false, error: 'خطأ في استجابة WhatsApp' }); }
        resolve(undefined);
      });
    });
    reqW.on('error', (e) => { res.json({ ok: false, error: e.message }); resolve(undefined); });
    reqW.setTimeout(10000, () => { reqW.destroy(); res.json({ ok: false, error: 'انتهت مهلة الاتصال' }); resolve(undefined); });
    reqW.write(body);
    reqW.end();
  });
});

module.exports = router;
