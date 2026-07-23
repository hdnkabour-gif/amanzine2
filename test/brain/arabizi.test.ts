import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deArabizi, isArabizi, understand } from '../../src/lib/akg/kb';
import { readHuman } from '../../src/lib/humanIntent';

// ============================================================
// طبقة اللاتينيّة (Arabizi) — ضرورةٌ لا ميزة. نسبةٌ ضخمةٌ من المغاربة تكتب
// «bghit / 3andi / 7aja». هنا نثبت أنّ الكتابة اللاتينيّة تصل إلى المحرِّك
// عربيّةً، وأنّ النيّة تُقرأ منها. (المثال الحيّ الذي فشل: «bghit necheri chi 7aja».)
// ============================================================

test('deArabizi يحوّل المثال الحيّ الذي فشل', () => {
  assert.equal(deArabizi('bghit necheri chi 7aja'), 'بغيت نشري شي حاجة');
});

test('deArabizi يحوّل الأرقام-كحروف (3/7/9) والأفعال الشائعة', () => {
  assert.equal(deArabizi('3andi mouchkil'), 'عندي مشكل');
  assert.equal(deArabizi('khassni sbbak'), 'خاصني سباك');
  assert.equal(deArabizi('bghit tbib'), 'بغيت طبيب');
});

test('deArabizi لا يمسّ العربيّة ولا الأرقام الخالصة (أسعار/كمّيّات)', () => {
  assert.equal(deArabizi('الما كيقطر فالكوزينة'), 'الما كيقطر فالكوزينة');
  assert.equal(deArabizi('بغيت 3 دراهم'), 'بغيت 3 دراهم');
});

test('isArabizi يميّز اللاتينيّة الخالصة من العربيّة', () => {
  assert.equal(isArabizi('bghit nbi3'), true);
  assert.equal(isArabizi('بغيت نبيع'), false);
  assert.equal(isArabizi(''), false);
});

test('اللاتينيّة تصل المحرّك عربيّةً: «khassni sbbak» ⇒ سبّاك', () => {
  const u = understand('khassni sbbak');
  assert.equal(u.profession?.label, 'سبّاك');
});

test('النيّة تُقرأ من اللاتينيّة: «ana 7rayfi» ⇒ SELF · «bghit nbi3» ⇒ SELL', () => {
  assert.equal(readHuman('ana 7rayfi').intent, 'SELF');
  assert.equal(readHuman('bghit nbi3').intent, 'SELL');
  assert.equal(readHuman('3andi mouchkil f dar').intent, 'HELP');
});

// ── تصحيح الانحدار: المحرّك لم يعُد يخترع مهنةً من كلمة نيّة عامّة ──
// «بغيت طبيب» كان يُرجع «صبّاغ» لأنّ «بغيت» تُطابق جزئيًّا «بغيت نصبغ».
test('المحرّك لا يخترع مهنةً خاطئة من كلمة «بغيت» وحدها', () => {
  const u = understand('بغيت طبيب');
  assert.notEqual(u.profession?.label, 'صبّاغ');
  const v = understand('خاصني سباك');
  assert.notEqual(v.profession?.label, 'بنّاي');
  assert.equal(v.profession?.label, 'سبّاك');
});
