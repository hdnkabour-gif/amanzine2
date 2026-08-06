'use strict';

// قناةُ البريد — الناقلُ من `lib/mailer` المشترك، لا نسخةٌ محلّيّة.
const mailer = require('../../mailer');

const meta = { id: 'email', name: 'البريد الإلكترونيّ', kind: 'email' };

/**
 * مُهيّأةٌ حين يوجد **ناقلٌ أيًّا كان** — SMTP أو Brevo.
 *
 *   كانت تسأل `getTransport()` وهو SMTP وحدَه. وقياسٌ على متغيّرات المنصّة
 *   أظهر أنّ SMTP غيرُ مضبوطٍ إطلاقًا وBrevo مضبوطة — فكانت القناةُ تُعلن
 *   عجزَها في الإنتاج وهي قادرة، ويبقى التحقّقُ بلا قناةٍ واحدة.
 */
function available() {
  return mailer.available();
}

function html(code, storeName) {
  return `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#07080D;color:#E8E4DC;border-radius:12px">
      <h2 style="color:#FF6A00;text-align:center">🔐 رمز التحقق</h2>
      <p style="text-align:center;color:#aaa">متجر <strong style="color:#FF6A00">${storeName || 'AMANZINE'}</strong></p>
      <div style="background:#1a1b21;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#FF6A00">${code}</span>
      </div>
      <p style="color:#888;font-size:13px;text-align:center">صالح لمدة 5 دقائق — لا تشاركه مع أحد</p>
    </div>`;
}

/** @returns {Promise<{sent:boolean, reason?:string}>} لا يرمي أبدًا. */
async function send({ to, code, storeName }) {
  // يمرّ عبر `mailer.send` لا عبر ناقلٍ بعينه: هو الذي يختار SMTP أو Brevo،
  // فلا تعرف القناةُ اسمَ ناقلٍ ولا تتباعد عن بقيّة البريد في المشروع.
  return mailer.send({
    to,
    subject: '🔐 رمز التحقق — AMANZINE',
    html: html(code, storeName),
  });
}

module.exports = { meta, available, send };
