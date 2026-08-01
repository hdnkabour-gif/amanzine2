import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================
// اختباراتُ الدستور (docs/PRODUCT_CONSTITUTION.md).
//   تفحص **الكودَ نفسه** لا سلوكَ التشغيل: كلُّ قاعدةٍ هنا وُلدت من عطبٍ
//   وقع فعلًا، وهذه الاختبارات تمنع عودته. قاعدةٌ لا يفحصها شيءٌ أمنية.
// ============================================================

const SRC = new URL('../src', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}
const FILES = walk(SRC).map(p => ({ p, rel: p.slice(SRC.length + 1), s: readFileSync(p, 'utf8') }));
const find = (rel) => FILES.find(f => f.rel === rel)?.s || '';

// ── ① لا رسالةَ نجاحٍ إلّا بعد نجاحٍ حقيقيّ ──────────────────
test('① زرٌّ فعلُه الوحيد رسالةُ نجاح = ادّعاء', () => {
  const bad = [];
  for (const f of FILES) {
    const re = /onClick=\{\(\)\s*=>\s*notify\(\s*'success'/g;
    let m; while ((m = re.exec(f.s))) bad.push(`${f.rel}:${f.s.slice(0, m.index).split('\n').length}`);
  }
  assert.deepEqual(bad, [], `أزرارٌ تعلن نجاحًا بلا فعل:\n  ${bad.join('\n  ')}`);
});

test('① زرٌّ بلا مُعالِج نقرٍ ولا disabled يبدو فعّالًا وهو جامد', () => {
  const bad = [];
  for (const f of FILES) {
    const re = /<button\b((?:[^>"']|"[^"]*"|'[^']*')*?)>/gs;
    let m;
    while ((m = re.exec(f.s))) {
      const a = m[1];
      if (/on(Click|MouseDown|MouseUp|KeyDown|PointerDown|TouchStart)|type="submit"|\bdisabled\b/.test(a)) continue;
      bad.push(`${f.rel}:${f.s.slice(0, m.index).split('\n').length}`);
    }
  }
  assert.deepEqual(bad, [], `أزرارٌ جامدةٌ تبدو فعّالة:\n  ${bad.join('\n  ')}`);
});

// ── ② كلُّ انتقالٍ يحفظ الرحلة ────────────────────────────────
test('② لا إعادةَ تحميلٍ إلّا في مسارات المصادقة (تصفيرٌ مقصود)', () => {
  // الاستثناء بالملفّ لا بالمسار: كلُّ ما يقع **عند تغيّر الجلسة** (دخول ·
  // خروج · 401) يُعيد التحميل عمدًا، لأنّ الإبقاء على حالةِ الحساب السابق
  // في الذاكرة خطرٌ أمنيّ لا تحسينُ تجربة. ما عدا ذلك يجب أن يمرّ بالراوتر.
  const AUTH_FILES = new Set([
    'pages/AuthPage.tsx',            // بعد الدخول — الجلسة تغيّرت
    'services/api.ts',               // 401: انتهت الجلسة
    'store.tsx',                     // تسجيل الخروج
    'pages/Landing/context.tsx',     // دخول تجريبيّ
    'components/CreateFlow.tsx',     // بوّابة الدخول قبل النشر
  ]);
  const bad = [];
  for (const f of FILES) {
    if (AUTH_FILES.has(f.rel)) continue;
    for (const [i, line] of f.s.split('\n').entries()) {
      if (!/window\.location\.(assign|href\s*=|replace)/.test(line)) continue;
      if (/location\.(search|origin|port|pathname)/.test(line)) continue;
      if (line.trimStart().startsWith('//')) continue;        // تعليقٌ يشرح التاريخ
      bad.push(`${f.rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    }
  }
  assert.deepEqual(bad, [], `انتقالٌ يهدم الرحلة:\n  ${bad.join('\n  ')}`);
});

// ── ③ كلُّ قرارٍ قابلٌ للتفسير ────────────────────────────────
test('③ المرآة لا تختفي عند ظهور النتيجة', () => {
  const s = find('pages/LivingHome.tsx');
  assert.ok(s.includes('<UnderstandingCard'), 'المرآة غير معروضة أصلًا');
  assert.ok(!/\{!result && <UnderstandingCard/.test(s),
    'المرآة مشروطةٌ بـ !result — تختفي في لحظة القرار، وهي اللحظة التي تُحتاج فيها');
  assert.ok(/mirror=\{!!result\}/.test(s), 'لا وضعَ مرآةٍ بعد الفهم');
});

test('③ «لماذا فهمنا هذا؟» مبنيّةٌ من reasoning لا من نصٍّ ثابت', () => {
  const s = find('components/UnderstandingCard.tsx');
  assert.ok(s.includes('u.reasoning.map'), 'التفسير لا يُشتقّ من خطوات الاستدلال');
});

// ── ④ إن لم يفهم — يسأل، ولا يخمّن ───────────────────────────
test('④ الاتّجاه مصدرُه واحد — لا قائمةَ طلبٍ ثانية خارج طبقة المعرفة', () => {
  const need = find('lib/needEngine.ts');
  assert.ok(need.includes('stanceOf'), 'المحرّك لا يقرأ الاتّجاه من المصدر الواحد');
  assert.ok(!/^const WANT = \[/m.test(need),
    'عادت قائمةُ WANT — عقلٌ ثانٍ يخالف stanceOf ويُلقي الطالبَ في صفحة النشر');
});

test('④ حرفةٌ بلا اتّجاه ⇒ سؤالٌ بخيارَين لا صفحةُ نشر', () => {
  const need = find('lib/needEngine.ts');
  assert.ok(/واش كتقلّب على \$\{p\.pro\}/.test(need), 'اختفى السؤال التوضيحيّ للحرفة الغامضة');
  // فرعُ «أنا حدّاد» يشترط عرضًا صريحًا لا مجرّد غياب كلمة طلب
  assert.ok(/stance === 'offer' && has\(t, p\.kw\)/.test(need),
    'فرعُ العرض لا يشترط اتّجاهًا صريحًا — سيخمّن على الطالب');
});

// ── ⑤ إن لم يجد — يبني السوق ─────────────────────────────────
test('⑤ السوق الفارغ يلتقط الطلب لا يطلب من الباحث أن ينشر', () => {
  const s = find('pages/Marketplace.tsx');
  assert.ok(s.includes('<NeedCapture'), 'الفراغ لا يلتقط الحاجة');
  const empty = s.slice(s.indexOf('listings.length === 0'), s.indexOf('listings.length === 0') + 900);
  assert.ok(!/mk\.emptySub/.test(empty), 'ما زالت دعوةُ «كن أوّل واحد وانشر» هي الجواب الوحيد للفراغ');
});

test('⑤ لا نَعِد بردٍّ لن يصل — اتّصالٌ غيرُ صالحٍ يُرفَض', () => {
  const r = readFileSync(new URL('../server/routes/needs.js', import.meta.url), 'utf8');
  assert.ok(/PHONE\s*=\s*\//.test(r) && /EMAIL\s*=\s*\//.test(r), 'لا تحقّق من صيغة الاتّصال');
  assert.ok(/return res\.status\(400\)/.test(r), 'الاتّصال الخاطئ يمرّ بلا رفض');
});

test('⑤ العباراتُ العلنيّة محروسة (لا أرقام · قصيرة · متكرّرة)', () => {
  const db = readFileSync(new URL('../server/database.js', import.meta.url), 'utf8');
  const fn = db.slice(db.indexOf('getPublicTrendingTerms'), db.indexOf('getPublicTrendingTerms') + 900);
  assert.ok(/term !~ '\[0-9\]'/.test(fn), 'قد تُعرَض عبارةٌ فيها رقمُ هاتف');
  assert.ok(/char_length\(term\) BETWEEN/.test(fn), 'قد تُعرَض جملةٌ طويلةٌ تدلّ على صاحبها');
  assert.ok(/HAVING SUM\(total\) >=/.test(fn), 'قد تُعرَض عبارةٌ بحثها شخصٌ واحد');
});

// ── ⑥ المستخدم لا يختار دورَه ────────────────────────────────
test('⑥ لا حقلَ يخزّن «نوع المستخدم»', () => {
  const bad = [];
  for (const f of FILES) {
    if (/\buserType\b|\bpersonaType\b|\baccountType\b/.test(f.s)) bad.push(f.rel);
  }
  assert.deepEqual(bad, [], `تصنيفٌ ثابتٌ للإنسان:\n  ${bad.join('\n  ')}`);
});

test('⑥ الاتّجاه يُقرأ لكلّ جملةٍ على حدة', () => {
  const kb = find('lib/akg/kb/index.ts');
  assert.ok(/export function stanceOf\(input: string/.test(kb), 'stanceOf لا تأخذ نصًّا — صارت حالةً مخزّنة؟');
});

// ── ⑦ كلُّ ما يحسبه العقل يُعرَض أو يُحذَف ────────────────────
test('⑦ الحقول المضافة لها مستهلكٌ فعليّ في الواجهة', () => {
  const graph = find('lib/akg/kb/knowledgeGraph.ts');
  assert.ok(/c\.asks\?\.(offer|seek)/.test(graph), 'asks تُحفَظ ولا تُعرَض');
  assert.ok(/c\.links\?\.related/.test(graph), 'links تُحفَظ ولا تُستعمَل');
  const assistant = find('pages/AssistantPage.tsx');
  assert.ok(/stanceOf\(query/.test(assistant), 'الاتّجاه لا يصل إلى أسئلة المساعد');
});

test('⑦ الصورُ تُرفَع فعلًا — لا زرَّ يدّعي الإضافة', () => {
  const reg = find('components/componentRegistry.tsx');
  // نفحص جسمَ المنتقي نفسه لا الملفّ كلّه: زرٌّ كاذبٌ داخله لا يُنقذه حقلُ
  // ملفٍّ في مكوّنٍ آخر. وهذه كانت ثغرةَ الاختبار الأولى.
  const i = reg.indexOf('const GalleryPicker');
  assert.ok(i > -1, 'اختفى منتقي الصور');
  const body = reg.slice(i, reg.indexOf('const VideoPicker'));
  assert.ok(/type="file"/.test(body), 'لا حقلَ ملفٍّ حقيقيّ داخل منتقي الصور');
  assert.ok(/shrinkForListing/.test(body), 'الملفّ لا يُقرأ ولا يُضغَط — الزرّ لا يرفع شيئًا');
  assert.ok(!/onChange\(\s*'[^']*'\s*\)/.test(body), 'يُسنِد نصًّا ثابتًا بدل صورةٍ حقيقيّة');
});

test('⑦ النشر يحفظ على الخادم قبل أن يعلن النجاح', () => {
  const cf = find('components/CreateFlow.tsx');
  assert.ok(/await addProduct\(/.test(cf), 'النشر لا يصل إلى الخادم');
  const pub = cf.slice(cf.indexOf('const publish = async'), cf.indexOf('const publish = async') + 1200);
  assert.ok(pub.indexOf('addProduct') < pub.indexOf('setDone(true)'),
    'شاشةُ النجاح تظهر قبل أن يُحفَظ شيء');
});
