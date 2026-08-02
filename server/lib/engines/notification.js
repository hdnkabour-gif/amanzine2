'use strict';
// ============================================================
// Notification Engine — يستقبل من Rules Engine (لا من الـBus مباشرة)
// ويوزّع على القنوات خلف واجهة موحّدة.
//
//   كانت ثلاثٌ من أربع قنواتٍ **فارغة**: `whatsapp` و`email` و`push` كلُّها
//   `seam` يُرجع بلا فعل، بينما البنيةُ الحقيقيّة لكلٍّ منها موجودةٌ في
//   المشروع وتعمل (`routes/push` يُرسل فعلًا · `otp.js` يُرسل بريدًا كلَّ
//   يوم · أربعُ نسخٍ من مُرسِل واتساب). أي: لم يكن ينقص تكاملٌ خارجيّ — كان
//   ينقص **وصل**. وُصلت الآن بمُرسِلاتٍ مشتركة.
//
//   وأخطرُ من ذلك: فكُّ `businessId` كان يعرف `store:` فقط ويُرجع null لكلّ
//   `provider:` و`listing:` ⇒ **المزوّدُ لا يمكن إشعارُه إطلاقًا**، فحجزٌ
//   جديدٌ عليه لا يصل أحدًا. الفكُّ صار استعلامًا في قاعدة البيانات.
//
//   إضافةُ قناة = adapter جديد في CHANNELS، بلا لمس القواعد.
// ============================================================
const { db } = require('../../database');
const mailer = require('../mailer');
const wa = require('../whatsapp');

// محوّلات القنوات — واجهة موحّدة send(ctx)
//   ctx = { audience, businessId, owner:{userId,phone,kind}, message, event }
// كلُّ محوّلٍ يُرجع { sent, reason? } — «لم يُهيَّأ» ليس فشلًا، بل حالةٌ تُقال.
const CHANNELS = {
  'in-app': async ({ owner, message }) => {
    if (!owner.userId) return { sent: false, reason: 'no-owner' };
    await db.addNotification({ userId: owner.userId, type: 'info', message });
    return { sent: true };
  },

  'push': async ({ owner, message, event }) => {
    if (!owner.userId) return { sent: false, reason: 'no-owner' };
    // يُحمَّل كسولًا: `routes/push` يُهيّئ VAPID عند التحميل، ولا داعيَ لذلك
    // في العمليّات التي لا تُشعِر أحدًا.
    let notifyUser;
    try { notifyUser = require('../../routes/push').notifyUser; } catch { return { sent: false, reason: 'unavailable' }; }
    if (typeof notifyUser !== 'function') return { sent: false, reason: 'unavailable' };
    await notifyUser(owner.userId, 'AMANZINE', String(message), { event: event?.type || '' });
    return { sent: true };
  },

  'email': async ({ owner, message }) => {
    if (!mailer.available()) return { sent: false, reason: 'not-configured' };
    if (!owner.userId) return { sent: false, reason: 'no-owner' };
    const user = await db.getUser(owner.userId).catch(() => null);
    if (!user?.email) return { sent: false, reason: 'no-email' };
    return mailer.send({
      to: user.email,
      subject: 'AMANZINE — تنبيه على نشاطك',
      html: mailer.wrap('تنبيهٌ جديد', String(message)),
      text: String(message),
    });
  },

  'whatsapp': async ({ owner, message }) => {
    // الرقمُ من النشاط نفسه (مزوّد/إعلان)، وإلّا من هاتف المتجر في الإعدادات.
    let to = owner.phone || null;
    let settings = null;
    if (owner.userId) settings = await db.getSettings(owner.userId).catch(() => null);
    if (!to) to = settings?.brand?.phone || null;

    const creds = wa.credsFromSettings(settings);
    if (!creds) {
      // غيرُ مهيّأ: بدل الصمت، يُترك للتاجر رابطُ محادثةٍ يدويّة في التطبيق —
      // فيبقى الحدثُ واصلًا ولو بيده.
      if (owner.userId && to) {
        await db.addNotification({
          userId: owner.userId, type: 'info',
          message: `${message} — أشعِر يدويًّا: ${wa.manualLink(to)}`,
        }).catch(() => {});
      }
      return { sent: false, reason: 'not-configured' };
    }
    return wa.sendText({ ...creds, to, text: String(message) });
  },
};

/**
 * تُستدعى من Rules Engine.
 * @returns {Promise<Record<string,{sent:boolean,reason?:string}>>} نتيجةُ كلّ قناة
 */
async function notify({ audience, businessId, channel = ['in-app'], message, event }) {
  // `ownerId` في حمولة الحدث يسبق كلَّ شيء: المُصدِرُ يعرف مالكَه أحيانًا.
  const explicit = event?.payload?.ownerId || null;
  const bid = explicit ? `store:${explicit}` : businessId;

  let owner = { userId: null, phone: null, kind: 'unknown' };
  try { owner = await db.getBusinessOwner(bid); } catch (e) { console.warn('[notify] owner', e.message); }

  const ctx = { audience, businessId: bid, owner, message, event };
  const results = {};
  for (const ch of channel) {
    const adapter = CHANNELS[ch];
    if (!adapter) { results[ch] = { sent: false, reason: 'unknown-channel' }; continue; }
    try { results[ch] = (await adapter(ctx)) || { sent: false, reason: 'no-result' }; }
    catch (e) { console.error('[notify]', ch, e.message); results[ch] = { sent: false, reason: e.message }; }
  }
  return results;
}

/** ما القنواتُ المهيّأة فعلًا؟ — تشخيصٌ ظاهرٌ بدل اكتشافِ الصمتِ لاحقًا. */
function channelStatus() {
  return {
    'in-app': true,
    'push': !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    'email': mailer.available(),
    // واتساب يُهيَّأ لكلّ تاجرٍ في إعداداته، لا في البيئة ⇒ لا يُحسم هنا.
    'whatsapp': null,
  };
}

module.exports = { notify, channelStatus, CHANNELS };
