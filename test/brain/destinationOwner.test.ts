import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { decideFor, targetOf } from '../../src/lib/decide';
import { CLIENT_STATE, JOURNEY_TTL } from '../../src/lib/clientState';

// ============================================================
// **RC-P1 — مالكٌ واحدٌ للوجهة الدلاليّة.**
//
//   قِيست ستُّ عائلاتٍ تقرّر «أين يذهب هذا الطلب»: نتيجةُ الحاجة · تجاوزُ
//   الاتّجاه في `NeedFirst` · إعادةُ الاشتقاق في `AuthPage` · `Decision.dest`
//   (في `LivingHome` وحدَها) · توجيهُ `Assistant` المباشر · بذرةُ النشر.
//   فنفسُ الجملة تنتهي بإنسانٍ إلى مكانَين بحسب الشاشة التي كتبها فيها.
//
//   والحارسُ هنا **سلوكيّ**: تُقاس الحصيلةُ لكلّ جملة، ويُثبَت أنّ الشاشاتِ
//   تسأل المالكَ ولا تركّب الطبقاتِ بأنفسها.
// ============================================================

// تُجمَّع هذه الاختباراتُ إلى حزمةٍ واحدةٍ في `/tmp`، فـ`import.meta.dirname`
//   يشير إلى مكان الحزمة لا إلى المشروع. والجذرُ هو مكانُ التشغيل — كما في
//   `searchContract` و`humanLabels`. ويُتحقَّق منه صراحةً كي لا يمرَّ حارسُ
//   الشكل على جذرٍ خاطئ.
const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.resolve(ROOT, p), 'utf8');

const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

const SURFACES = [
  'src/pages/Landing/sections/NeedFirst.tsx',
  'src/pages/AssistantPage.tsx',
  'src/pages/LivingHome.tsx',
];

const SHAPE_FILES = [...SURFACES, 'src/lib/decide.ts', 'src/pages/AuthPage.tsx', 'src/lib/clientState.ts'];

test('**والجذرُ جذرُ المشروع** — حارسُ شكلٍ على جذرٍ خاطئٍ حارسٌ أجوف', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'package.json')), `ليس جذرَ المشروع: ${ROOT}`);
  for (const f of SHAPE_FILES) {
    assert.ok(fs.existsSync(path.resolve(ROOT, f)), `ملفٌّ غيرُ موجود: ${f}`);
    assert.ok(read(f).length > 200, `ملفٌّ فارغٌ يُمرّر أيَّ حارسِ شكل: ${f}`);
  }
});

// ── ① الجملُ الذهبيّة: حصيلةٌ واحدةٌ لكلّ جملة ──────────────────
type Row = [string, string | undefined, string];
const GOLDEN: Row[] = [
  // جملةٌ · القدرة · الحكم
  ['خاصني سبّاك',                 'FIND_PROVIDER',   'execute'],  // seek
  ['بغيت نبيع طابلة',             'SELL_PRODUCT',    'ask'],      // sell — ينقص الثمن
  ['بغيت ناكل شي سندويش',         'FIND_PROVIDER',   'execute'],  // seek/طعام
  ['كنقلب على حداد',              'FIND_PROVIDER',   'execute'],
  ['عندي دار للكراء',             'PUBLISH_LISTING', 'execute'],  // offer
  ['بغيت نكري دار',               'SEEK_LISTING',    'execute'],
  ['بغيت فران',                   'FIND_PROVIDER',   'ask'],      // استيضاح
  ['بغيت نمشي لطنجة',             'FIND_PROVIDER',   'soon'],     // قدرةٌ غيرُ مدعومة
  ['بغيت نبدل النمرة ديال المحل', 'CHANGE_PHONE',    'ask'],      // فعلٌ يحتاج حسابًا
  // **الفعلُ الضعيفُ لا يفتح بابًا.** قارئةُ الأفعال تسقط على `update/settings`
  //   بثقة ٠٫٣٥ حين لا تعرف الهدف. وبلا حدِّ التصديق (`READ_ENOUGH`) يُفتَح
  //   بابُ **إعدادات الحساب** لرجلٍ قال إنّ معه عشرةَ دراهم. قِيس: بالحدّ
  //   ⇒ `FIND_PROVIDER`، وبإسقاطه ⇒ `UPDATE_SETTINGS`.
  ['بغيت نمشي الحي عندي غير 10 دراهم', 'FIND_PROVIDER', 'soon'],
];

