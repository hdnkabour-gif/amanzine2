import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAll, describe, describableTypes } from '../../src/lib/akg/describe';

// ADR-0003: كلّ كيان يُجيب عن الأسئلة الأربعة عبر describe().
test('describeAll covers all entity types', () => {
  const all = describeAll();
  assert.ok(all.length >= 50, 'عشرات الكيانات على الأقلّ');
  const types = new Set(all.map(d => d.type));
  for (const t of ['service', 'module', 'page', 'entity', 'profession', 'problem', 'capability'] as const) {
    assert.ok(types.has(t), `النوع موجود: ${t}`);
  }
});

test('plumber answers the four questions (+ impact of deletion)', () => {
  const d = describe('profession', 'plumber');
  assert.ok(d, 'الكيان موصوف');
  assert.ok(d!.purpose, 'لماذا وُجد');
  assert.ok(d!.relations.length > 0, 'على ماذا يعتمد');
  assert.ok(d!.usedBy.length > 0, 'من يعتمد عليه (أعطال يحلّها)');
  assert.ok(d!.impactOfDeletion.length > 0, 'أثر الحذف');
});

test('describableTypes counts are consistent with describeAll', () => {
  const total = describableTypes().reduce((n, t) => n + t.count, 0);
  assert.equal(total, describeAll().length);
});
