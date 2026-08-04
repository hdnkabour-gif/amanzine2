'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// ============================================================
// المحلُّ الذي يفتح ويُغلق — أعمدةٌ لا جداولٌ موازية.
//
//   الاقتراحُ الذي وصلنا كان خمسةَ جداولَ جديدة (`restaurants` · `menu_items`
//   · `food_orders` · `delivery_persons` · `delivery_requests`). والقياس:
//   المطعمُ **هو** `providers`، والطبقُ **هو** `products`، والطلبُ **هو**
//   `orders`. جداولُ موازيةٌ تعني تفريعَ التقييمات والولاء والبحث والتوصيل
//   والدفع — كلٌّ بتنفيذَين ينحرفان. الناقصُ فعلًا أربعةُ حقول.
//
//   وهذا الملفُّ يحرس السلسلةَ نفسَها التي حرسناها للمنتجات: العمودُ موجودٌ،
//   ويُقرَأ، ويُكتَب. حلقةٌ مقطوعةٌ = معلومةٌ يملؤها صاحبُ المحلّ فتضيع صامتة.
// ============================================================

const R = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
const migrate = R('migrate.js');
const database = R('database.js');

const PROVIDER_COLS = ['opening_hours', 'open_state', 'prep_minutes', 'delivery_modes'];

test('أعمدةُ المحلّ موجودةٌ في المخطّط', () => {
  const declared = new Set(
    [...migrate.matchAll(/ALTER TABLE providers ADD COLUMN IF NOT EXISTS (\w+)/g)].map(m => m[1]));
  const missing = PROVIDER_COLS.filter(c => !declared.has(c));
  assert.deepEqual(missing, [], `أعمدةٌ ناقصةٌ في providers: ${missing.join(', ')}`);
});

test('ما يُقرَأ في التحويل يُكتَب في التحديث', () => {
  // **العطبُ الذي تكرّر خمسَ مرّاتٍ في هذا المشروع**: حقلٌ يُعرَض في الواجهة
  // ويُقرَأ من الصفّ، ولا يُقبَل في التحديث — فيبقى فارغًا أبدًا مهما ملأه
  // صاحبُ المحلّ، بلا رسالةِ خطأٍ واحدة.
  const i = database.indexOf('function _mapProvider');
  assert.ok(i > 0, 'لا مُحوِّلَ للمزوّد');
  const mapper = database.slice(i, database.indexOf('function _mapBooking', i));

  const j = database.indexOf('db.updateProvider');
  assert.ok(j > 0, 'لا تحديثَ للمزوّد');
  const updater = database.slice(j, database.indexOf('db.deleteProvider', j));

  const unread = PROVIDER_COLS.filter(c => !mapper.includes(c));
  assert.deepEqual(unread, [], `أعمدةٌ تُكتَب ولا تُقرَأ: ${unread.join(', ')}`);

  const unwritten = PROVIDER_COLS.filter(c => !updater.includes(c));
  assert.deepEqual(unwritten, [], `أعمدةٌ تُقرَأ ولا تُكتَب: ${unwritten.join(', ')}`);
});

test('طريقةُ التوصيل تُحفَظ على الطلب — الاختيارُ يُنفَّذ لا يُنسى', () => {
  // الزبونُ يختار «يجيبها ليفرور» أو «نمشي نجيبها». اختيارٌ لا يُخزَّن اختيارٌ
  // لم يقع: صاحبُ المحلّ لا يعرف ماذا يفعل بالطلب.
  assert.ok(/ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode/.test(migrate),
    'لا عمودَ delivery_mode في الطلبات');

  const ins = database.slice(database.indexOf('INSERT INTO orders'));
  const cols = ins.slice(ins.indexOf('(') + 1, ins.indexOf(')'));
  assert.ok(cols.includes('delivery_mode'), 'delivery_mode غائبٌ عن الإدراج');

  // **والقيمةُ تُمرَّر فعلًا.** أوّلُ صيغةٍ هنا قارنت عددَ الأعمدة بعددِ
  // النوائب `$1..$18` — وكلاهما نصٌّ ثابتٌ في نفس الاستعلام، فكان الحارسُ
  // يمرّ سليمًا وأنا أحذف الوسيطَ من مصفوفة القيم. حارسٌ لا يفشل حين يُعاد
  // العطبُ ليس حارسًا.
  const args = ins.slice(ins.indexOf('RETURNING'), ins.indexOf('return _mapOrder'));
  assert.ok(/o\.deliveryMode/.test(args), 'delivery_mode عمودٌ في الإدراج بلا قيمةٍ تُمرَّر إليه');

  assert.ok(database.includes("deliveryMode:     'delivery_mode'"), 'التحديثُ لا يقبل deliveryMode');
  assert.ok(database.includes('deliveryMode:     o.delivery_mode'), 'التحويلُ لا يقرأ delivery_mode');
});

test('لا جدولَ موازٍ للمطاعم', () => {
  // **حارسُ قرار.** المطعمُ مزوّدٌ والطبقُ منتجٌ والطلبُ طلب. أوّلُ جدولٍ
  // موازٍ يُنشَأ يفرّع كلَّ ما بُني فوق الثلاثة.
  for (const t of ['restaurants', 'menu_items', 'food_orders', 'kitchens', 'delivery_persons'])
    assert.ok(!migrate.includes(`CREATE TABLE IF NOT EXISTS ${t}`),
      `جدولٌ موازٍ (${t}) — المطعمُ providers والطبقُ products والطلبُ orders`);
});