test('**الجملُ الذهبيّة: حكمٌ واحدٌ وقدرةٌ واحدةٌ لكلّ جملة**', () => {
  const broke: string[] = [];
  for (const [s, ability, verdict] of GOLDEN) {
    const d = decideFor(s);
    if (d.ability?.id !== ability || d.verdict !== verdict) {
      broke.push(`«${s}» ⇒ ${d.ability?.id}/${d.verdict} (المنتظَر ${ability}/${verdict})`);
    }
  }
  assert.deepEqual(broke, [], `\n  ${broke.join('\n  ')}\n`);
});

test('**ونفسُ الجملة تُخرج نفسَ الوجهة مهما تكرّر النداء**', () => {
  // الحتميّةُ شرطُ الوحدة: مالكٌ واحدٌ يتذبذب ليس مالكًا.
  for (const [s] of GOLDEN) {
    const a = targetOf(decideFor(s), s);
    const b = targetOf(decideFor(s), s);
    assert.deepEqual(a, b, `«${s}» أخرجت وجهتَين`);
  }
});

test('**وحكمٌ بلا حسمٍ لا وجهةَ له** — السؤالُ لا يُنقَل صاحبَه', () => {
  // هذا جوهرُ العطب: `NeedResult.page` كانت تُقرأ بمعزلٍ عن الحكم، فيُطرَح
  //   سؤالٌ ثمّ يُنقَل الإنسانُ إلى صفحةٍ أخرى — سؤالٌ مرميّ.
  for (const s of ['بغيت فران', 'بغيت نبيع طابلة', 'بغيت نمشي لطنجة']) {
    const d = decideFor(s);
    assert.notEqual(d.verdict, 'execute');
    assert.deepEqual(targetOf(d, s), {}, `«${s}» (${d.verdict}) أُعطي وجهة`);
  }
});

test('**والباحثُ يُساق إلى السوق باستعلامه** — لا صفحةٍ فارغة', () => {
  for (const s of ['خاصني سبّاك', 'كنقلب على حداد', 'بغيت ناكل شي سندويش']) {
    const t = targetOf(decideFor(s), s);
    assert.ok(t.url?.startsWith('/market?q='), `«${s}» ⇒ ${JSON.stringify(t)}`);
    assert.ok(t.url!.includes(encodeURIComponent(s)), `«${s}» ضاع استعلامُه`);
  }
});

test('**والعارضُ يُساق إلى النشر، والطالبُ لا** — الاتّجاهُ يبلغ الوجهة', () => {
  assert.equal(targetOf(decideFor('عندي دار للكراء'), 'عندي دار للكراء').page, 'publish');
  assert.notEqual(targetOf(decideFor('بغيت نكري دار'), 'بغيت نكري دار').page, 'publish');
});

