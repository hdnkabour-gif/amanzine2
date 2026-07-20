import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';

const LEARN_KEY = 'amanzine_learned';

// المرحلة ب: إغلاق حلقة التعلّم — المعرفة المعتمَدة بشريًّا تُطبَّق في understand().
test('applied memory: unknown becomes understood after human approval', () => {
  localStorage.removeItem(LEARN_KEY);
  const before = understand('زقززق فريدة');
  assert.equal(!before.problem && !before.profession, true, 'مجهول قبل الاعتماد');

  // ما يكتبه validateCandidate عند اعتماد الإنسان (البوّابة البشريّة).
  localStorage.setItem(LEARN_KEY, JSON.stringify({ 'زقززق': 'سبّاك' }));

  const after = understand('زقززق فريدة');
  assert.equal(after.profession?.label, 'سبّاك', 'طُبِّقت المعرفة المعتمَدة');
  assert.ok(after.confidence >= 0.85, 'ثقة مرتفعة (الإنسان أكّد)');
  assert.deepEqual(after.learned, { phrase: 'زقززق', concept: 'سبّاك' });
  assert.ok(after.reasoning.some(r => r.includes('معتمَدة')), 'يظهر سبب المعرفة المعتمَدة');

  localStorage.removeItem(LEARN_KEY);
});

// القانون #3: لا تعديل ذاتيّ — بلا اعتماد، لا تغيير في الفهم.
test('no approval ⇒ no applied memory (Law #3)', () => {
  localStorage.removeItem(LEARN_KEY);
  const u = understand('زقززق فريدة');
  assert.equal(!u.problem && !u.profession, true);
  assert.equal(u.learned, undefined);
});
