import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNeed } from '../../src/lib/needEngine';
import { stanceOf } from '../../src/lib/akg/kb';

// ============================================================
// التوجيه — أيّ صفحةٍ يفتح المحرّك، ولماذا.
// خلفيّة: كان المحرّك يقرأ الاتّجاه بقائمةٍ خاصّةٍ به (WANT) أفقر من قائمة
// طبقة المعرفة، فيختلف العقلان على نفس الجملة: «أبحث عن سبّاك» يُقرأ إعلانًا
// عن النفس فيُفتَح النشرُ لمن جاء يبحث. الاتّجاه صار مصدرًا واحدًا.
// ============================================================

const dest = (q: string) => { const r: any = parseNeed(q, {}); return r.page || r.url || '—'; };
const intent = (q: string) => (parseNeed(q, {}) as any).intent;

// ── الطلب لا يُفتَح له نشرٌ أبدًا ─────────────────────────────
const SEEK_PHRASES = [
  'أبحث عن سباك', 'ابحث عن حداد', 'محتاج نجار', 'خاصني بناي', 'أريد كوافير',
  'شكون عندو سباك', 'واش كاين شي حداد', 'فين كاين نجار', 'عافاك بغيت سباك',
];

test('الطلب لا يُلقى في صفحة النشر ولا الإعدادات', () => {
  for (const q of SEEK_PHRASES) {
    assert.equal(stanceOf(q), 'seek', `«${q}» يجب أن تُقرأ طلبًا`);
    const d = dest(q);
    assert.notEqual(d, 'publish', `«${q}» فُتح لها النشر`);
    assert.notEqual(d, 'settings', `«${q}» فُتحت لها الإعدادات`);
    assert.equal(intent(q), 'find_pro', `«${q}» ليست find_pro`);
  }
});

test('حِرفةٌ وحدها بلا اتّجاه ⇒ سؤالٌ واحد لا تخمين', () => {
  for (const q of ['سباك', 'حداد', 'نجار', 'حلاق']) {
    const r: any = parseNeed(q, {});
    assert.equal(stanceOf(q), 'unknown');
    assert.notEqual(r.page, 'publish', `«${q}» خُمّن أنّه إعلانٌ عن النفس`);
    assert.ok(r.steps?.[0]?.options?.length === 2, `«${q}» بلا سؤالٍ توضيحيّ`);
    // الخياران: يبحث ← السوق · يَعرض ← النشر
    const opts = r.steps[0].options;
    assert.ok(opts.some((o: any) => (o.url || '').startsWith('/market')));
    assert.ok(opts.some((o: any) => o.page === 'publish'));
  }
});

// ── العرض يذهب للنشر ─────────────────────────────────────────
test('العرض الصريح يفتح النشر', () => {
  assert.equal(stanceOf('أنا حداد'), 'offer');
  assert.equal(dest('أنا حداد'), 'publish');
  assert.equal(intent('أنا حداد'), 'create_service');
});

test('فعلُ العرض يغلب أداةَ الطلب: «بغيت نبيع» بيعٌ لا بحث', () => {
  assert.equal(stanceOf('بغيت نبيع طوموبيل'), 'offer');
  assert.equal(intent('بغيت نبيع طوموبيل'), 'sell');
  assert.equal(dest('بغيت نبيع طوموبيل'), 'publish');
  // والعكس محفوظ: الشراء يبقى شراءً
  assert.equal(intent('بغيت نشري طوموبيل'), 'buy');
});

// ── الشكوى طلبُ مساعدةٍ لا عرض ───────────────────────────────
test('الشكوى بكلّ صيغها تُقرأ طلبًا', () => {
  for (const q of ['عندي مشكل فالثلاجة', 'لدي مشكل في الثلاجة', 'الثلاجة ما بقاتش خدامة', 'الحاسوب تعطل']) {
    assert.equal(stanceOf(q), 'seek', `«${q}»`);
    assert.notEqual(dest(q), 'publish', `«${q}» فُتح لها النشر`);
  }
});

// ── لا «unknown» حين يُعرَف الاتّجاه ──────────────────────────
test('اتّجاهٌ معروف ومجالٌ مجهول ⇒ سؤالٌ داخل المسار لا استسلام', () => {
  const seek: any = parseNeed('بغيت شي واحد يقاد ليا الضو', {});
  assert.notEqual(seek.intent, 'unknown');
  assert.ok(seek.steps?.[0]?.options?.length);

  // كانت هنا «انا كندير الحلويات» — وصارت مجالًا **معلومًا** (حلواني) منذ أن
  // صارت البضاعةُ تدلّ على الحرفة. فنقلناها إلى الحارس التالي، ووضعنا مكانها
  // جملةً لا تزال مجهولةَ المجال حقًّا، كي يبقى هذا الحارسُ يحرس ما بُني له.
  const offer: any = parseNeed('انا مزود خدمة', {});
  assert.notEqual(offer.intent, 'unknown');
  assert.equal(offer.intent, 'create_service');
  assert.ok(offer.steps?.[0]?.options?.length);
});

test('ومجالٌ معلومٌ لا يُسأل عن نفسه — لا سؤالَ تصنيفٍ للحلوانيّ', () => {
  // الوجهُ الآخر للحارس أعلاه، ومكتوبٌ في المحرّك حرفيًّا: أن يعرف التطبيقُ
  // أنّه حلّاقٌ ثمّ يسأله «واش نتا حرفيّ ولا مهنيّ؟» — «والسحرُ يموت هناك».
  // كان الحلوانيُّ يُسأل لأنّ «كندير الحلويات» لم تكن تُحلّ أصلًا.
  const CLASSIFY = ['service_kind', 'problem_kind'];
  for (const s of ['انا كندير الحلويات', 'عندي محل حلاقة', 'عندي محل ديال الخضرة']) {
    const r: any = parseNeed(s, {});
    assert.notEqual(r.intent, 'unknown', `«${s}» استسلم`);
    assert.ok(!CLASSIFY.includes(r.steps?.[0]?.clarifyId || ''),
      `سُئل عن مجالٍ يعرفه: «${s}»`);
  }
});

// ── العقار ───────────────────────────────────────────────────
test('العقار: العرض ينشر، والطلب يبحث', () => {
  assert.equal(dest('عندي دار للكراء'), 'publish');
  assert.equal(intent('عندي دار للكراء'), 'rent');
  assert.equal(intent('بغيت نكري دار'), 'rent');
  assert.notEqual(dest('بغيت نكري دار'), 'publish');
});

test('الرهن ليس بيعًا', () => {
  const r: any = parseNeed('عندي دار للرهن', {});
  assert.match(r.label, /رهن/);
  assert.ok(r.tags.some((t: string) => t.includes('رهن')));
});

// ── «عندي محل …» يُفهَم مع مجاله ──────────────────────────────
test('«عندي محل لـ…» تُقرأ عرضًا في كلّ صياغاتها', () => {
  for (const q of ['عندي محل لبيع الملابس', 'عندي محل لإصلاح الحواسيب', 'عندي محل للمأكولات', 'عندي محل لغسيل السيارات']) {
    assert.equal(stanceOf(q), 'offer', `«${q}»`);
    assert.notEqual(intent(q), 'unknown', `«${q}» لم تُفهَم`);
  }
});

test('«مطعم» بنيّة البحث لا تفتح إعدادات المتجر', () => {
  assert.notEqual(dest('بغيت مطعم'), 'settings');
  assert.notEqual(dest('فين كاين شي مطعم'), 'settings');
});
