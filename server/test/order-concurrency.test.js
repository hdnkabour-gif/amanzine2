'use strict';
// ============================================================
// PR #26 independent review (Astra) — two P1 races, reproduced on REAL PostgreSQL with
// independent connections and deterministic barriers (no DB double, no sleeps-as-luck):
//
//   C1  edit lines/total WHILE an approval is in flight      ⇒ the edit sees the approval (409);
//                                                               approved total/items = what was stocked
//   C2  edit queued BEFORE an approval                        ⇒ approval stocks the edited lines
//   C3  shipment event WHILE a cancellation is in flight     ⇒ no shipment survives a cancel that won;
//                                                               stock restored once
//   C4  shipment event queued BEFORE a cancellation           ⇒ shipped then cancelled: no automatic restock
//   C5  carrier/auto-shipment status write after a cancel     ⇒ terminal state kept (never `processing`)
//   C6  pre-migration approved/shipped orders (no snapshot)   ⇒ migration invents no quantities; cancel
//                                                               never restocks unknown historical stock
//
// Barrier: a third connection holds a row lock; we wait until PostgreSQL itself reports the
// expected number of backends queued behind it (pg_blocking_pids), then release it.
// Every case also checks: no 5xx (so no deadlock surfaced), status, stock, the stock
// snapshot (stock_committed_items) and the event ledger together.
//
// Synthetic data only; orders have no delivery provider, nothing is sent anywhere.
//   DATABASE_URL=… PGSSLMODE=disable node --test server/test/order-concurrency.test.js
// ============================================================
const { test: rawTest, before, after } = require('node:test');
const assert = require('node:assert/strict');

const SKIP = !process.env.DATABASE_URL;
process.env.JWT_SECRET ||= 'test-secret-for-order-concurrency-0123456789';
const test = (name, fn) => rawTest(name, { skip: SKIP && 'no DATABASE_URL', timeout: 30000 }, fn);

const express = require('express');
const { Client } = require('pg');
const { db } = require('../database');
const pool = require('../db');

let server, base, TOKEN = '', USER_ID = '';

const call = async (method, path, body) => {
  const r = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const PRICE = 100;
const product = (stock) => db.createProduct({ userId: USER_ID, name: 'TEST conc', price: PRICE, cost: 50, stock, status: 'published' });
const order = async (p, qty) => (await call('POST', '/api/orders', {
  customerName: 'TEST Client', customerPhone: '0600000002', city: 'TEST', address: 'TEST',
  total: PRICE * qty, items: [{ productId: p.id, productName: p.name, quantity: qty, price: PRICE }],
})).body;
const row = async (id) => (await pool.query(
  'SELECT status, total, items, stock_committed_at, stock_committed_items, stock_released_at FROM orders WHERE id=$1', [id])).rows[0];
const stockOf = async (id) => (await pool.query('SELECT stock FROM products WHERE id=$1', [id])).rows[0].stock;
const shipmentEvents = async (id) => +(await pool.query(
  `SELECT count(*) FROM order_events WHERE order_id=$1 AND type='shipment.created'`, [id])).rows[0].count;
const qtyOf = (items) => (Array.isArray(items) ? items : []).reduce((s, it) => s + (+it.quantity || 0), 0);

/** A third, independent connection that holds a row lock until released. */
async function holdLock(sql, params) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('BEGIN');
  await c.query(sql, params);
  return { pid: (await c.query('SELECT pg_backend_pid() AS p')).rows[0].p,
           release: async () => { await c.query('COMMIT'); await c.end(); } };
}
/**
 * Wait until PostgreSQL reports `n` backends blocked, directly or transitively, behind the
 * barrier connection `L` (pg_blocking_pids). Other test files running in parallel on the same
 * database cannot satisfy this barrier by accident.
 */
async function waitBlocked(L, n) {
  const t0 = Date.now();
  for (;;) {
    const { rows } = await pool.query(
      `SELECT pid, pg_blocking_pids(pid) AS by FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock'`);
    const behind = new Set([L.pid]);
    for (let grew = true; grew;) {
      grew = false;
      for (const r of rows) if (!behind.has(r.pid) && r.by.some(b => behind.has(b))) { behind.add(r.pid); grew = true; }
    }
    if (behind.size - 1 >= n) return;
    if (Date.now() - t0 > 10000) throw new Error(`barrier: expected ${n} backends behind the lock, saw ${behind.size - 1}`);
    await new Promise(res => setTimeout(res, 20));
  }
}
const no5xx = (...rs) => rs.forEach(r => assert.ok(r.status < 500, `server error ${r.status} ${JSON.stringify(r.body)}`));

