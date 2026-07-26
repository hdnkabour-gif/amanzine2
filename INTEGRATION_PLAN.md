# AMANZINE — خطّة الدمج والتنفيذ (Integration Plan)

> مبدأ حاكم: **لا نعيد كتابة ما يعمل — نوسّعه.** كلّ خطوةٍ إضافيّةٌ، تتبع نمط الكود الحاليّ،
> ولا تكسر `needEngine`/`AssistantPage`/`understand`. مبنيّةٌ على تقرير `AUDIT_REPORT.md`.

---

## المرحلة 0 — تفعيل الذكاء (بلا كود · دقائق) ⚡ أولويّة 1
النقطة `/api/ai/understand` **جاهزة**. التفعيل الحيّ = متغيّر بيئةٍ واحد في Railway:
```
GEMINI_API_KEY = AIza...        # من https://aistudio.google.com/apikey (الأسهل)
# أو
DEEPSEEK_API_KEY = sk-...       # «الأفضل للدارجة» ورخيص
```
> ثمّ Railway يُعيد النشر تلقائيًّا. بلا مفتاح: التطبيق يعمل كاملًا بالقواعد (١٦٧ مفهوم) — لا انهيار.
> **رأيي:** ابدأ بـ**DeepSeek** للفهم النصّيّ (دارجة + رخيص)، واحتفظ بـ**Gemini** للرؤية (الصور).

## المرحلة 1 — عُقد الرسم داخل المفهوم 🧩 أولويّة 2
البيانات نصفها موجود (`services`/`fields`/`examples` في `knowledgeData.ts`). نُكمّل `questions`/`related`.
**التنفيذ (إضافيّ، حقول اختياريّة — لا مستهلكٌ يتغيّر):**
```ts
// knowledgeData.ts (يولّده الـparser) — نوسّع الواجهة
export interface ConceptData {
  id: string; category: string; concept: Record<string,string>;
  variants: Record<string,string[]>;
  services?: string[]; fields?: string[]; examples?: string[];
  questions?: string[];   // «واش كتغسل المحرك؟» — من examples/الخدمات
  related?: string[];     // ['car_polishing','car_service'] — بالفئة/التركيب
}
```
```ts
// knowledge.ts — دالّةٌ جديدة (لا تمسّ resolveConcept)
export function conceptGraph(id: string) {
  const c = CONCEPTS.find(x => x.id === id); if (!c) return null;
  const related = CONCEPTS.filter(x => x.id !== id && x.category === c.category)
    .slice(0, 5).map(x => ({ id: x.id, name: x.concept.ar }));
  return { id, name: c.concept.ar, services: c.services || [], questions: c.questions || [], related };
}
```
> الاستهلاك: `AssistantPage`/`Booking` يعرضان `questions` كخيارات نقر (نفس واجهة `steps` الموجودة).

## المرحلة 2 — Vision Engine (إعادة استعمال، لا من الصفر) 📷 أولويّة 3
`aiChat({imageUrl})` **يدعم الرؤية أصلًا** (OpenAI/Gemini/Claude). نضيف قبول صورةٍ في نفس النقطة:
```js
// server/routes/ai.js — داخل router.post('/understand') الموجود
const img = (typeof req.body?.image === 'string' && req.body.image.startsWith('data:')
  && req.body.image.length < 2_800_000) ? req.body.image : '';
const out = await aiChat({
  keys, provider: img ? 'gemini' : provider,   // Gemini قويٌّ بالرؤية ورخيص
  sysPrompt: img ? UNDERSTAND_SYS_VISION : UNDERSTAND_SYS,
  history: [], message: text || 'صف المشكلة في الصورة', imageUrl: img,
  maxTokens: 360, temperature: 0, jsonMode: true,
});
```
```
UNDERSTAND_SYS_VISION = UNDERSTAND_SYS + « إن وُجدت صورة: استخرج objects/brands/damage
ثمّ استنتج service. مثال: سيّارة+عجلة مثقوبة→mechanic. أعِد JSON فقط. »
```
**العميل:** زرّ «📷 صوّر المشكلة» → ضغط الصورة إلى 512×512 قبل الإرسال (تقليل التكلفة ~٨٠٪) → نفس `/understand`.
```ts
// ضغطٌ محلّيّ قبل الإرسال (توفير تكلفة — canvas)
async function shrink(file: File, max = 512): Promise<string> { /* رسم على canvas ثمّ toDataURL('image/jpeg',0.7) */ }
```
> **رأيي الصادق:** الرؤية أقوى ميزة جديدة، والبنية جاهزة. لكن **الذكاء آخِرًا**: نجرّب النصّ/القواعد
> أوّلًا، ونستدعي الرؤية فقط حين يرسل المستخدم صورةً عمدًا — لا مع كلّ طلب (تكلفة/كُمون).

