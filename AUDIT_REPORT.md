# AMANZINE — تقرير المراجعة المعماريّة الشاملة (Audit)

> **الدور:** مراجعٌ معماريٌّ قبل أن أكون مبرمجًا. قرأتُ الكود الفعليّ (`src/lib/`, `server/routes/`,
> `server/database.js`, `src/pages/`) وطابقتُه مع المخطّط الكامل (٢٠+ ميزة · ٩ طبقات).
> **الاكتشاف الأهمّ:** معظم ما يعتبره المخطّط «❌ غير مُنفَّذ» **موجودٌ فعلًا في الكود** — المراجعات
> الخارجيّة (ChatGPT/DeepSeek) لا تعرف قاعدة الشيفرة، فبالغت في تقدير الفجوة. الفجوات الحقيقيّة أضيق.

الرموز: ✅ مكتمل · ⚠️ موجود يحتاج ربط/تحسين · 🔄 جزئيّ · 🆕 غير موجود.

---

## 1) جدول المطابقة — الميزات مقابل الكود
| # | الميزة (من المخطّط) | الحالة | الموقع في الكود |
|---|---|---|---|
| 1 | **Normalization** (تشكيل/حروف/تكرار/Arabizi/Stop) | ✅ | `src/lib/akg/kb/knowledge.ts` (`normArabic`/`normLatin`) · `arabizi.ts` (`deArabizi`) |
| 2 | **Knowledge Engine** (١٦٧ مفهوم × ٥ لغات) | ✅ | `src/lib/akg/kb/knowledgeData.ts` (data) · `knowledge.ts` (`resolveConcept`) |
| 3 | **Geo** (٤٥ مدينة + أحياء + مرادفات كازا/Casa) | ✅ | `knowledgeData.ts` (CITIES) · `knowledge.ts` (`resolveCity`) · بحث جغرافيّ: `server/routes/search.js` |
| 4 | **Compositional Rules** (غسل+طوموبيل→car_wash) | ✅ | `knowledge.ts` (`COMPOSITE`) + مطابقة الكلمات (token-subset) |
| 5 | **Intent Classification** (طالب/مزوّد/بيع/شراء) | ✅ | `src/lib/humanIntent.ts` (`readHuman`) · `needEngine.ts` (`parseNeed`) · `akg/kb/index.ts` (`understand`) |
| 6 | **AI as Last Layer** (Fallback عند فشل القواعد) | ✅ (يحتاج مفتاح) | `server/routes/ai.js` (`/understand`) · `src/lib/understanding.ts` (`understandHybrid`+`RemoteProvider`) |
| 7 | **قاعدة البيانات** (providers/bookings/reviews/listings/geo) | ✅ | `server/database.js` (جداول providers·bookings·reviews·listings + lat/lng + status + rating agg) |
| 8 | **Search API** (نصّ حرّ + فلاتر + جغرافيا + Ranking) | ✅ | `server/routes/search.js` (المحرّك الموحّد؛ Discover=search بلا q) |
| 9 | **Providers API** (إضافة/بحث/موافقة أدمن) | ✅ | `server/routes/providers.js` (+ عزل المستأجر + `/status`) |
| 10 | **Bookings** (حجز + كشف تعارض المواعيد + حالات) | ✅ | `server/routes/bookings.js` (`/`, `/public`, `/:id/status` + conflict detection) |
| 11 | **Reviews** (بعد completed + نجوم + متوسّط) | ✅ | `server/routes/listings.js` (`/:id/reviews` GET/POST) · `database.js` (`addReview`/rating agg) |
| 12 | **Ranking Engine** (تقييم/قرب/تحقّق) | ✅ | `search.js` (`is_verified DESC, rating_avg DESC` + مسافة) · `server/routes/recommend.js` |
| 13 | **Recommendation** (سباك→كهربائي/نجّار) | ✅ | `server/routes/recommend.js` (فوق Business Graph) |
| 14 | **السوق الموحّد** (Marketplace) | ✅ | `server/routes/listings.js` (quick-seller→moderation→public + OTP) · `src/pages/Marketplace.tsx` |
| 15 | **AssistantPage** (حوار موجَّه + خيارات نقر) | ✅ | `src/pages/AssistantPage.tsx` (لا «ما فهمناش» + خيارات + AI عند unknown) |
| 16 | **GuidePage** (دليل الاستخدام) | ✅ | `src/pages/GuidePage.tsx` |
| 17 | **Personality** (ردود دارجة مختصرة، لا اعتذار) | ✅ | `src/lib/persona.ts` + نصوص needEngine/Hero |
| 18 | **Knowledge Graph Nodes** (questions/related/booking_flow/seo لكلّ مفهوم) | 🔄 | البيانات جزئيّة: `services/fields/examples` في `knowledgeData.ts`؛ `related` على مستوى `recommend.js` لا داخل المفهوم؛ **questions/booking_flow/seo مفقودة داخل المفهوم** |
| 19 | **Vision Engine** (تحليل صورة → JSON) | 🆕 (بنية جاهزة) | غير موجود — **لكن** `aiChat({imageUrl})` في `server/routes/ai.js` يدعم الرؤية (OpenAI/Gemini/Claude) ⇒ إضافةٌ سهلة، لا من الصفر |
| 20 | **Speech Engine** (صوت → نص) | 🆕 | غير موجود (يحتاج Whisper/Gemini audio) |
| 21 | **Learning Engine** (تعلّم من الأخطاء) | 🔄 | **البيانات تُجمَع أصلًا:** `src/lib/journey.ts` يسجّل `unknownTexts` بترددها (`topUnknown`) — «كنز تطوير المعرفة». **الناقص:** حلقة المراجعة الأسبوعيّة → تحديث القواعد |
| 22 | **Reasoning Engine** (احتمالات متعدّدة قبل الحجز) | 🆕 | غير موجود صراحةً (اليوم: مفهومٌ واحدٌ راجح). LLM في `/understand` يعطي `possible_questions` كبذرة |
| 23 | **Multimodal Context** (نص+صورة+صوت+موقع+وقت) | 🔄 | نص+موقع+وقت موجودة (`buildContext`, `needEngine` enrich)؛ صورة/صوت مفقودة |

