'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pl = require('../services/delivery/providers/promo_livraison.provider');

// ============================================================
// عقدُ Promo Livraison — مقروءًا من وثيقتهم.
//
//   ثلاثةُ مصائدَ لا يقع فيها إلّا مَن يفترض شكلًا معتادًا، وكلٌّ منها يُنتج
//   عطبًا **صامتًا** (شحنةٌ تُعلَن ناجحةً ولا وجودَ لها، أو تتبّعٌ يُقرأ فشلًا
//   وهو نجاح). ولذلك تُثبَّت هنا بالاختبار لا بالتعليق:
//
//     ① `status` يغيّر نوعَه: 200 عند الإضافة، true عند التتبّع، 401 للخطأ.
//     ② `msg` نصٌّ عند الإضافة، مصفوفةُ تاريخٍ عند التتبّع.
//     ③ الخطأُ يصل بترويسة HTTP 200 — فـ`res.ok` لا تكفي وحدَها.
//
//   والاختبارات تعترض `fetch` وتفحص الطلبَ الصادرَ نفسَه: الترميز، وموضعَ
//   الرمز، وترميزَ الأقواس المتداخلة.
// ============================================================

const CFG = { apiKey: 'tok-test', apiEndpoint: 'https://promo-livraison.ma/seller/api-parcels' };

const ORDER = {
  id: 'ord-1',
  customerName: 'John Doe',
  customerPhone: '0600000000',
  city: 'Casablanca',
  cityName: 'Casablanca',
  address: '123 Rue Exemple',
  notes: 'Livraison rapide SVP',
  total: 150,
  deliveryFee: 20,
  items: [{ productId: 'p1', productName: 'Chaussures', sku: 'SKU-DEMO-001', quantity: 2 }],
};

/** يعترض `fetch`، يُعيد ما سُجِّل — بلا شبكة. */
function stub(payload, httpStatus = 200) {
  const calls = [];
  const real = global.fetch;
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method, headers: opts.headers, body: String(opts.body || '') });
    return { ok: httpStatus >= 200 && httpStatus < 300, status: httpStatus, json: async () => payload };
  };
  return { calls, restore: () => { global.fetch = real; } };
}

/** يفكّ جسمَ النموذج إلى كائنٍ لفحص الحقول. */
const parse = (body) => Object.fromEntries(new URLSearchParams(body));

test('الإضافةُ تنجح بـ status عددًا (200) — لا منطقيًّا', async () => {
  const s = stub({ status: 200, msg: 'Commande ajoutée avec succès', tracking: 'DZ-DEMO-000123' });
  try {
    const r = await pl.createShipment(ORDER, CFG);
    assert.equal(r.success, true);
    assert.equal(r.trackingNumber, 'DZ-DEMO-000123');
  } finally { s.restore(); }
});

test('التتبّعُ ينجح بـ status منطقيًّا (true) — لا عددًا', async () => {
  const s = stub({
    status: true,
    msg: [
      { code: 'DZ-DEMO-000123', etat: 'Payé', status: 'En cours de livraison', time: '2025-01-10 09:15:00', colorstatus: '#ffc107', coloretat: '#28a745' },
      { code: 'DZ-DEMO-000123', etat: 'Payé', status: 'Livré', time: '2025-01-11 16:40:00', colorstatus: '#17a2b8', coloretat: '#28a745' },
    ],
    tracking: 'DZ-DEMO-000123',
    delivery: { phone: '0611111111', name: 'Livreur Démo' },
  });
  try {
    const r = await pl.trackShipment('DZ-DEMO-000123', CFG);
    assert.equal(r.success, true);
    // آخرُ حالةٍ هي الحالةُ الجارية — لا أوّلُها.
    assert.equal(r.status, 'Livré');
    assert.equal(r.history.length, 2);
  } finally { s.restore(); }
});

test('`msg` مصفوفةً يُقرأ تاريخًا لا رسالةَ خطأ', async () => {
  const s = stub({ status: true, msg: [{ status: 'Livré', etat: 'Payé', time: 't' }], tracking: 'T1' });
  try {
    const r = await pl.trackShipment('T1', CFG);
    assert.equal(r.history[0].state, 'Payé');
    assert.equal(r.history[0].at, 't');
  } finally { s.restore(); }
});

test('اسمُ الموزّع ورقمُه يصلان — «الغاماسور» الذي يسأل عنه الزبون', async () => {
  const s = stub({ status: true, msg: [{ status: 'Livré' }], tracking: 'T1', delivery: { phone: '0611111111', name: 'Livreur Démo' } });
  try {
    const r = await pl.trackShipment('T1', CFG);
    assert.deepEqual(r.courier, { name: 'Livreur Démo', phone: '0611111111' });
  } finally { s.restore(); }
});

