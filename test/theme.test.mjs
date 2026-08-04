import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ============================================================
// السمةُ تصل إلى الشاشة.
//
//   قياس: السمةُ كانت تُحفَظ في الإعدادات وفي `localStorage`، ويُحدَّث الحقلُ
//   في الحالة… **ولا تصل إلى DOM أبدًا**: لا `data-theme` على الجذر، ولا
//   قاعدةَ CSS واحدةً للفاتح في ١٠٩٠ سطرًا.
//
//   وهذا **أسوأُ من زرٍّ معطَّل**: المعطَّلُ يُرى فيُتجاهَل، وهذا يعمل ظاهريًّا
//   فيظنّ المستخدمُ أنّه ضغط خطأً، فيُعيد المحاولةَ مرّاتٍ ثمّ يستسلم.
//
//   ثلاثُ حلقاتٍ، وانقطاعُ أيٍّ منها يُعيد العطبَ صامتًا:
//     ① الحالةُ تكتب `data-theme` على الجذر
//     ② الـCSS يُعرّف ألوانَ الفاتح تحت ذلك المُحدِّد
//     ③ كلُّ لونٍ يمرّ عبر متغيّرٍ — وإلّا بقي مثبَّتًا مهما تغيّرت السمة
// ============================================================

const store = readFileSync(new URL('../src/store.tsx', import.meta.url), 'utf8');
const css   = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('① الحالةُ تكتب السمةَ على جذر الصفحة', () => {
  assert.ok(/documentElement\.setAttribute\(\s*['"]data-theme['"]/.test(store),
    'لا أحدَ يكتب data-theme — المبدّلُ يعمل والشاشةُ لا تتغيّر');
  assert.ok(/theme-color/.test(store),
    'شريطُ المتصفّح لا يتبع السمة — شريطٌ أسودُ فوق صفحةٍ بيضاء');
});

test('② الـCSS يعرف الوضعَ النهاريّ', () => {
  assert.ok(/:root\[data-theme="light"\]/.test(css),
    'لا قاعدةَ واحدةً للوضع النهاريّ — السمةُ تُكتَب ولا تُقرأ');
  // والألوانُ الأساسيّةُ كلُّها معادُ تعريفُها، وإلّا بقيت الشاشةُ نصفَ داكنة.
  const block = css.slice(css.indexOf(':root[data-theme="light"]'));
  for (const v of ['--void', '--panel', '--ink1', '--ink2', '--border'])
    assert.ok(new RegExp(`${v}\\s*:`).test(block), `${v} غيرُ معرَّفٍ للفاتح`);
});

test('③ لا لونَ أساسيٍّ مثبَّتٍ في الجذر خارج المتغيّرات', () => {
  // `body` يجب أن تأخذ لونَها من متغيّر، وإلّا لم تتغيّر مهما بُدِّلت السمة.
  const body = css.slice(css.indexOf('\nbody {'), css.indexOf('\nbody {') + 300);
  assert.ok(/background:\s*var\(/.test(body), 'خلفيّةُ body لونٌ مثبَّت');
  assert.ok(/color:\s*var\(/.test(body), 'لونُ نصِّ body مثبَّت');
});
