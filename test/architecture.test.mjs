import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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
  const { CITIES, regions } = await loadSourceCities();
  const expected = buildCities(CITIES, regions);
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

// ── ⑧ كلُّ أصلٍ مُشارٍ إليه موجودٌ فعلًا ────────────────────────
test('لا مرجعَ إلى ملفِّ أصلٍ غيرِ موجود (اللوگو والأيقونات)', () => {
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  // المصادرُ تشمل src/ أيضًا: حصرُ الفحص في index.html كان ثغرةً في الحارس
  // نفسِه — بقي 16 مرجعًا مكسورًا في المكوّنات، ومنها لوگو شريط التنقّل.
  const sources = ['index.html', 'public/manifest.json'];
  const collectTsx = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) collectTsx(p);
      else if (/\.tsx?$/.test(p)) sources.push(p.slice(ROOT_DIR.length));
    }
  };
  collectTsx(join(ROOT_DIR, 'src'));

  const missing = [];
  for (const src of sources) {
    const text = readFileSync(join(ROOT_DIR, src), 'utf8');
    // مساراتٌ مطلقةٌ تبدأ بـ / وتنتهي بامتداد صورة — تُخدَم من public/
    for (const m of text.matchAll(/["'(](\/[\w\-./]+\.(?:svg|png|jpg|jpeg|webp|ico|mp4))["')]/g)) {
      const rel = m[1].replace(/^\//, '');
      if (!existsSync(join(ROOT_DIR, 'public', rel))) missing.push(`${src} → /${rel}`);
    }
  }
  // اللوگو كان يشير إلى amanzine-logo.svg وهو غيرُ موجود: أيقونةٌ مكسورةٌ في
  // التبويب، وصورةٌ مكسورةٌ في شاشة البدء، وأيقونةُ PWA تُرجع 404.
  assert.deepEqual(missing, [], 'مرجعٌ إلى أصلٍ غيرِ موجود');
});

// ── ⑨ لا صفحةَ مبنيّةٌ بلا طريقٍ إليها ──────────────────────────
test('كلُّ صفحةٍ في src/pages إمّا موصولةٌ أو معفاةٌ بسببٍ مكتوب', () => {
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const PAGES = join(ROOT_DIR, 'src/pages');

  // ليست صفحاتٍ: أغلفةٌ وتوجيهٌ ومكوّناتُ تخطيط.
  const NOT_A_PAGE = new Set(['MainLayout', 'NavBar']);

  const files = readdirSync(PAGES).filter(f => f.endsWith('.tsx'))
    .map(f => f.replace(/\.tsx$/, ''))
    .filter(n => !NOT_A_PAGE.has(n));

  // مرجعٌ من أيّ ملفٍّ آخر: توزيعٌ داخليّ، أو Route، أو تضمينٌ في صفحةٍ أخرى.
  const all = [];
  const walkTsx = (dir) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) walkTsx(p);
      else if (/\.tsx?$/.test(p)) all.push({ p, s: readFileSync(p, 'utf8') });
    }
  };
  walkTsx(join(ROOT_DIR, 'src'));

  const orphans = files.filter(name => {
    const rx = new RegExp(`(<${name}[\\s/>]|import\\(['"\`][^'"\`]*${name}['"\`]\\)|from ['"\`][^'"\`]*${name}['"\`])`);
    return !all.some(f => !f.p.endsWith(`pages/${name}.tsx`) && rx.test(f.s));
  });

  // FieldVisit كان يتيمًا: 298 سطرًا وخادمٌ يعمل وجدولٌ في القاعدة، ولا سبيلَ
  // لأيّ مستخدمٍ لفتحه. ميزةٌ كاملةٌ مبنيّةٌ وغيرُ موجودةٍ عمليًّا.
  assert.deepEqual(orphans, [],
    'صفحةٌ مبنيّةٌ لا يصل إليها أحد — صِلها بالتوزيع والقائمة أو احذفها.');
});

