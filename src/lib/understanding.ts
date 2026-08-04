// ============================================================
// Understanding — السقالة الهجينة «مزوّد-محايد». التطبيق لا يعرف Gemini ولا GPT؛
//   يعرف فقط understandHybrid()/understandRules(). تبديل المزوّد غدًا = ملفٌ واحد،
//   بلا مسّ أيّ صفحةٍ أو Hook. إضافةٌ فوق الموجود (تحترم الـ Freeze).
//
//   الطبقات (كما أقرّها المالك):
//   ① فائقة السرعة  — قواعد (سبّاك/بغيت نبيع…) ≈ 0ms.        [rules]
//   ② تطبيع        — deArabizi (bghit→بغيت، 3andi→عندي).     [rules]
//   ③ ذكاء (LLM)   — فقط للصعب (قصص/خلط لغات/غموض)، يُرجع JSON. [provider]
//   ④ دماغ AMANZINE — يحوّل الفهم إلى قرارٍ وتجربة (خارج هذا الملفّ: decideInterface).
//
//   قرارٌ حاسم: الذكاء **يفهم**، وAMANZINE **يقرّر**. المزوّدات اليوم Stub بلا مفتاح
//   ⇒ available()=false ⇒ السقوط الرشيق إلى القواعد (أرضيّةٌ تعمل دائمًا، حتى بلا شبكة).
// ============================================================

import { understand } from './akg/kb';
import { resolveCity } from './akg/kb/knowledge';
import { readHuman, type HumanIntent } from './humanIntent';

// ── العقد الموحّد (نفس شكل مخرجاتنا الحاليّة + reasoning + المصدر) ──
export type UnderLang = 'darija' | 'ar' | 'fr' | 'en' | 'mixed';

export interface UnderstandingResult {
  intent: HumanIntent;
  profession?: string;   // label المهنة إن وُجدت
  problem?: string;      // name المشكلة إن وُجدت
  city?: string;
  object?: string;       // ما يريد بيعه/شراءه (يملؤه الذكاء غالبًا)
  language: UnderLang;
  confidence: number;    // 0..1
  reasoning: string[];   // خطوات مفسّرة — لِ«فهمت عليك لأنّك قلت ✓… ✓…»
  source: 'rules' | 'llm';
}

// ── Memory Engine (سياقٌ يُمرَّر للذكاء ليصير الفهم أدقّ) ──
export interface UnderstandingContext {
  recentMessages?: string[];  // آخر ما كتبه المستخدم
  lastSearch?: string;
  city?: string;
  activity?: string;          // نوع النشاط (تاجر أدوات كهربائيّة…)
  language?: UnderLang;
  image?: string;             // Vision — صورة base64 (data:) اختياريّة
}

// ── واجهة المزوّد — الكلّ يحقّقها (Gemini/GPT/Claude/Offline) ──
export interface UnderstandingProvider {
  name: string;
  available(): boolean;
  understand(text: string, ctx?: UnderstandingContext): Promise<UnderstandingResult | null>;
}

// كشف اللغة (تقدير سريع — يفيد الذكاء والواجهة).
export function detectLanguage(text: string): UnderLang {
  const arabic = /[؀-ۿ]/.test(text);
  const latin = /[a-z]/i.test(text);
  if (arabic && latin) return 'mixed';
  if (arabic) return 'darija';
  if (latin) return /[3792]/.test(text) ? 'darija' : 'mixed'; // أرقام-كحروف ⇒ دارجة لاتينيّة
  return 'ar';
}

