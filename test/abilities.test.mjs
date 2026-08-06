import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================
// حارسُ كتالوج القدرات — **يقرأ الكودَ لا الكتالوج**.
//
//   القائمةُ مكتوبةٌ بيد (وهي معرفةٌ لا تُشتقّ)، لكنّ **اكتمالَها** لا يجوز
//   أن يكون بيد أحد. فقائمةٌ مغلقةٌ كاذبةٌ أسوأُ من مفتوحة: يُبنى عليها
//   حدُّ القدرة وعتباتُ التنفيذ وسؤالُ «تعديلَ ماذا؟» — فتكذب كلُّها معًا.
//
//   ولذلك يمسح هذا الملفّ **المصدر** (مسارات الخادم · `PAGE_IDS`) ويقارن.
//   فأيُّ مسارٍ جديدٍ أو صفحةٍ جديدةٍ يكسر البناءَ حتّى تُعلَن قدرتُها.
//
//   وهذا بالضبط ما لم يكن موجودًا: سبعُ قدراتٍ تعمل على الخادم بلا باب،
//   وطبقةُ تنفيذٍ كاملةٌ بلا وصل — لأنّ لا شيءَ كان يُلزم بشيء.
// ============================================================

const ROOT = new URL('..', import.meta.url).pathname;
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// نقرأ الكتالوجَ نصًّا: الاختبارُ `.mjs` والمصدرُ TypeScript، ولا نريد
// خطوةَ بناءٍ لحارسٍ يجب أن يعمل دائمًا وبأرخص ثمن.
const CAT = src('src/lib/abilities.ts');
const idOf = (block) => (block.match(/id: '([A-Z_]+)'/) || [])[1];
const ABILITIES = CAT.split(/\n  \{ id: /).slice(1).map(b => ({
  raw: '{ id: ' + b,
  id: idOf('{ id: ' + b),
  page: (b.match(/page: (?:'([\w-]+)'|null)/) || [])[1] ?? null,
  api: (b.match(/api: (?:'([^']+)'|null)/) || [])[1] ?? null,
  risk: (b.match(/risk: '(\w+)'/) || [])[1],
  verb: (b.match(/verb: '(\w+)'/) || [])[1],
  entity: (b.match(/entity: '(\w+)'/) || [])[1],
  say: (b.match(/say: '([^']*)'/) || [])[1],
  needs: (b.match(/needs: \[([^\]]*)\]/) || [])[1] ?? '',
  auth: /auth: true/.test(b),
}));

test('الكتالوجُ يُقرأ أصلًا', () => {
  assert.ok(ABILITIES.length >= 30, `قُرئت ${ABILITIES.length} قدرةً فقط — تغيّرت صيغةُ الملفّ والحارسُ صار أعمى`);
  assert.ok(ABILITIES.every(a => a.id), 'قدرةٌ بلا مُعرِّف');
});

// ── ① كلُّ مسارٍ في الخادم مُعلَنٌ قدرةً ────────────────────────
test('لا مسارَ خادمٍ خارجَ الكتالوج', () => {
  const idx = src('server/index.js');
  const mounted = new Set();
  for (const m of idx.matchAll(/app\.use\(\s*'(\/api\/[^']*)'[^)]*require\('\.\/routes\/[\w-]+'\)/g)) {
    mounted.add(m[1].replace(/\/$/, ''));
  }
  // مساراتٌ لا يستدعيها إنسانٌ من التطبيق — تُستثنى بسببٍ مكتوب، لا بصمت.
  const EXTERNAL = new Set([
    '/api/webhooks',   // تستدعيها شركاتُ التوصيل ومِتا، لا المستخدم
    // مصرفُ قياسٍ داخليّ: أحداثُ مشاهدةٍ ونقرٍ تبعثها الواجهةُ من نفسها
    // (`journey.ts`). ليست قدرةً يطلبها إنسان، ولا يجوز أن تُعلَن كذلك —
    // فقد أشارت إليها `TRACK_ORDER` خطأً ومرّ الحارسُ لأنّ الاسمَ موجود.
    '/api/track',
  ]);
  const declared = new Set(ABILITIES.map(a => a.api).filter(Boolean));
  const missing = [...mounted].filter(p => !EXTERNAL.has(p) && !declared.has(p));
  assert.deepEqual(missing, [],
    `مسارٌ يعمل ولا قدرةَ تُعلنه — فالتطبيقُ يقدر ولا أحدَ يستطيع أن يطلب:\n  ${missing.join('\n  ')}`);
});

test('ولا قدرةَ تشير إلى مسارٍ غير موجود', () => {
  const files = new Set(readdirSync(join(ROOT, 'server/routes')).map(f => f.replace(/\.js$/, '')));
  const idx = src('server/index.js');
  const mounted = new Set();
  for (const m of idx.matchAll(/app\.use\(\s*'(\/api\/[^']*)'/g)) mounted.add(m[1].replace(/\/$/, ''));
  for (const a of ABILITIES.filter(x => x.api)) {
    const seg = a.api.replace('/api/', '');
    assert.ok(mounted.has(a.api) || files.has(seg),
      `${a.id}: يشير إلى «${a.api}» ولا مسارَ بهذا الاسم`);
  }
});

// ── ② كلُّ صفحةٍ مُعلَنةٌ قدرةً ─────────────────────────────────
test('لا صفحةَ خارجَ الكتالوج', () => {
  const ids = src('src/types.ts').match(/PAGE_IDS = \[([\s\S]*?)\] as const/)[1]
    .match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  const used = new Set(ABILITIES.map(a => a.page).filter(Boolean));
  const missing = ids.filter(p => !used.has(p));
  assert.deepEqual(missing, [],
    `صفحةٌ بلا قدرةٍ تُعلن ما تفعله:\n  ${missing.join('\n  ')}`);
});

test('ولا قدرةَ تشير إلى صفحةٍ غير موجودة', () => {
  const ids = new Set(src('src/types.ts').match(/PAGE_IDS = \[([\s\S]*?)\] as const/)[1]
    .match(/'([^']+)'/g).map(s => s.replace(/'/g, '')));
  for (const a of ABILITIES.filter(x => x.page)) {
    assert.ok(ids.has(a.page), `${a.id}: صفحةٌ «${a.page}» ليست في PAGE_IDS`);
  }
});

