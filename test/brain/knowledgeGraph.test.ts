import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conceptGraph, graphCoverage, stanceOf, CONCEPTS } from '../../src/lib/akg/kb';
import { relatedProfessions } from '../../src/lib/knowledge/graph';

// ============================================================
// عُقد الرسم — لكلّ مفهومٍ أسئلةٌ توضيحيّة · خدماتٌ مرتبطة · مسارُ حجز.
// ============================================================

test('عُقدةُ mechanic كاملة: أسئلة + مرتبطة + مسار حجز', () => {
  const n = conceptGraph('mechanic');
  assert.ok(n);
  assert.ok(n!.questions.length >= 2);
  assert.ok(n!.related.length >= 1);
  assert.ok(n!.related.some(r => r.id === 'auto_electrician' || r.id === 'car_wash'));
  assert.ok(n!.booking_flow.steps.length >= 3);
});

test('كلّ عُقدةٍ لها أسئلةٌ (لا فراغ) — حتى بلا طبقةٍ مُنسَّقة', () => {
  for (const id of ['plumber', 'car_wash', 'sewing_machine_repair', 'grocer']) {
    const n = conceptGraph(id);
    assert.ok(n, `no node for ${id}`);
    assert.ok(n!.questions.length >= 1, `no questions for ${id}`);
  }
});

test('المرتبطة تحمل أسماءً عربيّة صالحة', () => {
  const n = conceptGraph('plumber')!;
  for (const r of n.related) { assert.ok(r.id && r.name && r.name.length >= 2); }
});

test('مفهومٌ غير موجود ⇒ null', () => {
  assert.equal(conceptGraph('__nope__'), null);
});

test('تغطيةٌ مُنسَّقة لأهمّ المفاهيم', () => {
  const g = graphCoverage();
  assert.ok(g.curatedQuestions >= 25);
  assert.ok(g.curatedRelated >= 12);
});

test('المجالات الجديدة (تقنية/شبكات/ملابس) مُدمجة ولها عُقد', () => {
  for (const id of ['wifi_internet', 'network_technician', 'it_support', 'satellite_receiver', 'kids_clothing']) {
    const n = conceptGraph(id);
    assert.ok(n, `no node for ${id}`);
    assert.ok(n!.questions.length >= 1);
  }
});

// ── asks: ما يكتبه الأدمن يجب أن يُعرَض، لا أن يُحفَظ فقط ────────
test('asks تظهر في العُقدة بدل الأسئلة العامّة', () => {
  const c = CONCEPTS.find(x => x.id === 'data_recovery')!;
  assert.ok(c.asks?.seek?.length, 'بيانات الاختبار تغيّرت: data_recovery بلا asks');
  const n = conceptGraph('data_recovery', 'seek')!;
  assert.deepEqual(n.questions, c.asks!.seek);
  // العامّة كانت هي المعروضة قبل الدمج — يجب ألّا تظهر الآن.
  assert.ok(!n.questions.includes('واش الخدمة مستعجلة؟'));
});

test('الاتّجاه يختار الجانب: العارض لا يُسأل سؤال الطالب', () => {
  const c = CONCEPTS.find(x => x.id === 'computer_hardware_store')!;
  const offer = conceptGraph('computer_hardware_store', 'offer')!;
  const seek = conceptGraph('computer_hardware_store', 'seek')!;
  assert.deepEqual(offer.questions, c.asks!.offer);
  assert.deepEqual(seek.questions, c.asks!.seek);
  assert.notDeepEqual(offer.questions, seek.questions);
});

test('اتّجاهٌ مجهول ⇒ أسئلةُ الطالب (أغلبُ مَن يفتح المساعد يطلب)', () => {
  const c = CONCEPTS.find(x => x.id === 'printer_repair')!;
  assert.deepEqual(conceptGraph('printer_repair')!.questions, c.asks!.seek);
});

test('بلا asks تبقى الطبقة المُنسَّقة كما هي (لا انحدار)', () => {
  const c = CONCEPTS.find(x => x.id === 'mechanic')!;
  assert.ok(!c.asks?.offer?.length && !c.asks?.seek?.length);
  assert.equal(conceptGraph('mechanic', 'seek')!.questions[0], 'واش كتصلح جميع الماركات؟');
});

test('links.related تُستعمَل حين تكون مكتوبة', () => {
  const c = CONCEPTS.find(x => x.id === 'data_recovery')!;
  assert.deepEqual(c.links?.related, ['computer_repair', 'it_support']);
  const ids = conceptGraph('data_recovery')!.related.map(r => r.id);
  assert.deepEqual(ids, ['computer_repair', 'it_support']);
});

// ── stanceOf: الجسر الذي يمرّر الاتّجاه من المساعد إلى العُقدة ──
test('stanceOf يميّز «أنا حدّاد» عن «بغيت حدّاد»', () => {
  assert.equal(stanceOf('أنا حداد'), 'offer');
  assert.equal(stanceOf('بغيت حداد'), 'seek');
  assert.equal(stanceOf('عندي مشكل فالحاسوب'), 'seek');   // شكوى لا عرض
  assert.equal(stanceOf('حداد'), 'unknown');
});

test('stanceOf يقرأ اللاتينيّة أيضًا', () => {
  assert.equal(stanceOf('bghit haddad'), 'seek');
});

test('رسمٌ بيانيٌّ واحدٌ لا ثلاثة — والاسمُ العربيُّ يعبُر إليه', () => {
  // **حارسُ تضارب.** كان في المشروع خريطةٌ ثانيةٌ مكتوبةٌ بيدٍ مفاتيحُها نصوصٌ
  // عربيّةٌ مشكولة: `'صبّاغ'` بشدّة. عشرةُ حرفٍ من ١٩٧، ويومَ تُكتب «صباغ»
  // بلا شدّةٍ ينكسر الربطُ بصمت.
  const both = [relatedProfessions('صبّاغ'), relatedProfessions('صباغ')];
  assert.ok(both[0].length > 0, '«صبّاغ» بلا مرتبطات');
  assert.deepEqual(both[0], both[1], 'الشدّةُ تُغيّر الجواب — المفتاحُ نصٌّ لا مفهوم');

  // والتغطيةُ تتعدّى الحرفَ العشرةَ القديمة إلى ما لم تكن الخريطةُ تعرفه.
  for (const q of ['ميكانيكي', 'مطعم', 'قفطان', 'حلاق'])
    assert.ok(relatedProfessions(q).length > 0, `«${q}» بلا خطوةٍ مجاورة`);

  // ومُعرِّفٌ لاتينيٌّ يعمل كالاسم العربيّ — مصدرٌ واحدٌ للحقيقة.
  assert.deepEqual(relatedProfessions('plumber'), relatedProfessions('سبّاك'));
  assert.deepEqual(relatedProfessions('لا وجود له إطلاقًا'), []);
});
