import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conceptGraph, graphCoverage } from '../../src/lib/akg/kb';

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
