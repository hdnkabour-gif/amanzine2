'use strict';
// ============================================================
// **الخادمُ يبحث بنفس المفتاح الذي كُتب به الفهرس.**
//
//   `builtin-variants.json` خريطةٌ مسطّحة يولّدها `npm run gen:variants`،
//   ويقرؤها `conceptConflicts` ليمنع مفهومًا جديدًا من سرقة لفظٍ مملوك.
//   والقراءةُ تمرّ بـ`normTerm`. فإن طبّع المولِّدُ على نحوٍ وطبّعت
//   `normTerm` على نحوٍ آخر، فالبحثُ يقع على مفتاحٍ لا وجودَ له —
//   **فيُمرَّر التعارضُ بصمت**، وهو بالضبط ما وُجد هذا الحارسُ ليمنعه.
//
//   وقد وقع فعلًا: الدارجةُ تكتب الصوتَ الواحدَ بأشكالٍ عدّة («گاراج» ·
//   «ڭاراج» · «كاراج»)، وكان المولِّدُ يُبقيها مفاتيحَ منفصلة بينما يطويها
//   العميلُ (`normArabic`) إلى واحد. فالعميلُ يرى لفظًا والخادمُ يرى ثلاثة.
//
//   ولا يحتاج هذا الاختبارُ قاعدةَ بيانات: يقرأ ملفًّا ودالّة.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const { normTerm } = require('../lib/conceptLearning');
const INDEX = join(__dirname, '..', 'generated', 'builtin-variants.json');
const map = JSON.parse(readFileSync(INDEX, 'utf8'));

test('الفهرسُ المدمجُ قُرئ أصلًا', () => {
  assert.ok(Object.keys(map).length > 1000,
    `قُرئ ${Object.keys(map).length} مفتاحًا فقط — الحارسُ أدناه يقيس الفراغ`);
});

test('**كلُّ أشكالِ الحرف تصل إلى مالكٍ واحد**', () => {
  // أشكالٌ حقيقيّةٌ من الدارجة المكتوبة: گ/ڭ/ك · ڤ/ف · پ/ب.
  const FORMS = [
    ['گاراج', 'ڭاراج', 'كاراج'],
    ['ڭزار', 'كزار'],
    ['لاڤاج', 'لافاج'],
    ['دروگري', 'دروڭري', 'دروكري'],
    ['براسينگ', 'براسينڭ'],
  ];
  const bad = [];
  for (const forms of FORMS) {
    const got = forms.map(f => map[normTerm(f)]);
    const missing = forms.filter((f, i) => got[i] === undefined);
    if (missing.length) { bad.push(`${forms[0]}: أشكالٌ لا مفتاحَ لها ⇒ ${missing.join(' · ')}`); continue; }
    if (new Set(got).size > 1) bad.push(`${forms[0]}: ${forms.map((f, i) => `${f}⇒${got[i]}`).join(' · ')}`);
  }
  assert.deepEqual(bad, [], 'شكلُ الحرف يغيّر المالك:\n  ' + bad.join('\n  '));
});

test('**ولا مفتاحان في الفهرس يختلفان في شكلِ الحرف وحدَه**', () => {
  // لو بقي المولِّدُ لا يطوي، لوُجد «گاراج» و«كاراج» مفتاحين — وأحدُهما
  //   لا تبلغه `normTerm` أبدًا، فيصير نصفُ الفهرس ميّتًا بلا رسالة.
  const seen = new Map();
  const dup = [];
  for (const k of Object.keys(map)) {
    const n = normTerm(k);
    if (n !== k) { dup.push(`«${k}» مفتاحٌ غيرُ مطبَّع — لا تبلغه normTerm (تطبيعُه «${n}»)`); continue; }
    if (seen.has(n)) dup.push(`«${k}» و«${seen.get(n)}» مفتاحان لنفسِ اللفظ`);
    else seen.set(n, k);
  }
  assert.deepEqual(dup, [], 'مفاتيحُ لا يبلغها قارئُ الفهرس:\n  ' + dup.slice(0, 20).join('\n  '));
});
