import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideExecution, explainDecision } from '../../src/lib/executionPolicy';
import { understand } from '../../src/lib/akg/kb';

// ============================================================
// سياسةُ التنفيذ — المكانُ الوحيد الذي يقول «نفّذ أم لا».
//
//   كان القرارُ مبعثرًا في أربعة ملفّات، وخطرُ التبعثر ليس الفوضى بل
//   **الثقب**: طبقةٌ تقول «لا أعرف» وأخرى تقول «واثق»، فيُنفَّذ الفعلُ لأنّ
//   أحدًا لم يجمع الصوتَين — ولا يمكن اختبارُ الحصيلة إطلاقًا.
//
//   والترتيبُ هنا **جزءٌ من المعنى**، وأهمُّه الأوّل: **الوضوحُ ليس إذنًا**.
// ============================================================

const U = (o: any) => ({ capabilities: [], concepts: [], context: {}, reasoning: [], confidence: 0.95, ...o }) as any;

test('الوضوحُ ليس إذنًا — النقلُ عن غيره لا يُنفَّذ ولو بلغت الثقةُ ١٠٠٪', () => {
  const u = understand('قال ليا الزبون بغيت نرجع السلعة');
  const d = decideExecution({ ...u, confidence: 1 } as any);
  assert.equal(d.verdict, 'explain');
  assert.match(d.trace[0], /صيغة/);
});

test('النفيُ يسأل ولا يُنفّذ ولا يُخمّن عكسًا', () => {
  const d = decideExecution(U({ negated: true }));
  assert.equal(d.verdict, 'ask');
  assert.match(d.say, /شنو بغيتي/);
});

test('ما لا نقدر عليه يُرفَض بصراحة — لا فعلَ ناقصٌ يُوهم', () => {
  const d = decideExecution(U({}), false);
  assert.equal(d.verdict, 'refuse');
  assert.match(d.say, /ما نقدرش/);
});

test('الغموضُ يسأل بسؤال المفهوم نفسِه', () => {
  const d = decideExecution(U({ ambiguity: { term: 'موطور', ask: 'موطور ديال الطوموبيل، ولا درّاجة؟', options: [] } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'موطور ديال الطوموبيل، ولا درّاجة؟');
});

test('النقصُ المعلوم يسأل سؤالًا واحدًا — لا استمارة', () => {
  const d = decideExecution(U({ action: { verb: 'update', object: 'price', scope: 'workspace', needs: ['أيّ منتج؟'], confidence: .7, reason: '' } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'أيّ منتج؟');
});

test('ما لا يُسترجَع يُؤكَّد — ولو كان الفهمُ تامًّا', () => {
  const d = decideExecution(U({ action: { verb: 'delete', object: 'workspace', scope: 'workspace', needs: ['تأكيد: هذا لا يُسترجَع'], confidence: .7, reason: '' } }));
  assert.equal(d.verdict, 'confirm');
  assert.match(d.say, /ما كيرجعش/);
});

test('اليقينُ العالي ينفّذ بلا سؤال', () => {
  assert.equal(decideExecution(U({ confidence: 0.95 })).verdict, 'execute');
});

test('اليقينُ المتوسّط يؤكّد، والضعيفُ يسأل', () => {
  assert.equal(decideExecution(U({ confidence: 0.7 })).verdict, 'confirm');
  assert.equal(decideExecution(U({ confidence: 0.2 })).verdict, 'ask');
});

// ── الترتيبُ جزءٌ من المعنى ───────────────────────────────────
test('الصيغةُ تسبق النفيَ والغموضَ والثقة', () => {
  const u = understand('قال ليا الزبون بغيت نرجع السلعة');
  const d = decideExecution({ ...u, negated: true, ambiguity: { term: 'x', ask: 'y', options: [] }, confidence: 1 } as any);
  assert.equal(d.verdict, 'explain', 'حسمت طبقةٌ أدنى قبل الصيغة');
});

test('حدُّ القدرة يسبق الغموض — لا نسأل عمّا لا نستطيع فعلَه', () => {
  const d = decideExecution(U({ ambiguity: { term: 'x', ask: 'y', options: [] } }), false);
  assert.equal(d.verdict, 'refuse');
});

test('التأكيدُ يأتي بعد اكتمال الفهم لا قبله', () => {
  // حذفٌ + نقصٌ حقيقيّ ⇒ نسأل عن النقص أوّلًا. سؤالُ التأكيد على فعلٍ لم
  // نفهمه بعد يجعل الإنسانَ يؤكّد شيئًا لا يعرفه.
  const d = decideExecution(U({ action: { verb: 'delete', object: 'product', scope: 'workspace', needs: ['أيّ منتج؟', 'تأكيد: هذا لا يُسترجَع'], confidence: .5, reason: '' } }));
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'أيّ منتج؟');
});

test('كلُّ قرارٍ يحمل أثرَه — يُعرَض عند الشكوى ويُصحَّح به', () => {
  const d = decideExecution(U({ confidence: 0.95 }));
  assert.ok(d.trace.length, 'قرارٌ بلا أثر');
  assert.match(explainDecision(d), /execute ←/);
});
