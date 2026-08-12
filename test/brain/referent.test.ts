import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { abilityFor, ABILITIES, ENTITY_VERBS } from '../../src/lib/abilities';
import { decideExecution } from '../../src/lib/executionPolicy';
import { decideFor } from '../../src/lib/decide';
import { buildContext } from '../../src/lib/core/context';

// ============================================================
// **الإشارة: قال أيَّ واحدٍ يقصد، فسُئل «أيّ منتوج؟»**
//
//   من جملِ صاحب المشروع:
//
//       «بغيت نمسح **هاد** المنتوج»   ⇒ «أيّ منتوج؟»
//       «بدّل ليا ثمن **آخر** منتوج» ⇒ «أيّ منتوج؟»
//
//   والسؤالُ عمّا قيل للتوّ أسوأُ من السؤال عمّا لم يُقَل: الثاني جهلٌ،
//   والأوّلُ يُشعر الإنسانَ أنّه **لم يُسمَع**.
//
//   ── والطبقاتُ ثلاثٌ لا تُخلَط ──
//     ① المعجمُ يقرأ المؤشِّرَ ولا يعرف كتالوجَ أحد.
//     ② السياقُ يعرف آخرَ منتوجٍ أضافه.
//     ③ القرارُ يصل بينهما — **وإن لم يجد سياقًا أبقى السؤال**.
//   والثالثةُ هي الحدّ: تخمينُ منتوجٍ **يُحذَف** أسوأُ من سؤالٍ زائد.
// ============================================================

const CTX = { lastProduct: { id: 'p-77', name: 'سباط جلد' } };

const judge = (s: string, ctx?: typeof CTX) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const match = abilityFor({ action: u.action, intent: r?.intent });
  return { u, d: decideExecution(u, match || undefined, false, ctx), match };
};

// ── ① المؤشِّرُ يُقرأ ─────────────────────────────────────────
test('«هاد» و«آخر» تُقرآن مؤشِّرَين — لا اسمَين', () => {
  assert.equal(judge('بغيت نمسح هاد المنتوج').u.action?.ref, 'this');
  assert.equal(judge('بدل ليا ثمن آخر منتوج').u.action?.ref, 'last');
  assert.equal(judge('مسح المنتوج الأخير').u.action?.ref, 'last');
  // وحيث لا إشارةَ لا يُخترَع مؤشِّر.
  assert.equal(judge('مسح المنتوج').u.action?.ref, undefined);
  // و«منتوج **جديد**» طلبُ إنشاءٍ لا إشارةٌ إلى آخرِ ما أُضيف. كتبتُ «الجديد»
  // في قائمة الإشارات أوّلًا، فأمسكه هذا السطر: مؤشِّرٌ يخطئ هنا **يحذف
  // منتوجًا لم يُقصَد**، والغموضُ يُترَك سؤالًا لا يُحسَم تخمينًا.
  assert.equal(judge('بغيت نزيد منتوج جديد').u.action?.ref, undefined,
    '«جديد» صارت إشارةً إلى آخرِ منتوج — وهي طلبُ إنشاء');
});

// ── ② السياقُ يعرف المشارَ إليه ───────────────────────────────
test('آخرُ منتوجٍ يُقرأ بالتاريخ لا بترتيب المصفوفة', () => {
  // ترتيبُ المصفوفة يأتي من الخادم وقد ينقلب باستعلامٍ لا علاقةَ له بنا،
  // فيصير «آخر منتوج» أوّلَه بلا أن يتغيّر سطرٌ عندنا.
  const mk = (id: string, name: string, createdAt: string) => ({ id, name, createdAt, status: 'published' });
  const ctx = buildContext({
    products: [mk('a', 'قديم', '2020-01-01'), mk('b', 'جديد', '2026-01-01'), mk('c', 'وسط', '2023-01-01')],
    orders: [], customers: [], conversations: [], settings: {},
  } as any);
  assert.equal(ctx.state.lastProduct?.name, 'جديد');
  // وكتالوجٌ فارغٌ لا يخترع منتوجًا.
  const empty = buildContext({ products: [], orders: [], customers: [], conversations: [], settings: {} } as any);
  assert.equal(empty.state.lastProduct, undefined);
});

// ── ③ الوصلُ — ولا يقع إلّا بسياق ─────────────────────────────
test('**بلا سياقٍ يبقى السؤال** — لا يُخمَّن منتوجٌ يُحذَف', () => {
  // أخطرُ ما في هذا الباب. لو حُلّت الإشارةُ بالتخمين لحُذف منتوجٌ لم يقصده.
  assert.equal(judge('بغيت نمسح هاد المنتوج').d.say, 'أيّ منتوج؟');
  assert.equal(judge('بدل ليا ثمن آخر منتوج').d.say, 'أيّ منتوج؟');
});

test('وبالسياق يُسمّى المحذوفُ في التأكيد — لا يُؤكَّد على المجهول', () => {
  // «واش متأكّد باغي تحيّد منتوج؟» تأكيدٌ يوافق عليه الإنسانُ وهو لا يعرف
  // أيَّ واحدٍ سيذهب. والاسمُ هو **كلُّ ما يحتاجه ليقرّر** — فلا تُفتَح له
  // صفحةُ المنتجات ليبحث عمّا عيّنه بنفسه.
  const d = judge('بغيت نمسح هاد المنتوج', CTX).d;
  assert.equal(d.verdict, 'confirm');
  assert.match(d.say, /سباط جلد/, `تأكيدٌ على المجهول: «${d.say}»`);
  assert.ok(d.trace.some(t => t.includes('الإشارة')), 'حُلّت الإشارةُ بلا أثرٍ يشرحها');
});

