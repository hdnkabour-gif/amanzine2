import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideInterface } from '../../src/lib/interfaceDecision';

// ============================================================
// طبقةُ الواجهة — تترجم **حكمًا** إلى شكل، ولا تحكم بنفسها.
//
//   كانت تقرأ `confidence` وتقارنها بعتباتها الخاصّة، فتُخالف
//   `decideExecution` على الجملة نفسِها: الحَكَمُ يقول «نفّذ» (بعتبةٍ تتبع
//   خطورةَ القدرة) والواجهةُ تقول «أكّد» (بعتبةٍ عامّةٍ لا تعرف الخطورة).
//   الآن الحكمُ مُدخَلٌ مُلزِم، والشكلُ نتيجةٌ له.
// ============================================================

test('حكمُ التنفيذ + وجهةٌ جاهزة → نتيجة مباشرة', () => {
  assert.equal(decideInterface({ intent: 'find_pro', url: '/market' }, 'execute').mode, 'direct');
});

test('يوجد سؤالٌ موجّه → guided («عندي مشكل فالدار»)', () => {
  assert.equal(decideInterface({ intent: 'find_pro', steps: [{}] }, 'ask').mode, 'guided');
});

test('حكمُ التأكيد → confirm («فهمت أنّك… صح؟»)', () => {
  assert.equal(decideInterface({ intent: 'sell', page: 'publish' }, 'confirm').mode, 'confirm');
});

// HU-2 — تغييرُ سلوكٍ مقصود: كان المُدخلُ غيرُ المفهوم يُرَدّ بترحيبٍ، وهو
// «ما فهمناش» بلباسٍ مهذَّب. صار يُرَدّ بسؤالٍ عن الناقص.
test('مُدخلٌ لم نفهمه → استيضاحٌ لا ترحيب', () => {
  assert.equal(decideInterface({ intent: 'unknown' }, 'ask').mode, 'clarify');
});

test('الترحيبُ لِمَن لم يكتب بعد — وحدَه', () => {
  assert.equal(decideInterface({ intent: 'unknown', hasInput: false }, 'ask').mode, 'welcome');
});

test('بعد استيضاحين بلا ارتفاعٍ في الفهم → إنسان', () => {
  assert.equal(decideInterface({ intent: 'unknown', askedCount: 2 }, 'ask').mode, 'escalate');
});

test('حكمُ تنفيذٍ بلا وجهة لا يُوصّل مباشرة — لا direct دون هدف', () => {
  assert.notEqual(decideInterface({ intent: 'sell' }, 'execute').mode, 'direct');
});

test('قرارٌ واحدٌ فقط، ولكلّ قرارٍ سبب', () => {
  const d = decideInterface({ intent: 'buy', url: '/market' }, 'confirm');
  assert.ok(d.reason.length > 3);
});

// ── الحكمُ الذي لم يكن له شكل ─────────────────────────────────
//
//   `explain` («قال ليا الزبون بغيت نرجّع») كان يصدر عن الحَكَم ولا شكلَ له
//   في الواجهة، فيُعرَض نصُّه فوق واجهةٍ بُنيت على حسابٍ آخر.
test('ما ليس طلبًا يُشرَح ولا يُسأل عنه', () => {
  assert.equal(decideInterface({ intent: 'find_pro' }, 'explain').mode, 'explain');
});

test('الشرحُ يسبق السؤالَ الموجّه — من نقل كلامَ غيره لا يُستوضَح', () => {
  // خطواتٌ جاهزةٌ + حكمُ شرح ⇒ الشرحُ يفوز. لولا الترتيب لسُئل «شنو نوع
  // الخدمة؟» شخصٌ لم يطلب خدمةً أصلًا.
  assert.equal(decideInterface({ intent: 'find_pro', steps: [{}] }, 'explain').mode, 'explain');
});

// ── حارسُ الانقسام ────────────────────────────────────────────
//
//   لا يجوز أن يعود شكلُ الواجهة يُشتقّ من الثقة. الحكمُ وحدَه يقرّر،
//   والثقةُ تُقرأ في `executionPolicy` وحدَها — حيث تُقارَن بعتبةٍ تعرف
//   الخطورة. هذا الاختبارُ يسقط لو أُعيد إلى الواجهة أيُّ حسابٍ للثقة.
test('الثقةُ لا تُغيّر الشكلَ — الحكمُ وحدَه يفعل', () => {
  for (const confidence of [0, 0.3, 0.6, 0.95, 1]) {
    const d = decideInterface({ intent: 'sell', url: '/market', confidence } as any, 'confirm');
    assert.equal(d.mode, 'confirm', `ثقةٌ ${confidence} بدّلت الشكلَ رغم ثباتِ الحكم`);
  }
});
