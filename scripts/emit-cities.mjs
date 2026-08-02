#!/usr/bin/env node
'use strict';
// ============================================================
// توليدُ معجم المدن للخادم من قاعدة المعرفة.
//   الخادمُ يحتاج المدنَ ومرادفاتِها ليُطابق ما تُرجعه شركاتُ التوصيل
//   («Casablanca» ⇄ «الدار البيضاء»). وكتابةُ قائمةٍ ثانيةٍ في الخادم تعني
//   مصدرَ حقيقةٍ جديدًا يتباعد بصمت — وهو المرضُ الذي عالجناه في PR-02.
//   المصدرُ يبقى CITIES في src/lib/akg/kb/knowledgeData.ts، وهذا يُصدِّره.
//
//   الاستعمال:  node scripts/emit-cities.mjs
// ============================================================
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function slug(ar) {
  // مُعرِّفٌ ثابتٌ مشتقٌّ من الاسم العربيّ — لا يعتمد على الترتيب فلا يتغيّر
  // حين تُضاف مدينةٌ في المنتصف، وإلّا أشارت خرائطُ الشحنات القديمة لمدنٍ أخرى.
  return 'city-' + Buffer.from(String(ar)).toString('hex').slice(0, 24);
}

/** التحويلُ مُصدَّرٌ كي يستعمله اختبارُ الطزاجة نفسَه — لا نسخةً ثانيةً تتباعد. */
export function buildCities(CITIES, regions = []) {
  // الجهةُ تُلحَق من الجغرافيا الإداريّة: قواعدُ التسعير حسب المنطقة («الجنوب
  // أغلى») تحتاجها، ولا معنى لتكرارها يدويًّا وهي مُعرَّفةٌ أصلًا في geo.ts.
  const regionOf = new Map();
  for (const r of regions) for (const c of r.cities || []) regionOf.set(String(c).trim(), r.id);

  return CITIES.map(c => ({
    id: slug(c.ar),
    name: c.ar,
    region: regionOf.get(String(c.ar).trim()) || '',
    aliases: Array.from(new Set(
      [c.darija, c.fr, c.en, ...(c.aliases || [])].map(s => String(s || '').trim()).filter(Boolean)
    )),
  }));
}

/** يُجمِّع مصدرَي المعرفة ويُعيد ما يراه المحرّك فعلًا. */
export async function loadSourceCities() {
  const dir = mkdtempSync(join(tmpdir(), 'amz-cities-'));
  const bundle = async (src, name) => {
    const out = join(dir, name);
    execFileSync('npx', ['esbuild', join(ROOT, src),
      '--bundle', '--format=esm', '--platform=node', '--outfile=' + out, '--log-level=error'],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    return import(out);
  };
  const { CITIES } = await bundle('src/lib/akg/kb/knowledgeData.ts', 'kb.mjs');
  const { allRegions } = await bundle('src/lib/akg/kb/geo.ts', 'geo.mjs');
  return { CITIES, regions: allRegions() };
}

export const DEST = join(ROOT, 'server/generated/cities.json');

// يُنفَّذ فقط عند الاستدعاء المباشر — الاستيرادُ من الاختبار لا يكتب شيئًا.
if (process.argv[1] && process.argv[1].endsWith('emit-cities.mjs')) {
  const { CITIES, regions } = await loadSourceCities();
  const cities = buildCities(CITIES, regions);
  mkdirSync(join(ROOT, 'server/generated'), { recursive: true });
  writeFileSync(DEST, JSON.stringify(cities, null, 0), 'utf8');
  console.log(`✅ ${cities.length} مدينة (${cities.reduce((n, c) => n + c.aliases.length, 0)} مرادفًا) → server/generated/cities.json`);
}
