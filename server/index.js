'use strict';
// ============================================================
// AI Commerce OS — Backend Server v2.1
// ============================================================
const path = require('path');
const fs   = require('fs');

// Load .env FIRST before anything else
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Parse combined CLOUDINARY_URL → individual SDK vars ──────
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    const m = process.env.CLOUDINARY_URL.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (m) {
      process.env.CLOUDINARY_API_KEY    = m[1];
      process.env.CLOUDINARY_API_SECRET = m[2];
      process.env.CLOUDINARY_CLOUD_NAME = m[3];
      console.log(`[Cloudinary] Parsed CLOUDINARY_URL → cloud: ${m[3]}`);
    }
  } catch (e) { console.warn('[Cloudinary] Could not parse CLOUDINARY_URL:', e.message); }
}

// ── Map Next.js-prefixed Supabase vars → server-side names ───
if (!process.env.SUPABASE_URL)      process.env.SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL                 || '';
if (!process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY     || '';

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── الثقة بالوسيط (Railway/أيّ PaaS) ─────────────────────────
// بدونها كان express-rate-limit يرمي ERR_ERL_UNEXPECTED_X_FORWARDED_FOR في
// السجلّات، ويعجز عن تمييز المستخدمين: كلّ الطلبات تصل من IP الوسيط ⇒ إمّا
// دلوٌ واحدٌ للجميع (مستخدمٌ واحدٌ يحجب الكلّ) أو حدٌّ بلا معنى.
// نثق بقفزةٍ واحدة فقط (وسيط المنصّة) لا `true` المفتوح الذي يسمح بانتحال IP.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
const DIST = path.join(__dirname, '..', 'dist');

// ── Ensure data dir ──────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Middleware ───────────────────────────────────────────────
// CSP: restrictive in production, relaxed locally for Vite HMR
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      // الدخول الاجتماعيّ: مكتبتا Google وFacebook تُحمَّلان من نطاقَيهما.
      // كانتا محجوبتَين، فلا يُحمَّل السكربت أصلًا — ولهذا لا تفتح النافذة
      // أو تفتح ثمّ يفشل كلّ شيء. الحجبُ سببٌ سابقٌ على أيّ خطأ 401.
      scriptSrc: ["'self'", "'unsafe-inline'",            // React needs inline scripts
        'https://accounts.google.com', 'https://apis.google.com',
        'https://connect.facebook.net',
        // **hCaptcha — وثالثةُ مرّةٍ يقع فيها هذا الصنف بالذات.**
        //   الودجت مكتوبٌ في `Storefront` والسكربتُ يُحقَن، لكنّ النطاقَ محجوبٌ
        //   هنا. فلا يُحمَّل شيءٌ، ويبقى المربّعُ فارغًا، ثمّ يضغط الزبونُ
        //   «أكّد» فيُقال له **«أكمل التحقّق الأمنيّ أولًا»** — تحقّقٌ لا وجودَ
        //   له على الشاشة. النتيجة: **الطلبُ لا يُرسَل أبدًا** في الإنتاج،
        //   وكلُّ سلّةٍ تموت عند آخر زرّ.
        'https://js.hcaptcha.com', 'https://hcaptcha.com', 'https://*.hcaptcha.com',
      ],
      styleSrc:  ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com',
        'https://hcaptcha.com', 'https://*.hcaptcha.com'],
      imgSrc:    ["'self'", 'data:', 'https:', 'blob:'],  // base64 product images
      connectSrc:["'self'",
        'https://api.openai.com',
        'https://generativelanguage.googleapis.com',
        'https://graph.facebook.com',
        'https://accounts.google.com', 'https://oauth2.googleapis.com',
        'https://www.googleapis.com',
        'https://hcaptcha.com', 'https://*.hcaptcha.com',
      ],
      // One Tap ونافذةُ الاختيار تعملان داخل إطار — بلا frameSrc تُحجَبان.
      // وhCaptcha كذلك: تحدّيه كلُّه داخل إطار.
      frameSrc:  ["'self'", 'https://accounts.google.com', 'https://www.facebook.com', 'https://staticxx.facebook.com',
        'https://hcaptcha.com', 'https://*.hcaptcha.com'],
      fontSrc:   ["'self'", 'https://fonts.gstatic.com', 'data:'],
      mediaSrc:  ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// CORS: strict allowlist only — no wildcard domains
