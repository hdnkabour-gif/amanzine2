'use strict';

// ============================================================
// البريد — ناقلٌ واحد.
//
//   كان النقلُ (nodemailer transport) محبوسًا داخل `otp.js` بلا تصدير، فقناةُ
//   البريد في محرّك الإشعارات بقيت `seam` فارغًا رغم أنّ الناقلَ يعمل ويُرسل
//   رموزَ التحقّق كلَّ يوم. الفصلُ هنا يجعل الناقلَ متاحًا لكلّ من يحتاجه،
//   ويبقى مصدرُ الإعدادات واحدًا.
// ============================================================

const nodemailer = require('nodemailer');
const https = require('https');

let _transport = null;

// ============================================================
// ناقلان: SMTP، وBrevo عبر واجهتها — **والثاني هو العامل في الإنتاج**.
//
//   قِيس على متغيّرات المنصّة: `SMTP_HOST` و`SMTP_USER` و`SMTP_PASS` **غيرُ
//   مضبوطةٍ إطلاقًا**، و`BREVO_API_KEY` مضبوط. أي أنّ `getTransport()` تُرجع
//   `null` دائمًا في الإنتاج ⇒ **لا بريدَ يخرج**: لا رمزَ تحقّقٍ ولا ترحيبَ
//   ولا إشعار. والتحقّقُ الموحَّد الذي بُني للتوّ كان سيقول «ما كايناش شي
//   قناة» لكلّ إنسان.
//
//   وBrevo مستعملةٌ في المشروع أصلًا (`routes/orders.js`) بمفتاحٍ **لكلّ
//   تاجرٍ** من إعداداته. فالناقصُ مفتاحُ المنصّة العامّ لِما ليس له تاجر:
//   رمزُ تحقّقٍ · بريدُ ترحيب · استرجاعُ كلمة السرّ.
//
//   ولا نسخةَ ثالثة: `_sendBrevoEmail` في `orders.js` تفعل هذا بالضبط،
//   وستُحوَّل إلى هنا — نفسُ درسِ مُرسِل واتساب الذي كُتب أربع مرّات.
// ============================================================

const brevoKey = () => process.env.BREVO_API_KEY || '';
const SENDER_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@amanzine.shop';
const SENDER_NAME = process.env.MAIL_FROM_NAME || 'AMANZINE';

/** إرسالٌ عبر واجهة Brevo. لا يرمي أبدًا. */
function _sendViaBrevo({ apiKey, to, toName, subject, html, text }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const body = JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to, name: toName || to }],
      subject: subject || 'AMANZINE',
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    });
    const req = https.request({
      hostname: 'api.brevo.com', path: '/v3/smtp/email', method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (rs) => { rs.resume(); finish(rs.statusCode < 300 ? { sent: true } : { sent: false, reason: `HTTP ${rs.statusCode}` }); });
    req.on('error', (e) => finish({ sent: false, reason: e.message }));
    req.setTimeout(8000, () => { req.destroy(); finish({ sent: false, reason: 'timeout' }); });
    req.end(body);
  });
}

/** الناقل، أو null إن لم تُضبط بيئةُ SMTP. */
function getTransport() {
  if (_transport) return _transport;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  _transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transport;
}

/**
 * هل البريدُ مهيّأ؟ — بأيّ ناقلٍ كان. تشخيصٌ ظاهرٌ بدل فشلٍ صامت.
 *
 *   كانت تسأل عن SMTP وحدَه، فأعلنت «لا بريد» بينما Brevo مضبوطةٌ وتعمل —
 *   وأغلقت قناةَ البريد في التحقّق وفي محرّك الإشعارات معًا.
 */
function available() {
  return !!(brevoKey() || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
}

/** أيُّ ناقلٍ سيُستعمل — يُعرَض في نقطة الصحّة فلا يُخمَّن. */
function transportKind() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  return brevoKey() ? 'brevo' : 'none';
}

/**
 * يُرسل بريدًا. لا يرمي — الإشعارُ الفاشل لا يُسقط عمليّةَ عمل.
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
async function send({ to, subject, html, text, from, toName } = {}) {
  if (!to) return { sent: false, reason: 'no-recipient' };
  const transport = getTransport();
  // SMTP أوّلًا حين يكون مضبوطًا (نقلٌ مباشرٌ بلا طرفٍ ثالث)، وإلّا Brevo.
  if (!transport) {
    const key = brevoKey();
    if (!key) return { sent: false, reason: 'not-configured' };
    return _sendViaBrevo({ apiKey: key, to, toName, subject, html, text });
  }
  try {
    await transport.sendMail({
      from: from || process.env.SMTP_FROM || `"AMANZINE" <${process.env.SMTP_USER}>`,
      to, subject: subject || 'AMANZINE', html, text,
    });
    return { sent: true };
  } catch (e) {
    console.error('[mailer] فشل الإرسال:', e.message);
    return { sent: false, reason: e.message };
  }
}

/** قالبٌ بسيطٌ بهويّة AMANZINE — كي لا يُعاد بناءُ التنسيق في كلّ نداء. */
function wrap(title, body) {
  return `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:20px;background:#07080D;color:#E8E4DC;border-radius:12px">
    <h2 style="color:#FF6A00;text-align:center;margin:0 0 14px">${title}</h2>
    <div style="background:#1a1b21;border-radius:8px;padding:16px;font-size:14px;line-height:1.7">${body}</div>
    <p style="color:#888;font-size:12px;text-align:center;margin-top:14px">AMANZINE — كل كلمة عندها طريق</p>
  </div>`;
}

module.exports = { getTransport, available, transportKind, send, wrap, _sendViaBrevo };
