#!/usr/bin/env node
'use strict';
// ============================================================
// **جردُ ما يستطيع الإنسانُ فعلَه في كلّ صفحة — وهل يبلغه بالكلام؟**
//
//   طلبُ صاحب المشروع نصًّا: «يجب أن يتم جرد كل ما يوجد في صفحات التطبيق،
//   يعني كل ما يمكن للمستخدم أن يقوم به في صفحة ما يمكن له أن يقوم به داخل
//   المحادثة».
//
//   ── ولماذا هذا القياسُ لا غيرُه ──
//   جُرِّب أوّلًا عدُّ نداءات الـAPI في كلّ صفحة، فأعطى أرقامًا كاذبة:
//   `ProductsPage` بلا `productsAPI` و`OrdersPage` بلا `ordersAPI` — لأنّ
//   **المخزن** هو الذي ينادي، والصفحاتُ تستدعي أفعالَه. فالفعلُ الذي يملكه
//   الإنسانُ في صفحةٍ هو **فعلُ مخزنٍ تستعمله تلك الصفحة**، لا نداءُ شبكة.
//
//   ── والحكم ──
//   لكلّ فعلٍ صيغتُه (`addProduct` ⇒ `create` + `product`). ويُقال إنّه
//   **يُبلَغ بالكلام** حين توجد قدرةٌ في الكتالوج بنفس الفعل وصفحتُها من
//   الصفحات التي يعيش فيها — أي أنّ جملةً تُطابقها تسوق الإنسانَ إلى حيث
//   يقع الفعلُ نفسُه.
//
//   الاستعمال:  npm run report:page-actions
// ============================================================
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// الكتالوجُ يُقرأ مبنيًّا لا نصًّا — نفسُ ما يقرؤه التطبيق.
function loadAbilities() {
  const dir = mkdtempSync(join(tmpdir(), 'pageact-'));
  const entry = join(dir, 'e.ts');
  writeFileSync(entry, `export { ABILITIES } from ${JSON.stringify(join(ROOT, 'src/lib/abilities'))};`);
  const out = join(dir, 'b.cjs');
  execFileSync(join(ROOT, 'node_modules/.bin/esbuild'),
    [entry, '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--log-level=error'], { cwd: ROOT });
  return require(out).ABILITIES;
}
const ABILITIES = loadAbilities();

// ── الصفحةُ ⇒ ملفُّها، من `MainLayout` نفسِه ──────────────────
const ML = read('src/pages/MainLayout.tsx');
const LAZY = Object.fromEntries([...ML.matchAll(/const (\w+)\s*=\s*lazy\(\(\) => import\('\.\/([\w/]+)'\)\)/g)].map(m => [m[1], m[2]]));
const PAGE_FILE = {};
for (const m of ML.matchAll(/case '([\w-]+)':\s*return <(\w+)/g)) {
  if (LAZY[m[2]]) PAGE_FILE[m[1]] = `src/pages/${LAZY[m[2]]}.tsx`;
}

// ── أفعالُ المخزن ────────────────────────────────────────────
// تُقرأ من عقد `StoreValue`: اسمٌ متبوعٌ بدالّة. وما ليس فعلَ إنسانٍ يُستثنى
// بسببٍ مكتوب لا بصمت.
const STORE = read('src/store.tsx');
const ALL_ACTIONS = [...new Set([...STORE.matchAll(/^\s{2}(\w+):\s*\(([^)]*)\)\s*=>/gm)].map(m => m[1]))];
/** بنيةٌ لا فعلُ إنسان: تنقّلٌ وإشعارٌ وسجلٌّ داخليّ. */
const INFRA = new Set(['setPage', 'setSidebarOpen', 'notify', 'log', 'logout',
  'refreshDeliveryProviders', 'markNotifRead', 'clearNotifications']);
const ACTIONS = ALL_ACTIONS.filter(a => !INFRA.has(a));

/** صيغةُ الفعل: بادئتُه فعلٌ، وبقيّتُه كيان. */
const VERB_OF = [
  [/^add/, 'create'], [/^create/, 'create'], [/^import/, 'create'],
  [/^update/, 'update'], [/^adjust/, 'update'], [/^save/, 'update'], [/^edit/, 'update'],
  // دورةُ حياة الطلب تبديلُ حالةٍ لا صنفٌ ثالث: «وافق» و«رفض» و«سلّم»
  // ثلاثتُها تكتب `status` على طلبٍ قائم. وكان المُصنِّفُ يجهلها فيقول
  // «بلا صيغة» ⇒ «لا يبلغه الكلام» — بعد أن صارت اللغةُ تقرؤها فعلًا.
  // فكذب التقريرُ على عملٍ تمّ، وهو أسوأ من كذبه على عملٍ لم يتمّ.
  [/^approve/, 'update'], [/^reject/, 'update'], [/^deliver/, 'update'], [/^confirm/, 'update'],
  [/^delete/, 'delete'], [/^remove/, 'delete'],
  [/^send/, 'send'], [/^ship/, 'send'], [/^share/, 'share'],
  [/^track/, 'view'], [/^view/, 'view'], [/^export/, 'view'],
];
const verbOf = (a) => (VERB_OF.find(([re]) => re.test(a)) || [])[1] || null;

