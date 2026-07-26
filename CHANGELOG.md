# AMANZINE — CHANGELOG

> كلّ التغييرات **إضافيّة** (Additive) — لا حذف صفحات/دوال/routes/عقود API. تتبع نمط الكود الموجود.

## [Unreleased] — Intelligence & Knowledge (يوليو ٢٠٢٥)

### أُضيف
- **Knowledge Graph nodes** (`src/lib/akg/kb/knowledgeGraph.ts`): `conceptGraph(id)` يعطي لكلّ مفهوم
  `questions` (توضيحيّة) · `related` (خدمات مرتبطة) · `booking_flow`. مشتقّةٌ من بيانات الملفّ + طبقةٍ مُنسَّقة (~١٥ مفهوم).
- **AssistantPage**: يعرض أسئلة العُقدة وخدماتها المرتبطة (قابلة للنقر) عند فهم المفهوم.
- **Vision Engine** (إعادة استعمال): `POST /api/ai/understand` يقبل `image` (base64) ويُمرّرها إلى `aiChat({imageUrl})`
  الموجودة (Gemini/OpenAI/Claude). زرّ «📷 صوّر المشكلة» في المساعد يضغط الصورة إلى 512px قبل الإرسال.
- **understanding.ts**: `UnderstandingContext.image` + تصعيدٌ إجباريّ للذكاء عند وجود صورة.
- اختبارات: `test/brain/knowledgeGraph.test.ts` (+٥). الإجماليّ **٨٣/٨٣**.

### مرجعٌ سابق (نفس المسار)
- **Knowledge Engine** ١٦٧ مفهوم متعدّد اللغات + تطبيع + قواعد تركيبيّة (`knowledgeData.ts`/`knowledge.ts`).
- **AI Understanding** آخر طبقة: `/api/ai/understand` (Context Engine) + `understandHybrid` (قواعد→تصعيد).
- **الشعار** «كل كلمة عندها طريق» · **قتل «ما فهمناش»** (حوارٌ موجَّه بخيارات نقر).

### يتطلّب إجراءَ المالك (لا كود)
- **تفعيل الذكاء حيًّا**: أضِف `GEMINI_API_KEY` (أو `DEEPSEEK_API_KEY`) في **Railway → Variables**.
  الكود جاهز؛ بدون المفتاح يعمل التطبيق كاملًا بالقواعد ويعيد `/understand` القيمة `{available:false}`.
  ملاحظة: `hasLLM()` في العميل لا يقرأ env الخادم (متصفّح) — الفحص الصحيح هو ردّ النقطة نفسها.

### مؤجَّل (موثَّق)
- **Learning admin endpoint**: `unknownTexts` تُجمَع اليوم في العميل (`journey.ts` + لوحة البيتا)، لا في الخادم.
  إغلاق الحلقة يتطلّب أن يُبلّغ العميلُ الخادمَ أوّلًا — خطوةٌ لاحقة (المرحلة ٤ في `INTEGRATION_PLAN.md`).
- **Speech Engine** · **Reasoning متعدّد الاحتمالات** — مرحلةٌ لاحقة.