before(async () => {
  if (SKIP) return;
  const bcrypt = require('bcryptjs');
  const email = 'order-conc@test.ma';
  const u = await db.getUserByEmail(email)
    || await db.createUser({ name: 'CONC', email, password: bcrypt.hashSync('x', 4), role: 'user' });
  USER_ID = u.id;
  TOKEN = require('jsonwebtoken').sign({ id: u.id, email, role: 'user' },
    require('../lib/config').JWT_SECRET, { expiresIn: '1h' });
  const app = express();
  app.use(express.json());
  app.use('/api/orders', require('../routes/orders'));
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (SKIP) return; server?.close(); await pool.end?.(); });

test('C1: an edit of lines/total racing an in-flight approval cannot change what was approved', async () => {
  const p = await product(5);
  const o = await order(p, 1);
  // Approval takes the order lock, then blocks on the product lock held here (mid-transaction).
  const L = await holdLock('SELECT id FROM products WHERE id = $1 FOR UPDATE', [p.id]);
  const approving = call('PUT', `/api/orders/${o.id}/approve`, {});
  await waitBlocked(L, 1);
  const editing = call('PUT', `/api/orders/${o.id}`, {
    items: [{ productId: p.id, productName: p.name, quantity: 3, price: PRICE }], total: 999 });
  await waitBlocked(L, 2);
  await L.release();
  const [a, e] = await Promise.all([approving, editing]);
  no5xx(a, e);
  assert.equal(a.status, 200, 'approval wins (it held the order first)');
  assert.equal(e.status, 409, `the edit must see the approval, got ${e.status}`);
  const r = await row(o.id);
  assert.equal(r.status, 'approved');
  assert.equal(+r.total, PRICE * 1, 'approved total is the stocked one, not 999');
  assert.equal(qtyOf(r.items), 1);
  assert.deepEqual(r.stock_committed_items, { [p.id]: 1 });
  assert.equal(await stockOf(p.id), 4);
});

