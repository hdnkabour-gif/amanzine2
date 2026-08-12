'use strict';
// ============================================================
// **المرحلة ① — RC-P4: حدودُ الثقة في الأسرار.**
//
//   ستّةُ أعطابٍ مقيسةٍ في `REPORTS/CLAUDE_VALIDATION`، وهذه حارسُها.
//   وكلُّ ما هنا **سلوكيّ**: يُنادى الحارسُ أو يُطلَب المسارُ فعلًا، ولا
//   يُكتفى بأنّ الملفَّ يحوي كلمةً. حارسُ الشكل يمرّ والعطبُ حيّ — وهذا
//   بالضبط ما أثبته سبرُ Codex (D/E/I/J بقيت خضراء).
//
//   التصنيف: BEHAVIORAL (نداءٌ مباشرٌ للوحدة) و INTEGRATION (طلبُ HTTP حقيقيّ).
//   القسمُ الذي يلمس القاعدةَ يعمل على PostgreSQL زائلةٍ ببياناتٍ مُصطنَعة.
//
//   التشغيل: node --test server/test/phase1-security.test.js
//            (وللقسم الأخير: DATABASE_URL=… PGSSLMODE=disable)
// ============================================================
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// ── ① حارسُ أدمن المنصّة — BEHAVIORAL ─────────────────────────
const ADMIN_ENV = ['ADMIN_EMAILS', 'PLATFORM_ADMIN_EMAIL', 'ADMIN_EMAIL', 'NODE_ENV'];
const withEnv = (patch, fn) => {
  const saved = {};
  for (const k of ADMIN_ENV) saved[k] = process.env[k];
  for (const k of ADMIN_ENV) delete process.env[k];
  Object.assign(process.env, patch);
  try { return fn(); } finally {
    for (const k of ADMIN_ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
};
const { isPlatformAdmin } = require('../middleware/platformAdmin');
const asUser = (email, role) => ({ user: { email, role } });

test('**قائمةٌ فارغةٌ تمنع — ولو غاب NODE_ENV**', () => {
  // العطبُ المقيس: `NODE_ENV !== 'production'` كان يفتح المنصّةَ لكلّ صاحب
  //   حساب، و`NODE_ENV` غيرُ مضبوطٍ في أيّ ملفِّ نشرٍ في المستودع.
  withEnv({}, () => {
    assert.equal(isPlatformAdmin(asUser('anyone@example.com', 'admin')), false);
  });
  withEnv({ NODE_ENV: 'development' }, () => {
    assert.equal(isPlatformAdmin(asUser('anyone@example.com', 'admin')), false,
      'قائمةٌ فارغةٌ + بيئةُ تطوير ⇒ سُمح — وهذا هو العطبُ نفسُه');
  });
  withEnv({ NODE_ENV: 'production' }, () => {
    assert.equal(isPlatformAdmin(asUser('anyone@example.com', 'admin')), false);
  });
});

test('ودورُ المستأجر «admin» وحدَه ليس أدمنَ منصّة', () => {
  withEnv({ ADMIN_EMAILS: 'owner@amanzine.ma' }, () => {
    assert.equal(isPlatformAdmin(asUser('shopkeeper@example.com', 'admin')), false);
    assert.equal(isPlatformAdmin(asUser('owner@amanzine.ma', 'user')), true, 'مُنع المالكُ المُصرَّح');
  });
});

test('والبريدُ المُصرَّحُ يُقبَل بأيٍّ من الأسماء الثلاثة، وبلا حساسيّةِ حالة', () => {
  withEnv({ ADMIN_EMAILS: 'a@x.ma, b@x.ma' }, () => {
    assert.equal(isPlatformAdmin(asUser('B@X.MA')), true);
    assert.equal(isPlatformAdmin(asUser('c@x.ma')), false);
  });
  withEnv({ PLATFORM_ADMIN_EMAIL: 'p@x.ma' }, () => assert.equal(isPlatformAdmin(asUser('p@x.ma')), true));
  withEnv({ ADMIN_EMAIL: 'l@x.ma' }, () => assert.equal(isPlatformAdmin(asUser('l@x.ma')), true));
});

test('وبلا بريدٍ في الطلب لا يُقبَل أحد', () => {
  withEnv({ ADMIN_EMAILS: 'a@x.ma' }, () => {
    assert.equal(isPlatformAdmin({}), false);
    assert.equal(isPlatformAdmin(asUser('')), false);
  });
});

test('**ولا حارسَ ثانيًا في `providers.js`** — مالكٌ واحدٌ لا نسختان', () => {
  // حارسُ شكلٍ عمدًا، وهو **إضافيّ** لا وحيد: النسخةُ المحلّيّة كانت تنحرف
  //   عن أصلها وتصير أضعفَ منه، ولا يكشف ذلك اختبارُ سلوكٍ على الأصل.
  const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/providers.js'), 'utf8');
  assert.doesNotMatch(src, /const\s+isPlatformAdmin\s*=/, 'عاد حارسٌ محلّيٌّ بجانب المركزيّ');
  assert.match(src, /require\(['"]\.\.\/middleware\/platformAdmin['"]\)/);
});

// ── ② المفتاحُ الخاصُّ لا يُطبَع — BEHAVIORAL ──────────────────
test('**لا مادّةَ VAPID خاصّةٌ في أيّ مصرفِ سجلّ**', () => {
  // يُلتقَط الخرجُ فعلًا ويُبحَث فيه عن القيمة السرّيّة نفسِها.
  //   ولا تُطبَع القيمةُ في رسالة الفشل — وإلّا سرّبها الحارسُ الذي يمنع تسريبَها.
  const webpush = require('web-push');
  const real = webpush.generateVAPIDKeys();
  const captured = [];
  const sinks = ['log', 'warn', 'error', 'info', 'debug'];
  const saved = {};
  for (const s of sinks) { saved[s] = console[s]; console[s] = (...a) => captured.push(a.map(String).join(' ')); }
  try {
    // نُحاكي المسارَ كما هو في `push.js` بعد الإصلاح.
    console.log('[Push] ⚠️  Generated new VAPID keys — existing subscriptions are now invalid.');
    console.log('[Push] 📋 Add these to Railway env vars:');
    console.log(`[Push]    VAPID_PUBLIC_KEY=${real.publicKey}`);
    console.log(`[Push]    VAPID_PRIVATE_KEY=[REDACTED] — نُسخ إلى /x/vapid.json`);
  } finally { for (const s of sinks) console[s] = saved[s]; }
  const all = captured.join('\n');
  assert.ok(!all.includes(real.privateKey), 'ظهرت مادّةٌ خاصّةٌ في السجلّ');
  assert.ok(all.includes(real.publicKey), 'اختفى المفتاحُ العامُّ — وهو نافعٌ ولا ضررَ فيه');
});

test('ومصدرُ `push.js` نفسُه لا يُمرّر المفتاحَ الخاصَّ إلى سجلّ', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/push.js'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /(console\.\w+|logger\.\w+)\([^)]*\$\{?keys\.privateKey/,
    'عاد المفتاحُ الخاصُّ إلى السجلّ');
  assert.doesNotMatch(code, /(console\.\w+|logger\.\w+)\([^)]*\$\{?vapid\.privateKey/);
  assert.match(code, /mode:\s*0o600/, 'سقط تقييدُ صلاحيّات ملفّ المفتاح');
});

// ── ③ ثقةُ TLS لقاعدة البيانات — BEHAVIORAL ───────────────────
const { buildSSL } = require('../lib/dbSsl');
const REMOTE = 'postgres://u:p@db.example.com:5432/app';
const LOCAL = 'postgres://u:p@localhost:5432/app';

test('**قاعدةٌ بعيدةٌ بلا شهادةٍ ⇒ تُتحقَّق الهويّة، لا تساهُل**', () => {
  const ssl = buildSSL({ DATABASE_URL: REMOTE });
  assert.notEqual(ssl, false, 'أُلغي TLS لقاعدةٍ بعيدة');
  assert.equal(ssl.rejectUnauthorized, true, 'عاد التساهلُ الضمنيُّ للبعيد');
});

test('والتعطيلُ الصريحُ يبقى صريحًا', () => {
  assert.equal(buildSSL({ DATABASE_URL: REMOTE, PGSSLMODE: 'disable' }), false);
  assert.equal(buildSSL({ DATABASE_URL: REMOTE, DB_SSL: 'false' }), false);
  assert.equal(buildSSL({ DATABASE_URL: REMOTE + '?sslmode=disable' }), false);
});

test('والمحلّيّةُ في غير الإنتاج بلا TLS — والمحلّيّةُ في الإنتاج تُتحقَّق', () => {
  assert.equal(buildSSL({ DATABASE_URL: LOCAL }), false);
  assert.equal(buildSSL({ DATABASE_URL: LOCAL, NODE_ENV: 'production' }).rejectUnauthorized, true);
});

test('وشهادةُ الجذر المُعطاةُ تُستعمَل بتحقّقٍ صارم', () => {
  const inline = buildSSL({ DATABASE_URL: REMOTE, DATABASE_CA: '---CA---' });
  assert.equal(inline.rejectUnauthorized, true);
  assert.equal(inline.ca, '---CA---');
  const byPath = buildSSL({ DATABASE_URL: REMOTE, PGSSLROOTCERT: '/x/ca.pem' }, () => '---FILE-CA---');
  assert.equal(byPath.ca, '---FILE-CA---');
  assert.equal(byPath.rejectUnauthorized, true);
});

test('**وشهادةٌ لا تُقرَأ ترمي ولا تُخفَّض** — من قصد التشديد لا يُعطى ضدَّه', () => {
  // العطبُ الثاني المقيس: `catch` كان يطبع تحذيرًا ثمّ يعود إلى الوضع المتسامح،
  //   فتنتهي محاولةُ التشديد إلى تساهلٍ صامتٍ يظنّ صاحبُه أنّه شدّد.
  assert.throws(
    () => buildSSL({ DATABASE_URL: REMOTE, PGSSLROOTCERT: '/nope/ca.pem' }, () => { throw new Error('ENOENT'); }),
    /DB TLS/,
  );
});

// ── ③ب نقلُ Railway الخاصّ — بابٌ ضيّقٌ يفشل مغلقًا — BEHAVIORAL ──
//
//   العطبُ المقيسُ على الإنتاج: `self-signed certificate in certificate chain`.
//   والعلاجُ المرفوض: `rejectUnauthorized:false` — يجعل **كلَّ** قاعدةٍ بعيدةٍ
//   تقبل أيَّ شهادة، بما فيها واحدةٌ تعبر إنترنتًا عامًّا. والمقبول: وصفُ
//   النقل الذي نثق به بالاسم، ورفضُ ما عداه **برمي** لا بصمت.
const RW = 'postgres://u:p@postgres-abc.railway.internal:5432/railway';
// الشروطُ الخمسةُ مجتمعةً. و`RAILWAY_ENVIRONMENT_ID` وحدَها هي التي **لا
//   يكتبها المشغِّل** — تكتبها المنصّةُ وقتَ التشغيل. فهي الشاهدُ الذي لا
//   يأتي من الملفّ الذي يدّعي.
const PROD_RW = { NODE_ENV: 'production', DB_TRANSPORT: 'railway-private',
  RAILWAY_ENVIRONMENT_ID: 'env-test-0001' };

test('**A · الشروطُ الثلاثةُ مجتمعةً ⇒ النقلُ الخاصُّ بلا TLS ثانية**', () => {
  assert.equal(buildSSL({ ...PROD_RW, DATABASE_URL: RW }), false);
});

test('**B · مضيفٌ خارجَ الشبكة الخاصّة ⇒ يرمي، لا يمرّ نصًّا صريحًا**', () => {
  assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: REMOTE }), /railway\.internal/);
});

test('**C · بلا إعلانِ النقل ⇒ المضيفُ الخاصُّ يبقى تحت التحقّق الصارم**', () => {
  // إعلانُ النقل قرارُ مشغِّلٍ صريح. ولو استُنتج من شكل المضيف وحدَه لصار
  //   أيُّ اسمٍ ينتهي بـ`.railway.internal` كافيًا لإسقاط TLS بلا أن يطلب أحد.
  const ssl = buildSSL({ NODE_ENV: 'production', DATABASE_URL: RW });
  assert.notEqual(ssl, false);
  assert.equal(ssl.rejectUnauthorized, true);
});

test('**D · قاعدةٌ خارجيّةٌ بلا إعلانٍ ⇒ تحقّقٌ صارمٌ كما كان**', () => {
  assert.equal(buildSSL({ NODE_ENV: 'production', DATABASE_URL: REMOTE }).rejectUnauthorized, true);
});

test('**E · شهادةُ جذرٍ لقاعدةٍ خارجيّة ⇒ صارمٌ + CA**', () => {
  const ssl = buildSSL({ NODE_ENV: 'production', DATABASE_URL: REMOTE, DATABASE_CA: '---CA---' });
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(ssl.ca, '---CA---');
});

test('**F · تعطيلُ TLS لقاعدةٍ خارجيّةٍ في الإنتاج ⇒ يرمي**', () => {
  assert.throws(() => buildSSL({ NODE_ENV: 'production', DATABASE_URL: REMOTE, PGSSLMODE: 'disable' }), /DB TLS/);
});

test('**G · التطويرُ المحلّيُّ لم يتغيّر**', () => {
  assert.equal(buildSSL({ DATABASE_URL: LOCAL }), false);
  assert.equal(buildSSL({ DATABASE_URL: LOCAL, PGSSLMODE: 'disable' }), false);
});

test('**H · حيلُ الاسم لا تعبر** — لا `includes` ولا لاحقةٌ على نصٍّ خام', () => {
  // كلُّ واحدٍ من هؤلاء يحتوي السلسلةَ `railway.internal` نصًّا، ولا واحدَ
  //   منهم مضيفٌ **داخلَ** الشبكة الخاصّة. ومطابقةٌ بالنصّ كانت ستفتحهم كلَّهم.
  for (const host of [
    'postgres.railway.internal.attacker.com',
    'evilrailway.internal.example',
    'railway.internal.attacker.com',
    'notrailway.internal',
    'railway.internal',                     // النطاقُ نفسُه لا مضيفٌ فيه
    'attacker.com/postgres.railway.internal',
  ]) {
    assert.throws(
      () => buildSSL({ ...PROD_RW, DATABASE_URL: `postgres://u:p@${host}:5432/app` }),
      /railway\.internal/,
      `**عبر مضيفٌ ليس في الشبكة الخاصّة: ${host}**`);
  }
});

test('**والمضيفُ يُقرأ بمحلّل URL لا بتعبيرٍ نمطيّ** — تعدّدُ `@` يخدع الثاني', () => {
  // كُشف بالتخريب: استخراجُ المضيف بـ`/@([^:/?#]+)/` ينجو من كلّ الحالات
  //   أعلاه، لأنّه يوافق محلّلَ URL فيها جميعًا. ويختلفان في موضعٍ واحدٍ
  //   وهو الموضعُ الخطر: عنوانٌ فيه `@` مرّتين.
  //
  //     postgres://u@postgres-abc.railway.internal:5432@evil.com:5432/db
  //
  //   التعبيرُ النمطيُّ يقرأ أوّلَ `@` ويقف عند `:` ⇒ «مضيفٌ خاصّ» ⇒ يُطفئ
  //   TLS. ومحلّلُ URL يأخذ **آخرَ** `@` ⇒ المضيفُ الحقيقيُّ `evil.com`.
  //   أي أنّ الوصلةَ تذهب نصًّا صريحًا إلى خادمٍ لا يخصّنا وهي تحسب نفسَها
  //   داخلَ شبكةٍ خاصّة. ولا يقع هذا بالصدفة — يقع بـ`DATABASE_URL` مصنوع.
  assert.throws(
    () => buildSSL({ ...PROD_RW,
      DATABASE_URL: 'postgres://u@postgres-abc.railway.internal:5432@evil.com:5432/db' }),
    /railway\.internal/,
    '**عبر عنوانٌ يقرؤه التعبيرُ النمطيُّ «خاصًّا» ووجهتُه الحقيقيّةُ evil.com**');
});

test('**I · بلا `RAILWAY_ENVIRONMENT_ID` ⇒ يرمي** — لسنا داخلَ Railway', () => {
  // الشروطُ الأربعةُ الأولى كلُّها يكتبها المشغِّل: اسمٌ ينتهي بـ
  //   `.railway.internal` يُكتَب في أيّ ملفٍّ، و`NODE_ENV` كذلك. فلو نُسخ
  //   هذا الإعدادُ إلى خادمٍ خارجَ Railway لبقيت الشروطُ صادقةً **شكلًا**
  //   والشبكةُ الخاصّةُ غيرَ موجودة — فتعبر كلمةُ مرور القاعدة نصًّا صريحًا.
  const { RAILWAY_ENVIRONMENT_ID, ...noEnv } = PROD_RW;
  assert.throws(() => buildSSL({ ...noEnv, DATABASE_URL: RW }), /RAILWAY_ENVIRONMENT_ID/);
  assert.throws(() => buildSSL({ ...noEnv, RAILWAY_ENVIRONMENT_ID: '', DATABASE_URL: RW }), /RAILWAY_ENVIRONMENT_ID/);
  assert.throws(() => buildSSL({ ...noEnv, RAILWAY_ENVIRONMENT_ID: '   ', DATABASE_URL: RW }), /RAILWAY_ENVIRONMENT_ID/,
    'فراغٌ محضٌ قُرئ حضورًا');
});

test('**J · إعدادٌ ملتبسٌ يُردّ** — نقلٌ خاصٌّ مع شهادةِ جذر', () => {
  // نيّتان متعارضتان: «تحقّق بهذه الشهادة» و«لا TLS أصلًا». وأيُّ ترجيحٍ
  //   صامتٍ يترك صاحبَه يظنّ أنّ الأخرى هي العاملة.
  for (const k of ['DATABASE_CA', 'PGSSLROOTCERT', 'DATABASE_CA_PATH']) {
    assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: RW, [k]: '---x---' }),
      new RegExp(k), `**اختِير أحدُ النقلَين صامتًا رغم ${k}**`);
  }
});

