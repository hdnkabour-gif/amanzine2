'use strict';
// Password-recovery security: actual Express HTTP + disposable PostgreSQL.
// No email, external provider, real user or production account is touched.
process.env.JWT_SECRET ||= 'test-security-reset-purpose-0123456789abcdef';
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const pool = require('../db');
const verify = require('../lib/verify');

const SKIP = !process.env.DATABASE_URL;
const test = (name, fn) => rawTest(name, { skip: SKIP && 'لا DATABASE_URL' }, fn);
const EMAIL = 'qa-reset-' + crypto.randomBytes(7).toString('hex') + '@example.invalid';
const OTHER = 'qa-reset-other-' + crypto.randomBytes(7).toString('hex') + '@example.invalid';
const ORIGINAL = 'QARandomOriginal!123';
let USER_ID, OTHER_ID, server, base;
const req = async (email, code, newPassword = 'QASecureNext!2026') => {
  const response = await fetch(base + '/api/auth/reset-password', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};
const issue = async (purpose, code, email = EMAIL, userId = USER_ID, ttlMs = 300000) => {
  await db.invalidateVerifications(email, purpose);
  await db.createVerification({
    identifier: email, purpose, userId, channel: 'email', code,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  });
};

before(async () => {
  if (SKIP) return;
  const hash = await bcrypt.hash(ORIGINAL, 4);
  USER_ID = (await db.createUser({ name: 'QA reset A', email: EMAIL,
    password: hash, role: 'user' })).id;
  OTHER_ID = (await db.createUser({ name: 'QA reset B', email: OTHER,
    password: hash, role: 'user' })).id;
  const app = express();
  app.use(express.json({ limit: '20kb' }));
  app.use('/api/auth', require('../routes/auth'));
  await new Promise(resolve => { server = app.listen(0, resolve); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  if (SKIP) return;
  await new Promise(resolve => server?.close(resolve));
  await pool.query('DELETE FROM otp_tokens WHERE identifier IN ($1, $2)', [EMAIL, OTHER]);
  await pool.end();
});

test('OTP for login is NOT valid to reset a password, and is not consumed by wrong purpose', async () => {
  await issue('login', '111222');
  const out = await req(EMAIL, '111222');
  assert.equal(out.status, 400, 'login OTP was accepted for password reset');
  assert.equal(await bcrypt.compare(ORIGINAL, (await db.getUserByEmail(EMAIL)).password), true);
  assert.equal((await verify.check({ identifier: EMAIL, purpose: 'login', code: '111222' })).valid,
    true, 'wrong purpose invalidated original login code');
});

test('different account must never use another account reset code', async () => {
  await issue('password_reset', '345678');
  const out = await req(OTHER, '345678');
  assert.equal(out.status, 400);
  assert.equal(await bcrypt.compare(ORIGINAL, (await db.getUserByEmail(OTHER)).password), true);
});

test('five incorrect reset guesses lock the challenge and reject the correct code', async () => {
  await issue('password_reset', '445566');
  for (let i = 0; i < 5; i++) {
    const out = await req(EMAIL, '000000');
    assert.equal(out.status, 400, 'wrong code attempt ' + (i + 1) + ' was accepted');
  }
  const row = await pool.query(
    'SELECT used, attempts FROM otp_tokens WHERE identifier=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1',
    [EMAIL, 'password_reset']);
  assert.equal(row.rows[0]?.used, true, 'challenge remained usable after five guesses');
  assert.ok(Number(row.rows[0]?.attempts) >= 5);
  assert.equal((await req(EMAIL, '445566')).status, 400, 'locked-out code was still accepted');
});

test('reissuing a reset code permits exactly one password change', async () => {
  await issue('password_reset', '556677');
  const out = await req(EMAIL, '556677');
  assert.equal(out.status, 200, JSON.stringify(out.body));
  assert.equal(out.body.success, true);
  const updated = await db.getUserByEmail(EMAIL);
  assert.equal(await bcrypt.compare('QASecureNext!2026', updated.password), true);
  assert.equal(await bcrypt.compare(ORIGINAL, updated.password), false);
  assert.equal((await req(EMAIL, '556677')).status, 400, 'consumed reset OTP could be replayed');
});

test('expired code is rejected before changing password', async () => {
  await issue('password_reset', '667788', EMAIL, USER_ID, -2000);
  const oldHash = (await db.getUserByEmail(EMAIL)).password;
  const out = await req(EMAIL, '667788', 'QAExpiredShouldNotWin!');
  assert.equal(out.status, 400);
  assert.equal((await db.getUserByEmail(EMAIL)).password, oldHash);
});

test('two concurrent reset HTTP calls on same OTP can succeed at most once', async () => {
  await issue('password_reset', '778899');
  const requests = await Promise.all([
    req(EMAIL, '778899', 'QARaceA!2026'),
    req(EMAIL, '778899', 'QARaceB!2026'),
  ]);
  const accepted = requests.filter(r => r.status === 200).length;
  assert.equal(accepted, 1, 'two parallel requests used the same OTP: ' + requests.map(r => r.status));
  assert.equal(requests.filter(r => r.status === 400).length, 1);
  const password = (await db.getUserByEmail(EMAIL)).password;
  assert.ok(await bcrypt.compare('QARaceA!2026', password) ||
    await bcrypt.compare('QARaceB!2026', password));
});
