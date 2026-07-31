#!/usr/bin/env node
'use strict';
// ============================================================
// AMANZINE — تدقيقُ صحّة المعرفة.
//   قاعدةُ المعرفة تُصاب بالمرض بصمت: مرادفٌ يسرقه مفهومان، فئةٌ فاسدة من
//   استيراد CSV، مفهومٌ لا تصل إليه أيُّ جملة. لا شيءَ من هذا يُسقط بناءً ولا
//   يظهر في السجلّ — يظهر فقط كجوابٍ رديءٍ للإنسان. هذا السكربت يجعله مرئيًّا،
//   و`test/knowledge-health.test.mjs` يجعله غيرَ قابلٍ للتفاقم.
//
//   الاستعمال:  node scripts/knowledge-audit.mjs [--json]
// ============================================================
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// نُجمّع الوحدة عبر esbuild بدل تحليل النصّ: الاعتماد على regex لقراءة TS هو
// نفسُه صنفُ الهشاشة الذي ندقّقه. نقرأ ما يراه المحرّك فعلًا، لا ما نظنّه.
export function loadConcepts() {
  const dir = mkdtempSync(join(tmpdir(), 'amz-audit-'));
  const out = join(dir, 'kb.mjs');
  execFileSync('npx', ['esbuild', join(ROOT, 'src/lib/akg/kb/concepts.ts'),
    '--bundle', '--format=esm', '--platform=node', '--outfile=' + out, '--log-level=error'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  return out;
}

const norm = (s) => String(s || '').toLowerCase().trim()
  .replace(/[ً-ٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

const AR = /[؀-ۿ]/;

export function audit(CONCEPTS) {
  const vars = (c) => Object.values(c.variants || {}).flat().map(String);

  // ① فئاتٌ فاسدة — رأسُ جدولٍ من CSV تسرّب كقيمة. خطيرٌ لأنّ categoryFor تُعيده
  //    قبل الخريطة المُنسَّقة، فتصير ٩٠ مهنةً «نفس الفئة» ⇒ خدماتٌ مرتبطةٌ عشوائيّة.
  const badCategory = CONCEPTS.filter(c => /\||الدارجة\s*\|/.test(c.category || '')).map(c => c.id);

  // ② مرادفٌ يملكه أكثر من مفهوم. الفهرس عالميٌّ عبر اللغات (arIndex/latIndex)،
  //    فالتعارضُ عبر اللغات ضارٌّ تمامًا كالتعارض داخلها.
  const owner = new Map(), conflicts = new Map();
  for (const c of CONCEPTS) for (const v of vars(c)) {
    const k = norm(v); if (k.length < 2) continue;
    const prev = owner.get(k);
    if (prev && prev !== c.id) {
      if (!conflicts.has(k)) conflicts.set(k, new Set([prev]));
      conflicts.get(k).add(c.id);
    } else if (!prev) owner.set(k, c.id);
  }

  // ③ مفاهيمُ لا تصل إليها جملة: كلُّ مرادفاتها يملكها غيرُها. موجودةٌ في اللوحة،
  //    معدومةٌ في الواقع — وهذا أسوأ من غيابها لأنّه يُوهم بتغطيةٍ ليست موجودة.
  const dead = [], shadowed = [];
  for (const c of CONCEPTS) {
    const vs = vars(c).map(norm).filter(v => v.length >= 2);
    if (!vs.length) { dead.push(c.id); continue; }
    const lost = vs.filter(v => owner.get(v) !== c.id);
    if (lost.length === vs.length) dead.push(c.id);
    else if (lost.length) shadowed.push({ id: c.id, lost: lost.length, total: vs.length });
  }

  // ④ مفاهيمُ مزدوجة: نفسُ التسمية العربيّة ⇒ مرشّحٌ للدمج.
  const byAr = new Map();
  for (const c of CONCEPTS) {
    const k = norm(c.concept?.ar); if (!k) continue;
    if (!byAr.has(k)) byAr.set(k, []);
    byAr.get(k).push(c.id);
  }
  const duplicates = [...byAr.entries()].filter(([, v]) => v.length > 1).map(([ar, ids]) => ({ ar, ids }));

  // ⑤ بقايا استيراد: services سطرٌ واحدٌ فيه أسطر، مرادفٌ رقميّ/كوديّ،
  //    وحرفٌ عربيٌّ في قوائم fr/en (خلطٌ يجعل المرادف غيرَ قابلٍ للمطابقة اللاتينيّة).
  const rawServices = CONCEPTS.filter(c => (c.services || []).some(s => /[\r\n]/.test(String(s)))).map(c => c.id);
  const junkVariants = CONCEPTS.filter(c => vars(c).some(v => /^[\d`\s]+$/.test(v) || /`/.test(v))).map(c => c.id);
  const langMix = CONCEPTS.filter(c => ['fr', 'en'].some(l => (c.variants?.[l] || []).some(v => AR.test(v)))).map(c => c.id);

  // ⑥ الشبكة: كم مفهومًا له حوافُّ مكتوبة (links) — لا مشتقّةً من «نفس الفئة».
  const withLinks = CONCEPTS.filter(c => Object.values(c.links || {}).some(a => a?.length)).length;

  return {
    total: CONCEPTS.length,
    badCategory, emptyCategory: CONCEPTS.filter(c => !String(c.category || '').trim()).map(c => c.id),
    conflicts: [...conflicts.entries()].map(([term, ids]) => ({ term, ids: [...ids] })),
    dead, shadowed: shadowed.sort((a, b) => b.lost / b.total - a.lost / a.total),
    duplicates, rawServices, junkVariants, langMix, withLinks,
  };
}

// ── تقرير ──
if (process.argv[1] && process.argv[1].endsWith('knowledge-audit.mjs')) {
  const mod = await import('file://' + loadConcepts());
  const CONCEPTS = mod.CONCEPTS || mod.default;
  const r = audit(CONCEPTS);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }

  const L = '─'.repeat(60);
  console.log(`\n${L}\n  تدقيقُ صحّة المعرفة — ${r.total} مفهومًا\n${L}`);
  const line = (n, label, extra = '') => console.log(`  ${String(n).padStart(4)}  ${label}${extra}`);
  line(r.badCategory.length, 'فئةٌ فاسدة (رأسُ جدول CSV)', r.badCategory.length ? ` → ${r.badCategory.slice(0, 5).join(', ')}…` : ' ✅');
  line(r.conflicts.length,   'مرادفٌ متعارض (يملكه أكثرُ من مفهوم)', r.conflicts.length ? '' : ' ✅');
  line(r.dead.length,        'مفهومٌ ميّت (لا تصل إليه جملة)', r.dead.length ? ` → ${r.dead.join(', ')}` : ' ✅');
  line(r.shadowed.length,    'مفهومٌ فقد بعضَ مرادفاته');
  line(r.duplicates.length,  'تسميةٌ عربيّةٌ مزدوجة (مرشّحُ دمج)');
  line(r.rawServices.length, 'services فيه أسطرٌ خام (\\r\\n)', r.rawServices.length ? '' : ' ✅');
  line(r.junkVariants.length,'مرادفٌ رقميّ/كوديّ', r.junkVariants.length ? ` → ${r.junkVariants.join(', ')}` : ' ✅');
  line(r.langMix.length,     'عربيّةٌ داخل قوائم fr/en', r.langMix.length ? '' : ' ✅');
  line(r.withLinks,          `مفهومٌ له حوافُّ مكتوبة (من ${r.total})`);

  if (r.conflicts.length) {
    console.log(`\n  أوّلُ ١٢ تعارضًا:`);
    for (const { term, ids } of r.conflicts.slice(0, 12)) console.log(`     «${term}» ⇒ ${ids.join(' | ')}`);
  }
  console.log('');
}

// ── فهرسُ المرادفات المدمجة (للخادم) ────────────────────────────
//   حارسُ التعارض في /api/knowledge كان يقارن بـ custom_concepts وحدها، فكان
//   بإمكان مفهومٍ جديدٍ أن يسرق «سبّاك» من `plumber` المدمج بلا اعتراض — وهو
//   بالضبط صنفُ الخطأ الذي ولّد ١٤٦ تعارضًا. الخادم لا يقرأ TS، فنُصدّر له
//   خريطةً مسطّحة: مرادفٌ مطبَّع → معرّف المفهوم.
//   التوليد:  npm run gen:variants
if (process.argv.includes('--emit-index')) {
  const mod = await import('file://' + loadConcepts());
  const CONCEPTS = mod.CONCEPTS || mod.default;
  const map = {};
  for (const c of CONCEPTS) {
    for (const v of Object.values(c.variants || {}).flat()) {
      const k = norm(v); if (k.length >= 2 && !map[k]) map[k] = c.id;
    }
    for (const v of Object.values(c.concept || {})) {
      const k = norm(v); if (k.length >= 2 && !map[k]) map[k] = c.id;
    }
  }
  const out = join(ROOT, 'server/generated/builtin-variants.json');
  writeFileSync(out, JSON.stringify(map));
  console.log(`✅ ${Object.keys(map).length} مرادفًا مدمجًا → server/generated/builtin-variants.json`);
}
