import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knownAbout, enrichSignals, explainFilled } from '../../src/lib/knownContext';
import { clarify, type Signals } from '../../src/lib/clarify';

// ============================================================
// «لا يسأل التطبيقُ سؤالًا يعرف جوابَه».
//
//   قياسٌ كشف الخرق: `signalsFrom` تملأ المكانَ من الجملة الحاضرة وحدَها،
//   فالتاجرُ الذي قال مدينتَه الأسبوعَ الماضي يُسأل عنها ثانيةً.
//
//   وأخطرُ ما تحرسه هذه الاختباراتُ ليس الملءَ بل **حدَّه**: أن تملأ الذاكرةُ
//   الفراغَ ولا تُصحّح إنسانًا في حاضره. من كتب «انا ف طنجة» فهو في طنجة،
//   ولو قالت ذاكرتُنا غيرَ ذلك. «فهمٌ» يُعاند صاحبَه ليس فهمًا.
// ============================================================

const base: Signals = { intent: 'find_pro', confidence: 0.5, direction: 'want' };

test('الفراغُ يُملأ ممّا نعرف ⇒ لا يُسأل عن المدينة', () => {
  const { signals, filled } = enrichSignals(base, { city: 'الدار البيضاء' });
  assert.equal(signals.place, 'الدار البيضاء');
  assert.equal(filled.length, 1);
  assert.equal(filled[0].field, 'place');
});

test('الجملةُ الحاضرةُ تغلب الذاكرة — ولا تُمَسّ', () => {
  // «انا ف طنجة» اليوم. ذاكرتُنا تقول الدار البيضاء. الحاضرُ يفوز.
  const said: Signals = { ...base, place: 'طنجة' };
  const { signals, filled } = enrichSignals(said, { city: 'الدار البيضاء' });
  assert.equal(signals.place, 'طنجة', 'الذاكرةُ عاندت صاحبَها');
  assert.equal(filled.length, 0, 'ادّعى ملئًا لم يقع');
});

test('ما لا نعرفه لا يُخترَع', () => {
  const { signals, filled } = enrichSignals(base, {});
  assert.equal(signals.place, undefined);
  assert.deepEqual(filled, []);
});

test('صاحبُ المحلّ الذي يعرض ⇒ لا يُسأل «متجر ديالي؟»', () => {
  const { signals } = enrichSignals({ ...base, direction: 'offer' }, { hasWorkspace: true });
  assert.equal(signals.target, 'store');
});

test('صاحبُ المحلّ الذي **يطلب** يبقى يُسأل — الملكيّةُ ليست نيّة', () => {
  // من يملك محلًّا قد يبحث عن سبّاكٍ لبيته. وجودُ نشاطٍ لا يجعل كلَّ جملةٍ عنه.
  const { signals } = enrichSignals({ ...base, direction: 'want' }, { hasWorkspace: true });
  assert.equal(signals.target, undefined);
});

// ── الأثرُ الحقيقيّ: هل توقّف السؤال فعلًا؟ ────────────────────
test('الاستيضاحُ لا يطلب المكانَ بعد الإثراء', () => {
  // اختبارُ الأثر لا النيّة: `clarify` هي التي تسأل، فهي التي يجب أن تصمت.
  const poor: Signals = { intent: 'find_pro', confidence: 0.4, direction: 'want', hasObject: true };
  const before = clarify(poor);
  const after = clarify(enrichSignals(poor, { city: 'الدار البيضاء' }).signals);

  const asksPlace = (d: ReturnType<typeof clarify>) =>
    d.mode === 'ask' && /place|مدين/i.test(JSON.stringify(d));
  if (asksPlace(before)) {
    assert.equal(asksPlace(after), false, 'ما زال يسأل عن مدينةٍ يعرفها');
  }
});

// ── القراءةُ من الذاكرة ───────────────────────────────────────
test('ملفُّ الحساب أوثقُ من استنتاجٍ من كلامٍ سابق', () => {
  assert.equal(knownAbout({ city: 'أكادير' }).city, 'أكادير');
});

test('بلا ملفٍّ وبلا ذاكرةٍ ⇒ لا شيء، بلا انهيار', () => {
  assert.deepEqual(knownAbout(), {});
  assert.deepEqual(knownAbout({}), {});
});

test('الفراغُ والمسافاتُ لا تُحسَب معرفة', () => {
  assert.equal(knownAbout({ city: '   ' }).city, undefined);
});

// ── التفسير ───────────────────────────────────────────────────
test('حين لا نسأل، نقول لماذا — الصمتُ بلا تفسيرٍ يبدو تخمينًا', () => {
  const { filled } = enrichSignals(base, { city: 'الدار البيضاء' });
  const s = explainFilled(filled);
  assert.match(s, /المدينة/);
  assert.match(s, /قلتيها من قبل/);
  assert.equal(explainFilled([]), '', 'شرحٌ بلا ملء');
});
