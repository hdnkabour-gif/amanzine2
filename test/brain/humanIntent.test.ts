import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHuman } from '../../src/lib/humanIntent';
import { parseNeed } from '../../src/lib/needEngine';

// ============================================================
// طبقة النيّة الإنسانيّة — الحالات التي كشفها الاستعمال الحقيقيّ.
// كلّ اختبارٍ يمثّل جملةً كتبها مستخدمٌ فعليّ وأخطأ فيها المحرّك قبل الطبقة.
// ============================================================

test('«أنا تقني متخصّص» = تعريفٌ بالنفس، لا إعلان', () => {
  assert.equal(readHuman('أنا تقني متخصص').intent, 'SELF');
  const r = parseNeed('أنا تقني متخصص');
  assert.equal(r.intent, 'create_service');
  assert.ok(r.open, 'يجب أن يرحّب');
  assert.ok(r.steps && r.steps.length, 'يجب أن يسأل شنو نوع الخدمة');
});

test('«أنا حرفي» = تعريفٌ بالنفس', () => {
  assert.equal(readHuman('أنا حرفي').intent, 'SELF');
  const r = parseNeed('أنا حرفي');
  assert.ok(r.steps && r.steps[0].q.includes('الخدمة'));
});

test('«عندي مشكل فالدار» = مساعدة، لا عقار (الفخّ الأصليّ)', () => {
  assert.equal(readHuman('عندي مشكل فالدار').intent, 'HELP');
  const r = parseNeed('عندي مشكل فالدار');
  assert.equal(r.intent, 'find_pro');
  assert.notEqual(r.intent, 'sell');
  assert.ok(r.steps && r.steps[0].q.includes('المشكل'));
});

test('«أنا كنبيع» = نيّة بيعٍ مبهمة → نسأل شنو', () => {
  assert.equal(readHuman('أنا كنبيع').intent, 'SELL');
  const r = parseNeed('أنا كنبيع');
  assert.equal(r.intent, 'sell');
  assert.ok(r.steps && r.steps[0].q.includes('تبيع'), 'يسأل شنو باغي تبيع');
});

test('«بغيت نشري» = نيّة شراءٍ مبهمة → نسأل شنو', () => {
  assert.equal(readHuman('بغيت نشري').intent, 'BUY');
  const r = parseNeed('بغيت نشري');
  assert.ok(r.steps && r.steps[0].q.includes('تشري'));
});

test('«واش ممكن تعاوني؟» = سؤالٌ عامّ → ترحيبٌ وإرشاد', () => {
  assert.equal(readHuman('واش ممكن تعاوني').intent, 'QUESTION');
  const r = parseNeed('واش ممكن تعاوني');
  assert.ok(r.open && r.steps, 'يرحّب ويقترح مسارات');
});

test('«غير جيت نشوف» = تصفّح → استقبالٌ ورحلةُ اكتشاف', () => {
  assert.equal(readHuman('غير جيت نشوف').intent, 'EXPLORE');
  const r = parseNeed('غير جيت نشوف');
  assert.ok(r.open && r.steps, 'يرحّب ويقترح مداخل تصفّح');
});

test('«غير كنجرب» = تصفّح (لا بيع رغم غياب هدف)', () => {
  assert.equal(readHuman('غير كنجرب').intent, 'EXPLORE');
});

// ── الحالات المحدّدة يجب أن تمرّ للمحرّك بلا اعتراض (عدم كسر ما يعمل) ──

test('«الماء كيقطر ضروري» = عَرَضٌ موصوف → المحرّك (عاجل/سبّاك)، لا الطبقة', () => {
  assert.equal(readHuman('الماء كيقطر ضروري').intent, 'NONE');
  const r = parseNeed('الماء كيقطر ضروري');
  assert.equal(r.intent, 'urgent');
});

test('«بغيت نشري لبنتي صباط» = سلعةٌ محدّدة → شراء بالمحرّك، لا سؤالٌ مبهم', () => {
  assert.equal(readHuman('بغيت نشري لبنتي صباط').intent, 'NONE');
  const r = parseNeed('بغيت نشري لبنتي صباط');
  assert.equal(r.intent, 'buy');
});

test('«بغيت سباك» = مهنةٌ مطلوبةٌ باسمها → المحرّك (find_pro)، لا SELF', () => {
  assert.equal(readHuman('بغيت سباك').intent, 'NONE');
  const r = parseNeed('بغيت سباك');
  assert.ok(['find_pro', 'urgent'].includes(r.intent));
});

test('كلّ قراءةٍ تحمل سببًا قابلًا للشرح', () => {
  for (const q of ['أنا حرفي', 'عندي مشكل فالدار', 'أنا كنبيع', 'بغيت نشري']) {
    assert.ok(readHuman(q).reason.length > 3, `سبب مفقود لـ «${q}»`);
  }
});
