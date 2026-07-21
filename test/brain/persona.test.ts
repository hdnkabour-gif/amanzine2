import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personaGreeting, personaWelcome, PERSONA } from '../../src/lib/persona';

// شخصيّة AMANZINE — صوتٌ واحدٌ ثابت (مرشد، لا محرّك بحث).

test('التحيّة حسب الوقت', () => {
  assert.ok(personaGreeting(9).startsWith('صباح الخير'));
  assert.ok(personaGreeting(14).startsWith('مرحبا'));
  assert.ok(personaGreeting(20).startsWith('مساء الخير'));
});

test('التحيّة تستعمل الاسم الأوّل فقط', () => {
  assert.ok(personaGreeting(9, 'يوسف بناني').includes('يوسف'));
  assert.ok(!personaGreeting(9, 'يوسف بناني').includes('بناني'));
});

test('الاستقبال يعرّف AMANZINE كمرشد ويطمئن المستخدم (أوّل مرّة)', () => {
  const w = personaWelcome();
  assert.ok(w.includes(PERSONA.name), 'يذكر الاسم');
  assert.ok(w.includes(PERSONA.role), 'يعرّف نفسه كمرشد');
  assert.ok(w.includes('كتب بالدارجة'), 'يطمئن: غير كتب ونفهمك');
});

test('الشخصيّة تتطوّر: العائد يُستقبَل بألفةٍ أخفّ (لا إعادة تعريف)', () => {
  const w = personaWelcome('', true);
  assert.ok(w.includes('بعودتك'), 'يرحّب بالعودة');
  assert.ok(!w.includes(PERSONA.reassure), 'لا يُعيد شرح نفسه على من يعرفه');
});
