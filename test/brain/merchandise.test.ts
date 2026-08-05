import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { MERCHANDISE } from '../../src/lib/akg/kb/merchandise';
import { CONCEPTS } from '../../src/lib/akg/kb/concepts';

// ============================================================
// الوعاءُ والمحتوى.
//
//   قياسٌ على ٤٦ جملةً من شكل «عندي حانوت ديال ⟨بضاعة⟩» أرجع `grocer` في
//   ٤٣ منها: بائعُ السمك والذهب والكتب — كلُّهم بقّالون. وهذه الاختباراتُ
//   تحرس النصفَين معًا: أنّ الوعاءَ لا يغلب محتواه، وأنّ البضاعةَ تدلّ على
//   الحرفة — لأنّ المغربيَّ يقول ما **يبيع** لا ما **يُسمّى**.
// ============================================================

// ── مثالُ المالك الجاري ────────────────────────────────────────
test('«عندي محل ديال الخضرة» — الجملةُ التي ظلّت لا تُفهَم', () => {
  const u = understand('عندي محل ديال الخضرة');
  assert.equal(u.service, 'greengrocer');
});

test('البضاعةُ تدلّ على الحرفة مهما كان الوعاء', () => {
  for (const box of ['محل', 'حانوت', 'دكان', 'متجر']) {
    assert.equal(resolveConcept(`عندي ${box} ديال الحوت`)?.id, 'fishmonger',
      `«${box} ديال الحوت» ليست بقّالة`);
    assert.equal(resolveConcept(`عندي ${box} ديال الحلويات`)?.id, 'pastry_chef');
    assert.equal(resolveConcept(`عندي ${box} ديال الذهب`)?.id, 'jeweler');
  }
});

// ── ① الوعاءُ لا يغلب محتواه ──────────────────────────────────
test('«حانوت» لا تبتلع ما بعدها — وهو العطبُ الأصليّ', () => {
  // «حانوت» متغيّرُ `grocer`، والفهرسُ يفوز فيه الأطول. فكانت تبتلع كلَّ
  // بضاعةٍ أقصرَ منها: ٤٣ من ٤٦ جملة.
  const sold: [string, string][] = [
    ['الحوت', 'fishmonger'], ['الخضرة', 'greengrocer'], ['الحلويات', 'pastry_chef'],
    ['الكتب', 'bookstore'], ['الذهب', 'jeweler'], ['الخبز', 'bakery'],
    ['الطوموبيلات', 'automobile'],
  ];
  for (const [goods, id] of sold) {
    assert.equal(resolveConcept(`عندي حانوت ديال ${goods}`)?.id, id,
      `ابتلعت «حانوت» بضاعتَها: ${goods}`);
  }
});

test('الوعاءُ يُؤجَّل ولا يُلغى — «عندي حانوت» تبقى بقّالة', () => {
  // الإصلاحُ يجب ألّا يورث المكانَ صمتًا: من قال «حانوت» بلا إضافةٍ فهو
  // بقّالٌ حقًّا، وهذا هو معناها في الدارجة.
  assert.equal(resolveConcept('عندي حانوت')?.id, 'grocer');
  assert.equal(resolveConcept('عندي دكان')?.id, 'grocer');
  assert.equal(resolveConcept('عندي حانوت ف الحي')?.id, 'grocer');
  // ومحتوًى لا نعرفه يعود إلى الافتراض — «كلشي» بقّالةٌ فعلًا.
  assert.equal(resolveConcept('حانوت ديال كلشي')?.id, 'grocer');
});

test('العودةُ إلى الوعاء تُوسَم دليلًا — لا تُقدَّم كقراءةٍ لما قاله', () => {
  // `via` هو «الدليل» في هذا المشروع. ولو رجع الوعاءُ بوسم `exact` لبدا
  // أنّنا قرأنا بضاعتَه، وهو افتراضٌ محض.
  assert.equal(resolveConcept('حانوت ديال كلشي')?.matched?.via, 'container');
  assert.equal(resolveConcept('عندي حانوت')?.matched?.via, 'exact');
  assert.equal(resolveConcept('حانوت ديال الحوت')?.matched?.via, 'exact');
});

test('متغيّرٌ صحيحٌ يبدأ بوعاءٍ لا يسقط بالتأجيل', () => {
  // «حانوت ديال الحوايج» متغيّرٌ كاملٌ للملابس في البيانات — أي معرفةٌ صحيحةٌ
  // شكلُها شكلُ العطب. حارسُ ارتدادٍ لا أكثر: أيُّ توسيعٍ لشرط التأجيل يجب
  // أن يمرّ من هنا. (وقد سُبر: الشرطُ اليومَ لا يردّها أصلًا.)
  assert.equal(resolveConcept('عندي حانوت ديال الحوايج')?.id, 'clothing');
  assert.equal(resolveConcept('عندي حانوت ديال الحوايج')?.matched?.via, 'exact');
});