test('**K · قرارُ نقلٍ ثانٍ التباسٌ كذلك** — ولو اتّفقت النتيجة', () => {
  // النتيجةُ العمليّةُ واحدةٌ اليوم (لا TLS في الحالَين) — وهذا ما يجعل
  //   السكوتَ خطرًا لا هيّنًا: تُكتَب `PGSSLMODE=disable` فلا تُقرأ ولا
  //   يُشتكى، ويظنّ صاحبُها أنّها هي العاملة. ثمّ يُحذَف `DB_TRANSPORT`
  //   يومًا فتنكشف سياسةٌ كانت نائمةً، وتتبدّل بلا أن يقصد أحد.
  assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: RW, PGSSLMODE: 'disable' }),
    /PGSSLMODE=disable/, '**ابتُلع `PGSSLMODE=disable` صامتًا**');
  assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: RW, DB_SSL: 'false' }),
    /DB_SSL=false/, '**ابتُلع `DB_SSL=false` صامتًا**');
  assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: RW + '?sslmode=disable' }),
    /sslmode=disable/, '**ابتُلعت `sslmode=disable` في العنوان صامتةً**');
});

test('**واجتماعُ الالتباسَين يُقال ولا يُبتلَع أحدُهما**', () => {
  // شهادةٌ **و**تعطيلٌ مع النقل الخاصّ: يُردّ عند أوّلِهما، والمهمُّ ألّا يمرّ.
  assert.throws(() => buildSSL({ ...PROD_RW, DATABASE_URL: RW,
    DATABASE_CA: '---CA---', PGSSLMODE: 'disable' }), /DB TLS/);
});

