'use strict';
const { validateAuth, sanitizeBody } = require('../middleware/validate');
const router  = require('express').Router();
const auth    = require('../middleware/auth');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const jwt     = require('jsonwebtoken');
const { db }  = require('../database');

const { JWT_SECRET: _secret, JWT_EXPIRES: EXPIRES, REFRESH_EXPIRES: REXP, REFRESH_EXPIRES_MS: REXP_MS } = require('../lib/config');
const { sendOTP, verifyOTP, sendWelcome } = require('../lib/otp');

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, _secret, { expiresIn: EXPIRES });
}
function safe(user) { const { password: _, ...rest } = user; return rest; }

// Generate a secure random refresh token — store only its SHA-256 hash in DB
async function issueRefreshToken(userId) {
  const raw   = crypto.randomBytes(40).toString('hex');
  const hash  = crypto.createHash('sha256').update(raw).digest('hex');
  const expAt = new Date(Date.now() + REXP_MS).toISOString();
  await db.createRefreshToken(userId, hash, expAt);
  return raw;
}

// POST /api/auth/register

// كوكيز HttpOnly — لا يصلها JavaScript (حماية من XSS)
function _setAuthCookies(res, token, refreshToken) {
  const prod = process.env.NODE_ENV === 'production';
  const base = { httpOnly: true, secure: prod, sameSite: 'lax', path: '/' };
  res.cookie('token', token, { ...base, maxAge: 1000 * 60 * 60 * 24 });
  if (refreshToken) res.cookie('refreshToken', refreshToken, { ...base, maxAge: 1000 * 60 * 60 * 24 * 30 });
}