// ── ② لا مركِّبَ ثانٍ — SOURCE_SHAPE معلَن ─────────────────────
test('**لا شاشةَ تركّب الطبقاتِ بنفسها** (SOURCE_SHAPE معلَن)', () => {
  // يُعلَن أنّه حارسُ شكل: «كم مالكًا للوجهة» خاصّيّةٌ بنيويّةٌ لا تُقاس من
  //   مخرجٍ واحد — شاشةٌ تركّب الطبقاتِ بنفسها قد **توافق** اليوم وتخالف غدًا.
  //   وهو **إضافيٌّ** لا وحيد: الحصيلةُ محروسةٌ سلوكيًّا أعلاه.
  for (const f of SURFACES) {
    const code = strip(read(f));
    assert.doesNotMatch(code, /\babilityFor\s*\(/, `${f}: ينادي الكتالوجَ مباشرةً`);
    assert.doesNotMatch(code, /\bdecideExecution\s*\(/, `${f}: يركّب الحكمَ بنفسه`);
    assert.match(code, /\bdecideFor\s*\(/, `${f}: لا يسأل المالكَ الواحد`);
  }
});

test('**وصفحةُ الدخول تنفّذ ما قُرِّر ولا تُعيد اشتقاقَه**', () => {
  const code = strip(read('src/pages/AuthPage.tsx'));
  // الوجهةُ تُقرأ من الرحلة المحمولة، لا تُبنى من اتّجاهٍ مخزَّن.
  assert.match(code, /j\?\.target\?\.page|j\?\.target\?\.url/, 'لا تقرأ الوجهةَ المحمولة');
  assert.doesNotMatch(code, /\babilityFor\s*\(|\bdecideExecution\s*\(/, 'تركّب الحكمَ بنفسها');
  // والرحلةُ تُستهلَك كاملةً — لا مفتاحًا منها.
  assert.match(code, /clearJourneyState\(\)/, 'لا تُستهلَك الرحلةُ كاملةً');
});

// ── ③ المحادثةُ تعبر الملاحةَ ولا تحمل وجهةً مخبوزة ──────────────
test('**والمساعدُ لا يُلاحق بلا حكم** — لا سقوطَ إلى وجهةٍ مخبوزة', () => {
  // العائلةُ ⑤ كانت تعود من باب الاستعادة: `lastRef` في الذاكرة وحدَها،
  //   فكلُّ محادثةٍ مُستعادةٍ تفقد النصَّ وتسقط إلى `r.page`/`r.url`.
  const code = strip(read('src/pages/AssistantPage.tsx'));
  const goTo = (code.match(/const goTo = \([\s\S]*?\n  \};/) || [''])[0];
  assert.ok(goTo.length > 200, 'لم يُعثَر على `goTo` — الحارسُ يقيس فراغًا');
  assert.doesNotMatch(goTo, /\br\.page\b|\br\.url\b/,
    '`goTo` يسقط إلى وجهةِ `NeedResult` بلا حكم — العائلةُ ⑤ تعود');
  assert.match(goTo, /if \(!text\)/, 'لا حدَّ لغياب النصّ — تُخترَع وجهةٌ لطلبٍ غيرِ موجود');
  // والرسالةُ تحمل نصَّها، وإلّا فالحدُّ أعلاه يقتل زرًّا يعمل.
  assert.match(code, /interface Msg \{[^}]*\braw\?: string/, '`Msg` بلا نصٍّ يُحكَم عليه');
  assert.match(code, /goTo\(m\.result!, m\.raw\)/, 'النصُّ محمولٌ ولا يُمرَّر');
});

test('**وحوارُ المساعد ينجو من الملاحة ويموت مع الرحلة**', () => {
  const code = strip(read('src/pages/AssistantPage.tsx'));
  assert.match(code, /readState<Msg\[\]>\('amanzine_assistant'\)/, 'الحوارُ لا يُستعاد بعد التنقّل');
  assert.match(code, /writeState\('amanzine_assistant'/, 'الحوارُ لا يُحفَظ');
  // ولا مفتاحَ خارجَ السجلّ: النطاقُ والمدّةُ مُعلَنان أو لا يُكتَب أصلًا.
  const k = CLIENT_STATE.find(x => x.key === 'amanzine_assistant');
  assert.ok(k, 'مفتاحُ حوارِ المساعد غيرُ مُعلَنٍ في السجلّ');
  assert.equal(k!.scope, 'journey', 'حوارُ المساعد بنطاقٍ يتجاوز الرحلة');
  assert.equal(k!.ttlMs, JOURNEY_TTL, 'حوارُ المساعد بلا مدّة');
});

test('**ومسحُ المحادثة يبلغ المخزَن فعلًا** — لا شرطَ كاذبٍ دائمًا', () => {
  // كان السطرُ `clearJourneyState.length && clearState(…)`، و`.length` طولُ
  //   **مُعاملات الدالّة** = صفر، فالشرطُ كاذبٌ أبدًا والمسحُ لا يقع.
  const code = strip(read('src/pages/LivingHome.tsx'));
  assert.doesNotMatch(code, /clearJourneyState\.length/,
    'عاد شرطٌ يقرأ طولَ مُعاملاتِ دالّةٍ — حارسٌ كاذبٌ دائمًا');
  assert.match(code, /else clearState\('amanzine_conversation'\)/, 'المسحُ غيرُ موصول');
});

test('**والراوترُ ينفّذ ولا يفسّر** — `decide.ts` لا يلمس الملاحة', () => {
  const code = strip(read('src/lib/decide.ts'));
  for (const mech of ['navigate(', 'setPage(', 'window.location', 'sessionStorage', 'localStorage']) {
    assert.ok(!code.includes(mech), `المالكُ الواحد يلمس ميكانيكا الملاحة: ${mech}`);
  }
});