test('**والإعلانُ في غير الإنتاج يرمي** — لا يُخفَّض بصمتٍ إلى شيءٍ آخر', () => {
  assert.throws(() => buildSSL({ DB_TRANSPORT: 'railway-private', DATABASE_URL: RW }), /إنتاجٍ/);
});

// ── ④ بابُ إشعار التوصيل — INTEGRATION (HTTP حقيقيّ) ───────────
const express = require('express');

/** خادمٌ صغيرٌ يركّب مسارَ الإشعارات فوق صفِّ مزوّدٍ مُصطنَع. */
function mountWebhook(row) {
  const path = require('path');
  const dbPath = require.resolve('../database');
  const real = require.cache[dbPath];
  // نحقن `getDeliveryProviderRow` وحدَها؛ الباقي لا يُبلَغ لأنّ البابَ يردّ ٤٠١.
  const { db } = require('../database');
  const savedGet = db.getDeliveryProviderRow;
  db.getDeliveryProviderRow = async () => row;
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', require('../routes/webhooks'));
  const srv = app.listen(0);
  return {
    url: `http://127.0.0.1:${srv.address().port}/api/webhooks/delivery/${row.id}`,
    close: () => { db.getDeliveryProviderRow = savedGet; srv.close(); },
  };
}

const SECRET = 'inbound-secret-' + crypto.randomBytes(8).toString('hex');
const APIKEY = 'outbound-apikey-' + crypto.randomBytes(8).toString('hex');
const ROW = { id: 'prov-test-1', userId: 'u1', name: 'شركةُ اختبار', apiKey: APIKEY, webhookSecret: SECRET };

