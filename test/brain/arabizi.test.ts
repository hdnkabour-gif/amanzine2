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

// ============================================================
// **الطريقُ اللاتينيُّ أضعفُ من العربيّ — قِيس، فكان ٨ من ٢٥.**
//
//   جملُ صاحب المشروع كشفته: أربعُ جملٍ لاتينيّة، **ثلاثٌ تسقط**
//   ومقابلاتُها العربيّةُ تعمل. والاحتياطيُّ حرفًا بحرف — وهو ما يلتقط
//   كلَّ ما ليس في الخريطة — كان يُنتج كلماتٍ لا وجودَ لها.
//
//   وثلاثةُ فروقٍ لا يعرفها الحرفُ اللاتينيّ (`t` تاءً وطاءً · `h` هاءً
//   وحاءً · الحركاتُ القصيرة) تبقى للخريطة وحدَها: التخمينُ فيها يُنتج
//   **كلمةً أخرى** لا كلمةً ناقصة.
// ============================================================

test('**المضاعَفُ اللاتينيُّ ليس شدّةً** — وهو أصلُ المدينة المخترَعة', () => {
  // «wesselat» ⇒ «وسسلات»، ومن جوفها خُرِّجت المدينةُ «سلا» في جملةٍ
  // لا مدينةَ فيها. و`collapseRepeats` لا تمسكه: تبدأ من **ثلاثة**.
  assert.equal(deArabizi('pizza'), 'بيزة');
  assert.equal(deArabizi('collie'), 'كولي');
  assert.ok(!deArabizi('wesselat').includes('سس'), 'الحرفُ المضاعَفُ ما زال يمرّ مضاعَفًا');
  // والمدُّ العربيُّ الحقيقيُّ لم يُمَسّ — الطيُّ لاتينيٌّ لا عربيّ.
  assert.equal(deArabizi('الما كيقطر'), 'الما كيقطر');
});

test('والتاءُ المربوطةُ في آخر المؤنّث — «jellaba» جلابة لا جلابا', () => {
  assert.equal(deArabizi('lbsa'), 'لبسة');
  assert.equal(deArabizi('zewina'), 'زوينة');
});

test('و«‑ge» الفرنسيّةُ جيمٌ لا گاف — ومهنُ السيّارات فرنسيّةُ الأصل', () => {
  assert.equal(deArabizi('lavage'), 'لافاج');
  assert.equal(understand('bghit lavage').service, 'car_wash', 'لافاج لا تبلغ محلَّ الغسل');
});

test('**اللاتينيّةُ تصل حيث تصل العربيّة** — الجملُ التي سقطت', () => {
  // كلُّ سطرٍ هنا مقيسٌ من جملةٍ كتبها صاحبُ المشروع، ومقابلُه العربيُّ
  // كان يعمل. فالعطبُ لم يكن في الفهم بل في الطريق إليه.
  assert.equal(understand('Bghit nakol').service, 'restaurant',
    '«Bghit nakol» تسقط و«بغيت ناكل» تعمل');
  assert.equal(understand('Bghit chi lbessa zewina lbenti ana f casa').service, 'clothing',
    '«lbessa» غيرُ مقروءة');
  assert.equal(understand('Bghit chi lbessa zewina lbenti ana f casa').city, 'الدار البيضاء');
});

test('و«فين وصلات الكوموند ديالي» تُقرأ من اللاتينيّة كما من العربيّة', () => {
  // كانت تُقرأ **عرضَ خدمة** وتُساق إلى صفحة النشر — ومعها مدينةٌ مخترَعة.
  const u = understand('Fin wesselat lcomonde deyali');
  assert.equal(u.action?.object, 'orders', 'الطلبُ لا يُقرأ طلبًا');
  assert.equal(u.city, undefined, 'عادت المدينةُ المخترَعة');
});

test('وما لا تحسمه قاعدةٌ تحسمه الخريطة — ولا يُخمَّن', () => {
  const pairs: [string, string][] = [
    ['bghit sbat', 'shoe_store'], ['bghit sbbat', 'shoe_store'],
    ['khassni hallaq', 'barber'], ['bghit 7allaq', 'barber'],
    ['bghit khayat', 'tailor'],   ['bghit qamija', 'garment_top'],
    ['bghit jellaba', 'traditional_clothing'],
  ];
  for (const [q, want] of pairs) {
    assert.equal(understand(q).service, want, `«${q}» ⇒ ${deArabizi(q)} — لم تبلغ ${want}`);
  }
});
