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
  // ثقةُ TLS تعيش في `lib/dbSsl.js` — مصدرٌ واحدٌ ومقيسٌ بمصفوفة إعدادات.
  //   وكانت هنا دالّةٌ محلّيّةٌ غيرُ قابلةٍ للنداء من اختبار، فبقي أخطرُ قرارٍ
  //   في الوصلة بلا حارسٍ سلوكيٍّ واحد.
  const { buildSSL, ADVICE } = require('./lib/dbSsl');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: buildSSL(),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  // خطأُ ثقةٍ لا يُقال «فشل الاتّصال»: يُقال ما يُضبَط بالضبط.
  pool.on('error', (err) => {
    const trust = /self-signed|self signed|unable to verify|CERT_|DEPTH_ZERO/i.test(err.message || '');
    console.error('[DB] Pool error:', err.message, trust ? `\n[DB] ${ADVICE}` : '');
  });
  module.exports = pool;
}
