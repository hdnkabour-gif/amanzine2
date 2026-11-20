'use strict';
// ============================================================
// Issue #25 (P0): order approval must never sell stock that does not exist,
// never deduct twice, and a cancellation must give back what was deducted —
// exactly once. Reproduced first on main 4ff08a99 (NEXUS PR #23 diagnostics).
//
//   A1  approve qty 3 with stock 2            ⇒ 409, stock unchanged
//   A2  approve the same order twice          ⇒ 2nd 409, stock deducted once
//   A3  reject after approve                  ⇒ stock restored once; reject again ⇒ 409
//   A4  approve with stock 0                  ⇒ 409
//   A5  two concurrent approvals, last unit   ⇒ exactly one 200, never negative (several rounds)
//   A6  multi-line order, one line short      ⇒ 409, NO line deducted (all-or-nothing)
//   A7  reject a pending order                ⇒ cancelled, stock untouched
//   A8  cancel after shipped                  ⇒ no automatic restock (needs a recorded return)
//   A9  another merchant cannot approve       ⇒ 404, stock untouched
//
// REAL_POSTGRESQL, synthetic data only. No carrier, payment or message is sent:
// orders carry no delivery provider and the merchant has no provider configured.
//   DATABASE_URL=… PGSSLMODE=disable node --test server/test/order-stock-integrity.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-stock-integrity-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'no DATABASE_URL' }, fn);

const express = require('express');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '', OTHER_TOKEN = '', USER_ID = '', OTHER_ID = '';

const call = async (method, path, body, token = TOKEN) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const product = async (stock, name = 'TEST T-shirt') =>
  db.createProduct({ userId: USER_ID, name, price: 129.9, cost: 60, stock, status: 'published' });
