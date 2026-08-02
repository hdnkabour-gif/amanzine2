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

// HU-2 — تغييرُ سلوكٍ مقصود: كان المُدخلُ غيرُ المفهوم يُرَدّ بترحيبٍ، وهو
// «ما فهمناش» بلباسٍ مهذَّب. صار يُرَدّ بسؤالٍ عن الناقص.
test('مُدخلٌ لم نفهمه → استيضاحٌ لا ترحيب', () => {
  assert.equal(decideInterface({ intent: 'unknown', confidence: 0.2 }).mode, 'clarify');
});

test('الترحيبُ لِمَن لم يكتب بعد — وحدَه', () => {
  assert.equal(decideInterface({ intent: 'unknown', confidence: 0, hasInput: false }).mode, 'welcome');
});

test('بعد استيضاحين بلا ارتفاعٍ في الفهم → إنسان', () => {
  assert.equal(decideInterface({ intent: 'unknown', confidence: 0.2, askedCount: 2 }).mode, 'escalate');
});

test('يقينٌ عالٍ بلا وجهة لا يُوصّل مباشرة (لا direct دون هدف)', () => {
  assert.notEqual(decideInterface({ intent: 'sell', confidence: 0.9 }).mode, 'direct');
});

test('قرارٌ واحدٌ فقط، ولكلّ قرارٍ سبب', () => {
  const d = decideInterface({ intent: 'buy', confidence: 0.6, url: '/market' });
  assert.ok(d.reason.length > 3);
});
