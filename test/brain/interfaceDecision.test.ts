import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideInterface } from '../../src/lib/interfaceDecision';

// Decision Layer — نطاقات الثقة → أقلّ واجهة (من مراجعة المنتج).

test('يقينٌ عالٍ + وجهة → نتيجة مباشرة (٩٥٪: «بغيت سباك»)', () => {
  assert.equal(decideInterface({ intent: 'find_pro', confidence: 0.95, url: '/market' }).mode, 'direct');
});

test('يوجد سؤالٌ موجّه → guided (٧٠٪: «عندي مشكل فالدار»)', () => {
  assert.equal(decideInterface({ intent: 'find_pro', confidence: 0.5, steps: [{}] }).mode, 'guided');
});

test('يقينٌ متوسّط بلا خطوات → confirm («فهمت أنّك… صح؟»)', () => {
  assert.equal(decideInterface({ intent: 'sell', confidence: 0.6, page: 'publish' }).mode, 'confirm');
});

test('نيّةٌ غامضة → welcome (١٥٪: «السلام عليكم»)', () => {
  assert.equal(decideInterface({ intent: 'unknown', confidence: 0.2 }).mode, 'welcome');
});

test('يقينٌ عالٍ بلا وجهة لا يُوصّل مباشرة (لا direct دون هدف)', () => {
  assert.notEqual(decideInterface({ intent: 'sell', confidence: 0.9 }).mode, 'direct');
});

test('قرارٌ واحدٌ فقط، ولكلّ قرارٍ سبب', () => {
  const d = decideInterface({ intent: 'buy', confidence: 0.6, url: '/market' });
  assert.ok(d.reason.length > 3);
});
