import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand, stanceOf } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { readHuman } from '../../src/lib/humanIntent';
import { normArabic, normLoose, normLatin, collapseRepeats, unifyLetters, stripDiacritics } from '../../src/lib/normalize';

// ============================================================
// التطبيع — **الحارسُ التفاضليّ**.
//
//   لا يختبر هذا الملفُّ دالّةً، بل **قاعدةً**: صيغتان لا يفرّق بينهما
//   مغربيٌّ يجب أن تُعطيا نفسَ النتيجة، من كلّ مدخل.
//
//   وُلد من قياسٍ على ٧٤ حالةً أعطى ١١ اختلافًا، أخطرُها:
//       عندي مشڭل ف الضو  ⇒ طلبُ كهربائيٍّ صار **عرضَ خدمة**
//   بسبب حرفٍ واحدٍ من لوحة مفاتيحَ مغربيّةٍ شائعة. وكان السببُ اثني عشرَ
//   مطبِّعًا بخمسة مستويات، أضعفُها في الطريق الموصول بالشاشة.
//
//   والاختبارُ **مُولِّد** لا قائمةُ حالات: يضرب جملًا حقيقيّةً في تحويلاتٍ
//   لا معنى لها عند الإنسان. فأيُّ مطبِّعٍ جديدٍ أضعفَ يسقط هنا مهما كان
//   موضعُه — وهذا ما لا تفعله اختباراتُ الحالات المفردة.
// ============================================================

const SENTENCES = [
  'انا خضار', 'عندي محل ديال الخضرة', 'بغيت نبيع طوموبيل', 'كنقلب على سباك',
  'الفريجيدير ما كيخدمش', 'بغيت نبدل رقم الهاتف', 'عندي دار للكراء',
  'بغيت ميكانيكي ف الدار البيضاء', 'بغيت سباك ف طنجة', 'عندي مشكل ف الضو',
  'بغيت نشري كسوة لبنتي', 'واش كاين التوصيل', 'شحال الثمن', 'بغيت نحيد هاد المحل',
  'قال ليا الزبون بغيت نرجع', 'ماشي بغيت نبيع', 'كيفاش نبيع قميص',
  'عندي حانوت ديال الحوت', 'بغيت نصبغ الدار', 'الماكينة ديال الخياطة خربات',
];

// تحويلاتٌ من الشارع لا من المختبر: لوحاتُ مفاتيحَ مختلفة، ومدُّ الحروف
// للتأكيد، وتشكيلٌ يضعه من يكتب بعناية.
const VARIANTS: [string, (s: string) => string][] = [
  ['همزةُ ألف', s => s.replace(/ا/g, (m, i) => i === 0 || s[i - 1] === ' ' ? 'أ' : m)],
  ['ة⇄ه',      s => s.replace(/ة/g, 'ه')],
  ['ه⇄ة',      s => s.replace(/ه(\s|$)/g, 'ة$1')],
  ['ى⇄ي',      s => s.replace(/ي(\s|$)/g, 'ى$1')],
  ['تشكيل',    s => s.replace(/([بتثجحخدذرزسشصضطظعغفقكلمنهوي])/g, '$1ّ')],
  ['مدُّ حرف', s => s.replace(/([ايو])/, '$1$1$1')],
  ['ڭ بدل ك',  s => s.replace(/ك/g, 'ڭ')],
];

/** بصمةُ الفهم من **كلّ** المداخل — لا من مدخلٍ واحدٍ فيخفى الانقسام. */
const fingerprint = (s: string) => [
  understand(s).service ?? '',
  understand(s).stance ?? '',
  (parseNeed(s, {}) as { intent: string }).intent,
  readHuman(s).intent,
  stanceOf(s),
].join('|');

test('صيغتان لا يفرّق بينهما إنسانٌ تُعطيان نفسَ الفهم', () => {
  const failures: string[] = [];
  for (const base of SENTENCES) {
    const ref = fingerprint(base);
    for (const [name, f] of VARIANTS) {
      const v = f(base);
      if (v === base) continue;
      const got = fingerprint(v);
      if (got !== ref) failures.push(`[${name}] «${base}»\n    الأصل  : ${ref}\n    المحوَّل: ${got}`);
    }
  }
  assert.deepEqual(failures, [],
    `اختلف الفهمُ بفارقٍ لا يراه الإنسان (${failures.length} حالة):\n${failures.join('\n')}`);
});

// ── طبقاتُ التطبيع ───────────────────────────────────────────
test('التشكيلُ والتطويلُ يسقطان — بما فيهما ما كانت النسخُ الضعيفة تفوته', () => {
  // `ٰ` (الألف الخنجريّة) و`ـ` (التطويل) كانتا خارجَ نطاق النسخ الضعيفة.
  assert.equal(stripDiacritics('مُحَمَّدٌ'), 'محمد');
  assert.equal(stripDiacritics('هٰذا'), 'هذا');
  assert.equal(stripDiacritics('سبــــاك'), 'سباك');
});

test('الحروفُ الفارسيّةُ في لوحات المفاتيح المغربيّة تُوحَّد', () => {
  // «ڭ» و«گ» يكتبهما المغاربةُ مكانَ الكاف. وهذا ما جعل «مشڭل» لا تُفهَم.
  assert.equal(unifyLetters('مشڭل'), 'مشكل');
  assert.equal(unifyLetters('گال'), 'كال');
  assert.equal(unifyLetters('ڤيديو'), 'فيديو');
  assert.equal(unifyLetters('پيتزا'), 'بيتزا');
});

test('المدُّ يُطوى من ثلاثةٍ فأكثر — ولا يُمَسّ الحرفُ المضاعف', () => {
  assert.equal(collapseRepeats('حلااااق'), 'حلاق');
  assert.equal(collapseRepeats('شحااال'), 'شحال');
  // «مدّ» و«ربّ» أصليّان — حرفان لا ثلاثة.
  assert.equal(collapseRepeats('اللي'), 'اللي');
  assert.equal(collapseRepeats('محمد'), 'محمد');
});

test('العربيُّ يحذف غيرَ العربيّ، والفضفاضُ يُبقيه', () => {
  // الفرقُ **الوحيدُ المشروع** بين المطبِّعَين: فهرسُ المفاهيم يريد عربيّةً
  // صافية، و`needEngine` يقرأ الفرنسيّةَ وأسماءَ المدن فيموت لو حُذفت.
  assert.equal(normArabic('بغيت plombier'), 'بغيت');
  assert.equal(normLoose('بغيت plombier'), 'بغيت plombier');
  assert.equal(normLatin('Café à côté'), 'cafe a cote');
});

test('التطبيعُ ثابت (idempotent) — تكرارُه لا يغيّر شيئًا', () => {
  // شرطٌ ضروريّ: النصُّ يمرّ على أكثر من طبقةٍ ويُطبَّع أكثر من مرّة.
  for (const s of ['أنا خَضّار ف الدّار البيضااااء', 'مشڭل ف الضو', 'Café']) {
    assert.equal(normLoose(normLoose(s)), normLoose(s), `normLoose غيرُ ثابتة على «${s}»`);
    assert.equal(normArabic(normArabic(s)), normArabic(s), `normArabic غيرُ ثابتة على «${s}»`);
  }
});

test('الفارغُ لا يُسقط شيئًا', () => {
  for (const f of [normArabic, normLoose, normLatin, collapseRepeats, unifyLetters, stripDiacritics]) {
    assert.equal(f(''), '');
    assert.equal(f(undefined as unknown as string), '');
  }
});
