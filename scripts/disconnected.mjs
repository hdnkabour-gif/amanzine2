// ============================================================
// مُولِّدُ تقرير المفصول — **يقيس ولا يُملى عليه**.
//
//   التقريرُ السابق أعلن «٣٩ ملفًّا · ٣٠٥٦ سطرًا مفصولة» والحقيقةُ سبعةٌ
//   و٤٥٠ سطرًا. سببان، كلاهما بنيويّ لا سهو:
//
//     ① ماسحُه لا يحلّ **استيرادَ المجلّد**: `from './Landing'` يعني
//        `Landing/index.tsx`. فسقطت صفحةُ الهبوط الحيّةُ كلُّها — ثلاثةَ عشرَ
//        ملفًّا مركَّبةً على `/landing` — في قائمة «الميّت».
//     ② كُتب مرّةً ولم يُعَد توليدُه. فوُصل `executionPolicy` بعده بالتزامٍ
//        واحد، وبقي التقريرُ يقول إنّه مفصول.
//
//   ولذلك: يُولَّد بأمرٍ (`npm run report:disconnected`)، ويحرسه
//   `test/disconnected.test.mjs` فيسقط البناءُ إن قدُم أو كذب.
//
//   ── وما لا يراه أيُّ ماسحٍ ساكن ──
//   `services/delivery/{providers,adapters}` تُحمَّل بمسحِ مجلّدٍ في
//   `registry.js` (`require(path.join(dir, file))`). فهي **ليست يتيمة** ولو
//   لم يستوردها سطرٌ واحد. الماسحُ الذي يجهل ذلك يوصي بحذف أربع شركاتِ
//   توصيلٍ تعمل.
// ============================================================

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) {
      if (/node_modules|dist|\.git/.test(full)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e)) out.push(full);
  }
  return out;
};

const rel = (f) => f.replace(ROOT, '');
const CODE = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'server')).filter(f => !/\/test\//.test(f))];

const EXT = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
const resolveSpec = (from, spec) => {
  if (!spec.startsWith('.')) return null;
  const base = join(from, '..', spec);
  for (const e of EXT) {
    const c = base + e;
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};
const IMPORT_RX = [
  /from\s+['"`]([^'"`]+)['"`]/g,
  /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /require\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /^\s*import\s+['"`]([^'"`]+)['"`]/gm,
];

/** كلُّ ما يستورده ملفّ. */
function importsOf(f) {
  const src = readFileSync(f, 'utf8');
  const out = new Set();
  for (const rx of IMPORT_RX) {
    for (const m of src.matchAll(rx)) {
      const r = resolveSpec(f, m[1]);
      if (r) out.add(r);
    }
  }
  return out;
}

/** ما يبلغه التطبيقُ فعلًا انطلاقًا من نقاط الدخول. */
function reachableFrom(entries) {
  const seen = new Set();
  const queue = entries.filter(existsSync);
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const r of importsOf(f)) if (!seen.has(r)) queue.push(r);
  }
  return seen;
}

// نقاطُ الدخول: المتصفّح والخادم — **ومسحُ المجلّد** الذي يُحمِّل شركاتِ
// التوصيل بلا استيرادٍ مكتوب. إغفالُه يجعل الماسحَ يوصي بحذفِ ما يعمل.
const DYNAMIC = [
  ...walk(join(ROOT, 'server/services/delivery/providers')),
  ...walk(join(ROOT, 'server/services/delivery/adapters')),
  // قنواتُ التحقّق تُحمَّل بمسح المجلّد في `lib/verify/index.js` — نفسُ العقد.
  // ثاني مجلّدٍ من هذا الصنف، ولن يكون الأخير.
  ...walk(join(ROOT, 'server/lib/verify/channels')),
];
const ENTRIES = [join(ROOT, 'src/main.tsx'), join(ROOT, 'server/index.js'), ...DYNAMIC];

const reached = reachableFrom(ENTRIES);
const orphans = CODE.filter(f => !reached.has(f));

// أهي ميّتةٌ تمامًا، أم يستعملها اختبارٌ وحدَه؟ الفرقُ يغيّر التوصية.
const TESTS = [...walk(join(ROOT, 'test')), ...walk(join(ROOT, 'server/test'))];
const testUses = new Map();
for (const t of TESTS) {
  for (const r of importsOf(t)) {
    if (!testUses.has(r)) testUses.set(r, new Set());
    testUses.get(r).add(rel(t));
  }
}

const lines = (f) => readFileSync(f, 'utf8').split('\n').length;
const role = (f) => {
  for (const l of readFileSync(f, 'utf8').split('\n').slice(0, 14)) {
    const t = l.replace(/^\s*(\/\/|\*|\/\*|#)\s?/, '').replace(/[=\-─]{4,}/g, '').trim();
    if (t.length > 12 && !/^['"]use strict/.test(t) && !/^(import|const|export|require|')/.test(t)) return t.slice(0, 80);
  }
  return '—';
};

const rows = orphans.map(f => ({
  file: rel(f), lines: lines(f), role: role(f),
  tests: [...(testUses.get(f) || [])],
})).sort((a, b) => b.lines - a.lines);

const total = rows.reduce((s, r) => s + r.lines, 0);
const ar = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

const out = `# المفصول — ما لا يبلغه التطبيق

> **مُولَّدٌ بأمر**: \`npm run report:disconnected\`. لا يُحرَّر بيد.
> ويحرسه \`test/disconnected.test.mjs\`: يسقط البناءُ إن قدُم أو خالف الكود.

المقياس: مشيٌ على الاستيرادات من نقاط الدخول (\`src/main.tsx\` ·
\`server/index.js\`) مع حلِّ **استيراد المجلّد** (\`from './Landing'\` ⇒
\`Landing/index.tsx\`) و**المسح الديناميكيّ** الذي يُحمِّل شركاتِ التوصيل بلا
استيرادٍ مكتوب. إغفالُ أحدهما هو بالضبط ما جعل تقريرًا سابقًا يعلن ٣٩ ملفًّا
مفصولًا والحقيقةُ ٧.

| القياس | العدد |
|---|--:|
| ملفّاتُ الإنتاج المسوحة | ${ar(CODE.length)} |
| يبلغها التطبيق | ${ar(CODE.length - orphans.length)} |
| **مفصولة** | **${ar(orphans.length)}** |
| أسطرٌ مفصولة | ${ar(total)} |

${rows.length ? `| الملفّ | سطر | الدور | يستعمله اختبار |
|---|--:|---|---|
${rows.map(r => `| \`${r.file}\` | ${r.lines} | ${r.role.replace(/\|/g, '/')} | ${r.tests.length ? r.tests.join(' · ') : '— **ميّتٌ تمامًا**'} |`).join('\n')}

**المجموع: ${ar(rows.length)} ملفًّا · ${ar(total)} سطرًا.** ما لا يستعمله اختبارٌ يُحذَف بلا أثر.
وما يستعمله اختبارٌ **وحدَه** يُوصَل أو يُحذَف مع اختباره — فاختبارٌ يحرس كودًا
لا يعمل يُعطي طمأنينةً كاذبة.` : '**لا ملفَّ مفصولًا.** كلُّ ما هو مكتوبٌ يبلغه التطبيق.'}
`;

writeFileSync(join(ROOT, 'REPORTS/DISCONNECTED.md'), out);
console.log(`[disconnected] ${orphans.length} ملفًّا مفصولًا · ${total} سطرًا · من ${CODE.length} مسحًا`);
for (const r of rows) console.log(`  ${r.lines.toString().padStart(5)}  ${r.file}${r.tests.length ? '  [اختبار فقط]' : ''}`);
