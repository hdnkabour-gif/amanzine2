import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

// ============================================================
// حارسُ المعمارية.
//   PR-03 حذف 290 سطرًا من `if (apiType === 'livo')`. لا شيءَ يمنع عودةَ
//   سطرٍ واحدٍ منها الأسبوعَ القادم بنيّةٍ حسنة — «حلٌّ سريعٌ مؤقّت» — فينهار
//   المبدأ بلا صوت. هذه الاختبارات هي الصوت.
//
//   القاعدةُ المحروسة: **لا جزءَ من النظام يعرف اسمَ شركةِ توصيل، عدا ملفِّ
//   المزوّد نفسِه.** وإضافةُ شركةٍ = إسقاطُ ملفٍّ في المجلّد، لا تعديلُ كود.
//
//   ملاحظةُ دقّة: الحارس يقرأ مُعرِّفاتِ المزوّدين **من السجلّ نفسِه**، فيتّسع
//   تلقائيًّا مع كلّ شركةٍ جديدة. ولا يعتمد على اسم المتغيّر: `provider ===
//   'gemini'` (ذكاء) و`'google'` (مصادقة) استعمالاتٌ مشروعةٌ لا علاقةَ لها
//   بالتوصيل، وتمييزُها شرطُ ألّا يصير الحارسُ ضجيجًا يُتجاهَل.
// ============================================================

const require_ = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url).pathname;
const SERVER = join(ROOT, 'server');
const PROVIDERS_DIR = join(SERVER, 'services/delivery/providers');
const ADAPTERS_DIR = join(SERVER, 'services/delivery/adapters');
const REGISTRY_FILE = join(SERVER, 'services/delivery/registry.js');

const registry = require_(join(SERVER, 'services/delivery/registry.js'));
const { validateProvider } = require_(join(SERVER, 'services/delivery/contract.js'));

// مُعرِّفاتٌ عامّةٌ تصف وسيلةَ اتصالٍ لا شركة — كلمةٌ إنجليزيّةٌ شائعة يجوز
// ورودُها في منطق الأعمال (عمود webhook_url مثلًا).
const GENERIC_IDS = new Set(['webhook']);

/** أسماءُ الشركات المحروسة: ما يُسجّله السجلّ، عدا العامّ. */
const BRANDS = registry.list().map(p => p.id).filter(id => !GENERIC_IDS.has(id));

/** مسارات معفاة: المزوّدون أنفسُهم، والاختبارات، والاعتماديّات. */
const EXEMPT = [
  'node_modules', 'services/delivery/providers/', 'services/delivery/adapters/',
  'server/test/', '/data/', 'generated/',
];

/**
 * استثناءاتٌ موثَّقة. **هذه القائمة تنكمش ولا تنمو** — وأسفلَها اختبارُ سقّاطة
 * يمنع تضخّمها. كلُّ سطرٍ هنا دَينٌ معماريٌّ معروفٌ لا مفاجأة.
 */
const ALLOWED = [
  {
    pattern: /livo_order_id|livoOrderId/,
    why: 'عمودٌ تاريخيٌّ لمعرّف الشحنة سُمّي باسم شركة؛ البديلُ العامّ '
       + 'provider_shipment_id مُضافٌ ويُملأ معه، ويُحذف حين تختفي القراءاتُ القديمة.',
  },
];
const ALLOWED_MAX = 1;   // سقّاطة: لا تزد

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (EXEMPT.some(x => (p + (statSync(p).isDirectory() ? '/' : '')).includes(x))) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

/**
 * أسطرُ الكودِ وحدَها — بلا تعليقات. التعليقاتُ تشرح المعمارية وتذكر أسماءَ
 * الشركات بالضرورة؛ حجبُها هنا شرطُ ألّا يُعاقَب الشرحُ عقابَ المخالفة.
 */
