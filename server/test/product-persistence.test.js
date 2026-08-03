'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// ============================================================
// استقرارُ ما يُسأل عنه — الطرفُ الأخير من سلسلة «لا سؤالَ بلا مستقرّ».
//
//   `city` كان سؤالًا إجباريًّا في المساعد، يُرسَل إلى الخادم، ولا عمودَ له
//   في الجدول — فيسقط صامتًا في آخر خطوة. الواجهةُ تحرس طرفَها، وهنا يُحرَس
//   طرفُ الخادم: العمودُ موجود، ويُكتَب في الإدراج، ويُقرَأ في التحويل،
//   ويُقبَل في التحديث. أربعُ حلقاتٍ لو انقطعت واحدةٌ ضاعت المعلومة.
// ============================================================

const R = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
const migrate = R('migrate.js');
const database = R('database.js');

// أعمدةُ جدول المنتجات وحدَها — لا الملفّ كلّه. `city` موجودةٌ في جدولَي
// الزبناء والطلبات، فالبحثُ العامّ يقول «موجودة» وهي غائبةٌ عمّا يعنينا.
function productColumns() {
  const i = migrate.indexOf('CREATE TABLE IF NOT EXISTS products');
  assert.ok(i > 0, 'لا تعريفَ لجدول products');
  const block = migrate.slice(i, migrate.indexOf('`)', i));
  return new Set([
    ...[...block.matchAll(/^\s*(\w+)\s+(TEXT|NUMERIC|INTEGER|BOOLEAN|JSONB|TIMESTAMPTZ)/gm)].map(m => m[1]),
    ...[...migrate.matchAll(/ALTER TABLE products ADD COLUMN IF NOT EXISTS (\w+)/g)].map(m => m[1]),
  ]);
}

// أعمدةُ الإدراج بين القوسين في `INSERT INTO products (...)`.
function insertColumns() {
  const i = database.indexOf('INSERT INTO products');
  assert.ok(i > 0, 'لا إدراجَ في جدول products');
  const open = database.indexOf('(', i);
  const close = database.indexOf(')', open);
  return new Set(database.slice(open + 1, close).split(',').map(s => s.trim()).filter(Boolean));
}

const ESSENTIAL = ['name', 'description', 'price', 'cost', 'stock', 'category', 'city', 'sizes', 'colors', 'images'];

test('كلُّ عمودٍ أساسيٍّ موجودٌ في المخطّط', () => {
  const cols = productColumns();
  const missing = ESSENTIAL.filter(c => !cols.has(c));
  assert.deepStrictEqual(missing, [], `أعمدةٌ غائبةٌ عن جدول products: ${missing.join(' · ')}`);
});

test('كلُّ عمودٍ أساسيٍّ يُكتَب عند الإنشاء', () => {
  // عمودٌ في المخطّط لا يذكره الإدراجُ = قيمةٌ تصل ثمّ تُهمَل.
  const ins = insertColumns();
  const missing = ESSENTIAL.filter(c => !ins.has(c));
  assert.deepStrictEqual(missing, [], `أعمدةٌ لا يكتبها createProduct: ${missing.join(' · ')}`);
});

test('عددُ الأعمدة يطابق عددَ العناصر النائبة', () => {
  // إضافةُ عمودٍ بلا `$N` مقابلٍ تكسر الإدراجَ كلَّه وقتَ التشغيل لا وقتَ البناء.
  const i = database.indexOf('INSERT INTO products');
  const cols = insertColumns().size;
  const vi = database.indexOf('VALUES', i);
  const placeholders = database.slice(vi, database.indexOf(')', vi)).match(/\$\d+/g) || [];
  assert.strictEqual(placeholders.length, cols,
    `${cols} عمودًا مقابل ${placeholders.length} عنصرًا نائبًا`);
});

test('كلُّ عمودٍ أساسيٍّ يُقرَأ في التحويل إلى كائن', () => {
  const i = database.indexOf('function _mapProduct');
  const block = database.slice(i, database.indexOf('\n}', i));
  const missing = ESSENTIAL.filter(c => !new RegExp(`p\\.${c}\\b`).test(block));
  assert.deepStrictEqual(missing, [], `أعمدةٌ لا يقرؤها _mapProduct: ${missing.join(' · ')}`);
});

test('المدينةُ قابلةٌ للتعديل بعد النشر', () => {
  const i = database.indexOf('async updateProduct');
  const block = database.slice(i, i + 1400);
  assert.ok(/city:\s*'city'/.test(block),
    'المدينةُ تُكتب مرّةً ولا تُعدَّل — التاجرُ الذي انتقل لا يستطيع تصحيحَها');
});

test('البحثُ بالمدينة يعتمد مدينةَ الإعلان قبل مدينة المتجر', () => {
  // التاجرُ قد يبيع في مدينةٍ غير مدينة متجره. الزبونُ يبحث عمّا هو قربه.
  const i = database.indexOf('db.discoverProducts');
  const block = database.slice(i, i + 900);
  assert.ok(/COALESCE\(NULLIF\(p\.city/.test(block),
    'البحثُ بالمدينة يتجاهل مدينةَ الإعلان');
});
