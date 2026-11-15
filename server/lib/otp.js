'use strict';
const crypto     = require('crypto');
const { db }     = require('../database');
// ناقلُ البريد صار مشتركًا (`lib/mailer.js`) — كان محبوسًا هنا فبقيت قناةُ
// البريد في محرّك الإشعارات فارغةً رغم أنّ الناقلَ يعمل.
const mailer     = require('./mailer');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Account and store labels come from user input; never interpolate raw HTML.
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);

async function generateOTP(email) {
  const buf  = Buffer.alloc(3);
  crypto.randomFillSync(buf);
  const code      = (100000 + (buf.readUIntBE(0, 3) % 900000)).toString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await db.invalidateOTPs(email);
  await db.createOTP({ email, code, expiresAt });
  return code;
}

async function sendOTP(email, storeName) {
  // The shared mailer chooses SMTP or the already-configured Brevo API.
  // Do not mistake "no SMTP" for "no email": Railway has BREVO_API_KEY.
  if (!mailer.available()) {
    console.warn('[OTP] No email provider configured; no verification code issued.');
    return { sent: false, method: 'not-configured' };
  }
  const code = await generateOTP(email);
  try {
    const result = await mailer.send({
        to: email,
        subject: '🔐 رمز التحقق — AMANZINE',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#07080D;color:#E8E4DC;border-radius:12px">
            <h2 style="color:#FF6A00;text-align:center">🔐 رمز التحقق</h2>
            <p style="text-align:center;color:#aaa">متجر <strong style="color:#FF6A00">${escapeHtml(storeName || 'AMANZINE')}</strong></p>
            <div style="background:#1a1b21;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
              <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#FF6A00">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;text-align:center">صالح لمدة 5 دقائق — لا تشاركه مع أحد</p>
          </div>`,
    });
    if (result.sent) return { sent: true, method: mailer.transportKind() };
    console.error('[OTP] Email provider rejected verification email:', result.reason || 'unknown');
  } catch (err) {
    console.error('[OTP] Email provider error:', err.message);
  }

  // A delivery failure must not leave a live, undelivered secret in the database.
  await db.invalidateOTPs(email);
  return { sent: false, method: 'email-error' };
}

async function sendWelcome(email, name, storeName) {
  if (!mailer.available()) {
    console.warn('[Welcome] No email provider configured; welcome email skipped.');
    return { sent: false, method: 'not-configured' };
  }
  const store = escapeHtml(storeName || 'متجرك');
  try {
    const result = await mailer.send({
      to: email,
      subject: '🎉 مرحباً بك في AMANZINE',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#07080D;color:#E8E4DC;border-radius:14px">
          <h2 style="color:#FF6A00;text-align:center;margin:0 0 6px">🎉 مرحباً ${escapeHtml(name || '')}!</h2>
          <p style="text-align:center;color:#aaa;margin:0 0 18px">تم إنشاء متجر <strong style="color:#FF6A00">${store}</strong> بنجاح</p>
          <div style="background:#12141c;border-radius:10px;padding:18px;margin:0 0 18px">
            <p style="color:#E8E4DC;font-weight:700;margin:0 0 10px">خطواتك الأولى:</p>
            <p style="color:#bbb;font-size:14px;margin:6px 0">📦 أضف أول منتج أو خدمة</p>
            <p style="color:#bbb;font-size:14px;margin:6px 0">💬 اربط واتساب لاستقبال الطلبات</p>
            <p style="color:#bbb;font-size:14px;margin:6px 0">🤖 فعّل الذكاء الاصطناعي للرد التلقائي</p>
            <p style="color:#bbb;font-size:14px;margin:6px 0">🔗 شارك رابط متجرك مع زبائنك</p>
          </div>
          <p style="color:#777;font-size:12px;text-align:center;margin:0">AMANZINE — منصة التجارة والخدمات الذكية 🇲🇦</p>
        </div>`,
    });
    return result.sent
      ? { sent: true, method: mailer.transportKind() }
      : { sent: false, method: 'email-error' };
  } catch (err) {
    console.error('[Welcome] Email provider error:', err.message);
    return { sent: false, method: 'email-error' };
  }
}

async function verifyOTP(email, code) {
  const otp = await db.getValidOTP(email, code);
  if (!otp) return { valid: false, reason: 'invalid' };
  if (new Date(otp.expires_at) < new Date()) {
    await db.invalidateOTPs(email);
    return { valid: false, reason: 'expired' };
  }
  await db.invalidateOTPs(email);
  return { valid: true };
}

module.exports = { sendOTP, verifyOTP, sendWelcome };