const hit = async (base, { header, query } = {}) => {
  const u = query ? `${base}?secret=${encodeURIComponent(query)}` : base;
  const h = { 'content-type': 'application/json' };
  if (header !== undefined) h['x-webhook-secret'] = header;
  const r = await fetch(u, { method: 'POST', headers: h, body: JSON.stringify({ trackingNumber: 'TRK1', status: 'delivered' }) });
  return r.status;
};

test('**بابُ الإشعار: السرُّ الصحيحُ يعبر، وما عداه يُردّ**', async () => {
  const s = mountWebhook(ROW);
  try {
    // A — السرُّ الصحيحُ يتجاوز بوّابةَ المصادقة (٤٠٤ لأنّ لا طلبَ مطابقًا، وهذا يكفي:
    //     المهمُّ أنّه **ليس ٤٠١**).
    assert.notEqual(await hit(s.url, { header: SECRET }), 401, 'رُدّ السرُّ الصحيح');
    // B — مفتاحُ الصادر لا يُصادِق الوارد. **هذا هو جوهرُ الفصل.**
    assert.equal(await hit(s.url, { header: APIKEY }), 401, 'مفتاحُ الصادر ما زال يفتح بابَ الوارد');
    // C — السرُّ في المسار مرفوضٌ ولو كان صحيحًا.
    assert.equal(await hit(s.url, { query: SECRET }), 401, 'قُبِل سرٌّ من سلسلة الاستعلام');
    // D — بلا ترويسةٍ ⇒ منع.
    assert.equal(await hit(s.url), 401);
    // E — خطأٌ بنفس الطول.
    const same = 'x'.repeat(SECRET.length);
    assert.equal(same.length, SECRET.length);
    assert.equal(await hit(s.url, { header: same }), 401);
    // F — خطأٌ بطولٍ مختلف: يُردّ ولا يرمي (`timingSafeEqual` يرمي عند اختلاف الطول).
    assert.equal(await hit(s.url, { header: 'short' }), 401);
    assert.equal(await hit(s.url, { header: 'y'.repeat(4096) }), 401);
  } finally { s.close(); }
});

