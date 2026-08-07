import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { parseNeed } from '../../src/lib/needEngine';
import { abilityFor } from '../../src/lib/abilities';
import { decideExecution } from '../../src/lib/executionPolicy';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';

// ============================================================
// **رحلةُ مستخدمٍ واحدٍ عبر أيّام** — جملٌ كتبها صاحبُ المشروع.
//
//   وهذه هي المدوّنةُ التي كانت تنقص: قِيس سابقًا أنّ مدوّنتَنا **أقلُّ من
//   ٤٪ مختلطة**، لأنّ جملَها كُتبت عندنا فتقيس ما نعرف أنّه يُفهَم. وهذه
//   كتبها إنسانٌ يستعمل التطبيق — فأسقطت سبعًا من تسعَ عشرة.
//
//   والرحلةُ نفسُها معنًى: الرجلُ يبيع كسوةً يومًا، ويقلّب على حدّادٍ يومًا،
//   ويدير محلَّه يومًا. **لا يقف عند مستوًى واحد** — وهذا ما كان يُقاس نصفَه.
// ============================================================

const judge = (s: string) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  const m = abilityFor({ action: u.action, intent: r?.intent, stance: u.stance });
  return { u, m, d: decideExecution(u, m || undefined, false) as any };
};

// ── ① «بغير» خطأٌ مطبعيٌّ ساق زبونًا إلى الإعدادات ────────────
test('**الفعلُ لا تدخل عليه «ب»** — سادسُ مواضع مصرف الكلمة العامّة', () => {
  // «**بغير** شي واحد كيبيع ورقة البسطيلة قريب ليا» — خطأٌ مطبعيٌّ في
  // «بغيت»، وفيها «غير» (بدِّل). فزبونٌ يقلّب على من يبيع ورقةَ البسطيلة
  // قربَه كان يُساق إلى **إعدادات حسابه**، وبحكم **تنفيذ** لا سؤال.
  const { u, m } = judge('بغير شي واحد كيبيع ورقة البسطيلة قريب ليا');
  assert.equal(u.action, undefined, `قُرئ فعلٌ إداريٌّ من خطأٍ مطبعيّ: ${u.action?.verb}/${u.action?.object}`);
  assert.equal(m?.id, 'FIND_PROVIDER');
  assert.equal(u.service, 'restaurant');
});

test('والسوابقُ العاطفةُ تبقى — الحدُّ ليس صممًا', () => {
  // «و» و«ف» تدخلان على الفعل، و«ب» و«ال» و«ل» لا. فالحدُّ يميّز لا يمنع.
  const act = (s: string) => { const u = understand(s) as any; return u.action && `${u.action.verb}/${u.action.object}`; };
  assert.equal(act('غير الثمن'), 'update/price');
  assert.equal(act('وبدل الثمن'), 'update/price');
  assert.equal(act('بغيت نمسح هاد المنتوج'), 'delete/product');
  assert.equal(act('بغيت نبدل النمرة ديال المحل'), 'update/phone');
});

// ── ② مفرداتٌ من الرحلة ───────────────────────────────────────
test('«التلفازة» عطبٌ منزليٌّ — والبارابولُ وحدَه كان معروفًا', () => {
  assert.equal(resolveConcept('تلفازة')?.id, 'tv_repair');
  assert.equal(understand('أنا فحي الألفة الدارالبيضاء عندي مشكل فالتلفازة').service, 'tv_repair');
  // والمدينةُ تُقرأ معها — الحيُّ والمدينةُ في جملةٍ واحدة.
  assert.equal(understand('أنا فحي الألفة الدارالبيضاء عندي مشكل فالتلفازة').city, 'الدار البيضاء');
});

test('«غوب» ثوبٌ — و«تزنيت» مدينةٌ تُكتَب بلا ياء', () => {
  assert.equal(resolveConcept('غوب')?.id, 'garment_dress');
  assert.equal(understand('بغيت شي غوب تكون زوينة قياس L أنا فتزنيت').city, 'تيزنيت');
  assert.equal(understand('بغيت شي غوب تكون زوينة قياس L أنا فتزنيت').service, 'garment_dress');
});

test('«يراجع مع بنتي» طلبُ دعمٍ مدرسيّ', () => {
  assert.equal(resolveConcept('بغيت اللي يراجع مع بنتي الفرنسية')?.id, 'private_tutor');
});

test('**و«مدرس» لا تُقرأ داخل «المدرسة»** — سابعُ المواضع، وأمسكه حارسُ الغايات', () => {
  // «مدرس» كانت في مفردات الأستاذ الخصوصيّ، وتقع داخل «ال**مدرس**ة». فصارت
  // «بنتي داخلة للمدرسة» تُقرأ طلبَ أستاذ ⇒ تُملأ حاجةُ «ما المطلوب» ⇒
  // **يسقط سؤالُ الغاية** الذي بُني لها.
  const u = understand('بنتي داخلة للمدرسة') as any;
  assert.equal(u.goal?.id, 'school');
  assert.equal(u.service, undefined, 'ابتلعت «المدرسة» مفهومَ الأستاذ الخصوصيّ');
});

// ── ③ ما تعمل من الرحلة — يُثبَّت كي لا يرتدّ ─────────────────
test('رحلةُ الأيّام: كلُّ يومٍ مستوًى مختلفٌ ويُقرأ', () => {
  const rows: [string, string][] = [
    ['كنقلب على حداد', 'FIND_PROVIDER'],
    ['أنا عندي محل ديال المسمن والحرشة', 'CREATE_WORKSPACE'],
    ['بغيت نبدل النمرة ديال المحل', 'CHANGE_PHONE'],
    ['بغيت نبدل السمية ديال المحل', 'UPDATE_WORKSPACE'],
    ['بغيت نشوف في وصلات الكوموند ديال طنجة', 'VIEW_ORDERS'],
    ['شحال ثمن التوصيل ديال خريبكة', 'VIEW_DELIVERY_PROVIDERS'],
    ['شحال ثمن التوصيل لمكناس', 'VIEW_DELIVERY_PROVIDERS'],
    ['كنطيب كسكسو كل نهار الجمعة', 'OFFER_SERVICE'],
    ['كنبيع حوايج', 'SELL_PRODUCT'],
    ['بغيت نزيد وصف و هاشتاڭ لهاد المنتوج', 'GENERATE_CONTENT'],
    ['بغيت نصايب تصويرة لهاد المنتوج', 'MANAGE_MEDIA'],
  ];
  for (const [s, want] of rows) {
    assert.equal(judge(s).m?.id, want, `«${s}» ⇒ ${judge(s).m?.id}`);
  }
});

test('والمدنُ الثلاثُ تُقرأ من جملها', () => {
  assert.equal(understand('بغيت نشوف في وصلات الكوموند ديال طنجة').city, 'طنجة');
  assert.equal(understand('شحال ثمن التوصيل ديال خريبكة').city, 'خريبكة');
  assert.equal(understand('شحال ثمن التوصيل لمكناس').city, 'مكناس');
});

test('والمحلُّ متعدّدُ الخدمات يُقرأ كلُّه', () => {
  const u = understand('عندي محل ديال لافاج كندير لافاج كومپلي و ستيكاج و ديطالين و برييون') as any;
  for (const need of ['car_wash', 'car_wrapping', 'car_painting']) {
    assert.ok((u.services || []).includes(need), `ضاعت خدمة: ${need} — قُرئ: ${(u.services || []).join(' · ')}`);
  }
});
