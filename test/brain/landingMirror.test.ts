import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFacts, understandingScore } from '../../src/pages/Landing/sections/NeedFirst';

// ============================================================
// المرآة الحيّة — تنمو مع الكتابة، تتكلّم بالدارجة، ولا تدّعي فهمًا لم يقع.
// ============================================================

const labels = (s: string) => readFacts(s).map(f => f.label);
const val = (s: string, label: string) => readFacts(s).find(f => f.label === label)?.value;
const say = (s: string) => readFacts(s).map(f => f.say);

test('الحقائق تتراكم كلّما كتب المستخدم أكثر — لا تُعاد من الصفر', () => {
  const steps = ['بغيت سباك', 'بغيت سباك فالرباط', 'بغيت سباك فالرباط دابا', 'بغيت سباك فالرباط دابا ب 300 درهم'];
  let prev = 0;
  for (const s of steps) {
    const n = readFacts(s).length;
    assert.ok(n > prev, `«${s}» لم تُضِف حقيقة (${prev} → ${n})`);
    prev = n;
  }
});

test('كلّ حقيقةٍ صحيحةٌ في مكانها', () => {
  const q = 'بغيت سباك فالرباط دابا ب 300 درهم';
  assert.equal(val(q, 'الحاجة'), 'سبّاك');
  assert.equal(val(q, 'المدينة'), 'الرباط');
  assert.equal(val(q, 'الوقت'), 'مستعجل');
  assert.equal(val(q, 'الميزانية'), '300 درهم');
});

test('العارض يُقرأ عرضًا لا طلبًا', () => {
  assert.equal(val('أنا حداد فسلا', 'الحاجة'), 'حدّاد');
  assert.equal(val('أنا حداد فسلا', 'المدينة'), 'سلا');
  assert.match(say('أنا حداد فسلا')[0], /نتا حدّاد وباغي تعلن/);
});

// ── تتكلّم بلغة الإنسان لا بمصطلحاتٍ داخليّة ─────────────────
test('المرآة تقول جملةً مفهومة لا وسمًا تقنيًّا', () => {
  const lines = say('بغيت سباك فالرباط');
  assert.equal(lines[0], 'كتقلّب على سبّاك');
  assert.equal(lines[1], 'فالرباط');
  for (const l of lines) assert.ok(!/^الاتّجاه|^الحاجة:|^المدينة:/.test(l), `سطرٌ تقنيّ: ${l}`);
});

test('لا سطرَ يكرّر ما قبله', () => {
  const lines = say('بغيت سباك');
  assert.equal(lines.length, 1, `تكرار: ${JSON.stringify(lines)}`);
  assert.equal(new Set(lines).size, lines.length);
});

test('لا تُعرض تسمياتٌ عامّة توهم بفهمٍ لم يقع', () => {
  assert.deepEqual(labels('بغيت'), ['الاتّجاه']);          // الاتّجاه فقط
  assert.equal(val('بغيت', 'الحاجة'), undefined);
  assert.equal(val('عندي مشكل', 'الحاجة'), undefined, '«عندي مشكل» ليست حاجةً محدّدة');
});

test('نصٌّ قصيرٌ جدًّا ⇒ لا مرآة (لا وميضَ عبثيّ)', () => {
  assert.equal(readFacts('').length, 0);
  assert.equal(readFacts('ب').length, 0);
});

// ── حلقةُ الفهم: رقمٌ يتحرّك مع وضوح الجملة ─────────────────
test('النسبة ترتفع مع كلّ توضيح — لا تبقى جامدة', () => {
  const steps = ['بغيت', 'بغيت سباك', 'بغيت سباك فالرباط', 'بغيت سباك فالرباط دابا', 'بغيت سباك فالرباط دابا ب 300 درهم'];
  let prev = -1;
  for (const s of steps) {
    const n = understandingScore(s);
    assert.ok(n > prev, `«${s}» لم ترفع النسبة (${prev} → ${n})`);
    prev = n;
  }
  assert.equal(understandingScore(steps[steps.length - 1]), 100);
});

test('النسبة صفرٌ بلا نصّ، ومنخفضةٌ حين لا نعرف المجال', () => {
  assert.equal(understandingScore(''), 0);
  assert.ok(understandingScore('عندي مشكل') < 45, 'الغامض يجب أن يبقى تحت عتبة النصح');
  assert.ok(understandingScore('بغيت سباك') >= 45);
});

// ============================================================
// «كيفاش فهمتِ؟» — **أثرٌ حقيقيٌّ لا سردٌ مكتوبٌ بيد**.
//
//   الفرقُ بين إثباتٍ وإعلان: صفحةٌ تعرض خطواتٍ ثابتةً مؤلَّفةً تُقنع مرّةً
//   ثمّ تكذب حين يتبدّل العقل. وهذه الأسطرُ تخرج من `understand().reasoning`
//   نفسِها، فإن تغيّر العقلُ غدًا تغيّر ما يُعرَض معه.
// ============================================================
import { understand } from '../../src/lib/akg/kb';

const trace = (q: string) => ((understand(q) as any).reasoning || []) as string[];

test('الأثرُ يخرج من العقل ويتبدّل بتبدّل الجملة', () => {
  const a = trace('عندي مشكل فالفريجيدير');
  const b = trace('بغيت سبّاك فالرباط دابا');
  assert.ok(a.length >= 2, `أثرٌ فارغٌ لجملةٍ مفهومة: ${a.length}`);
  assert.notDeepEqual(a, b, 'الأثرُ نفسُه لجملتَين مختلفتَين — سردٌ ثابتٌ لا أثرٌ حقيقيّ');
});

test('كلُّ سطرٍ مقروءٌ للإنسان لا مُعرِّفٌ داخليّ', () => {
  // «🩺 الخدمةُ من حلّ المشكلة» يقرؤها التاجر. `service=home_appliance_repair`
  // لا يقرؤها أحد — وعرضُها يجعل الشفافيّةَ ضجيجًا.
  for (const line of trace('عندي مشكل ديال الضو فكازا')) {
    assert.ok(/[؀-ۿ]/.test(line), `سطرٌ بلا عربيّة: «${line}»`);
    assert.ok(line.length < 140, `سطرٌ طويلٌ لا يُقرأ: «${line}»`);
  }
});

test('الجملةُ القصيرةُ لا أثرَ لها — لا يُخترَع تفكيرٌ لم يقع', () => {
  assert.equal(trace('ا').length, 0, 'أثرٌ لجملةٍ لم تُفهَم');
});
