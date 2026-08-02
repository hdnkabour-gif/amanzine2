# ARCHITECTURE — المعماريّةُ الفعليّة

> ما هو موجودٌ فعلًا، لا ما ينبغي أن يكون. للأشجار: [`CALL_GRAPH.md`](CALL_GRAPH.md) · للملكيّة: [`RESPONSIBILITY_GRAPH.md`](RESPONSIBILITY_GRAPH.md).

---

## ١. المعماريّةُ العامّة

### الطبقاتُ كما اكتُشفت

```
┌──────────────────────────────────────────────────────────────┐
│ الواجهة  React 19 · TypeScript · Vite                        │
│  main.tsx → StoreProvider → App.tsx → Router → MainLayout    │
│  ‹‹ العقل هنا ››  needEngine · clarify · interfaceDecision   │
│                    akg/kb (٦٣ ملفَّ معرفة)                    │
└───────────────────────────┬──────────────────────────────────┘
                            │ src/services/api.ts (النقطةُ الوحيدة)
┌───────────────────────────▼──────────────────────────────────┐
│ الخادم  Express                                              │
│  index.js → ٣١ ملفَّ مسار (١٨٠ نقطة)                          │
│      ├──► database.js       SQL مباشرةً — لا ORM             │
│      ├──► lib/engines/*     ١٦ محرّكًا                        │
│      └──► services/delivery عقدٌ + سجلٌّ ماسحٌ للمجلّد          │
│  eventbus ◄── activity ──► analytics · rules→notify · learning│
└───────────────────────────┬──────────────────────────────────┘
┌───────────────────────────▼──────────────────────────────────┐
│ PostgreSQL  ٤٠ جدولًا · ٢٢ معزولةٌ بـ user_id                 │
└──────────────────────────────────────────────────────────────┘
```

**لا يوجد:** `controllers` · `services` (بالمعنى المتعارف) · `managers` · `repositories` · ORM.
**السبب:** [`ARCHITECTURE_DECISIONS.md#①`](ARCHITECTURE_DECISIONS.md).

### تسلسلُ الإقلاع

مفصَّلٌ في [`CALL_GRAPH.md#⓪`](CALL_GRAPH.md). أربعُ حقائقَ تُغيّر الفهم:

1. **`/api/health` يُركَّب قبل محدِّدات المعدّل** — Railway يستدعيه دوريًّا، فكان يستهلك دلوَ المستخدم حتى يعود `429` فتظنّ المنصّةُ أنّ الخادم ساقط. الترتيبُ هنا **سلوكٌ لا تنسيق**.
2. **فشلُ الترحيل لا يُسقط العمليّة** — يُسجَّل في `migrationState` ويُعلَن في `/api/health` كـ`degraded`. البديلُ (الانهيار) يمنع الخادمَ من الاستماع فيفشل فحصُ الصحّة خمسَ دقائقَ بلا سببٍ مقروء.
3. **بلا `DATABASE_URL` يعمل التطبيق** في «وضعٍ بلا قاعدة»: كلُّ استعلامٍ يُرجع فارغًا. مفيدٌ للتطوير، خطرٌ إن ظُنّ سليمًا — ولذلك `/api/health` يقول `degraded` صراحةً.
4. **ثلاثُ وظائفَ دوريّةٍ تبدأ خارج `startServer()`** — تعمل حتى لو فشل الإقلاع جزئيًّا.

---

## ٢. تدفّقُ المحادثة — **وفخُّ التسمية**

> ⚠️ **«المحادثة» كلمةٌ لشيئين لا علاقةَ بينهما.**

### أ. حوارُ الفهم — «شنو محتاج؟» — **في الواجهة وحدَها**

```
إنسانٌ يكتب  →  orchestrate()  →  parseNeed()  →  decideInterface()  →  فعل
                                        ↑
                          arabizi · humanIntent · stanceOf · resolveConcept
```

**لا نداءَ شبكةٍ في هذا المسار.** لا مسارَ خادمٍ له. لا محرّكَ محادثةٍ في `server/`.
الذكاءُ يُستدعى **فقط** عند عجز القواعد، عبر `POST /api/ai/understand`، وفشلُه لا يوقف شيئًا.

القرارُ ينتهي بأحد ستّة:

| الوضع | متى | العتبة |
|---|---|---|
| `direct` | يقينٌ عالٍ + وجهةٌ جاهزة | ≥ ٠٫٩٠ |
| `confirm` | يقينٌ متوسّط | ٠٫٦٠–٠٫٩٠ |
| `guided` | خطوةٌ موجّهةٌ موجودة | — |
| `clarify` | ينقص شيءٌ بنيويّ | < ٠٫٦٠ |
| `escalate` | استيضاحان بلا ارتفاع | ⚠️ غيرُ موصول |
| `welcome` | **لا مُدخلَ بعد** | — |