// ── ③ سلامةُ العقد ────────────────────────────────────────────
test('لا مُعرِّفَ مكرَّر', () => {
  const seen = new Set();
  for (const a of ABILITIES) {
    assert.ok(!seen.has(a.id), `مُعرِّفٌ مكرَّر: ${a.id}`);
    seen.add(a.id);
  }
});

test('كلُّ قدرةٍ تقول للإنسان ماذا تفعل — بالدارجة لا بالمصطلح', () => {
  // القانون ١٠: المستخدمُ لا يرى المحرّكات. فقدرةٌ بلا `say` عربيّةٍ تعني
  // أنّ مُعرِّفَها التقنيَّ سيُعرَض يومًا لأنّ لا بديلَ عنه.
  for (const a of ABILITIES) {
    assert.ok(a.say && a.say.length > 3, `${a.id}: بلا وصفٍ للإنسان`);
    assert.ok(/[؀-ۿ]/.test(a.say), `${a.id}: وصفٌ غيرُ عربيّ «${a.say}»`);
  }
});

test('الخطورةُ مُعلَنةٌ ومن القيم الثلاث', () => {
  for (const a of ABILITIES) {
    assert.ok(['low', 'medium', 'high'].includes(a.risk), `${a.id}: خطورةٌ «${a.risk}»`);
  }
});

// ── ④ الخطورةُ ليست زينة ─────────────────────────────────────
test('ما لا يُسترجَع خطِرٌ دائمًا', () => {
  // الحذفُ والدفعُ والشحنُ والإرسالُ للناس وتبديلُ النمرة — كلُّها إمّا لا
  // تُسترجَع أو تخرج عن أيدينا. ولو صُنّف أحدُها `medium` لنُفِّذ بثقةٍ ٠٫٧٠.
  const MUST_BE_HIGH = ['DELETE_PRODUCT', 'CREATE_SHIPMENT', 'MAKE_PAYMENT',
    'CHANGE_PHONE', 'BROADCAST_MESSAGE', 'CONNECT_DELIVERY', 'EDIT_KNOWLEDGE', 'MODERATE_CONTENT'];
  for (const id of MUST_BE_HIGH) {
    const a = ABILITIES.find(x => x.id === id);
    assert.ok(a, `اختفت قدرةٌ محروسة: ${id}`);
    assert.equal(a.risk, 'high', `${id}: صُنِّف «${a.risk}» — وهو لا يُسترجَع`);
  }
  // وكلُّ حذفٍ خطِرٌ مهما كان كيانُه.
  for (const a of ABILITIES.filter(x => x.verb === 'delete')) {
    assert.equal(a.risk, 'high', `${a.id}: حذفٌ غيرُ مصنَّفٍ خطِرًا`);
  }
});

