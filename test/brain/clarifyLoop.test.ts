import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clarify, applyAnswer, MAX_CLARIFICATIONS, type Signals, type ClarificationId } from '../../src/lib/clarify';
import { signalsFrom, clarificationStep, parseNeed } from '../../src/lib/needEngine';

// ============================================================
// الحلقةُ الكاملة — BROKEN_CHAINS#④.
//
//   `applyAnswer` و`escalate` كانتا مبنيّتين ومُختبَرتين ولا تُستدعيان من أيّ
//   شاشة: `pickOption` تذهب للوجهة مباشرةً. النتيجةُ استيضاحٌ واحدٌ عمليًّا،
//   ولا انتقالَ لإنسانٍ مهما طال العجز.
//
//   هذه الاختباراتُ تُحاكي ما تفعله `LivingHome` **بالضبط**: تشتقّ الإشارات،
//   تُطبّق الجواب، تسأل المحرّك. لو انقطعت الحلقةُ ثانيةً سقطت هنا.
// ============================================================

/** ما تفعله `pickOption` عند جوابٍ لا يحمل وجهة. */
function answerWithoutDestination(s: Signals, id: string, optionId: string): Signals {
  return applyAnswer(s, id as ClarificationId, optionId);
}

test('الإشاراتُ تُشتقّ من الفهم — لا تُخمَّن في كلّ شاشة', () => {
  const r = parseNeed('بغيت سباك فالدار البيضاء');   // نفسُ الجملة التي كانت تُقرأ «عقار»
  const s = signalsFrom(r);
  assert.equal(s.direction, 'want', 'طلبُ حِرفيٍّ أخذٌ لا عطاء');
  assert.equal(s.target, 'service');
  assert.equal(s.hasObject, true, 'المهنةُ مذكورة');
  assert.deepEqual(s.asked, []);
});

test('«بغيت نبيع» عرضٌ لا طلب', () => {
  const s = signalsFrom(parseNeed('بغيت نبيع تلفون'));
  assert.equal(s.direction, 'offer');
  assert.equal(s.target, 'product');
});

test('جوابٌ يُدمَج فيرتفع الفهم — سؤالٌ ثانٍ مبنيٌّ على الأوّل', () => {
  let s: Signals = { confidence: 0.1 };
  const first = clarify(s);
  assert.equal(first.mode, 'clarify');
  assert.equal(first.clarification!.id, 'missing_target', 'الأضيقُ أوّلًا');

  s = answerWithoutDestination(s, 'missing_target', 'service');
  assert.equal(s.target, 'service', 'الجوابُ دخل الإشارات — هذا ما كان يُرمى');

  const second = clarify(s);
  assert.equal(second.mode, 'clarify');
  assert.notEqual(second.clarification!.id, 'missing_target', 'لا يُعاد السؤالُ نفسُه');
  assert.deepEqual(s.asked, ['missing_target']);
});

test('بعد استيضاحين ننتقل لإنسان — ولا نسأل ثالثًا', () => {
  let s: Signals = { confidence: 0.1 };
  for (let i = 0; i < MAX_CLARIFICATIONS; i++) {
    const d = clarify(s);
    assert.equal(d.mode, 'clarify', `الدورة ${i + 1} يجب أن تسأل`);
    s = answerWithoutDestination(s, d.clarification!.id, d.clarification!.options[0].id);
  }
  const final = clarify(s);
  assert.equal(final.mode, 'escalate', 'الثالثُ إهانةٌ لا مساعدة');
  assert.ok(final.why.length > 0, 'كلُّ قرارٍ يُشرَح');
});

test('جوابٌ يحمل وجهةً يحسم — لا يُستدرَج المستخدمُ لسؤالٍ ثانٍ', () => {
  // ما تفعله `LivingHome`: وجهةٌ في الخيار ⇒ الثقةُ ≥ ACT.
  let s: Signals = { confidence: 0.1 };
  s = applyAnswer(s, 'missing_target', 'service');
  s = { ...s, confidence: 0.9 };
  assert.equal(clarify(s).mode, 'act');
});

