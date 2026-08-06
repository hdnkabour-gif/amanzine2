'use strict';

// قناةُ البريد — الناقلُ من `lib/mailer` المشترك، لا نسخةٌ محلّيّة.
const mailer = require('../../mailer');

const meta = { id: 'email', name: 'البريد الإلكترونيّ', kind: 'email' };

/** مُهيّأةٌ حين يوجد ناقلُ بريدٍ فعلًا. لا SMTP ⇒ تُعلن العجزَ ولا تصمت. */
function available() {
  return !!mailer.getTransport();
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
  const transport = mailer.getTransport();
  if (!transport) return { sent: false, reason: 'not-configured' };
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || `"${storeName || 'AMANZINE'}" <${process.env.SMTP_USER}>`,
      to,
      subject: '🔐 رمز التحقق — AMANZINE',
      html: html(code, storeName),
    });
    return { sent: true };
  } catch (e) {
    console.error('[verify/email]', e.message);
    return { sent: false, reason: e.message };
  }
}

module.exports = { meta, available, send };
