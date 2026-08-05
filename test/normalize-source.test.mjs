import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================
// حارسُ المصدر الواحد للتطبيع.
//
//   العطبُ لم يكن في وجود التطبيع بل في **تعدّده**: اثنا عشرَ ملفًّا بخمسة
//   مستويات، أضعفُها في `needEngine` و`humanIntent` — أي في الطريق الموصول
//   بالشاشة. فكانت «عندي مشڭل ف الضو» تُقرأ عرضَ خدمةٍ بدل طلبِ كهربائيّ.
//
//   ولأنّ كتابةَ مطبِّعٍ محلّيٍّ أسهلُ من البحث عن الموجود، يمنع هذا الحارسُ
//   عودةَ المستوى السادس. وهو `.mjs` لا `.ts` لأنّه يمسح **الملفّات** لا
//   السلوك، وحزمةُ اختبارات العقل لا تملك نظامَ الملفّات.
// ============================================================

const ROOT = new URL('..', import.meta.url).pathname;
const ALLOWED = 'src/lib/normalize.ts';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { walk(p, out); continue; }
    if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

test('توحيدُ الهمزة يعيش في مكانٍ واحد', () => {
  const bad = [];
  for (const p of walk(join(ROOT, 'src'))) {
    const rel = p.slice(ROOT.length);
    if (rel === ALLOWED) continue;
    const s = readFileSync(p, 'utf8');
    // نمطُ توحيد الهمزة بصِيَغِه: [أإآٱ] أو [إأآا] أو ما شابه.
    if (/replace\(\s*\/\[[أإآٱا]{3,}\]\/g/.test(s)) bad.push(rel);
  }
  assert.deepEqual(bad, [],
    `مطبِّعٌ محلّيٌّ جديد — والمصدرُ يجب أن يبقى واحدًا (${ALLOWED}):\n  ${bad.join('\n  ')}`);
});

test('طيُّ التكرار وحذفُ التشكيل كذلك', () => {
  const bad = [];
  for (const p of walk(join(ROOT, 'src'))) {
    const rel = p.slice(ROOT.length);
    if (rel === ALLOWED) continue;
    const s = readFileSync(p, 'utf8');
    if (/replace\(\s*\/\(\.\)\\1\{2,\}\/g/.test(s)) bad.push(rel + ' (طيُّ تكرار)');
    if (/replace\(\s*\/\[ً-ْٰـ\]\/g/.test(s)) bad.push(rel + ' (تشكيل)');
  }
  assert.deepEqual(bad, [], `عملياتُ تطبيعٍ خارجَ الوحدة:\n  ${bad.join('\n  ')}`);
});

test('الوحدةُ نفسُها موجودةٌ وتُصدّر الطبقات', () => {
  const s = readFileSync(join(ROOT, ALLOWED), 'utf8');
  for (const fn of ['stripDiacritics', 'unifyLetters', 'collapseRepeats', 'normArabic', 'normLoose', 'normLatin']) {
    assert.ok(new RegExp(`export function ${fn}\\b`).test(s), `${ALLOWED}: ينقص ${fn}`);
  }
});