app.use(cors({
  origin: (origin, callback) => {
    // Allow: no origin (same-origin, Capacitor mobile apps)
    if (!origin) return callback(null, true);
    const allowed = [
      'http://localhost:5173', 'http://localhost:3000',
      'http://localhost:3001', 'http://localhost:4173',
      ...(process.env.PRODUCTION_URL   ? [process.env.PRODUCTION_URL]   : []),
      ...(process.env.FRONTEND_URL     ? [process.env.FRONTEND_URL]     : []),
      ...(process.env.RAILWAY_PUBLIC_DOMAIN
        ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`]
        : []),
    ];
    if (allowed.includes(origin)) return callback(null, true);
    console.warn('[CORS] Blocked origin:', origin);
    return callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.use(require('cookie-parser')());
// H-3: نحتفظ بالـ raw body للتحقّق من توقيع Webhook (Meta) بدقّة
app.use(express.json({ limit: '20mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// فحصُ الصحّة **قبل** المحدِّدات — لا بعدها. Railway يستدعيه دوريًّا، وكان
// يستهلك دلوَ المستخدم نفسه حتّى يعود 429، فتظنّ المنصّةُ أنّ الخادم ساقط.
// الترتيب هو ما يجعله استثناءً فعليًّا: middleware يسبق ما بعده.
// ── Health ───────────────────────────────────────────────────
// حالةُ آخر ترحيل — يملؤها startServer أدناه. الترحيلُ لا يُسقط العمليّة عمدًا
// (وإلّا فشل healthcheck)، فبدون إعلانِ نتيجته هنا يبقى فشلُه مرئيًّا في
// السجلّات وحدَها: «ok» بينما المخطّطُ قديم — وهو أخضرُ كاذبٌ في نقطة الفحص.
const migrationState = { ran: false, ok: null, error: null, at: null };
const readiness = require('./lib/readiness');

// التشخيصُ يُقرأ كسولًا من الوحدات نفسها: لو تعذّر التحميلِ لا يسقط فحصُ الصحّة.
function aiStatus() {
  try { return require('./routes/ai').aiEnvStatus(); }
  catch (e) { return { available: null, error: e.message }; }
}
function notificationStatus() {
  try { return require('./lib/engines/notification').channelStatus(); }
  catch (e) { return { error: e.message }; }
}

app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  // بلا قاعدةٍ لا يكون الخادم «ok»: الفحص ينجح والتطبيق فارغٌ من الداخل.
  // نُبقي 200 (وإلّا أسقطت المنصّةُ النشرَ فلا يُقرأ السبب) لكن نقول الحقيقة.
  const noDb = !process.env.DATABASE_URL;
  const migrationFailed = migrationState.ran && migrationState.ok === false;
  res.json({
    status: (noDb || migrationFailed) ? 'degraded' : 'ok',
    ...(noDb ? { degraded: 'DATABASE_URL غير مضبوط — لا تسجيلَ دخولٍ ولا حفظَ بيانات' } : {}),
    ...(migrationFailed ? { degraded: `فشل ترحيلُ قاعدة البيانات — المخطّط قديم: ${migrationState.error}` } : {}),
    migration: migrationState.ran
      ? { ok: migrationState.ok, at: migrationState.at, ...(migrationState.error ? { error: migrationState.error } : {}) }
      : { ok: null, note: 'لم يُنفَّذ (لا DATABASE_URL)' },
    version: '3.2.0', name: 'AMANZINE AI Commerce OS',
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's',
    memory: Math.round(mem.heapUsed/1024/1024) + 'MB',
    node: process.version,
    // الذكاءُ والإشعارات: يُقرآن من نفس مصدر الحلّ، فلا نسخةَ ثانيةً تتقادم.
    // «غيرُ مهيّأ» ليس عطبًا — لكنّ إخفاءَه عطب: بلا مفتاحٍ يبقى الفهمُ قواعدَ
    // محلّيّة، وبلا قناةٍ لا يصل إشعارٌ إلى أحد. كلاهما يجب أن يُرى لا يُستنتَج.
    ai: aiStatus(),
    notifications: notificationStatus(),
    env: process.env.NODE_ENV || 'development',
  });
});

// GET /api/health/readiness — بوّابةُ الجاهزيّة: القائمةُ التي تُنفَّذ.
//
//   محميّةٌ للأدمن: تُسمّي ما ليس مضبوطًا (سرٌّ قصير · تخزينٌ مؤقّت · قناةٌ
//   صامتة)، وهذه خارطةُ طريقٍ لمهاجم. الملخّصُ وحدَه (`ready`) لا يكفي —
//   البوّابةُ تُقرأ بندًا بندًا وإلّا صارت علامةً خضراءَ أخرى بلا معنى.
const { platformAdmin } = require('./middleware/platformAdmin');
app.get('/api/health/readiness', require('./middleware/auth'), platformAdmin, async (req, res) => {
  try {
    const { db } = require('./database');
    res.json(await readiness.evaluate({ db, migration: migrationState }));
  } catch (e) {
    console.error('[readiness]', e.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Rate limiting ─────────────────────────────────────────────
// فحصُ الصحّة **خارج** كلّ حدّ: Railway يستدعيه دوريًّا، فكان يستهلك دلوَ
// المستخدم نفسه حتّى يعود 429 — فيظنّ المنصّةُ أنّ الخادم ساقط.
// يُعرَّف قبل المحدِّدات لا بعدها؛ الترتيب هو ما يجعله استثناءً فعليًّا.

// الحدّ العامّ: ١٠٠ لكلّ ١٥ دقيقة كان يخنق تطبيقَ صفحةٍ واحدة — جلسةٌ عاديّة
// ترسل عشرات الطلبات (me · config · concepts · بحث · تتبّع) فتُستهلَك الحصّة
// في دقائق، فيُحجَب المستخدم قبل أن يضغط «دخول». رُفع إلى معدّلٍ واقعيّ.
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false,
  message: { error: 'طلبات كثيرة — انتظر قليلاً' },
}));
// المصادقة: ١٠/دقيقة كانت تسقط قبل أيّ محاولةٍ حقيقيّة، لأنّ فتح الصفحة وحده
// يرسل me + config. القراءةُ لا تُحسَب؛ الحدُّ الصارم يبقى على المحاولات
// الكاتبة (دخول/تسجيل/استعادة) وهي المقصودة بالحماية من التخمين.
app.use('/api/auth/', rateLimit({
  windowMs: 60 * 1000, max: 40,
  skip: (req) => req.method === 'GET',
  message: { error: 'محاولات كثيرة — انتظر دقيقة' },
}));

// محددات أدق للمسارات العامة (بدون auth) — حماية التاجر من البوتات والإغراق:
// عجلة الحظ، إنشاء الطلبات، المجيب الآلي، والتحقق من الكوبونات
app.use('/api/coupons/public/spin', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'محاولات كثيرة — عُد لاحقاً 🍀' } }));
app.use('/api/orders/public',       rateLimit({ windowMs: 60 * 60 * 1000, max: 15, message: { error: 'طلبات كثيرة من هذا الجهاز — حاول بعد قليل' } }));
app.use('/api/ai/public-reply',     rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: { error: 'رسائل كثيرة — انتظر قليلاً ثم أعد المحاولة' } }));
app.use('/api/coupons/validate',    rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: { error: 'محاولات تحقق كثيرة — انتظر قليلاً' } }));
app.use('/api/track',               rateLimit({ windowMs: 5 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })); // أحداث view/click متكرّرة
app.use('/api/bookings/public',     rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'محاولات حجز كثيرة — حاول بعد قليل' } })); // alloservix
app.use('/api/search',              rateLimit({ windowMs: 10 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // المحرّك الموحّد
app.use('/api/recommend',           rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // Recommendation Engine
app.use('/api/feed',                rateLimit({ windowMs: 10 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // Activity Feed
app.use('/api/discover',            rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // Super App (legacy alias)
app.use('/api/business',            rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // Universal Business Engine
app.use('/api/needs',               rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'طلبات كثيرة — حاول بعد قليل' } })); // Demand Capture (عامّ)
app.use('/api/knowledge',           rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } })); // Knowledge layer (أدمن)

// H-5: سقف لمسارات الذكاء الاصطناعي (حماية تكلفة المالك من الاستنزاف)
app.use('/api/ai/',          rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات ذكاء اصطناعي كثيرة — انتظر قليلاً (حماية التكلفة)' } }));
// C-2: تحديد محاولات تتبّع الطلب (يدعم منع تعداد البيانات)
app.use('/api/orders/track', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات تتبّع كثيرة — انتظر قليلاً' } }));

// حقيقةُ وقتِ التشغيل تُسجَّل هنا حيث تُعرَف — بوّابةُ الجاهزيّة تقرؤها ولا
// تخمّنها. لو حُذفت المحدِّداتُ يومًا، تسقط البوّابةُ بدل أن تُخمّن سلامتَها.
readiness.register('rateLimit', true);
readiness.register('rateLimitCount', (app._router?.stack || []).filter(l => l.name === 'rateLimit').length || undefined);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/delivery',      require('./routes/delivery'));
app.use('/api/broadcast',     require('./routes/broadcast'));
app.use('/api/webhooks',      require('./routes/webhooks'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/media',         require('./routes/media'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/coupons',       require('./routes/coupons'));
app.use('/api/ai',            require('./routes/ai-search'));   // AI Engine: /ask (عام) — قبل مسارات ai المصادَقة
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/delivery-auto', require('./routes/delivery-auto'));
app.use('/api/push',          require('./routes/push'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/providers',     require('./routes/providers'));   // alloservix — سوق الخدمات
app.use('/api/bookings',      require('./routes/bookings'));    // alloservix — الحجوزات
app.use('/api/search',        require('./routes/search'));      // المحرّك الموحّد الوحيد (Discover = Search بلا q)
app.use('/api/recommend',     require('./routes/recommend'));   // Recommendation Engine (فوق Business Graph)
app.use('/api/feed',          require('./routes/feed'));        // Activity Feed (timelines فوق Activity Engine)
app.use('/api/insights',      require('./routes/insights'));    // Analytics Engine (لوحات من تدفّق الأحداث)
app.use('/api/track',         require('./routes/track'));       // استقبال view/click → Activity events
app.use('/api/wallet',        require('./routes/wallet'));      // Wallet Engine
app.use('/api/payment',       require('./routes/payment'));     // Payment Engine

// المحرّكات المعتمدة على الأحداث: Analytics + Rules→Notification كمشتركين على الـBus
try {
  require('./lib/engines/analytics').init();
  require('./lib/engines/rules').init(require('./lib/engines/notification'));
  require('./lib/engines/learning').init(require('./lib/engines/eventbus')); // Learning Loop (DR-0004)
  console.log('[engines] analytics + rules→notification + learning subscribers ready');
} catch (e) { console.error('[engines] init failed:', e.message); }
app.use('/api/discover',      require('./routes/discover'));    // legacy alias — يفوّض إلى Search Engine
app.use('/api/business',      require('./routes/business'));    // Universal Business Engine — الملف الموحد
app.use('/api/knowledge',     require('./routes/knowledge'));   // Knowledge layer (أدمن): search misses (DR-0002)
app.use('/api/needs',         require('./routes/needs'));       // Demand Capture: «ما لقيناش» تصير طلبًا مؤكّدًا
app.use('/api/memory',        require('./routes/memory'));      // ذاكرةُ المستخدم: ما يعرفه التطبيقُ عن شخصٍ بعينه
app.use('/api/verify',        require('./routes/verify'));      // التحقّقُ الموحَّد: بريد · واتساب · SMS — والفعلُ يطلب الرمز


// ── Serve uploaded media ─────────────────────────────────────
const UPLOADS = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// ── Serve frontend build ─────────────────────────────────────
app.use(express.static(DIST));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  const indexFile = path.join(DIST, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(503).send([
      '<h2>Frontend not built yet</h2>',
      '<p>Run <code>npm run build</code> in the project root, then restart the server.</p>',
    ].join(''));
  }
});

// ── Structured logging + crash handlers (production readiness) ──
const logger = require('./lib/logger');
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason && reason.message ? reason.message : String(reason) });
  logger.capture(reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err && err.message, stack: err && err.stack });
  logger.capture(err);
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Request error', { path: req.path, method: req.method, error: err.message });
  logger.capture(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────
const migrate = require('./migrate');

async function startServer() {
  try {
    if (process.env.DATABASE_URL) {
      // Migration must NOT crash the process — otherwise a transient/misconfigured
      // DB makes the server never listen and the Railway healthcheck fails for 5m.
      // Start in degraded mode and surface the error in logs/monitoring instead.
      migrationState.ran = true;
      migrationState.at = new Date().toISOString();
      try {
        await migrate();
        migrationState.ok = true;
      } catch (e) {
        migrationState.ok = false;
        migrationState.error = e.message;
        logger.error('DB migration failed — starting in degraded mode (check DATABASE_URL / DB connectivity)', { error: e.message });
        logger.capture(e);
      }
    } else {
      logger.warn('DATABASE_URL not set — running without persistence (no-database mode)');
    }
    const server = app.listen(PORT, '0.0.0.0', () => {
      const hasKey = !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
      const url = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${PORT}`;
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║      AI Commerce OS  — v3.2 Ready       ║');
      console.log(`║  🌐  ${url}`);
      console.log(`║  🤖  AI: ${hasKey ? '✅ API key set' : '⚠️  Local AI (no key)'}     ║`);
      console.log('╚══════════════════════════════════════════╝\n');
      console.log(`[ENV] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
      console.log(`[ENV] PORT=${PORT}`);
      ensureAdmin();
      // مَن يملك لوحة المنصّة فعلًا؟ سطرٌ واحدٌ في السجلّ يمنع مفاجأة «403» بعد النشر.
      try {
        const { platformAdminEmails } = require('./middleware/platformAdmin');
        const list = platformAdminEmails();
        console.log(list.length
          ? `[Admin] أدمن المنصّة: ${list.join(', ')}`
          : '[Admin] ⚠️  لا ADMIN_EMAIL — لوحة المنصّة مقفلة في الإنتاج.');
      } catch { /* noop */ }
    });

    // ── WebSocket (moved inside async start) ─────────────────
    const WebSocket = require('ws');
    const jwt       = require('jsonwebtoken');
    const { JWT_SECRET: _wsSecret } = require('./lib/config');
    const wss = new WebSocket.Server({ server, path: '/ws' });
    const clients = new Map();

    wss.on('connection', (ws, req) => {
      const params  = new URLSearchParams((req.url||'').split('?')[1]);
      const hintId  = params.get('userId') || 'anon';
      let userId    = null;
      let authTimer = null;

      const authenticate = (token) => {
        try {
          const decoded = jwt.verify(token, _wsSecret);
          userId = decoded.id || hintId;
          if (authTimer) { clearTimeout(authTimer); authTimer = null; }
          if (!clients.has(userId)) clients.set(userId, new Set());
          clients.get(userId).add(ws);
          ws.send(JSON.stringify({ event: 'connected', userId }));
          return true;
        } catch { return false; }
      };

      // C-3: مصادقة فورية عبر كوكي HttpOnly (آمنة من XSS) إن توفّرت —
      // تتيح مصادقة WebSocket دون إرسال التوكن في رسالة من localStorage
      const cookieHeader = req.headers.cookie || '';
      const cookiePair = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      if (cookiePair) { try { authenticate(decodeURIComponent(cookiePair.slice(6))); } catch {} }

      // Give client 5 s in production to send auth message; allow dev without auth
      if (userId) {
        // مُصادَق عبر الكوكي — لا حاجة لمؤقّت أو رسالة auth إضافية
      } else if (process.env.NODE_ENV === 'production') {
        authTimer = setTimeout(() => {
          if (!userId) { ws.close(4001, 'Auth timeout'); }
        }, 5000);
      } else {
        // Dev: auto-auth with hintId so existing tests/demos work
        userId = hintId;
        if (!clients.has(userId)) clients.set(userId, new Set());
        clients.get(userId).add(ws);
        ws.send(JSON.stringify({ event: 'connected', userId }));
      }

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'auth' && msg.token) {
            if (!authenticate(msg.token)) ws.close(4001, 'Unauthorized');
          }
        } catch {}
      });

      ws.on('close', () => {
        if (authTimer) clearTimeout(authTimer);
        if (userId) {
          clients.get(userId)?.delete(ws);
          if (!clients.get(userId)?.size) clients.delete(userId);
        }
      });
      ws.on('error', () => {});
    });

    app.set('broadcast', (userId, event) => {
      const set = clients.get(userId);
      if (!set) return;
      const payload = JSON.stringify(event);
      set.forEach(ws => { try { ws.send(payload); } catch {} });
    });

  } catch (err) {
    console.error('[Server] ❌ Startup failed:', err.message);
    process.exit(1);
  }
}

startServer();

// WebSocket is now initialized inside startServer() above.

// ── Init Supabase sync ───────────────────────────────────────
require('./sync').ensureTable().catch(() => {});

// ── Auto-create admin ─────────────────────────────────────────
async function ensureAdmin() {
  try {
    // بلا قاعدةٍ لا يوجد ما يُنشَأ. كان يمضي فيرجع createUser قيمةً معدومة،
    // فيرمي `Cannot read properties of undefined (reading 'id')` — سطرٌ غامضٌ
    // يوهم بعطبٍ في إنشاء الأدمن، بينما السبب مذكورٌ أعلاه بوضوح. الضجيجُ
    // فوق الرسالة الصحيحة يُضيّع الوقتَ تمامًا كالصمت.
    if (!process.env.DATABASE_URL) {
      if (process.env.ADMIN_EMAIL) console.warn('[Admin] تُخُطّي إنشاء الأدمن — لا قاعدة بيانات (انظر الرسالة أعلاه).');
      return;
    }
    const { db } = require('./database');
    const email = process.env.ADMIN_EMAIL;
    const pass  = process.env.ADMIN_PASSWORD;
    if (!email || !pass) return;
    if (await db.getUserByEmail(email)) return;
    const bcrypt = require('bcryptjs');
    const user = await db.createUser({ name: process.env.ADMIN_NAME || 'Admin', email, password: bcrypt.hashSync(pass, 10), role: 'admin' });
    if (!user?.id) { console.error('[Admin] لم يُنشأ المستخدم — تحقّق من اتّصال القاعدة'); return; }
    const { defaultSettings } = require('./defaults');
    await db.saveSettings(user.id, { ...defaultSettings, brand: { ...defaultSettings.brand, email } });
    console.log(`[Admin] Created: ${email}`);
  } catch(e) { console.error('[Admin]', e.message); }
}

// ── Morning Report Cron ─────────────────────────
function startMorningReportCron() {
  const { db } = require('./database');
  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setDate(next.getDate() + (now.getHours() >= 8 ? 1 : 0));
    next.setHours(8, 0, 0, 0);
    const delay = next.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const users = await db.listUsers();
        if (!Array.isArray(users)) return;
        for (const user of users) {
          const orders        = await db.getOrders(user.id)        || [];
          const conversations = await db.getConversations(user.id) || [];
          const products      = await db.getProducts(user.id)      || [];
          const settings      = await db.getSettings(user.id)      || {};
          const yesterday = new Date(Date.now()-86400000).toISOString().split('T')[0];
          const ydOrders  = orders.filter(o=>o.status!=='cancelled'&&o.createdAt?.startsWith(yesterday));
          const ydRev     = ydOrders.reduce((s,o)=>s+o.total,0);
          const pending   = orders.filter(o=>o.status==='pending').length;
          const unread    = conversations.filter(c=>c.unread>0).length;
          const lowStock  = products.filter(p=>p.stock>0&&p.stock<=5).length;
          const msg = [
            '🌅 ملخص صباح اليوم:',
            `💰 إيراد الأمس: ${ydRev.toLocaleString()} ${settings?.brand?.currency||'MAD'}`,
            `🛒 طلبات معلقة: ${pending}`,
            `💬 رسائل غير مقروءة: ${unread}`,
            lowStock > 0 ? `⚠️ مخزون منخفض: ${lowStock} منتج` : '✅ المخزون جيد',
          ].join("\n");
          await db.addNotification({ userId: user.id, type: 'info', message: msg });
          await db.addLog({ userId: user.id, user: 'System', action: 'Morning report generated', details: '', type: 'info', severity: 'info' });
        }
      } catch(e) { console.error('[MorningReport]', e.message); }
      scheduleNext();
    }, delay);
  }
  scheduleNext();
  console.log('[MorningReport] Cron scheduled for 08:00 daily');
}
startMorningReportCron();

// ── Daily Backup System ─────────────────────────
// المنطقُ انتقل إلى `lib/backup.js`: النسخُ تُكتب فعلًا، لكنّ **الدوام** يُعلَن
// ولا يُفترَض. كان يُكتب في قرص الحاوية ويُعرَض للتاجر كأنّه محفوظ.
function startDailyBackup() {
  const { db } = require('./database');
  const backup = require('./lib/backup');
  const doBackup = () => backup.run(db).catch(e => console.error('[Backup]', e.message));
  setTimeout(doBackup, 5000);
  setInterval(doBackup, 24 * 60 * 60 * 1000);
  const loc = backup.location();
  console.log(loc.durable
    ? `[Backup] مجدوَل يوميًّا → ${loc.dir}`
    : `[Backup] ⚠️  مجدوَل يوميًّا، لكن **غيرُ دائم**: ${loc.why}`);
}
startDailyBackup();

// ── Abandoned-cart reminder Cron (H-4) ──────────────────────────
// بديل موثوق لمؤقّتات setTimeout في الذاكرة (التي تُفقد عند إعادة التشغيل):
// فحص دوري كل ساعة يجد المحادثات المهجورة ويذكّرها مرّة واحدة.
function startAbandonedCartCron() {
  const { db } = require('./database');
  async function run() {
    try {
      const convs = await db.getAbandonedConversations();
      for (const c of convs) {
        await db.addMessage(c.id, { content: 'مرحبا! 😊 هل أتممت طلبك؟ نحن هنا إذا كنت بحاجة مساعدة', role: 'ai' });
        await db.addNotification({ userId: c.userId, type: 'info', message: `⏰ تم إرسال تنبيه سلة مهجورة لـ ${c.customerName}` });
        await db.markCartReminded(c.id);
      }
      if (convs.length) console.log(`[AbandonedCart] Sent ${convs.length} reminder(s)`);
    } catch (e) { console.error('[AbandonedCart]', e.message); }
  }
  setTimeout(run, 30 * 1000);
  setInterval(run, 60 * 60 * 1000);
  console.log('[AbandonedCart] Hourly reminder cron scheduled');
}
startAbandonedCartCron();

// ── مُعيدُ محاولةِ الشحن ──────────────────────────────────────────
//
//   `lib/retryQueue.js` كان مبنيًّا ومُختبَرًا **ولا يستدعيه أحد**: كلُّ فشلٍ
//   لدى شركة التوصيل — ولو كان مهلةً عابرةً لدقيقتَين — يُقابَل بـ«سجّل الطلبَ
//   في موقع الشركة يدويًّا». أي أنّ انقطاعًا لا يدَ للتاجر فيه يتحوّل عملًا
//   عليه، والشحنةُ قد لا تُرسَل أصلًا إن انشغل.
//
//   يمرّ كلَّ خمس دقائق على الطلبات التي حان موعدُها ويسلك **نفسَ** مسار
//   الشحن الذي يسلكه الزرّ (`lib/shipmentAttempt`)، فلا نسختان تتباعدان.
//   والقرارُ — أيُعاد أم يُطلَب الإنسان — يبقى في `retryQueue` وحدَه.
function startShipmentRetryCron() {
  const { db } = require('./database');
  const { runShipment } = require('./lib/shipmentAttempt');
  async function run() {
    try {
      const due = await db.getOrdersDueForDeliveryRetry();
      for (const order of due) {
        // الشركةُ تُعاد قراءتُها في كلّ محاولة: قد يكون التاجرُ أصلح المفتاحَ
        // أو عطّل الشركةَ بين محاولتَين، فالصفُّ المحفوظ قد يكون قديمًا.
        const provs = (await db.getDeliveryProviders(order.userId)).filter(p => p.enabled);
        const prov = provs.find(p => p.name === order.deliveryProvider) || provs[0];
        if (!prov) {
          // لا شركةَ مفعّلةً الآن ⇒ لا معنى لإعادةٍ سادسة. يُسلَّم للإنسان.
          await db.updateOrder(order.id, { deliveryStatus: 'manual_required', deliveryRetryAt: null });
          continue;
        }
        const settings = (await db.getSettings(order.userId)) || {};
        await runShipment({
          userId: order.userId, order, prov, settings,
          attempts: Number(order.deliveryAttempts || 0),
        });
      }
      if (due.length) console.log(`[ShipmentRetry] Retried ${due.length} shipment(s)`);
    } catch (e) { console.error('[ShipmentRetry]', e.message); }
  }
  setTimeout(run, 45 * 1000);
  setInterval(run, 5 * 60 * 1000);
  console.log('[ShipmentRetry] Cron scheduled every 5 minutes');
}
startShipmentRetryCron();

// ── مزامنةُ التتبّع الدوريّة ──────────────────────────────────────
//
//   ثلاثةُ مزوّدين يُعلنون `tracking:'api'` وقادرون على الجواب، ولم يكن
//   يستدعيهم إلّا **إصبعُ التاجر**. فالزبونُ الذي يبحث بكوده يرى حالةً
//   مجمّدةً عند لحظة الإنشاء، والشركةُ تعرف أنّ طردَه خرج للتوزيع.
//
//   نصفُ ساعةٍ لا خمسُ دقائق: حالةُ الشحنة تتغيّر مرّاتٍ في اليوم لا في
//   الدقيقة، وسؤالٌ أكثفُ يحرق سقفَ الطلبات بلا خبرٍ جديد. والقرارُ كلُّه
//   في `lib/trackingSync` — يُختبَر بلا مؤقّت.
function startTrackingSyncCron() {
  const { db } = require('./database');
  const { runCycle } = require('./lib/trackingSync');
  async function run() {
    try {
      const r = await runCycle(db);
      if (r.checked) console.log(`[TrackingSync] ${r.checked} فُحصت · ${r.changed} تغيّرت · ${r.failed} أخفقت`);
    } catch (e) { console.error('[TrackingSync]', e.message); }
  }
  setTimeout(run, 90 * 1000);
  setInterval(run, 30 * 60 * 1000);
  console.log('[TrackingSync] Cron scheduled every 30 minutes');
}
startTrackingSyncCron();



module.exports = app;
