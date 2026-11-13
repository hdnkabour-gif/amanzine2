'use strict';
// ============================================================
// **فصلُ مجالَي الثقة في التوصيل — على PostgreSQL حقيقيّة.**
//
//   المرحلة ① أضافت عمودًا واحدًا (`webhook_secret`) بنفس نمط الأعمدة القائم،
//   لا إطارَ هجرةٍ جديدًا. وهذا يُثبت أنّ العمودَ يُكتَب ويُقرأ ويبقى **مستقلًّا**
//   عن `api_key` عبر إعادة القراءة — لا بقراءةِ مصدرٍ ولا بعميلٍ مزيَّف.
//
//   التصنيف: REAL_POSTGRESQL. بياناتٌ مُصطنَعةٌ بالكامل، قاعدةٌ زائلة.
//   التشغيل: DATABASE_URL=… PGSSLMODE=disable node --test server/test/phase1-delivery-secret.test.js
// ============================================================
// التشفيرُ يشتقّ مفتاحَه من `SECRETS_KEY`/`JWT_SECRET`؛ وبلا أيّهما يصير
//   `encrypt` مرورًا صامتًا. فلو تُرك فارغًا لقاس هذا الملفُّ **البيئةَ** لا
//   الكود: يمرّ أو يسقط لسببٍ لا علاقةَ له بالإصلاح.
process.env.JWT_SECRET ||= 'phase1-test-secret-0123456789abcdef';
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const SKIP = !process.env.DATABASE_URL;
const test = (n, f) => rawTest(n, { skip: SKIP && 'لا DATABASE_URL' }, f);
const { db } = require('../database');
const pool = require('../db');

let USER = '';
const APIKEY = 'outbound-' + crypto.randomBytes(10).toString('hex');
const SECRET = 'inbound-' + crypto.randomBytes(10).toString('hex');
let PID = '';   // المُعرِّفُ من الخادم دائمًا — لا يُملى من العميل.
let PROMO_ID = ''; // Disposable Promo row for credential-at-rest regression.

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail('phase1@test.local')
    || await db.createUser({ name: 'P1', email: 'phase1@test.local', password: bcrypt.hashSync('x', 4), role: 'user' });
  USER = u.id;
});
after(async () => {
  if (SKIP) return;
  await pool.query('DELETE FROM delivery_providers WHERE id = $1', [PID]).catch(() => {});
  await pool.query('DELETE FROM delivery_providers WHERE id = $1', [PROMO_ID]).catch(() => {});
  await pool.end?.();
});

test('**العمودُ يُكتَب ويُقرَأ مستقلًّا عن مفتاح الصادر**', async () => {
  PID = await db.upsertDeliveryProvider({
    userId: USER, name: 'شركةُ اختبار', apiKey: APIKEY, webhookSecret: SECRET,
  });
  const row = await db.getDeliveryProviderRow(PID);
  assert.ok(row, 'لم يُقرأ الصفّ');
  assert.equal(row.apiKey, APIKEY, 'تغيّر مفتاحُ الصادر');
  assert.equal(row.webhookSecret, SECRET, 'لم يُحفَظ سرُّ الوارد');
  assert.notEqual(row.webhookSecret, row.apiKey, '**السرّان متطابقان — لم يقع فصلٌ أصلًا**');
});

test('ويبقى بعد إعادةِ قراءةٍ ثانية — لا حالةَ ذاكرةٍ عابرة', async () => {
  const again = await db.getDeliveryProviderRow(PID);
  assert.equal(again.webhookSecret, SECRET);
  assert.equal(again.apiKey, APIKEY);
});

test('**والسرُّ مشفَّرٌ في العمود — لا يُقرأ من نسخةٍ احتياطيّة**', async () => {
  // `secrets.encrypt` مستعمَلٌ لـ`api_key` منذ زمن؛ سرُّ الوارد يستحقّ مثلَه.
  const { rows } = await pool.query('SELECT api_key, webhook_secret FROM delivery_providers WHERE id = $1', [PID]);
  assert.ok(rows[0], 'لا صفّ');
  assert.notEqual(rows[0].webhook_secret, SECRET, 'السرُّ مخزَّنٌ كنصٍّ صريح');
  assert.match(String(rows[0].webhook_secret), /^enc:v1:/, 'السرُّ غيرُ مشفَّرٍ بالصيغة المعتمَدة');
  assert.match(String(rows[0].api_key), /^enc:v1:/, 'تغيّر سلوكُ تشفير مفتاح الصادر');
});

