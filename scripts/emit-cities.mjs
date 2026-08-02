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
export function buildCities(CITIES) {
  return CITIES.map(c => ({
    id: slug(c.ar),
    name: c.ar,
    aliases: Array.from(new Set(
      [c.darija, c.fr, c.en, ...(c.aliases || [])].map(s => String(s || '').trim()).filter(Boolean)
    )),
  }));
}

/** يُجمِّع knowledgeData.ts ويُعيد CITIES كما يراها المحرّك فعلًا. */
export async function loadSourceCities() {
  const dir = mkdtempSync(join(tmpdir(), 'amz-cities-'));
  const out = join(dir, 'kb.mjs');
  execFileSync('npx', ['esbuild', join(ROOT, 'src/lib/akg/kb/knowledgeData.ts'),
    '--bundle', '--format=esm', '--platform=node', '--outfile=' + out, '--log-level=error'],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  const { CITIES } = await import(out);
  return CITIES;
}

export const DEST = join(ROOT, 'server/generated/cities.json');

// يُنفَّذ فقط عند الاستدعاء المباشر — الاستيرادُ من الاختبار لا يكتب شيئًا.
if (process.argv[1] && process.argv[1].endsWith('emit-cities.mjs')) {
  const cities = buildCities(await loadSourceCities());
  mkdirSync(join(ROOT, 'server/generated'), { recursive: true });
  writeFileSync(DEST, JSON.stringify(cities, null, 0), 'utf8');
  console.log(`✅ ${cities.length} مدينة (${cities.reduce((n, c) => n + c.aliases.length, 0)} مرادفًا) → server/generated/cities.json`);
}
