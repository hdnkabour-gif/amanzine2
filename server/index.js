'use strict';
// ============================================================
// AI Commerce OS — Backend Server v2.1
// ============================================================
const path = require('path');
const fs   = require('fs');

// Load .env FIRST before anything else
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ── Parse combined CLOUDINARY_URL → individual SDK vars ──────
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
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
const DIST = path.join(__dirname, '..', 'dist');

// ── Ensure data dir ──────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://connect.facebook.net'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      styleSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'",
        'https://api.openai.com',
        'https://generativelanguage.googleapis.com',
        'https://graph.facebook.com',
        'https://accounts.google.com',
        'https://connect.facebook.net',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      mediaSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'self'", 'https://accounts.google.com'],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));

// CORS: strict allowlist only — no wildcard domains
app.use(cors({
  origin: (origin, callback) => {
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
app.use(express.json({ limit: '20mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Rate limiting ─────────────────────────────────────────────
// 1. استثناء مسار الصحة (يوضع دائماً في البداية)
app.use('/api/health', (req, res, next) => next());

// 2. القيود الخاصة بالمسارات المهمة (الآن بحماية 1000 طلب لتجنب 429)
app.use('/api/auth/', rateLimit({ windowMs: 60 * 1000, max: 1000, message: { error: 'Too many requests, try again later' } }));

// محددات أدق للمسارات العامة
app.use('/api/coupons/public/spin', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'محاولات كثيرة — عُد لاحقاً 🍀' } }));
app.use('/api/orders/public',       rateLimit({ windowMs: 60 * 60 * 1000, max: 15, message: { error: 'طلبات كثيرة من هذا الجهاز — حاول بعد قليل' } }));
app.use('/api/ai/public-reply',     rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: { error: 'رسائل كثيرة — انتظر قليلاً ثم أعد المحاولة' } }));
app.use('/api/coupons/validate',    rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: { error: 'محاولات تحقق كثيرة — انتظر قليلاً' } }));
app.use('/api/track',               rateLimit({ windowMs: 5 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/bookings/public',     rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'محاولات حجز كثيرة — حاول بعد قليل' } }));
app.use('/api/search',              rateLimit({ windowMs: 10 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));
app.use('/api/recommend',           rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));
app.use('/api/feed',                rateLimit({ windowMs: 10 * 60 * 1000, max: 150, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));
app.use('/api/discover',            rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));
app.use('/api/business',            rateLimit({ windowMs: 10 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));
app.use('/api/needs',               rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'طلبات كثيرة — حاول بعد قليل' } }));
app.use('/api/knowledge',           rateLimit({ windowMs: 10 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات كثيرة — انتظر قليلاً' } }));

// سقف لمسارات الذكاء الاصطناعي
app.use('/api/ai/',          rateLimit({ windowMs: 60 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'طلبات ذكاء اصطناعي كثيرة — انتظر قليلاً (حماية التكلفة)' } }));
app.use('/api/orders/track', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'محاولات تتبّع كثيرة — انتظر قليلاً' } }));

// 3. القيد العام (يوضع في النهاية ليلتقط ما تبقى)
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

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
app.use('/api/ai',            require('./routes/ai-search'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/delivery-auto', require('./routes/delivery-auto'));
app.use('/api/push',          require('./routes/push'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/providers',     require('./routes/providers'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/recommend',     require('./routes/recommend'));
app.use('/api/feed',          require('./routes/feed'));
app.use('/api/insights',      require('./routes/insights'));
app.use('/api/track',         require('./routes/track'));
app.use('/api/wallet',        require('./routes/wallet'));
app.use('/api/payment',       require('./routes/payment'));

// المحرّكات المعتمدة على الأحداث
try {
  require('./lib/engines/analytics').init();
  require('./lib/engines/rules').init(require('./lib/engines/notification'));
  require('./lib/engines/learning').init(require('./lib/engines/eventbus'));
  console.log('[engines] analytics + rules→notification + learning subscribers ready');
} catch (e) { console.error('[engines] init failed:', e.message); }
app.use('/api/discover',      require('./routes/discover'));
app.use('/api/business',      require('./routes/business'));
app.use('/api/knowledge',     require('./routes/knowledge'));
app.use('/api/needs',         require('./routes/needs'));

// ── Health ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok', version: '3.2.0', name: 'AMANZINE AI Commerce OS',
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()) + 's',
    memory: Math.round(mem.heapUsed/1024/1024) + 'MB',
    node: process.version,
    ai: {
      openai: !!(process.env.OPENAI_API_KEY),
      gemini: !!(process.env.GEMINI_API_KEY),
    },
    env: process.env.NODE_ENV || 'development',
  });
});

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

// ── Structured logging + crash handlers ──────────────────────
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
      try { await migrate(); }
      catch (e) { logger.error('DB migration failed — starting in degraded mode (check DATABASE_URL / DB connectivity)', { error: e.message }); logger.capture(e); }
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
      try {
        const { platformAdminEmails } = require('./middleware/platformAdmin');
        const list = platformAdminEmails();
        console.log(list.length
          ? `[Admin] أدمن المنصّة: ${list.join(', ')}`
          : '[Admin] ⚠️  لا ADMIN_EMAIL — لوحة المنصّة مقفلة في الإنتاج.');
      } catch { /* noop */ }
    });

    // ── WebSocket ──────────────────────────────────────────────
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

      const cookieHeader = req.headers.cookie || '';
      const cookiePair = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
      if (cookiePair) { try { authenticate(decodeURIComponent(cookiePair.slice(6))); } catch {} }

      if (userId) {
        // مُصادَق عبر الكوكي
      } else if (process.env.NODE_ENV === 'production') {
        authTimer = setTimeout(() => {
          if (!userId) { ws.close(4001, 'Auth timeout'); }
        }, 5000);
      } else {
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

// ── Init Supabase sync ───────────────────────────────────────
require('./sync').ensureTable().catch(() => {});

// ── Auto-create admin ─────────────────────────────────────────
async function ensureAdmin() {
  try {
    const { db } = require('./database');
    const email = process.env.ADMIN_EMAIL;
    const pass  = process.env.ADMIN_PASSWORD;
    if (!email || !pass) return;
    if (await db.getUserByEmail(email)) return;
    const bcrypt = require('bcryptjs');
    const user = await db.createUser({ name: process.env.ADMIN_NAME || 'Admin', email, password: bcrypt.hashSync(pass, 10), role: 'admin' });
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
function startDailyBackup() {
  const { db } = require('./database');
  async function doBackup() {
    try {
      const users = await db.listUsers();
      if (!Array.isArray(users) || !users.length) return;
      for (const user of users) {
        const backup = {
          timestamp: new Date().toISOString(),
          products:  await db.getProducts(user.id)  || [],
          orders:    await db.getOrders(user.id)    || [],
          customers: await db.getCustomers(user.id) || [],
          settings:  await db.getSettings(user.id)  || {},
        };
        const backupDir = path.join(DATA_DIR, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const filename = `backup-${user.id}-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(backup, null, 2));
        const files = fs.readdirSync(backupDir).filter(f => f.includes(user.id)).sort();
        if (files.length > 7) files.slice(0, files.length - 7).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
        console.log(`[Backup] ✅ ${user.email} — ${filename}`);
      }
    } catch(e) { console.error('[Backup]', e.message); }
  }
  setTimeout(doBackup, 5000);
  setInterval(doBackup, 24 * 60 * 60 * 1000);
  console.log('[Backup] Daily backup scheduled');
}
startDailyBackup();

// ── Abandoned-cart reminder Cron (H-4) ──────────────────────────
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

module.exports = app;