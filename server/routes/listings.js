'use strict';
// ============================================================
// Marketplace listings — quick-seller submit → admin moderation
// → unified public catalog. Fully additive: does not touch the
// existing products/orders/storefront flows.
// ============================================================
const router    = require('express').Router();
const rateLimit = require('express-rate-limit');
const https     = require('https');
const auth      = require('../middleware/auth');
const { db }    = require('../database');
const { sanitizeBody } = require('../middleware/validate');

// ── OTP verification via platform WhatsApp (optional / graceful) ──
// Quick-sellers confirm ownership of their phone before an ad goes live.
// Enabled ONLY when a PLATFORM WhatsApp sender is configured; otherwise the
// submit flow stays exactly as before (no gate) so dev/MVP keeps working.
function otpConfigured() {
  return !!(process.env.PLATFORM_WHATSAPP_TOKEN && process.env.PLATFORM_WHATSAPP_PHONE_ID);
}
// Keep only digits — the same normalization is used at request, verify and
// submit time so the three steps always reference the same identity.
function normPhone(p) { return String(p || '').replace(/\D/g, ''); }
// Moroccan local 0XXXXXXXXX → 212XXXXXXXXX for the WhatsApp recipient.
function waRecipient(digits) { return digits.startsWith('0') ? '212' + digits.slice(1) : digits; }

function sendWhatsAppOTP(phoneDigits, code) {
  return new Promise(resolve => {
    const token = process.env.PLATFORM_WHATSAPP_TOKEN;
    const phoneId = process.env.PLATFORM_WHATSAPP_PHONE_ID;
    const body = JSON.stringify({
      messaging_product: 'whatsapp', to: waRecipient(phoneDigits), type: 'text',
      text: { body: `رمز تأكيد إعلانك في السوق المغربي: ${code}\nصالح لمدة 10 دقائق. لا تشاركه مع أحد.` },
    });
    const r = https.request({
      hostname: 'graph.facebook.com', path: `/v19.0/${phoneId}/messages`, method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body) },
    }, resp => resolve(resp.statusCode < 300));
    r.on('error', () => resolve(false));
    r.write(body); r.end();
  });
}

// Platform-admin gate: if PLATFORM_ADMIN_EMAIL (or ADMIN_EMAIL) is set,
// only that account can moderate; otherwise any authenticated user can
// (keeps dev/MVP working without extra config).
// مصدرٌ واحد مع بقيّة المنصّة. كانت المقارنة هنا `email === pa` **حسّاسةً لحالة
// الأحرف**: بريدٌ فيه حرفٌ كبير في متغيّرات البيئة ⇒ 403 صامتة للمالك نفسه.
const { isPlatformAdmin } = require('../middleware/platformAdmin');

// Anti-spam: max 10 submissions/hour per IP for the public quick-seller form.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { error: 'إعلانات كثيرة من هذا الجهاز — حاول لاحقاً' },
  standardHeaders: true, legacyHeaders: false,
});

// تنقية بيانات الخدمة المرنة: تخصّصات متعدّدة، طرق الطلب، نموذج التسعير،
// وحقول مخصّصة يضيفها البائع بنفسه — مع حدود حجم تمنع الإساءة.
function sanitizeDetails(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return {};
  const str = (v, n = 120) => String(v == null ? '' : v).trim().slice(0, n);
  const out = {};
  if (Array.isArray(d.specialties)) out.specialties = d.specialties.slice(0, 12).map(s => str(s, 40)).filter(Boolean);
  if (Array.isArray(d.serviceModes)) out.serviceModes = d.serviceModes.slice(0, 8).map(s => str(s, 28)).filter(Boolean);
  if (d.pricingModel) out.pricingModel = str(d.pricingModel, 28);
  if (Array.isArray(d.customFields)) out.customFields = d.customFields.slice(0, 12)
    .map(f => ({ label: str(f && f.label, 40), value: str(f && f.value, 240) }))
    .filter(f => f.label && f.value);
  return out;
}

