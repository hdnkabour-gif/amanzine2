'use strict';
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  // الوضع بلا قاعدة راحةُ تطوير. في **الإنتاج** هو فخٌّ صامت: التطبيق يبدو
  // عاملًا، والصحّة تنجح، والدخول يفشل بـ401 غامض، وكلُّ حفظٍ يختفي بلا أثر.
  // لا نُسقط الخادم (فيفشل الفحص ولا ترى الرسالة أصلًا) — بل نصرخ بما لا يُخطأ،
  // ونُعلن الحالة في /api/health حتّى لا يُظنّ النظامُ سليمًا وهو بلا ذاكرة.
  if (process.env.NODE_ENV === 'production') {
    const L = '═'.repeat(66);
    console.error(`\n${L}\n  ⛔  لا توجد قاعدة بيانات في الإنتاج — DATABASE_URL غير مضبوط.\n` +
      '      • لا أحد يقدر يسجّل الدخول (كلّ محاولة ⇒ 401)\n' +
      '      • كلُّ نشرٍ أو إعدادٍ أو طلبٍ يضيع فورًا\n' +
      '      • الجداول والترحيل بلا معنى ما دام لا يوجد اتّصال\n' +
      '      الحلّ: أضِف قاعدة PostgreSQL في Railway واربط DATABASE_URL بالخدمة.\n' +
      `${L}\n`);
    global.__AMZ_NO_DB__ = true;   // تقرؤه /api/health فيُعلن التدهور
  }
  console.warn('[DB] ⚠️  DATABASE_URL is not set — running in no-database mode (all queries return empty results).');
  // Stub client returned by stub pool.connect() — supports BEGIN/COMMIT/ROLLBACK
  const stubClient = {
    query:   async () => ({ rows: [], rowCount: 0 }),
    release: () => {},
  };
  // Full stub pool: supports both pool.query() and pool.connect() (for transactions)
  module.exports = {
    query:   async () => ({ rows: [], rowCount: 0 }),
    connect: async () => stubClient,
    on:      () => {},
  };
} else {
  // TLS لقاعدة البيانات:
  //   • أأمَن: مرّر CA عبر DATABASE_CA (نص) أو PGSSLROOTCERT/DATABASE_CA_PATH (مسار) → تحقّق صارم.
  //   • التعطيل الصريح: PGSSLMODE=disable أو DB_SSL=false أو sslmode=disable في الرابط.
  //   • الافتراضيّ لمزوّدي PG المُدارين (Railway/Supabase/Render/Heroku): TLS متسامح
  //     (rejectUnauthorized:false) لأنّهم يقدّمون سلسلة شهادات موقّعة ذاتيًّا — وهذا يمنع خطأ
  //     «self-signed certificate in certificate chain» الذي كان يُفشل الـ migration ويُدخِل الوضع المتدهور.
  function buildSSL() {
    const url = process.env.DATABASE_URL || '';
    if (process.env.PGSSLMODE === 'disable' || process.env.DB_SSL === 'false' || /sslmode=disable/i.test(url)) return false;
    const caPath   = process.env.PGSSLROOTCERT || process.env.DATABASE_CA_PATH;
    const caInline = process.env.DATABASE_CA;
    try {
      if (caInline) return { rejectUnauthorized: true, ca: caInline };
      if (caPath)   return { rejectUnauthorized: true, ca: require('fs').readFileSync(caPath, 'utf8') };
    } catch (e) { console.warn('[DB] CA load failed, falling back to tolerant TLS:', e.message); }
    const isLocal = /@(localhost|127\.0\.0\.1|\[?::1\]?)[:/]/i.test(url);
    if (isLocal && process.env.NODE_ENV !== 'production') return false; // تطوير محلّي: بلا TLS
    return { rejectUnauthorized: false }; // PG مُدار عن بُعد: TLS متسامح (النمط القياسيّ)
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: buildSSL(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => console.error('[DB] Pool error:', err.message));
  module.exports = pool;
}
