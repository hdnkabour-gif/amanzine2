'use strict';
// ============================================================
// وصلُ القمع — سقّاطةٌ على صنفٍ كاملٍ من الأعطاب:
//   **مستهلكٌ ينتظر حدثًا لا يُصدره أحد.**
//
//   `learning.js` كان يعدّ `business.contact` و`review.created` منذ اليوم
//   الأوّل، ولم يُصدِرهما أحدٌ قطّ: أزرارُ الاتّصال تفتح واتساب بلا خبر،
//   ونقطةُ التقييم تحفظ وتصمت. النتيجة: نسبتان في «عقل AMANZINE» تساويان
//   صفرًا إلى الأبد — لا لأنّ أحدًا لم يتّصل، بل لأنّ أحدًا لم يُخبر.
//
//   لا اختبارَ وحدةٍ يمسك هذا: كلُّ طرفٍ سليمٌ وحدَه. يُمسَك بفحص **الوصل**.
// ============================================================
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SERVER = path.join(ROOT, 'server');
const SRC = path.join(ROOT, 'src');

/** كلُّ ملفّات المصدر (بلا node_modules ولا اختبارات). */
function walk(dir, exts, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'test' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some(x => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

const FILES = [...walk(SERVER, ['.js']), ...walk(SRC, ['.ts', '.tsx'])];
const READ = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
const HAYSTACK = FILES.map(READ).join('\n');

// الملفّاتُ التي تُصدر فعلًا على الناقل — لا يكفي ورودُ اسم الحدث في تعليق.
// (الاسمُ قد يأتي في شرطٍ ثلاثيّ لا يسبقه `type:`، فالفحصُ على «ملفٌّ يُصدر
//  ويذكر الاسمَ منصوصًا» أدقُّ من مطابقةِ صيغةِ كتابةٍ بعينها.)
const EMITTER_SOURCES = FILES
  .map(f => READ(f))
  .filter(s => s.includes("engines/activity") && s.includes('.emit('));

// المراحلُ التي يعدّها Learning Loop، وكيف يصل كلٌّ منها فعلًا.
//   `emits` أنماطٌ تُثبت أنّ الحدثَ يُصدَر من مكانٍ ما في النظام: إمّا نصًّا
//   صريحًا في الخادم، أو عبر `/api/track` من الواجهة (kind.action).
const FUNNEL = require('../lib/engines/learning');

test('كلُّ مرحلةٍ في القمع لها مُصدِرٌ حقيقيّ — لا عدّادَ ينتظر إلى الأبد', () => {
  // المصدرُ الوحيد للأسماء هو المستهلكُ نفسُه: لا نُعيد كتابةَ القائمة هنا،
  // وإلّا لتباعد الاثنان بصمت — وهو عينُ العطب الذي نحرسه.
  const src = fs.readFileSync(path.join(SERVER, 'lib', 'engines', 'learning.js'), 'utf8');
  const types = [...src.matchAll(/'([a-z]+\.[a-z]+)':\s*'[a-z]+'/g)].map(m => m[1]);
  assert.ok(types.length >= 8, `لم تُقرأ خريطةُ القمع (${types.length})`);

  const missing = [];
  for (const type of types) {
    const [kind, action] = type.split('.');
    const emittedOnServer = EMITTER_SOURCES.some(s => s.includes(`'${type}'`));
    // مسارُ الواجهة: trackAPI.event({ kind:'business', action:'contact' }) ⇒
    // يبنيه الخادمُ في routes/track كـ `${kind}.${action}`.
    const emittedFromClient =
      new RegExp(`action:\\s*'${action}'`).test(HAYSTACK) &&
      new RegExp(`kind:\\s*'${kind}'`).test(HAYSTACK);
    if (!emittedOnServer && !emittedFromClient) missing.push(type);
  }
  assert.deepEqual(missing, [], `مراحلُ تُعَدّ ولا تُصدَر: ${missing.join(' · ')}`);
});

test('خريطةُ القمع تغطّي الرحلة كاملةً — لا مرحلةَ محذوفة', () => {
  const stages = new Set(Object.values(require('../lib/engines/learning').STAGE_OF || {}));
  // إن لم تُصدَّر الخريطة، نقرأ الدرجاتِ من المخرَج بدل التخمين.
  const expected = ['view', 'click', 'contact', 'booking', 'order', 'review'];
  if (stages.size) {
    for (const s of expected) assert.ok(stages.has(s), `المرحلة ${s} غائبةٌ عن الخريطة`);
  } else {
    const src = fs.readFileSync(path.join(SERVER, 'lib', 'engines', 'learning.js'), 'utf8');
    for (const s of expected) assert.ok(src.includes(`'${s}'`), `المرحلة ${s} غائبة`);
  }
});

test('التقييمُ يُصدِر حدثَه — العطبُ الأصليّ لا يعود صامتًا', () => {
  const listings = fs.readFileSync(path.join(SERVER, 'routes', 'listings.js'), 'utf8');
  assert.ok(/type:\s*'review\.created'/.test(listings),
    'POST /listings/:id/reviews يحفظ التقييمَ ولا يُصدِر review.created');
});

test('أزرارُ الاتّصال تُسجّل الاتّصال — أهمُّ خطوةٍ في القمع', () => {
  const profile = fs.readFileSync(path.join(SRC, 'pages', 'BusinessProfile.tsx'), 'utf8');
  assert.ok(/action:\s*'contact'/.test(profile),
    'صفحةُ النشاط تفتح واتساب/الهاتف بلا تسجيل business.contact');
  // ولا يكفي وجودُ الدالّة: يجب أن تكون **موصولةً** بزرّ.
  assert.ok(/onClick=\{markContact\}/.test(profile),
    'markContact معرّفةٌ وغيرُ موصولةٍ بأيّ زرّ');
});

void FUNNEL;
