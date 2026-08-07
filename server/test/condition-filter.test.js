'use strict';
// حالُ السلعة يصل من الجملة إلى المرشِّح — أو لا يصل أصلًا.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFilters } = require('../lib/searchFilters');
const fs = require('node:fs');

test('المرشِّحُ يقبل القيمتَين المُعلَنتَين وحدَهما', () => {
  assert.equal(parseFilters({ condition: 'new' }).condition, 'new');
  assert.equal(parseFilters({ condition: 'used' }).condition, 'used');
  assert.equal(parseFilters({ condition: 'زائف' }).condition, undefined,
    'قيمةٌ مجهولةٌ صارت مرشِّحًا — يُفرَّغ البحثُ بقيمةٍ لا تُفهَم');
  assert.equal(parseFilters({}).condition, undefined);
});

test('**ويُقصي المخالفَ لا المجهول**', () => {
  const src = fs.readFileSync(require('node:path').join(__dirname,'..','lib/engines/search.js'), 'utf8');
  assert.match(src, /f\.condition && b\.condition && b\.condition !== f\.condition/,
    'المرشِّحُ يُقصي ما لم يُكتَب حالُه — تُفرَّغ النتائجُ حتّى يملأ كلُّ التجّار حقلًا جديدًا');
});

test('والعمودُ موجودٌ فعلًا — لا مرشِّحَ على حقلٍ لا وجودَ له', () => {
  const mig = fs.readFileSync(require('node:path').join(__dirname,'..','migrate.js'), 'utf8');
  assert.match(mig, /ADD COLUMN IF NOT EXISTS condition/, 'لا عمودَ لحال السلعة');
  const db = fs.readFileSync(require('node:path').join(__dirname,'..','database.js'), 'utf8');
  assert.match(db, /condition:\s+p\.condition/, 'الحالُ لا يُقرأ من القاعدة');
  assert.match(db, /condition:\s+'condition'/, 'الحالُ لا يُحدَّث');
  assert.match(db, /p\.condition === 'new' \|\| p\.condition === 'used'/,
    'الإنشاءُ يكتب أيَّ قيمةٍ — حقلٌ بلا عقد');
});
