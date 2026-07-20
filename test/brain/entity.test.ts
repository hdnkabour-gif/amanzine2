import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveEntity } from '../../src/lib/entity';

const mk = (intent: string) => ({ at: Date.now(), raw: 'x', intent, what: '', dest: '', via: 'type' as const });

// «Entity لا Role»: النوع يُستنتَج من السلوك، لا من سؤال عند التسجيل.
test('new account with no behavior → type "new"', () => {
  const e = deriveEntity([]);
  assert.equal(e.type, 'new');
  assert.equal(e.capabilities.canSell, false);
});

test('selling intent ⇒ seller (derived, not asked)', () => {
  const e = deriveEntity([mk('sell'), mk('sell'), mk('find_pro')]);
  assert.equal(e.type, 'seller');
  assert.equal(e.capabilities.canSell, true);
  assert.ok(e.reason.includes('السلوك'));
});

test('service intent ⇒ provider', () => {
  const e = deriveEntity([mk('create_service')]);
  assert.equal(e.type, 'provider');
  assert.equal(e.capabilities.canServe, true);
});

test('only requests ⇒ consumer', () => {
  const e = deriveEntity([mk('find_pro'), mk('buy')]);
  assert.equal(e.type, 'consumer');
  assert.equal(e.capabilities.isConsumer, true);
  assert.equal(e.capabilities.canSell, false);
});