function codeLines(src) {
  const out = [];
  let inBlock = false;
  src.split('\n').forEach((raw, i) => {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end === -1) return;
      line = line.slice(end + 2);
      inBlock = false;
    }
    for (;;) {
      const open = line.indexOf('/*');
      if (open === -1) break;
      const close = line.indexOf('*/', open + 2);
      if (close === -1) { line = line.slice(0, open); inBlock = true; break; }
      line = line.slice(0, open) + line.slice(close + 2);
    }
    // تعليقُ سطرٍ — مع تجاهل «//» داخل رابط (http://)
    const m = line.match(/(^|[^:])\/\//);
    if (m) line = line.slice(0, m.index + (m[1] ? 1 : 0));
    if (line.trim()) out.push({ n: i + 1, text: line });
  });
  return out;
}

const FILES = walk(SERVER).map(p => ({
  rel: p.slice(ROOT.length),
  lines: codeLines(readFileSync(p, 'utf8')),
}));

const isAllowed = (text) => ALLOWED.some(a => a.pattern.test(text));

// ── ① لا فرعَ يقارن باسمِ شركةِ توصيل ─────────────────────────
test('لا مقارنةَ بمُعرِّف شركةِ توصيل خارج مجلّد المزوّدين', () => {
  assert.ok(BRANDS.length >= 3, 'يجب أن يعرف الحارسُ شركاتٍ ليحرسها');
  const hits = [];
  const rx = new RegExp(`===?\\s*['"\`](${BRANDS.join('|')})['"\`]`, 'i');
  for (const f of FILES) {
    for (const l of f.lines) {
      if (rx.test(l.text) && !isAllowed(l.text)) hits.push(`${f.rel}:${l.n} → ${l.text.trim()}`);
    }
  }
  assert.deepEqual(hits, [],
    'عاد فرعٌ باسم شركة. الصحيح: أضِف ملفًّا في services/delivery/providers/ ودَعِ السجلَّ يختاره.');
});

