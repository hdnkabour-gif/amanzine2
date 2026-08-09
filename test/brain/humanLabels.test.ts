import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readAction, describeAction, describeIntent } from '../../src/lib/akg/kb/actions';
import { parseNeed } from '../../src/lib/needEngine';

// ============================================================
// **القانونُ العاشر: لا مُعرِّفَ داخليٌّ في وجه إنسان.**
//
//   من شاشة صاحب المشروع، حرفيًّا:
//       «فعل → update/phone»   و   «فعل → view/orders»
//
//   و`describeAction` تعرف الاسمَين منذ كُتبت: «نبدّل رقم الهاتف» ·
//   «نوريك الطلبات». وكانت تُنادى **للعنوان** ثمّ يُتجاوَزها السطرُ
//   الملاصقُ فيركّب الوسمَ من `${verb}/${object}` الخامّة. طبقةُ تسميةٍ
//   تُنادى لحقلٍ وتُترَك للحقل الذي بجانبه.
//
//   وخريطةُ النيّات كانت محبوسةً داخل لوحةٍ واحدة (`BetaMonitorPanel`)،
//   فبقيت بقيّةُ الشاشات تعرض `find_pro` خامًّا. خريطةٌ في مكانٍ واحدٍ
//   هي نصفُ طبقة: تصلح لمن يعرفها ولا يعرفها أحد.
// ============================================================

const src = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

test('الفعلُ يُقال بالعربيّة: «نبدّل رقم الهاتف» لا «update/phone»', () => {
  const a = readAction('بغيت نبدل رقم الهاتف ديالي');
  assert.ok(a, 'ما تقراش الفعل');
  assert.equal(a!.verb, 'update');
  assert.equal(a!.object, 'phone');
  const said = describeAction(a!);
  assert.doesNotMatch(said, /[a-z_]{3,}/i, `مُعرِّفٌ لاتينيٌّ في النصّ: «${said}»`);
  assert.match(said, /رقم الهاتف/, `ما قالش الاسمَ العربيّ: «${said}»`);
});

test('والنيّةُ كذلك: «مختصّ» لا «find_pro»', () => {
  assert.equal(describeIntent('find_pro'), 'مختصّ');
  assert.equal(describeIntent('create_store'), 'فتح متجر');
  // ونيّةٌ لا اسمَ لها لا تُعرَض خامّةً — الصمتُ أصدقُ من لاتينيّةٍ لا تعني شيئًا.
  assert.doesNotMatch(describeIntent('some_new_intent'), /[a-z_]/i,
    'مُعرِّفٌ غيرُ معروفٍ عُرض كما هو');
});

test('**والوسمُ المعروضُ للإنسان بلا مُعرِّف** — وهذا ما رآه صاحبُ المشروع', () => {
  // **الجملُ تُختار بالقياس لا بالحدس.** نسختي الأولى من هذا الحارس
  //   استعملت «بغيت نبدل رقم الهاتف ديالي» و«وريني الطلبات ديالي» —
  //   وكلتاهما **لا تبلغ الفرعَ الذي يبني الوسم** (الأولى تُقرأ عرضَ خدمة،
  //   والثانية ترجع بوسومٍ فارغة). فحقنتُ العطبَ الأصليَّ نفسَه فمرّ الحارسُ
  //   نظيفًا. حارسٌ يمرّ حقنتَه يحرس دعوى لا يقيسها — للمرّة الرابعة.
  const HITS = ['بدل ليا النمرة', 'وريني الكوموندات', 'بغيت نبدل اللغة', 'حيد هاد المنتوج'];
  let tagged = 0;
  for (const q of HITS) {
    const r: any = parseNeed(q, {});
    const tags: string[] = r.tags || [];
    if (tags.some(t => /فعل →/.test(t))) tagged++;
    const shown = [r.label, ...tags, r.open, r.next].filter(Boolean).join(' | ');
    assert.doesNotMatch(shown, /\b(view|create|update|delete|share|send)\/[a-z_]+/,
      `«${q}» ⇒ مُعرِّفٌ خامٌّ فوجه إنسان: «${shown}»`);
    assert.doesNotMatch(shown, /\b[a-z]+_[a-z]+\b/,
      `«${q}» ⇒ snake_case فوجه إنسان: «${shown}»`);
  }
  // **ولا يمرّ الحارسُ فارغًا**: إن لم يبلغ الفرعَ أحدٌ فهو لا يقيس شيئًا.
  assert.ok(tagged >= 3, `ما بلغ فرعَ الوسم إلّا ${tagged} — الحارسُ صار يمرّ بلا قياس`);
});

test('ولا خريطةَ تسمياتٍ ثانيةً مكتوبةً داخل صفحة', () => {
  for (const f of ['src/components/BetaMonitorPanel.tsx']) {
    assert.doesNotMatch(src(f), /const INTENT_AR[^=]*=\s*\{/,
      `${f}: رجعت خريطةٌ محلّيّة — نسختان من التسمية تتباعدان`);
  }
});

test('والشرحُ الذي يقرؤه الإنسانُ لا يحمل `verb/object`', () => {
  assert.doesNotMatch(src('src/lib/understanding.ts'),
    /reasoning\.push\(`[^`]*\$\{u\.action\.verb\}\/\$\{u\.action\.object\}/,
    'رجع `update/phone` إلى سطر الشرح');
});
