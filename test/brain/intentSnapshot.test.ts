import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  openSnapshot, askClarification, answerClarification, confirmSnapshot, withDestination,
  resolved, pending, remaining, confidenceGain, stageOf, toTelemetry, summarize,
} from '../../src/lib/intentSnapshot';
import { CONFIDENCE } from '../../src/lib/clarify';

// ============================================================
// Intent Snapshot — عقدُ الطلب.
//   القاعدةُ المحروسة هنا: **ما يُشتقّ لا يُخزَّن**. `stage` و`resolved`
//   و`remaining` دوالُّ لا حقول؛ لو صارت حقولًا لصار في النظام حقيقتان.
// ============================================================

const open = (conf = 0.4) => openSnapshot('عندي مشكل', { intent: 'unknown', confidence: conf });

test('اللقطةُ تحفظ ما قاله الإنسانُ كما قاله', () => {
  const s = open();
  assert.equal(s.raw, 'عندي مشكل');
  assert.ok(s.id.startsWith('sn_'), 'لقطةٌ بلا هويّة لا تُرافق شيئًا');
});

test('المشتقّاتُ ليست حقولًا — لا حقيقتان في النظام', () => {
  const s = open();
  const keys = Object.keys(s);
  for (const derived of ['stage', 'resolved', 'remaining', 'gain']) {
    assert.ok(!keys.includes(derived), `«${derived}» مُخزَّنٌ — يجب أن يُشتقّ`);
  }
  assert.equal(typeof stageOf(s), 'string');
  assert.ok(Array.isArray(resolved(s)));
});

test('المرحلةُ تتبع الثقة بنفس نطاقات محرّك الاستيضاح', () => {
  assert.equal(stageOf(open(0.95)), 'act');
  assert.equal(stageOf(open(CONFIDENCE.ACT)), 'act');
  assert.equal(stageOf(open(CONFIDENCE.CONFIRM)), 'confirm');
  assert.equal(stageOf(open(CONFIDENCE.CONFIRM - 0.01)), 'clarify');
});

test('اللقطةُ لا تتغيّر — كلُّ خطوةٍ تُنتج نسخة', () => {
  const a = open();
  const b = askClarification(a, 'missing_target');
  assert.equal(a.clarifications.length, 0, 'اللقطةُ الأصليّة تغيّرت');
  assert.equal(b.clarifications.length, 1);
  assert.notEqual(a, b);
});

test('السؤالُ لا يُسجَّل مرّتين — العدّادُ يقيس الحوارَ لا إعادةَ الرسم', () => {
  let s = open();
  s = askClarification(s, 'missing_target');
  s = askClarification(s, 'missing_target');
  assert.equal(s.clarifications.length, 1);
});

test('الجوابُ يُسجَّل بهويّته، ويُقاس ارتفاعُ الفهم', () => {
  let s = open(0.41);
  s = askClarification(s, 'missing_target');
  s = answerClarification(s, 'missing_target', 'order', { confidence: 0.92, signals: { target: 'order' } });
  const rec = s.clarifications[0];
  assert.equal(rec.answeredWith, 'order', 'الهويّةُ لا النصّ');
  assert.equal(rec.confidenceBefore, 0.41);
  assert.equal(rec.confidenceAfter, 0.92);
  assert.equal(confidenceGain(s), 0.51);
  assert.equal(s.signals.target, 'order', 'الجوابُ لم يُدمَج في الإشارات');
  assert.equal(stageOf(s), 'act', 'ثقةٌ ارتفعت والمرحلةُ لم تتبعها');
});

test('resolved / pending / remaining تفصل الثلاثةَ بوضوح', () => {
  let s = open(0.3);
  s = askClarification(s, 'missing_target');
  s = answerClarification(s, 'missing_target', 'service', { signals: { target: 'service' }, confidence: 0.5 });
  s = askClarification(s, 'missing_direction');
  assert.deepEqual(resolved(s), ['missing_target']);
  assert.deepEqual(pending(s), ['missing_direction']);
  // الباقي يأتي من محرّك الاستيضاح لا من قائمةٍ ثانيةٍ مكتوبةٍ هنا.
  const rest = remaining(s);
  assert.ok(!rest.includes('missing_target'), 'ما أُجيب لا يبقى «باقيًا»');
  assert.ok(!rest.includes('missing_direction'), 'ما سُئل لا يبقى «باقيًا»');
});

test('جوابٌ على سؤالٍ لم يُسجَّل طرحُه لا يُفقَد', () => {
  let s = open(0.3);
  s = answerClarification(s, 'missing_target', 'store', { confidence: 0.8 });
  assert.equal(s.clarifications.length, 1);
  assert.equal(s.clarifications[0].answeredWith, 'store');
});

test('بعد سؤالين بلا ارتفاعٍ كافٍ ⇒ تصعيد', () => {
  let s = open(0.3);
  s = askClarification(s, 'missing_target');
  s = answerClarification(s, 'missing_target', 'other', { confidence: 0.35 });
  s = askClarification(s, 'missing_direction');
  s = answerClarification(s, 'missing_direction', 'want', { confidence: 0.4 });
  assert.equal(stageOf(s), 'escalate');
});

test('التأكيدُ يُغلق الطلبَ، والرفضُ لا', () => {
  const s = open(0.7);
  assert.equal(stageOf(confirmSnapshot(s, true)), 'done');
  assert.equal(stageOf(confirmSnapshot(s, false)), 'confirm', 'رفضُ الفهم لا يُنهي الطلب');
  assert.equal(s.confirmed, null, 'اللقطةُ الأصليّة تغيّرت');
});

test('التخاطُر (telemetry) لا يحمل نصَّ المستخدم إلّا بطلب', () => {
  let s = open(0.5);
  s = askClarification(s, 'missing_target');
  s = withDestination(s, { url: '/market' });
  const t = toTelemetry(s);
  assert.ok(!('raw' in t), 'نصُّ المستخدم يُرسَل بلا طلب');
  assert.equal(t.id, s.id);
  assert.equal(t.stage, stageOf(s));
  assert.deepEqual(t.clarifications, ['missing_target']);
  assert.ok('raw' in toTelemetry(s, { includeRaw: true }));
});

test('الملخّصُ يُبنى من العقد لا من الصفحة', () => {
  let s = open(0.4);
  s = answerClarification(s, 'missing_target', 'service', { signals: { target: 'service', direction: 'want' }, confidence: 0.8 });
  const text = summarize(s, { service: 'خدمة' });
  assert.ok(text.includes('خدمة'), `ملخّصٌ لا يذكر ما فُهم: «${text}»`);
  assert.ok(text.includes('كتقلّب'));
});

test('الملاذُ الأخير لا يُعَدّ نقصًا — «ما بقي» لا يَعِد بسؤالٍ بلا معنى', () => {
  // اكتُشف بتشغيل الحلقة كاملةً: `no_signal` يطابق دائمًا، فكان يظهر في
  // «ما بقي» ويوحي بأنّ هناك معلومةً ناقصةً وهو مجرّد ملاذ.
  let s = openSnapshot('عندي مشكل', { intent: 'find_pro', confidence: 0.5 });
  s = answerClarification(s, 'problem_kind', 'water', { confidence: 0.86, signals: { target: 'service' } });
  assert.ok(!remaining(s).includes('no_signal'), 'الملاذُ الأخير يُعَدّ نقصًا');
  assert.ok(!toTelemetry(s).remaining.includes('no_signal'));
});
