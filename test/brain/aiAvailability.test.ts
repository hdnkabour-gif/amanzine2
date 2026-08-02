import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aiKeys, aiProviders, hasAI, aiProviderName, hasImageAI, imageAiProviders } from '../../src/lib/aiAvailability';

// ============================================================
// «هل الذكاءُ متاح؟» — سؤالٌ كان له ثلاثةُ أجوبةٍ في أربعِ شاشات.
// هذه الاختباراتُ تحرس الجوابَ الواحد.
// ============================================================

test('تاجرٌ موصولٌ بـClaude وحدَه ذكاؤه متاح — كان يُقال له «بدون مفتاح»', () => {
  const s = { ai: { claudeKey: 'sk-ant-xxx' } };
  assert.equal(hasAI(s), true);
  assert.deepEqual(aiProviders(s), ['claude']);
  assert.equal(aiProviderName(s), 'Claude');
});

test('DeepSeek وحدَه كذلك — وهو الموسومُ «الأفضل للدارجة»', () => {
  const s = { ai: { deepseekKey: 'sk-xxx' } };
  assert.equal(hasAI(s), true);
  assert.equal(aiProviderName(s), 'DeepSeek');
});

test('المفضَّلُ أوّلًا — كترتيب الخادم', () => {
  const s = { ai: { apiKey: 'a', geminiKey: 'b', claudeKey: 'c', provider: 'claude' } };
  assert.deepEqual(aiProviders(s), ['claude', 'openai', 'gemini']);
  assert.equal(aiProviderName(s), 'Claude');
});

test('مفضَّلٌ بلا مفتاح لا يتصدّر — ولا يُسقط الباقي', () => {
  const s = { ai: { geminiKey: 'b', provider: 'claude' } };
  assert.deepEqual(aiProviders(s), ['gemini']);
});

test('المفتاحُ الفارغُ أو المسافةُ ليسا مفتاحًا', () => {
  assert.equal(hasAI({ ai: { apiKey: '' } }), false);
  assert.equal(hasAI({ ai: { apiKey: '   ' } }), false);
  assert.equal(hasAI({ ai: {} }), false);
  assert.equal(hasAI({}), false);
  assert.equal(hasAI(undefined), false);
  assert.equal(hasAI(null), false);
  assert.equal(aiProviderName({}), null);
});

test('المفاتيحُ تُقصّ ولا تُنقل بمسافاتها', () => {
  assert.deepEqual(aiKeys({ ai: { apiKey: ' sk-1 ', geminiKey: '' } }), { openai: 'sk-1' });
});

test('توليدُ الصور سؤالٌ آخرُ أضيق', () => {
  // Claude وDeepSeek وMistral لا يولّدون صورًا في `routes/ai.js`.
  const onlyClaude = { ai: { claudeKey: 'c' } };
  assert.equal(hasAI(onlyClaude), true);
  assert.equal(hasImageAI(onlyClaude), false, 'ذكاءٌ متاحٌ ≠ صورةٌ متاحة');

  const withGrok = { ai: { claudeKey: 'c', grokKey: 'g' } };
  assert.equal(hasImageAI(withGrok), true);
  assert.deepEqual(imageAiProviders(withGrok), ['grok']);
});
