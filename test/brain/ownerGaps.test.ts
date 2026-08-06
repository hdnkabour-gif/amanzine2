import { test } from 'node:test';
import assert from 'node:assert/strict';
import { understand } from '../../src/lib/akg/kb';
import { resolveConcept } from '../../src/lib/akg/kb/knowledge';
import { parseNeed } from '../../src/lib/needEngine';
import { abilityFor, ABILITIES, ENTITY_VERBS } from '../../src/lib/abilities';

// ============================================================
// **الثغراتُ الباقيةُ من جملِ صاحب المشروع — أُغلقت.**
//
//   كلُّها من قياسٍ على جملٍ حقيقيّة، وكلُّها من صنفٍ واحد: **طبقةٌ تعمل
//   ولا لغةَ تبلغها**. الصفحةُ مبنيّةٌ والمسارُ يعمل والحالةُ مُعلَنةٌ في
//   دورة الحياة — وينقص أن يُعرَف ما يقوله المغربيُّ حين يريدها.
// ============================================================

const act = (s: string) => {
  const u = understand(s) as any;
  return u.action ? `${u.action.verb}/${u.action.object}` : '—';
};
const ability = (s: string) => {
  const u = understand(s) as any;
  const r = parseNeed(s, {} as any) as any;
  return abilityFor({ action: u.action, intent: r?.intent })?.id;
};

// ── ① مفرداتٌ صامتة ──────────────────────────────────────────
test('«گلاص ومثلجات» — وصفٌ كاملٌ كان يُقابَل بـ«شنو نوع النشاط؟»', () => {
  // «عندي محل ديال گلاص ومثلجات فحي الألفة» لم تُقرأ مفهومًا إطلاقًا.
  for (const q of ['گلاص', 'الگلاص', 'مثلجات', 'ايس كريم', 'جيلاطي']) {
    assert.equal(resolveConcept(q)?.id, 'ice_cream_shop', `«${q}» ما زالت صامتة`);
  }
  assert.equal(understand('عندي محل ديال گلاص ومثلجات').service, 'ice_cream_shop');
});

test('و«تلفون» و«كنبة» و«فراش» و«بيزا» — ممّا يُطلَب يوميًّا', () => {
  assert.equal(resolveConcept('تلفون')?.id, 'mobile_phone');
  assert.equal(resolveConcept('كنبة')?.id, 'furniture_store');
  assert.equal(resolveConcept('فراش')?.id, 'bedding_and_home_textiles_store');
  assert.equal(resolveConcept('بيزا')?.id, 'restaurant');
});

test('**وما يملكه غيرُه لا يُنتزَع منه**', () => {
  // ادّعى `mobile_phone` أوّلًا «بورطابل» و«تيليفون» و«جوال» و«portable»
  // و«telephone» — وهي لمفهوم الإصلاح. فارتفعت التعارضاتُ خمسًا دفعةً
  // واحدة، والسقفُ لا يُرفَع: تُترَك للمالك الأوّل.
  assert.equal(resolveConcept('بورطابل')?.id, 'mobile_phone_repair');
  assert.equal(resolveConcept('تيليفون')?.id, 'mobile_phone_repair');
});

// ── ② «كازة» مدينةٌ يكتبها المغربيّ بالتاء المربوطة ───────────
test('«فكازة» تُقرأ الدارَ البيضاء كما «فكازا»', () => {
  // «أنا فكازة شحال توصلني الكوموند» — المدينةُ مقولةٌ ولم تكن تُقرأ.
  assert.equal(understand('أنا فكازة').city, 'الدار البيضاء');
  assert.equal(understand('أنا فكازا').city, 'الدار البيضاء');
});

// ── ③ الطردُ الراجعُ طلبٌ لا خدمةٌ تُعرَض ──────────────────────
test('**«عندي طرد راجع» ⇒ الطلبات — لا صفحةُ النشر**', () => {
  // كانت تُقرأ `create_service` ⇒ يُساق ليَعرض حرفةً مَن عنده إرجاع.
  // وحالةُ «مرتجع» مُعلَنةٌ في `deliveryStatus` — الكيانُ قائمٌ بلا كلمة.
  for (const s of ['عندي طرد راجع', 'عندي كولي رتور', 'رجعو ليا الطرد']) {
    assert.equal(act(s), 'view/orders', `«${s}» ما زالت تُقرأ عرضَ خدمة`);
    assert.equal(ability(s), 'VIEW_ORDERS');
  }
});

test('و«عندي» وحدَها تبقى ملكيّةً لا نظرًا', () => {
  // العباراتُ كاملةٌ لا كلماتٌ مفردة: توسيعُها يجعل كلَّ «عندي محل» طلبَ عرض.
  assert.notEqual(act('عندي محل ديال الخضرة'), 'view/orders');
  assert.equal(understand('عندي محل ديال الخضرة').service, 'greengrocer');
});

// ── ④ سؤالُ ثمن التوصيل عرضٌ لا بحثٌ عن حرفيّ ─────────────────
test('«شحال ثمن التوصيل» ⇒ شركاتُ التوصيل — لا «شنو محتاج بالضبط؟»', () => {
  assert.equal(act('شحال ثمن التوصيل'), 'view/delivery');
  assert.equal(ability('شحال ثمن التوصيل'), 'VIEW_DELIVERY_PROVIDERS');
  assert.equal(act('شحال كيسوا التوصيل'), 'view/delivery');
});

// ── ⑤ ربطُ القنوات — الصفحةُ قائمةٌ ولا كلمةَ تبلغها ──────────
test('**«بغيت نربط الواتساب» ⇒ صفحةُ الربط — لا صفحةُ النشر**', () => {
  assert.equal(act('بغيت نربط الواتساب ديالي بالحساب'), 'create/channel');
  const id = ability('بغيت نربط الواتساب ديالي بالحساب');
  assert.equal(id, 'CONNECT_CHANNEL');
  const a = ABILITIES.find(x => x.id === 'CONNECT_CHANNEL');
  assert.equal(a?.page, 'connections', 'قدرةٌ بلا بابٍ — أو ببابٍ خاطئ');
  assert.ok(ENTITY_VERBS.channel?.includes('create'), 'كيانٌ بلا أفعالٍ مُعلَنة');
});

test('و«وصل» المجرّدةُ لا تبتلع «فين وصلات الكوموند»', () => {
  // سبرٌ أوّلُ أضاف «وصل» فعلَ ربطٍ، فابتلعت «وصلات» وصار سؤالُ التتبّع
  // طلبَ إنشاء. نفسُ مصرف الكلمة العامّة — في قائمة الأفعال هذه المرّة.
  assert.equal(act('فين وصلات الكوموند ديالي'), 'view/orders',
    'سؤالُ التتبّع صار طلبَ إنشاء');
  assert.equal(act('وريني الطلبات'), 'view/orders');
});
