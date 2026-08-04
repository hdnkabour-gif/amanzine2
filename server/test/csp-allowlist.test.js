'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

// ============================================================
// سياسةُ الأمان لا تحجب ما يستعمله التطبيق.
//
//   **ثلاثُ مرّاتٍ وقع هذا الصنفُ بالذات:**
//     ① `accounts.google.com` — الدخولُ الاجتماعيُّ لا يفتح
//     ② `connect.facebook.net` — نفسُه
//     ③ `js.hcaptcha.com` — **وهذه أسوأُها**: الودجت مكتوبٌ والسكربتُ يُحقَن،
//        لكنّ النطاقَ محجوبٌ فيبقى المربّعُ فارغًا. ثمّ يضغط الزبونُ «أكّد»
//        فيُقال له «أكمل التحقّق الأمنيّ أولًا» — عن شيءٍ لا يراه.
//        **الطلبُ لا يُرسَل أبدًا في الإنتاج.**
//
//   وكلُّها تفشل **بصمت**: لا خطأ في الخادم، ولا رسالةٌ في الواجهة — سطرٌ في
//   وحدة تحكّم المتصفّح وحدَه. ولهذا لم يكتشفها أحدٌ إلّا بالاستعمال.
//
//   القانون: **كلُّ نطاقٍ خارجيٍّ يستدعيه كودُ الواجهة يجب أن تسمح به
//   السياسة.** يُقاس آليًّا لا يُتذكَّر.
// ============================================================

const root = join(__dirname, '..', '..');
const csp = readFileSync(join(root, 'server', 'index.js'), 'utf8');

/**
 * النطاقاتُ التي **تُحمَّل** لا التي تُذكَر.
 *
 *   أوّلُ صيغةٍ التقطت كلَّ `https://` في المصدر، فاتّهمت ثمانيةً وعشرين
 *   نطاقًا أغلبُها روابطُ توثيقٍ في `<a href>` (`console.anthropic.com`
 *   · `my.livo.ma` · `platform.openai.com`) ولوحاتُ مزوّدين. الرابطُ
 *   **لا يمرّ بالسياسة**: المتصفّحُ ينتقل إليه ولا يُحمّله داخل الصفحة.
 *   حارسٌ يتّهم بريئًا يُعطَّل بعد أسبوع.
 *
 *   فالمقيسُ هنا ثلاثةٌ فقط، وهي ما تحجبه السياسةُ فعلًا:
 *     • سكربتٌ يُحقَن (`script.src = …`)
 *     • نداءُ شبكةٍ (`fetch('https://…')`)
 *     • إطارٌ (`<iframe src=…>`)
 *   والصورُ خارجُها: `imgSrc` مفتوحٌ على `https:` كلِّه.
 */
function loadedHosts() {
  const out = new Set();
  const files = execSync(
    `find ${join(root, 'src')} -name '*.ts' -o -name '*.tsx'`, { encoding: 'utf8' }
  ).trim().split('\n').filter(Boolean);
  const PATTERNS = [
    /\.src\s*=\s*['\`"]https:\/\/([a-z0-9.-]+)/gi,   // سكربتٌ أو إطارٌ يُحقَن
    /fetch\(\s*['\`"]https:\/\/([a-z0-9.-]+)/gi,       // نداءُ شبكة
    /<iframe[^>]*src=\{?['\`"]https:\/\/([a-z0-9.-]+)/gi,
    /<script[^>]*src=['\`"]https:\/\/([a-z0-9.-]+)/gi,
  ];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const re of PATTERNS)
      for (const m of src.matchAll(re)) out.add(m[1].toLowerCase());
  }
  return out;
}

/**
 * نطاقاتٌ لا تمرّ عبر السياسة أصلًا، فذكرُها لا يعني تحميلًا:
 *   • `wa.me` و`api.whatsapp.com` — روابطُ `<a href>` تفتح تطبيقًا خارجيًّا
 *   • `openstreetmap.org` — رابطُ ملاحةٍ يفتح في تبويبٍ جديد
 *   • نطاقاتُ التوثيق والأمثلة في التعليقات
 */
const NAVIGATION_ONLY = [
  'wa.me', 'api.whatsapp.com', 'www.openstreetmap.org', 'openstreetmap.org',
  'maps.google.com', 'www.google.com', 'goo.gl',
];

test('كلُّ نطاقٍ خارجيٍّ يستدعيه العميلُ مسموحٌ في السياسة', () => {
  const allowed = [...csp.matchAll(/'https:\/\/([a-z0-9.*-]+)'/gi)].map(m => m[1].toLowerCase());
  const covers = (host) => allowed.some(a =>
    a === host || (a.startsWith('*.') && host.endsWith(a.slice(1))));

  const blocked = [...loadedHosts()]
    .filter(h => !NAVIGATION_ONLY.includes(h))
    .filter(h => !covers(h));

  assert.deepEqual(blocked, [],
    `نطاقاتٌ يستدعيها العميلُ وتحجبها السياسةُ في الإنتاج — تفشل بصمت: ${blocked.join(', ')}`);
});

test('hCaptcha مسموحٌ في كلّ التوجيهات التي يحتاجها', () => {
  // السكربتُ وحدَه لا يكفي: تحدّي hCaptcha كلُّه داخل إطار، ويتّصل بخادمه.
  // سماحٌ ناقصٌ = مربّعٌ يظهر ولا يعمل، وهو أسوأُ من غيابه.
  for (const dir of ['scriptSrc', 'frameSrc', 'connectSrc']) {
    const i = csp.indexOf(dir);
    assert.ok(i > 0, `التوجيه ${dir} غيرُ معرَّف`);
    const block = csp.slice(i, csp.indexOf('],', i));
    assert.ok(/hcaptcha/.test(block), `${dir} لا يسمح بـhCaptcha — المربّعُ لن يعمل`);
  }
});

test('المربّعُ يُرسَم صراحةً — لا مرّةً واحدةً عند تحميل السكربت', () => {
  // hCaptcha يمسح الصفحةَ عند تحميل سكربته فقط. فمن أغلق السلّةَ وفتحها
  // ثانيةً يجد الخانةَ فارغةً أبدًا — والزرُّ يرفض الطلبَ بلا سببٍ مرئيّ.
  const store = readFileSync(join(root, 'src', 'pages', 'Storefront.tsx'), 'utf8');
  assert.ok(/render=explicit/.test(store), 'السكربتُ يُحمَّل بالرسم التلقائيّ');
  assert.ok(/hcaptcha\?\.render|api\.render/.test(store), 'لا رسمَ صريحٌ للمربّع');
});