العتباتُ في `src/lib/clarify.ts` — **مصدرٌ واحد** يستوردها القرار.

### ب. صندوقُ الرسائل — التاجر ⇄ الزبون — **في الخادم**

```
GET/POST /api/conversations  →  routes/conversations.js  →  db  →  lib/ai-engine.js
```

هذا **تجميعُ واتساب** وردودُ بيعٍ آليّة (`detectIntent`: سعر · طلب · توصيل · تفاوض). غرضٌ مختلفٌ تمامًا عن (أ)، ويشترك معه في الاسم فقط.

---

## ٣. تدفّقُ السوق

```
منتج    POST /api/products     → db.createProduct → إشعار
طلب     POST /api/orders       → createOrder → إشعار → order.created → learning_daily
        POST /api/orders/public→ resolveDeliveryFee (الخادمُ يحسب) → validateCoupon
                                → createOrderWithCustomer → بريد + واتساب
دورة    approve · reject · ship · deliver   (ship → إنشاءُ شحنةٍ · deliver → نقاطُ ولاء)
زبون    customers · loyalty_points
إعلان   POST /api/listings/public → pending → موافقةُ الأدمن → الكتالوج العامّ
        بائعٌ سريعٌ **بلا حساب**: vendor_id فارغ، والهاتفُ قناتُه
خدمة    providers · provider_services · availability_* · bookings
```

**قواعدُ الأمان المرصودة:**
- كلُّ استعلامٍ للتاجر مُقيَّدٌ بـ`user_id` (٢٢ جدولًا)
- `deliveryCost` القادمُ من العميل **يُتجاهَل صراحةً**
- الإعلانُ لا يظهر قبل الموافقة (`status='approved'`)
- تحقّقُ OTP للبائع السريع حين تُهيَّأ واتساب المنصّة

---

## ٤. تدفّقُ الذكاء

```
مفاتيحُ الطلب → إعداداتُ المستخدم → متغيّراتُ البيئة     _resolveAIKeys()
        ↓
_providerOrder(preferred, keys)  →  المهيّأُ فقط، بترتيب السقوط
        ↓
aiChat({ sysPrompt, jsonMode:true, imageUrl? })
        ↓
openai · gemini · claude · deepseek · grok · mistral
        ↓
_normUnderstanding(_safeJson(text))  →  { intent, service, city, confidence, … }
        ↓
activity.emit('ai.understood', { provider })      ← أيُّ محرّكٍ أجاب
```

- **نظامان لا واحد:** `routes/ai.js` (فهمُ المحتاج) و`lib/ai-engine.js` (مساعدُ بيعٍ للتاجر). موصّلاتٌ مشتركة، برومبتاتٌ وأغراضٌ مختلفة.
- **الرؤية:** `aiChat({imageUrl})` مدعوم؛ Gemini يُفضَّل للصور.
- **الحالة المرصودة:** `available:false` — صفرُ مفاتيح. الفهمُ قواعدُ محلّيّةٌ وحدَها.

---

## ٥. تدفّقُ البيانات

**القراءة والكتابة:** كلُّ SQL في `server/database.js` (٢٠٧٢ سطرًا). لا استعلامَ خارجه.

### الملكيّة

| الفئة | الجداول |
|---|---|
| معزولةٌ بـ`user_id` (٢٢) | `products` `orders` `customers` `conversations` `coupons` `settings` `providers` `delivery_providers` `wallets` `payments` `notifications` `audit_logs` … |
| ابنةٌ لأبٍ (٧) | `availability_slots` `availability_templates` `provider_services` `provider_concepts` `provider_verifications` `field_visits` → `providers` · `reviews` → `listings` |
| عامّةٌ/عالميّة (١١) | `users` `listings` `otp_tokens` `custom_concepts` `concept_versions` `concept_aliases` `search_misses` `search_daily` `search_terms_daily` `learning_daily` `learning_unknowns` |

### علاقاتٌ تكشف التصميم

- **`providers.user_id` فهرسٌ غيرُ فريد** ⇒ إنسانٌ واحدٌ بأنشطةٍ متعدّدة. الأساسُ موجود، والواجهةُ لا تعرضه.
- **`providers.vouched_by → providers`** ⇒ مزوّدٌ يزكّي مزوّدًا. شبكةُ ثقةٍ لم تُذكر في أيّ وثيقةٍ سابقة.
- **`listings` بلا `user_id`** و`vendor_id` يقبل `NULL` ⇒ نشرٌ بلا حساب مقصودٌ لا سهو.
- **`delivery_provider_city_mappings`** ⇒ مدينةٌ واحدةٌ للتاجر، مُعرِّفٌ لكلّ شركة.

---

