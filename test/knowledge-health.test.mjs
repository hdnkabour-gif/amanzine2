// ============================================================
// صحّةُ المعرفة — سقّاطةٌ لا تعود إلى الوراء.
//
//   قاعدةُ المعرفة تمرض بصمت. لا شيءَ يُسقط بناءً حين يسرق مفهومٌ مرادفَ آخر،
//   ولا حين تتسرّب خليّةُ CSV كفئة. يظهر العطبُ عند الإنسان وحده: يكتب حاجته،
//   فيُفهَم شيئًا آخر — أو يُعرَض له «مغسلة سيّارات» كخدمةٍ مرتبطةٍ بالصيدليّة.
//
//   وقع ذلك فعلًا: ٩٠ مفهومًا حملوا «| الدارجة | العربية | …» كفئة، فحجبت
//   القمامةُ (وهي نصٌّ غيرُ فارغ) الخريطةَ المُنسَّقة، وصار التسعون «نفس الفئة».
//
//   لذلك: أرقامٌ قصوى مثبَّتة. تنزل ولا تصعد. أيّ استيرادٍ أو تعديلٍ يزيدها
//   يُفشل `npm test` — فلا يمرّ العطبُ صامتًا مرّةً أخرى.
// ============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = JSON.parse(execFileSync('node', [join(ROOT, 'scripts/knowledge-audit.mjs'), '--json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));

// السقوفُ الحاليّة. حين تُصلَح دفعةٌ من التعارضات، أنزِل الرقم — لا ترفعه أبدًا.
const MAX = { conflicts: 143, dead: 2, shadowed: 50, duplicates: 7 };

test('لا فئةً فاسدة (رأسُ جدولٍ ملصوقٌ من CSV)', () => {
  assert.deepEqual(R.badCategory, [],
    `فئاتٌ فاسدة: ${R.badCategory.join(', ')} — تحجب CATEGORY_BY_ID فتصير المفاهيمُ كلُّها «نفس الفئة»`);
});

test('لا مرادفَ رقميًّا أو كوديًّا', () => {
  assert.deepEqual(R.junkVariants, [],
    `«1» أو «\`car_wash\`» يُطابَق ولا يعني شيئًا: ${R.junkVariants.join(', ')}`);
});

test('لا عربيّةَ داخل قوائم fr/en', () => {
  assert.deepEqual(R.langMix, [],
    `المطابقةُ اللاتينيّة لا تصل العربيّة أبدًا، فالمرادفُ ميّتٌ حيث وُضع: ${R.langMix.join(', ')}`);
});

test('لا خدماتٍ خامًّا فيها أسطر (\\r\\n) — خليّةُ CSV واحدةٌ بدل مصفوفة', () => {
  assert.deepEqual(R.rawServices, [], R.rawServices.join(', '));
});

test('التعارضاتُ لا تزيد', () => {
  assert.ok(R.conflicts.length <= MAX.conflicts,
    `${R.conflicts.length} مرادفًا متعارضًا (السقف ${MAX.conflicts}). ` +
    `أوّلها: ${R.conflicts.slice(0, 3).map(c => `«${c.term}» ⇒ ${c.ids.join('|')}`).join(' · ')}`);
});

test('المفاهيمُ الميّتة لا تزيد', () => {
  assert.ok(R.dead.length <= MAX.dead,
    `مفاهيمُ لا تصل إليها أيُّ جملة: ${R.dead.join(', ')} (السقف ${MAX.dead})`);
});

test('المفاهيمُ المحجوبةُ جزئيًّا لا تزيد', () => {
  assert.ok(R.shadowed.length <= MAX.shadowed,
    `${R.shadowed.length} مفهومًا فقد مرادفاتٍ لصالح غيره (السقف ${MAX.shadowed})`);
});

test('التسمياتُ المزدوجة لا تزيد', () => {
  assert.ok(R.duplicates.length <= MAX.duplicates,
    `تسميةٌ عربيّةٌ واحدةٌ لمفاهيم متعدّدة: ` +
    `${R.duplicates.map(d => `«${d.ar}» ⇒ ${d.ids.join('|')}`).join(' · ')} (السقف ${MAX.duplicates})`);
});

test('السقوفُ نفسُها لا تُرفَع تسلُّلًا', () => {
  // لو رفع أحدٌ MAX ليُمرّر تعديلًا، هذا الاختبار يكشفه: الأرقامُ التي وُضعت
  // يومَ التنظيف مكتوبةٌ هنا مرّتين، ومقارنتُها تجعل الرفعَ فعلًا واعيًا لا صامتًا.
  // ⬇ ١٤٤→١٤٣ و٥١→٥٠ مع دفعةِ الأكل: تنازلَ بائعُ الفخّار عن «طاجين» ومحلُّ
  //   الدواجن عن «دجاج»، فقلّ التنازعُ بدل أن يزيد. السقّاطةُ تنزل ولا تصعد.
  assert.deepEqual(MAX, { conflicts: 143, dead: 2, shadowed: 50, duplicates: 7 },
    'رُفع سقفٌ — إن كان مقصودًا فحدِّث هذا الاختبار واذكر السبب في الالتزام');
});

test('فهرسُ المرادفات المدمجة مواكبٌ للمصدر', () => {
  // الخادم لا يقرأ TS، فيقرأ هذا الملفّ المولَّد. لو تقادم، صار حارسُ التعارض
  // في /api/knowledge يفحص قاعدةً قديمة: يسمح بسرقة مرادفٍ أُضيف حديثًا،
  // ويرفض مرادفًا حُذف. الفشلُ هنا رسالتُه واحدة: شغّل `npm run gen:variants`.
  const P = join(ROOT, 'server/generated/builtin-variants.json');
  const before = JSON.parse(readFileSync(P, 'utf8'));
  execFileSync('node', [join(ROOT, 'scripts/knowledge-audit.mjs'), '--emit-index'],
    { cwd: ROOT, stdio: 'ignore' });
  const after = JSON.parse(readFileSync(P, 'utf8'));
  assert.deepEqual(before, after,
    'فهرسُ المرادفات المدمجة متقادم — شغّل `npm run gen:variants` والتزِم بالملفّ');
});