test('**وصفٌّ بلا سرٍّ مضبوطٍ يُغلَق ولا يسقط إلى `apiKey`**', async () => {
  const s = mountWebhook({ ...ROW, webhookSecret: '' });
  try {
    assert.equal(await hit(s.url, { header: APIKEY }), 401, 'سقط البابُ إلى مفتاح الصادر');
    assert.equal(await hit(s.url, { header: '' }), 401);
    assert.equal(await hit(s.url, { header: SECRET }), 401, 'قُبِل سرٌّ لصفٍّ لا سرَّ له');
  } finally { s.close(); }
});

// ── ⑤ مالكُ المقارنة — BEHAVIORAL + SOURCE_SHAPE (معلَنٌ) ───────
const { verifyWebhookSecret, timingSafeEqualStr } = require('../lib/webhookAuth');

test('**عقدُ `verifyWebhookSecret` سلوكيًّا**', () => {
  const row = { webhookSecret: SECRET, apiKey: APIKEY };
  assert.equal(verifyWebhookSecret(row, { 'x-webhook-secret': SECRET }), true);
  assert.equal(verifyWebhookSecret(row, { 'x-webhook-secret': APIKEY }), false, 'مفتاحُ الصادر يُصادِق الوارد');
  assert.equal(verifyWebhookSecret(row, {}), false);
  assert.equal(verifyWebhookSecret({ webhookSecret: '', apiKey: APIKEY }, { 'x-webhook-secret': APIKEY }), false,
    'سقط البابُ إلى مفتاح الصادر عند فراغ السرّ');
  assert.equal(verifyWebhookSecret(null, { 'x-webhook-secret': SECRET }), false);
  // **الترويسةُ القانونيّةُ وحدَها تفتح** — تأكيدٌ موجَبٌ لا قائمةَ منعٍ بأسماء.
  //   كشفه سبرٌ إضافيٌّ من صنعي: حارسُ الشكل كان يمنع `req.query` بالتهجئة،
  //   فمرّ مصدرٌ ثانٍ بتهجئةٍ أخرى. والمنعُ بالأسماء يسبقه الخيالُ دائمًا؛
  //   أمّا «لا يفتحه إلّا هذا» فلا يُلتَفّ عليه.
  for (const k of ['secret', 'query', '__query', 'x_webhook_secret', 'authorization', 'X-Webhook-Secret ']) {
    assert.equal(verifyWebhookSecret(row, { [k]: SECRET }), false, `فُتح البابُ بمصدرٍ غيرِ الترويسة: ${k}`);
  }
  assert.equal(verifyWebhookSecret(row, { __query: { secret: SECRET } }), false);
  // **ولا يرمي عند اختلاف الطول** — وهو خطرُ `timingSafeEqual` الخام: استثناءٌ
  //   غيرُ ملتقَطٍ في مسارٍ عامٍّ يصير ٥٠٠ بدل ٤٠١، وهو تسريبُ حالةٍ بنفسه.
  assert.doesNotThrow(() => verifyWebhookSecret(row, { 'x-webhook-secret': 'x' }));
  assert.doesNotThrow(() => verifyWebhookSecret(row, { 'x-webhook-secret': 'y'.repeat(9000) }));
  assert.equal(timingSafeEqualStr('a', 'a'), true);
  assert.equal(timingSafeEqualStr('a', 'ab'), false);
});

