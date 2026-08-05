import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAction, describeAction } from '../../src/lib/akg/kb/actions';
import { understand } from '../../src/lib/akg/kb';

// ============================================================
// محرّكُ الأفعال — سؤالُ المالك حرفيًّا:
//
//   «كيف يفهم التطبيقُ إن كان السؤالُ عن إعدادات التطبيق أو إعدادات الخدمات
//    أو بيع منتوج أو إنشاء متجر أو تغيير الثمن أو تغيير رقم الهاتف؟»
//
//   وكلُّها تبدأ بـ«بغيت». فالجوابُ ليس ذكاءً أقوى، بل **فصلُ الفعل عن الهدف
//   عن النطاق**. وهذه الاختباراتُ تحرس الفصلَ نفسَه — وأهمُّها الأخيرةُ:
//   أنّ المحرّكَ **يصمت** حين لا يكون الكلامُ إعدادًا.
// ============================================================

test('نفسُ الفعل، أهدافٌ مختلفة ⇒ طرقٌ مختلفة', () => {
  const phone = readAction('بغيت نبدل رقم الهاتف')!;
  assert.equal(phone.verb, 'update');
  assert.equal(phone.object, 'phone');
  assert.equal(phone.scope, 'user');          // إعدادُ شخصٍ لا نشاط

  const price = readAction('بغيت نبدل الثمن')!;
  assert.equal(price.verb, 'update');
  assert.equal(price.object, 'price');
  assert.equal(price.scope, 'workspace');      // إعدادُ نشاطٍ لا شخص
});

test('«زيد محل جديد» ⇒ إنشاءُ نشاط', () => {
  const a = readAction('بغيت نزيد محل جديد')!;
  assert.equal(a.verb, 'create');
  assert.equal(a.object, 'workspace');
});

test('«وريني الطلبات» ⇒ عرضٌ لا إنشاء', () => {
  const a = readAction('وريني الطلبات ديالي')!;
  assert.equal(a.verb, 'view');
  assert.equal(a.object, 'orders');
});

test('«حيّد هاد المتجر» ⇒ حذفٌ — ولا يُنفَّذ بلا تأكيد', () => {
  const a = readAction('بغيت نحيد هاد المحل')!;
  assert.equal(a.verb, 'delete');
  assert.ok(a.needs.some(n => /تأكيد/.test(n)), 'الحذفُ بلا تأكيدٍ خسارةٌ لا تُسترجَع');
});

test('الثمنُ يحتاج نسخةً ⇒ يُسأل ولا يُخمَّن', () => {
  // «بدّل الثمن» — ثمنُ أيّ منتج؟ الفعلُ مفهوم والهدفُ مفهوم والنسخةُ مجهولة.
  const a = readAction('بغيت نبدل الثمن')!;
  assert.ok(a.needs.includes('أيّ منتج؟'));
  assert.ok(a.confidence < 0.8, 'ثقةٌ عاليةٌ على نقصٍ معلوم');
});

test('«بدّل اللغة» لا تحتاج شيئًا ⇒ تُنفَّذ', () => {
  const a = readAction('بدل اللغة')!;
  assert.equal(a.object, 'language');
  assert.deepEqual(a.needs, []);
  assert.ok(a.confidence >= 0.8);
});

test('فعلٌ بلا هدف ⇒ سؤالٌ واحد لا تخمين', () => {
  const a = readAction('بغيت نبدل')!;
  assert.ok(a.needs.length, 'مرّ فعلٌ بلا هدفٍ بلا سؤال');
  assert.ok(a.confidence < 0.5);
});

test('الأخصُّ يغلب الأعمّ: «رقم الهاتف» لا «الإعدادات»', () => {
  // «بغيت نبدل رقم الهاتف من الإعدادات» — الهدفُ الرقمُ لا الإعداداتُ العامّة.
  assert.equal(readAction('بغيت نبدل رقم الهاتف من الاعدادات')?.object, 'phone');
});

// ── الصمتُ حيث يجب ────────────────────────────────────────────
test('التجارةُ ليست إعدادًا — المحرّكُ يصمت', () => {
  // أخطرُ ما يمكن: أن يبتلع محرّكُ الأفعال كلَّ جملةٍ فيها «بغيت».
  for (const s of ['بغيت نبيع قميص', 'بغيت ميكانيكي', 'بغيت طرطاقات',
                   'عندي محل ديال الخضرة', 'شحال الثمن', 'واش كاين التوصيل']) {
    assert.equal(readAction(s), null, `ابتلع جملةً ليست إعدادًا: «${s}»`);
  }
});

