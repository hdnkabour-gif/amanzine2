import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  understandRules, understandHybrid, shouldEscalate, detectLanguage,
  OfflineProvider, GeminiProvider, hasLLM,
} from '../../src/lib/understanding';

// ============================================================
// السقالة الهجينة — «مزوّد-محايد». نثبت أنّ الأرضيّة (القواعد) تعمل دائمًا،
// وأنّ الذكاء غير المُهيّأ لا يكسر شيئًا (سقوطٌ رشيق)، وأنّ العقد موحّد.
// ============================================================

test('العقد الموحّد: القواعد تُرجع الشكل المتوقّع', () => {
  const r = understandRules('khassni sbbak');
  assert.equal(r.source, 'rules');
  assert.equal(r.profession, 'سبّاك');           // اللاتينيّة وصلت عربيّةً
  assert.ok(Array.isArray(r.reasoning));
  assert.ok(r.confidence >= 0 && r.confidence <= 1);
});

test('كشف اللغة: عربيّة/دارجة-لاتينيّة/مختلط', () => {
  assert.equal(detectLanguage('بغيت نبيع'), 'darija');
  assert.equal(detectLanguage('bghit nbi3'), 'darija');   // أرقام-كحروف
  assert.equal(detectLanguage('bghit plombier f الدار'), 'mixed');
});

test('المزوّد الأرضيّ متاحٌ دائمًا؛ مزوّدات الذكاء غير مُهيّأة اليوم', () => {
  assert.equal(OfflineProvider.available(), true);
  assert.equal(GeminiProvider.available(), false);
  assert.equal(hasLLM(), false);
});

test('بوّابة التصعيد: الواضح لا يُصعّد، القصّة الطويلة الغامضة تُصعّد', () => {
  const clear = understandRules('الما كيقطر فالكوزينة');
  assert.equal(shouldEscalate('الما كيقطر فالكوزينة', clear), false);   // قواعد واثقة
  const story = 'أنا عبداللطيف من الدار البيضاء عندي محل صغير كنبيع ولكن ما عنديش زبناء';
  const base = understandRules(story);
  assert.equal(shouldEscalate(story, base), true);                      // قصّةٌ ضعيفة الأرضيّة
});

test('السقوط الرشيق: بلا مزوّد ذكاء، الهجين يُرجع أرضيّة القواعد', async () => {
  const story = 'ana abdellatif mn casa 3ndi bghit nlqa client w nbi3 chi mantoj';
  const r = await understandHybrid(story);
  assert.equal(r.source, 'rules');   // لا مفتاح ⇒ أرضيّة القواعد، لا انهيار
  assert.ok(Array.isArray(r.reasoning));
});

test('الهجين على حالةٍ واضحة يبقى قواعد (لا تصعيد بلا داعٍ)', async () => {
  const r = await understandHybrid('khassni sbbak');
  assert.equal(r.source, 'rules');
  assert.equal(r.profession, 'سبّاك');
});