// ── ④ وسترُ عطبٍ بعطبٍ ليس إصلاحًا ────────────────────────────
test('**تبديلُ ثمنٍ بلا ثمنٍ لا يُنفَّذ** — ظهر حين حُلَّت الإشارة', () => {
  // كان نقصُ الثمن مستورًا بنقصِ المنتوج: يُسأل «أيّ منتوج؟» فلا يبلغ
  // التنفيذَ أصلًا. فلمّا حُلَّت الإشارةُ ظهر الأوّلُ عاريًا.
  const d = judge('بدل ليا ثمن آخر منتوج', CTX).d;
  assert.equal(d.verdict, 'ask');
  assert.equal(d.say, 'بشحال؟', `نُفِّذ تبديلُ ثمنٍ بلا ثمن: ${d.verdict}`);
  // وحين يقول الثمنَ يمضي.
  assert.equal(judge('بدل ليا ثمن آخر منتوج ل 250 درهم', CTX).d.verdict, 'execute');
});

test('و«ثمن» المجرّدةُ تُقرأ ثمنًا — و«ثمن التوصيل» تبقى توصيلًا', () => {
  assert.equal(judge('بدل ليا ثمن آخر منتوج').u.action?.object, 'price');
  assert.equal(judge('بدل ثمن التوصيل').u.action?.object, 'delivery',
    'ابتلع الثمنُ إعدادَ التوصيل — والترتيبُ من الأخصّ إلى الأعمّ جزءٌ من المعنى');
});

// ── ⑤ نصُّ المنتوج كيانٌ قائمٌ بذاته ──────────────────────────
test('**طالبُ الهاشتاگ لا يُسأل «بشحال؟»**', () => {
  // كان `content` يُخرَّج كيانًا `product`، فيصير «باغي هاشتاگ» إنشاءَ
  // منتوجٍ ويرث حاجتَه إلى ثمن. والمساران قائمان يعملان
  // (`/api/ai/generate-hashtags`) ولم تكن في الكتالوج قدرةٌ تبلغهما.
  const { d, match } = judge('بغيت هاشتاگ أو وصف لهاد المنتوج', CTX);
  assert.equal(match?.id, 'GENERATE_CONTENT', `سِيق إلى ${match?.id}`);
  assert.equal(d.verdict, 'execute');
  assert.notEqual(d.say, 'بشحال؟');
  // وبلا منتوجٍ مشارٍ إليه يُسأل عنه — الوصفُ بلا ما يوصَف لا معنى له.
  assert.equal(judge('بغيت هاشتاگ أو وصف لهاد المنتوج').d.say, 'أيّ منتوج؟');
});

test('والكيانُ الجديد مُعلَنٌ في المجال — لا كيانَ بلا أفعالٍ يقبلها', () => {
  // كيانٌ يُذكَر في قدرةٍ ولا يُعلَن في `ENTITY_VERBS` يجعل `entityAccepts`
  // تقول «هادشي ما كايتديرش أصلًا» عن بابٍ يعمل.
  assert.ok(ENTITY_VERBS.content?.includes('create'), 'كيان `content` بلا أفعالٍ مُعلَنة');
  const a = ABILITIES.find(x => x.id === 'GENERATE_CONTENT');
  assert.ok(a && a.page && a.api, 'قدرةٌ بلا بابٍ ولا مسار');
});

// ── ⑥ والوصلُ موصولٌ فعلًا في الشاشة ─────────────────────────
test('**والمالكُ الواحدُ يوصل السياقَ إلى الحَكَم** — سلوكيًّا', () => {
  // بعد RC-P1 لم تعد الشاشةُ تنادي `decideExecution` بنفسها، فالوصلُ صار
  //   حلقتَين: شاشةٌ ⇐ `decideFor` ⇐ الحَكَم. وتُقاس الحلقةُ الثانيةُ **سلوكيًّا**
  //   لا نصًّا: تمريرُ `lastProduct` يجب أن يحلّ المؤشِّرَ فعلًا.
  const q = 'بغيت هاشتاگ أو وصف لهاد المنتوج';
  assert.equal(decideFor(q).say, 'أيّ منتوج؟', 'بلا سياقٍ يجب أن يُسأل');
  const withCtx = decideFor(q, { lastProduct: { id: 'p1', name: 'طاجين' } });
  assert.notEqual(withCtx.say, 'أيّ منتوج؟',
    '**المالكُ الواحد يبتلع السياق** — فالإشارةُ تُقرأ ولا تُحَلّ أبدًا');
  assert.equal(withCtx.verdict, 'execute');
});

test('**والشاشةُ تُمرّر السياق** — الحلقةُ الأولى (SOURCE_SHAPE معلَن)', () => {
  // حارسُ شكلٍ **إضافيّ**: أنّ الشاشةَ تُمرّر السياقَ لا يُقاس من مخرجِ العقل،
  //   لأنّ العقلَ يعمل صحيحًا وإن نسيت الشاشةُ أن تُعطيَه ما عندها.
  const src = readFileSync(join(process.cwd(), 'src/pages/LivingHome.tsx'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.match(src, /decideFor\([^)]*lastProduct/s,
    'الشاشةُ تسأل المالكَ بلا سياق — فالإشارةُ تُقرأ ولا تُحَلّ أبدًا في التطبيق');
});