// POST /api/listings/public — quick seller submits a product/service (no account).
// Creates a PENDING listing; never visible until an admin approves.
router.post('/public', submitLimiter, sanitizeBody, async (req, res) => {
  try {
    const { type, name, price, description, category, city, images, duration, workArea, sellerName, sellerPhone, otpToken } = req.body;
    if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'اسم الإعلان مطلوب' });
    if (!sellerName || !sellerPhone) return res.status(400).json({ error: 'اسمك ورقم هاتفك مطلوبان' });
    if (price != null && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) return res.status(400).json({ error: 'السعر غير صحيح' });

    // Phone-ownership gate — enforced only when a platform WhatsApp sender exists.
    if (otpConfigured()) {
      const digits = normPhone(sellerPhone);
      const ok = otpToken && await db.getValidOTP(`waok:${digits}`, otpToken);
      if (!ok) return res.status(401).json({ error: 'يرجى تأكيد رقم هاتفك أولاً', needOtp: true });
      await db.invalidateOTPs(`waok:${digits}`); // one-time use
    }

    const listing = await db.createListing({
      type, name, price, description, category, city,
      images: Array.isArray(images) ? images.slice(0, 6) : [],
      duration, workArea, sellerName, sellerPhone,
      details: sanitizeDetails(req.body.details),
    });
    if (!listing) return res.status(500).json({ error: 'تعذّر إنشاء الإعلان' });
    res.status(201).json({ ok: true, id: listing.id, status: listing.status, message: 'تم استلام إعلانك — سيظهر بعد مراجعة الإدارة ✅' });
  } catch (e) { console.error('[listings/public]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/listings/public/catalog?city=&type=&q=  — unified catalog (APPROVED only)
router.get('/public/catalog', async (req, res) => {
  try {
    const t = req.query.type;
    const listings = await db.getPublicListings({
      city: req.query.city || undefined,
      type: t === 'service' ? 'service' : t === 'product' ? 'product' : undefined,
      q: String(req.query.q || '').trim().slice(0, 80) || undefined,
      // المرادفاتُ تدخل من هنا أيضًا: هذا بابٌ عامٌّ يُنادى من خارج الواجهة،
      // ولا يجوز أن يكون مطابِقُه أضعفَ من مطابِق `/api/search`.
      terms: String(req.query.terms || '').split('|').map(t => t.trim()).filter(Boolean).slice(0, 24),
    });
    res.json({ listings });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/listings/public/stats — real platform stats for the landing page
// (defined BEFORE /public/:id so "stats" isn't captured as an :id)
router.get('/public/stats', async (_req, res) => {
  try { res.json(await db.getPublicStats()); }
  catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/listings/public/:id  — single approved listing (+view count)
router.get('/public/:id', async (req, res) => {
  try {
    const l = await db.getListing(req.params.id);
    if (!l || l.status !== 'approved') return res.status(404).json({ error: 'Not found' });
    db.incrementListingViews(l.id).catch(() => {});
    // العدّادُ في الجدولِ لا يصل حلقةَ التعلّم. الحدثُ يُصدَر بنوعه (منتج/خدمة)
    // كي تعرف المنصّةُ **أيَّ** طلبٍ يُشاهَد، لا كم مشاهدةً جمع صفٌّ واحد.
    try {
      require('../lib/engines/activity').emit({
        businessId: `listing:${l.id}`, actor: 'visitor',
        type: l.type === 'service' ? 'service.viewed' : 'product.viewed',
        category: l.type === 'service' ? 'service' : 'product',
        visibility: 'private', city: l.city || null,
        payload: { name: l.name, category: l.category || undefined },
      });
    } catch { /* القياسُ لا يُسقط عرضًا */ }
    res.json(l);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── Admin moderation (platform admin) ──────────────────────────
// GET /api/listings?status=pending — moderation queue
router.get('/', auth, async (req, res) => {
  if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const s = req.query.status;
    const status = s && ['pending', 'approved', 'rejected', 'suspended'].includes(s) ? s : undefined;
    res.json(await db.getListingsForModeration(status));
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

function moderate(status) {
  return async (req, res) => {
    if (!isPlatformAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
    try {
      const l = await db.setListingStatus(req.params.id, status, (req.body && req.body.reason) || '');
      if (!l) return res.status(404).json({ error: 'Not found' });
      // Activity: إعلان معتمَد يصبح حدثاً عامّاً يغذّي الـ Feed
      if (status === 'approved') {
        try { require('../lib/engines/activity').emit({ businessId: `listing:${l.id}`, actor: 'admin', type: 'listing.approved', category: 'listing', city: l.city || null, payload: { name: l.name, type: l.type, price: l.price } }); } catch {}
      }
      res.json(l);
    } catch (e) { res.status(500).json({ error: 'Server error' }); }
  };
}
router.put('/:id/approve', auth, moderate('approved'));
router.put('/:id/reject',  auth, moderate('rejected'));
router.put('/:id/suspend', auth, moderate('suspended'));

// ── OTP request/verify (quick-seller phone verification) ──────
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 6,
  message: { error: 'محاولات كثيرة — حاول بعد قليل' },
  standardHeaders: true, legacyHeaders: false,
});

// GET /api/listings/otp/config — does the frontend need to verify phones?
router.get('/otp/config', (req, res) => res.json({ enabled: otpConfigured() }));

// POST /api/listings/otp/request { phone } — send a 6-digit code via WhatsApp
router.post('/otp/request', otpLimiter, sanitizeBody, async (req, res) => {
  try {
    if (!otpConfigured()) return res.json({ ok: true, enabled: false }); // graceful no-op
    const digits = normPhone(req.body.phone);
    if (digits.length < 9) return res.status(400).json({ error: 'رقم هاتف غير صحيح' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.invalidateOTPs(`wa:${digits}`);
    await db.createOTP({ email: `wa:${digits}`, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
    const sent = await sendWhatsAppOTP(digits, code);
    if (!sent) return res.status(502).json({ error: 'تعذّر إرسال الرمز عبر واتساب — تحقق من الرقم' });
    res.json({ ok: true, enabled: true });
  } catch (e) { console.error('[listings/otp/request]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/listings/otp/verify { phone, code } — returns a one-time submit token
router.post('/otp/verify', otpLimiter, sanitizeBody, async (req, res) => {
  try {
    if (!otpConfigured()) return res.json({ verified: true, enabled: false });
    const digits = normPhone(req.body.phone);
    const code = String(req.body.code || '').trim();
    const valid = await db.getValidOTP(`wa:${digits}`, code);
    if (!valid) return res.status(400).json({ error: 'الرمز غير صحيح أو منتهي' });
    await db.invalidateOTPs(`wa:${digits}`);
    const otpToken = require('crypto').randomBytes(24).toString('hex');
    await db.createOTP({ email: `waok:${digits}`, code: otpToken, expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
    res.json({ verified: true, otpToken });
  } catch (e) { console.error('[listings/otp/verify]', e.message); res.status(500).json({ error: 'Server error' }); }
});

// ── Reviews (public — trust signals) ──────────────────────────
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 15,
  message: { error: 'تقييمات كثيرة — حاول لاحقاً' },
  standardHeaders: true, legacyHeaders: false,
});

// GET /api/listings/:id/reviews — reviews + average rating
router.get('/:id/reviews', async (req, res) => {
  try {
    const [reviews, rating] = await Promise.all([
      db.getListingReviews(req.params.id),
      db.getListingRating(req.params.id),
    ]);
    res.json({ reviews, rating });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/listings/:id/reviews — add a review (only on approved listings)
router.post('/:id/reviews', reviewLimiter, sanitizeBody, async (req, res) => {
  try {
    const listing = await db.getListing(req.params.id);
    if (!listing || listing.status !== 'approved') return res.status(404).json({ error: 'الإعلان غير متاح للتقييم' });
    const { rating, comment, reviewerName } = req.body;
    if (!reviewerName || String(reviewerName).trim().length < 2) return res.status(400).json({ error: 'اسمك مطلوب' });
    const rev = await db.addReview({ listingId: req.params.id, rating, comment, reviewerName });
    // التقييمُ حدثٌ في القمع: كان يُحفَظ ولا يُصدَر، فلا صاحبُ الإعلان يُشعَر
    // ولا حلقةُ التعلّم تعدّه (`08_LEARNING_LOOP` تنتظر `review.created`).
    try {
      require('../lib/engines/activity').emit({
        businessId: `listing:${req.params.id}`, actor: 'visitor',
        type: 'review.created', category: 'business', visibility: 'private',
        city: listing.city || null,
        payload: { rating: +rating || 0, listing: listing.name },
      });
    } catch { /* الإشعارُ لا يُسقط تقييمًا صحيحًا */ }
    res.status(201).json(rev);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