## ٦. التكاملات

| التكامل | المالك | الحالة |
|---|---|---|
| **التوصيل** | `services/delivery/` | livo · amana · jibli + webhook · url-recipe · `PARTIAL` |
| **الدفع** | `lib/engines/payment.js` | cod · transfer · wallet ✅ · cmi · stripe · paypal مقاعد |
| **واتساب** | `lib/whatsapp.js` | Graph API v19 لكلّ تاجرٍ من إعداداته |
| **البريد** | `lib/mailer.js` | SMTP — يحتاج بيئة |
| **Push** | `routes/push.js` | web-push · VAPID تُولَّد عند الإقلاع إن غابت ⚠️ |
| **Cloudinary** | `routes/media.js` | غيرُ مهيّأ ⇒ قرصٌ زائل |
| **Supabase** | `server/sync.js` | `UNKNOWN` — غيرُ مُختبَر |
| **Meta webhooks** | `routes/webhooks.js` | `/meta` تحقّقٌ واستقبال |
| **Brevo** | `routes/orders.js` | بريدُ تأكيدٍ للزبون |

---

## ٧. مصدرُ الحقيقة الواحد

| النظام | المالك |
|---|---|
| النيّة والفهم | `src/lib/needEngine.ts` |
| متى نسأل | `src/lib/clarify.ts` (وعتباتُه) |
| الاتّجاه | `src/lib/akg/kb/index.ts:stanceOf()` |
| المعرفة | `src/lib/akg/kb/` |
| كلُّ SQL | `server/database.js` |
| المخطّط | `server/migrate.js` |
| شركاتُ التوصيل | `server/services/delivery/registry.js` |
| ثمنُ التوصيل | `server/lib/deliveryPricing.js` + `pricingEngine.js` |
| البحث | `server/lib/engines/search.js` |
| مفاتيحُ الذكاء | `server/routes/ai.js:_resolveAIKeys()` |
| أسماءُ الصفحات | `src/types.ts:PAGE_IDS` |
| المدن | `src/lib/akg/kb` → مولَّدٌ إلى `server/generated/cities.json` |

---

## ٨. قيودٌ لا تُخرَق

### أ. مفروضةٌ باختبار — `HIGH`

| القيد | الحارس |
|---|---|
| لا مقارنةَ بمُعرِّف شركةِ توصيلٍ خارج ملفّها | `architecture` ① |
| لا استيرادَ مباشرًا لملفّ مزوّد | `architecture` ② |
| السجلُّ يمسح المجلّد ولا يحمل خريطة | `architecture` ③ |
| كلُّ ملفٍّ في `providers/`+`adapters/` يطابق العقد | `architecture` ④ |
| لا وسيلةَ اتّصالٍ مسجَّلةٌ كشركة | `architecture` ⑤ |
| معجمُ مدن الخادم مطابقٌ لقاعدة المعرفة | `architecture` ⑥ |
| لا مرجعَ لأصلٍ غيرِ موجود | `architecture` ⑧ |
| كلُّ صفحةٍ موصولةٌ أو مُستثناةٌ صراحةً | `architecture` ⑨ |
| ١٥ قيدًا دستوريًّا | `constitution` |
| كلُّ مرحلةِ قمعٍ لها مُصدِر | `funnel-wiring` |
| لا قناةَ إشعارٍ فارغة | `notification` |

### ب. معلَنةٌ بلا حارس — `MEDIUM` (نيّةٌ لا ضمان)

- قاعدةُ البيانات مصدرُ الحقيقة الوحيد
- الناقلُ لا ينادي الواجهة أبدًا
- المحرّكاتُ لا تعرف Express
- ما يُشتقّ لا يُخزَّن
- المساراتُ رقيقةٌ ولا تحمل منطقَ عمل

> الفرقُ عمليّ: **(أ) يوقفك الآن. (ب) يعتمد على انتباهك.**

---

## ٩. ما لا تراه المعماريّةُ من نفسها

ثلاثُ حقائقَ ظهرت **بالتشغيل وحدَه**، ولا يكشفها أيُّ فحصٍ ساكن:

1. **مدنُ Livo لم تُقرأ قطّ** — الردُّ متداخل (`data.data`) والكودُ يتوقّع مصفوفة. ٤٤١ مدينة. ✅ أُصلح في العقد.
2. **`push` يقول «وصل» بلا مشترِك.** ✅ أُصلح.
3. **النسخُ الاحتياطيّة تُكتب فعلًا ثمّ تُمحى** مع كلّ نشر. ✅ صار الدوامُ يُعلَن لا يُفترَض.

وكلُّها الآن محروسةٌ باختبارات — فلا تعود صامتة.

التفاصيلُ في [`BROKEN_CHAINS.md`](BROKEN_CHAINS.md).