test('وصفٌّ قديمٌ بلا سرٍّ يبقى قابلًا للقراءة ويُخرِج سرًّا فارغًا', async () => {
  // ارتدادٌ محتمَل: صفوفٌ كُتبت قبل العمود. يجب أن تُقرأ بلا كسر، وأن يكون
  //   سرُّها فارغًا — فيُغلَق بابُها كما يقتضي الفشلُ المغلَق.
  const legacy = 'legacy-' + crypto.randomBytes(4).toString('hex');
  await pool.query(
    `INSERT INTO delivery_providers (id,user_id,name,api_key) VALUES ($1,$2,$3,$4)`,
    [legacy, USER, 'قديمة', 'enc-placeholder']);
  try {
    const row = await db.getDeliveryProviderRow(legacy);
    assert.ok(row);
    assert.equal(row.webhookSecret, '', 'صفٌّ قديمٌ أخرج سرًّا غيرَ فارغ');
  } finally {
    await pool.query('DELETE FROM delivery_providers WHERE id = $1', [legacy]).catch(() => {});
  }
});

test('**والتحديثُ يحفظ السرَّ كما يحفظه الإنشاء** — فرعان لا فرعٌ واحد', async () => {
  // كشفه هذا الملفُّ نفسُه: `upsertDeliveryProvider` له مسارا INSERT وUPDATE،
  //   وأُصلح الأوّلُ وحدَه أوّلَ مرّة. فتاجرٌ يضبط سرَّه على شركةٍ **قائمة** كان
  //   يضغط «حفظ» ولا يُحفَظ شيء — عطبٌ صامتٌ ينتهي ببابٍ مغلقٍ بلا سبب مفهوم.
  const NEW = 'rotated-' + crypto.randomBytes(8).toString('hex');
  await db.upsertDeliveryProvider({
    id: PID, userId: USER, name: 'شركةُ اختبار', apiKey: APIKEY, webhookSecret: NEW,
  });
  const row = await db.getDeliveryProviderRow(PID);
  assert.equal(row.webhookSecret, NEW, 'التحديثُ لا يحفظ سرَّ الوارد');
  assert.equal(row.apiKey, APIKEY, 'التحديثُ أفسد مفتاحَ الصادر');
});


test('Promo API Token entered in fields is encrypted in api_key, never stored in JSONB', async () => {
  const incoming = 'promo-qa-' + crypto.randomBytes(10).toString('hex');
  PROMO_ID = await db.upsertDeliveryProvider({
    userId: USER, name: 'Promo Livraison QA', enabled: true, apiType: 'promo_livraison',
    apiEndpoint: 'https://promo-livraison.ma/seller/api-parcels',
    fields: { token: incoming, testTracking: 'DZ-QA-OLD', sellerId: 'legacy-only' },
  });
  const { rows } = await pool.query(
    'SELECT api_key, fields FROM delivery_providers WHERE id = $1', [PROMO_ID]);
  assert.equal(rows.length, 1);
  assert.match(String(rows[0].api_key), /^enc:v1:/, 'Token was stored without encryption');
  assert.ok(!JSON.stringify(rows[0].fields).includes(incoming),
    'Promo Token leaked into plaintext fields JSONB');
  assert.equal(rows[0].fields.token, undefined);
  assert.equal(rows[0].fields.testTracking, 'DZ-QA-OLD');
  const merchantRow = await db.getDeliveryProviderRow(PROMO_ID);
  assert.equal(merchantRow.apiKey, incoming, 'encrypted key is not usable by Promo provider');
  const promo = require('../services/delivery/providers/promo_livraison.provider');
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push(opts.body);
    return { ok: true, status: 200,
      json: async () => ({ status: 200, tracking: 'DZ-QA-CREATED' }) };
  };
  try {
    const out = await promo.createShipment({
      id: 'QA-PROMO-CRED', customerName: 'QA', customerPhone: '0600000000',
      city: 'Casablanca', address: 'QA', total: 90,
      items: [{ sku: 'QA-PRODUCT', productName: 'QA', quantity: 1 }],
    }, merchantRow);
    assert.equal(out.success, true);
    assert.equal(new URLSearchParams(calls[0]).get('token'), incoming);
  } finally { global.fetch = original; }
});
