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
  // **والخريطةُ انتقلت إلى `types.ts`** لأنّها كانت مكتوبةً مرّتَين — هنا
  //   وفي `store.tsx` — فافترقتا وسقطت ثمانُ صفحاتٍ إلى الرئيسيّة. وهذا
  //   الحارسُ كان يقرؤها من `App.tsx`، فتُقرأ الآن من مصدرها الواحد.
  const types = readFileSync(join(ROOT_DIR, 'src/types.ts'), 'utf8');
  const app   = types;

  const idsBlock = types.match(/export const PAGE_IDS = \[([\s\S]*?)\] as const/);
  assert.ok(idsBlock, 'تعذّر قراءة PAGE_IDS');
  const ids = [...idsBlock[1].matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  assert.ok(ids.length >= 20, `صفحاتٌ قليلةٌ قُرئت (${ids.length})`);

  const urlsBlock = app.match(/PAGE_URLS[^=]*=\s*\{([\s\S]*?)\n\};/);
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

test('⑤ لا ملفَّ واجهةٍ لا يبلغه التطبيق — يُركَّب أو يُحذَف', () => {
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

  // ── مسحُ الوصول من نقطة الدخول ────────────────────────────
  //
  //   كان هذا الحارسُ يمسح `src/components/` **وحدَه**. فمرّت ٤٥٠ سطرًا ميّتةً
  //   في `src/pages/`: ستّةُ أقسامٍ في صفحة الهبوط لا يستوردها شيء، وأداةٌ
  //   في `src/utils/`. القاعدةُ ⑤ لم تكن خاطئة — الحارسُ كان أعمى عن نصف البيت.
  //
  //   والمسحُ الآن **بالوصول** لا بالاسم: نمشي من `main.tsx` على الاستيرادات
  //   كلِّها (ساكنٍ وكسولٍ وجانبيّ)، وما لا نبلغه يتيم. وهذا وحدَه يحلّ
  //   استيرادَ المجلّد (`from './Landing'` ⇒ `Landing/index.tsx`) الذي أسقط
  //   صفحةَ الهبوط الحيّةَ كلَّها في تقريرٍ سابقٍ للمفصول.
  const EXT = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
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
    /^\s*import\s+['"`]([^'"`]+)['"`]/gm,
  ];
  const reached = new Set();
  const queue = [join(ROOT_DIR, 'src/main.tsx')];
  while (queue.length) {
    const f = queue.pop();
    if (reached.has(f)) continue;
    reached.add(f);
    const src = readFileSync(f, 'utf8');
    for (const rx of IMPORT_RX) {
      for (const m of src.matchAll(rx)) {
        const r = resolveSpec(f, m[1]);
        if (r && !reached.has(r)) queue.push(r);
      }
    }
  }

  const orphans = files.filter(f => !reached.has(f)).map(f => f.replace(ROOT_DIR, ''));
  assert.deepEqual(orphans.sort(), [],
    `ملفّاتٌ لا يبلغها التطبيقُ من \`main.tsx\`:\n  ${orphans.join('\n  ')}\n`
    + '  رَكِّبها حيث تخدم، أو احذفها. الميّتُ الصامتُ يُقرأ كأنّه حيّ.');
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
  const code = src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')   // تعليقُ JSX يمتدّ أسطرًا بلا بادئة
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
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

// **بعد RC-P1**: لم يعد المشهدُ يركّب الطبقاتِ بنفسه، فالعدُّ انتقل إلى
//   المالك الواحد (`src/lib/decide.ts`). والخاصّيّةُ المحروسةُ هي هي: حسابٌ
//   ثانٍ لا يعرف الحكمَ الأوّلَ فيخالفه. وزِيد عليها ما صار ممكنًا بعد
//   التوحيد: **الشاشةُ تسأل المالكَ مرّةً واحدةً** في المشهد الواحد.
test('㉒ لا يُستدعى الحَكَمان في مشهدٍ واحد أكثرَ من مرّة', () => {
  const bare = (p) => readFileSync(join(ROOT, p), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const owner = bare('src/lib/decide.ts');
  const calls = (code, n) => (code.match(new RegExp(`\\b${n}\\(`, 'g')) || []).length;
  assert.equal(calls(owner, 'decideInterface'), 1,
    `\`decideInterface\` تُستدعى ${calls(owner, 'decideInterface')} مرّات في المالك — الحسابُ الثاني لا يعرف الحكمَ فيخالفه`);
  assert.equal(calls(owner, 'decideExecution'), 1, 'حَكَمان في المالك الواحد');
  assert.equal(calls(owner, 'abilityFor'), 1, 'مطابِقان للقدرة في المالك الواحد');

  const code = bare('src/pages/LivingHome.tsx');
  // `understand(q)` كانت تُستدعى مرّتين هنا بعد أن حلّلها `orchestrate`.
  // والخطرُ ليس الكلفةَ بل تباعُدَ الفهم بين نداءٍ وآخرَ في نفس الدالّة.
  const submit = (code.match(/const submit = \(raw: string\) => \{[\s\S]*?\n  \};/) || [''])[0];
  assert.ok(submit.length > 200, 'لم يُعثَر على `submit` — الحارسُ يقيس فراغًا');
  const parses = (submit.match(/\bunderstand\(/g) || []).length;
  assert.ok(parses <= 1, `\`submit\` يحلّل الجملةَ ${parses} مرّات — تحليلٌ واحدٌ يكفي`);
  // والمشهدُ يسأل المالكَ عبر `applyVerdict`، فيُقاس أمران: **موضعُ سؤالٍ
  //   واحدٌ** في الملفّ كلِّه، و**نداءٌ واحدٌ** له في المشهد. أحدُهما بلا
  //   الآخرِ يمرّ: موضعٌ واحدٌ يُنادى مرّتين، أو نداءٌ واحدٌ لموضعَين.
  const sites = (code.match(/\bdecideFor\(/g) || []).length;
  assert.equal(sites, 1, `\`LivingHome\` فيه ${sites} مواضعِ سؤالٍ للمالك — موضعٌ واحد`);
  const asks = (submit.match(/\bapplyVerdict\(/g) || []).length;
  assert.equal(asks, 1, `\`submit\` يستدعي \`applyVerdict\` ${asks} مرّات — نداءٌ واحدٌ لكلّ فعلِ مستخدم`);
});

// ============================================================
// ㉓ **قائمةُ مفاتيح الذاكرة واحدة** — ولو كُتبت بلغتَين.
//
//   المفاتيحُ مُعلَنةٌ مرّتين: `SYNCED_KEYS` في العميل (ما يُرفَع) و
//   `MEMORY_KEYS` في الخادم (ما يُقبَل، وباستراتيجيّة دمجٍ لكلّ مفتاح).
//   ولا يمكن دمجُهما في ملفٍّ واحد: العميلُ يحتاج القائمةَ **قبل** أوّل
//   ردٍّ من الخادم ليرفع ما عنده، والخادمُ يحتاجها ليرفض ما لا يعرف.
//
//   وضررُ التباعد صامتٌ وكامل: `validateBatch` يردّ **الدفعةَ كلَّها** بـ400
//   على مفتاحٍ واحدٍ غيرِ معروف، والعميلُ يبتلع الفشلَ ويُكمل من ذاكرته
//   المحلّيّة. فمَن أضاف مفتاحًا في جهةٍ واحدةٍ أوقف مزامنةَ **كلّ** ما
//   يتعلّمه التطبيقُ عن كلّ إنسان — بلا رسالةٍ ولا سجلّ.
// ============================================================
test('㉓ مفاتيحُ الذاكرة متطابقةٌ بين العميل والخادم', () => {
  const client = readFileSync(join(ROOT, 'src/lib/userMemory.ts'), 'utf8');
  const server = readFileSync(join(ROOT, 'server/lib/userMemory.js'), 'utf8');

  const clientList = (client.match(/const SYNCED_KEYS = \[([\s\S]*?)\]/) || [])[1] || '';
  const clientKeys = [...clientList.matchAll(/'([\w]+)'/g)].map(m => m[1]).sort();

  const serverList = (server.match(/const MEMORY_KEYS = \{([\s\S]*?)\n\};/) || [])[1] || '';
  const serverKeys = [...serverList.matchAll(/^\s{2}(\w+):\s*\{/gm)].map(m => m[1]).sort();

  assert.ok(clientKeys.length >= 8, `قُرئت ${clientKeys.length} مفاتيحَ من العميل — تغيّرت الصيغةُ والحارسُ صار أعمى`);
  assert.ok(serverKeys.length >= 8, `قُرئت ${serverKeys.length} مفاتيحَ من الخادم — تغيّرت الصيغةُ والحارسُ صار أعمى`);

  const onlyClient = clientKeys.filter(k => !serverKeys.includes(k));
  const onlyServer = serverKeys.filter(k => !clientKeys.includes(k));
  assert.deepEqual(onlyClient, [],
    `مفاتيحُ يرفعها العميلُ ويرفضها الخادمُ — تتوقّف المزامنةُ كلُّها بلا رسالة: ${onlyClient.join(' · ')}`);
  assert.deepEqual(onlyServer, [],
    `مفاتيحُ يقبلها الخادمُ ولا يرفعها أحد — ذاكرةٌ لا تُملأ أبدًا: ${onlyServer.join(' · ')}`);
});

// ㉔ حدُّ القدرة موصولٌ بالحَكَم — لا يكفي أن يكون مبنيًّا.
//
//   سبرٌ كشف الثغرة: فُصل الوسيطُ `impossible` عن نداء `decideExecution`
//   فبقيت الاختباراتُ كلُّها خضراء — لأنّها تحسبه بنفسها. أي أنّ «ما نقدرش»
//   كانت ستموت في التطبيق وتبقى حيّةً في الاختبار، وهو أسوأُ صنفٍ من العطب:
//   حارسٌ يشهد لِما لا يعمل.
test('㉔ «ما نقدرش» موصولةٌ بالتجربة لا بالاختبار وحدَه', () => {
  // بعد RC-P1 يُسأل حدُّ المجال في المالك الواحد لا في كلّ شاشة — وكان
  //   سؤالُه في شاشةٍ واحدةٍ هو بعينه ما جعل «ما نقدرش» تعمل في `LivingHome`
  //   وتصمت في `NeedFirst` و`Assistant`.
  const code = readFileSync(join(ROOT, 'src/lib/decide.ts'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  assert.match(code, /entityAccepts\(/,
    '`entityAccepts` غيرُ مستعملةٍ في المالك — حدُّ القدرة مبنيٌّ ولا يُسأل');
  // والحدُّ **وسيطٌ داخل النداء** لا آخرُه: كانت الصيغةُ تشترط أن يكون
  // `impossible` آخرَ ما يُمرَّر، فسقط الحارسُ يومَ أُضيف وسيطُ السياق
  // (`lastProduct`) — وهو إضافةٌ لا تمسّ ما يحرسه. حارسٌ يشترط **موضعًا**
  // يشهد على الترتيب لا على الوصل.
  assert.match(code, /decideExecution\([^)]*\bimpossible\b/,
    'الحدُّ يُحسَب ولا يُمرَّر إلى الحَكَم — يُقاس ولا يُستهلَك (القاعدة ④)');
  // والشكلُ يبقى حيث يُعرَض: الرفضُ حكمٌ يراه الإنسانُ في الشاشة لا في المالك.
  assert.match(home, /mode === 'refuse'/,
    'حكمُ الرفض بلا شكلٍ في العرض — يُحسَب ولا يراه أحد');
});

// ㉕ التحقّقُ له بابٌ يراه الإنسان — لا قاعدةٌ بلا مستهلك.
//
//   بُنيت `server/lib/verify` كاملةً ومُختبَرةً (١٣ اختبارًا) ولم يكن لها
//   بابٌ في التطبيق. وهو الصنفُ نفسُه الذي طاردناه في هذا التدقيق كلِّه:
//   `retryQueue` مبنيٌّ بلا مستدعٍ · طبقةُ تنفيذٍ بلا وصل · قياسٌ يُكتَب ولا
//   يُقرأ. القاعدةُ الصحيحةُ بلا بابٍ **صفرُ نفعٍ** للتاجر.
test('㉕ بابُ التحقّق موصولٌ — والنمرةُ لا تُبدَّل بلا تأكيد', () => {
  const comp = join(ROOT, 'src/components/VerifyCode.tsx');
  assert.ok(existsSync(comp), 'لا مكوّنَ للتحقّق — القاعدةُ بلا باب');

  const src = readFileSync(comp, 'utf8');
  assert.match(src, /verifyAPI\.start/, 'المكوّنُ لا ينادي بدءَ التحقّق');
  assert.match(src, /verifyAPI\.check/, 'المكوّنُ لا ينادي فحصَ الرمز');
  // لا اسمَ قناةٍ مكتوبٌ زرًّا: القنواتُ تُقرأ من الخادم، وزرُّ قناةٍ غيرِ
  // مُهيّأةٍ وعدٌ لا يُوفى — من ضغطه ينتظر رمزًا لن يصل.
  assert.match(src, /verifyAPI\.channels/,
    'القنواتُ لا تُقرأ من الخادم — ستُعرَض قناةٌ لا تُرسل');

  const settings = readFileSync(join(ROOT, 'src/pages/SettingsPage.tsx'), 'utf8');
  const code = settings.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n');
  // حدُّ الاسم لا بدايتُه: `/<VerifyCode/` تُطابق `<VerifyCodeX` أيضًا،
  // فمرّ سبرٌ أعاد تسميةَ المكوّن. مطابقةُ البدايةِ حارسٌ يُخدَع بحرفٍ واحد.
  assert.match(code, /<VerifyCode[\s/>]/, 'المكوّنُ مبنيٌّ ولا يُركَّب في أيّ صفحة');
  assert.match(code, /purpose="phone_change"/, 'التحقّقُ مركَّبٌ بلا غرضٍ معلوم');
  // **الحارسُ الأهمّ**: النمرةُ تُحفَظ داخل `onVerified` لا في `onChange`.
  // لو حُفظت وقتَ الكتابة صار التحقّقُ زينةً تُعرَض بعد فوات الأمر.
  assert.match(code, /onVerified=\{\(\)\s*=>\s*\{[\s\S]{0,200}?updateSettings\('brand',\s*\{[^}]*phone:/,
    'النمرةُ تُحفَظ خارجَ التحقّق — التحقّقُ زينةٌ لا بوّابة');
});

// ㉖ «كيفاش فهمتِ؟» تعرض أثرَ العقل — لا سردًا مكتوبًا في الواجهة.
//
//   الفرقُ بين إثباتٍ وإعلان: خطواتٌ ثابتةٌ مؤلَّفةٌ تُقنع مرّةً ثمّ تكذب حين
//   يتبدّل العقل. وقراءةُ `reasoning` تجعل المعروضَ يتبدّل بتبدّله.
test('㉖ أثرُ الفهم يُقرأ من العقل لا يُكتَب في الصفحة', () => {
  const src = readFileSync(join(ROOT, 'src/pages/Landing/sections/NeedFirst.tsx'), 'utf8');
  // **يُقاس الكودُ لا التعليق.** سبرٌ استبدل الأثرَ بسردٍ مكتوبٍ بيدٍ ومرّ،
  // لأنّ كلمة `reasoning` بقيت في التعليق الشارح — حارسٌ يشهد لتوثيقٍ لا لعمل.
  const code = src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')    // تعليقُ JSX يمتدّ أسطرًا بلا بادئة
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

  assert.match(code, /\.reasoning\b/,
    'الواجهةُ لا تقرأ `reasoning` — ستعرض سردًا مؤلَّفًا يكذب حين يتبدّل العقل');
  assert.match(code, /كيفاش فهمت/, 'لا زرَّ يفتح الأثر');
  assert.match(code, /setShowWhy\(false\)/,
    'الأثرُ لا يُطوى مع الجملة الجديدة — يُعرَض أثرُ جملةٍ سابقةٍ تحت جملةٍ حاليّة');

  // ── **ولا تحليلَ يتكرّر — والسقّافةُ نزلت من ٤ إلى ١ (RC-P6)** ──
  //   كانت أربعةً: `readFacts` والأثرُ ومُعالِجا النقر. وقِيس بعدّادٍ في العقل
  //   نفسِه أنّ ذلك يعني **٤ تحاليلَ لكلّ ضغطةِ مفتاح** و٧ لكلّ نقرة، كلُّها
  //   على نفس النصّ في نفس اللحظة. صارت `readNeed` تقرأ مرّةً ويُمرَّر ما
  //   قرأته إلى المالك الواحد وإلى العرض معًا.
  //   ولا تُرفَع هذه السقّافةُ ليمرّ نداءٌ جديد: يُمرَّر ما قُرئ.
  const understandCalls = (code.match(/\bunderstand\(/g) || []).length;
  assert.ok(understandCalls <= 1,
    `\`understand\` تُستدعى ${understandCalls} مرّاتٍ في الصفحة — تحليلٌ يتكرّر بلا داعٍ`);
});


// ㉗ ما تَعِد به الرسالةُ له بابٌ يفي به.
//
//   رسالةُ واتساب تقول للزبون «🔑 كود التتبع» و«احتفظ به لمتابعة طلبك»،
//   والخادمُ يُجيب عن الكود منذ زمن (`GET /api/orders/track-code/:code`
//   عامٌّ بلا مصادقة) — **ولا صفحةَ يُدخِله فيها**. وعدٌ في رسالةٍ بلا باب:
//   الزبونُ يحتفظ بكودٍ لا يستعمله، ويتّصل بالتاجر ليسأل «فين وصل طلبي؟».
test('㉗ للتتبّع صفحةٌ عامّةٌ، والرسالةُ تحمل رابطَها', () => {
  const page = join(ROOT, 'src/pages/TrackOrder.tsx');
  assert.ok(existsSync(page), 'لا صفحةَ تتبّع — الكودُ يُعطى ولا يُستعمَل');

  const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
  assert.match(app, /path="\/track\/:userId"/, 'الصفحةُ مبنيّةٌ بلا مسار');
  // عامٌّ لا محميّ: الزبونُ لا حسابَ له، ووضعُه خلف `isAuthed` يقفل البابَ عمّن بُني له.
  const line = (app.match(/^.*path="\/track\/:userId".*$/m) || [''])[0];
  assert.ok(!/isAuthed/.test(line), 'مسارُ التتبّع محميٌّ بحساب — والزبونُ لا حسابَ له');

  const src = readFileSync(page, 'utf8');
  assert.match(src, /track-code\//, 'الصفحةُ لا تنادي مسارَ الكود');
  assert.match(src, /orders\/track\//, 'لا بحثَ بالهاتف — من ضاع منه الكودُ يبقى معه هاتفُه');

  const orders = readFileSync(join(ROOT, 'server/routes/orders.js'), 'utf8');
  assert.match(orders, /\/track\/\$\{req\.user\.id\}\?code=/,
    'الرسالةُ تُعطي كودًا ولا تُعطي رابطًا — نسخٌ ولصقٌ بدل ضغطةٍ واحدة');
});

test('㉗ ولا يُعرَض رقمُ تتبّعٍ لا وجودَ له', () => {
  // `trackingNumber` معناه واحدٌ لا ثانيَ له: رقمٌ جاء من شركةِ توصيل.
  // عرضُ حقلٍ فارغٍ على أنّه رقمٌ يجعل الزبونَ يبحث عنه في موقع الشركة فلا يجده.
  const src = readFileSync(join(ROOT, 'src/pages/TrackOrder.tsx'), 'utf8');
  assert.match(src, /o\.trackingNumber \?/,
    'رقمُ التتبّع يُعرَض بلا شرطٍ — سيظهر فارغًا أو مخترَعًا');
});

// ============================================================
// ㉘ **النافذةُ تفتح الحقلَ المطلوبَ وحدَه — ولا تفتح ما لا تحفظه.**
//
//   طلبُ صاحب المشروع نصًّا: «نافذة منبثقة تفتح فقط الشيء الذي يطلبه
//   المستخدم — مثلًا رقم الهاتف تفتح فقط خانة لكتابة رقم الهاتف، ليس صفحة
//   الإعدادات بالكامل».
//
//   وخطرُ الآليّة معكوسُ نفعها: **نافذةٌ تُفتَح ولا تحفظ أسوأُ من صفحةٍ
//   كاملة**. الصفحةُ تُتعِب، والنافذةُ الكاذبةُ تُوهِم أنّ العملَ تمّ.
// ============================================================

test('㉘ لا يُفتَح حقلٌ إلّا وله مسارُ حفظٍ حقيقيّ', () => {
  const src = readFileSync(join(ROOT, 'src/components/FocusedEdit.tsx'), 'utf8');
  const declared = (src.match(/export const FOCUSABLE = \[([^\]]*)\]/) || [])[1] || '';
  const fields = [...declared.matchAll(/'(\w+)'/g)].map(m => m[1]);
  assert.ok(fields.length >= 3, `قُرئ ${fields.length} حقلًا — تغيّرت الصيغةُ والحارسُ أعمى`);

  const SAVES = { phone: 'phone', shop_name: 'name', address: 'address',
                  language: 'language', shop_hours: 'workStart' };
  for (const f of fields) {
    assert.ok(SAVES[f], `«${f}» مُعلَنٌ قابلًا للفتح ولا حقلَ محفوظًا معروفًا له`);
    assert.ok(new RegExp(`\\b${SAVES[f]}\\b`).test(src),
      `«${f}» يُفتَح ولا يُكتَب في \`brand.${SAVES[f]}\` — نافذةٌ لا تحفظ`);
  }
  assert.match(src, /updateSettings\('brand'/, 'النافذةُ لا تحفظ شيئًا إطلاقًا');

  // وكلُّ حقلٍ يجب أن يقرأه قارئُ اللغة — وإلّا فهو بابٌ لا يُفتَح أبدًا.
  const acts = readFileSync(join(ROOT, 'src/lib/akg/kb/actions.ts'), 'utf8');
  for (const f of fields) {
    assert.ok(new RegExp(`object: '${f}'`).test(acts),
      `«${f}» مُعلَنٌ في النافذة ولا يقرؤه \`actions.ts\` — يبدو مبنيًّا وهو ميّت`);
  }
});

test('㉘ والنمرةُ تمرّ بالتحقّق — لا بابَ خلفيًّا حول حمايةٍ قائمة', () => {
  // مسارُ تبديل النمرة في `SettingsPage` يمرّ بـ`VerifyCode` بغرض
  // `phone_change`. ونافذةٌ سريعةٌ تحفظ بلا تأكيدٍ تعني بابًا خلفيًّا حول
  // حمايةٍ بُنيت عمدًا — وهي أخطرُ من غياب النافذة كلِّها.
  const src = readFileSync(join(ROOT, 'src/components/FocusedEdit.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /VerifyCode/, 'النافذةُ لا تعرف التحقّقَ إطلاقًا');
  assert.match(code, /purpose="phone_change"/, 'تحقّقٌ بغرضٍ آخر — الغرضُ جزءٌ من المفتاح');
  const saves = [...code.matchAll(/save\(\{[^}]*phone[^}]*\}\)/g)];
  assert.equal(saves.length, 1,
    `حفظُ النمرة يقع في ${saves.length} موضعًا — أحدُها يتجاوز التحقّق`);
  assert.match(code, /onVerified=\{\(\) => save\(\{ phone/,
    'حفظُ النمرة خارجَ مسار التحقّق');
});

test('㉘ والمشهدُ يفتحها فعلًا — ومن حكمٍ واحدٍ لا من نسخةٍ ثانية', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /<FocusedEdit/, '`FocusedEdit` غيرُ مركَّبٍ — يُبنى ولا يُرى');
  assert.match(code, /isFocusable\(verdict\.dest\?\.focus\)/,
    'الحقلُ لا يُقرأ من حكم الحَكَم — نسخةٌ ثانيةٌ ستتباعد عنه');
  assert.match(code, /'execute' \|\| verdict\.verdict === 'confirm'/,
    'النافذةُ تُفتَح على كلّ حكم — حتّى `ask` حيث ينقص شيءٌ يُسأل عنه أوّلًا');
});

test('㉙ سؤالُ الحَكَم يبلغ الشاشةَ — ولا وجهةَ تحتَ سؤالٍ معلّق', () => {
  // من شاشةٍ حيّة: الحَكَمُ يسأل «فران ديال الطياب، ولا محلّ ديال الخبز؟»
  // والشاشةُ تعرض «مخبز ٨٦٪» وزرَّ «يالله نمشيو للسوق». السؤالُ يُصاغ ويُرمى.
  //
  //   وعرضُ زرِّ وجهةٍ تحت سؤالٍ يجعل الجوابَ اختياريًّا: يُضغَط الزرُّ
  //   فيُساق الإنسانُ إلى وجهةٍ بُنيت على التخمين الذي منعه السؤال.
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /setSaid\(verdict\.say \|\| ''\)/,
    '**سؤالُ الحَكَم يُرمى** — يُحفَظ لبعض الأحكام دون بعض');
  assert.match(code, /decision\?\.mode === 'clarify'\) && !correcting/,
    'سؤالُ الاستيضاح لا يُعرَض — يُحفَظ ولا يُرى');
  assert.match(code, /!\(!pending && said && decision\?\.mode === 'clarify'\)/,
    'تُعرَض وجهةٌ تحت سؤالٍ معلّق — فيصير الجوابُ اختياريًّا');
});

// ============================================================
// **الاتّجاهُ يبلغ القدرة — وإلّا بقيت القاعدةُ لا تُنادى.**
//
//   قِيس: «كنقلب على دار للكراء» و«عندي دار للكراء» كانتا تُخرجان **نفسَ
//   الشيء حرفيًّا** (`PUBLISH_LISTING` ⇒ صفحةُ النشر)، فمن يبحث عن دارٍ
//   ليسكنها يُساق ليَنشر إعلانًا. والاتّجاهُ مقروءٌ صحيحًا ولا أحدَ يسأله.
//
//   والقاعدةُ في `abilities.honourStance` **لا تُنادى من نفسها**: تحتاج أن
//   يُمرَّر إليها الاتّجاه. فيُحرَس الوصلُ لا وجودُ القاعدة — طبقةٌ تعمل ولا
//   أحدَ يعرف أنّها تعمل هي أشيعُ أعطاب هذا المشروع.
// ============================================================
test('الاتّجاهُ يُمرَّر إلى مطابِق القدرة', () => {
  // بعد RC-P1 يُمرَّر الاتّجاهُ من المالك الواحد، فيبلغ **كلَّ** شاشةٍ تسأله
  //   بدل أن يبلغ من تذكّره كاتبُها. والحدُّ الأعلى (٣٠٠ حرفًا) يمنع أن يمرّ
  //   الحارسُ على `stance` بعيدةٍ في ملفٍّ آخرَ من نداءِ الكتالوج.
  const code = readFileSync(join(ROOT, 'src/lib/decide.ts'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /abilityFor\(\{[\s\S]{0,300}?\bstance\b/,
    'المالكُ يطابق القدرةَ بلا اتّجاه — فالطالبُ يعود إلى صفحة النشر');

  const ab = readFileSync(join(ROOT, 'src/lib/abilities.ts'), 'utf8');
  const abCode = ab.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(abCode, /function honourStance/, 'سقطت قاعدةُ الاتّجاه من الكتالوج');
  // **ولا سطرَ خاصٌّ بالكراء**: القاعدةُ تُقرأ من الكتالوج، وإلّا تكرّرت
  //   لكلّ نيّةٍ تُخرج قدرةَ عرضٍ لمن يطلب.
  assert.doesNotMatch(abCode, /rent'\s*\?\s*'SEEK_LISTING|if\s*\(\s*intent\s*===\s*'rent'/,
    'عاد الإصلاحُ سطرًا خاصًّا بالكراء — والجذرُ يبقى لغيره');
});

// ============================================================
// **«نتا» تُقال لمن يكون، لا لما يملك.**
//
//   من شاشة صاحب المشروع: «bghit nebi3 bikala» ⇒ **«نتا درّاجة هوائيّة
//   وباغي تعلن»** — أي أنّ التطبيق قال للإنسان إنّه درّاجة. والصيغةُ كُتبت
//   لحرفةٍ («نتا سبّاك وباغي تعلن») ثمّ وردتها سلعة.
//
//   والحارسُ هنا **نصّيٌّ عمدًا**: الصيغةُ تعيش في مكوّنِ عرضٍ لا يبلغه
//   اختبارُ العقل، وسبرُ العطب فيه لم يُسقط شيئًا — أي أنّه كان بلا حارسٍ
//   أصلًا. وحدُّه معلَن: يحرس **الشرط** لا النصّ، فتبديلُ الصياغة حرٌّ ما
//   دام الفرقُ بين «مَن» و«ما» قائمًا.
// ============================================================
test('صيغةُ العرض تفرّق بين الحرفة والسلعة', () => {
  const f = join(ROOT, 'src/pages/Landing/sections/NeedFirst.tsx');
  const code = readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /const isWho\s*=\s*!!u\.profession\?\.label/,
    'سقط تمييزُ المصدر — «نتا» تُقال للسلعة كما للحرفة');
  assert.match(code, /isWho\s*\?\s*`نتا/,
    'صيغةُ «نتا» ما بقاتش مشروطةً بالحرفة');
});

// ============================================================
// **البوّابةُ تبلغ الشاشةَ التي يفتحها الناس.**
//
//   قِيس قبل الربط: `understandHybrid`/`shouldEscalate` تُنادَيان من
//   `AssistantPage.tsx` **وحدَها** في كامل الشجرة. أي أنّ الشاشةَ الرئيسيّة —
//   مدخلَ كلّ من يفتح التطبيق — لم تعرف قطُّ أنّ للذكاء بابًا.
//
//   وهذا حارسُ **الشكل** لا النتيجة: النتيجةُ محروسةٌ في `escalation.test`،
//   وهنا يُحرَس أنّ الربطَ بقي على شرطه — بثًّا بعد القواعد، بحَكَمٍ واحد،
//   وبلا تنفيذٍ من الذكاء مباشرةً.
// ============================================================
test('الشاشةُ الرئيسيّة تستشير الذكاءَ بعد أن تُجيب القواعد', () => {
  const f = join(ROOT, 'src/pages/LivingHome.tsx');
  const code = readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  // ① البوّابةُ موصولةٌ فعلًا — لا مستورَدةً وحدَها.
  assert.match(code, /shouldEscalate\s*\(/, 'الشاشةُ الرئيسيّة لا تسأل بوّابةَ التصعيد');
  assert.match(code, /escalate\s*\(\s*q\s*,/, 'التصعيدُ معرَّفٌ ولا يُنادى من `submit`');

  // ② القواعدُ ترسم أوّلًا: `submit` تبقى متزامنة، والتصعيدُ بعد الحكم.
  assert.doesNotMatch(code, /const\s+submit\s*=\s*async/,
    'صارت `submit` تنتظر الشبكةَ — شاشةٌ فارغةٌ حتّى يردّ الذكاء');
  assert.doesNotMatch(code, /await\s+understandHybrid|await\s+RemoteProvider/,
    'انتُظر جوابُ الذكاء قبل الرسم');
  assert.ok(code.indexOf('applyVerdict(u, r') < code.indexOf('escalate(q, u, r'),
    'صُعِّد قبل أن تحكم القواعد');

  // ③ جوابُ الذكاء يعود إلى نفس الحَكَم — لا يفتح صفحةً بنفسه.
  assert.match(code, /refine\s*\(\s*base\s*,\s*ai\s*\)/, 'دخل جوابُ الذكاء بلا `refine`');
  assert.match(code, /applyVerdict\(filled\s*,/,
    'جوابُ الذكاء لا يمرّ على الحَكَم — أو يُنفَّذ من تلقاء نفسه');
  const after = code.slice(code.indexOf('const escalate'), code.indexOf('const submit'));
  for (const forbidden of ['navigate(', 'setActionDest(', 'playGate(']) {
    assert.ok(!after.includes(forbidden),
      `الذكاءُ ينفّذ مباشرةً داخل التصعيد: ${forbidden}`);
  }

  // ④ جوابٌ متأخّرٌ عن سؤالٍ ماضٍ لا يقلب الشاشةَ تحت يد صاحبها.
  assert.match(code, /seq\s*!==\s*askSeq\.current/, 'سقط حارسُ الجواب المتأخّر');
});

test('و`refine` تملأ ولا تمسح — القاعدةُ في الكود لا في النيّة', () => {
  const code = readFileSync(join(ROOT, 'src/lib/refine.ts'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // كلُّ إسنادٍ مشروطٌ بفراغ الحقل. لو سقط الشرطُ صار الدمجُ استبدالًا،
  // فيخسر التطبيقُ ثلثَي ما قرأه مقابلَ انتظارِ شبكة.
  for (const field of ['city', 'service']) {
    assert.match(code, new RegExp(`if\\s*\\(\\s*!next\\.${field}`),
      `\`${field}\` يُكتَب بلا شرطِ فراغ — الذكاءُ يمسح ما قُرئ`);
  }
  // ولا يُمَسّ ما لا مقابلَ له في العقد البعيد: صمتُه ليس نفيًا.
  for (const untouched of ['action', 'stance', 'ambiguity', 'goal', 'services']) {
    assert.doesNotMatch(code, new RegExp(`next\\.${untouched}\\s*=`),
      `مسّ الدمجُ \`${untouched}\` والعقدُ البعيدُ لا يحمل له مقابلًا`);
  }
  // والمصدرُ يُفحَص: جوابُ القواعد لا يُدمَج في نفسه.
  assert.match(code, /ai\.source\s*!==\s*'llm'/, 'سقط فحصُ المصدر');
});

// ============================================================
// **قراءةٌ ضعيفةٌ لا تُفتَح بها صفحة.**
//
//   قِيس على جملةٍ من جملِ القبول: «بغيت نمشي الحي عندي غير 10 دراهم» ⇒
//   قارئةُ الأفعال تسقط على `update/settings` بثقة **٠٫٣٥**، فتُخرج
//   `UPDATE_SETTINGS` وتُساق الوجهةُ إلى **إعدادات الحساب**. رجلٌ يقول إنّ
//   معه عشرةَ دراهمَ يُفتَح له بابُ إعداداته.
//
//   والحدُّ `READ_ENOUGH` كان موجودًا ومطبَّقًا على `impossible` **وحدَه** —
//   أي أنّ القراءةَ الضعيفةَ لا تكفي للرفض وتكفي للفتح. وهذا معكوسٌ: الرفضُ
//   أهونُ من فتحِ بابٍ خاطئٍ بلا أن يطلبه أحد.
// ============================================================
test('الفعلُ الضعيفُ لا يبلغ الكتالوج', () => {
  // الحدُّ صار في المالك الواحد، فيسري على كلّ شاشةٍ تسأله. وحارسُ الشكل هنا
  //   **إضافيّ**: السلوكُ محروسٌ في `destinationOwner.test` بجملةِ «عندي غير
  //   10 دراهم» — قِيس أنّ إسقاطَ الحدّ يقلبها إلى `UPDATE_SETTINGS`.
  const code = readFileSync(join(ROOT, 'src/lib/decide.ts'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /const\s+act\s*=\s*\(u\.action\?\.confidence[^)]*\)\s*>=\s*READ_ENOUGH/,
    'سقط حدُّ القراءة عن الفعل قبل الكتالوج');
  assert.match(code, /abilityFor\(\{\s*action:\s*act,/,
    'يُمرَّر الفعلُ الخام إلى الكتالوج — قراءةٌ بثقة ٠٫٣٥ تفتح صفحة');
  // **سقّافةٌ لا تُرفَع**: القراءةُ الضعيفةُ تحمل ٠٫٣٥ والصحيحةُ ٠٫٧٠–٠٫٨٥،
  //   فحدٌّ دون ٠٫٤ يعيد فتحَ بابِ الإعدادات لمن لم يطلبه.
  const th = Number((code.match(/export const READ_ENOUGH\s*=\s*([\d.]+)/) || [])[1]);
  assert.ok(th >= 0.4, `حدُّ التصديق نزل إلى ${th} — القراءةُ الضعيفةُ تفتح بابًا`);
});

// ============================================================
// **«فهمتُك، وهادشي مازال ما كايناش» — ووعدٌ يُنفَّذ.**
//
//   الحدُّ الصادقُ يقول لصاحبه «سجّلت طلبك». فلو لم يُسجَّل صار كذبةً ألطفَ
//   من السؤال العاجز ولا فرقَ بينهما — بل هي أسوأ، لأنّها تشتري رضاه بوعدٍ
//   لا يُنفَّذ. فالتسجيلُ شرطٌ في الصياغة لا زينةٌ حولها.
//
//   وحدُّ الطبقةِ كلِّها: **لا تُنشئ قدرةً ولا مفهومًا**. تقول ولا تفتح بابًا.
// ============================================================
test('الحدُّ الصادقُ يُسجَّل فعلًا — لا وعدَ بلا قناة', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(home, /verdict\.verdict === 'soon'[^\n]*recordDemand\(/,
    'يُقال «سجّلت طلبك» ولا يُسجَّل — وعدٌ بلا قناة');
  // ولا يُسأل سؤالٌ موجَّهٌ تحت جوابٍ يقول «مازال ما كايناش»: تلك عينُ
  // الحلقةِ التي بُني الحدُّ ليقطعها.
  // ── **ويحرس القاعدةَ لا نصَّ الشرط** ──────────────────────────
  //   كان مكتوبًا `activeStep && !pending && decision?.mode !== 'soon'`
  //   حرفيًّا، فسقط يومَ أُضيف شرطٌ ثالثٌ في وسطه (`!live` — لا سؤالَ تحت
  //   جملةٍ حيّة) والقاعدةُ قائمةٌ كما هي. فيُفحَص **أنّ الحكمَ يكبح
  //   الخطوات**، وتبقى الشروطُ الأخرى حرّةً تُضاف.
  assert.match(home, /activeStep &&[^\n]*decision\?\.mode !== 'soon'/,
    'الخطواتُ تُعرَض تحت الحدّ — عادت حلقةُ الأسئلة');

  const b = readFileSync(join(ROOT, 'src/lib/boundary.ts'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // **لا تفتح بابًا ولا تخترع مفهومًا.** لو أنشأت قدرةً لصارت الطبقةُ التي
  // تُعلن العجزَ هي نفسُها التي تدّعي القدرة.
  for (const forbidden of ['ABILITIES', 'abilityFor', 'resolveConcept', 'dest:']) {
    assert.ok(!b.includes(forbidden), `طبقةُ الحدّ تلمس الكتالوجَ/المفاهيم: ${forbidden}`);
  }
  assert.match(b, /\bdeny\b/, 'سقط حارسُ المجال المخدوم — يُقال «ما كايناش» عن بابٍ يعمل');
  assert.match(b, /if \(u\.service \|\| u\.profession \|\| u\.problem\) return null/,
    'ينطق الحدُّ فوق خدمةٍ مقروءة');
});

test('وقناةُ الطلب لا تبني قدرةً بنفسها — لا تعلُّمَ ذاتيّ', () => {
  const dbCode = readFileSync(join(ROOT, 'server/database.js'), 'utf8');
  const fn = dbCode.slice(dbCode.indexOf('db.recordDemand'), dbCode.indexOf('db.topDemand'));
  assert.ok(fn.length > 100, 'لم تُقرأ `recordDemand` — تغيّر الاسمُ والحارسُ أعمى');
  // الحالةُ تبقى على `pending` الافتراضيّة: **لا ذكرَ لـ`status` هنا أصلًا**.
  //   وأوّلُ صياغةٍ كانت `/SET[^)]*status/` فمرّت وهي جوفاء: `[^)]*` تقف عند
  //   قوس `NOW()` قبل أن تبلغ الكلمة. وأسقطتُها بسبرٍ فلم يسقط شيء.
  assert.ok(!/status/i.test(fn),
    'تكتب قناةُ الطلب الحالةَ بنفسها — عدّادٌ يمتلئ فيصير قدرة');
});

// ============================================================
// **الجملةُ الحيّةُ طبقةُ عرضٍ — لا عقلٌ سادس.**
//
//   شرطُ صاحب المشروع ومستشاره معًا: لا نيّةَ جديدة · لا محرّكَ جديد · لا
//   عقدَ ثانيًا للفهم · لا مساسَ بمطابقة القدرات. وأخطرُ ما يقع لطبقةٍ
//   كهذه أن تُرقَّى بصمتٍ إلى حَكَم: تبدأ عرضًا ثمّ تقرأ جملةً بنفسها، ثمّ
//   تحفظ من الواجهة مباشرةً — فيصير للتطبيق بابان، واحدٌ يمرّ بالسياسة
//   وآخرُ يتجاوزها. وذاك أوّلُ ما يجعل `decideExecution` حبرًا.
// ============================================================
test('الجملةُ الحيّةُ لا تفهم ولا تُقرّر — تعرض فقط', () => {
  const f = join(ROOT, 'src/lib/liveSentence.ts');
  const code = readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // لا تستورد محرّكَ فهمٍ ولا حَكَمًا: مصادرُها ما قرأته الطبقاتُ سلفًا.
  for (const forbidden of ['needEngine', 'executionPolicy', 'understanding', 'humanIntent']) {
    assert.doesNotMatch(code, new RegExp(`from '[^']*${forbidden}`),
      `الجملةُ الحيّةُ تستورد \`${forbidden}\` — صارت تفهم أو تقرّر بنفسها`);
  }
  // والفراغُ يُشتقّ من مصدر السؤال نفسِه لا من قائمةٍ مكتوبةٍ بيد.
  assert.match(code, /unmetNeeds/, 'الفراغُ ما بقاش مشتقًّا من `unmetNeeds` — صار قائمةً ثانية');
  assert.match(code, /NEED_ASK/, 'نصُّ السؤال يُكتَب هنا بدل أن يُقرأ من مصدره');
});

test('والحفظُ يمرّ بالحَكَم — لا حفظَ مباشرٌ من الواجهة', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const fill = (code.match(/const fillSlot[\s\S]*?\n  };/) || [])[0] || '';
  assert.ok(fill, 'اختفت `fillSlot` — الحارسُ صار أعمى');
  // ── **ويمرّ بالحَكَم الواحد لا بنداءٍ ثانٍ له** ──────────────────
  //   كُتب هذا الحارسُ أوّلًا يشترط `decideExecution(` داخل `fillSlot` —
  //   فمرّ على تصميمٍ **خاطئ**: نداءٌ ثانٍ للحَكَم في نفس المشهد، أسقطه
  //   الحارسُ ㉒ بحقّ. فالشرطُ الصحيح أن يُنادى **موضعُ النداء الوحيد**.
  assert.match(fill, /applyVerdict\(/,
    'الملءُ يحفظ بلا أن يمرّ بالحَكَم — بابٌ ثانٍ يتجاوز السياسة');
  assert.match(fill, /mode !== 'direct' && [\s\S]*?mode !== 'confirm'/,
    'يُحفَظ ولو قال الحَكَمُ «اسأل» — فالحكمُ يُستشار ثمّ يُهمَل');
  assert.doesNotMatch(fill, /understand\(|orchestrate\(/,
    'الملءُ يُعيد قراءةَ جملةٍ مركَّبة — والقراءةُ الثانيةُ تفترق عن الأولى');
});

// **والحقولُ التي لها بابٌ مبنيٌّ لا تُفتَح لها ثانيةٌ في الجملة الحيّة.**
//
//   `phone` و`address` لهما `FocusedEdit` منذ زمن. وأُدرجا أوّلًا في
//   `INLINE_NEEDS` فظهر على شاشة صاحب المشروع: «نبدل رقم الهاتف» ومعها
//   **📦 حلاق · الثمن دابا ٠ درهم**. وأخطرُ ممّا ظهر ما لم يظهر: `fillSlot`
//   كانت ستكتب النمرةَ **ستوكًا**. بابان لشيءٍ واحدٍ يتباعدان.
test('الجملةُ الحيّةُ لا تفتح بابًا ثانيًا لحقلٍ له باب', () => {
  const src = readFileSync(join(ROOT, 'src/lib/liveSentence.ts'), 'utf8');
  const inline = (src.match(/INLINE_NEEDS: NeedKey\[\] = \[([^\]]*)\]/) || [])[1] || '';
  assert.ok(inline.trim(), 'تعذّرت قراءةُ `INLINE_NEEDS` — الحارسُ صار أعمى');
  assert.doesNotMatch(inline, /'phone'|'address'/,
    'عادت النمرةُ أو العنوانُ إلى الجملة الحيّة — وبابُهما `FocusedEdit`');
  // والموضوعُ يُرفَق بحقلٍ يخصّه لا بكلّ حقل.
  assert.match(src, /PRODUCT_FIELDS\.includes\(field\) \? ctx\?\.subject : undefined/,
    'الموضوعُ يُرفَق بأيّ حقل — فتظهر سلعةٌ مع تبديل نمرة');
});

// **ولا سؤالَ تحت جملةٍ حيّة.** رآه صاحبُ المشروع: الجملةُ تعرض المنتوجَ
//   والفراغَ، وتحتها «أيّ منتوج؟» — أي أنّ السؤالَ الذي بُنيت لتُلغيه بقي.
test('السؤالُ الموجَّهُ يسكت تحت الجملة الحيّة', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /\{activeStep && !pending && !live &&/,
    'يُعرَض سؤالٌ موجَّهٌ تحت الجملة الحيّة — والفراغُ هو السؤال');
});

// **والأثرُ التقنيُّ لا يُعرَض على تاجر.** «يقين ٩٠٪» و«فعل → update/price»
//   لغةُ من يبني لا لغةُ من يبيع (القانون ١٠). تُطوى تحت «كيفاش فهمت».
test('الوسومُ التقنيّةُ مطويّةٌ لا معروضة', () => {
  const home = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = home.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /\{showTrace && result\.tags\.map/, 'الوسومُ التقنيّةُ معروضةٌ على السطح');
  assert.match(code, /\{showTrace && result\.confidence/, 'نسبةُ اليقين معروضةٌ على السطح');
  // والذاكرةُ تحفظ ما يُقال للإنسان: كانت تعرض «آخر مرة مشيتي لـ فعل → view/orders».
  assert.doesNotMatch(code, /go\([^)]*result\.tags\[0\]/,
    'الذاكرةُ تحفظ الوسمَ التقنيَّ — فتُعرَض «فعل → update/price» للتاجر');
});

// ============================================================
// **شاشةٌ واحدةٌ — والرابطُ الداخليُّ تنقّلٌ لا إعادةُ بناء.**
//
//   قِيست الرحلةُ الأولى فوُجدت ثلاثَ شاشاتٍ وإعادتَي تحميل:
//
//       /       يكتب حاجتَه ويُفهَم
//         ↓  «دخول» = <a href="/login">   ← **إعادةُ تحميلٍ كاملة**
//       /login  استمارةٌ في ٥٤٩ سطرًا
//         ↓  window.location.assign('/home')
//       /home   المحادثة
//
//   و`<a href>` في تطبيق React Router ليس تنقّلًا بل **هدمُ التطبيق
//   وإعادةُ بنائه**: ما كتبه الإنسانُ وما فُهم منه يُمحى في اللحظة التي
//   يضغط فيها «دخول». وهو لا يرى عطبًا — يرى **عملَه يختفي**.
// ============================================================
test('لا رابطَ داخليٍّ يُعيد بناءَ التطبيق في صفحة الهبوط', () => {
  const dir = join(ROOT, 'src/pages/Landing/sections');
  const bad = [];
  for (const f of readdirSync(dir).filter(x => x.endsWith('.tsx'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    // روابطُ `http(s)` خارجيّةٌ ولها حقٌّ في `<a>` — الداخليُّ وحدَه يُحرَس.
    for (const m of src.matchAll(/<a\s+href=(["{])(\/[^"}\s]*)/g)) bad.push(`${f}: ${m[2]}`);
    if (/window\.location\.assign\(\s*['"`]\//.test(src)) bad.push(`${f}: window.location.assign`);
  }
  assert.deepEqual(bad, [],
    `روابطُ تهدم التطبيقَ وتُعيد بناءَه — يضيع ما كتبه الإنسان:\n  ${bad.join('\n  ')}`);
});

// **والعتبةُ تظهر حيث يقف الإنسان، ولا تنقله.**
test('العتبةُ داخل المحادثة — لا قفزَ إلى صفحة تسجيل', () => {
  const nf = readFileSync(join(ROOT, 'src/pages/Landing/sections/NeedFirst.tsx'), 'utf8');
  const code = nf.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /navigate\(`?\/auth/,
    'ما زال يُنقَل إلى صفحةِ تسجيلٍ — والحوارُ يُقطَع ويُعاد وصلُه بخيط');
  assert.match(code, /<Threshold/, 'سقطت العتبةُ من المحادثة');
  // ومَن دخل سلفًا لا يُسأل: المصادقةُ شرطٌ يُفحَص لا طقسٌ يُؤدّى.
  assert.match(code, /if \(!isAuthed\) \{ setGate/,
    'تُعرَض العتبةُ لمن دخل سلفًا — أو لا تُعرَض لمن لم يدخل');
  // ويُكمل ما كان يفعله بعد العبور — لا يعود إلى الصفر.
  assert.match(code, /onDone=\{[\s\S]{0,200}navigate\(/,
    'بعد العبور لا يُكمل الإنسانُ ما كان يفعله');
});

// **والعتبةُ لا تخترع مصادقة.** شكلٌ جديدٌ لبابٍ قائم: تنادي `login`/
//   `register` من المخزن كما تناديهما `AuthPage`. ولو خزّنت سرًّا أو نادت
//   مسارًا بنفسها لصار للتطبيق بابان للدخول — وذاك أخطرُ ما يُضاف بصمت.
test('العتبةُ شكلٌ لبابٍ قائم — لا بابَ ثانٍ للمصادقة', () => {
  const src = readFileSync(join(ROOT, 'src/components/Threshold.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /useStore\(\)/, 'العتبةُ لا تمرّ بالمخزن');
  assert.doesNotMatch(code, /fetch\(|authAPI|localStorage\.setItem/,
    'العتبةُ تنادي الخادمَ أو تخزّن سرًّا بنفسها — بابٌ ثانٍ للدخول');
});

// **والعتبةُ تحمل ألوانَها — لا تستعير سِمةَ صفحة.**
//
//   رآه صاحبُ المشروع: نصُّ العتبة **باهتٌ لا يُقرأ**. وسببُه أنّها كُتبت
//   بـ`var(--ink1)` وهو **أبيضُ** (`#F0F4FF`) في سِمة التطبيق، بينما صفحةُ
//   الهبوط **فاتحة** (`#FAF8F2`). فأبيضُ على فاتحٍ يختفي.
//
//   وهي تظهر في صفحتَين بسِمتَين متعاكستَين، فألوانٌ مستعارةٌ تعني أنّها
//   تُقرأ في واحدةٍ وتختفي في الأخرى.
test('العتبةُ لا تستعير ألوانَ سِمةٍ متغيّرة', () => {
  const src = readFileSync(join(ROOT, 'src/components/Threshold.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const borrowed = [...code.matchAll(/var\(--[a-z0-9-]+\)/g)].map(m => m[0]);
  assert.deepEqual(borrowed, [],
    `ألوانٌ مستعارةٌ بلا بديل: ${borrowed.join(' · ')} — تُقرأ في سِمةٍ وتختفي في الأخرى`);
});

// **ولا نداءان في مشهدٍ واحد.** «متابعة» تحت «كمّل» تُربك: أيُّهما يُضغَط؟
test('زرُّ «متابعة» يسكت تحت العتبة', () => {
  const nf = readFileSync(join(ROOT, 'src/pages/Landing/sections/NeedFirst.tsx'), 'utf8');
  const code = nf.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /\{!ask && !gate && text\.trim\(\)\.length >= 2 &&/,
    'يُعرَض نداءان في مشهدٍ واحد — «متابعة» تحت زرّ العتبة');
});

// **والمنعُ يُقال لا يُصمَت عنه.** صفحاتُ أدمن المنصّة كانت تُظهر لوحةَ
//   التحكّم مكانَها، فيظنّ صاحبُها أنّ الصفحة «لا تفتح» ويبحث عن عطبٍ
//   لا وجودَ له.
test('صفحةُ أدمن المنصّة تقول لماذا مُنعت', () => {
  const ml = readFileSync(join(ROOT, 'src/pages/MainLayout.tsx'), 'utf8');
  const code = ml.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const block = (code.match(/if \(PLATFORM_PAGES\.has[\s\S]{0,900}?\n  \}/) || [''])[0];
  assert.ok(block, 'اختفى حارسُ صفحات المنصّة');
  assert.doesNotMatch(block, /return <DashboardPage \/>/,
    'المنعُ يُظهر لوحةَ التحكّم بصمت — فيبدو أنّ الصفحة معطّلة');
  assert.match(block, /ADMIN_EMAILS/, 'لا يُقال كيف يُفتَح البابُ — منعٌ بلا مخرج');
});

// ============================================================
// **الزيارةُ الميدانيّة** — طبقةٌ بُنيت ولم تُنادَ هي طبقةٌ لم تُبنَ.
//
//   نمطُ عطبٍ تكرّر في هذا المستودع أكثرَ من غيره: `understandHybrid` بُني
//   كاملًا وما بلغته إلّا `AssistantPage`، والمرشّحاتُ قُرئت وما وصلت
//   البحثَ. فبناءُ `VisitFlow` بلا ندائها من `FieldVisit` يعيد النمطَ نفسَه
//   — ويبقى صاحبُ المحلّ أمام الاستمارةِ الطويلةِ التي قال إنّه لا يملك لها
//   نصفَ ساعة.
// ============================================================

test('التدفّقُ الجديدُ يُنادى من الصفحة — لا طبقةَ تُبنى وتُترَك', () => {
  const fv = readFileSync(join(ROOT, 'src/pages/FieldVisit.tsx'), 'utf8');
  const code = fv.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // `<VisitFlow` بلا حدٍّ تلتقط `<VisitFlowX` — الحارسُ نفسُه وقع في نمط
  //   «العامُّ يبتلع الخاصّ» الذي يُطارَد في هذا المستودع منذ «شق» في «شقة».
  assert.match(code, /<VisitFlow[\s/>]/, 'التدفّقُ مبنيٌّ وما تنادى — الصفحةُ مازالت استمارة');
  // والاستمارةُ القديمةُ لا تعود بجانبه: مدخلان لشيءٍ واحدٍ يفترقان بلا صوت.
  assert.doesNotMatch(code, /placeholder="اسم المحلّ/,
    'رجعت خاناتُ الاستمارة القديمة بجانب التدفّق — مدخلان لزيارةٍ واحدة');
});

// **والصنفُ يُشتقّ ولا يُسأل** — «واش نتا محلّ ولا حرفيّ؟» جوابُه مقروءٌ
//   سلفًا من جملته، وطرحُه ثمنٌ يُدفَع من وقت رجلٍ واقفٍ ووراءه زبون.
test('الزيارةُ تشتقّ الصنفَ من المعرفة قبل أن تسأل عنه', () => {
  const vf = readFileSync(join(ROOT, 'src/components/VisitFlow.tsx'), 'utf8');
  const code = vf.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /kindOfConcept\(/, 'الصنفُ ما كيتشتقّش — كيتسأل');
  // والسؤالُ عنه لا يُطرَح إلّا حين يعجز الاشتقاق.
  assert.match(code, /const kind = draft\.kind \|\| derived/,
    'الصنفُ المسؤولُ عنه يسبق المشتقَّ — أو انفصل أحدُهما عن الآخر');
  assert.match(code, /\{kind \?[\s\S]{0,600}?KIND_SAY\[kind\]/,
    'لا يُعرَض الصنفُ المشتقُّ للزائر — فلا يقدر يصحّحه');
});

// **والقطعةُ ترث سِمةَ بيتها حين يكون لها بيتٌ واحد.**
//
//   `Threshold` تحمل ألوانَها لأنّها تظهر في صفحتَين متعاكستَين. و`VisitFlow`
//   عكسُها: لا تُستدعى إلّا من `FieldVisit`، ولا تُبلَغ `FieldVisit` إلّا من
//   `MainLayout` — والتطبيقُ داكن. فلوحٌ أبيضُ فيها **ورقةٌ مُقحَمة**.
//
//   والحارسُ يقيس الشرطَ الذي وُلدت منه القاعدة — بيتًا واحدًا — لا الذوقَ:
//   لو صارت تُعرَض في صفحةٍ فاتحةٍ يومًا، سقط الحارسُ وحدَه ووجب التفكير.
test('تدفّقُ الزيارة يرث سِمةَ التطبيق — بيتُه واحدٌ وداكن', () => {
  // `walk` أعلاه يجمع `.js` وحدَها (حارسُ التوصيل يقرأ الخادم)، فلا تُنابُ
  //   عن هذه القراءة — نيابةُ دالّةٍ عن أخرى هي بعينُها العطبُ الذي وُلد منه
  //   ملفُّ `visitKind`: دالّةٌ تُستعمَل لسؤالٍ ليس سؤالَها فتصمت حين تخطئ.
  const src = [];
  (function ts(dir) {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) ts(p);
      else if (/\.tsx?$/.test(p)) src.push(p);
    }
  })(join(ROOT, 'src'));
  const homes = src.filter(f => !f.endsWith('VisitFlow.tsx')
    && /from '[^']*VisitFlow'/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(homes.map(f => f.split('/src/')[1]), ['pages/FieldVisit.tsx'],
    'صار للتدفّق بيتٌ ثانٍ — فالوراثةُ ما بقاتش صحيحة، راجع الألوان');

  const vf = readFileSync(join(ROOT, 'src/components/VisitFlow.tsx'), 'utf8');
  const code = vf.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const white = [...code.matchAll(/(?:background|color): '#(?:fff|FFF|ffffff|FFFFFF)'/g)].map(m => m[0]);
  assert.deepEqual(white, [],
    `أرضيّةٌ بيضاءُ وسطَ تطبيقٍ داكن: ${white.join(' · ')}`);
  assert.match(code, /var\(--ink1|var\(--panel/, 'ما كيورّتش سِمةَ التطبيق أصلًا');

  // **ولا لونَ يُركَّب بالجمع.** `${K.green}12` يشتغل على `#00D2B3` ويُنتج
  //   `var(--mint,…)12` على متغيّر — قيمةً يُسقطها المتصفّحُ صامتًا.
  const glued = [...code.matchAll(/\$\{[A-Za-z][\w.]*\}[0-9a-fA-F]{2}/g)]
    .map(m => m[0]).filter(s => !/K\.red/.test(s));
  assert.deepEqual(glued, [],
    `لونٌ مركَّبٌ بالجمع فوق متغيّر: ${glued.join(' · ')} — يسقط بلا رسالة`);
});

// **وما يُجمَع في الزيارة يصل قاعدةَ البيانات.** ساعاتُ العمل والتوصيلُ
//   يُسألان في الميدان — فإن بقيا في الواجهة كانا سؤالًا بلا مقابل، وهو
//   بالضبط ما يمنعه قيدُ «لا نصفَ ساعةٍ من وقته».
test('أجوبةُ الصنف تبلغ أعمدةً قائمةً في الخادم', () => {
  const api = readFileSync(join(ROOT, 'src/services/api.ts'), 'utf8');
  assert.match(api, /profile\?: \{[^}]*hours\?: string/,
    'حقلُ الملفّ ما كاينش فـ`FieldVisitInput` — الأجوبةُ ما كتوصلش');

  const fv = readFileSync(join(ROOT, 'src/pages/FieldVisit.tsx'), 'utf8');
  assert.match(fv, /profile: \{[\s\S]{0,400}?hours:/, 'الصفحةُ ما كتبعتش الساعات');

  const rt = readFileSync(join(ROOT, 'server/routes/providers.js'), 'utf8');
  const code = rt.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  // **الكتلةُ وحدَها تُقرأ، لا الملفُّ كلُّه.** `updateProvider(` تقع في هذا
  //   الملفّ مراتٍ أخرى مشروعة، فالبحثُ عنها في الملفِّ كلِّه يمرّ حتّى لو
  //   حُذف الحفظُ من هنا — حارسٌ ينجح بينما العطبُ حاضر. قِيس فأُصلح.
  const block = (code.match(/const prof = b\.profile[\s\S]{0,700}?\n    \}\n/) || [''])[0];
  assert.ok(block, 'الخادمُ ما كيقراش `profile` — الجوابُ كيتحيّد');
  assert.match(block, /patch\.openingHours/, 'الساعاتُ ما كتتكتبش');
  assert.match(block, /patch\.deliveryModes/, 'التوصيلُ ما كيتكتبش');
  assert.match(block, /db\.updateProvider\(user\.id, provider\.id, patch\)/,
    'ما كيتحفظش — الأعمدةُ كتبقا خاوية');
});

// **وقناةُ التعلّم تُفتَح بالعربيّة.** كانت تطلب `car_wash` مكتوبةً بيد
//   الزائر — أي أن يحفظ مئتَي مُعرِّفٍ لاتينيٍّ وهو واقفٌ وصاحبُ المحلّ
//   ينتظر. فقناةٌ بُنيت ليتعلّم منها التطبيقُ صارت قناةً لا يمرّ فيها شيء:
//   لا عطبَ يظهر، ولا سطرَ يصل `learning_unknowns`.
test('ربطُ الكلمة المجهولة يتمّ بالعربيّة لا بمُعرِّفٍ يُكتَب بيد', () => {
  const vf = readFileSync(join(ROOT, 'src/components/VisitFlow.tsx'), 'utf8');
  const code = vf.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /<WordLink[\s/>]/, 'سقط رابطُ الكلمات — القناةُ مسدودة');
  assert.doesNotMatch(code, /placeholder="مُعرِّفُ المفهوم/,
    'رجع طلبُ المُعرِّف اللاتينيّ بيد الزائر');
  const link = (code.match(/function WordLink\([\s\S]*?\n\}\n/) || [''])[0];
  assert.ok(link, 'اختفت دالّةُ الربط');
  assert.match(link, /normLoose\(/, 'البحثُ بلا تطبيع — «صباغه» ما كتلقاش «صباغة»');
  assert.match(link, /CONCEPTS as any\[\]\)\s*\n?\s*\.filter/,
    'ما كيقلّبش فالمعرفة — القائمةُ مكتوبةٌ بيد');
  // والاقتراحُ الأوّلُ من جملته: الكلمةُ المجهولةُ غالبًا مرادفةُ ما قاله للتوّ.
  assert.match(code, /suggest=\{read\.services\}/,
    'الاقتراحاتُ ما كتجيش من جملة التاجر — فالزائرُ كيقلّب من الصفر');
});

// ============================================================
// **الدليل يصل الشاشةَ والقناة** — وإلّا فهو طبقةٌ سادسةٌ صامتة.
//
//   `learning_unknowns` مبنيّةٌ من طرفَيها منذ زمن: جدولٌ في `migrate.js`،
//   ومسارٌ `/api/ai/report-unknown`، ودالّةٌ `bumpUnknownText`. وشرطُ العبور
//   كان `intent === 'unknown'` — و`needEngine` تُرجع `find_pro` حين لا تجد
//   شيئًا، فلا تقع `unknown` أبدًا. **قناةٌ كاملةٌ لا يمرّ فيها شيء.**
//
//   والأخطرُ أنّ الإخفاق كان يُسجَّل **نجاحًا** (`d.intents.find_pro`)، فمن
//   يقرأ الجدولَ ليقرّر يرى أنّ كلَّ شيءٍ بخير. وأسوأُ من بياناتٍ ناقصةٍ
//   بياناتٌ تكذب.
// ============================================================

test('الصدى يبلغ قناةَ «ما لم نفهمه» — لا يُسجَّل نجاحًا', () => {
  const j = readFileSync(join(ROOT, 'src/lib/journey.ts'), 'utf8');
  const code = j.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const fn = (code.match(/export function recordDecision\([\s\S]*?\n\}/) || [''])[0];
  assert.ok(fn, 'اختفت `recordDecision`');
  assert.match(fn, /isUnread\(/,
    'الشرطُ رجع لـ`unknown` وحدَها — والمصرفُ يسبقها دائمًا فالقناةُ تموت');
  assert.match(fn, /reportUnknown\(t\)/, 'ما كيبلغش الخادمَ — يبقى محليًّا وحدَه');
  // **والقاعدةُ لا تُكتَب مرّتَين.** لو نُسخ شرطُ الصدى هنا لافترق عن أصله
  //   في `evidence.ts` بلا صوت — نمطُ «قائمتان لشيءٍ واحد».
  assert.doesNotMatch(fn, /=== 'echo'/,
    'شرطُ الصدى مكتوبٌ هنا ثانيةً — قائمتان لقاعدةٍ واحدة');
  // والمعروفُ في بابه: `about_self` و`stuck` تُبلَّغ كطلبِ قدرةٍ لا كمجهول.
  assert.match(code, /\/api\/ai\/uncovered/,
    'السؤالُ المعروفُ بلا باب ما كيتسجّلش — ولا نعرف شنو خاصّنا نبنيو');
});

test('الأرضيّةُ تُقرأ مرّةً واحدةً في الشاشة وتصل الحَكَم', () => {
  const lh = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = lh.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /readGround\(q, u, r\.intent\)/,
    'الأرضيّةُ ما كتتقراش فـ`submit` — أو كتتقرا من تحليلٍ ثانٍ');
  // **تحليلٌ واحدٌ للجملة** (القاعدة ㉒): تُقرأ من `u` المحسوبة سلفًا.
  assert.equal((code.match(/readGround\(/g) || []).length, 1,
    'الأرضيّةُ كتتقرا مرّتين — قرارٌ على فهمٍ وعرضٌ على فهمٍ آخر');
  assert.match(code, /recordDecision\([^)]*ground\.ground\)/,
    'الأرضيّةُ ما كتوصلش `recordDecision` — القناةُ كتبقا ميّتة');
});

// **والمرآةُ تُعرَض فعلًا.** ثلاثةُ أسئلةٍ يسألها كلُّ مغربيٍّ يفتح التطبيق
//   لأوّل مرّة، وثلاثتُها كانت تُجاب بـ«شنو محتاج بالضبط؟».
test('المرآةُ مركّبةٌ في الشاشة الرئيسيّة', () => {
  const lh = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = lh.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /<Mirror[\s/>]/, 'المرآةُ مبنيّةٌ وما تركّباتش');
  assert.match(code, /ground\.ground === 'about_self'/, 'السؤالُ عن التطبيق ما كيوصلهاش');
  assert.match(code, /ground\.ground === 'stuck'/, '«مافهمتش» ما كيوصلهاش');
});

// **ولا رقمَ يُخترَع.** شرطُ صاحب المشروع حرفيًّا: «لا أريد الكذب أريد
//   الحقيقة… أعرف أنّ عدّة أشياء ستكون فارغة». فالصفرُ يُقال صفرًا، والأرقامُ
//   تأتي من الخادم أو لا تأتي.
test('أرقامُ المرآة حقيقيّةٌ — والصفرُ يُقال صفرًا', () => {
  const m = readFileSync(join(ROOT, 'src/components/Mirror.tsx'), 'utf8');
  const code = m.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(code, /fetch\('\/api\/listings\/public\/stats'\)/,
    'الأرقامُ ما كتجيش من الخادم — يعني مكتوبةٌ بيد');
  // ولا رقمَ مكتوبٌ في الكود يُعرَض كإحصاء: `<Num n={…}>` من الحالة وحدَها.
  const hardNum = [...code.matchAll(/<Num n=\{(\d+)\}/g)].map(x => x[1]);
  assert.deepEqual(hardNum, [], `رقمٌ مكتوبٌ بيدٍ يُعرَض كإحصاء: ${hardNum.join(' · ')}`);
  // والصفرُ له نصٌّ يقوله — لا شاشةٌ خاويةٌ تبدو عطبًا.
  assert.match(code, /s\.merchants === 0/, 'الصفرُ ما كيتقالش — الشاشةُ كتبان خاوية');
  // وحين تسقط الشبكةُ لا يُخترَع بديل.
  assert.match(code, /failed &&/, 'فشلُ الشبكة ما كيتقالش');
  // والقدراتُ تُقرأ من مصدرها لا تُكتَب هنا.
  assert.match(code, /ABILITIES\s*\n?\s*\.filter/, 'القدراتُ مكتوبةٌ بيد — قائمةٌ ثانية');
  assert.match(code, /a\.page &&/, 'قدرةٌ بلا بابٍ تُعرَض — وعدٌ ما كاينش');
});

// ============================================================
// **الفشلُ الصامت** — أسوأُ أنواع العطب، لأنّ الإنسانَ لا يبلّغ عنه.
//
//   عطبان قِيسا في جردِ المستودع، وكلاهما يقع على مستخدمٍ حقيقيٍّ في أوّل
//   جلسة. ومَن رأى تطبيقًا يقول شيئًا ويفعل غيرَه لا يبحث عن سببٍ ولا
//   يشتكي — **يكفّ عن الثقة ويخرج**. فلا يظهر في أيّ سجلّ.
// ============================================================

test('المحادثةُ تُحفَظ فعلًا، والفشلُ يُقال ويُرجَع عنه', () => {
  const src = readFileSync(join(ROOT, 'src/store.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  // ① التعديلُ كان يبدّل الحالةَ المحلّيّةَ **ولا ينادي الخادمَ أصلًا** —
  //    و`conversationsAPI.update` مبنيّةٌ والمسارُ مبنيّ. فمن أرشف محادثةً
  //    وجدها كما كانت بعد أوّل تحديث.
  const upd = (code.match(/const updateConversation = async[\s\S]*?\n  \};/) || [''])[0];
  assert.ok(upd, 'اختفت `updateConversation`');
  assert.match(upd, /conversationsAPI\.update\(/,
    'التعديلُ ما كيوصلش الخادمَ — كيتبدّل فالشاشة وحدَها ويرجع عند التحديث');

  // ② والحذفُ كان يبتلع فشلَ الخادم في `catch {}` فارغ.
  const del = (code.match(/const deleteConversation = async[\s\S]*?\n  \};/) || [''])[0];
  assert.ok(del, 'اختفت `deleteConversation`');
  assert.doesNotMatch(del, /catch\s*(\([^)]*\))?\s*\{\s*\}/,
    'رجع الابتلاعُ الصامت — كتختفي من الشاشة وترجع عند التحديث');

  // ③ **والرجوعُ شرطُ الصدق.** رسالةُ خطأٍ فوق شاشةٍ تعرض التغييرَ محفوظًا
  //    تناقضُ نفسَها، ويصدّق الإنسانُ عينَه لا الرسالة.
  for (const [name, fn] of [['التعديل', upd], ['الحذف', del]]) {
    assert.match(fn, /catch \(e: any\)/, `${name}: الفشلُ ما كيتقبضش`);
    assert.match(fn, /notify\('error'/, `${name}: الفشلُ ما كيتقالش`);
    assert.match(fn, /setState\([\s\S]{0,200}?before/, `${name}: ما كاينش رجوعٌ عن التفاؤل`);
  }
});

// **و«ما لقيناهش» ليست «ما قدرناش نشوفو».**
//
//   كان فشلُ الشبكة يُبتلَع ثمّ تُعرَض «ما لقيناش الطلب» — كذبةٌ توقِف
//   الإنسان: من سمع «ما كاينش» يتوقّف، ومن سمع «عاود» يعيد.
test('تتبّعُ الطلب يفرّق بين الغياب والعجز', () => {
  const src = readFileSync(join(ROOT, 'src/pages/Storefront.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const fn = (code.match(/const search=async\(\)=>\{[\s\S]*?\n  \};/) || [''])[0];
  assert.ok(fn, 'اختفت دالّةُ البحث');
  assert.doesNotMatch(fn, /catch\s*(\([^)]*\))?\s*\{\s*\}/, 'رجع ابتلاعُ فشلِ الشبكة');
  assert.match(fn, /setErr\(/, 'ما كاينش سببٌ يُقال');
  // و٤٠٤ تبقى «ما لقيناهش» حقًّا: هي جوابُ الخادم لا سقوطُه.
  assert.match(fn, /r\.status!==404/,
    'كلُّ فشلٍ صار «عجزًا» — و٤٠٤ جوابٌ صحيحٌ معناه أنّ الطلبَ ما كاينش');
  // ولا تُعرَض الرسالتان معًا: «ما لقيناش» تحت «ما قدرناش» تُناقضها.
  assert.match(code, /\{!err&&searched&&!singleOrder/,
    '«ما لقيناش» كتبان حتّى مع رسالةِ العجز — رسالتان متناقضتان');
});

// ============================================================
// **خريطةُ الروابط مصدرٌ واحد** — وإلّا عادت ثمانُ صفحاتٍ لا تفتح.
//
//   قِيس من شاشة صاحب المشروع مرّتَين: «صفحةُ الزيارة الميدانيّة لا تفتح،
//   يأخذك التطبيقُ إلى الصفحة الرئيسيّة». والسببُ خريطتان لشيءٍ واحد:
//   `PAGE_URLS` في `App.tsx` لكتابة العنوان، و`URL_TO_PAGE` في `store.tsx`
//   لقراءته عند الإقلاع. افترقتا — ٢٦ مدخلًا هناك و١٨ هنا.
//
//   فثمانُ صفحاتٍ يتغيّر عنوانُها ولا يعرفه المخزنُ فيسقط إلى `'home'`:
//   field-visit · moderation · bookings · services · insights · import ·
//   coupons · guide. **ثمانٍ، لا واحدة** — والعطبُ ظهر مرّةً واحدةً لأنّ
//   صاحبَ المشروع ضغط زرًّا واحدًا.
// ============================================================
test('خريطةُ الروابط تُكتَب مرّةً واحدةً ويقرؤها الاثنان', () => {
  const types = readFileSync(join(ROOT, 'src/types.ts'), 'utf8');
  assert.match(types, /export const PAGE_URLS: Record<Page, string>/,
    'الخريطةُ خرجت من `types.ts` — أو فقدت النوعَ الذي يفرض رابطًا لكلّ صفحة');
  assert.match(types, /export const URL_TO_PAGE[\s\S]{0,200}Object\.fromEntries/,
    'العكسُ صار مكتوبًا بيدٍ بدل أن يُشتقّ — نسختان تتباعدان');

  // **ولا خريطةَ ثانيةً في أيّ مكان.** النوعُ يمنع صفحةً بلا رابط، ولا يمنع
  //   أحدًا أن يكتب خريطةً موازيةً غدًا — وذاك ما وقع بالضبط.
  for (const f of ['src/App.tsx', 'src/store.tsx']) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /(const|let)\s+(PAGE_URLS|URL_TO_PAGE|URL_PAGES)\s*(:[^=]*)?=\s*\{/,
      `${f}: رجعت خريطةٌ مكتوبةٌ بيد — ثمانُ صفحاتٍ غادي تكفّ عن الفتح`);
    assert.match(code, /from '\.\/types'/, `${f}: ما كيقراش الخريطةَ من مصدرها`);
  }

  // وكلُّ صفحةٍ مُعلَنةٍ لها رابط — يُقاس لا يُفترَض.
  const ids = (types.match(/export const PAGE_IDS = \[[\s\S]*?\] as const;/) || [''])[0];
  const urls = (types.match(/export const PAGE_URLS: Record<Page, string> = \{[\s\S]*?\n\};/) || [''])[0];
  const listed = [...ids.matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  assert.ok(listed.length >= 20, `ما تقرّاتش الصفحاتُ (${listed.length})`);
  const missing = listed.filter(p => !new RegExp(`'?${p}'?:\\s*'/`).test(urls));
  assert.deepEqual(missing, [], `صفحاتٌ بلا رابطٍ — كتسقط للرئيسيّة: ${missing.join(' · ')}`);

  // ── **ورابطٌ بلا مسارٍ في الراوتر أسوأُ من صفحةٍ بلا رابط** ──────
  //
  //   هذا الحارسُ كان يفحص نصفَ السلسلة فقط، فمرّ العطبُ من نصفِه الآخر:
  //   أضفتُ `'field-visit': '/field-visit'` إلى `PAGE_URLS` — **وقائمةُ
  //   المسارات في `App.tsx` كانت مكتوبةً بأصابعَ ولم تُحدَّث**. فصار
  //   للصفحة رابطٌ لا يطابق أيَّ `<Route>`، فتقع على `*` ⇒ `/home`.
  //
  //   وهو ما وصفه صاحبُ المشروع ثلاثَ مرّات: «تظهر وتختفي وتعيدني
  //   للرئيسيّة». والوميضُ هو الصفحةُ تُرسَم لحظةً قبل أن يهبط التحويل.
  //   وقُيس في متصفّحٍ حقيقيّ: `/field-visit → /field-visit → /home`.
  //
  //   فلا تُفحَص الأسماءُ واحدًا واحدًا — يُفحَص **أنّ القائمةَ مُشتقّة**،
  //   لأنّ قائمةً مكتوبةً بيدٍ ستفترق يومًا مهما صحّت اليوم.
  const app = readFileSync(join(ROOT, 'src/App.tsx'), 'utf8');
  const appCode = app.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(appCode, /\{Object\.values\(PAGE_URLS\)\.map\(path =>/,
    'مساراتُ الراوتر ما بقاتش مُشتقّةً من `PAGE_URLS` — رجع رابطٌ بلا مسارٍ يسقط للرئيسيّة');
  assert.doesNotMatch(appCode, /\{\['\/home',/,
    'رجعت قائمةُ مساراتٍ مكتوبةٌ بيد — قائمتان لشيءٍ واحدٍ تفترقان');
});

// **ولا يُعرَض مُعرِّفٌ لاتينيٌّ لإنسان** — القانون العاشر.
//
//   رآه صاحبُ المشروع في أوّل شاشةٍ يراها مغربيّ: «فهمت أنّك بغيتي
//   **restaurant**». والاسمُ العربيُّ («مطعم») مكتوبٌ في قاعدة المعرفة منذ
//   زمن؛ لم يُقرأ فحسب. ومُعرِّفٌ لاتينيٌّ في وجه من يكتب بالدارجة ليس عطبَ
//   ترجمة — هو إعلانٌ أنّ التطبيق لم يُبنَ له.
test('صفحةُ الدخول تقول اسمَ المفهوم بالعربيّة لا مُعرِّفَه', () => {
  const src = readFileSync(join(ROOT, 'src/pages/AuthPage.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /\{need\.service \|\| need\.text\}/,
    'رجع عرضُ المُعرِّف الخامّ — «restaurant» فوجه مغربيّ');
  assert.match(code, /\{sayNeed\(need\)\}/, 'ما كيمرّش على مترجم الاسم');
  const fn = (code.match(/function sayNeed\([\s\S]*?\n\}/) || [''])[0];
  assert.ok(fn, 'اختفت `sayNeed`');
  assert.match(fn, /CONCEPTS as any\[\]\)\.find/, 'الاسمُ ما كيتقراش من المعرفة');
  assert.match(fn, /concept\?\.ar/, 'ما كياخدش الاسمَ العربيّ');
  // ومُعرِّفٌ غيرُ معروفٍ لا يُعرَض: كلامُ الإنسان أصدقُ من رمزٍ لا يفهمه.
  assert.match(fn, /\/\^\[a-z0-9_\]\+\$\/i\.test\(id\)/,
    'مُعرِّفٌ مجهولٌ كيتعرض كما هو — نفسُ العطب بشكلٍ آخر');
});

// ============================================================
// **الفهمُ يعبر مع الإنسان إلى السوق** — وإلّا فهو زينةٌ على الشاشة.
//
//   رآه صاحبُ المشروع في لقطتَين متتاليتَين: كتب «بغيت شي كسوة لبنتي أنا
//   فكازة»، فقرأ التطبيقُ `ملابس الأطفال` بيقين ٨٠٪ و«الدار البيضاء»،
//   **وعرضهما على الشاشة**، ثمّ ساقه إلى السوق بـ`q=<الجملة الخامّة>`.
//
//   فقال السوقُ «ما لقّيناش» — **وفي المتجر «حوايج دراري صغار» بـ٦٥ درهمًا**.
//
//   و`GET /api/search` يقبل `terms` منذ زمنٍ ومكتوبٌ فوقه «مرادفاتُ المفهوم
//   كما وسّعتها الواجهة»، و`engines/search` يقرؤها ويوسّع بها — وقِيس أنّ
//   **صفرَ مُرسِلين** في `src` كلِّه. طبقةٌ مبنيّةٌ من طرفَيها لا يمرّ فيها شيء.
//
//   وهذا **أسوأُ من ألّا يفهم**: الفهمُ ظهر فوثق به الإنسان، ثمّ جاءت النتيجةُ
//   فارغةً — فيستنتج أنّ السوقَ خاوٍ لا أنّ البحثَ أخطأ. ويخرج.
// ============================================================
test('المفهومُ المقروءُ يُرسَل إلى بحث السوق — لا الجملةُ الخامّةُ وحدَها', () => {
  const lh = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = lh.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const blk = (code.match(/if \(url\.startsWith\('\/market'\)[\s\S]*?\n      \}/) || [''])[0];
  assert.ok(blk, 'اختفت كتلةُ الانتقال للسوق');
  // ── ولا تُبنى السلسلةُ بيدٍ بعد اليوم ──────────────────────────
  //   كانت `q` و`terms` تُخاطان هنا حرفًا حرفًا، فسقفُ الثمن وحالُ السلعة
  //   والفئةُ — مقروءةٌ كلُّها ولا تركب. العقدُ الواحد (`toSearchParams`
  //   فوق `expandQuery`) يحملها جميعًا، **وما يحمله مُثبَتٌ سلوكًا** في
  //   `test/brain/searchContract.test.ts` لا بمطابقة نصٍّ هنا.
  assert.match(blk, /toSearchParams\(expandQuery\(/,
    'رجع بناءُ السلسلة بيدٍ — كلُّ بابٍ ينسى حقلًا غيرَ الذي ينساه الآخر');
  assert.doesNotMatch(blk, /terms=/, 'كُتبت «terms» بيدٍ — نسختان من العقد تتباعدان');
  // ولا تحليلَ ثانٍ للنصّ هنا (القاعدة ㉒): يُقرأ من التحليل المحفوظ.
  assert.doesNotMatch(blk, /understand\(/, 'تحليلٌ ثانٍ للجملة — قرارٌ على فهمٍ وبحثٌ على فهمٍ آخر');
  assert.match(blk, /lastU\?\.service/, 'المفهومُ ما كيتقراش من التحليل المحفوظ');

  // والموسِّعُ يقرأ من المعرفة ولا يكتب قائمةً ثانية.
  const kn = readFileSync(join(ROOT, 'src/lib/akg/kb/knowledge.ts'), 'utf8');
  const fn = (kn.match(/export function conceptTerms[\s\S]*?\n\}/) || [''])[0];
  assert.ok(fn, 'اختفى `conceptTerms`');
  assert.match(fn, /CONCEPTS as any\[\]\)\.find/, 'المرادفاتُ مكتوبةٌ بيد — قائمةٌ ثانية');
  assert.match(fn, /variants/, 'ما كياخدش متغيّراتِ المفهوم');
  // والأقصرُ أوّلًا: «كسوة» تطابق أكثرَ من «ملابس أطفال حديثي الولادة».
  assert.match(fn, /sort\(\(a, b\) => a\.length - b\.length\)/,
    'ما بقاش الأقصرُ أوّلًا — الحدُّ الأعلى غادي ياكل المصطلحاتِ المفيدة');
});

// ============================================================
// **المحادثةُ سجلٌّ يُلحَق به، لا حقلٌ يُستبدَل.**
//
//   `LivingHome` تحتفظ بـ`turns` وتعرضها للإنسان — وكان كلُّ سؤالٍ جديدٍ
//   يُسندها من جديد، فتُمحى المحادثةُ التي على الشاشة. ويُمرَّر إلى الفهم
//   `[q]`: الجملةُ الحاضرةُ وحدَها، بينما الأنبوبُ من طرفَيه يقبل ستًّا.
//
//   وقيس الأمران في المتصفّح قبل الإصلاح وبعده:
//     قبل: الأولى ما بقاتش · recentMessages=["لا، ديال المحل"] عددُها ١
//     بعد: الثلاثةُ ظاهرةٌ · recentMessages=[الأولى, الثانية, الثالثة]
//
//   فهذان السطران يُحرَسان — لأنّ رجوعَ أحدِهما لا يكسر بناءً ولا اختبارَ
//   نوع، ويُرى فقط في محادثةٍ حقيقيّةٍ من ثلاث جملٍ لا يمشيها أحدٌ كلَّ يوم.
// ============================================================
test('المحادثةُ تُلحَق ولا تُسنَد، والسياقُ يُمرَّر لا الجملةُ وحدَها', () => {
  const src = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  assert.doesNotMatch(code, /recentMessages:\s*\[q\]/,
    'رجع تمريرُ الجملة الحاضرة وحدَها — «فالرباط» بعد «بغيت سبّاك» غادي تُقرأ معزولةً، والمحادثةُ بلا سياقٍ ليست محادثة');
  assert.match(code, /recentMessages:\s*\[\.\.\.turns\.filter\(t => t\.who === 'user'\)/,
    'ما بقاش السياقُ يُقرأ من `turns` — أو دخلت أدوارُ النظام، و`_recentHistory` كيسمّيها كلَّها كلامَ الإنسان');

  // والإسنادُ المباشرُ يمحو ما قبله؛ والتحديثُ الدالّيُّ لا يخسر دورًا.
  const setTurns = [...code.matchAll(/setTurns\(([^)]*)/g)].map(m => m[1].trim());
  assert.ok(setTurns.length >= 2, `ما لقيتش نداءاتِ setTurns (${setTurns.length}) — تغيّر اسمُ السجلّ والحارسُ كيقيس فراغًا`);
  for (const arg of setTurns) {
    // `setTurns([])` وحدَه إسنادٌ مشروع: هو التصفيرُ في «من جديد».
    if (/^\[\s*\]/.test(arg)) continue;
    assert.match(arg, /^t =>|^\(t\) =>|^prev =>/,
      `إسنادٌ مباشرٌ للسجلّ (\`setTurns(${arg.slice(0, 40)}…\`) — كيمحي المحادثةَ اللي فالشاشة`);
  }

  // و«من جديد» يبقى تصفيرًا حقيقيًّا — وإلّا سرّبت المحادثةُ القديمةُ سياقَها.
  assert.match(code, /setTurns\(\[\]\)/,
    'ما بقاش «من جديد» كيصفّر السجلَّ — السياقُ القديم غادي يمشي مع السؤال الجديد');
});

// ============================================================
// **بابٌ واحدٌ إلى سجلّ المحادثة.**
//
//   نسي مساران أن يكتبا فيه، وكلاهما قيس في المتصفّح:
//     `fixNow`      كتب الإنسانُ «خضّار» تصحيحًا ⇒ `recentMessages` بقي
//                   `["خاصني سبّاك", …]`. الذاكرةُ تحمل ما صُحِّح ولا التصحيح.
//     `FocusedEdit` حُفظ «حانوت النخلة» ⇒ لا أثرَ إطلاقًا.
//
//   والسببُ بنيويٌّ لا سهو: `setTurns` يُنادى من مواضعَ متفرّقةٍ في ملفٍّ من
//   ألفِ سطر، فكلُّ مسارٍ جديدٍ عليه أن **يتذكّر**. ومن يعتمد على التذكّر
//   ينسى — مرّتَين حتّى الآن، وثالثةً مع أوّلِ مسارٍ يُضاف.
//
//   فيُحرَس البابُ لا الحالات: `record()` وحدَها تكتب، و«من جديد» وحدَه يصفّر.
// ============================================================
test('سجلُّ المحادثة له بابٌ واحد: `record()`', () => {
  const src = readFileSync(join(ROOT, 'src/pages/LivingHome.tsx'), 'utf8');
  const code = src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  assert.match(code, /const record = \(\.\.\.entries: Turn\[\]\) =>/,
    'اختفى `record` — رجع كلُّ مسارٍ يكتب فالسجلّ بيده، والنسيانُ يعود معه');

  // كلُّ `setTurns` خارجَ `record` عطبٌ — عدا التصفير في «من جديد».
  const calls = [...code.matchAll(/setTurns\(([^)]*)/g)].map(m => m[1].trim());
  const outside = calls.filter(a => !/^\[\s*\]/.test(a) && !/^t => \[\.\.\.t, \.\.\.clean\]/.test(a));
  assert.equal(outside.length, 0,
    `كتابةٌ فالسجلّ خارج \`record\`: ${outside.map(a => a.slice(0, 40)).join(' · ')} — هاد بالضبط هو الباب اللي كينسى منّو المسارُ الجديد`);

  // والمسارات الثلاثة تكتب فعلًا — حارسٌ لا يعدّ النداءات يمرّ على صفر.
  const uses = (code.match(/\brecord\(/g) || []).length;
  assert.ok(uses >= 4,
    `\`record\` مُنادًى ${uses} مرّاتٍ فقط — المسارات: الجملة · ملءُ الفراغ · جوابُ الاستيضاح · التصحيح`);

  // والتصحيحُ يدخل السياق — وهو الذي قيس غائبًا.
  const fix = (code.match(/const fixNow = \(\) => \{[\s\S]*?\n  \};/) || [''])[0];
  assert.ok(fix, 'اختفى `fixNow`');
  assert.match(fix, /record\(\{ who: 'user', text: fixText\.trim\(\) \}/,
    'التصحيحُ ما بقاش كيدخل المحادثة — الذاكرةُ غادي تبقى حاملةً ما صُحِّح ولا تحمل التصحيح');
  // ولا يُنفَّذ به شيء: تسجيلٌ قولًا، لا حَكَمَ ولا وجهة.
  assert.doesNotMatch(fix, /submit\(|applyVerdict\(|setPage\(/,
    'التصحيحُ صار ينفّذ فعلًا — الذاكرةُ تعين على الفهم وليست إذنًا');
});

// ============================================================
// **قائمتان للنقص، فتكذب إحداهما.**
//
//   `unmetNeeds` مُصنَّفةٌ وتحترم `u.amount` (`price: said`)، و`u.action.needs`
//   نصٌّ حرٌّ لا يعرفه. فقيس: «بدّل الثمن ديال هاد المنتوج» ⇒ خانةُ «بشحال؟»
//   ⇒ يكتب **179** ⇒ `amount = 179` **والحَكَمُ ما زال يقول «ينقص: بشحال؟»**
//   ⇒ `ask` ⇒ `clarify` ⇒ `fillSlot` يخرج صامتًا: الثمنُ ١٢٠ كما كان، بلا
//   رسالةِ فشل. **طلبنا معلومةً، أعطاها الإنسانُ، فاختفت.**
// ============================================================
test('ما أجابه الإنسانُ لا يُسأل عنه ثانيةً — القائمتان تُطرحان معًا', () => {
  const src = readFileSync(join(ROOT, 'src/lib/executionPolicy.ts'), 'utf8');
  assert.match(src, /function amountAnswers\(need: string, u: Understanding\): boolean/,
    'اختفى طرحُ الحاجة المُجابة — رجع «بشحال؟» يُسأل بعد أن قال الإنسانُ الرقم');
  assert.match(src, /u\.amount != null && \/[^/]*شحال[^/]*\/\.test\(need\)/,
    'الطرحُ ما بقاش مربوطًا بـ`u.amount` — فيصير يطرح حاجةً لم يُجَب عنها');
  // ويُطبَّق في **الفرعَين** — فرعٌ واحدٌ يترك نصفَ العطب حيًّا.
  const hits = (src.match(/!amountAnswers\(n, u\)/g) || []).length;
  assert.equal(hits, 2,
    `الطرحُ مطبَّقٌ ف${hits} فرعٍ لا فرعَين — القائمةُ الحرّةُ تُقرأ من موضعَين`);
});

// ============================================================
// **نقرتان على زرٍّ واحدٍ ⇒ طلبٌ واحد — والواجهةُ هي التي تُعلن المحاولة.**   [SOURCE_SHAPE]
//
//   الخادمُ يحرس بفهرسٍ فريدٍ على `(user_id, idempotency_key)`، لكنّ الحارسَ
//   **لا يعمل بلا مفتاح**: الفهرسُ جزئيٌّ فيتخطّى الصفوفَ بلا مفتاح، فتمرّ
//   كلُّ نقرةٍ صفًّا. أي أنّ نزعَ سطرٍ واحدٍ من الواجهة يُطفئ الحمايةَ كلَّها
//   بينما تبقى كلُّ اختبارات الخادم خضراء — وهذا بالضبط صنفُ «المبنيِّ
//   غيرِ الموصول» الذي تكرّر هنا.
//
//   وهذا حارسُ شكلٍ لا سلوك: البرهانُ السلوكيُّ هو رحلةُ Chromium (نقرتان
//   ⇒ طلبٌ واحد). يُقرأان معًا، ولا يُقبَل هذا وحدَه.
// ============================================================
test('كلُّ مسارِ إنشاءِ طلبٍ في الواجهة يُعلن مفتاحَ محاولة', () => {
  const key = readFileSync(join(ROOT, 'src/lib/attemptKey.ts'), 'utf8');
  // المفتاحُ يُولَد مرّةً ويثبت: لو وُلد مع كلّ نداءٍ لصارت الحمايةُ صفرًا
  //   بينما كلُّ شيءٍ يبدو موصولًا.
  assert.match(key, /const keys = new Map<string, string>\(\)/,
    'اختفى مخزنُ المحاولات — مفتاحٌ جديدٌ مع كلّ نقرةٍ لا يحمي من شيء');
  assert.match(key, /export function endAttempt/,
    'اختفى إنهاءُ المحاولة — مفتاحٌ لا يُطوى يمنع الطلبَ الثانيَ المشروع');

  const store = readFileSync(join(ROOT, 'src/store.tsx'), 'utf8');
  assert.match(store, /ordersAPI\.create\(\{ \.\.\.o, idempotencyKey: attemptKey\('dashboard-order'\) \}\)/,
    'لوحةُ التاجر ترسل طلبًا بلا مفتاحِ محاولة — نقرتان ⇒ طلبان');
  assert.match(store, /endAttempt\('dashboard-order'\)/,
    'المفتاحُ لا يُطوى بعد النجاح — الطلبُ التالي يُردّ بتعارض');

  const sf = readFileSync(join(ROOT, 'src/pages/Storefront.tsx'), 'utf8');
  // كلُّ نداءٍ لـ`/api/orders/public` يحمل الرأس — لا بعضُها.
  const calls = [...sf.matchAll(/fetch\('\/api\/orders\/public',\s*\{[\s\S]{0,220}?\}/g)].map(m => m[0]);
  assert.ok(calls.length >= 2, `مساراتُ إنشاءِ الطلبِ العامّة ${calls.length} — تُوقَّع اثنان: السلّة والخدمة`);
  const bare = calls.filter(c => !/'Idempotency-Key':\s*attemptKey\(/.test(c));
  assert.equal(bare.length, 0,
    `${bare.length} مسارَ إنشاءِ طلبٍ بلا رأسِ المحاولة — الفهرسُ الجزئيُّ يتخطّاه فيمرّ كلُّ ضغطٍ صفًّا`);
  assert.match(sf, /endAttempt\('storefront-checkout'\)/,
    'سلّةُ المتجر لا تُنهي المحاولةَ بعد النجاح — الشراءُ الثاني يُردّ');
});