test('كلُّ خيارٍ في الخطوة المُولَّدة له هويّةٌ ووجهة', () => {
  const d = clarify({ confidence: 0.1 });
  const step = clarificationStep(d.clarification!);
  assert.ok(step.clarifyId, 'الخطوةُ تحمل هويّةَ الاستيضاح فتُقاس');
  assert.ok(step.options.length > 0);
  for (const o of step.options) {
    assert.ok(o.id, `خيارٌ بلا هويّة: ${o.label}`);
    assert.ok(o.page || o.url, `خيارٌ بلا وجهة: ${o.label} — طريقٌ مسدود`);
  }
});

test('الملاذُ الأخيرُ لا يُعدّ نقصًا يُسأل عنه مرّتين', () => {
  let s: Signals = { confidence: 0.1, target: 'service', direction: 'want', hasObject: true, place: 'الدار البيضاء' };
  const d = clarify(s);
  // كلُّ شيءٍ معروفٌ والثقةُ منخفضة ⇒ إمّا ملاذٌ أخيرٌ واحد ثمّ إنسان.
  if (d.mode === 'clarify') {
    s = answerWithoutDestination(s, d.clarification!.id, d.clarification!.options[0].id);
    assert.equal(clarify(s).mode, 'escalate', 'بعد الملاذ الأخير: إنسان');
  } else {
    assert.equal(d.mode, 'escalate');
  }
});

// ============================================================
// اسمُ المدينة لا يهدم فهمَ الحاجة.
//
//   «بغيت سبّاك **فالدار البيضاء**» كانت تُقرأ طلبَ **عقار**: قاعدةُ العقار
//   تبحث عن «دار» كمقطعٍ فتجدها داخل اسم أكبر مدينةٍ في المغرب. أي أنّ ذِكرَ
//   مكانِك في تطبيقٍ مغربيّ كان يُفسد طلبَك. ولم تكن المدينةُ المكتوبةُ
//   تُلتقَط أصلًا: `location` تأتي من مدينة الحساب وحدَها.
// ============================================================

test('«فالدار البيضاء» لا تجعل طلبَ الحِرفيِّ عقارًا', () => {
  for (const q of ['بغيت سباك فالدار البيضاء', 'بغيت طبيب فالدار البيضاء', 'بغيت كوافير فالدار البيضاء']) {
    const r = parseNeed(q);
    assert.equal(r.intent, 'find_pro', `${q} → ${r.intent}`);
  }
});

test('كلُّ مدينةٍ سواء — لا استثناءَ لواحدة', () => {
  const base = parseNeed('بغيت سباك').intent;
  for (const city of ['فالرباط', 'فمراكش', 'فالدار البيضاء', 'فكازا', 'فطنجة', 'فاكادير']) {
    assert.equal(parseNeed(`بغيت سباك ${city}`).intent, base, `المدينة «${city}» غيّرت الفهم`);
  }
});

test('المدينةُ المكتوبةُ تُلتقَط، وتسبق مدينةَ الحساب', () => {
  assert.equal(parseNeed('بغيت سباك فالرباط').object?.location, 'الرباط');
  assert.equal(parseNeed('بغيت سباك فمراكش', { city: 'الدار البيضاء' }).object?.location, 'مراكش',
    'مَن كتب مدينةً يريدها هي، لا مدينةَ حسابه');
  assert.equal(parseNeed('بغيت سباك', { city: 'الدار البيضاء' }).object?.location, 'الدار البيضاء',
    'ومَن لم يكتب تُستعمل مدينةُ حسابه');
});

test('طلبُ العقار الحقيقيُّ ما زال عقارًا', () => {
  assert.equal(parseNeed('بغيت نكري دار فالدار البيضاء').intent, 'rent');
  assert.equal(parseNeed('بغيت نشري شقه فالرباط').intent, 'buy');
  assert.equal(parseNeed('بغيت نصبغ الدار').intent, 'find_pro', '«صباغة الدار» خدمةٌ لا عقار');
});
