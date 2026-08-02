'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const ce = require('../lib/cityEngine');

// ============================================================
// محرّكُ المدن — الطبقةُ التي تجعل تبديلَ شركةِ التوصيل بلا أثرٍ على التاجر.
//   يكتب «كازا» فتصل الشركةَ بمُعرِّفها هي. وهذه الاختبارات تحرس الطرفين:
//   الفهمَ (نصٌّ حرّ ⇒ مدينةٌ معياريّة) والمطابقةَ (مدنُ شركةٍ ⇒ خريطة).
// ============================================================

test('المعجم مُولَّدٌ وغيرُ فارغ', () => {
  assert.ok(ce.size >= 40, `عدد المدن ${ce.size} — شغّل npm run gen:cities`);
});

test('العربيّةُ تصل مهما اختلف الرسم', () => {
  for (const t of ['الدار البيضاء', 'دار البيضاء', 'دارلبيضا', 'كازا', 'البيضاء']) {
    assert.equal(ce.resolve(t)?.name, 'الدار البيضاء', `فشل: ${t}`);
  }
});

test('اللاتينيّةُ تصل مهما اختلفت الحالةُ واللهجات', () => {
  for (const t of ['casa', 'Casablanca', 'CASABLANCA', 'casablanca']) {
    assert.equal(ce.resolve(t)?.name, 'الدار البيضاء', `فشل: ${t}`);
  }
  assert.equal(ce.resolve('Tanger')?.name, 'طنجة');
  assert.equal(ce.resolve('tanja')?.name, 'طنجة');
  // اللهجاتُ الفرنسيّة تُطبَّع: Kénitra ⇒ kenitra
  assert.equal(ce.resolve('Kénitra')?.name, 'القنيطرة');
});

test('المجهولُ يُعيد null ولا يُخمِّن', () => {
  assert.equal(ce.resolve('مدينةٌ لا وجود لها'), null);
  assert.equal(ce.resolve('Zzzz'), null);
  assert.equal(ce.resolve(''), null);
  assert.equal(ce.resolve(null), null);
  assert.equal(ce.resolve('   '), null);
});

test('المُعرِّفُ ثابتٌ لا يتبع الترتيب', () => {
  // مشتقٌّ من الاسم لا من الفهرس ⇒ إضافةُ مدينةٍ في المنتصف لا تُزحزح الباقي،
  // وإلّا أشارت خرائطُ الشحنات القديمة إلى مدنٍ أخرى بعد أيّ تحديث.
  const a = ce.resolve('casa').id;
  const b = ce.resolve('الدار البيضاء').id;
  assert.equal(a, b);
  assert.equal(ce.byId(a)?.name, 'الدار البيضاء');
});

test('matchAll يفصل المُطابَقَ عن المجهول ولا يبتلع الثاني', () => {
  const { matched, unmatched } = ce.matchAll([
    { id: '18', name: 'Casablanca' },
    { id: '7',  name: 'Rabat' },
    { id: '99', name: 'Zzz Unknown' },
  ]);
  assert.equal(matched.length, 2);
  assert.equal(unmatched.length, 1);
  const casa = matched.find(m => m.cityName === 'الدار البيضاء');
  assert.equal(casa.externalId, '18');
  // المجهولُ يُعاد ليراه التاجر بدل أن يكتشفه عند أوّل شحنةٍ فاشلة.
  assert.equal(unmatched[0].externalName, 'Zzz Unknown');
});

test('matchAll يحتمل مدخلًا فارغًا أو معطوبًا', () => {
  assert.deepEqual(ce.matchAll(null), { matched: [], unmatched: [] });
  assert.deepEqual(ce.matchAll([]), { matched: [], unmatched: [] });
});

test('المُعرِّفاتُ فريدةٌ عبر كلّ المدن', () => {
  const ids = ce.all().map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'مُعرِّفٌ مكرّر بين مدينتين');
});
