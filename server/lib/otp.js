'use strict';
const crypto     = require('crypto');
const { db }     = require('../database');
// ناقلُ البريد صار مشتركًا (`lib/mailer.js`) — كان محبوسًا هنا فبقيت قناةُ
// البريد في محرّك الإشعارات فارغةً رغم أنّ الناقلَ يعمل.
const mailer     = require('./mailer');

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getTransport = () => mailer.getTransport();

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
  const code      = await generateOTP(email);
  const transport = getTransport();

  if (transport) {
    const from = process.env.SMTP_FROM || `"${storeName || 'AMANZINE'}" <${process.env.SMTP_USER}>`;
    try {
      await transport.sendMail({
        from,
        to: email,
        subject: '🔐 رمز التحقق — AMANZINE',
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#07080D;color:#E8E4DC;border-radius:12px">
            <h2 style="color:#FF6A00;text-align:center">🔐 رمز التحقق</h2>
            <p style="text-align:center;color:#aaa">متجر <strong style="color:#FF6A00">${storeName || 'AMANZINE'}</strong></p>
            <div style="background:#1a1b21;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
              <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#FF6A00">${code}</span>
            </div>
            <p style="color:#888;font-size:13px;text-align:center">صالح لمدة 5 دقائق — لا تشاركه مع أحد</p>
          </div>`,
      });
      return { sent: true, method: 'email' };
    } catch (err) {
      console.error('[OTP] Email send failed:', err.message);
    }
  }

  // Console fallback for dev / no SMTP
  console.warn(`[OTP] ⚠️  No SMTP configured — OTP for ${email}: ${code}`);
  return { sent: true, method: 'console' };
}

async function sendWelcome(email, name, storeName) {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[Welcome] ⚠️  No SMTP configured — welcome email skipped for ${email}`);
    return { sent: false, method: 'console' };
  }
  const from  = process.env.SMTP_FROM || `"AMANZINE" <${process.env.SMTP_USER}>`;
  const store = storeName || 'متجرك';
  try {
    await transport.sendMail({
      from,
      to: email,
      subject: '🎉 مرحباً بك في AMANZINE',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#07080D;color:#E8E4DC;border-radius:14px">
          <h2 style="color:#FF6A00;text-align:center;margin:0 0 6px">🎉 مرحباً ${name || ''}!</h2>
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
    return { sent: true, method: 'email' };
  } catch (err) {
    console.error('[Welcome] Email send failed:', err.message);
    return { sent: false, method: 'error' };
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