test('ما يعرفه الفهرسُ أصلًا لم ينكسر', () => {
  // حارسُ ارتداد: التأجيلُ يمرّ على كلّ جملةٍ عربيّة.
  assert.equal(understand('بغيت ميكانيكي').service, 'mechanic');
  assert.equal(understand('بغيت نغسل الطوموبيل').service, 'car_wash');
  assert.equal(understand('بغيت نصبغ الدار').service, 'painter');
  assert.equal(understand('بغيت نبيع كسيوات ديال الدراري').service, 'kids_clothing');
  assert.equal(understand('الماكينة ديال الخياطة خربات').service, 'sewing_machine_repair');
});

// ── ② حدُّ جدول البضائع ───────────────────────────────────────
test('كلُّ حرفةٍ في الجدول موجودةٌ فعلًا في قاعدة المعرفة', () => {
  // الجدولُ يشير إلى مُعرِّفاتٍ في ملفٍّ مولَّد. لو حُذف مفهومٌ أو أُعيدت
  // تسميتُه لصار السطرُ يشير إلى العدم — ويُرجِع مفهومًا بلا اسمٍ ولا خدمات،
  // بصمتٍ تامّ. هذا الحارسُ يجعل الانفصالَ يكسر البناءَ لا الفهم.
  const ids = new Set(CONCEPTS.map(c => c.id));
  for (const r of MERCHANDISE) {
    assert.ok(ids.has(r.id), `بضاعةٌ تشير إلى حرفةٍ غير موجودة: ${r.id}`);
  }
});

test('البضاعةُ تُطابَق كلمةً كاملةً لا مصادفةً داخل كلمة', () => {
  // أسماءُ الحرف نادرةُ الوقوع داخل كلامٍ آخر، وأسماءُ البضائع أسماءُ جنسٍ
  // شائعة. قياسٌ بالمطابقة بالاحتواء أعطى هذه الثلاثةَ حرفيًّا:
  //     «بغيت مكتب»   ⇒ مكتبة   (لأنّ «كتب» داخل «مكتب»)
  //     «ذهبت للسوق»  ⇒ صائغ    (لأنّ «ذهب» داخل «ذهبت»)
  //     «المذهب»      ⇒ صائغ
  // وكلُّها مصارفُ صامتةٌ من الصنف الذي هدمناه في المتغيّرات.
  assert.notEqual(resolveConcept('بغيت مكتب')?.id, 'bookstore', '«مكتب» ليست «كتب»');
  assert.notEqual(resolveConcept('ذهبت للسوق')?.id, 'jeweler', '«ذهبت» ليست «ذهب»');
  assert.notEqual(resolveConcept('المذهب')?.id, 'jeweler');
  // والسابقةُ الملتصقة تُقبَل — «المكتبة» مكتبةٌ حقًّا.
  assert.equal(resolveConcept('المكتبة')?.id, 'bookstore');
});

test('الكلمةُ ذاتُ المعنيَين لا تدخل الجدول', () => {
  // الحدُّ المعلَن: لا يدخل إلّا اسمُ بضاعةٍ تدلّ على حرفةٍ **واحدة**.
  // «الطاجين» بضاعةُ فخّارٍ وطبقُ مطعمٍ معًا، و«ساعة» وحدةُ زمن — وإدخالُهما
  // يعيد بناءَ المصرف الذي هدمناه.
  const banned = ['الطاجين', 'ساعه', 'ساعة', 'ريحه', 'ريحة', 'خدمه', 'بيع'];
  const inTable = new Set(MERCHANDISE.flatMap(r => r.terms));
  for (const w of banned) {
    assert.ok(!inTable.has(w), `كلمةٌ عامّةٌ أو ذاتُ معنيَين دخلت الجدول: «${w}»`);
  }
});

test('البضاعةُ تُقرأ حتّى بلا وعاء — «الخضرة» وحدَها', () => {
  // الزبونُ لا يقول «محل» أصلًا: يكتب ما يريد شراءه.
  assert.equal(resolveConcept('الخضرة')?.id, 'greengrocer');
  assert.equal(resolveConcept('بغيت الحوت')?.id, 'fishmonger');
  assert.equal(resolveConcept('فين كاين الحليب')?.id, 'dairy_shop_juice_bar');
});

test('اسمُ الحرفة أدقُّ من اسم بضاعتها ⇒ يسبقه', () => {
  // «خضّار» تصريحٌ بالحرفة، و«الخضرة» استدلالٌ عليها. فحين يجتمعان يفوز
  // التصريحُ — وهذا ما يضمنه موضعُ الجدول **بعد** الفهرس لا قبله.
  assert.equal(resolveConcept('أنا خضار')?.matched?.via, 'exact');
  assert.equal(resolveConcept('حلواني')?.id, 'pastry_chef');
});
