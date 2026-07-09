'use strict';
// اختبارات محرّكات الـ Super App (نقيّة، بلا قاعدة بيانات)
const test = require('node:test');
const assert = require('node:assert');

const ranking = require('../lib/engines/ranking');
const presentation = require('../lib/engines/presentation');
const graph = require('../lib/engines/graph');
const status = require('../lib/engines/status');
const bus = require('../lib/engines/eventbus');
const activity = require('../lib/engines/activity');
const analytics = require('../lib/engines/analytics');
const searchEngine = require('../lib/engines/search');
const ai = require('../lib/engines/ai');

// ── Ranking ──────────────────────────────────────────────────
test('ranking: near+verified+open ranks above far+closed', () => {
  const A = { id: 'A', rating: { avg: 4.8, count: 60 }, verified: true, distanceKm: 1, status: { code: 'open' }, capabilities: { booking: true } };
  const B = { id: 'B', rating: { avg: 3, count: 2 }, verified: false, distanceKm: 20, status: { code: 'closed' }, capabilities: {} };
  const [first] = ranking.rank([B, A]);
  assert.strictEqual(first.id, 'A');
  assert.ok(first._score > 0.5);
});

// ── Presentation (capabilities drive order, not type) ────────
test('presentation: per-kind section order', () => {
  const enabled = ['about', 'products', 'services', 'booking', 'reviews', 'contact'];
  assert.deepStrictEqual(presentation.orderSections('store', enabled)[1], 'products');
  const doc = presentation.orderSections('doctor', ['about', 'appointments', 'booking', 'reviews']);
  assert.strictEqual(doc[1], 'appointments');
});

// ── Weighted Graph ───────────────────────────────────────────
test('graph: weighted related categories sorted by strength', () => {
  const w = graph.relatedCategoriesWeighted(['كاميرات']);
  assert.strictEqual(w[0].category, 'أنظمة إنذار');
  assert.ok(w[0].weight >= w[1].weight);
});

// ── Live Status ──────────────────────────────────────────────
test('status: hours + override', () => {
  assert.strictEqual(status.computeStatus({ workStart: '00:00', workEnd: '23:59' }).code, 'open');
  assert.strictEqual(status.computeStatus({ override: 'vacation' }).code, 'closed');
  assert.strictEqual(status.computeStatus({}), null);
});
test('status: smart availability today/tomorrow', () => {
  const today = new Date().getDay();
  assert.strictEqual(status.smartAvailability([{ weekday: today, startTime: '00:00', endTime: '23:59' }]).code, 'today');
  assert.strictEqual(status.smartAvailability([{ weekday: (today + 1) % 7, startTime: '09:00', endTime: '17:00' }]).code, 'tomorrow');
});

// ── Event Bus + Activity + Analytics ─────────────────────────
test('eventbus: pattern subscribe + publish', () => {
  const got = [];
  const off = bus.subscribe('demo.*', e => got.push(e.type));
  bus.publish({ type: 'demo.created', category: 'demo', createdAt: new Date().toISOString() });
  bus.publish({ type: 'other.created', category: 'other', createdAt: new Date().toISOString() });
  off();
  assert.deepStrictEqual(got, ['demo.created']);
});
test('activity: emit carries version + hides private from public feed', () => {
  const ev = activity.emit({ type: 'offer.created', category: 'offer', businessId: 'store:t', city: 'tst-city' });
  assert.strictEqual(ev.version, 1);
  activity.emit({ type: 'booking.created', category: 'booking', visibility: 'private', businessId: 'p:t' });
  const pub = activity.list({ limit: 50 });
  assert.ok(pub.every(e => e.visibility === 'public'));
});
test('analytics: per-business aggregation', () => {
  analytics.init();
  activity.emit({ type: 'business.viewed', category: 'business', visibility: 'private', businessId: 'store:zz' });
  activity.emit({ type: 'business.viewed', category: 'business', visibility: 'private', businessId: 'store:zz' });
  activity.emit({ type: 'business.clicked', category: 'business', visibility: 'private', businessId: 'store:zz' });
  const f = analytics.forBusiness('store:zz');
  assert.strictEqual(f.views, 2);
  assert.strictEqual(f.clicks, 1);
  assert.strictEqual(f.ctr, 0.5);
});

// ── Search intent + AI parsing ───────────────────────────────
test('search: intent detection', () => {
  assert.strictEqual(searchEngine.detectIntent('سباك').kind, 'service');
  assert.strictEqual(searchEngine.detectIntent('سامسونج').kind, 'general');
});
test('ai: NL → structured (problem hints)', () => {
  const a = ai.ruleAdapter('أريد من يصلح باباً خشبياً اليوم في الدار البيضاء');
  assert.strictEqual(a.understood.category, 'نجار');
  assert.strictEqual(a.understood.city, 'الدار البيضاء');
  assert.strictEqual(a.understood.availableToday, true);
  const b = ai.ruleAdapter('عندي صنبور كيقطر');
  assert.strictEqual(b.understood.category, 'سباك');
});
