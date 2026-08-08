#!/usr/bin/env node
// ============================================================
// **الجردُ الكامل** — كلُّ ملفٍّ في المستودع، لا ما هو موصولٌ وحدَه.
//
//   ── لماذا آليٌّ لا يدويّ ──
//   ٦٥٠ ملفًّا. قراءةٌ يدويّةٌ تنسى، وتتقادم في اليوم التالي، ولا تُحقَن.
//   فما يمكن قياسُه يُقاس هنا — الوصولُ والصادراتُ الميتةُ والقِدَمُ
//   والتغطية — ويبقى **الحكمُ** وحدَه للقارئ، لأنّه وحدَه ما لا يُقاس.
//
//   ── والوصولُ يُحسَب من المداخل لا من الروابط ──
//   ملفٌّ يستورده ملفٌّ ميّتٌ ليس موصولًا. فالمسحُ يبدأ من المداخل الحقيقيّة
//   (`src/main.tsx` · `server/index.js` · الاختبارات · النصوص) ويمشي.
//   وبلا هذا يبدو كلُّ شيءٍ موصولًا ما دام أحدٌ يذكره.
// ============================================================

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve as res, extname } from 'node:path';

const ROOT = res(new URL('..', import.meta.url).pathname);
const sh = (c) => execSync(c, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const CODE = /\.(ts|tsx|js|mjs|cjs)$/;
const files = sh('git ls-files').trim().split('\n').filter(Boolean);
const code = files.filter(f => CODE.test(f) && !f.includes('node_modules'));

// ── تاريخُ آخر لمسةٍ لكلّ ملفّ — بنداءٍ واحدٍ لا ٦٥٠ ─────────────────
const touched = new Map();
{
  const log = sh('git log --name-only --pretty=format:%x01%ct --no-merges').split('\n');
  let ts = 0;
  for (const line of log) {
    if (line.startsWith('\x01')) { ts = +line.slice(1) || ts; continue; }
    const f = line.trim();
    if (f && !touched.has(f)) touched.set(f, ts);
  }
}

/** يحلّ مسارَ استيرادٍ نسبيٍّ إلى ملفٍّ حقيقيٍّ في المستودع. */
function resolveImport(from, spec) {
  if (!spec.startsWith('.')) return null;               // حزمةٌ خارجيّة
  const base = res(dirname(join(ROOT, from)), spec);
  const cands = [
    base, base + '.ts', base + '.tsx', base + '.js', base + '.mjs', base + '.cjs',
    join(base, 'index.ts'), join(base, 'index.tsx'), join(base, 'index.js'),
  ];
  for (const c of cands) {
    if (existsSync(c) && CODE.test(c)) return c.slice(ROOT.length + 1);
  }
  return null;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import[\s\S]*?from\s*|import\s*|export[\s\S]*?from\s*)['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
// **والاستيرادُ الكسول استيراد.** `lazy(() => import('./LivingHome'))` هو
//   كيف تُحمَّل **كلُّ** صفحةٍ في هذا التطبيق. وأوّلُ تشغيلٍ لهذا الماسح عدَّ
//   `Mirror.tsx` يتيمًا وقد رُكِّب قبل دقائق — لأنّ `import(` لم تكن مقروءة.
//   ماسحٌ يقيس الوصولَ ولا يعرف كيف يصل التطبيقُ إلى صفحاته يقيس الضجيج.
const DYNAMIC_RE = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
const EXPORT_RE = /^\s*export\s+(?:async\s+)?(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST_RE = /^\s*export\s*\{([^}]+)\}/gm;
const CJS_EXPORT_RE = /^\s*(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm;

const F = new Map();
for (const f of code) {
  let src = '';
  try { src = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
  const lines = src.split('\n');
  const imports = new Set();
  for (const re of [IMPORT_RE, REQUIRE_RE, DYNAMIC_RE]) {
    re.lastIndex = 0;
    let m; while ((m = re.exec(src))) { const r = resolveImport(f, m[1]); if (r) imports.add(r); }
  }
  const exports = new Set();
  for (const re of [EXPORT_RE, CJS_EXPORT_RE]) {
    re.lastIndex = 0;
    let m; while ((m = re.exec(src))) exports.add(m[1]);
  }
  EXPORT_LIST_RE.lastIndex = 0;
  { let m; while ((m = EXPORT_LIST_RE.exec(src))) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) exports.add(name);
      }
  } }
  if (/^\s*export\s+default/m.test(src)) exports.add('default');

  F.set(f, {
    file: f,
    lines: lines.length,
    bytes: src.length,
    imports: [...imports],
    importers: [],
    exports: [...exports],
    deadExports: [],
    reach: null,
    touched: touched.get(f) || 0,
    todos: (src.match(/\b(TODO|FIXME|HACK|XXX|@deprecated)\b/g) || []).length,
    anys: (src.match(/:\s*any\b/g) || []).length,
    logs: (src.match(/console\.(log|debug)\(/g) || []).length,
    emptyCatch: (src.match(/catch\s*(\([^)]*\))?\s*\{\s*\}/g) || []).length,
    src,
  });
}
for (const [f, d] of F) for (const i of d.imports) F.get(i)?.importers.push(f);

// ── الوصولُ من المداخل الحقيقيّة ────────────────────────────────────
const ENTRIES = {
  app: ['src/main.tsx'],
  server: ['server/index.js'],
  test: code.filter(f => /^(test|server\/test)\//.test(f)),
  script: code.filter(f => /^scripts\//.test(f)),
};
const reachedBy = new Map();
for (const [kind, roots] of Object.entries(ENTRIES)) {
  const seen = new Set(), stack = roots.filter(r => F.has(r));
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const i of F.get(f).imports) if (!seen.has(i)) stack.push(i);
  }
  for (const f of seen) {
    if (!reachedBy.has(f)) reachedBy.set(f, new Set());
    reachedBy.get(f).add(kind);
  }
}
// ── **ومَن يُحمَّل بالمجلّد موصولٌ** ──────────────────────────────────
//
//   عقدُ هذا المستودع: «إضافةُ شركةِ توصيلٍ = إسقاطُ ملفٍّ في المجلّد، لا
//   تعديلُ كود». فالسجلُّ يقرأ `readdirSync` ولا يذكر اسمًا واحدًا — وهذا
//   **المقصود**، ويحرسه اختبارٌ قائم.
//
//   فماسحٌ يتتبّع `import` وحدَه يعلن ستّةَ ملفّاتٍ «يتيمة» وهي قلبُ العقد.
//   والفرقُ بين تقريرٍ يُقرأ وتقريرٍ يُتجاهَل هو **ألّا يصرخ على الصواب**.
const DYNAMIC_DIRS = [
  ['server/services/delivery/providers/', 'سجلُّ المزوّدين (readdirSync)'],
  ['server/services/delivery/adapters/', 'سجلُّ المحوّلات (readdirSync)'],
  ['server/lib/verify/channels/', 'سجلُّ قنوات التحقّق (readdirSync)'],
];
/** ملفّاتٌ تناديها أدواتٌ خارجيّةٌ لا الكود: البناءُ والمتصفّح. */
const TOOL_OWNED = {
  'vite.config.ts': 'يقرؤه Vite عند البناء',
  'public/sw.js': "يسجّله المتصفّح عبر navigator.serviceWorker.register('/sw.js')",
};
for (const [f, d] of F) {
  const via = reachedBy.get(f);
  d.reach = via ? [...via].sort().join('+') : 'ORPHAN';
  if (d.reach === 'ORPHAN') {
    const dyn = DYNAMIC_DIRS.find(([p]) => f.startsWith(p));
    if (dyn) { d.reach = 'dynamic'; d.why = dyn[1]; }
    else if (TOOL_OWNED[f]) { d.reach = 'tool'; d.why = TOOL_OWNED[f]; }
  }
}

// ── صادراتٌ لا يستوردها أحد ─────────────────────────────────────────
//
//   **بدرجتَي ثقةٍ لا بحكمٍ واحد.** الفحصُ على المستوردين المباشرين وحدَهم
//   يُنتج إنذاراتٍ كاذبة: اسمٌ يُعاد تصديرُه عبر `index` ثمّ يُستعمَل بعيدًا
//   يبدو ميتًا. وتقريرٌ فيه إنذارٌ كاذبٌ واحدٌ يُقرأ مرّةً ثمّ يُهمَل كلُّه.
//
//     dead   لا يُذكَر في المستودع كلِّه خارج ملفِّه ⇒ ميّتٌ بيقين
//     local  يُذكَر في مكانٍ ما ولا يستورده مستوردٌ مباشر ⇒ يُنظَر فيه
const ALL = [...F.entries()];
for (const [f, d] of F) {
  if (!d.exports.length) continue;
  const direct = d.importers.map(i => F.get(i)?.src || '').join('\n');
  const elsewhere = ALL.filter(([g]) => g !== f).map(([, x]) => x.src).join('\n');
  for (const n of d.exports) {
    if (n === 'default') continue;
    const re = new RegExp(`\\b${n.replace(/[$]/g, '\\$')}\\b`);
    if (re.test(direct)) continue;
    (re.test(elsewhere) ? (d.looseExports ||= []) : (d.deadExports ||= [])).push(n);
  }
  d.deadExports ||= []; d.looseExports ||= [];
}

const now = Date.now() / 1000;
const DAY = 86400;
const out = [...F.values()].map(({ src, ...d }) => ({ ...d, ageDays: Math.round((now - d.touched) / DAY) }));
out.sort((a, b) => a.file.localeCompare(b.file));

writeFileSync(join(ROOT, 'REPORTS/audit.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  totals: {
    tracked: files.length, code: code.length,
    orphans: out.filter(f => f.reach === 'ORPHAN').length,
    appOnly: out.filter(f => f.reach === 'app').length,
    testOnly: out.filter(f => f.reach === 'test').length,
    untested: out.filter(f => f.reach === 'app' || f.reach === 'server').length,
    deadExports: out.reduce((s, f) => s + f.deadExports.length, 0),
    looseExports: out.reduce((s, f) => s + (f.looseExports||[]).length, 0),
    todos: out.reduce((s, f) => s + f.todos, 0),
    lines: out.reduce((s, f) => s + f.lines, 0),
  },
  files: out,
}, null, 1));

// ── ملخّصٌ على الشاشة ────────────────────────────────────────────────
const t = JSON.parse(readFileSync(join(ROOT, 'REPORTS/audit.json'), 'utf8')).totals;
console.log(`ملفّاتٌ متتبَّعة: ${t.tracked} · كود: ${t.code} · أسطر: ${t.lines}`);
console.log(`يتيمة (لا يبلغها مدخل): ${t.orphans}`);
console.log(`صادراتٌ ميتةٌ بيقين: ${t.deadExports} · يُنظَر فيها: ${t.looseExports}`);
console.log(`TODO/FIXME/deprecated: ${t.todos}`);
// والتقريرُ المقروءُ يُولَّد معها — لقطةٌ تُحرَّر بيدٍ تتقادم في اليوم التالي.
try { execSync('python3 scripts/audit-md.py', { cwd: ROOT, stdio: 'inherit' }); } catch { /* اختياريّ */ }
console.log('\n── اليتيمة ──');
for (const f of out.filter(x => x.reach === 'ORPHAN')) console.log(`  ${f.file} (${f.lines} سطر · ${f.ageDays} يوم)`);
