'use strict';

// ============================================================
// إرسالُ واتساب — مُرسِلٌ واحد.
//
//   كان نفسُ النداء (graph.facebook.com/v19.0/<phoneId>/messages) مكتوبًا
//   **أربع مرّات** في المشروع: broadcast.js وorders.js (ثلاث نسخ) وsettings.js
//   — بمهلاتٍ مختلفةٍ ومعالجةِ أخطاءٍ مختلفة. أيُّ إصلاحٍ كان يجب أن يُطبَّق
//   أربعًا، وهذا بالضبط سببُ بقاء قناة الواتساب في محرّك الإشعارات فارغةً:
//   لم يكن هناك ما يُستدعى.
//
//   لا مفاتيحَ هنا: المُرسِلُ يستقبل بيانات الاعتماد ولا يعرف من أين جاءت.
// ============================================================

const https = require('https');

/** بيانات اعتماد واتساب من إعدادات تاجرٍ، أو null إن لم تُهيَّأ. */
function credsFromSettings(settings) {
  const wa = settings?.social?.whatsapp;
  const token = wa?.accessToken, phoneId = wa?.pageId;
  return (token && phoneId) ? { token, phoneId } : null;
}

/** رقمٌ صالحٌ للإرسال: أرقامٌ فقط. الفارغُ يُرجع '' فلا يُرسَل شيء. */
function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/**
 * يُرسل رسالةً نصّيّة. لا يرمي أبدًا — الإشعارُ الفاشل لا يُسقط عمليّةَ عمل.
 * @param {{token:string, phoneId:string, to:string, text:string, timeoutMs?:number}} p
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
function sendText({ token, phoneId, to, text, timeoutMs = 8000 }) {
  const num = normalizePhone(to);
  if (!token || !phoneId) return Promise.resolve({ sent: false, reason: 'not-configured' });
  if (!num) return Promise.resolve({ sent: false, reason: 'no-phone' });
  if (!text) return Promise.resolve({ sent: false, reason: 'no-text' });

  const body = JSON.stringify({ messaging_product: 'whatsapp', to: num, type: 'text', text: { body: String(text) } });

  return new Promise(resolve => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const req = https.request({
      hostname: 'graph.facebook.com',
      path: `/v19.0/${phoneId}/messages`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      res.resume();
      finish({ sent: res.statusCode < 300, reason: res.statusCode < 300 ? undefined : `HTTP ${res.statusCode}` });
    });
    req.on('error', e => finish({ sent: false, reason: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); finish({ sent: false, reason: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

/** رابطُ محادثةٍ يدويّة — البديلُ حين لا تكون الواجهةُ البرمجيّة مهيّأة. */
function manualLink(phone) {
  const num = normalizePhone(phone);
  return num ? `https://wa.me/${num}` : '';
}

module.exports = { sendText, credsFromSettings, normalizePhone, manualLink };