test('كلُّ صفحةٍ تملك رابطًا خاصًّا بها — لا صفحتان على عنوانٍ واحد', () => {
  // العطبُ الذي وُلد منه هذا: `field-visit` كانت في `PAGE_IDS` وفي `MainLayout`
  // — فمرّت من حارس اليتامى — لكن بلا مدخلٍ في `PAGE_URLS`. النتيجة: العنوانُ
  // لا يتغيّر عند فتحها، فتظهر **صفحتان مختلفتان على `/moderation`**، ولا
  // يعمل الرابطُ المباشر ولا زرُّ الرجوع. الحارسُ القديم فحص «هل تُستورَد؟»
  // ولم يفحص «هل لها عنوان؟» — وصلٌ ناقصٌ يمرّ من فحصٍ ناقص.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const types = readFileSync(join(ROOT_DIR, 'src/types.ts'), 'utf8');
  const app   = readFileSync(join(ROOT_DIR, 'src/App.tsx'), 'utf8');

  const idsBlock = types.match(/export const PAGE_IDS = \[([\s\S]*?)\] as const/);
  assert.ok(idsBlock, 'تعذّر قراءة PAGE_IDS');
  const ids = [...idsBlock[1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  assert.ok(ids.length >= 20, `صفحاتٌ قليلةٌ قُرئت (${ids.length})`);

  const urlsBlock = app.match(/const PAGE_URLS[^=]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(urlsBlock, 'تعذّر قراءة PAGE_URLS');
  const entries = [...urlsBlock[1].matchAll(/'?([a-z-]+)'?:\s*'([^']+)'/g)];
  const urlOf = Object.fromEntries(entries.map(m => [m[1], m[2]]));

  const missing = ids.filter(id => !urlOf[id]);
  assert.deepEqual(missing, [], `صفحاتٌ بلا رابط: ${missing.join(' · ')} — العنوانُ لن يتغيّر عند فتحها`);

  // ولا عنوانان متطابقان: رابطٌ واحدٌ لصفحتين يجعل الرجوعَ والمشاركةَ عشوائيَّين.
  const seen = new Map();
  for (const [id, url] of Object.entries(urlOf)) {
    if (seen.has(url)) assert.fail(`الرابط ${url} لصفحتين: ${seen.get(url)} و${id}`);
    seen.set(url, id);
  }
});

test('حالةٌ مُشتقّةٌ من الصفحة تُزامَن — لا تُجمَّد عند أوّل بناء', () => {
  // العطبُ الذي وُلد منه هذا: `ProductsPage` تخدم «المنتجات» و«الخدمات».
  // React لا يُعيد بناءَ المكوّن حين يتغيّر `currentPage` (نفسُ النوع، نفسُ
  // الموضع) ⇒ `useState(isServicesMode ? 'service' : 'all')` تُحسَب **مرّةً
  // واحدة**. فمن يفتح المنتجاتِ ثمّ ينتقل للخدمات يرى العنوانَ يقول «٠ خدمة»
  // والقائمةَ تعرض منتجَين. العنوانُ صادقٌ والقائمةُ متجمّدة.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const PAGES = join(ROOT_DIR, 'src/pages');

  // أوّلًا: أيُّ مكوّنٍ يخدم أكثر من صفحة؟ منه وحدَه يأتي هذا الخطر.
  const layout = readFileSync(join(PAGES, 'MainLayout.tsx'), 'utf8');
  const pairs = [...layout.matchAll(/case '([a-z-]+)':\s*return <([A-Za-z]+)/g)];
  const served = {};
  for (const [, page, comp] of pairs) (served[comp] ||= []).push(page);
  const shared = Object.entries(served).filter(([, ps]) => ps.length > 1).map(([c]) => c);

  for (const comp of shared) {
    let src;
    try { src = readFileSync(join(PAGES, `${comp}.tsx`), 'utf8'); } catch { continue; }

    // أسماءُ المتغيّرات المشتقّة من الصفحة: `const isXMode = currentPage === …`
    const derived = [...src.matchAll(/const\s+(\w+)\s*=\s*currentPage\s*===/g)].map(m => m[1]);
    const modes = ['currentPage', ...derived];

    for (const mode of modes) {
      // هل تُستعمل في تهيئةِ حالة؟
      const initsState = new RegExp(`useState[^;]{0,200}\\b${mode}\\b`).test(src);
      if (!initsState) continue;
      // فيجب أن تُزامَن بأثرٍ يعتمد عليها.
      const synced = new RegExp(`useEffect\\([\\s\\S]{0,400}?\\[[^\\]]*\\b${mode}\\b[^\\]]*\\]`).test(src);
      assert.ok(synced,
        `${comp}.tsx: حالةٌ تُهيَّأ من «${mode}» بلا useEffect يزامنها — ` +
        `المكوّن يخدم ${served[comp].join(' و')} فلا يُعاد بناؤه بينهما.`);
    }
  }
});

test('حالةُ الفراغ تُفرِّق بين «لا شيءَ هنا» و«لا شيءَ أبدًا»', () => {
  // العطبُ الذي وُلد منه هذا: `/orders` تفتح على تبويب «بانتظار». تاجرٌ عنده
  // ١٦ طلبًا ولا واحدَ منها معلّق يرى: «لا توجد طلبات بعد — شارك رابط متجرك
  // لاستقبال أوّل طلب». الجملةُ تُنكر بضعةَ آلافِ دراهمَ من العمل، وتدعوه
  // لبدايةٍ قطعها منذ زمن. ومثلُها في `/products` بوضع الخدمات.
  //
  // القاعدة: كلُّ فراغٍ محسوبٍ من قائمةٍ **مُصفّاة** يجب أن يفرّق. جملةُ
  // البداية («أوّل…» / «…بعد») مسموحةٌ فقط تحت شرطٍ على المجموعة الكاملة.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const PAGES = join(ROOT_DIR, 'src/pages');
  const FIRST_RUN = /(?:^|[\s«"'>])(?:أوّل|أول)\s|بعدُ?\s*[<«"']|بعد\s*<\/|طلبات بعد|منتجات بعد/;

  for (const file of readdirSync(PAGES).filter(f => f.endsWith('.tsx'))) {
    const src = readFileSync(join(PAGES, file), 'utf8');

    // متغيّراتٌ مُشتقّةٌ بالتصفية — لا تمثّل المجموعةَ الكاملة.
    const derived = new Set(
      [...src.matchAll(/const\s+(\w+)\s*=\s*(?:useMemo\(\s*\(\)\s*=>\s*)?[\w.]*\s*\n?\s*\.?\s*filter\(/g)].map(m => m[1])
    );
    for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useMemo\(\s*\(\)\s*=>\s*([\s\S]{0,200}?)\n\s*\[/g)) {
      if (/\.filter\(/.test(m[2])) derived.add(m[1]);
    }
    if (!derived.size) continue;

    for (const name of derived) {
      const guard = new RegExp(`\\b${name}\\.length\\s*===\\s*0`, 'g');
      for (const g of src.matchAll(guard)) {
        const block = src.slice(g.index, g.index + 1200);
        if (!FIRST_RUN.test(block)) continue;
        // مسموحٌ إن كان الفرعُ نفسُه يسأل عن المجموعة الكاملة، لا عن المُصفّاة.
        const asksTotal = [...block.matchAll(/\b(\w+)\.length\s*===\s*0/g)]
          .some(x => x[1] !== name && !derived.has(x[1]));
        assert.ok(asksTotal,
          `${file}: جملةُ بدايةٍ تحت فراغِ «${name}» المُصفّى — ` +
          `ستُنكر بياناتٍ موجودةً ما إن يُصفّي المستخدم. افصل الحالتين.`);
      }
    }
  }
});

test('«هل الذكاءُ متاح؟» يُسأل من مصدرٍ واحد', () => {
  // العطبُ الذي وُلد منه هذا: الخادم يقبل ستّةَ مزوّدين
  // (`routes/ai.js:AI_PROVIDERS`)، وثلاثُ شاشاتٍ كانت تسأل `apiKey ||
  // geminiKey` وحدَهما. تاجرٌ موصولٌ بـClaude وDeepSeek — وكلاهما معروضٌ في
  // «ربط الخدمات» — يُقال له «بدون مفتاح AI» بينما وصفُ المنتجات يعمل عنده.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;

  // مصدرُ الحقيقة يجب أن يُعدّد ما يُعدّده الخادم — لا أقلّ.
  const server = readFileSync(join(ROOT_DIR, 'server/routes/ai.js'), 'utf8');
  const client = readFileSync(join(ROOT_DIR, 'src/lib/aiAvailability.ts'), 'utf8');
  const listOf = (src) => {
    const m = src.match(/AI_PROVIDERS\s*=\s*\[([^\]]+)\]/);
    assert.ok(m, 'تعذّر قراءة AI_PROVIDERS');
    return [...m[1].matchAll(/'([a-z]+)'/g)].map(x => x[1]).sort();
  };
  assert.deepEqual(listOf(client), listOf(server),
    'قائمةُ مزوّدي الذكاء في الواجهة تخالف الخادم — أحدُهما يعِد بما لا يفعله الآخر');

  // ولا يُعاد السؤالُ يدويًّا في أيّ ملفٍّ آخر.
  const SOURCE = 'src/lib/aiAvailability.ts';
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT_DIR, 'src'));

  // تعريفُ الحقول وحفظُها مسموحان؛ **اشتقاقُ حكمٍ** منها ليس كذلك.
  const VERDICT = /(?:const|let)\s+\w*(?:has|is|any)\w*\s*=[^;\n]*\bgeminiKey\b[^;\n]*\|\|/i;
  for (const f of files) {
    const rel = f.slice(f.indexOf('src/'));
    if (rel === SOURCE) continue;
    if (/ConnectionsPage|SettingsPage/.test(rel)) continue;  // شاشتا الإدخال: تكتبان المفاتيح
    const src = readFileSync(f, 'utf8');
    assert.ok(!VERDICT.test(src),
      `${rel}: يحكم على توفّر الذكاء بنفسه — استورد hasAI/aiProviders من ${SOURCE}`);
  }
});

test('لا مفتاحَ تخزينٍ يُقرأ ولا يُكتَب — عدّادٌ لا يتحرّك أبدًا', () => {
  // العطبُ الذي وُلد منه هذا: `/profile` يعرض «مفضّلتي» بعددٍ مقروءٍ من
  // `amanzine_favorites`. لا سطرَ في التطبيق كلِّه يكتب ذلك المفتاح ⇒ صفرٌ
  // أبديٌّ معروضٌ كإحصائيّة، وشريطُ التنقّل يعِد بـ«مفضّلتي».
  // مفتاحٌ يُقرأ ولا يُكتب إمّا ميزةٌ ماتت وبقيت واجهتُها، أو خطأٌ مطبعيّ.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT_DIR, 'src'));

  const read = new Map();   // key → أوّلُ ملفٍّ يقرؤه
  const written = new Set();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const rel = f.slice(f.indexOf('src/'));
    for (const m of src.matchAll(/(?:localStorage|sessionStorage)\.getItem\(\s*'([^']+)'/g)) {
      if (!read.has(m[1])) read.set(m[1], rel);
    }
    // `removeItem` ليست كتابةً: `editor_action` كان يُقرأ ويُمسَح ولا يُكتب
    // أبدًا، فمرّ من ثقبٍ في هذا الحارس. المسحُ لا يملأ عدّادًا.
    for (const m of src.matchAll(/(?:localStorage|sessionStorage)\.setItem\(\s*'([^']+)'/g)) {
      written.add(m[1]);
    }
    // مفاتيحُ تُكتب عبر ثابتٍ (KEY) — نقبلها حين يُصرَّح بالثابت في الملفّ نفسِه.
    for (const m of src.matchAll(/const\s+\w*KEY\w*\s*=\s*'([^']+)'/g)) written.add(m[1]);
  }

  // استثناءاتٌ موثَّقة. **تنكمش ولا تنمو** — والسقّاطةُ تحتَها تمنع التضخّم.
  const EXEMPT_KEYS = {
    'ai_commerce_theme':   'يكتبه سكربتُ الإقلاع في index.html قبل React',
    'ai_commerce_refresh': 'قراءةُ ترحيلٍ لمرّةٍ واحدة: تُنقَل ثمّ تُمحى — لا يُكتب عمدًا',
    'amanzine_following':  'تبويبُ «أتابع» في ActivityFeed — الصفحةُ نفسُها بلا باب '
                         + '(BROKEN_CHAINS#⑥). المتابعةُ ميزةٌ لم تُبنَ، لا خطأٌ مطبعيّ.',
  };
  const EXEMPT_MAX = 3;   // سقّاطة: لا تزد
  assert.ok(Object.keys(EXEMPT_KEYS).length <= EXEMPT_MAX,
    `قائمةُ الاستثناءات نمت (${Object.keys(EXEMPT_KEYS).length}/${EXEMPT_MAX}) — ` +
    'الاستثناءُ دَينٌ يُسدَّد لا رصيدٌ يُنفَق');

  const orphans = [...read].filter(([k]) => !written.has(k) && !(k in EXEMPT_KEYS));
  assert.deepEqual(orphans.map(([k, f]) => `${f} → ${k}`), [],
    'مفتاحُ تخزينٍ يُقرأ ولا يُكتَب: إمّا أن تُوصَل الكتابةُ أو تُزال القراءةُ وواجهتُها');
});

test('كلُّ مسارٍ عامٍّ مُسجَّلٍ له بابٌ في الواجهة', () => {
  // العطبُ الذي وُلد منه هذا: `/feed` مُسجَّلٌ في `App.tsx` ويعمل — **وبلا
  // رابطٍ واحدٍ في التطبيق كلِّه**. و`/explore` (بحثٌ موحّد + خريطةُ Leaflet +
  // إدخالٌ صوتيّ) لم يكن يُبلَغ إلّا من زرٍّ ثانويٍّ داخل المساعد.
  // مسارٌ بلا بابٍ كودٌ ميّتٌ يبدو حيًّا.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const app = readFileSync(join(ROOT_DIR, 'src/App.tsx'), 'utf8');

  // مساراتٌ تُبلَغ بغير رابطٍ في القائمة: صفحاتُ المصادقة والهبوط، وصفحاتُ
  // المتجر العامّة التي يفتحها الزبونُ برابطٍ يرسله التاجر.
  const NO_MENU = new Set(['/', '*', '/auth', '/login', '/register', '/landing', '/store']);

  const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map(m => m[1])
    .filter(p => !p.includes(':') && !p.includes('*'))
    .filter(p => !NO_MENU.has(p));
  assert.ok(routes.length >= 3, `مساراتٌ قليلةٌ قُرئت (${routes.length})`);

  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT_DIR, 'src'));
  const all = files.filter(f => !f.endsWith('App.tsx')).map(f => readFileSync(f, 'utf8')).join('\n');

  // البابُ إمّا سمةُ `href` مباشرةً، أو حقلُ `href:` في بيانات القائمة،
  // أو `navigate('/x')`. الثلاثةُ تُوصِل إنسانًا إلى المسار.
  const doorless = routes.filter(r => {
    const esc = r.replace(/[/]/g, '\\/');
    const rx = new RegExp(`(?:href=|href:\\s*|navigate\\(\\s*)["'\`]${esc}(["'\`?#]|$)`, 'm');
    return !rx.test(all);
  });
  assert.deepEqual(doorless, [],
    `مسارٌ يعمل ولا يصله أحد: ${doorless.join(' · ')} — ضَع له رابطًا أو احذفه`);
});

test('لا مكوّنَ مبنيٌّ بصفر استيراد — يُركَّب أو يُحذَف', () => {
  // العطبُ الذي وُلد منه هذا: ستّةُ مكوّناتٍ مكتوبةٍ لا يستوردها أحد
  // (BROKEN_CHAINS#⑩⑪) — منها `CapabilityBar` الذي يعرض قدراتِ الصفحة،
  // و`CommandCenter` الذي هو تنفيذُ قرارٍ معتمَد (DR-0005). كودٌ ميّتٌ يبدو
  // حيًّا: يُقرأ في المراجعات، ويُصان، ولا يخدم إنسانًا.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const COMPONENTS = join(ROOT_DIR, 'src/components');

  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT_DIR, 'src'));
  const all = files.map(f => readFileSync(f, 'utf8')).join('\n');

  const orphans = [];
  for (const e of readdirSync(COMPONENTS)) {
    if (!e.endsWith('.tsx')) continue;
    const name = e.replace(/\.tsx$/, '');
    // الاستيرادُ المباشرُ أو الكسولُ — كلاهما تركيب. `MapView` يُستورَد
    // بـ`lazy(() => import(...))` وحدَه، فحصرُ البحث في `from '…'` يقتله ظلمًا.
    const rx = new RegExp(`(?:from|import\\()\\s*['"\`][^'"\`]*/${name}['"\`]`);
    if (!rx.test(all)) orphans.push(name);
  }
  assert.deepEqual(orphans, [],
    `مكوّنٌ بلا مستورِد: ${orphans.join(' · ')} — رَكِّبه حيث يخدم، أو احذفه`);
});

