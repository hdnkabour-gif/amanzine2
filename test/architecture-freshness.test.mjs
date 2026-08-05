import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// طزاجةُ قاعدة المعرفة المعماريّة (REPORTS/).
//
//   وثيقةٌ معماريّةٌ تتقادم بصمتٍ أسوأُ من غيابها: تُقرأ فيُبنى عليها قرارٌ
//   خاطئ. هذا الملفُّ يجعل التقادمَ **يُسقط البناء**.
//
//   وهو لا يعدّ فقط. العدُّ يمسك الإضافةَ والحذفَ ولا يمسك **تبدّلَ
//   الملكيّة**: مسارٌ يُنقل منطقُه إلى محرّكٍ آخر يُبقي العددَ ثابتًا ويجعل
//   `RESPONSIBILITY_GRAPH` كذبًا. لذلك نثبّت **الحقائقَ المُدّعاة نصًّا**:
//   مُعرِّفاتُ المحرّكات · مُعرِّفاتُ مزوّدي التوصيل · المساراتُ المركَّبة ·
//   الملفّاتُ التي تُسمّى مالكةً لمسؤوليّة.
//
//   إن سقط: **حدِّث التقرير، لا الاختبار.**
// ============================================================

const ROOT = path.join(import.meta.dirname, '..');
const REPORTS = path.join(ROOT, 'REPORTS');
const read = (p) => fs.readFileSync(p, 'utf8');
const readReport = (name) => read(path.join(REPORTS, name));

const REQUIRED = [
  'KNOWLEDGE_INDEX.md', 'PROJECT_MAP.md', 'ARCHITECTURE.md', 'CALL_GRAPH.md',
  'RESPONSIBILITY_GRAPH.md', 'SYSTEM_CATALOG.md', 'ARCHITECTURE_DECISIONS.md',
  'BROKEN_CHAINS.md', 'UNKNOWN_AREAS.md',
];

// أرقامٌ عربيّةٌ شرقيّة → غربيّة، كي تُقارَن الأعدادُ المكتوبةُ في التقارير.
const ar2en = (s) => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const ALL_REPORTS = () => REQUIRED.map(readReport).map(ar2en).join('\n');

test('كلُّ ملفّات قاعدة المعرفة موجودة', () => {
  for (const f of REQUIRED) {
    assert.ok(fs.existsSync(path.join(REPORTS, f)), `ناقص: REPORTS/${f}`);
  }
});

test('كلُّ محرّكٍ في الخادم مذكورٌ في قاعدة المعرفة', () => {
  const dir = path.join(ROOT, 'server', 'lib', 'engines');
  const ids = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
  const text = ALL_REPORTS();
  const missing = ids.filter(id => !text.includes(`engines/${id}`));
  assert.deepEqual(missing, [], `محرّكاتٌ غيرُ موثَّقة: ${missing.join(' · ')}`);
});

test('كلُّ مزوّدِ توصيلٍ ووسيلةٍ مذكورٌ باسمه', () => {
  const base = path.join(ROOT, 'server', 'services', 'delivery');
  const ids = [
    ...fs.readdirSync(path.join(base, 'providers')).map(f => f.replace('.provider.js', '')),
    ...fs.readdirSync(path.join(base, 'adapters')).map(f => f.replace('.adapter.js', '')),
  ];
  const text = ALL_REPORTS().toLowerCase();
  const missing = ids.filter(id => !text.includes(id.toLowerCase()));
  assert.deepEqual(missing, [], `مزوّدون غيرُ موثَّقين: ${missing.join(' · ')}`);
});