router.post('/register', sanitizeBody, validateAuth, async (req, res) => {
  try {
    const { name, email, password, storeName } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (await db.getUserByEmail(email)) return res.status(409).json({ error: 'Email already registered' });

    const user = await db.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 10),
      role: 'admin',
    });

    const { defaultSettings } = require('../defaults');
    await db.saveSettings(user.id, { ...defaultSettings, brand: { ...defaultSettings.brand, name: storeName || `${name}'s Store`, email: user.email } });
    await db.addLog({ userId: user.id, user: 'System', action: 'Account registered', details: user.email, type: 'auth', severity: 'info' });

    // Welcome email (non-blocking — graceful no-op if SMTP unconfigured)
    sendWelcome(user.email, user.name, storeName).catch(() => {});

    const token        = sign(user);
    const refreshToken = await issueRefreshToken(user.id);
    _setAuthCookies(res, token, refreshToken);
    res.status(201).json({ token, refreshToken, user: safe(user) });
  } catch (e) { console.error('[Auth register]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/login
router.post('/login', sanitizeBody, validateAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    // الرسائل بالعربيّة: الواجهة عربيّةٌ بالكامل، ورسالةٌ إنجليزيّة تظهر
    // للمستخدم المغربيّ في أضعف لحظة (فشلُ دخول) كسرٌ للثقة لا تفصيلُ ترجمة.
    // ولا نفرّق بين «بريدٌ غير مسجّل» و«كلمةٌ خاطئة» — التفريق يكشف مَن له حساب.
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    // بلا قاعدةٍ لا يوجد مستخدمٌ أصلًا، فيقول الخادم «كلمة مرور خاطئة» لمن
    // كلمتُه صحيحة — كذبٌ يُضيّع ساعاتٍ في البحث عن عطبٍ ليس في مكانه.
    if (!process.env.DATABASE_URL) {
      console.error('[auth/login] لا قاعدة بيانات — DATABASE_URL غير مضبوط');
      return res.status(503).json({ error: 'الخدمة ما زالت تُجهَّز (قاعدة البيانات غير موصولة) — عاود من بعد' });
    }
    const user = await db.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'البريد ولا كلمة المرور ماشي صحيحين' });
    }
    await db.addLog({ userId: user.id, user: user.name, action: 'Login', details: '', type: 'auth', severity: 'info' });
    const token        = sign(user);
    const refreshToken = await issueRefreshToken(user.id);
    _setAuthCookies(res, token, refreshToken);
    res.json({ token, refreshToken, user: safe(user) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── Social login helpers ──────────────────────────────────────
function httpsGetJSON(url) {
  return new Promise((resolve, reject) => {
    require('https').get(url, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// GET /api/auth/config — PUBLIC: which social providers are configured (client IDs are public)
router.get('/config', (req, res) => {
  res.json({
    googleClientId:  process.env.GOOGLE_CLIENT_ID  || '',
    facebookAppId:   process.env.FACEBOOK_APP_ID   || '',
    google:   !!process.env.GOOGLE_CLIENT_ID,
    facebook: !!process.env.FACEBOOK_APP_ID,
  });
});

// POST /api/auth/social — PUBLIC: verify Google/Facebook token, find-or-create user, issue JWT
router.post('/social', sanitizeBody, async (req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('[auth/social] لا قاعدة بيانات — DATABASE_URL غير مضبوط');
      return res.status(503).json({ error: 'الخدمة ما زالت تُجهَّز (قاعدة البيانات غير موصولة) — عاود من بعد' });
    }
    const { provider, credential, accessToken } = req.body;
    let profile = null;
    let why = 'مزوّد غير معروف أو رمزٌ ناقص';   // سببُ الرفض — للسجلّ لا للعميل

    if (provider === 'google' && credential) {
      // Verify the Google ID token server-side
      const data = await httpsGetJSON(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      // المعرّف يُقارَن بعد trim: متغيّرات البيئة على المنصّات تُلصَق كثيرًا
      // بمسافةٍ أو سطرٍ جديدٍ خفيّ في آخرها، فتفشل المقارنة الصارمة ويُرفَض
      // حسابٌ صحيحٌ تمامًا برسالةٍ لا تدلّ على السبب.
      const wantAud = String(process.env.GOOGLE_CLIENT_ID || '').trim();
      const gotAud  = String(data?.aud || '').trim();
      if (!data || !data.email) {
        why = `Google لم يُرجع بريدًا (${data?.error_description || data?.error || 'رمزٌ غير صالح أو منتهٍ'})`;
      } else if (wantAud && gotAud !== wantAud) {
        // لا نطبع المعرّفات كاملةً في السجلّ — أطرافُها تكفي للتشخيص.
        const tip = (v) => (v ? `${v.slice(0, 12)}…${v.slice(-8)}` : '(فارغ)');
        why = `عدم تطابق الجمهور (aud): الرمز=${tip(gotAud)} · GOOGLE_CLIENT_ID=${tip(wantAud)}`;
      } else {
        profile = { email: String(data.email).toLowerCase(), name: data.name || data.given_name || data.email.split('@')[0] };
      }
    } else if (provider === 'facebook' && accessToken) {
      const data = await httpsGetJSON(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
      if (data && data.email) profile = { email: String(data.email).toLowerCase(), name: data.name || data.email.split('@')[0] };
      else why = `Facebook لم يُرجع بريدًا (${data?.error?.message || 'قد يكون الحساب بلا بريدٍ مؤكَّد'})`;
    }

    if (!profile || !profile.email) {
      // السببُ في السجلّ حتمًا: «فشل التحقق» وحدها لا تُصلَّح، وقد كلّفتنا وقتًا.
      console.error('[auth/social] رُفض:', why);
      return res.status(401).json({ error: 'فشل التحقق من الحساب' });
    }

    let user = await db.getUserByEmail(profile.email);
    let isNew = false;
    if (!user) {
      isNew = true;
      const randomPass = crypto.randomBytes(24).toString('hex');
      user = await db.createUser({
        name: profile.name,
        email: profile.email,
        password: await bcrypt.hash(randomPass, 10),
        role: 'admin',
      });
      const { defaultSettings } = require('../defaults');
      await db.saveSettings(user.id, { ...defaultSettings, brand: { ...defaultSettings.brand, name: `${profile.name}'s Store`, email: user.email } });
      await db.addLog({ userId: user.id, user: 'System', action: `Registered via ${provider}`, details: user.email, type: 'auth', severity: 'info' });
      sendWelcome(user.email, user.name).catch(() => {});
    } else {
      await db.addLog({ userId: user.id, user: user.name, action: `Login via ${provider}`, details: '', type: 'auth', severity: 'info' });
    }

    const token        = sign(user);
    const refreshToken = await issueRefreshToken(user.id);
    _setAuthCookies(res, token, refreshToken);
    res.json({ token, refreshToken, user: safe(user), isNew });
  } catch (e) { console.error('[Auth social]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // إشارةٌ للواجهة لتُخفي أدوات المنصّة عمّن لا يملكها. الحماية الحقيقيّة تبقى
    // على الخادم (كلّ مسار أدمن يتحقّق بنفسه) — هذه للتجربة لا للأمن.
    const { isPlatformAdmin } = require('../middleware/platformAdmin');
    res.json({ user: { ...safe(user), isPlatformAdmin: isPlatformAdmin(req) } });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/refresh — exchange refresh token for a new access token (rotation)
// C-3: يقبل التوكن من كوكي HttpOnly (المسار الأساسي بعد إزالة localStorage) أو من الجسم
router.post('/refresh', async (req, res) => {
  const refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refreshToken);
  if (!refreshToken || typeof refreshToken !== 'string') {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  try {
    const hash   = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const record = await db.getRefreshToken(hash);
    if (!record) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    // Revoke old token (rotation — single-use)
    await db.revokeRefreshToken(hash);

    const user = await db.getUser(record.user_id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const token      = sign(user);
    const newRefresh = await issueRefreshToken(user.id);
    _setAuthCookies(res, token, newRefresh); // C-3: تدوير الكوكيز مع كل refresh
    res.json({ token, refreshToken: newRefresh });
  } catch (e) { console.error('[Auth refresh]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/logout — revoke refresh token
router.post('/logout', async (req, res) => {
  // C-3: إبطال توكن التجديد من الجسم أو من الكوكي
  const refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refreshToken);
  if (refreshToken && typeof refreshToken === 'string') {
    try {
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.revokeRefreshToken(hash);
    } catch {}
  }
  res.clearCookie('token', { path: '/' }); res.clearCookie('refreshToken', { path: '/' });
    res.json({ ok: true });
});

// POST /api/auth/request-otp — send OTP for 2FA (DB-backed + email delivery)
router.post('/request-otp', auth, async (req, res) => {
  try {
    const user = await db.getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const settings  = await db.getSettings(req.user.id) || {};
    const storeName = settings.brand?.name || 'AMANZINE';
    const result    = await sendOTP(user.email, storeName);

    res.json({
      sent:   result.sent,
      method: result.method,
      email:  user.email.replace(/(.{2}).*(@)/, '$1***$2'),
    });
  } catch (e) { console.error('[OTP request]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/verify-otp — verify OTP (single-use, DB-backed)
router.post('/verify-otp', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'الرمز مطلوب' });
    const user = await db.getUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = await verifyOTP(user.email, String(code).trim());
    if (!result.valid) {
      const msg = result.reason === 'expired'
        ? 'انتهت صلاحية الرمز — اطلب رمزاً جديداً'
        : 'رمز غير صحيح';
      return res.status(400).json({ error: msg });
    }
    res.json({ verified: true, message: 'تم التحقق بنجاح' });
  } catch (e) { console.error('[OTP verify]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/forgot-password — public: send OTP to user's email for reset
router.post('/forgot-password', sanitizeBody, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
    }
    const user = await db.getUserByEmail(email.toLowerCase().trim());
    // Always return success — prevents user enumeration
    if (!user) return res.json({ sent: true });
    const settings  = await db.getSettings(user.id) || {};
    const storeName = settings.brand?.name || 'AMANZINE';
    await sendOTP(user.email, storeName);
    await db.addLog({ userId: user.id, user: 'System', action: 'Password reset requested', details: user.email, type: 'auth', severity: 'warning' });
    res.json({ sent: true, email: user.email.replace(/(.{2}).*(@)/, '$1***$2') });
  } catch (e) { console.error('[Auth forgot]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/reset-password — public: verify OTP then set new password
router.post('/reset-password', sanitizeBody, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    const user = await db.getUserByEmail(email.toLowerCase().trim());
    if (!user) return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
    const result = await verifyOTP(user.email, String(code).trim());
    if (!result.valid) {
      const msg = result.reason === 'expired'
        ? 'انتهت صلاحية الرمز — اطلب رمزاً جديداً'
        : 'رمز التحقق غير صحيح';
      return res.status(400).json({ error: msg });
    }
    await db.updateUserPassword(user.id, await bcrypt.hash(newPassword, 10));
    await db.revokeAllRefreshTokens(user.id);
    await db.addLog({ userId: user.id, user: 'System', action: 'Password reset completed', details: user.email, type: 'auth', severity: 'warning' });
    res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور — يمكنك الدخول الآن' });
  } catch (e) { console.error('[Auth reset]', e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/change-password — change password (requires old password)
router.post('/change-password', auth, async (req, res) => {
  const oldPassword = req.body.oldPassword || req.body.current;
  const newPassword = req.body.newPassword || req.body.next;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'كلا الحقلين مطلوبان' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

  const user = await db.getUser(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.updateUserPassword(req.user.id, hashed);
  await db.revokeAllRefreshTokens(req.user.id);
  res.json({ success: true, message: 'تم تغيير كلمة المرور' });
});

module.exports = router;
