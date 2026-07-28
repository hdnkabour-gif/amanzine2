#!/usr/bin/env node
// ============================================================
// import-knowledge — CSV → knowledgeExtra.ts
//
//   لماذا؟ كتابة آلاف المرادفات يدويًّا داخل TypeScript مُتعِبةٌ ومصدرُ أخطاء.
//   تكتب صفًّا واحدًا لكلّ مفهوم في جدول، والسكربت يولّد الكود.
//
//   الأمان أوّلًا — لا يكتب شيئًا قبل أن يمرّ الفحص:
//   ① الـid مكرّرٌ داخل الملفّ نفسه            ⇒ خطأ
//   ② مرادفٌ واحدٌ يظهر في مفهومين مختلفين     ⇒ خطأ (يجعل الفهم عشوائيًّا)
//   ③ الـid موجودٌ في المعرفة الحاليّة          ⇒ تحذير (إثراء، لا إضافة)
//   ④ حقولٌ ناقصة                              ⇒ خطأ
//
//   الاستعمال:
//     node scripts/import-knowledge.mjs data/concepts.csv            # فحصٌ فقط
//     node scripts/import-knowledge.mjs data/concepts.csv --write    # يكتب فعلًا
//     node scripts/import-knowledge.mjs --template > data/concepts.csv
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/lib/akg/kb/knowledgeExtra.generated.ts');

// أعمدة الجدول. القوائم داخل الخليّة تُفصَل بـ«|».
const COLS = [
  'id', 'category',
  'ar', 'darija', 'fr', 'en',
  'variants_ar', 'variants_darija', 'variants_fr', 'variants_en', 'variants_arabizi',
  'offer', 'seek', 'asks_offer', 'asks_seek',
  'links_related', 'links_needs', 'links_sells', 'links_near',
  'services', 'examples',
];
const REQUIRED = ['id', 'category', 'ar'];

if (process.argv.includes('--template')) {
  console.log(COLS.join(','));
  console.log([
    'furniture_store', 'أثاث', 'أثاث منزليّ', 'أثاث الدار', 'Meubles', 'Furniture',
    'أثاث|مفروشات', 'طوبيس|صالون', 'meuble|salon', 'furniture|sofa', 'athat|salon',
    'عندي محل أثاث|كنبيع الأثاث', 'بغيت أثاث|خاصني صالون',
    'شنو كتبيع بالضبط؟|فين محلّك؟', 'واش جديد ولا مستعمل؟|شحال الميزانية؟',
    'carpenter', 'transport', 'كنبة|خزانة', 'decor',
    'بيع أثاث', 'بغيت صالون جديد',
  ].map(v => (v.includes(',') ? `"${v}"` : v)).join(','));
  process.exit(0);
}

// ── قارئ CSV صغير: يدعم "..." والفواصل داخلها ──
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}

const list = (v) => String(v || '').split('|').map(s => s.trim()).filter(Boolean);
const norm = (s) => String(s || '').toLowerCase().trim()
  .replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const file = process.argv[2];
if (!file) { console.error('الاستعمال: node scripts/import-knowledge.mjs <ملفّ.csv> [--write]'); process.exit(1); }
if (!existsSync(file)) { console.error(`✗ الملفّ غير موجود: ${file}`); process.exit(1); }

const rows = parseCSV(readFileSync(file, 'utf8'));
const header = rows.shift().map(h => h.trim());
const idx = Object.fromEntries(COLS.map(c => [c, header.indexOf(c)]));
const missingCols = REQUIRED.filter(c => idx[c] < 0);
if (missingCols.length) { console.error(`✗ أعمدةٌ ناقصةٌ في الترويسة: ${missingCols.join(', ')}`); process.exit(1); }

const get = (r, c) => (idx[c] >= 0 ? (r[idx[c]] || '').trim() : '');