test('قياسٌ يُكتب يجب أن يُقرأ — لا دالّةَ إحصاءٍ بلا شاشة', () => {
  // نمطٌ تكرّر ثلاث مرّات في هذا التدقيق: القياسُ مبنيٌّ ومُصدَّرٌ ولا يقرؤه
  // أحد. سجلُّ التدقيق (⑮) · `clarifyStats` · `getReceptions`. قياسٌ لا
  // يُعرَض لا يُصحّح قرارًا — وهو نصفُ فائدة القياس المفقود.
  const ROOT_DIR = new URL('..', import.meta.url).pathname;
  const MEASURED = ['src/lib/journey.ts'];   // وحداتُ القياس المحروسة

  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT_DIR, 'src'));

  for (const rel of MEASURED) {
    const src = readFileSync(join(ROOT_DIR, rel), 'utf8');
    const exported = [...src.matchAll(/^export function (\w+)/gm)].map(m => m[1]);
    assert.ok(exported.length > 5, `${rel}: تعذّر قراءةُ الصادرات`);

    // **لا الاستيرادُ قراءةٌ ولا التعليق.** ملفٌّ يستورد الدالّةَ ولا يستدعيها،
    // أو يذكر اسمَها في تعليقٍ يشرحها، كان يمرّ من ثقبٍ في هذا الحارس. تُحجَب
    // أسطرُ الاستيراد والتعليقاتُ قبل البحث — نفسُ ما يفعله حارسُ التوصيل.
    const strip = (t) => t
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .replace(/^\s*import[\s\S]*?from\s*['"][^'"]+['"];?$/gm, '');
    const others = files
      .filter(f => !f.endsWith(rel.split('/').pop()))
      .map(f => strip(readFileSync(f, 'utf8')))
      .join('\n');

    const unread = exported.filter(fn => !new RegExp(`\\b${fn}\\b`).test(others));
    assert.deepEqual(unread, [],
      `${rel}: دالّةٌ تُصدَّر ولا يقرؤها أحد: ${unread.join(' · ')} — اعرضها أو احذفها`);
  }
});

