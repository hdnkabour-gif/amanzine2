'use strict';
const test = require('node:test');
const assert = require('node:assert');

// ============================================================
// الولاء — BROKEN_CHAINS#⑧.
//   النقاطُ كانت تُمنَح وتُخزَّن ولا تُصرَف: `redeemLoyaltyPoints` موجودةٌ في
//   طبقة القاعدة ولا مسارَ يستدعيها، و`getLoyaltyAll` تُرجع صفوفًا خامًا بلا
//   اسمِ زبون. وكان الصرفُ يقصّ الفائضَ بصمتٍ ويقول «تمّ».
// ============================================================

const HAS_DB = !!process.env.DATABASE_URL;
const skip = HAS_DB ? false : 'يحتاج DATABASE_URL';

/** مستخدمٌ حقيقيّ: `loyalty_points.user_id` مقيَّدٌ بمفتاحٍ أجنبيّ. */
async function testUser(db, email) {
  const bcrypt = require('bcryptjs');
  const u = await db.getUserByEmail(email)
    || await db.createUser({ name: 'Loyalty', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  return u.id;
}

test('صرفُ نقاطٍ أكثرَ من الرصيد يُرفَض — ولا يُقصّ بصمت', { skip }, async () => {
  const { db } = require('../database');
  const uid = await testUser(db, 'loyalty1@test.ma');
  // `loyalty_points.customer_id` مقيَّدٌ أيضًا — نقاطٌ بلا زبونٍ حقيقيّ مستحيلة.
  const cid = (await db.createCustomer({ userId: uid, name: 'زبون١', phone: `061${Date.now() % 10000000}` })).id;

  await db.addLoyaltyPoints(uid, cid, 1000);          // ١٠٠ نقطة (١٠ دراهم للنقطة)
  const before = await db.getLoyalty(uid, cid);
  assert.equal(+before.points, 100, 'النقطةُ لكلّ ١٠ دراهم');

  const over = await db.redeemLoyaltyPoints(uid, cid, 500);
  assert.equal(over.ok, false);
  assert.equal(over.reason, 'insufficient');
  assert.equal(over.redeemed, 0, 'لا صرفَ جزئيًّا صامتًا');
  assert.equal(over.points, 100, 'الرصيدُ لم يُمَسّ');

  const ok = await db.redeemLoyaltyPoints(uid, cid, 40);
  assert.equal(ok.ok, true);
  assert.equal(ok.redeemed, 40);
  assert.equal(ok.points, 60);

  const zero = await db.redeemLoyaltyPoints(uid, cid, 0);
  assert.equal(zero.ok, false, 'صفرٌ ليس صرفًا');

  const neg = await db.redeemLoyaltyPoints(uid, cid, -5);
  assert.equal(neg.ok, false, 'ولا سالبٌ يزيد الرصيد');
  const after = await db.getLoyalty(uid, cid);
  assert.equal(+after.points, 60);

  await db.raw(`DELETE FROM loyalty_points WHERE user_id = '${uid}'`);
  await db.raw(`DELETE FROM customers WHERE id = '${cid}'`);
});

test('الصرفُ لزبونٍ بلا رصيدٍ يُرفَض ولا ينفجر', { skip }, async () => {
  const { db } = require('../database');
  const uid = await testUser(db, 'loyalty4@test.ma');
  const r = await db.redeemLoyaltyPoints(uid, `nobody-${Date.now()}`, 10);
  assert.equal(r.ok, false);
  assert.equal(r.points, 0);
});

test('القائمةُ تحمل اسمَ الزبون لا مُعرِّفَه وحدَه', { skip }, async () => {
  const { db } = require('../database');
  const uid = await testUser(db, 'loyalty2@test.ma');
  await db.raw(`DELETE FROM loyalty_points WHERE user_id = '${uid}'`);
  const c = await db.createCustomer({ userId: uid, name: 'زبونُ اختبار', phone: `06${Date.now() % 100000000}` });
  await db.addLoyaltyPoints(uid, c.id, 250);

  const rows = await db.getLoyaltyAll(uid);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].customerName, 'زبونُ اختبار', 'رقمٌ بجانب مُعرِّفٍ لا يعرفه أحدٌ ليس معلومة');
  assert.equal(rows[0].points, 25);
  assert.equal(rows[0].tier, 'silver');
  assert.ok(!('total_earned' in rows[0]), 'لا أسماءَ أعمدةٍ خامٍ في ردٍّ للواجهة');

  await db.raw(`DELETE FROM loyalty_points WHERE user_id = '${uid}'`);
  await db.raw(`DELETE FROM customers WHERE user_id = '${uid}'`);
});

test('العتباتُ تُصعّد المستوى — والمستوى يُشتقّ ولا يُخزَّن يدويًّا', { skip }, async () => {
  const { db } = require('../database');
  const uid = await testUser(db, 'loyalty3@test.ma');
  const cid = (await db.createCustomer({ userId: uid, name: 'زبون٣', phone: `063${Date.now() % 10000000}` })).id;
  await db.addLoyaltyPoints(uid, cid, 25000);                    // ٢٥٠٠ نقطة
  assert.equal((await db.getLoyalty(uid, cid)).tier, 'gold');
  await db.addLoyaltyPoints(uid, cid, 30000);                    // +٣٠٠٠ ⇒ ٥٥٠٠
  assert.equal((await db.getLoyalty(uid, cid)).tier, 'diamond');
  await db.raw(`DELETE FROM loyalty_points WHERE user_id = '${uid}'`);
});
