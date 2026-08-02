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

let _transport = null;

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

/** هل البريدُ مهيّأ؟ — تشخيصٌ ظاهرٌ بدل فشلٍ صامت. */
function available() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * يُرسل بريدًا. لا يرمي — الإشعارُ الفاشل لا يُسقط عمليّةَ عمل.
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
async function send({ to, subject, html, text, from } = {}) {
  const transport = getTransport();
  if (!transport) return { sent: false, reason: 'not-configured' };
  if (!to) return { sent: false, reason: 'no-recipient' };
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

module.exports = { getTransport, available, send, wrap };