// ============================================================
// ⑱ لا حالةَ ميّتة: عضوٌ في اتّحادِ حالاتٍ لا يبلغه انتقال.
//
//   وُجد في `Onboarding.tsx`: سبعُ حالاتٍ مُعلَنةٌ في `type Step`، وثلاثٌ في
//   `ORDER` الذي يمشي فيه `next()`. فخمسُ شاشاتٍ مرسومةٌ بلا بابٍ يبلغها —
//   نحو ١٩٠ سطرًا تُقرأ وتُصان ولا يراها أحد. ومنها وُلد ما رآه المالك:
//   «الخطوة ١ من ١»، وهي `ORDER.length - 2` حرفيًّا.
//
//   هذا صنفٌ لا حالة: أيُّ آلةِ حالاتٍ تُعلن أكثرَ ممّا تصل إليه.
// ============================================================
test('لا حالةَ مُعلَنةٌ لا يبلغها انتقال', () => {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT, 'src'));

  const dead = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    // اتّحادُ نصوصٍ يُسمّى Step/Phase/Stage/Screen، ومصفوفةُ ترتيبٍ بجانبه.
    const uni = src.match(/type\s+(Step|Phase|Stage|Screen)\s*=\s*([^;]+);/);
    if (!uni) continue;
    const members = [...uni[2].matchAll(/'([^']+)'/g)].map(m => m[1]);
    if (members.length < 2) continue;

    const order = src.match(/const\s+ORDER\s*:\s*\w+\[\]\s*=\s*\[([^\]]+)\]/);
    if (!order) continue;                       // بلا مصفوفةِ ترتيبٍ لا حكم
    const reachable = new Set([...order[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
    // حالةٌ يُنتقَل إليها صراحةً بـ setStep('x') تُعدّ قابلةَ الوصول أيضًا.
    for (const m of src.matchAll(/set\w*(?:Step|Phase|Stage|Screen)\(\s*'([^']+)'/g)) reachable.add(m[1]);

    const orphans = members.filter(m => !reachable.has(m));
    if (orphans.length) dead.push(`${f.replace(ROOT, '')}: ${orphans.join(' · ')}`);
  }
  assert.deepEqual(dead, [],
    `حالاتٌ مُعلَنةٌ لا يبلغها شيء — شاشاتٌ تُرسَم ولا تُرى:\n  ${dead.join('\n  ')}`);
});

// ============================================================
// ⑲ لا إعدادَ يتيم: يُكتَب عبر `updateSettings` ولا يقرؤه أحد.
//
//   وُجد `businessCategory`: مرجعٌ واحدٌ في المشروع كلِّه هو سطرُ الكتابة
//   نفسُه، وقيمتُه دائمًا فارغةٌ لأنّ الشاشةَ التي تملؤها كانت ميّتة.
//   إعدادٌ كهذا يبدو ميزةً مبنيّةً وهو لا شيء.
// ============================================================
test('لا إعدادَ يُكتَب ولا يُقرَأ', () => {
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT, 'src'));

  const all = files.map(f => ({ f, src: readFileSync(f, 'utf8') }));
  const written = new Set();
  for (const { src } of all)
    for (const m of src.matchAll(/updateSettings\(\s*'(\w+)'/g)) written.add(m[1]);

  // مفاتيحُ يقرؤها الخادمُ أو المخطّطُ لا الواجهة — قراءتُها خارج src.
  const READ_ELSEWHERE = new Set(['onboardingDone', 'brand', 'ai', 'products', 'capabilities', 'role']);

  const orphans = [];
  for (const key of written) {
    if (READ_ELSEWHERE.has(key)) continue;
    // قراءةٌ = ورودُ المفتاح في **كودٍ** غيرِ سطر الكتابة. التعليقُ ليس قراءة:
    // شرحُ العطبِ في رأس الملفّ كان يُمرِّر الحارسَ على العطب نفسِه — وهي
    // ثالثُ مرّةٍ يقع فيها هذا الثقبُ عينُه في حرّاس هذا المشروع.
    const reads = all.some(({ src }) => src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .replace(/updateSettings\(\s*'\w+'[^\n]*/g, '')
      .includes(key));
    if (!reads) orphans.push(key);
  }
  assert.deepEqual(orphans, [],
    `إعداداتٌ تُكتَب ولا يقرؤها شيء: ${orphans.join(' · ')} — اقرأها أو احذفها`);
});

// ============================================================
// ⑳ لا قائمةَ فئاتٍ ثانية.
//
//   كان في المشروع **سبعُ** قوائمَ لفئاتٍ واحدة. آخرُها في شاشةِ ترحيبٍ
//   ميّتةٍ تقول «إكسسوارات» بينما يقول الكتالوج «أكسسوارات» — إملاءان
//   لشيءٍ واحد. لا تُكتشَف بالقراءة، وتُكتشَف هنا.
// ============================================================
test('لا مصفوفةَ نصوصٍ تُحاكي فئاتِ الكتالوج', () => {
  // نقرأ التسمياتِ من نصّ الكتالوج لا باستيرادِه: هذا الحارسُ يعمل بـ node
  // وحدَه بلا مترجم، وإدخالُ خطوةِ بناءٍ هنا يجعله يفشل لسببٍ ليس عطبًا.
  const catalogSrc = readFileSync(join(ROOT, 'src/lib/catalog.ts'), 'utf8');
  const labels = new Set([...catalogSrc.matchAll(/label:\s*'([^']+)'/g)].map(m => m[1]));
  assert.ok(labels.size >= 10, 'تعذّر قراءةُ تسميات الكتالوج');
  // تسمياتٌ عامّةٌ قد ترد بريئةً (فلاتر/ترجمات) — نقيس التطابقَ الكثيف وحدَه.
  const files = [];
  (function walk(dir) {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (/\.tsx?$/.test(e)) files.push(full);
    }
  })(join(ROOT, 'src'));

  const SOURCE = ['catalog.ts', 'categoryFields.ts', 'translations.ts', 'knowledgeData.ts',
    'knowledgeExtra.ts', 'knowledgeExtra.generated.ts', 'blueprints.ts'];
  const offenders = [];
  for (const f of files) {
    if (SOURCE.some(s => f.endsWith(s))) continue;
    const src = readFileSync(f, 'utf8');
    for (const arr of src.matchAll(/\[((?:\s*'[^']{2,30}'\s*,){2,}[^\]]*)\]/g)) {
      const items = [...arr[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
      const hits = items.filter(i => labels.has(i));
      if (hits.length >= 3) offenders.push(`${f.replace(ROOT, '')}: ${hits.join(' · ')}`);
    }
  }
  assert.deepEqual(offenders, [],
    `قائمةُ فئاتٍ ثانيةٌ — تتخلّف عن الكتالوج عند أوّل تعديل:\n  ${offenders.join('\n  ')}`);
});

// ============================================================
// ㉒ **حَكَمٌ واحدٌ يقول: نفّذ أم اسأل.**
//
//   كان الحكمُ في مكانَين يقرآن نفسَ الرقم بعتبتَين مختلفتَين:
//   `executionPolicy` بعتبةٍ تتبع خطورةَ القدرة، و`interfaceDecision`
//   بعتبةٍ عامّةٍ لا تعرف الخطورة. فعلى الجملة الواحدة قال الأوّل «نفّذ»
//   وقال الثاني «أكّد» — ولا أحدَ يرى الخلافَ لأنّ كلًّا منهما يُختبَر وحدَه.
//
//   وأسوأُ من الخلاف أنّ أحدَهما كان يُهمَل: من أحكام `decideExecution`
//   الخمسة استهلكت الواجهةُ **حكمَين** ورَمَت ثلاثة، وبَنَت ما تعرضه من
//   حسابها الخاصّ. حسابٌ صحيحٌ بلا مستهلك — القاعدة ④.
// ============================================================
test('㉒ لا حَكَمَ ثانيًا: طبقةُ الواجهة لا تقيس الثقةَ بنفسها', () => {
  const src = readFileSync(join(ROOT, 'src/lib/interfaceDecision.ts'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/CONFIDENCE\s*\./.test(code),
    'عادت عتبةُ الثقة إلى طبقة الواجهة — عتبةٌ في مكانَين تتباعد بصمت');
  assert.ok(!/\bconfidence\b/.test(code),
    'طبقةُ الواجهة تقرأ `confidence` — الحكمُ من `executionPolicy` وحدَه');
  assert.match(code, /verdict: Verdict/,
    'الحكمُ ليس مُدخلًا مُلزِمًا — سيعمل مسارٌ احتياطيٌّ بصمتٍ في كلّ نداءٍ نسيه');
});

test('㉒ كلُّ حكمٍ يُخرجه الحَكَمُ له شكلٌ في الواجهة — لا حكمَ يُرمى', () => {
  const policy = readFileSync(join(ROOT, 'src/lib/executionPolicy.ts'), 'utf8');
  const iface = readFileSync(join(ROOT, 'src/lib/interfaceDecision.ts'), 'utf8');
  // اتّحادُ الأحكام يُقرأ من تعريف النوع نفسِه، فيتّسع تلقائيًّا مع كلّ حكمٍ يُضاف.
  const union = (policy.match(/export type Verdict =([\s\S]*?);/) || [])[1] || '';
  const verdicts = [...union.matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.ok(verdicts.length >= 4, `قُرئت ${verdicts.length} أحكامٍ فقط — تغيّرت الصيغةُ والحارسُ صار أعمى`);
  const unhandled = verdicts.filter(v => !new RegExp(`verdict === '${v}'`).test(iface));
  assert.deepEqual(unhandled, [],
    `أحكامٌ تُحسَب ولا شكلَ لها: ${unhandled.join(' · ')} — أعطِها شكلًا أو احذفها من الاتّحاد`);
});

test('㉒ لا يُستدعى الحَكَمان في مشهدٍ واحد أكثرَ من مرّة', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const calls = (n) => (code.match(new RegExp(`\\b${n}\\(`, 'g')) || []).length;
  assert.equal(calls('decideInterface'), 1,
    `\`decideInterface\` تُستدعى ${calls('decideInterface')} مرّات — الحسابُ الثاني لا يعرف الحكمَ فيخالفه`);
  assert.equal(calls('decideExecution'), 1, 'حَكَمان في مشهدٍ واحد');
  // `understand(q)` كانت تُستدعى مرّتين هنا بعد أن حلّلها `orchestrate`.
  // والخطرُ ليس الكلفةَ بل تباعُدَ الفهم بين نداءٍ وآخرَ في نفس الدالّة.
  const submit = (code.match(/const submit = \(raw: string\) => \{[\s\S]*?\n  \};/) || [''])[0];
  const parses = (submit.match(/\bunderstand\(/g) || []).length;
  assert.ok(parses <= 1, `\`submit\` يحلّل الجملةَ ${parses} مرّات — تحليلٌ واحدٌ يكفي`);
});
