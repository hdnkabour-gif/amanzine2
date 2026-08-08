'use strict';
// ============================================================
// **كلُّ ما كُتب في `database.js` مُصدَّرٌ فعلًا.**
//
//   وقع هذا في هذه الجلسة: تعليقٌ فُتح بـ`/**` ولم يُغلَق، فابتلع مئةَ
//   سطرٍ من الشيفرة. و`node --check` **مرّ نظيفًا** — النحوُ سليمٌ تمامًا.
//   فاختفت `discoverProducts` و`discoverProviders` و`discoverStores` من
//   الوحدة، ولم يظهر شيءٌ إلّا حين نادى الخادمُ إحداها في وقت التشغيل:
//
//       [search] db.discoverProviders is not a function → 500
//
//   لا اختبارَ وحدةٍ يرى هذا، ولا مترجم. فيُقاس هنا مباشرةً: كلُّ اسمٍ
//   كُتب في المصدر بصيغة `db.<اسم> =` يجب أن يكون دالّةً في الكائن
//   المُصدَّر. غيابُ واحدٍ = شيفرةٌ ماتت صامتةً.
// ============================================================
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../database');

test('لا اسمَ مكتوبٌ في المصدر وغائبٌ عن الوحدة', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
  const declared = new Set();
  for (const m of src.matchAll(/^db\.([A-Za-z_$][\w$]*)\s*=/gm)) declared.add(m[1]);
  assert.ok(declared.size > 50, `القارئُ ما لقا والو (${declared.size}) — يُراجَع الحارسُ نفسُه`);

  // بعضُها كائناتُ تسميةٍ (`db.users` · `db.settings`) لا دوالّ — والمقصودُ
  // **الوجودُ** لا النوع: الغائبُ هو الذي ابتلعه تعليقٌ أو منعه شرط.
  const missing = [...declared].filter(k => db[k] === undefined);
  assert.deepEqual(missing, [],
    `أسماءٌ مكتوبةٌ في المصدر وغائبةٌ عن الوحدة — تعليقٌ ابتلعها أو شرطٌ منع تنفيذَها: ${missing.join(' · ')}`);
});
