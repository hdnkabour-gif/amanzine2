'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decide, isTransient, nextDelayMs } = require('../lib/retryQueue');

// ============================================================
// إعادةُ المحاولة — عطبٌ عابرٌ لا يُضيع شحنة، وعطبٌ دائمٌ لا يُغرق السجلّ.
// ============================================================

test('العابرُ يُعرَف والدائمُ يُعرَف', () => {
  for (const e of ['Timeout', 'ECONNRESET', 'fetch failed', 'HTTP 503', 'HTTP 429', 'socket hang up']) {
    assert.ok(isTransient(e), `${e} عابر`);
  }
  for (const e of ['Unauthorized', 'HTTP 401', 'city not supported', '"cost" is required', 'Invalid API key']) {
    assert.ok(!isTransient(e), `${e} دائم`);
  }
});

test('الفشلُ الدائم لا يُعاد مهما بقي من محاولات', () => {
  const d = decide({ error: 'Invalid API key', attempts: 0, maxAttempts: 5 });
  assert.equal(d.retry, false);
  assert.match(d.reason, /دائم/);
});

test('العابرُ يُعاد حتى استنفاد المحاولات', () => {
  assert.equal(decide({ error: 'Timeout', attempts: 0, maxAttempts: 3 }).retry, true);
  assert.equal(decide({ error: 'Timeout', attempts: 2, maxAttempts: 3 }).retry, true);
  const last = decide({ error: 'Timeout', attempts: 3, maxAttempts: 3 });
  assert.equal(last.retry, false);
  assert.match(last.reason, /استُنفدت/);
});

test('التباعدُ أُسّيٌّ ومسقوفٌ عند ساعة', () => {
  assert.ok(nextDelayMs(1) < nextDelayMs(2));
  assert.ok(nextDelayMs(2) < nextDelayMs(3));
  // بلا سقفٍ تصير المحاولةُ العاشرة بعد أكثر من يوم
  assert.equal(nextDelayMs(100), 60 * 60 * 1000);
});

test('الإعادةُ تحمل موعدَها', () => {
  const d = decide({ error: 'ETIMEDOUT', attempts: 0 });
  assert.ok(d.nextAttemptAt);
  assert.ok(new Date(d.nextAttemptAt).getTime() > Date.now());
});
