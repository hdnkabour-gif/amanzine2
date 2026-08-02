// ────────────────────────────────────────────────────────────────
// «هل الذكاءُ متاح؟» — جوابٌ واحد
//
// كان السؤالُ يُجاب في أربعةِ مواضعَ بثلاثةِ أجوبةٍ مختلفة:
//   ChatImportPage · SystemCheck · MessagesPage  →  openai || gemini فقط
//   ProductsPage                                 →  المزوّدون الستّة
//
// والخادمُ (`routes/ai.js:_providerOrder`) يقبل الستّةَ جميعًا. فتاجرٌ موصولٌ
// بـClaude وDeepSeek وحدَهما — وهما معروضان في «ربط الخدمات»، وDeepSeek
// موسومٌ «الأفضل للدارجة» — يُقال له «بدون مفتاح AI» في ثلاثِ شاشات، بينما
// وصفُ المنتجات يعمل عنده. المفتاحُ موجودٌ والواجهةُ لا تعرف.
//
// الترتيبُ هنا هو ترتيبُ `AI_PROVIDERS` في الخادم حرفيًّا.
// ────────────────────────────────────────────────────────────────

export const AI_PROVIDERS = ['openai', 'gemini', 'claude', 'deepseek', 'grok', 'mistral'] as const;
export type AiProvider = typeof AI_PROVIDERS[number];

const KEY_FIELD: Record<AiProvider, string> = {
  openai:   'apiKey',
  gemini:   'geminiKey',
  claude:   'claudeKey',
  deepseek: 'deepseekKey',
  grok:     'grokKey',
  mistral:  'mistralKey',
};

export const AI_LABEL: Record<AiProvider, string> = {
  openai:   'OpenAI',
  gemini:   'Gemini',
  claude:   'Claude',
  deepseek: 'DeepSeek',
  grok:     'Grok',
  mistral:  'Mistral',
};

/** لا نستورد `AppSettings`: هذا الملفُّ يقرأ حقولًا بأسمائها فقط، فيقبل أيَّ شكل. */
type WithAi = { ai?: unknown } | undefined | null;

/** كلُّ المفاتيح المخزَّنة، بمُعرِّفات الخادم. الفارغةُ محذوفة. */
export function aiKeys(settings: WithAi): Partial<Record<AiProvider, string>> {
  const ai = (settings?.ai || {}) as Record<string, unknown>;
  const out: Partial<Record<AiProvider, string>> = {};
  for (const p of AI_PROVIDERS) {
    const v = ai[KEY_FIELD[p]];
    if (typeof v === 'string' && v.trim()) out[p] = v.trim();
  }
  return out;
}

/** المزوّدون المتاحون بترتيب الخادم — المفضَّلُ أوّلًا إن كان موصولًا. */
export function aiProviders(settings: WithAi): AiProvider[] {
  const keys = aiKeys(settings);
  const preferred = (settings?.ai as Record<string, unknown> | undefined | null)?.provider as AiProvider | undefined;
  const rest = AI_PROVIDERS.filter(p => p !== preferred && keys[p]);
  return preferred && keys[preferred] ? [preferred, ...rest] : rest;
}

/** هل يستطيع الخادمُ أن يجيب بذكاءٍ حقيقيّ؟ */
export function hasAI(settings: WithAi): boolean {
  return aiProviders(settings).length > 0;
}

/** اسمُ المزوّد الذي سيُستعمل فعلًا — للعرض. `null` حين لا مفتاح. */
export function aiProviderName(settings: WithAi): string | null {
  const [first] = aiProviders(settings);
  return first ? AI_LABEL[first] : null;
}

// ── توليدُ الصور: مجموعةٌ أضيقُ ──────────────────────────────────
// `routes/ai.js` يولّد الصورَ عبر dall-e-3 · gemini-2.5-flash-image ·
// grok-2-image وحدَها. سؤالٌ آخرُ غيرُ «هل الذكاءُ متاح؟»، وجوابُه هنا كذلك
// حتّى لا يُشتقّ يدويًّا في صفحةٍ ما.
export const IMAGE_PROVIDERS: readonly AiProvider[] = ['openai', 'gemini', 'grok'];

export function imageAiProviders(settings: WithAi): AiProvider[] {
  return aiProviders(settings).filter(p => IMAGE_PROVIDERS.includes(p));
}

export function hasImageAI(settings: WithAi): boolean {
  return imageAiProviders(settings).length > 0;
}