const stockOf = async (id) => (await pool.query('SELECT stock FROM products WHERE id=$1', [id])).rows[0].stock;
const order = async (lines) => (await call('POST', '/api/orders', {
  customerName: 'TEST Client', customerPhone: '0600000001', city: 'TEST', address: 'TEST',
  total: lines.reduce((s, l) => s + 129.9 * l.qty, 0),
  items: lines.map(l => ({ productId: l.p.id, productName: l.p.name, quantity: l.qty, price: 129.9 })),
})).body;
const approve = (o, token) => call('PUT', `/api/orders/${o.id}/approve`, {}, token);
const reject = (o) => call('PUT', `/api/orders/${o.id}/reject`, { reason: 'TEST' });

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const mk = async (email) => await db.getUserByEmail(email)
    || await db.createUser({ name: 'STOCK', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  const u = await mk('stock-a@test.ma');
  const v = await mk('stock-b@test.ma');
  USER_ID = u.id; OTHER_ID = v.id;
  const sign = (x, e) => require('jsonwebtoken').sign({ id: x, email: e, role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  TOKEN = sign(u.id, 'stock-a@test.ma');
  OTHER_TOKEN = sign(v.id, 'stock-b@test.ma');
  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../routes/orders'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

test('A1: approving more than the stock is refused with 409 and stock is unchanged', async () => {
  const p = await product(2);
  const o = await order([{ p, qty: 3 }]);
  const r = await approve(o);
  assert.equal(r.status, 409, `expected 409, got ${r.status}`);
  assert.equal(r.body.code, 'INSUFFICIENT_STOCK');
  assert.equal(await stockOf(p.id), 2);
  assert.equal((await db.getOrder(o.id)).status, 'pending');
});

test('A2: approving the same order twice deducts once; the second approval is a 409', async () => {
  const p = await product(5);
  const o = await order([{ p, qty: 2 }]);
  assert.equal((await approve(o)).status, 200);
  assert.equal(await stockOf(p.id), 3);
  const again = await approve(o);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'ORDER_NOT_PENDING');
  assert.equal(await stockOf(p.id), 3);
});

test('A3: rejecting an approved order restores stock exactly once', async () => {
  const p = await product(5);
  const o = await order([{ p, qty: 2 }]);
  await approve(o);
  assert.equal(await stockOf(p.id), 3);
  const r1 = await reject(o);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.status, 'cancelled');
  assert.equal(await stockOf(p.id), 5);
  const r2 = await reject(o);
  assert.equal(r2.status, 409, 'a second cancellation must not restock again');
  assert.equal(await stockOf(p.id), 5);
});

test('A4: approving with zero stock is refused', async () => {
  const p = await product(0);
  const o = await order([{ p, qty: 1 }]);
  const r = await approve(o);
  assert.equal(r.status, 409);
  assert.equal(await stockOf(p.id), 0);
});

test('A5: concurrent approvals for the last unit — exactly one wins, never negative (5 rounds)', async () => {
  for (let round = 0; round < 5; round++) {
    const p = await product(1);
    const o1 = await order([{ p, qty: 1 }]);
    const o2 = await order([{ p, qty: 1 }]);
    const [a, b] = await Promise.all([approve(o1), approve(o2)]);
    const ok = [a, b].filter(x => x.status === 200).length;
    const refused = [a, b].filter(x => x.status === 409).length;
    assert.equal(ok, 1, `round ${round}: ${a.status}/${b.status}`);
    assert.equal(refused, 1);
    assert.equal(await stockOf(p.id), 0);
  }
});

test('A6: multi-line order with one short line is refused as a whole (no partial deduction)', async () => {
  const p1 = await product(5, 'TEST line 1');
  const p2 = await product(1, 'TEST line 2');
  const o = await order([{ p: p1, qty: 2 }, { p: p2, qty: 2 }]);
  const r = await approve(o);
  assert.equal(r.status, 409);
  assert.equal(await stockOf(p1.id), 5, 'line 1 must not be deducted when line 2 is short');
  assert.equal(await stockOf(p2.id), 1);
});

test('A7: rejecting a pending order cancels it without touching stock', async () => {
  const p = await product(4);
  const o = await order([{ p, qty: 2 }]);
  const r = await reject(o);
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'cancelled');
  assert.equal(await stockOf(p.id), 4);
});

test('A8: cancelling after shipment does not restock automatically (a return must be recorded)', async () => {
  const p = await product(3);
  const o = await order([{ p, qty: 1 }]);
  await approve(o);
  await pool.query(`UPDATE orders SET status='shipped' WHERE id=$1`, [o.id]);
  const r = await reject(o);
  assert.equal(r.status, 200);
  assert.equal(await stockOf(p.id), 2, 'shipped goods are not back on the shelf');
});

test('A9: another merchant cannot approve the order', async () => {
  const p = await product(3);
  const o = await order([{ p, qty: 1 }]);
  const r = await approve(o, OTHER_TOKEN);
  assert.equal(r.status, 404);
  assert.equal(await stockOf(p.id), 3);
});

// ── Review round (PR #26): no bypass of the guarded transitions ─────────────
const put = (o, body, token) => call('PUT', `/api/orders/${o.id}`, body, token);
const event = (o, body) => call('POST', `/api/orders/${o.id}/events`, body);

test('A10: PUT /:id never writes a status itself: approve/cancel run the stock guards, other moves are 409', async () => {
  const p = await product(1);
  const big = await order([{ p, qty: 2 }]);
  assert.equal((await put(big, { status: 'approved' })).status, 409, 'PUT approve beyond stock');
  assert.equal((await db.getOrder(big.id)).status, 'pending');
  const o = await order([{ p, qty: 1 }]);
  for (const status of ['shipped', 'delivered', 'processing']) {
    assert.equal((await put(o, { status })).status, 409, `PUT status=${status}`);
  }
  assert.equal((await put(o, { status: 'not-a-status' })).status, 400, 'unknown status is an input error');
  assert.equal((await put(o, { status: 'approved', total: 1 })).status, 409, 'status cannot ride along other fields');
  assert.equal(await stockOf(p.id), 1);
  assert.equal((await put(o, { status: 'confirmed' })).status, 200, 'legacy alias approves through the guard');
  assert.equal(await stockOf(p.id), 0);
  assert.equal((await put(o, { status: 'approved' })).status, 409, 'no second approval/deduction');
  assert.equal((await put(o, { status: 'cancelled' })).status, 200);
  assert.equal(await stockOf(p.id), 1, 'cancel restocks exactly once');
  assert.equal((await put(o, { status: 'cancelled' })).status, 409);
  assert.equal(await stockOf(p.id), 1);
});

test('A11: after approval, items/total cannot be edited, and a cancel restocks exactly what was deducted', async () => {
  const p = await product(10);
  const o = await order([{ p, qty: 1 }]);
  await approve(o);
  assert.equal(await stockOf(p.id), 9);
  const edit = await put(o, { items: [{ productId: p.id, productName: p.name, quantity: 5, price: 129.9 }], total: 649.5 });
  assert.equal(edit.status, 409);
  // Even if the stored lines were changed by another path, the restock uses the deducted quantities.
  await pool.query(`UPDATE orders SET items = $2 WHERE id = $1`, [o.id, JSON.stringify([{ productId: p.id, quantity: 5 }])]);
  await reject(o);
  assert.equal(await stockOf(p.id), 10, 'restock must be 1 (deducted), not 5 (edited lines)');
});

test('A12: non-financial fields of an order can still be edited', async () => {
  const p = await product(2);
  const o = await order([{ p, qty: 1 }]);
  const r = await put(o, { address: 'TEST adresse corrigée', notes: 'TEST' });
  assert.equal(r.status, 200);
  assert.equal(r.body.address, 'TEST adresse corrigée');
  const items = await put(o, { items: [{ productId: p.id, productName: p.name, quantity: 2, price: 129.9 }], total: 259.8 });
  assert.equal(items.status, 200, 'a pending order (no stock committed) may still be corrected');
});

test('A13: approving/cancelling through the events route runs the same stock guards (no bare status write)', async () => {
  const p = await product(1);
  const big = await order([{ p, qty: 2 }]);
  assert.equal((await event(big, { type: 'order.confirmed', status: 'confirmed' })).status, 409, 'insufficient stock via events');
  assert.equal((await db.getOrder(big.id)).status, 'pending');
  assert.equal(await stockOf(p.id), 1);
  const o = await order([{ p, qty: 1 }]);
  assert.equal((await event(o, { type: 'order.confirmed', status: 'approved' })).status, 200);
  assert.equal(await stockOf(p.id), 0, 'approval via events deducts stock');
  assert.equal((await event(o, { type: 'order.confirmed', status: 'approved' })).status, 409, 'no second approval');
  assert.equal((await event(o, { type: 'order.cancelled', status: 'cancelled' })).status, 200);
  assert.equal(await stockOf(p.id), 1, 'cancel via events restocks exactly once');
  assert.equal((await event(o, { type: 'order.cancelled', status: 'cancelled' })).status, 409, 'no second cancel (no double restock)');
  assert.equal(await stockOf(p.id), 1);
});

test('A14: ship and deliver follow the lifecycle (no ship before approval, no deliver before shipping, no double delivery)', async () => {
  const p = await product(3);
  const o = await order([{ p, qty: 1 }]);
  assert.equal((await call('PUT', `/api/orders/${o.id}/ship`, {})).status, 409, 'ship a pending order');
  await approve(o);
  assert.equal((await call('PUT', `/api/orders/${o.id}/deliver`, {})).status, 409, 'deliver before shipping');
  assert.equal((await call('PUT', `/api/orders/${o.id}/ship`, { trackingNumber: 'TEST-TRK-1' })).status, 200);
  assert.equal((await call('PUT', `/api/orders/${o.id}/deliver`, {})).status, 200);
  assert.equal((await call('PUT', `/api/orders/${o.id}/deliver`, {})).status, 409, 'deliver twice');
  assert.equal(await stockOf(p.id), 2);
});

test('A15: a service (offer_type) with no stock can be approved and is never decremented', async () => {
  const s = await db.createProduct({ userId: USER_ID, name: 'TEST retouche', price: 50, stock: 0, status: 'published', type: 'service' });
  const o = await order([{ p: s, qty: 2 }]);
  const r = await approve(o);
  assert.equal(r.status, 200, `got ${r.status} ${JSON.stringify(r.body)}`);
  assert.equal(await stockOf(s.id), 0);
});

test('A16: a line pointing to a missing or foreign product fails closed (409), nothing deducted', async () => {
  const mine = await product(5, 'TEST mine');
  const foreign = await db.createProduct({ userId: OTHER_ID, name: 'TEST foreign', price: 10, stock: 5, status: 'published' });
  const o = await order([{ p: mine, qty: 1 }, { p: foreign, qty: 1 }]);
  const r = await approve(o);
  assert.equal(r.status, 409);
  assert.equal(r.body.code, 'PRODUCT_NOT_FOUND');
  assert.equal(await stockOf(mine.id), 5);
  assert.equal(await stockOf(foreign.id), 5);
});