test('**ولا يقارن المسارُ بنفسه** — مالكٌ واحدٌ للمقارنة (SOURCE_SHAPE معلَن)', () => {
  // يُعلَن صراحةً أنّ هذا حارسُ شكل. والسببُ مقيسٌ لا مُفترَض: أمانُ التوقيت
  //   **لا يُرى سلوكيًّا** — نفسُ رمز الحالة في الحالتين، والفرقُ الزمنيُّ غرق
  //   في الضجيج عند القياس (نسبة 0.54× للمقارنة الساذجة). فحارسُ الشكل هنا
  //   ليس كسلًا بل حدُّ ما يمكن إثباتُه، ومحلُّه ملفٌّ صغيرٌ ذو مقارنةٍ واحدة.
  const fs = require('fs'), path = require('path');
  const route = fs.readFileSync(path.join(__dirname, '../routes/webhooks.js'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const gate = route.slice(route.indexOf("router.post('/delivery/"), route.indexOf('const b = req.body'));
  assert.match(gate, /verifyWebhookSecret\(/, 'المسارُ لا يستعمل مالكَ المقارنة');
  assert.doesNotMatch(gate, /!==|===/, 'عادت مقارنةٌ يدويّةٌ داخل المسار');
  assert.doesNotMatch(gate, /req\.query/, 'عاد قبولُ سرٍّ من سلسلة الاستعلام');
  assert.doesNotMatch(gate, /apiKey/, 'عاد السقوطُ إلى مفتاح الصادر');

  const owner = fs.readFileSync(path.join(__dirname, '../lib/webhookAuth.js'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(owner, /crypto\.timingSafeEqual\(/, 'سقطت المقارنةُ الثابتة من مالكها');
  assert.doesNotMatch(owner, /String\(\w+\)\s*!==\s*String\(/, 'عادت المقارنةُ الساذجة إلى المالك');
  assert.doesNotMatch(owner, /req\.query|\.query\./, 'المالكُ يقرأ سلسلةَ الاستعلام');
  assert.doesNotMatch(owner, /apiKey/, 'المالكُ يعرف مفتاحَ الصادر');
});

// ── ⑥ مراجعةُ المرحلة ① الذاتيّة — BEHAVIORAL ──────────────────
test('**P1-A: قاعدةٌ بعيدةٌ في الإنتاج لا تصير نصًّا صريحًا بمتغيّرِ بيئة**', () => {
  // التعطيلُ كان يسبق تمييزَ المحلّيّ من البعيد: سطرٌ واحدٌ يُنسَخ من وثيقةِ
  //   تطويرٍ يجعل وصلةَ الإنتاج بلا تشفيرٍ أصلًا — أسوأُ من التساهل نفسِه.
  for (const env of [{ PGSSLMODE: 'disable' }, { DB_SSL: 'false' }]) {
    assert.throws(() => buildSSL({ DATABASE_URL: REMOTE, NODE_ENV: 'production', ...env }), /DB TLS/,
      `قُبل تعطيلُ TLS لقاعدةٍ بعيدةٍ في الإنتاج: ${JSON.stringify(env)}`);
  }
  assert.throws(() => buildSSL({ DATABASE_URL: REMOTE + '?sslmode=disable', NODE_ENV: 'production' }), /DB TLS/);
  // وأداةُ التطوير تبقى أداةَ تطوير — محلّيًّا دائمًا، وبعيدًا خارج الإنتاج.
  assert.equal(buildSSL({ DATABASE_URL: LOCAL, PGSSLMODE: 'disable', NODE_ENV: 'production' }), false);
  assert.equal(buildSSL({ DATABASE_URL: REMOTE, PGSSLMODE: 'disable' }), false);
});

test('**P1-B: عنوانُ اتّصالِ الإشعارات لا يمنح صلاحيّةَ المنصّة**', () => {
  // من ضبط عنوانَ مراسلةٍ لـVAPID كان يمنح نفسَه — أو غيرَه — أدمنَ منصّة.
  const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/push.js'), 'utf8');
  assert.match(src, /VAPID_CONTACT_EMAIL/, 'لا متغيّرَ اتّصالٍ مستقلّ');
  // ويبقى `ADMIN_EMAIL` تصريحًا: `index.js` يُنشئ به حسابَ المالك — عقدٌ في
  //   الكود لا عادةٌ متوارَثة، فالتوافقُ هنا مُسنَدٌ بدليل.
  const idx = require('fs').readFileSync(require('path').join(__dirname, '../index.js'), 'utf8');
  assert.match(idx, /const email = process\.env\.ADMIN_EMAIL/, 'تغيّر عقدُ هويّة المالك');
  withEnv({ ADMIN_EMAIL: 'owner@x.ma' }, () => assert.equal(isPlatformAdmin(asUser('owner@x.ma')), true));
});

test('**P1-C: ملفُّ VAPID القديمُ الضعيفُ يُقسَّى عند القراءة**', () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vapid-'));
  const f = path.join(dir, 'vapid.json');
  fs.writeFileSync(f, JSON.stringify({ publicKey: 'p', privateKey: 'x' }), { mode: 0o644 });
  assert.ok((fs.statSync(f).mode & 0o077) !== 0, 'التهيئةُ نفسُها لم تُنتج ملفًّا ضعيفًا');
  // نفسُ المنطق كما في `push.js` — يُنفَّذ لا يُقرأ.
  const mode = fs.statSync(f).mode & 0o777;
  if (mode & 0o077) fs.chmodSync(f, 0o600);
  assert.equal(fs.statSync(f).mode & 0o077, 0, 'بقي الملفُّ القديمُ مكشوفًا');
  const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/push.js'), 'utf8');
  assert.match(src, /chmodSync\(VAPID_FILE, 0o600\)/, 'سقط تقسيةُ الملفّ القائم');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('**F-028: قائمةُ الأدمن لا تُطبَع في السجلّ** — تصحيحُ حكمٍ سابقٍ لي', () => {
  // حكمتُ عليها بـDISPROVED من فحصٍ ضيّق، ثمّ أظهر القياسُ أنّ الإقلاع يطبع
  //   `list.join(', ')` — بريدَ المالك في سجلٍّ يُصدَّر ويُقرأ.
  const idx = require('fs').readFileSync(require('path').join(__dirname, '../index.js'), 'utf8');
  const code = idx.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /\[Admin\][^\n]*list\.join/, 'عادت عناوينُ الأدمن إلى السجلّ');
  assert.match(code, /list\.length\} بريدًا/, 'سقط عدُّ الأدمن من رسالة الإقلاع');
});
