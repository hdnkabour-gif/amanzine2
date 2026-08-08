#!/usr/bin/env node
// ============================================================
// **خطُّ الأنبوب — جملةً جملةً، حلقةً حلقة.**
//
//   السؤالُ ليس «هل فهم؟» بل: أين انقطع الخيطُ بين ما كتبه الإنسانُ وما
//   رآه على الشاشة. فتُطبَع كلُّ حلقةٍ على حدة:
//
//       ما كُتب → الفهم → النيّة → المفهوم → المرادفات
//              → الطلب المُرسَل → عدد النتائج → أوّلُ نتيجة
//              → هل هي ما طُلب → ما يراه الإنسان → الخلاصة
//
//   وأخطرُ خلاصةٍ هنا **`FALSE_SUCCESS`**: نتائجُ رجعت وليست ما طُلب.
//   تُحسَب فشلًا لا نجاحًا، لأنّها تمنح ثقةً في غير موضعها.
//
//   المرادفاتُ والفئةُ والسقفُ تُبنى من **نفس العقد** الذي تستعمله الواجهة
//   (`expandQuery` + `toSearchFilters`) — لا نسخةٌ ثانيةٌ منه هنا، وإلّا
//   قِسنا شيئًا غيرَ الذي يعمل.
// ============================================================

import { build } from 'esbuild';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const OUT = join(ROOT, 'REPORTS/browser');
const API = process.env.WALK_API || 'http://127.0.0.1:3001';
mkdirSync(OUT, { recursive: true });

/**
 * إحدى عشرة جملةً — كلُّها من شاشاتٍ حيّةٍ أو من صاحب المشروع، لا مُختلَقة.
 *
 *   ولكلٍّ **بضاعةٌ تُزرَع في السوق باسمٍ لا يطابق السؤال حرفيًّا** — لأنّ
 *   أحدًا لا يسمّي بضاعتَه بالكلمات التي يكتبها الباحث. بلا هذا الزرع لا
 *   يُقاس المطابِقُ أصلًا: «صفرٌ» في سوقٍ فارغٍ لا يقول شيئًا.
 */
const CASES = [
  { said: 'بغيت شي كسوة لبنتي أنا فكازة', seed: { name: 'حوايج دراري صغار', price: 65, category: 'ملابس الأطفال' }, want: /حوايج|كسوة|ملابس|دراري|صغار/ },
  { said: 'بغيت سبّاك مستعجل', seed: { name: 'خدمة السباكة وفتح المجاري', price: 150, category: 'سباكة', type: 'service' }, want: /سباك|سباكة|مجاري|plombier/i },
  { said: 'شكون كيصلح الثلاجة فكازا', seed: { name: 'تصليح الثلاجات والمجففات', price: 200, category: 'أجهزة منزلية', type: 'service' }, want: /ثلاج|تبريد|frigo|تصليح/i },
  { said: 'بغيت نغسل الطوموبيل', seed: { name: 'مغسلة سيارات كازا', price: 40, category: 'غسل السيارات', type: 'service' }, want: /غسل|مغسلة|سيارات|lavage/i },
  { said: 'فين نلقى طبيب أسنان', seed: { name: 'عيادة طبيب الأسنان', price: 300, category: 'صحة', type: 'service' }, want: /أسنان|طبيب|dentiste/i },
  { said: 'بغيت بيتزا', seed: { name: 'مطعم البيتزا الإيطالية', price: 55, category: 'مطاعم', type: 'service' }, want: /بيتزا|pizza|مطعم/i },
  { said: 'عندي ماكينة الغسيل خاسرة', seed: { name: 'إصلاح الغسالات فكازا', price: 180, category: 'أجهزة منزلية', type: 'service' }, want: /غسال|غسيل|إصلاح/i },
  { said: 'بغيت نشري تلفون مستعمل', seed: { name: 'تلفون سامسونغ مستعمل', price: 900, category: 'إلكترونيات' }, want: /تلفون|هاتف|سامسونغ/i },
  { said: 'شي حرفي يصبغ ليا الدار', seed: { name: 'صباغة الدور والشقق', price: 500, category: 'صباغة', type: 'service' }, want: /صباغ|صباغة|دهان|peintre/i },
  { said: 'بغيت جلابة', seed: { name: 'جلابة نسائية صيفية', price: 250, category: 'لباس تقليدي' }, want: /جلاب|قفطان|لباس/i },
  // السقفُ وحدَه — لا مفهومَ فيها. البضاعتان تختبران أنّ السقفَ **يُقصي**.
  { said: 'بغيت شي حاجة بأقلّ من ٢٠٠ درهم', seed: { name: 'شارجور تلفون', price: 80, category: 'إلكترونيات' }, want: null, ceiling: 200 },
];

const CITY = 'الدار البيضاء';