test('الرمزُ الفاسد فشلٌ — ولو وصل بترويسة HTTP 200', async () => {
  const s = stub({ status: 401, msg: 'Token invalide ou expiré' }, 200);
  try {
    const r = await pl.createShipment(ORDER, CFG);
    assert.equal(r.success, false);
    assert.match(r.error, /Token invalide/);
  } finally { s.restore(); }
});

test('نجاحٌ بلا رقم تتبّعٍ يُرفَض — «تمّ» بلا شحنةٍ أسوأُ من فشلٍ صريح', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: '' });
  try {
    const r = await pl.createShipment(ORDER, CFG);
    assert.equal(r.success, false);
    assert.match(r.error, /رقمَ تتبّع/);
  } finally { s.restore(); }
});

test('الطلبُ الصادر: ترميزُ نماذجَ، والرمزُ في الجسم لا في الترويسة', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: 'T1' });
  try {
    await pl.createShipment(ORDER, CFG);
    const c = s.calls[0];
    assert.equal(c.method, 'POST');
    assert.equal(c.headers['Content-Type'], 'application/x-www-form-urlencoded');
    // لا ترويسةَ Authorization — الرمزُ حقلٌ في الجسم.
    assert.equal(c.headers.Authorization, undefined);
    const f = parse(c.body);
    assert.equal(f.token, 'tok-test');
    assert.equal(f.action, 'add');
  } finally { s.restore(); }
});

test('الحقولُ تُطابق وثيقتَهم بأسمائها الفرنسيّة', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: 'T1' });
  try {
    await pl.createShipment(ORDER, CFG);
    const f = parse(s.calls[0].body);
    assert.equal(f.name, 'John Doe');
    assert.equal(f.phone, '0600000000');
    assert.equal(f.ville, 'Casablanca');
    assert.equal(f.adresse, '123 Rue Exemple');
    assert.equal(f.note, 'Livraison rapide SVP');
    assert.equal(f.marchandise, 'Chaussures');
    assert.equal(f.marchandise_qty, '2');
  } finally { s.restore(); }
});

test('`price` هو المبلغُ المُحصَّل من الزبون — لا رسمُ التوصيل', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: 'T1' });
  try {
    await pl.createShipment(ORDER, CFG);
    const f = parse(s.calls[0].body);
    // الطلبُ ١٥٠ ورسمُ التوصيل ٢٠. لو انقلبا لحصّل الموزّعُ ٢٠ درهمًا فقط —
    // وهو العطبُ الماليُّ الذي وقع مع Livo. يُثبَّت هنا حتّى لا يعود.
    assert.equal(f.price, '150');
    assert.notEqual(f.price, '20');
  } finally { s.restore(); }
});

test('المنتجاتُ بترميز الأقواس المتداخلة الذي تنتظره الشركة', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: 'T1' });
  try {
    await pl.createShipment(ORDER, CFG);
    const f = parse(s.calls[0].body);
    assert.equal(f['products[0][sku]'], 'SKU-DEMO-001');
    assert.equal(f['products[0][qty]'], '2');
  } finally { s.restore(); }
});

test('منتجٌ بلا SKU يقع على المُعرِّف — الشركةُ ترفض عنصرًا بلا مرجع', async () => {
  const s = stub({ status: 200, msg: 'ok', tracking: 'T1' });
  try {
    await pl.createShipment({ ...ORDER, items: [{ productId: 'p9', productName: 'X', quantity: 1 }] }, CFG);
    const f = parse(s.calls[0].body);
    assert.equal(f['products[0][sku]'], 'p9');
  } finally { s.restore(); }
});

test('انقطاعُ الشبكة يُعاد فشلًا موصوفًا — لا يرمي', async () => {
  const real = global.fetch;
  global.fetch = async () => { throw new Error('ECONNREFUSED'); };
  try {
    const r = await pl.createShipment(ORDER, CFG);
    assert.equal(r.success, false);
    assert.match(r.error, /ECONNREFUSED/);
  } finally { global.fetch = real; }
});

test('المزوّدُ يطابق العقدَ ويُسجَّل تلقائيًّا بمسح المجلّد', async () => {
  const { validateProvider } = require('../services/delivery/contract');
  assert.deepEqual(validateProvider(pl), []);
  const registry = require('../services/delivery/registry');
  registry._reset();
  const found = registry.get('promo_livraison');
  assert.ok(found, 'لم يُسجَّل المزوّد — تحقّق من لاحقة الملفّ .provider.js');
  assert.equal(found.meta.name, 'Promo Livraison');
  // الاستدلالُ بالنطاق: صفٌّ قديمٌ بلا api_type يُعرَف من رابطه.
  assert.equal(registry.suggest({ apiEndpoint: 'https://promo-livraison.ma/seller/api-parcels' }), 'promo_livraison');
});
