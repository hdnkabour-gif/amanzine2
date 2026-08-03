'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { db } = require('../database');
const searchEngine = require('../lib/engines/search');

// ============================================================
// أن يجد الزبونُ ما نشره التاجر.
//
//   أخطرُ ما وجدناه في التدقيق، وأقلُّه ظهورًا: العقلُ كلُّه — ١٩٧ مفهومًا
//   بمرادفاتٍ بالدارجة والعربيّة والفرنسيّة والـArabizi — كان يخدم **التاجرَ
//   وحدَه**. والزبونُ يقابله:
//
//       LOWER(name) LIKE '%…%' OR LOWER(description) LIKE '%…%'
//
//   فمن كتب «بلومبي» أو «plombier» لا يجد سبّاكًا، ومن كتب «جلابه» بلا تاءٍ
//   مربوطة لا يجد «جلابة». ولا رسالةَ خطأ — نتيجةٌ فارغةٌ فقط.
//
//   الطبقتان: الواجهةُ تفهم وتوسّع، والخادمُ يبحث. هذه الاختباراتُ تحرس
//   الطرفَ الثاني: أنّ المرادفاتِ تصل، وأنّ التطبيعَ العربيَّ يعمل.
// ============================================================

const HAS_DB = !!process.env.DATABASE_URL;
const skip = HAS_DB ? false : 'يتطلّب DATABASE_URL';

let userId, ids = [];

test('تهيئة', { skip }, async () => {
  const u = await db.createUser({ email: `search_${Date.now()}@t.ma`, password: 'x', name: 'بائع' });
  userId = u.id;
  const mk = async (name, description, category, city) => {
    const p = await db.createProduct({ userId, name, description, category, city, price: 100, status: 'published' });
    ids.push(p.id); return p;
  };
  await mk('جلابة رجالية', 'جلابة صوف', 'ملابس رجال', 'الدار البيضاء');
  await mk('خدمة سباكة', 'إصلاح تسربات المياه وفتح المجاري', 'خدمة', 'الرباط');
  await mk('Golf 2018', 'طوموبيل نظيفة', 'سيارات وقطع غيار', 'الدار البيضاء');
});

test('البحثُ الحرفيُّ يجد ما طابق حرفيًّا', { skip }, async () => {
  const r = await db.discoverProducts({ q: 'جلابة' });
  assert.ok(r.some(p => p.name.includes('جلابة')), 'حتّى المطابقةُ الحرفيّةُ لا تعمل');
});

test('التطبيعُ العربيّ: «جلابه» بلا تاءٍ مربوطةٍ تجد «جلابة»', { skip }, async () => {
  // أكثرُ ما يكتبه المغاربةُ على الهاتف: بلا تشكيلٍ وبهاءٍ بدل التاء المربوطة.
  const r = await db.discoverProducts({ q: 'جلابه' });
  assert.ok(r.some(p => p.name.includes('جلابة')),
    '«جلابه» لا تجد «جلابة» — التطبيعُ العربيُّ لا يصل إلى الفهرس');
});

test('التطبيعُ يعمل في الاتّجاهين: همزةٌ مكتوبةٌ أو متروكة', { skip }, async () => {
  // `discoverProducts` لا تُرجع الوصفَ في البطاقة، فالتحقّقُ بالعثور لا بمحتواه.
  const r = await db.discoverProducts({ q: 'اصلاح تسربات' });
  assert.ok(r.some(p => p.name.includes('سباكة')),
    '«اصلاح» بلا همزة لا تجد «إصلاح» في الوصف — التطبيعُ لا يعمّ الأعمدة');
});

test('المرادفاتُ الموسَّعةُ تجد ما لا يجده النصُّ الخام', { skip }, async () => {
  // هذا هو جوهرُ الإصلاح: الزبونُ كتب «بلومبي»، والواجهةُ وسّعتها إلى
  // «سباك · Plombier · فتح المجاري»، فيجد الخادمُ ما لا تجده الكلمةُ وحدَها.
  const bare = await db.discoverProducts({ q: 'بلومبي' });
  assert.equal(bare.length, 0, 'المعطياتُ لا تحتوي «بلومبي» حرفيًّا — الاختبارُ نفسُه خاطئ');

  const expanded = await db.discoverProducts({ q: 'بلومبي', terms: ['سباك', 'سباكة', 'Plombier', 'فتح المجاري'] });
  assert.ok(expanded.length > 0,
    '«بلومبي» لا تجد سبّاكًا ولو أُرسلت مرادفاتُه — المرادفاتُ لا تصل إلى SQL');
});

test('المرادفةُ الفرنسيّةُ تصل كما تصل العربيّة', { skip }, async () => {
  const r = await db.discoverProducts({ q: 'voiture', terms: ['طوموبيل', 'سيارة'] });
  assert.ok(r.some(p => p.name.includes('Golf')), 'المرادفةُ العربيّةُ لا تُطابِق وصفَ المنتج');
});

test('حدُّ المرادفات محفوظ — لا استعلامَ ينفخه الزبون', { skip }, async () => {
  const many = Array.from({ length: 200 }, (_, i) => `مصطلح${i}`);
  const r = await db.discoverProducts({ q: 'جلابة', terms: many });
  assert.ok(Array.isArray(r), 'استعلامٌ بمئتَي مرادفٍ يجب أن يُقصَّ لا أن يفشل');
});

test('محرّكُ البحث يمرّر المرادفاتِ ولا يبتلعها', { skip }, async () => {
  const out = await searchEngine.execute({ q: 'بلومبي', terms: ['سباك', 'فتح المجاري'], limit: 10 });
  assert.ok(out, 'المحرّكُ لم يُرجع شيئًا');
  // نيّةُ الخدمة تُعرَف من المرادفات، لا من النصّ الخامّ وحدَه.
  assert.equal(out.intent.kind, 'service',
    '«بلومبي» + مرادفاتُها لا تُعرَف نيّةَ خدمة — المرادفاتُ لا تبلغ detectIntent');
});

test('تنظيف', { skip }, async () => {
  for (const id of ids) await db.deleteProduct(id).catch(() => {});
  if (userId) await db.deleteUser?.(userId).catch(() => {});
});