// ── العقدُ نفسُه، مُجمَّعًا من مصدر الواجهة ──────────────────────
const TMP = join(ROOT, '.pipeline-contract.mjs');
await build({
  stdin: {
    contents: `export { expandQuery, toSearchFilters, toSearchParams } from './src/lib/searchIntent';`,
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: TMP, logLevel: 'silent',
});
const { expandQuery, toSearchFilters } = await import(TMP + `?t=${Date.now()}`);

const api = async (path, opts = {}) => {
  const r = await fetch(API + path, {
    ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

// ── زرعُ السوق: تاجرٌ واحدٌ وبضاعةٌ لكلّ جملة ──────────────────
const reg = await api('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ name: 'عبدو', email: `pipeline-${Date.now()}@test.ma`, password: 'pipeline-123', storeName: 'حانوت عبدو' }),
});
const TOKEN = reg.body.token || reg.body.accessToken;
if (!TOKEN) { console.error('تعذّر تهيئةُ التاجر:', reg.status, JSON.stringify(reg.body).slice(0, 200)); process.exit(2); }
for (const c of CASES) {
  await api('/api/products', {
    method: 'POST', headers: { authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ ...c.seed, stock: 3, status: 'published', city: CITY, offerType: c.seed.type === 'service' ? 'service' : 'product' }),
  });
}
// وبضاعةٌ فوق السقف: إن ظهرت مع «بأقلّ من ٢٠٠ درهم» فالمرشِّحُ لا يعمل.
await api('/api/products', {
  method: 'POST', headers: { authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ name: 'شارجور تلفون أصلي', price: 950, stock: 3, status: 'published', city: CITY, category: 'إلكترونيات' }),
});

const rows = [];
console.log('\n══ خطُّ الأنبوب — إحدى عشرة جملة ══\n');

for (const c of CASES) {
  const intent = expandQuery(c.said);
  const filters = toSearchFilters(intent, CITY);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    qs.set(k, String(v));
  }
  const req = `/api/search?${qs}`;
  const res = await api(req);
  const items = [...(res.body.products || []), ...(res.body.businesses || [])];
  const names = items.map(x => String(x.name || ''));
  const relevant = c.want ? names.some(n => c.want.test(n)) : items.length > 0;
  // السقفُ المُعلَن يُقاس فعلًا: بضاعةٌ أغلى ظاهرةٌ ⇒ نجاحٌ كاذب.
  const overCeiling = c.ceiling ? items.filter(x => +x.price > c.ceiling).map(x => x.name) : [];

  // **رتبةُ المزروع**: الإنسانُ يرى الأوّلَ لا الرابع. أن يُوجَد المطلوبُ
  // بعد ثلاثةٍ لا تَخصّه ليس عثورًا — لذا تُقاس الرتبةُ لا الوجودُ وحدَه.
  const rank = names.findIndex(n => n === c.seed.name) + 1;

  // الخلاصة: النجاحُ الكاذبُ فشلٌ صريح.
  const outcome = res.status !== 200 ? 'ERROR'
    : overCeiling.length ? 'FALSE_SUCCESS'
      : items.length === 0 ? 'NOT_FOUND'
        : !relevant ? 'FALSE_SUCCESS'
          : (rank === 0 || rank > 3) ? 'WEAK_RANK' : 'OK';

  const row = {
    raw: c.said,
    understanding: intent.concept ? 'مفهوم' : 'غير مفهوم',
    concept: intent.concept || '—',
    category: intent.category || '—',
    terms: intent.terms.length,
    maxPrice: intent.maxPrice ?? '—',
    request: req,
    count: items.length,
    top: names[0] || '—',
    relevant,
    outcome,
  };
  rows.push(row);

  row.seeded = c.seed.name;
  row.rank = rank || null;
  row.overCeiling = overCeiling;
  const mark = outcome === 'OK' ? '✅' : outcome === 'FALSE_SUCCESS' ? '🟥' : outcome === 'WEAK_RANK' ? '🟨' : '❌';
  console.log(`${mark} «${row.raw}»`);
  console.log(`     الفهم    : ${row.understanding} · المفهوم: ${row.concept} · الفئة: ${row.category}`);
  console.log(`     المرادفات: ${row.terms} · السقف: ${row.maxPrice}`);
  console.log(`     الطلب    : ${decodeURIComponent(row.request).slice(0, 150)}`);
  console.log(`     المزروع  : ${row.seeded} · رتبتُه: ${rank || 'ما ظهرش'}`);
  console.log(`     النتيجة  : ${row.count} · الأولى: ${row.top}`);
  if (overCeiling.length) console.log(`     فوق السقف: ${overCeiling.join(' · ')}`);
  console.log(`     الخلاصة  : ${row.outcome}\n`);
}

const tally = rows.reduce((a, r) => (a[r.outcome] = (a[r.outcome] || 0) + 1, a), {});
console.log('── الخلاصة ──');
for (const [k, v] of Object.entries(tally)) console.log(`   ${k}: ${v}`);
console.log(`   البضاعةُ مزروعةٌ لكلّ جملة، فـ«ما لقّيناش» هنا عطبُ مطابقةٍ لا سوقٌ فارغ.`);
console.log(`   والنجاحُ الكاذبُ (🟥) أسوأُ من الصفر: ثقةٌ في غير موضعها.\n`);

writeFileSync(join(OUT, 'pipeline.json'), JSON.stringify({ at: new Date().toISOString(), rows, tally }, null, 2));
rmSync(TMP, { force: true });
process.exit((tally.OK || 0) === CASES.length ? 0 : 1);
