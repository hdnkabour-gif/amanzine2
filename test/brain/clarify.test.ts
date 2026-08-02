import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clarify, nextClarification, applyAnswer, CONFIDENCE, MAX_CLARIFICATIONS, CLARIFICATION_IDS,
  type Signals,
} from '../../src/lib/clarify';

// ============================================================
// محرّك الاستيضاح — HU-2.
//   القاعدةُ التي تحرسها هذه الاختبارات: **السؤالُ يُشتقّ من الناقص، لا من
//   النصّ**. لذلك لا جملةَ مستخدمٍ واحدةً في أيّ اختبارٍ هنا — الإشاراتُ فقط.
// ============================================================

test('يقينٌ عالٍ ⇒ لا سؤال إطلاقًا', () => {
  assert.equal(clarify({ confidence: 0.95 }).mode, 'act');
  assert.equal(clarify({ confidence: CONFIDENCE.ACT }).mode, 'act', 'الحدُّ نفسُه ينفّذ');
});

test('يقينٌ متوسّط ⇒ تأكيدٌ لا استيضاح (HU-4)', () => {
  assert.equal(clarify({ confidence: 0.83 }).mode, 'confirm');
  assert.equal(clarify({ confidence: CONFIDENCE.CONFIRM }).mode, 'confirm', 'الحدُّ نفسُه يؤكّد');
  assert.equal(clarify({ confidence: CONFIDENCE.CONFIRM - 0.01 }).mode, 'clarify');
});

test('يقينٌ منخفض ⇒ سؤالٌ عن الناقص، لا اعتذار', () => {
  const d = clarify({ confidence: 0.42 });
  assert.equal(d.mode, 'clarify');
  assert.ok(d.clarification, 'وضعُ الاستيضاح بلا سؤال = «ما فهمناش» بلباسٍ آخر');
  // مثالُ ChatGPT حرفيًّا: «عندي مشكل» ⇒ ثقة 0.42 ⇒ «المشكل مع شنو؟»
  assert.equal(d.clarification!.id, 'missing_target');
  assert.equal(d.clarification!.options.length, 5);
});

test('السؤالُ يُشتقّ من السبب — الناقصُ هو ما يُسأل عنه', () => {
  // يعرف الهدفَ ولا يعرف الاتّجاه ⇒ يسأل عن الاتّجاه لا عن الهدف.
  const d = clarify({ confidence: 0.3, target: 'product' });
  assert.equal(d.clarification!.reason, 'missing_direction');
  // يعرف الاثنين ⇒ ينزل لما بعدهما.
  const d2 = clarify({ confidence: 0.3, target: 'product', direction: 'want' });
  assert.equal(d2.clarification!.reason, 'missing_object');
});

test('«فين؟» لا تُسأل قبل «شنو؟» — سؤالٌ في الفراغ يُفقد الثقة', () => {
  // بلا هدفٍ معروف، المكانُ ليس مرشّحًا أصلًا.
  const early = nextClarification({ confidence: 0.2 });
  assert.notEqual(early!.id, 'missing_place');
  // وبعد معرفة الهدف والاتّجاه والكائن، يصير المكانُ هو الناقص.
  const later = nextClarification({ confidence: 0.2, target: 'service', direction: 'want', hasObject: true });
  assert.equal(later!.id, 'missing_place');
});

test('لكلّ سؤالٍ هويّةٌ ثابتة ولكلّ خيارٍ هويّة — لا نصوصَ تُقاس', () => {
  for (const id of CLARIFICATION_IDS) {
    const c = nextClarification({ confidence: 0, asked: CLARIFICATION_IDS.filter(x => x !== id) });
    if (!c) continue;
    assert.equal(typeof c.id, 'string');
    assert.equal(c.id, c.reason, 'الهويّة والسبب يجب أن يتطابقا أو يُفصّلا صراحةً');
    for (const o of c.options) {
      assert.ok(o.id && typeof o.id === 'string', `${c.id}: خيارٌ بلا هويّة`);
      assert.ok(o.label, `${c.id}/${o.id}: خيارٌ بلا نصّ`);
      assert.ok(o.gives && Object.keys(o.gives).length > 0, `${c.id}/${o.id}: جوابٌ لا يُضيف شيئًا للفهم`);
    }
  }
});