## المرحلة 3 — Learning Engine (إغلاق حلقةٍ موجودة) 🔄 أولويّة 4
البيانات تُجمَع أصلًا: `journey.ts` يسجّل `unknownTexts` (`decisionStats().topUnknown`).
**الناقص = الحلقة:**
```
كلّ أسبوع: صدّر topUnknown (أكثر ما لم نفهمه)
        → مراجعةٌ بشريّة سريعة (مركز المعرفة الموجود /knowledge-studio)
        → أضِف السطح إلى variants المفهوم (نفس مسار matchApprovedMemory في akg/kb)
        → القاموس يكبر بلا كتابة قواعد عمياء.
```
> لا محرّك تعلّمٍ آليّ معقّد الآن — **حلقةٌ بشريّةٌ في المنتصف** (Human-in-the-loop) أدقّ وأأمن للبيتا.

## المرحلة 4 — Speech · Reasoning متعدّد الاحتمالات 🎤 أولويّة 5 (مؤجَّل)
- **Speech:** `POST /api/ai/transcribe` (Whisper/Gemini audio) → نصّ → نفس `understandHybrid`.
- **Reasoning:** `/understand` يُرجع `possible_questions` (بذرةٌ موجودة)؛ لاحقًا: عدّة فرضيّاتٍ باحتمالات + سؤالٌ يحسم.

---

## الحقائق الهندسيّة (تُحترَم في كلّ مرحلة)
1. **الكُمون:** القواعد فوريّة؛ الذكاء عند الحاجة فقط (`shouldEscalate`/صورة عمديّة). لا LLM لكلّ حرف.
2. **التكلفة:** ضغط الصور · Flash لا Pro · بوّابة تصعيد · Cache ⇒ الاستخدام ~١٠-٣٠٪.
3. **الأمان:** المفتاح على الخادم فقط · لا تخزين الصور (تحليلٌ فوريّ) · شفافيّةٌ للمستخدم.
4. **السقوط الرشيق:** بلا شبكة/مفتاح ⇒ القواعد أرضيّةٌ دائمة.

## خارطةٌ زمنيّةٌ واقعيّة (تطوّرٌ تدريجيّ، لا دفعةً واحدة)
| مرحلة | مدّة تقديريّة | مخرَج |
|---|---|---|
| 0 تفعيل المفتاح | دقائق | الفهم الحرّ حيٌّ |
| 1 عُقد الرسم | ٢-٣ أيّام | أسئلة/مرتبطة لأهمّ ٥٠ مفهوم |
| 2 Vision | ٣-٥ أيّام | «صوّر المشكلة» يعمل |
| 3 Learning loop | ٢ يوم | القاموس ينمو من الاستخدام |
| 4 Speech/Reasoning | لاحقًا | متعدّد الوسائط الكامل |

> **القاعدة الذهبيّة:** المستخدم لا يرى ٩ طبقات — يرى **حلًّا سريعًا**. التعقيد في الداخل، البساطة في الخارج.