// ── الطبقتان ①②: القواعد (متزامنة، فوريّة، للكتابة الحيّة) ──
export function understandRules(text: string, _ctx?: UnderstandingContext): UnderstandingResult {
  const u = understand(text);       // deArabizi مُطبَّقٌ داخله
  const h = readHuman(text);        // deArabizi مُطبَّقٌ داخله
  const reasoning = u.reasoning.slice();

  // النيّة: نفضّل قراءة الإنسان؛ فإن كانت NONE وله حاجةٌ محدّدة ⇒ HELP (يطلب مختصًّا).
  let intent = h.intent;
  if (intent === 'NONE' && (u.problem || u.profession)) {
    intent = 'HELP';
    reasoning.push('🎯 عندو حاجة محدّدة (مشكل/مختصّ) ⇒ يطلب مساعدة');
  } else if (intent !== 'NONE') {
    reasoning.push(`🎯 نيّة الإنسان: ${intent}`);
  }

  const confidence = Math.max(u.confidence, h.confidence);
  return {
    intent,
    profession: u.profession?.label,
    problem: u.problem?.name,
    city: u.city,
    language: detectLanguage(text),
    confidence,
    reasoning,
    source: 'rules',
  };
}

// المزوّد الأرضيّ — يعمل دائمًا (لا مفتاح، لا شبكة).
export const OfflineProvider: UnderstandingProvider = {
  name: 'offline',
  available: () => true,
  understand: async (text, ctx) => understandRules(text, ctx),
};

// المزوّد البعيد — نداءٌ واحد إلى الخادم `/api/ai/understand` الذي يعيد استعمال
// بنية aiChat (Gemini/GPT/Claude/DeepSeek) الموجودة. الخادم يختار المزوّد ويقرأ
// المفاتيح؛ إن لم يكن هناك مفتاحٌ يعيد { available:false } ⇒ نسقط للقواعد بأمان.
// تبديل المزوّد غدًا = إعداداتٌ في الخادم، لا مسّ لهذا الملفّ.
export const RemoteProvider: UnderstandingProvider = {
  name: 'remote',
  available: () => typeof fetch !== 'undefined',
  async understand(text, ctx) {
    try {
      const r = await fetch('/api/ai/understand', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // ذاكرة المحادثة: نمرّر آخر ما كتبه المستخدم (recentMessages) ليفهم الذكاء
        // «فالرباط» بعد «بغيت سبّاك». كان الحقل مُعرَّفًا ولا يملؤه أحد ⇒ فهمٌ بلا سياق.
        body: JSON.stringify({
          text, image: ctx?.image,
          recentMessages: (ctx?.recentMessages || []).slice(-6),
          context: { city: ctx?.city, activity: ctx?.activity },
        }),
      });
      if (!r.ok) return null;
      const j = await r.json();
      if (!j || !j.available || !j.result) return null;
      const u = j.result;
      const INTENT_MAP: Record<string, UnderstandingResult['intent']> = {
        find_pro: 'HELP', buy: 'BUY', sell: 'SELL', book: 'HELP',
        question: 'QUESTION', explore: 'EXPLORE', none: 'NONE',
      };
      return {
        intent: INTENT_MAP[String(u.intent || 'none')] || 'NONE',
        profession: u.service || undefined,
        problem: u.problem || undefined,
        // تطبيع المدينة: الذكاء قد يردّ «Casablanca»/«Casa» بينما القاعدة تخزّن
        // «الدار البيضاء» ⇒ بحثٌ بلا نتائج **بصمت**. resolveCity يفهم الشكلين.
        city: (u.city ? (resolveCity(String(u.city))?.city || u.city) : undefined) || undefined,
        object: undefined,
        language: (u.language || 'mixed') as UnderLang,
        confidence: typeof u.confidence === 'number' ? u.confidence : 0.7,
        reasoning: Array.isArray(u.reasoning) ? u.reasoning : [],
        source: 'llm',
      };
    } catch { return null; }   // شبكة/خادم ⇒ لا نكسر شيئًا، نسقط للقواعد
  },
};

// Stubs محفوظة (للتوثيق/الرجوع) — غير مستعملة في السلسلة.
function makeStubProvider(name: string): UnderstandingProvider {
  return { name, available: () => false, understand: async () => null };
}
export const GeminiProvider = makeStubProvider('gemini');
export const GPTProvider = makeStubProvider('gpt');
export const ClaudeProvider = makeStubProvider('claude');

// سلسلة المزوّدات: الخادم البعيد (يقرّر المزوّد الفعليّ داخليًّا).
const LLM_CHAIN: UnderstandingProvider[] = [RemoteProvider];

