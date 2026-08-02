'use strict';
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const { db }  = require('../database');
const webpush = require('web-push');
const path    = require('path');
const fs      = require('fs');

// VAPID keys — generated once, stored in data/vapid.json
const VAPID_FILE = path.join(__dirname, '..', 'data', 'vapid.json');

function getVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.log('[Push] Using VAPID keys from environment variables (persistent)');
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (fs.existsSync(VAPID_FILE)) {
    try { const keys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')); if (keys.publicKey && keys.privateKey) return keys; } catch {}
  }
  const keys = webpush.generateVAPIDKeys();
  try { fs.mkdirSync(path.dirname(VAPID_FILE), { recursive: true }); fs.writeFileSync(VAPID_FILE, JSON.stringify(keys)); } catch (e) { console.warn('[Push] Could not write vapid.json:', e.message); }
  console.log('[Push] ⚠️  Generated new VAPID keys — existing subscriptions are now invalid.');
  console.log('[Push] 📋 Add these to Railway env vars:');
  console.log(`[Push]    VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`[Push]    VAPID_PRIVATE_KEY=${keys.privateKey}`);
  return keys;
}

const vapid = getVapidKeys();
const CONTACT = process.env.ADMIN_EMAIL ? `mailto:${process.env.ADMIN_EMAIL}` : 'mailto:admin@amanzine.shop';

webpush.setVapidDetails(CONTACT, vapid.publicKey, vapid.privateKey);
console.log(`[Push] VAPID public key: ${vapid.publicKey.slice(0, 20)}...`);

// GET /api/push/vapid-key  — returns the public key for the frontend
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: vapid.publicKey });
});

// POST /api/push/subscribe  — saves user's push subscription
router.post('/subscribe', auth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription object' });
  try {
    const settings = await db.getSettings(req.user.id) || {};
    const subs = settings.pushSubscriptions || [];
    // Avoid duplicates (same endpoint)
    const already = subs.some(s => s.endpoint === subscription.endpoint);
    if (!already) subs.push(subscription);
    await db.saveSettings(req.user.id, { ...settings, pushSubscriptions: subs });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/push/unsubscribe  — removes a push subscription
router.post('/unsubscribe', auth, async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  try {
    const settings = await db.getSettings(req.user.id) || {};
    const subs = (settings.pushSubscriptions || []).filter(s => s.endpoint !== endpoint);
    await db.saveSettings(req.user.id, { ...settings, pushSubscriptions: subs });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * يُرسل إشعارًا فوريًّا لكلّ اشتراكات المستخدم.
 *
 *   كانت تُرجع `undefined` في كلّ الحالات، فمحوّلُ القناة يفترض النجاح ويقول
 *   «✅ وصل» **ولا مشترِكَ أصلًا**. تشخيصٌ يكذب بلطفٍ أسوأُ من غيابه: يُقنعك
 *   أنّ القناةَ تعمل فتبحث عن العطب في مكانٍ آخر.
 *
 * @returns {Promise<{sent:boolean, delivered:number, subscriptions:number, reason?:string}>}
 */
async function notifyUser(userId, title, body, data = {}) {
  const settings = await db.getSettings(userId) || {};
  const subs = settings.pushSubscriptions || [];
  // لا مشترِك ⇒ لم يُرسَل شيء. هذه ليست حالةَ نجاح.
  if (!subs.length) return { sent: false, delivered: 0, subscriptions: 0, reason: 'no-subscription' };

  const payload = JSON.stringify({ title, body, ...data });
  const dead = [];
  let delivered = 0;

  await Promise.allSettled(subs.map(async (sub, i) => {
    try {
      await webpush.sendNotification(sub, payload);
      delivered++;
    } catch (e) {
      if (e.statusCode === 410 || e.statusCode === 404) dead.push(i);
    }
  }));

  // Clean up dead subscriptions (unsubscribed browsers)
  if (dead.length) {
    const alive = subs.filter((_, i) => !dead.includes(i));
    await db.saveSettings(userId, { ...settings, pushSubscriptions: alive });
  }

  return {
    sent: delivered > 0,
    delivered,
    subscriptions: subs.length,
    ...(delivered ? {} : { reason: dead.length ? 'all-expired' : 'send-failed' }),
  };
}

module.exports = router;
module.exports.notifyUser = notifyUser;