test('C2: an edit queued before the approval is what gets approved and stocked', async () => {
  const p = await product(5);
  const o = await order(p, 1);
  const L = await holdLock('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [o.id]);
  const editing = call('PUT', `/api/orders/${o.id}`, {
    items: [{ productId: p.id, productName: p.name, quantity: 2, price: PRICE }], total: PRICE * 2 });
  await waitBlocked(L, 1);
  const approving = call('PUT', `/api/orders/${o.id}/approve`, {});
  await waitBlocked(L, 2);
  await L.release();
  const [e, a] = await Promise.all([editing, approving]);
  no5xx(a, e);
  assert.equal(a.status, 200);
  const r = await row(o.id);
  // Whatever order PostgreSQL granted the lock in, lines, total, snapshot and stock agree.
  const q = qtyOf(r.items);
  assert.equal(e.status === 200 ? 2 : 1, q, `edit ${e.status} ⇒ lines`);
  assert.equal(+r.total, PRICE * q);
  assert.deepEqual(r.stock_committed_items, { [p.id]: q });
  assert.equal(await stockOf(p.id), 5 - q);
});

test('C3: a shipment event racing an in-flight cancellation never survives it', async () => {
  const p = await product(1);
  const o = await order(p, 1);
  assert.equal((await call('PUT', `/api/orders/${o.id}/approve`, {})).status, 200);
  assert.equal(await stockOf(p.id), 0);
  // Cancellation takes the order lock, then blocks on the product it restocks.
  const L = await holdLock('SELECT id FROM products WHERE id = $1 FOR UPDATE', [p.id]);
  const cancelling = call('PUT', `/api/orders/${o.id}/reject`, { reason: 'TEST' });
  await waitBlocked(L, 1);
  const shipping = call('POST', `/api/orders/${o.id}/events`, { type: 'shipment.created', status: 'shipped' });
  await waitBlocked(L, 2);
  await L.release();
  const [c, s] = await Promise.all([cancelling, shipping]);
  no5xx(c, s);
  assert.equal(c.status, 200);
  assert.ok(s.status >= 400, `shipment after cancel must be refused, got ${s.status}`);
  const r = await row(o.id);
  assert.equal(r.status, 'cancelled');
  assert.equal(await stockOf(p.id), 1, 'restocked exactly once');
  assert.ok(r.stock_released_at, 'release recorded');
  assert.equal(await shipmentEvents(o.id), 0, 'no shipment event left behind');
});

test('C4: a shipment event queued before a cancellation ⇒ shipped then cancelled, no automatic restock', async () => {
  const p = await product(1);
  const o = await order(p, 1);
  assert.equal((await call('PUT', `/api/orders/${o.id}/approve`, {})).status, 200);
  const L = await holdLock('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [o.id]);
  const shipping = call('POST', `/api/orders/${o.id}/events`, { type: 'shipment.created', status: 'shipped' });
  await waitBlocked(L, 1);
  const cancelling = call('PUT', `/api/orders/${o.id}/reject`, { reason: 'TEST' });
  await waitBlocked(L, 2);
  await L.release();
  const [s, c] = await Promise.all([shipping, cancelling]);
  no5xx(c, s);
  assert.equal(c.status, 200);
  const r = await row(o.id);
  assert.equal(r.status, 'cancelled');
  const shipped = await shipmentEvents(o.id);
  if (s.status === 200) {
    // Shipment won the lock: the goods left, so the cancel must NOT restock automatically.
    assert.equal(shipped, 1);
    assert.equal(await stockOf(p.id), 0);
    assert.equal(r.stock_released_at, null);
  } else {
    // Cancellation won: restocked once and no shipment recorded.
    assert.equal(shipped, 0);
    assert.equal(await stockOf(p.id), 1);
  }
});

test('C5: a carrier/auto-shipment status write landing after a cancellation keeps the order cancelled', async () => {
  const p = await product(2);
  const o = await order(p, 1);
  assert.equal((await call('PUT', `/api/orders/${o.id}/approve`, {})).status, 200);
  const L = await holdLock('SELECT id FROM products WHERE id = $1 FOR UPDATE', [p.id]);
  const cancelling = call('PUT', `/api/orders/${o.id}/reject`, { reason: 'TEST' });
  await waitBlocked(L, 1);
  // The generic writer used by shipmentAttempt / delivery-auto / trackingSync / webhooks.
  const carrier = db.updateOrder(o.id, { status: 'processing', deliveryStatus: 'TEST picked' });
  await waitBlocked(L, 2);
  await L.release();
  const [c] = await Promise.all([cancelling, carrier]);
  no5xx(c);
  const r = await row(o.id);
  assert.equal(r.status, 'cancelled', 'terminal state is never overwritten by a stale writer');
  assert.equal(await stockOf(p.id), 2);
});

test('C6: pre-migration approved/shipped orders keep no invented snapshot and are never auto-restocked', async () => {
  const p = await product(3);
  const legacy = [];
  for (const status of ['approved', 'shipped']) {
    const o = await order(p, 2);
    // As written by the code before #25: status moved, stock deducted, no commitment markers.
    await pool.query(`UPDATE orders SET status=$2, stock_committed_at=NULL, stock_committed_items=NULL WHERE id=$1`, [o.id, status]);
    legacy.push(o);
  }
  await pool.query('UPDATE products SET stock = 0 WHERE id = $1', [p.id]); // 2 + 2 sold, +1 lost to history: unknown
  await require('../migrate')(); // idempotent re-run on the populated database
  for (const o of legacy) {
    const r = await row(o.id);
    assert.equal(r.stock_committed_items, null, 'migration invents no historical quantities');
    assert.equal(r.stock_committed_at, null);
  }
  for (const o of legacy) assert.equal((await call('PUT', `/api/orders/${o.id}/reject`, { reason: 'TEST' })).status, 200);
  assert.equal(await stockOf(p.id), 0, 'unknown historical deductions are left for a manual review');
  for (const o of legacy) assert.equal((await row(o.id)).stock_released_at, null);
});