// ── إغلاقُ الصفحة: نفسُها + مكوّناتُها ────────────────────────
const closure = (f, seen = new Set()) => {
  if (seen.has(f)) return '';
  seen.add(f);
  let t; try { t = read(f); } catch { return ''; }
  let out = t;
  for (const m of t.matchAll(/from '(\.[\w./-]+)'/g)) {
    if (!/components|pages/.test(m[1])) continue;
    const base = join(f, '..', m[1]).replace(ROOT + '/', '');
    for (const ext of ['.tsx', '.ts']) {
      try { readFileSync(join(ROOT, base + ext)); out += closure(base + ext, seen); break; } catch { /* ليس هنا */ }
    }
  }
  return out;
};

const PAGES = {};
for (const [page, file] of Object.entries(PAGE_FILE)) {
  const src = closure(file);
  PAGES[page] = ACTIONS.filter(a => new RegExp(`\\b${a}\\b`).test(src));
}

// ── الحكم: أيبلغه الكلام؟ ────────────────────────────────────
const pagesOf = (action) => Object.entries(PAGES).filter(([, as]) => as.includes(action)).map(([p]) => p);
const reach = {};
for (const a of ACTIONS) {
  const v = verbOf(a);
  const ps = pagesOf(a);
  const hit = v ? ABILITIES.find(x => x.verb === v && x.page && ps.includes(x.page)) : null;
  reach[a] = { verb: v, pages: ps, ability: hit?.id || null, say: hit?.say || null };
}

const n = (x) => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const L = [];
const p = (s = '') => L.push(s);

const live = ACTIONS.filter(a => reach[a].pages.length);
const dead = ACTIONS.filter(a => !reach[a].pages.length);
const spoken = live.filter(a => reach[a].ability);
const mute = live.filter(a => !reach[a].ability);

p('# ما يستطيع الإنسانُ فعلَه — في الصفحات وفي الكلام');
p();
p('> **مُولَّدٌ آليًّا** بـ`npm run report:page-actions` — لا يُحرَّر بيد.');
p('> يُقرأ من `store.tsx` و`MainLayout.tsx` و`abilities.ts` — نفسِ ما يقرؤه التطبيق.');
p();
p(`آخرُ توليد: ${new Date().toISOString().slice(0, 10)}`);
p();
p('## ① الخلاصة');
p();
p('| ما هو | العدد |');
p('|---|---|');
p(`| فعلًا يملكه الإنسان (بلا بنيةٍ داخليّة) | **${n(ACTIONS.length)}** |`);
p(`| منها **يبلغه الكلامُ** | **${n(spoken.length)}** |`);
p(`| منها لا يبلغه الكلامُ بعد | **${n(mute.length)}** |`);
p(`| فعلًا لا تستعمله أيُّ صفحة | **${n(dead.length)}** |`);
p(`| صفحةً مقروءة | **${n(Object.keys(PAGES).length)}** |`);
p();
p('## ② كلُّ فعلٍ وأين يعيش وهل يُطلَب بالكلام');
p();
p('| الفعل | الصيغة | الصفحات | يبلغه الكلام؟ |');
p('|---|---|---|---|');
for (const a of ACTIONS) {
  const r = reach[a];
  const where = r.pages.length ? r.pages.join(' · ') : '**لا صفحة**';
  const ok = !r.pages.length ? '—'
    : r.ability ? `✅ ${r.say}`
    : '❌ **ما كايناش**';
  p(`| \`${a}\` | ${r.verb || '—'} | ${where} | ${ok} |`);
}
p();
p('## ③ ما لا يبلغه الكلامُ بعد');
p();
if (!mute.length) p('لا شيء — كلُّ ما يُفعَل في صفحةٍ يُطلَب بجملة.');
else {
  p('كلُّ سطرٍ هنا **عملٌ حقيقيّ**: الإنسانُ يفعله بيده في صفحةٍ ولا يستطيع أن يطلبه بالكلام.');
  p();
  for (const a of mute) p(`· \`${a}\` (${reach[a].verb || 'بلا صيغة'}) — في: ${reach[a].pages.join(' · ')}`);
}
p();
if (dead.length) {
  p('## ④ أفعالٌ لا تستعملها صفحة');
  p();
  p('تعيش في المخزن ولا يبلغها مشهد. إمّا بابٌ ناقصٌ أو كودٌ ميّت.');
  p();
  for (const a of dead) p(`· \`${a}\``);
  p();
}

writeFileSync(join(ROOT, 'REPORTS/PAGE_ACTIONS.md'), L.join('\n'));
console.log(`[page-actions] ${ACTIONS.length} فعلًا · ${spoken.length} يبلغه الكلام · ${mute.length} لا يبلغه · ${dead.length} بلا صفحة → REPORTS/PAGE_ACTIONS.md`);