// بوّابة التصعيد — نرسل للذكاء فقط حين تضعف القواعد **و** يكون النصّ من النوع الصعب.
// (تحيّات/حالات واضحة ⇒ تبقى قواعد ⇒ الاستخدام ~١٠-٣٠٪ فقط.)
export function shouldEscalate(text: string, base: UnderstandingResult): boolean {
  const t = text.trim();
  if (t.length < 3) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  const arabic = /[؀-ۿ]/.test(t);
  const latin = /[a-z]/i.test(t);
  const mixed = arabic && latin;
  const longStory = words >= 6;              // قصّةٌ طويلة
  const weakFloor = base.confidence < 0.5;   // القواعد غير واثقة
  const unresolvedLatin = latin && !base.profession && !base.problem;
  // سردٌ حقيقيّ (≥٨ كلمات) = شغل الذكاء، حتى لو ظنّت القواعد أنّها حلّته — إذ قد
  // تختزل القصّة خطأً إلى مهنةٍ واحدةٍ واثقة. (بلا مزوّد ⇒ يسقط للقواعد بلا ضرر.)
  const veryLong = words >= 8;
  const fullyResolved = !!(base.profession && (base.problem || base.city));
  if (veryLong) return true;
  if (longStory && !fullyResolved) return true;
  return weakFloor && (mixed || unresolvedLatin);
}

// ── الطبقة ③: التنسيق الهجين (متزامن للقواعد، لا-متزامن للذكاء عند اللزوم) ──
export async function understandHybrid(text: string, ctx?: UnderstandingContext): Promise<UnderstandingResult> {
  const base = understandRules(text, ctx);
  // صورةٌ حاضرة ⇒ نُصعّد دائمًا (الرؤية شغل الذكاء)؛ وإلّا نتبع بوّابة التصعيد.
  if (!ctx?.image && !shouldEscalate(text, base)) return base;
  for (const p of LLM_CHAIN) {
    if (!p.available()) continue;
    try {
      const r = await p.understand(text, ctx);
      if (r) {
        rememberEscalation(text, r);
        return { ...r, reasoning: r.reasoning?.length ? r.reasoning : base.reasoning };
      }
    } catch { /* مزوّدٌ فشل ⇒ نجرّب التالي */ }
  }
  return base;                                            // الأرضيّة: القواعد دائمًا
}

/**
 * **ما فهمه الذكاءُ لا يُنسى.**
 *
 *   كانت الحلقةُ مقطوعةً هنا بالضبط: القواعدُ تعجز ⇒ يُسأل الذكاءُ ⇒ يُعرَض
 *   جوابُه للمستخدم ⇒ **يُرمى**. فتُسأل الكلمةُ نفسُها في كلّ مرّة، وإن انقطع
 *   الذكاءُ عاد الجهلُ كما كان.
 *
 *   ويُرسَل **اقتراحًا** لا حقيقة: يبقى `pending` حتّى يعتمده إنسانٌ من مركز
 *   المعرفة. القانون: **لا تعلُّمَ ذاتيّ.** ولو تعلّم النظامُ وحدَه لَورث
 *   أخطاءَ الذكاء بلا مراجعة، وهي أخطاءُ لغةٍ محلّيّةٍ لا يراها إلّا مغربيّ.
 */
function rememberEscalation(text: string, r: UnderstandingResult): void {
  try {
    if (typeof fetch === 'undefined') return;
    const suggestion = [r.profession, r.problem, r.object, r.intent].filter(Boolean).join(' · ');
    if (!suggestion) return;                       // جوابٌ فارغٌ ليس معرفة
    fetch('/api/ai/suggest-unknown', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ text: text.trim().slice(0, 200), suggestion, conceptId: r.profession || '' }),
    }).catch(() => { /* بلا شبكة ⇒ يبقى الجهلُ مسجَّلًا وحدَه */ });
  } catch { /* noop */ }
}

// هل يوجد مزوّد ذكاءٍ مُهيّأ؟ (لعرض حالةٍ في لوحة البيتا مثلًا.)
export function hasLLM(): boolean {
  return LLM_CHAIN.some(p => p.available());
}
