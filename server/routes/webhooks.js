'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../database');
const ai     = require('../lib/ai-engine');

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'sahar_shop_verify';

// ── إشعاراتُ شركات التوصيل ───────────────────────────────────────────────────
// حتى الآن تُحدَّث حالةُ الشحنة بضغطةٍ يدويّة (POST /api/delivery/track). هذا
// يجعلها تصل وحدَها. المسارُ عامٌّ لا يعرف اسمَ شركة: يُطابق برقم التتبّع أو
// بمعرّف الشحنة، ويُطبّع الحالةَ الواردة إلى حالات AMANZINE.

/** حالاتُ الشركات مختلفة؛ التطبيعُ يمنع تسرُّبَ مفرداتها إلى قاعدتنا. */
const STATUS_MAP = {
  delivered: 'delivered', livre: 'delivered', livré: 'delivered', completed: 'delivered', 'تم التسليم': 'delivered',
  shipped: 'shipped', in_transit: 'shipped', 'en cours': 'shipped', picked_up: 'shipped', 'في الطريق': 'shipped',
  processing: 'processing', pending: 'processing', created: 'processing',
  cancelled: 'cancelled', canceled: 'cancelled', returned: 'cancelled', refused: 'cancelled', 'ملغي': 'cancelled',
};

function _normalizeStatus(raw) {
  const k = String(raw || '').trim().toLowerCase();
  return STATUS_MAP[k] || null;
}

/**
 * POST /api/webhooks/delivery/:providerRowId
 * التحقّقُ بسرٍّ مشترك: بدونه يستطيع أيُّ أحدٍ تعليمَ الطلبات «مُسلَّمة».
 */
router.post('/delivery/:providerRowId', async (req, res) => {
  try {
    const row = await db.getDeliveryProviderRow(req.params.providerRowId);
    if (!row) return res.status(404).json({ error: 'Unknown provider' });

    // السرُّ هو مفتاحُ API نفسُه — لا سرَّ ⇒ لا قبول، وإلّا صار المسارُ مفتوحًا.
    const secret = row.apiKey || '';
    const given = req.headers['x-webhook-secret'] || req.query.secret || '';
    if (!secret || String(given) !== String(secret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const b = req.body || {};
    const tracking = b.trackingNumber || b.tracking_number || b.tracking || '';
    const shipmentId = b.shipmentId || b.shipment_id || b.id || '';
    const status = _normalizeStatus(b.status || b.state || b.event);

    if (!tracking && !shipmentId) return res.status(400).json({ error: 'tracking or shipment id required' });

    const order = await db.findOrderByTracking(row.userId, { tracking, shipmentId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await db.updateOrder(order.id, {
      deliveryStatus: String(b.status || b.state || b.event || ''),
      deliverySyncedAt: new Date().toISOString(),
      // حالةُ الطلب لا تتغيّر إلّا عند تطبيعٍ مفهوم: كلمةٌ مجهولةٌ من الشركة
      // تُحفَظ كنصٍّ ولا تُحرِّك دورةَ حياة الطلب بالتخمين.
      ...(status ? { status } : {}),
    });

    await db.addLog({
      userId: row.userId, user: 'Webhook',
      action: `📥 إشعارٌ من ${row.name}: ${order.id}`,
      details: `${b.status || '—'}${status ? ` ⇒ ${status}` : ' (لم تُطبَّع)'}`,
      type: 'delivery', severity: 'info',
    });
    if (status === 'delivered') {
      await db.addNotification({ userId: row.userId, type: 'success', message: `📦 وصل الطلب ${order.id} إلى الزبون` });
    }

    res.json({ ok: true, orderId: order.id, status: status || 'unmapped' });
  } catch (e) {
    console.error('[webhooks/delivery]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Meta verification
router.get('/meta', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) return res.send(challenge);
  res.status(403).send('Forbidden');
});

// Meta webhook events
router.post('/meta', (req, res) => {
  const sig = req.headers['x-hub-signature-256'];
  const appSecret = process.env.META_APP_SECRET;
  // H-3: عند ضبط السر يصبح التحقّق إلزامياً، على الـ raw body، ومقارنة آمنة زمنياً
  if (appSecret) {
    if (!sig) return res.status(401).send('Missing signature');
    const raw = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const digest = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
    const a = Buffer.from(String(sig));
    const b = Buffer.from(digest);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).send('Invalid signature');
    }
  }

  const body = req.body;
  if (body.object === 'whatsapp_business_account' || body.object === 'page') {
    (body.entry || []).forEach(entry => {
      const changes = entry.changes || [{ value: entry }];
      changes.forEach(change => {
        const v = change.value || change;
        if (v.messages) v.messages.forEach(msg => handleIncoming(msg, v.metadata?.phone_number_id));
      });
    });
    return res.send('EVENT_RECEIVED');
  }
  res.status(404).send();
});

async function handleIncoming(msg, phoneId) {
  const from = msg.from;
  const text = msg.text?.body;
  if (!text) return;

  // Find user by WhatsApp Phone ID
  const allUsers = await db.listUsers();
  let userId = null;
  for (const u of allUsers) {
    const s = await db.getSettings(u.id);
    if (s?.social?.whatsapp?.pageId === phoneId) { userId = u.id; break; }
  }
  if (!userId) return;

  // Find or create conversation
  const convs = await db.getConversations(userId);
  let conv = convs.find(c => c.customerPhone === from);
  if (!conv) {
    conv = await db.createConversation({
      userId, customerName: from, customerPhone: from,
      source: 'WhatsApp', status: 'active', lastMessage: text, unread: 1,
    });
  }

  await db.addMessage(conv.id, { content: text, role: 'customer' });
  await db.addNotification({ userId, type: 'info', message: `💬 رسالة جديدة من ${from}` });

  const settings  = await db.getSettings(userId) || {};
  const products  = await db.getProducts(userId);
  const openaiKey = settings.ai?.apiKey    || process.env.OPENAI_API_KEY;
  const geminiKey = settings.ai?.geminiKey || process.env.GEMINI_API_KEY;
  const aiProvider = settings.ai?.provider  || 'openai';
  const model     = settings.ai?.model     || 'gpt-4o-mini';

  const storeName  = settings.brand?.name || 'متجر AMANZINE';
  const sysPrompt  = `أنت مساعد بيع ذكي لمتجر "${storeName}". تحدث بالدارجة المغربية بأسلوب ودي واحترافي. المنتجات المتاحة:\n${(products||[]).filter(p=>p.status==='published'&&p.stock>0).map(p=>`- ${p.name}: ${p.price} ${settings.brand?.currency||'MAD'}`).join('\n')}`;

  let reply = null;

  if (openaiKey && aiProvider !== 'gemini') {
    try {
      reply = await ai.getRemoteAI('openai', openaiKey, model, sysPrompt, [{ role: 'user', content: text }]);
    } catch (e) { console.warn('[Webhook/OpenAI]', e.message); }
  }

  if (!reply && geminiKey) {
    try {
      reply = await ai.getRemoteAI('gemini', geminiKey, null, sysPrompt, [{ role: 'user', content: text }]);
    } catch (e) { console.warn('[Webhook/Gemini]', e.message); }
  }

  if (!reply) reply = ai.generateLocalReply(ai.detectIntent(text), text, products, settings);

  setTimeout(async () => {
    await db.addMessage(conv.id, { content: reply, role: 'ai' });
  }, 2000);
}

module.exports = router;
