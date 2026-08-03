import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandQuery, expandAll, toSearchParams } from '../../src/lib/searchIntent';

// ============================================================
// نيّةُ البحث — الطبقةُ التي كانت مفقودةً بين الزبون والفهرس.
//
//   التاجرُ يُفهَم بـ١٩٧ مفهومًا لها مرادفاتٌ بخمس لغات. والزبونُ كان يقابله
//   `LIKE '%…%'` على ثلاثة أعمدة. **العقلُ كلُّه كان يخدم التاجرَ وحدَه.**
// ============================================================

test('«بلومبي» تُفهَم سبّاكًا وتُوسَّع بمرادفاته', () => {
  const it = expandQuery('بلومبي');
  assert.equal(it.concept, 'plumber');
  assert.ok(it.terms.includes('سباك'), `المرادفاتُ لا تحمل «سباك» — ${it.terms.join(' · ')}`);
  assert.ok(it.terms.some(t => /plombier/i.test(t)), 'المرادفةُ الفرنسيّةُ غائبة');
});

test('«plombier» بالفرنسيّة تصل إلى المفهوم نفسِه', () => {
  const it = expandQuery('plombier');
  assert.equal(it.concept, 'plumber', 'الفرنسيّةُ لا تُفهَم — والمغاربةُ يكتبون بها كثيرًا');
  assert.ok(it.terms.includes('سباك'));
});

test('الخدماتُ تدخل المرادفات — الزبونُ يبحث بالحاجة لا بالمهنة', () => {
  // «شكون كيفتح المجاري» — لا يعرف الزبونُ أنّ اسمَ المهنة «سباك».
  const it = expandQuery('سباك');
  assert.ok(it.terms.some(t => t.includes('المجاري')),
    `ما يفعله السبّاكُ لا يدخل البحث — ${it.terms.join(' · ')}`);
});

test('ما لم يُفهَم يُرسَل كما هو — البحثُ لا يتعطّل لأنّ الفهمَ عجز', () => {
  const it = expandQuery('شي حاجة ماشي معروفة أصلا زقنبوت');
  assert.deepEqual(it.terms.length > 0, true);
  assert.ok(it.terms.includes('شي حاجة ماشي معروفة أصلا زقنبوت'));
});

test('الاستعلامُ الفارغ لا يُنتج مرادفاتٍ ولا يرمي', () => {
  assert.deepEqual(expandQuery('').terms, []);
  assert.deepEqual(expandQuery('   ').terms, []);
  assert.deepEqual(expandAll(''), []);
});

test('الفئةُ تُشتقّ من الفهم فتُضيّق البحثَ بلا سؤال', () => {
  assert.equal(expandQuery('تراكسي').category, 'sport');
  assert.equal(expandQuery('صباط').category, 'shoes');
});

test('عددُ المرادفات محدود — لا استعلامَ ينفخه الفهم', () => {
  for (const q of ['سباك', 'ميكانيسيان', 'طبيب بيطري', 'حلاق'])
    assert.ok(expandQuery(q).terms.length <= 24, `«${q}» وسّعت أكثرَ من الحدّ`);
});

test('كلُّ توسيعٍ يحمل دليلَه', () => {
  const it = expandQuery('بلومبي');
  assert.ok(it.matched?.term, 'لا دليلَ على سببِ الفهم — صندوقٌ أسودُ لا يُصحَّح');
});

test('معاملاتُ الطلب تحمل المرادفاتِ منفصلةً عن النصّ الخام', () => {
  const p = toSearchParams(expandQuery('بلومبي'), 'الدار البيضاء');
  assert.equal(p.get('q'), 'بلومبي', 'النصُّ الخامُّ يجب أن يبقى — به يُسجَّل ما بحث عنه الناس');
  assert.ok((p.get('terms') || '').includes('سباك'), 'المرادفاتُ لا تُرسَل');
  assert.equal(p.get('city'), 'الدار البيضاء');
});

test('لا مرادفاتٍ تُرسَل حين لا توسيع', () => {
  // إرسالُ `terms` مطابقةً لـ`q` ثرثرةٌ بلا فائدة.
  const p = toSearchParams(expandQuery('شي حاجة ماشي معروفة أصلا زقنبوت'));
  assert.equal(p.get('terms'), null);
});

test('جملةٌ بحاجتين تُنتج نيّتين', () => {
  const list = expandAll('بغيت نغسل الطوموبيل ونصبغ الدار');
  assert.ok(list.length >= 2, `حاجةٌ واحدةٌ فُهمت من جملةٍ فيها اثنتان — ${list.map(x => x.concept).join(' · ')}`);
});
