import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSystemMap } from '../../src/lib/akg/systemMap';

// خريطة النظام تُحسب من السجلّات (القانون #2) — سلامتها اختبار انحدار.
test('system map has no broken links (registry integrity)', () => {
  const m = computeSystemMap();
  assert.equal(m.issues.length, 0, m.issues.map(i => i.detail).join(' | '));
});

test('system map counts are populated', () => {
  const m = computeSystemMap();
  assert.ok(m.counts.professions >= 10);
  assert.ok(m.counts.problems >= 5);
  assert.ok(m.counts.pages > 0, 'واصفات الصفحات مسجّلة (side-effect)');
  assert.ok(m.counts.symptoms >= 20);
});

// اليتيم ليس خطأً، لكن انفجار عدد اليتامى مؤشّر انحراف — نثبّت السقف الحالي.
test('orphans stay within a sane bound', () => {
  const m = computeSystemMap();
  assert.ok(m.orphanServices.length <= 3, `orphan services: ${m.orphanServices.join(', ')}`);
  assert.ok(m.orphanKbCapabilities.length <= 3, `orphan caps: ${m.orphanKbCapabilities.join(', ')}`);
});
