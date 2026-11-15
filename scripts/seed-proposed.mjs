// زرعُ المقترحات **مسوَّداتٍ** — لا تدخل الفهمَ قبل أن يَنشرها إنسان.
//   المسارُ العامّ يخدم `status:'published'` وحدَه، فالمسوَّدةُ تظهر في شاشة
//   المعرفة للمراجعة ولا تؤثّر في أيّ مستخدم.
//   التشغيل: DATABASE_URL=… node scripts/seed-proposed.mjs [--apply]
import fs from 'node:fs';
const APPLY = process.argv.includes('--apply');
const batch = JSON.parse(fs.readFileSync('AUDIT/proposed/batch-1.json', 'utf8'));
const { db } = await import('../server/database.js').catch(() => import('./../server/database.js'));

const unsure = [];
for (const c of batch['مفاهيم_جديدة']) {
  for (const [lang, list] of Object.entries(c.variants)) {
    for (const t of list) if (t.includes('؟')) unsure.push(`${c.id}.${lang}: ${t}`);
  }
}
console.log(`مقترحات: ${batch['مفاهيم_جديدة'].length} مفهومًا · ${unsure.length} لفظًا عليه علامةُ شكّ`);
unsure.forEach(u => console.log('   ؟ ' + u));

if (!APPLY) { console.log('\n(عرضٌ فقط — أضِف --apply للزرع مسوَّدةً)'); process.exit(0); }

for (const c of batch['مفاهيم_جديدة']) {
  // تُحذَف الألفاظُ المشكوكُ فيها قبل الزرع — لا يدخل ما لم يُتحقَّق منه.
  const variants = {};
  for (const [l, list] of Object.entries(c.variants)) {
    const clean = list.filter(t => !t.includes('؟'));
    if (clean.length) variants[l] = clean;
  }
  await db.upsertCustomConcept({
    ...c, variants, status: 'draft',
    source: 'proposed', reason: 'batch-1:مقترحٌ ينتظر المراجعة',
  });
  console.log(`✅ ${c.id} — مسوَّدة (${Object.values(variants).flat().length} لفظًا)`);
}
// التحقّقُ بالقراءة لا بالإعلان: ما استقرّ في القاعدة، وما يراه الفهم.
const ids = batch['مفاهيم_جديدة'].map(c => c.id);
const pub = await db.listCustomConcepts({ status: 'published' });
const leaked = pub.filter(c => ids.includes(c.id)).map(c => c.id);
for (const id of ids) {
  const row = await db.getCustomConcept(id);
  console.log(`   ${id}: status=${row?.status ?? 'غائب'}`);
}
if (leaked.length) { console.error('✖ تسرّبَ إلى المنشور: ' + leaked.join(', ')); process.exit(1); }
console.log('\n✅ كلُّها draft ولا يراها الفهم. انشُرْها من شاشة المعرفة بعد التصحيح.');
process.exit(0);
