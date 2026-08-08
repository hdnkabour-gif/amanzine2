'use strict';
// ============================================================
// **مطابِقٌ واحدٌ لثلاثةِ مصادر — ولا يُحذَف المعروضُ بحَدْس.**
//
//   ما وقع فعلًا وقِيس بخطّ الأنبوب:
//     ① `discoverProducts` تفكّك العبارةَ وتطبّع الحروف، و`getPublicListings`
//        و`discoverProviders` تبحثان بـ`LIKE '%<الجملة كاملةً>%'`. فمن كتب
//        «بغيت شي كسوة لبنتي أنا فكازة» يجد منتجَ متجرٍ ولا يجد إعلانًا
//        مطابقًا في السوق — والسؤالُ واحد.
//     ② «بغيت جلابة» وُسِّعت بمرادفاتٍ فيها «خياطة بالمقاس»، فقرأ المحرّكُ
//        «نيّةُ خدمة» و**حذف كلَّ المنتجات** — فاختفت الجلابة. التوسيعُ
//        الذي بُني ليزيد ما يُوجَد صار يحذفه.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../database');

const SRC = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('المطابِقُ يفكّك العبارةَ إلى كلماتها — «حوايج صغار» تجد «حوايج دراري صغار»', () => {
  const w = db._matchWords({ q: 'بغيت شي كسوة', terms: ['حوايج صغار'] });
  assert.ok(w.includes('حوايج'), `ما تفكّكاتش: ${w.join(' | ')}`);
  assert.ok(w.includes('صغار'), `ما تفكّكاتش: ${w.join(' | ')}`);
  assert.ok(w.includes('حوايج صغار'), 'العبارةُ الأصليّةُ ضاعت — وهي أدقُّ من كلماتها');
});

test('والحروفُ تُطبَّع — «جلابة» المكتوبةُ تُطابق «جلابه» المخزَّنة', () => {
  const w = db._matchWords({ q: 'جلابة' });
  assert.ok(w.includes('جلابه'), `ما تطبّعش: ${w.join(' | ')}`);
});

test('وحدُّ ثلاثةِ أحرفٍ يمنع الضجيج — «شي» و«ليا» لا تُطابقان كلَّ شيء', () => {
  const w = db._matchWords({ q: 'شي حرفي يصبغ ليا الدار' });
  assert.ok(!w.includes('شي'), '«شي» صارت كلمةَ بحثٍ — تقع في كلّ اسم');
  assert.ok(!w.includes('ليا'), '«ليا» صارت كلمةَ بحث');
  assert.ok(w.includes('يصبغ'), `الكلمةُ الدالّةُ ضاعت: ${w.join(' | ')}`);
});

test('**والمطابِقُ نفسُه في المصادر الثلاثة** — لا مطابقةَ ثانيةٌ لسؤالٍ واحد', () => {
  const src = SRC('database.js');
  const body = (name) => {
    const i = src.indexOf(`db.${name} = async (`);
    assert.notEqual(i, -1, `${name} ما كايناش`);
    return src.slice(i, i + 2500);
  };
  for (const fn of ['discoverProducts', 'getPublicListings', 'discoverProviders']) {
    assert.match(body(fn), /matchClause\(\{ q, terms \}/,
      `${fn} ما كتستعملش المطابِقَ الموحّد — رجعت المطابقةُ الحرفيّةُ المتّصلة`);
  }
});

test('والمصادرُ الثلاثةُ تقبل `terms` أصلًا', () => {
  const src = SRC('database.js');
  for (const fn of ['discoverProducts', 'getPublicListings', 'discoverProviders']) {
    const sig = src.slice(src.indexOf(`db.${fn} = async (`), src.indexOf(`db.${fn} = async (`) + 120);
    assert.match(sig, /terms/, `${fn} ما كتقبلش المرادفات — تصلها وتُرمى`);
  }
});

test('وبابُ الكتالوج العامّ يمرّر المرادفات', () => {
  assert.match(SRC('routes/listings.js'), /terms:\s*String\(req\.query\.terms/,
    'بابُ /public/catalog يُسقط المرادفاتِ — مطابِقُه أضعفُ من /api/search');
});

test('**المنتجاتُ لا تُحذَف بحَدْس**: التضييقُ لمن قال لا لمن خُمِّن عنه', () => {
  const src = SRC('lib/engines/search.js');
  assert.ok(!/intent\.kind === 'service' \? \[\]/.test(src),
    'رجع الحذفُ بالحدس: «بغيت جلابة» تصير «خدمة» فتختفي الجلابة');
  assert.match(src, /if \(type === 'service'\) products = products\.filter/,
    'التضييقُ الصريحُ اختفى — «بغيت خدمة» ترجع له سلعٌ ماديّة');
});