---

## 2) تحليل الفجوات (الحقيقيّة)
- **الفجوة ليست في «السوق/الحجز/التقييم/الترتيب»** — هذه مبنيّةٌ وتعمل. المخطّط أخطأ التقدير.
- **الفجوات الفعليّة الأربع:**
  1. **Vision Engine** — أعلى أثرٍ جديد. البنية جاهزة (`aiChat` يقبل صورة) ⇒ نقطةٌ تقبل `imageUrl` + برومبت رؤية يُخرج JSON.
  2. **عُقد الرسم داخل المفهوم** (`questions`/`related`/`booking_flow`/`seo`) — البيانات نصفها موجود؛ نُكمّلها في `knowledgeData`.
  3. **Learning Engine** — البيانات تُجمَع (`unknownTexts`)؛ الناقص حلقةُ ترقيةٍ (تصدير أسبوعيّ → قاعدة معرفة).
  4. **Speech / Reasoning** — مؤجَّلتان (مرحلة لاحقة).
- **تفعيل الذكاء:** `/api/ai/understand` جاهز؛ ينتظر **مفتاحًا في Railway env** (`GEMINI_API_KEY`/`DEEPSEEK_API_KEY`). بدونه التطبيق يعمل كاملًا بالقواعد.

## 3) اقتراحات الدمج (لا إعادة كتابة)
- **Vision:** أضِف `image?` إلى `POST /api/ai/understand` ومرّرها إلى `aiChat({imageUrl})` نفسها — **إعادة استعمال**، لا محرّك جديد. الواجهة: زرّ «📷 صوّر المشكلة» يستدعي نفس النقطة.
- **Graph nodes:** وسّع مولّد `knowledgeData` (نفس الـparser) ليملأ `questions`/`related`؛ لا تغيير في المستهلكين (حقولٌ اختياريّة).
- **Learning:** أضِف تصدير `decisionStats().topUnknown` → مراجعةٌ بشريّة → إضافة variants إلى `knowledgeData` (نفس مسار `matchApprovedMemory` الموجود في `akg/kb`).
- **الترتيب المعماريّ (AI آخِرًا):** محفوظٌ أصلًا في `understandHybrid` (قواعد→تصعيد) و`search` (قواعد ترتيب قبل أيّ ذكاء).

## 4) التوافق (التحقّق)
- ✅ لا يُكسَر `needEngine`/`AssistantPage`/`understand` — كلّ الإضافات هذا الأسبوع كانت إضافيّة، ٧٨/٧٨ اختبار.
- ✅ نمط الإضافة الجديدة = نفس نمط الموجود: مسارات Express معزولة بالمستأجر · Types في `src/types.ts` · بيانات في `akg/kb`.
- ✅ `hasLLM()` موجود في `understanding.ts`؛ `/api/ai/understand` يعمل ويعيد `{available:false}` بلا مفتاح.

## 5) الأولويّات (1=عاجل … 5=مؤجَّل)
| أولويّة | البند | لماذا |
|---|---|---|
| **1** | تفعيل مفتاح Gemini/DeepSeek في Railway → إحياء `/understand` | يفتح كلّ الفهم الحرّ فورًا، الكود جاهز |
| **2** | عُقد الرسم (questions/related) لأهمّ ~٥٠ مفهوم | يُغني الحوار/الحجز/الاقتراح، البيانات نصفها موجود |
| **3** | Vision Engine (إعادة استعمال `aiChat` + زرّ صورة) | أقوى ميزة جديدة، بنيةٌ جاهزة |
| **4** | Learning loop (تصدير unknownTexts → توسيع القاموس) | البيانات تُجمَع؛ نغلق الحلقة |
| **5** | Speech · Reasoning متعدّد الاحتمالات | مرحلةٌ لاحقة بعد نموّ الاستخدام |

> **الخلاصة الصادقة:** AMANZINE أنضج ممّا تظنّ المراجعات — إنّه **~٧٠٪** من المحرّك (لا ٤٠-٥٠٪)،
> لأنّ السوق/الحجز/التقييم/الترتيب/التوصية **مبنيّة**. الباقي: **الرؤية · عُقد الرسم · التعلّم · تفعيل المفتاح**.