test('لا يُسأل السؤالُ نفسُه مرّتين', () => {
  const s: Signals = { confidence: 0.3 };
  const first = clarify(s).clarification!;
  const after = applyAnswer(s, first.id, first.options[0].id);
  const second = clarify(after).clarification;
  assert.notEqual(second?.id, first.id);
});

test('الجوابُ يرفع الفهم — لا يُسجَّل ويُهمَل', () => {
  const s: Signals = { confidence: 0.3 };
  const after = applyAnswer(s, 'missing_target', 'order');
  assert.equal(after.target, 'order', 'الجوابُ لم يُدمَج في الإشارات');
  assert.deepEqual(after.asked, ['missing_target']);
});

test('بعد استيضاحين بلا ارتفاع ⇒ إنسان، لا سؤالٌ ثالث', () => {
  const s: Signals = { confidence: 0.3, asked: ['missing_target', 'missing_direction'] };
  assert.equal((s.asked || []).length, MAX_CLARIFICATIONS);
  const d = clarify(s);
  assert.equal(d.mode, 'escalate');
  assert.ok(!d.clarification, 'التصعيدُ لا يحمل سؤالًا');
});

test('ارتفاعُ الثقة بعد الجواب يوقف الأسئلة فورًا', () => {
  // هذا هو المقياسُ الذي تُسجَّل له البيانات: هل ارتفع الفهمُ بعد السؤال؟
  const before: Signals = { confidence: 0.41 };
  assert.equal(clarify(before).mode, 'clarify');
  const after: Signals = { ...applyAnswer(before, 'missing_target', 'order'), confidence: 0.92 };
  assert.equal(clarify(after).mode, 'act', 'ثقةٌ ارتفعت ولا يزال يسأل = سؤالٌ زائد');
});

test('كلُّ قرارٍ يشرح نفسَه (ADR-0003)', () => {
  for (const c of [0.95, 0.7, 0.4]) {
    assert.ok(clarify({ confidence: c }).why, `قرارٌ بلا سبب عند ${c}`);
  }
});

// ── حراسةٌ على القاعدة نفسِها ────────────────────────────────────────────────
//
//   شرطُ التصميم: **لكلّ سؤالٍ هويّةٌ ثابتة، ولكلّ خيارٍ هويّة**. بلا ذلك لا
//   يمكن قياسُ أيِّ سؤالٍ يرفع الفهم — والقياسُ نصفُ الفائدة. سؤالٌ جديدٌ
//   يُكتب غدًا بلا هويّة يسقط هنا، لا في البيتا.
import { parseNeed } from '../../src/lib/needEngine';

const PHRASES = [
  'عندي مشكل', 'شنو هادشي', 'bghit chi haja', 'بغيت نبيع', 'بغيت نشري',
  'أنا مزوّد خدمة', 'غير كنجرّب', 'بغيت طبيب', 'دار للكراء', 'بغيت سباك',
];

test('كلُّ سؤالٍ يصل المستخدمَ يحمل هويّةً — لا نصًّا بلا اسم', () => {
  const seen = new Set<string>();
  for (const phrase of PHRASES) {
    const r = parseNeed(phrase, {});
    for (const step of r.steps || []) {
      assert.ok(step.clarifyId, `«${phrase}» → سؤالٌ بلا هويّة: «${step.q}»`);
      seen.add(step.clarifyId!);
      for (const o of step.options) {
        assert.ok(o.id, `«${phrase}»/${step.clarifyId} → خيارٌ بلا هويّة: «${o.label}»`);
      }
    }
  }
  assert.ok(seen.size >= 4, `أسئلةٌ قليلةٌ فُحصت (${seen.size}) — التغطية ضعيفة`);
});

test('الهويّاتُ فريدة داخل السؤال الواحد', () => {
  for (const phrase of PHRASES) {
    const r = parseNeed(phrase, {});
    for (const step of r.steps || []) {
      const ids = step.options.map(o => o.id);
      assert.equal(new Set(ids).size, ids.length, `${step.clarifyId}: هويّاتٌ مكرّرة`);
    }
  }
});