test('كلُّ مسارٍ مركَّبٍ في index.js مذكورٌ في قاعدة المعرفة', () => {
  const idx = read(path.join(ROOT, 'server', 'index.js'));
  const mounted = [...idx.matchAll(/app\.use\('\/api\/([a-z-]+)'[^)]*require\('\.\/routes\//g)].map(m => m[1]);
  assert.ok(mounted.length >= 25, `لم تُقرأ المساراتُ المركَّبة (${mounted.length})`);
  const text = ALL_REPORTS();
  const missing = [...new Set(mounted)].filter(r => !text.includes(`/api/${r}`) && !text.includes(`routes/${r}.js`));
  assert.deepEqual(missing, [], `مساراتٌ غيرُ موثَّقة: ${missing.join(' · ')}`);
});

test('كلُّ ملفٍّ يُسمّى مالكًا في التقارير موجودٌ فعلًا', () => {
  // أيُّ `server/…` أو `src/…` مكتوبٌ بين علامتَي شفرةٍ هو ادّعاءُ ملكيّة.
  const text = REQUIRED.map(readReport).join('\n');
  const claimed = [...new Set(
    [...text.matchAll(/`((?:server|src|test)\/[A-Za-z0-9_./-]+\.(?:js|ts|tsx|mjs|json))`/g)].map(m => m[1])
  )];
  assert.ok(claimed.length >= 30, `ادّعاءاتُ ملكيّةٍ قليلة (${claimed.length}) — هل تغيّرت صيغةُ التقارير؟`);
  const ghosts = claimed.filter(f => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(ghosts, [], `ملفّاتٌ مذكورةٌ ولا وجودَ لها: ${ghosts.join(' · ')}`);
});

test('الأعدادُ المُعلَنة تطابق الواقع (صفحات · مكوّنات · مسارات · محرّكات)', () => {
  const count = (dir, ext) => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith(ext)).length;
  const facts = {
    'صفحات': count('src/pages', '.tsx'),
    'مكوّنات': count('src/components', '.tsx'),
    'مسارات': count('server/routes', '.js'),
    'محرّكات': count('server/lib/engines', '.js'),
  };
  const map = ar2en(readReport('PROJECT_MAP.md'));
  for (const [label, n] of Object.entries(facts)) {
    assert.ok(map.includes(String(n)),
      `PROJECT_MAP لا يذكر العددَ الصحيح لـ${label} (${n})`);
  }
});

test('لا مزوّدَ توصيلٍ يُذكَر خارج ملفّه في الكود — قيدٌ يحرسه التقرير أيضًا', () => {
  // التقاريرُ **تُسمّي** الشركاتِ عمدًا (توثيق)، فالقيدُ يخصّ الكودَ وحدَه.
  // نتحقّق أنّ التقريرَ لم يَعِد بقيدٍ زال من الاختبارات.
  const arch = readReport('ARCHITECTURE.md');
  assert.ok(arch.includes('architecture') && arch.includes('constitution'),
    'ARCHITECTURE لا يذكر الحرّاس المُنفَّذين');
  const guards = read(path.join(ROOT, 'test', 'architecture.test.mjs'));
  assert.ok(/لا مقارنةَ بمُعرِّف شركةِ توصيل/.test(guards),
    'التقريرُ يَعِد بقيدٍ لم يعد موجودًا في test/architecture.test.mjs');
});

test('السلاسلُ المقطوعة كلُّها ذاتُ شدّةٍ وثقة', () => {
  const bc = readReport('BROKEN_CHAINS.md');
  const sections = bc.split(/^## /m).slice(2); // بعد العنوان والملخّص
  assert.ok(sections.length >= 8, `سلاسلُ قليلةٌ موثَّقة (${sections.length})`);
  for (const s of sections) {
    const title = s.split('\n')[0].trim();
    if (title.startsWith('سلاسلُ فُحصت')) continue;
    assert.ok(/CRITICAL|HIGH|MEDIUM|LOW/.test(s), `«${title}»: بلا شدّة`);
    assert.ok(/الثقة/.test(s), `«${title}»: بلا ثقة`);
  }
});

// ── خريطةُ المجال تبقى صادقة ──────────────────────────────────
// وثيقةٌ تصف الكودَ تكذب متى تغيّر الكود. هذه الحرّاسُ تُبقيها صادقةً أو
// تُسقط البناء — لأنّ محرّكَين يعملان هنا، ووثيقةٌ كاذبةٌ أسوأُ من غيابها.
test('خريطةُ المجال موجودةٌ وتحمل قراراتِها', () => {
  const p = path.join(ROOT, 'docs', 'DOMAIN_MAP.md');
  assert.ok(fs.existsSync(p), 'ناقص: docs/DOMAIN_MAP.md');
  const doc = read(p);
  for (const k of ['ق-١', 'ق-٢', 'ق-٣', 'ق-٤', 'ق-٥', 'ق-٦', 'ق-٧', 'ق-٨', 'ق-٩']) {
    assert.ok(doc.includes(k), `قرارٌ مفقود: ${k}`);
  }
});

test('ادّعاءُ «تعدّدُ الأنشطة مسموح» ما زال صحيحًا', () => {
  // الوثيقةُ تبني عليه القرارَ ق-١ كلَّه. قيدُ تفرّدٍ يُضاف غدًا يجعلها كاذبة.
  const mig = read(path.join(ROOT, 'server', 'migrate.js'));
  assert.ok(!/UNIQUE[^\n]*providers\s*\(\s*user_id/i.test(mig),
    'أُضيف قيدُ تفرّدٍ على providers(user_id) — يسقط أساسُ ق-١ في DOMAIN_MAP');
});

test('فخُّ `orders.provider_id` ما زال قائمًا كما تصفه الوثيقة', () => {
  // إن صار يومًا يشير إلى جدول providers، يجب أن تُحدَّث الوثيقةُ لا أن تبقى.
  const doc = read(path.join(ROOT, 'docs', 'DOMAIN_MAP.md'));
  const del = read(path.join(ROOT, 'server', 'routes', 'delivery.js'));
  const stillDelivery = /providerId:\s*plugin\.meta\.id/.test(del);
  assert.ok(doc.includes('delivery_provider_key'), 'الوثيقةُ لا تذكر إعادةَ التسمية المقترحة');
  assert.ok(stillDelivery,
    '`orders.provider_id` لم يعد يُملأ من مزوّد التوصيل — حدِّث DOMAIN_MAP ③');
});

// ── مبادئُ التجربة تبقى صادقة ─────────────────────────────────
// مبدأٌ بلا حارسٍ يتعفّن. والوثيقةُ تُصنّف مبادئَها بصراحة (محروس/مقيس/ذوق)
// — فهذه الحرّاسُ تتحقّق أنّ ما ادُّعي **محروسًا** له حارسٌ فعلًا.
test('مبادئُ التجربة موجودةٌ ومصنَّفةٌ بلا ادّعاء', () => {
  const p = path.join(ROOT, 'docs', 'EXPERIENCE_PRINCIPLES.md');
  assert.ok(fs.existsSync(p), 'ناقص: docs/EXPERIENCE_PRINCIPLES.md');
  const doc = read(p);
  for (const tag of ['🛡️', '📏', '🎨']) {
    assert.ok(doc.includes(tag), `تصنيفٌ مفقود: ${tag}`);
  }
  // مبدأٌ بلا وسمٍ يعني ادّعاءً بلا موضع. كلُّ عنوانٍ يحمل واحدًا.
  const heads = doc.split('\n').filter(l => /^## [٠-٩0-9]+ · /.test(l));
  assert.ok(heads.length >= 10, `مبادئُ قليلة (${heads.length})`);
  for (const h of heads) {
    assert.ok(/🛡️|📏|🎨/.test(h), `مبدأٌ بلا تصنيف: ${h}`);
  }
});

test('كلُّ مبدأٍ موسومٍ «محروس» له حارسٌ فعليّ', () => {
  // الادّعاءُ الأخطر: أن يُكتب «محروس» ولا حارسَ — فيُطمأنّ إلى ما لا يحرسه أحد.
  const guards = {
    'لا يوجد نوعُ حساب':          () => !/req\.user\.role\s*===/.test(read(path.join(ROOT, 'server', 'routes', 'orders.js'))),
    'يُسأل الإنسانُ ولا يُخمَّن له': () => fs.existsSync(path.join(ROOT, 'src', 'lib', 'akg', 'kb', 'ambiguity.ts')),
    'لا يبتلع العامُّ الخاصّ':      () => /isJunkVariant/.test(read(path.join(ROOT, 'src', 'lib', 'akg', 'kb', 'knowledge.ts'))),
    'حين لا نسأل، نقول لماذا':     () => /explainFilled/.test(read(path.join(ROOT, 'src', 'lib', 'knownContext.ts'))),
    'ما لا يُسترجَع يُؤكَّد':        () => /لا يُسترجَع/.test(read(path.join(ROOT, 'src', 'lib', 'akg', 'kb', 'actions.ts'))),
  };
  for (const [name, ok] of Object.entries(guards)) {
    assert.ok(ok(), `مبدأٌ موسومٌ «محروس» بلا حارس: ${name}`);
  }
});

test('الذاكرةُ لا تُعاند صاحبَها — المبدأ ٤ محروسٌ فعلًا', () => {
  const kc = read(path.join(ROOT, 'src', 'lib', 'knownContext.ts'));
  assert.ok(/if \(!out\.place && known\.city\)/.test(kc),
    'الذاكرةُ صارت تغلب الجملةَ الحاضرة — يسقط المبدأ ٤');
});
