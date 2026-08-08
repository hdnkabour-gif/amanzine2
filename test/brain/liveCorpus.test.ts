import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { readGround } from '../../src/lib/evidence';
import CORPUS from '../corpus/live-unknowns.json';

// ============================================================
// **جسدُ الكلام الحيّ** — ١٠٦ عباراتٍ كتبها مستخدمون حقيقيّون ولم تُفهَم.
//
//   مأخوذةٌ من «عقل المعرفة» في التطبيق الحيّ: ٢٢٠ بحثًا، **١٪ نسبة فهم**.
//   وهذا أثمنُ ما في المستودع كلِّه: ستُّمئةٍ من الاختبارات كتبتُها أنا أو
//   كتبها صاحبُ المشروع؛ هذه كتبها **الشارع**.
//
//   ── وأوّلُ قياسٍ لها كشف عطبًا في أداة القياس نفسِها ──
//   أعلن ٨٣٪ فهمًا. والسببُ أنّ `readGround` كانت تعدّ `intent === 'unknown'`
//   **نيّةً صريحة** — فكلُّ ما تُرجعه `parseNeed` بالمصرف الصريح يُحسَب نجاحًا.
//   «أحتاج من يصلح» (٦٩ مرّة) و«توصيل» و«salam» كلُّها عُدّت مفهومة.
//   والعددُ الصادق بعد الإصلاح: **٧٣٪ من العبارات · ٥٠٪ بالوزن**.
//
//   ── والحدُّ يرتفع ولا ينخفض ──
//   هذا الاختبارُ سقّاطةٌ لا هدف: يمنع أن يعود ما أُصلح. ورفعُ الحدّ يكون
//   بإصلاحٍ مقيس، لا بتعديل الرقم.
// ============================================================

interface Row { p: string; n: number; ground: string }
const rows: Row[] = (CORPUS as any).phrases.map(([p, n]: [string, number]) => {
  const u = understand(p) as any;
  let r: any = null;
  try { r = parseNeed(p, {} as any); } catch { /* المقياسُ لا يسقط بسقوطها */ }
  return { p, n, ground: readGround(p, u, r?.intent).ground };
});
const ok = (r: Row) => r.ground !== 'echo';
const weight = rows.reduce((s, r) => s + r.n, 0);

test('**٧٣٪ من كلام الشارع يُفهَم — والحدُّ سقّاطةٌ لا هدف**', () => {
  const hit = rows.filter(ok).length;
  const pct = Math.round(hit / rows.length * 100);
  assert.ok(pct >= 73, `نسبةُ الفهم نزلت إلى ${pct}٪ — رجع عطبٌ كان مُصلَحًا`);
});

test('وبالوزن — لأنّ عبارةً كُتبت ٦٩ مرّةً ليست كعبارةٍ كُتبت مرّة', () => {
  const w = rows.filter(ok).reduce((s, r) => s + r.n, 0);
  const pct = Math.round(w / weight * 100);
  assert.ok(pct >= 50, `الفهمُ بالوزن نزل إلى ${pct}٪`);
});

test('**والأعطابُ التي أُصلحت لا تعود** — كلٌّ منها كُتب بيد إنسان', () => {
  // كلُّ سطرٍ هنا كان `echo` قبل إصلاحٍ مقيسٍ في هذه الجلسة.
  const MUST: [string, string][] = [
    ['بغيت كسوى لبنتي', 'حرفٌ واحد: ة ⇄ ى'],
    ['بغيت شي كسوة لبنتي أنا فكازة', 'المفهومُ والمدينةُ معًا'],
    ['بغيت نشري كسوة لبنتي', 'الشراءُ الصريح'],
    ['كسوى لبنتي', 'بلا فعل'],
    ['bghit nakol', 'أرابيزي'],
    ['عندي مشكل في الطوموبيل', 'عطلٌ في سيّارة'],
    ['الماء كيقطر ضروري', 'عرَضٌ مستعجل'],
    ['بغيت اللي يصلح ليا الثلاجة', 'الثلّاجةُ التي كانت تُرسَل لبنّاء'],
  ];
  for (const [p, why] of MUST) {
    const u = understand(p) as any;
    let r: any = null; try { r = parseNeed(p, {} as any); } catch { /* noop */ }
    assert.notEqual(readGround(p, u, r?.intent).ground, 'echo', `«${p}» رجعت صدًى — ${why}`);
  }
});

test('**واقتراحاتُ التطبيق نفسِه تُفهَم** — الزرُّ من عندنا لا من عنده', () => {
  // قِيس أنّ «أحتاج من يصلح» — أكثرُ عبارةٍ في السجلّ بـ٦٩ مرّة — ليست جملةَ
  //   إنسان: هي نصُّ زرٍّ في `Explore.tsx`. أي أنّ **ثلثَ كلّ البحث في
  //   التطبيق كان زرَّنا يُرسل نصًّا لا يفهمه تطبيقُنا**.
  //
  //   ومنها «مطعم قريب» ⇒ كانت `create_store`: مَن يضغط «🍽️ مطعم» يُساق
  //   إلى **إنشاء مطعم**. والسببُ أنّ «قريب» لم تكن علامةَ طلب، فيبقى
  //   الاتّجاهُ مجهولًا ثمّ يُخمَّن عرضًا.
  const CHIPS = ['أريد شراء', 'أريد حجز موعد', 'مطعم قريب', 'خدمة توصيل', 'صيدلية قريبة'];
  for (const c of CHIPS) {
    const u = understand(c) as any;
    let r: any = null; try { r = parseNeed(c, {} as any); } catch { /* noop */ }
    assert.notEqual(readGround(c, u, r?.intent).ground, 'echo', `اقتراحُ «${c}» ما كيتفهمش`);
  }
  // **والقُربُ طلبٌ لا عرض** — ولا أحدَ يقول «مطعم قريب» وهو يفتح مطعمًا.
  let r: any = null; try { r = parseNeed('مطعم قريب', {} as any); } catch { /* noop */ }
  assert.notEqual(r?.intent, 'create_store',
    '«مطعم قريب» رجعت إنشاءَ مطعم — «قريب» ما بقاتش علامةَ طلب');
});

test('والسؤالُ عن التطبيق يُعرَف بالحروف اللاتينيّة كذلك', () => {
  // «chekoun neta» كتبها إنسانٌ حقيقيّ فسقطت في المصرف — وهي نفسُ «شكون نتا».
  //   ومَن كتب بحروفٍ لاتينيّةٍ ليس مستخدمًا من الدرجة الثانية.
  for (const p of ['chekoun neta', 'واش ممكن تعاونّي؟']) {
    const u = understand(p) as any;
    let r: any = null; try { r = parseNeed(p, {} as any); } catch { /* noop */ }
    assert.equal(readGround(p, u, r?.intent).ground, 'about_self', `«${p}» ما تقرّاتش سؤالًا عن التطبيق`);
  }
});