test('«وريني» بلا هدفٍ معروفٍ ليست إعدادًا — جملةُ زبونة', () => {
  // «وريني كساوي اللي عندك» منطوقةٌ حرفيًّا من زيارةٍ ميدانيّة. لو قُرئت
  // «افتح الإعدادات» لفُتحت للزبونة شاشةُ إعداداتٍ بدل الكساوي.
  assert.equal(readAction('وريني كساوي اللي عندك'), null);
  assert.equal(readAction('وريهم ليا'), null);
  // أمّا الأفعالُ التصرّفيّة فتسأل ولا تصمت.
  assert.ok(readAction('بغيت نحيد')?.needs.length);
  assert.ok(readAction('بغيت نزيد')?.needs.length);
});

test('الفارغُ والهراءُ يُرجعان null', () => {
  assert.equal(readAction(''), null);
  assert.equal(readAction('؟؟؟'), null);
});

test('لا يكسر الفهمَ القائم — «بغيت نبيع» تبقى تجارة', () => {
  // حارسُ ارتداد: الطبقةُ الجديدةُ لا تمسّ ما كان يعمل.
  const u = understand('بغيت نبيع كسيوات ديال الدراري');
  assert.equal(u.service, 'kids_clothing');
});

test('الوصفُ بالدارجة لكلّ فعلٍ وهدف', () => {
  assert.equal(describeAction(readAction('بدل رقم الهاتف')!), 'نبدّل رقم الهاتف');
  assert.equal(describeAction(readAction('وريني الطلبات')!), 'نوريك الطلبات');
});

test('اللاتينيّة تُقرأ كالعربيّة', () => {
  // `deArabizi` قبل كلّ شيء — «bghit nbdl» يجب أن تصل كما تصل «بغيت نبدل».
  const a = readAction('bghit nbdl الثمن');
  assert.ok(a, 'سقطت الكتابةُ اللاتينيّة');
  assert.equal(a!.object, 'price');
});

// ── النفي ─────────────────────────────────────────────────────
// قياسٌ كشف أنّ «ماشي بغيت نبيع طوموبيل» تُقرأ **مطابقةً** للمثبتة: عرضُ
// بيعِ سيّارة. أي أنّ التطبيقَ كان يفعل **عكسَ** ما قاله الإنسان — وهو
// أسوأُ من ألّا يفهم، لأنّه يمضي واثقًا.
test('النفيُ يُبطل الاتّجاه ولا يُقلَب', async () => {
  const yes = understand('بغيت نبيع طوموبيل');
  const no  = understand('ماشي بغيت نبيع طوموبيل');
  assert.equal(yes.stance, 'offer');
  assert.equal(no.stance, 'unknown', 'النفيُ لم يُبطل الاتّجاه');
  assert.equal(no.negated, true);
  // ولا يُقلَب: «ماشي بغيت نبيع» لا تعني «بغيت نشري». من نفى لم يقل ماذا يريد.
  assert.notEqual(no.stance, 'seek', 'قُلب الاتّجاه — تخمينٌ فوق تخمين');
});

test('صيغتا النفي الدارجتان تُقرآن', () => {
  assert.equal(understand('ماشي بغيت نبيع').negated, true);      // «ماشي»
  assert.equal(understand('ما بغيتش نبيع').negated, true);       // «ما…ش» المحيطة
});

test('الشكوى ليست نفيًا — «ما كيخدمش» طلبُ مساعدة', () => {
  // أخطرُ ما في النفي: أن يبتلع الشكاوى. صيغتُها منفيّةٌ ومعناها طلب.
  for (const s of ['الفريجيدير ما كيخدمش', 'الثلاجة ما بقاتش خدامة', 'ما خدامش']) {
    const u = understand(s);
    assert.equal(u.stance, 'seek', `شكوى قُرئت نفيًا: «${s}»`);
    assert.notEqual(u.negated, true, `شكوى وُسمت نفيًا: «${s}»`);
  }
});

test('الجملةُ المثبتةُ لا تُوسَم نفيًا', () => {
  assert.equal(understand('بغيت نبيع طوموبيل').negated, undefined);
  assert.equal(understand('عندي محل ديال الخضرة').negated, undefined);
});