// ── ② لا استيرادَ مباشرٍ لملفِّ مزوّد ──────────────────────────
test('لا يستورد أحدٌ ملفَّ مزوّدٍ مباشرةً عدا السجلّ', () => {
  const hits = [];
  for (const f of FILES) {
    if (f.rel.endsWith('services/delivery/registry.js')) continue;
    for (const l of f.lines) {
      if (/require\(\s*['"`][^'"`]*delivery\/(providers|adapters)\//.test(l.text)) {
        hits.push(`${f.rel}:${l.n} → ${l.text.trim()}`);
      }
    }
  }
  assert.deepEqual(hits, [],
    'الوصولُ إلى مزوّدٍ يمرّ بـ registry.get()/resolve() لا باستيرادٍ مباشر.');
});

// ── ③ السجلُّ يكتشف ولا يُعدِّد ────────────────────────────────
test('السجلّ يمسح المجلّد ولا يحمل خريطةً ثابتة', () => {
  const raw = readFileSync(REGISTRY_FILE, 'utf8');
  assert.ok(/readdirSync/.test(raw), 'السجلّ يجب أن يكتشف بمسح المجلّد');
  // تعليقاتُ السجلّ تذكر «{ livo, amana }» لتشرح ما لا يجب فعلُه — تُحجَب هنا
  // وإلّا فشل الحارسُ على شرحِه لنفسِه.
  const code = codeLines(raw).map(l => l.text).join('\n');
  for (const brand of BRANDS) {
    // مفتاحٌ مقتبسٌ أو غيرُ مقتبس، أو استيرادٌ باسمه — الخريطةُ الثابتة تأخذ
    // كلَّ هذه الأشكال، وحصرُها في الشكل المقتبس وحده ثغرةٌ في الحارس.
    const rx = new RegExp(`require\\([^)]*${brand}|['"\`]?\\b${brand}\\b['"\`]?\\s*:`, 'i');
    assert.ok(!rx.test(code), `السجلّ يذكر «${brand}» صراحةً — عادت الخريطةُ الثابتة`);
  }
});

// ── ④ كلُّ مزوّدٍ يُحمَّل ويطابق العقد ─────────────────────────
test('كلُّ ملفٍّ في providers/ و adapters/ يُحمَّل ويطابق العقد', () => {
  const provs = readdirSync(PROVIDERS_DIR).filter(f => f.endsWith('.provider.js'));
  const adapts = readdirSync(ADAPTERS_DIR).filter(f => f.endsWith('.adapter.js'));
  assert.ok(provs.length >= 3, 'يجب وجودُ مزوّدين فعليّين');
  assert.ok(adapts.length >= 1, 'يجب وجودُ وسيلةِ اتصالٍ واحدةٍ على الأقلّ');

  for (const f of provs) {
    const mod = require_(join(PROVIDERS_DIR, f));
    assert.deepEqual(validateProvider(mod), [], `${f} لا يطابق العقد`);
    assert.ok(registry.get(mod.meta.id), `${f} لم يُسجَّل رغم مطابقته`);
  }
  for (const f of adapts) {
    const mod = require_(join(ADAPTERS_DIR, f));
    assert.deepEqual(validateProvider(mod), [], `${f} لا يطابق العقد`);
    assert.equal(mod.meta.kind, 'adapter', `${f} يجب أن يُعلن kind:'adapter'`);
    assert.ok(registry.getAdapter(mod.meta.id), `${f} لم يُسجَّل كوسيلة`);
  }
  assert.deepEqual(registry.rejected(), [], 'مزوّدٌ أو وسيلةٌ مرفوضةٌ عند التحميل');
});

// ── ⑥ الشركةُ ليست الوسيلة ────────────────────────────────────
test('لا وسيلةَ اتصالٍ مُسجَّلةٌ كشركةٍ ولا العكس', () => {
  const providerIds = registry.list().map(p => p.id);
  const adapterIds = registry.listAdapters().map(a => a.id);
  const overlap = providerIds.filter(id => adapterIds.includes(id));
  assert.deepEqual(overlap, [],
    'مُعرِّفٌ مُسجَّلٌ في الجهتين — «Webhook» وسيلةُ وصولٍ لا شركةَ توصيل.');
  for (const p of registry.list()) {
    assert.notEqual(p.kind, 'adapter', `${p.id} يُعلن أنّه وسيلةٌ لكنّه في providers/`);
  }
});

// ── ⑦ المُولَّدُ مطابقٌ لمصدره ──────────────────────────────────
test('معجمُ مدن الخادم مُطابقٌ لقاعدة المعرفة (لا انجرافَ صامت)', async () => {
  const { buildCities, loadSourceCities, DEST } = await import('../scripts/emit-cities.mjs');
  const expected = buildCities(await loadSourceCities());
  const actual = JSON.parse(readFileSync(DEST, 'utf8'));
  // تعديلُ knowledgeData.ts بلا إعادة توليدٍ يترك الخادمَ على معجمٍ قديم،
  // فتفشل مطابقةُ مدنِ شركةٍ بلا سببٍ ظاهر. هذا يجعل النسيانَ مرئيًّا.
  assert.deepEqual(actual, expected,
    'server/generated/cities.json قديم — شغّل: npm run gen:cities');
});

// ── ⑤ الاستثناءاتُ لا تنمو ────────────────────────────────────
test('قائمةُ الاستثناءات المعماريّة لا تتضخّم', () => {
  assert.ok(ALLOWED.length <= ALLOWED_MAX,
    `الاستثناءات ${ALLOWED.length} > ${ALLOWED_MAX}. الاستثناءُ دَينٌ يُسدَّد لا رصيدٌ يُنفَق.`);
  for (const a of ALLOWED) {
    assert.ok(a.why && a.why.length > 40, 'كلُّ استثناءٍ يحتاج سببًا مكتوبًا');
  }
});