test('العرضُ والبحثُ ليسا خطِرَين — وإلّا عاد «السؤالُ الدائم»', () => {
  // العطبُ الذي وُلد منه التصنيف: عتبةٌ واحدةٌ ٠٫٩٠ جعلت ٣٢ من ٣٦ جملةً
  // سؤالًا. فلو صار العرضُ خطِرًا لعاد العطبُ من الباب الآخر.
  for (const a of ABILITIES.filter(x => x.verb === 'view' || x.verb === 'seek')) {
    assert.notEqual(a.risk, 'high', `${a.id}: عرضٌ/بحثٌ مصنَّفٌ خطِرًا`);
  }
});

test('الخطِرُ لا يُنفَّذ تلقائيًّا مهما بلغت الثقة', () => {
  // العتبةُ العليا > ١ عمدًا: لا رقمَ يبلغها. هذا ما يجعل «يُؤكَّد دائمًا»
  // حقيقةً في الكود لا نيّةً في تعليق.
  const th = CAT.match(/RISK_THRESHOLD[^{]*\{([\s\S]*?)\}/)[1];
  const high = parseFloat((th.match(/high:\s*([\d.]+)/) || [])[1]);
  const low = parseFloat((th.match(/low:\s*([\d.]+)/) || [])[1]);
  const med = parseFloat((th.match(/medium:\s*([\d.]+)/) || [])[1]);
  assert.ok(high > 1, `عتبةُ الخطِر ${high} — قابلةٌ للبلوغ، فالتأكيدُ ليس دائمًا`);
  assert.ok(low < med && med < high, 'العتباتُ غيرُ متصاعدة');
});

// ── ⑤ ما هو مكشوفٌ عمدًا ─────────────────────────────────────
test('القدراتُ بلا بابٍ معروفةٌ ومعدودة', () => {
  // لا نُخفيها ولا ندّعي أنّها لا توجد. نثبّت العددَ كي ينكشف كلُّ ازديادٍ
  // فورًا — سقفٌ ينزل ولا يصعد، كما في `knowledge-health`.
  const noPage = ABILITIES.filter(a => a.page === null).map(a => a.id).sort();
  //   وكان في القائمة **بابان قائمان** حُسبا نقصًا:
  //   `MANAGE_LOYALTY` (شاشةُ `LoyaltyPanel` مركَّبةٌ في `CustomersPage`) و
  //   `BROADCAST_MESSAGE` (`NotificationsPage` تنادي `broadcastAPI.send`).
  //   القائمةُ تَعِد بأنّها تكشف الازدياد، ولا تكشف **نقصًا كاذبًا** — فبقي
  //   البابان مُخفيَين عن مَن يطلبهما بالكلام سنةً كاملة.
  //
  //   والثلاثةُ الباقيةُ بلا صفحةٍ **عمدًا**، ولكلٍّ سببٌ مختلف:
  //   · `VERIFY_IDENTITY` — يظهر داخل الفعل الذي طلبه (تأكيدُ طلبٍ · تبديلُ
  //     نمرة). صفحةٌ مستقلّةٌ له = بابٌ يدخله الإنسانُ ليتحقّق من لا شيء.
  //   · `SYNC_MEMORY` — يقع من نفسِه في `lib/userMemory.ts`. قيمتُه كلُّها
  //     في أنّه لا يُطلَب.
  //   · `TRACK_ORDER` — **له بابٌ يعمل** (`/track/:userId`)، لكنّه خارج
  //     `PAGE_IDS` لأنّ تلك صفحاتُ التاجر داخل `MainLayout`، وهذا بابُ
  //     الزبون: بلا حسابٍ ولا قائمةٍ جانبيّة.
  const KNOWN = ['SYNC_MEMORY', 'TRACK_ORDER', 'VERIFY_IDENTITY'].sort();
  assert.deepEqual(noPage, KNOWN,
    `تغيّرت القدراتُ بلا باب. أضِف صفحةً أو حدّث القائمةَ بوعي:\n  ${noPage.join(', ')}`);
});

test('و`TRACK_ORDER` بلا صفحةٍ لأنّ بابَه خارجَ اللائحة — لا لأنّه معدوم', () => {
  // السببُ المكتوبُ أعلاه يجب أن يبقى **صحيحًا**: لو حُذف المسارُ العامُّ
  // يومًا لصار التعليقُ عذرًا لغيابٍ حقيقيّ، وهذا أسوأُ من غيابٍ مُعلَن.
  const app = src('src/App.tsx');
  assert.match(app, /path="\/track\/:userId"/,
    'المسارُ العامُّ للتتبّع اختفى — و`TRACK_ORDER` ما زالت تقول «تشوف فين وصل الطلب» بلا باب');
  assert.match(app, /TrackOrder/, 'الصفحةُ نفسُها لم تعد مستورَدة');
});

test('كلُّ قدرةٍ خطِرةٍ تحتاج حسابًا', () => {
  // فعلٌ لا يُسترجَع من زائرٍ مجهولٍ لا يُنسَب لأحد.
  for (const a of ABILITIES.filter(x => x.risk === 'high')) {
    assert.ok(a.auth, `${a.id}: خطِرٌ ومتاحٌ للزائر`);
  }
});

// ============================================================
// **الحارسُ يفحص المعنى لا الاسم.**
//
//   `TRACK_ORDER` كان يشير إلى `/api/track` — مسارِ أحداث المشاهدة والنقر
//   (`POST` وحدَه) لا تتبّعِ الشحنات. ومرّ الحارسُ أعلاه لأنّه يسأل سؤالًا
//   واحدًا: «أيوجد مسارٌ بهذا الاسم؟» — ويوجد، ويفعل شيئًا آخر تمامًا.
//
//   وتقويةُ الحارس لا تحتاج فهمًا للمعنى، بل شيئَين **مكانيكيَّين** يُقرآن
//   من الكود: أنّ الفعلَ يقتضي طريقةَ HTTP تناسبه، وأنّ `auth` يطابق الواقع.
// ============================================================

/** فعلُ الكتالوج ⇒ طريقةُ HTTP التي لا بدّ من وجودها في ملفّ المسار. */
const VERB_METHOD = { view: 'get', create: 'post', delete: 'delete' };

test('الفعلُ يقتضي طريقتَه — قدرةُ عرضٍ تلزمها `router.get`', () => {
  const wrong = [];
  for (const a of ABILITIES.filter(x => x.api)) {
    const method = VERB_METHOD[a.verb];
    if (!method) continue;                       // update/send/offer… تتعدّد طرقُها
    const seg = a.api.replace('/api/', '');
    const file = join(ROOT, 'server/routes', `${seg}.js`);
    if (!existsSync(file)) continue;             // مسارٌ مركَّبٌ من مكانٍ آخر
    const body = readFileSync(file, 'utf8');
    if (!new RegExp(`router\\.${method}\\(`).test(body)) {
      wrong.push(`${a.id}: يَعِد بـ${a.verb} على «${a.api}» ولا ${method} فيه`);
    }
  }
  assert.deepEqual(wrong, [], `قدراتٌ تشير إلى مسارٍ لا يفعل ما تدّعيه:\n  ${wrong.join('\n  ')}`);
});

test('و`auth` يطابق الواقع — ما أُعلن عامًّا يجب أن يكون له بابٌ بلا مصادقة', () => {
  // قدرةٌ تقول `auth: false` وكلُّ مساراتها محميّةٌ وعدٌ للزائر لا يُوفى:
  // يُعرَض له «تشوف فين وصل الطلب» ثمّ يُقابَل بـ401.
  const wrong = [];
  for (const a of ABILITIES.filter(x => x.api && x.auth === false)) {
    const seg = a.api.replace('/api/', '');
    const file = join(ROOT, 'server/routes', `${seg}.js`);
    if (!existsSync(file)) continue;
    const body = readFileSync(file, 'utf8');
    const routes = [...body.matchAll(/router\.\w+\(\s*'[^']*'\s*,\s*([^)]*)/g)].map(m => m[1]);
    if (routes.length && !routes.some(r => !/\bauth\b/.test(r))) {
      wrong.push(`${a.id}: مُعلَنةٌ للزائر و«${a.api}» كلُّه محميّ`);
    }
  }
  assert.deepEqual(wrong, [], wrong.join('\n  '));
});

// ============================================================
// `ENTITY_VERBS` — إعلانٌ عن **المجال**، وحارسٌ يمنعه أن يصير بابًا خلفيًّا.
//
//   منه وحدَه يُقال «ما نقدرش». ولو تُرك بلا حارسٍ لتوسّع بالنيّة الحسنة حتّى
//   يصير «كلُّ شيءٍ ممكن» — فيعود `refuse` ميّتًا كما كان، لكن بثوبٍ جديد.
//
//   والحدُّ مكانيكيّ: كلُّ فعلٍ مُعلَنٍ لكيانٍ يجب أن **تُبرّره قدرةٌ قائمة**
//   في الكتالوج، أو أن يُعلَن نقصًا معروفًا في `KNOWN_GAPS` بسببٍ مكتوب.
//   فلا يُضاف فعلٌ لكيانٍ لمجرّد أنّه يبدو معقولًا.
// ============================================================

// يُقرأ `ENTITY_VERBS` نصًّا كما يُقرأ الكتالوجُ نفسُه: هذا الحارسُ `.mjs`
// والمصدرُ TypeScript، ولا نريد خطوةَ بناءٍ لحارسٍ يجب أن يعمل دائمًا.
const EV_BLOCK = (CAT.match(/export const ENTITY_VERBS[^=]*= \{([\s\S]*?)\n\};/) || [])[1] || '';
const ENTITY_VERBS = Object.fromEntries(
  [...EV_BLOCK.matchAll(/^\s{2}(\w+):\s*\[([^\]]*)\]/gm)]
    .map(m => [m[1], [...m[2].matchAll(/'(\w+)'/g)].map(x => x[1])])
);
const entityAccepts = (verb, entity) => (ENTITY_VERBS[entity] || []).includes(verb);

test('إعلانُ المجال يُقرأ أصلًا', () => {
  const n = Object.keys(ENTITY_VERBS).length;
  assert.ok(n >= 20, `قُرئ ${n} كيانًا فقط — تغيّرت صيغةُ الملفّ والحارسُ صار أعمى`);
});

/**
 * ثغراتُ كتالوجٍ معروفة: الكيانُ يقبل الفعلَ (بابٌ حقيقيٌّ في التطبيق) ولم
 * تُعلَن له قدرةٌ بعد. **ليست عجزًا** — لا يُقال فيها «ما نقدرش» أبدًا.
 * القائمةُ سقّاطة: تنقص ولا تزيد، وكلُّ سطرٍ فيها دَينٌ مُعلَن.
 */
const KNOWN_GAPS = new Set([
  // ── فارغةٌ الآن ────────────────────────────────────────────────
  //
  //   كانت ٥٦ سطرًا، فيها **١٦ دَينًا كاذبًا**: أزواجٌ مُعلَنةٌ في الكتالوج
  //   ومذكورةٌ ثغرةً في آن. والحارسُ لم يمسكها لأنّه كان يفحص اتّجاهًا واحدًا
  //   (فعلٌ بلا قدرةٍ ولا ثغرة) ولا يفحص عكسَه — ودَينٌ كاذبٌ يُخفي العملَ
  //   الحقيقيَّ خلف ضجيج.
  //
  //   والأربعون الباقيةُ أُعلنت قدراتٍ: لكلٍّ مسارٌ بالطريقة الصحيحة وصفحةٌ
  //   يبلغها `MainLayout` — يحرسهما اختباران في هذا الملفّ.
  //
  //   وتبقى القائمةُ سقّاطة: تُملأ حين يُكتشَف بابٌ جديدٌ قبل أن يُعلَن،
  //   وتُفرَّغ حين يُعلَن. وما يبقى فيها دَينٌ **مُبرَّرٌ بسطرٍ مكتوب**.
  //
  //   وهذه الثلاثةُ دَينٌ حقيقيّ: **لا مسارَ حذفٍ لها في الخادم**. أعلنتُها
  //   قدراتٍ فأسقطني الحارسُ («يَعِد بـdelete ولا delete فيه») — وهو محقّ.
  //   المجالُ يقبلها (`ENTITY_VERBS`) والتطبيقُ لم يبنِها بعد، والفرقُ بين
  //   الاثنين هو ما تقيسه هذه القائمة.
  'delete:listing',   // لا DELETE في routes/listings.js
  'delete:booking',   // لا DELETE في routes/bookings.js
  'delete:media',     // لا DELETE في routes/media.js
]);

test('كلُّ فعلٍ مُعلَنٍ لكيانٍ إمّا له قدرةٌ أو ثغرةٌ مُعلَنة', () => {
  const declared = new Set(ABILITIES.map(a => `${a.verb}:${a.entity}`));
  const unjustified = [];
  for (const [entity, verbs] of Object.entries(ENTITY_VERBS)) {
    for (const v of verbs) {
      const key = `${v}:${entity}`;
      if (!declared.has(key) && !KNOWN_GAPS.has(key)) unjustified.push(key);
    }
  }
  assert.deepEqual(unjustified.sort(), [],
    `أفعالٌ مُعلَنةٌ بلا قدرةٍ ولا ثغرةٍ مُبرَّرة — إمّا أن تُعلَن القدرةُ أو يُحذَف الفعل:\n  ${unjustified.join('\n  ')}`);
});

test('ولا قدرةَ قائمةٌ يرفضها إعلانُ المجال — وإلّا رُفض ما يعمل', () => {
  const wrong = [];
  for (const a of ABILITIES) {
    if (!entityAccepts(a.verb, a.entity)) wrong.push(`${a.id} (${a.verb}:${a.entity})`);
  }
  assert.deepEqual(wrong, [],
    `قدراتٌ تعمل ويقول عنها الإعلانُ «مستحيلة» — ستُقابَل بـ«ما نقدرش»:\n  ${wrong.join('\n  ')}`);
});

test('ولا ثغرةَ **مُعلَنةٌ أصلًا** — دَينٌ كاذبٌ يُخفي العملَ الحقيقيّ', () => {
  // كان الحارسُ يفحص اتّجاهًا واحدًا: فعلٌ في `ENTITY_VERBS` بلا قدرةٍ ولا
  // ثغرة. ولا يفحص عكسَه — فبقيت **١٦** ثغرةً مذكورةً وهي مُعلَنةٌ في
  // الكتالوج، أي ٢٩٪ من قائمة الدَّين كانت وهمًا. وقائمةُ دَينٍ منتفخةٌ أسوأُ
  // من غيابها: يُقرأ فيها ما لا عملَ فيه، فيُؤجَّل ما فيه عملٌ حقيقيّ.
  const declared = new Set(ABILITIES.map(a => `${a.verb}:${a.entity}`));
  const fake = [...KNOWN_GAPS].filter(k => declared.has(k));
  assert.deepEqual(fake, [],
    `ثغراتٌ مُعلَنةٌ في الكتالوج أصلًا — احذفها من القائمة:\n  ${fake.join('\n  ')}`);
});

test('والثغرةُ المُعلَنة ليست عجزًا — لا تُقابَل بـ«ما نقدرش» أبدًا', () => {
  for (const key of KNOWN_GAPS) {
    const [verb, entity] = key.split(':');
    assert.ok(entityAccepts(verb, entity),
      `«${key}» مُعلَنةٌ ثغرةً وإعلانُ المجال يرفضها — سيُقال فيها «ما نقدرش» وهي بابٌ يعمل`);
  }
});

test('«ما نقدرش» ممكنةٌ فعلًا — الإعلانُ ليس «كلُّ شيءٍ مسموح»', () => {
  // حارسُ ألّا يتحوّل هذا الملفّ إلى موافقةٍ شاملة، فيموت الحكمُ بصمت.
  const impossible = [
    ['create', 'phone'], ['delete', 'language'], ['send', 'settings'],
    ['delete', 'order'], ['update', 'wallet'], ['delete', 'account'],
  ];
  for (const [v, e] of impossible) {
    assert.equal(entityAccepts(v, e), false,
      `«${v}:${e}» صارت مقبولةً — لا أحدَ يفعل هذا، والقبولُ يقتل حكمَ العجز`);
  }
});
