import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';

// العقل يفهم من العرَض (دارجة) دون ذكر اسم المهنة: عرَض → مشكلة → مهنة.
test('symptom → problem → profession: «الما كيهرب» ⇒ سبّاك', () => {
  const u = understand('الما كيهرب فالكوزينة');
  assert.equal(u.problem?.id, 'water_leak', 'المشكلة = تسرّب ماء');
  assert.equal(u.profession?.id, 'plumber', 'المهنة الحالّة = سبّاك');
  assert.ok(u.confidence > 0.3);
  assert.ok(u.reasoning.length > 0, 'يوجد استدلال قابل للتفسير');
});

test('electrical symptom ⇒ electrician', () => {
  const u = understand('الضو مقطوع فالدار');
  assert.equal(u.profession?.id, 'electrician');
});

test('network symptom ⇒ it_tech («الويفي ماخدامش»)', () => {
  const u = understand('الويفي ماخدامش فالدار');
  assert.equal(u.problem?.id, 'network_down', 'المشكلة = عطل شبكة');
  assert.equal(u.profession?.id, 'it_tech', 'المهنة = تقني معلوماتيّة');
});

test('server/network variants ⇒ it_tech', () => {
  assert.equal(understand('عندي مشكل فالشبكة').profession?.id, 'it_tech');
  assert.equal(understand('السيرفر خربان').profession?.id, 'it_tech');
});

test('enriched computer symptom ⇒ it_tech («PC ما خدامش»)', () => {
  assert.equal(understand('pc ما خدامش').problem?.id, 'computer_broken');
  assert.equal(understand('الكمبيوتر بطّيء').profession?.id, 'it_tech');
});

test('urgent context is detected', () => {
  const u = understand('الما كيهرب دابا بزربة');
  assert.equal(u.context.urgent, true);
});

test('city is extracted from Darija text', () => {
  const u = understand('الما كيهرب فالدار البيضاء');
  assert.equal(u.city, 'الدار البيضاء');
});

test('gibberish stays unknown (no false profession)', () => {
  const u = understand('زقززق فريدة غامضة تماما');
  assert.equal(!u.problem && !u.profession, true);
  assert.ok(!u.learned);
});
