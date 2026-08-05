import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMood } from '../../src/lib/akg/kb/mood';
import { understand } from '../../src/lib/akg/kb';

// ============================================================
// صيغةُ الكلام — سبعُ صيغٍ كانت تُقرأ كلُّها «يريد أن يبيع».
//
//   وأخطرُها النقلُ عن غيره: «قال ليا الزبون بغيت نرجع السلعة» كانت ستبدأ
//   **إرجاعًا لم يطلبه أحد**. وهو أسوأُ صنفٍ من الخطأ: الإنسانُ يجد أثرَه
//   ولم يفعله.
//
//   والحدُّ محروسٌ أيضًا: `commit` هي الافتراضيّ. تطبيقٌ يخاف من كلّ جملةٍ
//   لا ينفّذ شيئًا أبدًا.
// ============================================================

test('الالتزامُ يُنفَّذ — وهو الافتراضيّ', () => {
  for (const s of ['بغيت نبيع قميص', 'زيد محل جديد', 'بدل رقم الهاتف', 'عندي محل ديال الخضرة']) {
    const m = readMood(s);
    assert.equal(m.executable, true, `عُطِّلت جملةُ التزام: «${s}»`);
    assert.equal(m.mood, 'commit');
  }
});

test('النقلُ عن غيره لا يُنفَّذ — ولا يبدأ إرجاعًا لم يطلبه أحد', () => {
  const m = readMood('قال ليا الزبون بغيت نرجع السلعة');
  assert.equal(m.mood, 'reported');
  assert.equal(m.executable, false);
  assert.match(m.say, /كتحكي على شي حد/);
});

test('«الزبون بغا يشري» حكايةٌ لا طلب', () => {
  assert.equal(readMood('الزبون بغا يشري قميص').mood, 'reported');
});

test('التردّدُ ليس قرارًا', () => {
  assert.equal(readMood('يمكن نبيع القميص').mood, 'tentative');
  assert.equal(readMood('يمكن نبيع القميص').executable, false);
});

test('الشرطُ ينتظر تحقّقَه', () => {
  const m = readMood('إلى كان الثمن مناسب غادي نبيع');
  assert.equal(m.mood, 'conditional');
  assert.equal(m.executable, false);
});

test('«كيفاش نبيع» تعلُّمٌ لا نشر', () => {
  const m = readMood('كيفاش نبيع قميص');
  assert.equal(m.mood, 'howto');
  assert.match(m.say, /نشرح/);
});

test('«واش نقدر نبيع» استفسارُ إمكان', () => {
  assert.equal(readMood('واش نقدر نبيع قميص').mood, 'capability');
});

test('الماضي وقع وانتهى', () => {
  assert.equal(readMood('بعت قميص البارح').mood, 'past');
});

test('الأشملُ يغلب: النقلُ يُحيط بالترّدد', () => {
  // «قال ليا الزبون يمكن نبيع» — نقلٌ أوّلًا، فهو يُحيط بالجملة كلِّها.
  assert.equal(readMood('قال ليا الزبون يمكن نبيع').mood, 'reported');
});

test('موصولٌ بالفهم، ولا يكسر ما كان يعمل', () => {
  const u = understand('قال ليا الزبون بغيت نرجع السلعة');
  assert.equal(u.mood?.executable, false);
  // وحارسُ ارتداد: الالتزامُ يبقى منفَّذًا.
  assert.equal(understand('بغيت نبيع كسيوات ديال الدراري').mood?.executable, true);
  assert.equal(understand('بغيت نبيع كسيوات ديال الدراري').service, 'kids_clothing');
});