// ── المعرفة الحاليّة: للكشف عن التعارض قبل الكتابة ──
function existingIds() {
  const ids = new Set();
  for (const f of ['knowledgeData.ts', 'knowledgeExtra.ts']) {
    const p = join(ROOT, 'src/lib/akg/kb', f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    // ثلاثة أشكال: JSON مولَّد ("id":"x") · كائن TS (id: 'x') · مُختصَر C('x'
    for (const m of src.matchAll(/"id"\s*:\s*"([a-z0-9_]+)"/g)) ids.add(m[1]);
    for (const m of src.matchAll(/id:\s*'([a-z0-9_]+)'/g)) ids.add(m[1]);
    for (const m of src.matchAll(/C\('([a-z0-9_]+)'/g)) ids.add(m[1]);
  }
  return ids;
}

// مرادفاتُ المعرفة الحاليّة: مرادفٌ يسرقه مفهومٌ جديدٌ من قديمٍ يكسر الفهم بصمت،
// لذلك نفحصه قبل الكتابة لا بعدها. نقرأ الشكلين: JSON المولَّد وكائنات TS.
function existingVariants() {
  const map = new Map();   // «lang:مرادف مطبَّع» → id
  for (const f of ['knowledgeData.ts', 'knowledgeExtra.ts']) {
    const p = join(ROOT, 'src/lib/akg/kb', f);
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/"id"\s*:\s*"([a-z0-9_]+)"\s*,[\s\S]{0,80}?"variants"\s*:\s*(\{[\s\S]*?\})\s*,\s*"services"/g)) {
      try {
        const obj = JSON.parse(m[2]);
        for (const [lang, arr] of Object.entries(obj))
          for (const w of arr || []) map.set(`${lang}:${norm(w)}`, m[1]);
      } catch { /* تجاهل ما لا يُحلَّل */ }
    }
    for (const m of src.matchAll(/C\('([a-z0-9_]+)'[\s\S]*?\{\s*(darija|ar|fr|en|arabizi)[\s\S]*?\}/g)) {
      const id = m[1];
      for (const q of m[0].matchAll(/'([^']{2,40})'/g)) map.set(`any:${norm(q[1])}`, id);
    }
  }
  return map;
}

const errors = [], warnings = [], concepts = [];
const seenId = new Map();
const seenVariant = new Map();   // مرادف مطبَّع → id
const known = existingIds();
const knownVariants = existingVariants();

rows.forEach((r, i) => {
  const line = i + 2;
  const id = get(r, 'id');
  if (!id) { errors.push(`سطر ${line}: id فارغ`); return; }
  if (!/^[a-z][a-z0-9_]*$/.test(id)) errors.push(`سطر ${line}: id غير صالح «${id}» (حروفٌ صغيرةٌ و_ فقط)`);
  if (seenId.has(id)) { errors.push(`سطر ${line}: id مكرّرٌ داخل الملفّ «${id}» (أوّل ظهور: سطر ${seenId.get(id)})`); return; }
  seenId.set(id, line);
  for (const c of REQUIRED) if (!get(r, c)) errors.push(`سطر ${line}: العمود «${c}» مطلوب`);
  if (known.has(id)) warnings.push(`سطر ${line}: «${id}» موجودٌ في المعرفة الحاليّة ⇒ سيُعامَل كإثراء (union) لا كإضافة`);

  const variants = {};
  for (const lang of ['ar', 'darija', 'fr', 'en', 'arabizi']) {
    const v = list(get(r, `variants_${lang}`));
    if (v.length) variants[lang] = v;
    for (const w of v) {
      const k = `${lang}:${norm(w)}`;
      const owner = seenVariant.get(k);
      if (owner && owner !== id) errors.push(`سطر ${line}: المرادف «${w}» (${lang}) مستعمَلٌ في «${owner}» — يجعل الفهم عشوائيًّا`);
      else seenVariant.set(k, id);
      // تعارضٌ مع المعرفة الحاليّة (مفهومٌ آخر يملك المرادف أصلًا)
      const prior = knownVariants.get(k) || knownVariants.get(`any:${norm(w)}`);
      if (prior && prior !== id) errors.push(`سطر ${line}: المرادف «${w}» يملكه «${prior}» في المعرفة الحاليّة — اختر كلمةً أدقّ`);
    }
  }

  const pick = (o) => (Object.keys(o).length ? o : undefined);
  concepts.push({
    id, category: get(r, 'category'),
    concept: pick({ ar: get(r, 'ar'), darija: get(r, 'darija'), fr: get(r, 'fr'), en: get(r, 'en') }) || {},
    variants,
    stance: pick({ offer: list(get(r, 'offer')), seek: list(get(r, 'seek')) }.offer?.length || list(get(r, 'seek')).length
      ? { ...(list(get(r, 'offer')).length ? { offer: list(get(r, 'offer')) } : {}), ...(list(get(r, 'seek')).length ? { seek: list(get(r, 'seek')) } : {}) } : {}),
    asks: pick({ ...(list(get(r, 'asks_offer')).length ? { offer: list(get(r, 'asks_offer')) } : {}), ...(list(get(r, 'asks_seek')).length ? { seek: list(get(r, 'asks_seek')) } : {}) }),
    links: pick(Object.fromEntries(['related', 'needs', 'sells', 'near']
      .map(k => [k, list(get(r, `links_${k}`))]).filter(([, v]) => v.length))),
    services: list(get(r, 'services')),
    examples: list(get(r, 'examples')),
  });
});

// ── التقرير ──
console.log(`\n📄 ${file} — ${concepts.length} مفهومًا`);
for (const w of warnings) console.log(`  ⚠️  ${w}`);
for (const e of errors) console.log(`  ✗  ${e}`);

if (errors.length) {
  console.log(`\n✗ ${errors.length} خطأ — لم يُكتب شيء. أصلِح الجدول ثمّ أعِد المحاولة.\n`);
  process.exit(1);
}
if (!process.argv.includes('--write')) {
  console.log(`\n✓ الفحص نظيف. أضِف --write للكتابة إلى:\n  ${OUT}\n`);
  process.exit(0);
}

const clean = (o) => JSON.parse(JSON.stringify(o, (_k, v) => {
  if (Array.isArray(v) && !v.length) return undefined;
  if (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) return undefined;
  return v;
}));

const body = concepts.map(c => '  ' + JSON.stringify(clean(c), null, 2).split('\n').join('\n  ')).join(',\n');
writeFileSync(OUT, `// مولَّدٌ آليًّا من ${file} — لا تحرّره يدويًّا.
// أعِد التوليد: node scripts/import-knowledge.mjs ${file} --write
import type { ConceptData } from './knowledgeData';

export const IMPORTED_CONCEPTS: ConceptData[] = [
${body}
];
`, 'utf8');
console.log(`\n✓ كُتب ${concepts.length} مفهومًا →\n  ${OUT}`);
console.log(`  استوردها في concepts.ts وأضِفها لقائمة الدمج.\n`);
