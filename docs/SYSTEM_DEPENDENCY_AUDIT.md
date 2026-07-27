# AMANZINE — مراجعة اعتماديّات النظام الكامل (Dependency · Dead Code · Integration)

> مراجعةٌ هندسيّةٌ للنظام كلّه، لا للطبقات. **كلّ رقمٍ هنا من أمرٍ نُفّذ على الكود** — لا انطباعات.
> وفيها **تصحيحُ ثلاثة إيجابيّاتٍ كاذبةٍ وقعتُ فيها أثناء المسح نفسه** (مذكورةٌ صراحةً).

---

## ① دورة حياة المعلومة — أين تضيع؟

```
المستخدم يكتب
 → AssistantPage.send()
   ├─ parseNeed (قواعد)            ┐
   ├─ resolveConcept + conceptGraph │ فهمٌ محلّيّ (0ms)
   └─ [عند العجز] understandHybrid ┘
        → RemoteProvider → POST /api/ai/understand → aiChat(deepseek/gemini/…)
 → التوجيه: withNeed() ⇒ /market?q=…&city=…      ✅ (كان يضيع — أُصلح)
 → GET /api/search → detectIntent → BusinessService.search
        → ADAPTERS[store|provider|listing] → db.discover*
        → applyFilters → relevance → ranking.rank (7 إشارات موزونة)
 → النتائج للمستخدم
 ↘ التعلّم (فرعان):
   ├─ خادم: knowledge.recordSearch → search_daily / search_misses
   └─ عميل: reception + recordDecision → reportUnknown → learning_unknowns
```

**نقاط الضياع المكتشفة:**

| # | أين | الحالة |
|---|---|---|
| L1 | المساعد → السوق بلا `q` | ✅ **أُصلح** (`withNeed`) |
| L2 | المساعد لا يُغذّي التعلّم | ✅ **أُصلح** (reception/decision) |
| **L3** | **`/understand` بلا ذاكرة محادثة** | ✅ **أُصلح الآن** (تفصيلٌ في ②) |
| L4 | `searchNearby` يُسقط كلّ نشاطٍ **بلا `location`** (`all.filter(b => b.location)`) | ⚠️ **مفتوح** — مزوّدٌ بلا إحداثيّات يختفي من الخريطة/«القريب» |
| L5 | التعلّم يُجمَع ولا يعود آليًّا إلى المعرفة | ⚠️ **قرار** — مراجعةٌ بشريّة (ما‑بعد‑Beta) |

---

## ② Memory Engine — بحثٌ حقيقيّ، لا استنتاج

بحثتُ عن ١٦ مصطلحًا. **النتائج الخام:**

| المصطلح | العدد | | المصطلح | العدد |
|---|---|---|---|---|
| `conversation memory` | 0 | | `preferences` | 0 |
| `sessionMemory` / `session_memory` | 0 | | `embedding` | 0 |
| `userMemory` / `user_memory` | 0 | | `vector` | 0 |
| `user_context` | 0 | | `recentActions` | 0 |
| `rememberUser` / `lastProvider` / `preferredLang` | 0 | | **`userContext`** | **6** |
| **`history`** | **50** | | **`recentMessages`** | **1** |

**وجدتُ الملفّ. وجدتُ الدالّة. وحكمتُ:**

1. **`src/lib/core/context.ts` → `buildContext()`** — **مستعملةٌ فعلًا** (orchestrator · LivingHome · AssistantPage). لكنّها **سياقٌ لحظيّ لا ذاكرة**: تُعاد بناؤها من الصفر كلّ نداء (`new Date().getHours()`، الطلبات الحاليّة). **صفر استمراريّة.**
2. **`history` (50 إشارة)** — **حقيقيّةٌ وتعمل**، لكن لمحادثة **البائع** فقط: `_oaiCompatChat` يمرّر `history.slice(-10)`، Gemini `-8`، Claude `-10`. أي **البنية موجودة وناضجة**.
3. **🔴 الاكتشاف الحاسم — `recentMessages`:** مُعرَّفٌ في `UnderstandingContext` (`understanding.ts:36`) بتعليق «Memory Engine»… **ولا يملؤه أحد.** إشارةٌ **واحدة** في المشروع كلّه = تعريفُه فقط.
   وبالتوازي: `server/routes/ai.js` كان فيه **`history: []` مثبّتةٌ فارغة**.
   ⇒ **سقالة ذاكرةٍ ميّتةٌ عبر ٣ طبقات**: الصفحة لا تمرّر · المزوّد لا يُرسل · الخادم لا يقرأ.
   **الأثر الملموس:** «بغيت سبّاك» ثمّ «فالرباط» ⇒ الجملة الثانية **يتيمة**؛ المساعد عاجزٌ بنيويًّا عن تعدّد الأدوار.

> **✅ أصلحتُ الطبقات الثلاث** (تفصيل في ⑤). أمّا **ذاكرة المستخدم عبر الجلسات** (طلباتك السابقة، لغتك، مزوّدك المفضّل) فما تزال **غير موجودة** — قرارُ ما‑بعد‑Beta.

---

## ③ مراجعة كلّ الـ APIs — 30 route

**كلّها مركّبة** في `server/index.js` (صفر route غير مركّب). التقاطع مع الواجهة:

**مستعملةٌ من الواجهة (25):** `ai` · `ai-search`(`/ai/ask`) · `analytics` · `auth` · `bookings` · `broadcast` · `business` · `conversations` · `coupons` · `customers` · `delivery` · `discover` · `feed` · `insights` · `knowledge` · `listings` · `loyalty` · `media` · `orders` · `products` · `providers` · `push` · `recommend` · `search` · `settings` · `track` · `wallet`

**غير منادَاةٍ من الواجهة (3):**

| Route | النقاط | الحكم |
|---|---|---|
| `/api/webhooks` | `GET/POST /meta` | ✅ **سليم** — تناديه Meta خارجيًّا، لا الواجهة. **ليس ميّتًا.** |
| `/api/payment` | `/methods` · `/charge` · `/:id/confirm` | 🟠 **ميزةٌ مكتملةٌ لا يمكن الوصول إليها** — لا زرّ دفعٍ في الواجهة |
| `/api/delivery-auto` | `POST /:orderId` | 🟠 **مكتملةٌ لا يمكن الوصول إليها** — التوصيل التلقائيّ بلا مُطلِق |

> **تصحيحٌ لخطأٍ وقعتُ فيه:** مسحي الأوّل صنّف **15** route كـ«ميّت» — كان **خاطئًا**: العميل يبني المسار بـ`${BASE_URL}/…` (وBASE_URL يتضمّن `/api`)، فبحثي المُثبَّت على `/api/` أسقط 12 منها. الصحيح **3 فقط**، منها واحدٌ سليمٌ بطبيعته.

---

## ④ العلاقات بين الملفّات + الكود الميّت

### السلسلة التي سألتَ عنها — **موصولةٌ بالكامل** ✅
```
akg/kb/knowledge.ts ─┬→ needEngine.ts ──→ AssistantPage / LivingHome
akg/kb/knowledgeGraph│→ understanding.ts → RemoteProvider → server/routes/ai.js
akg/kb/arabizi ──────┘                                    → aiChat → مزوّد
                       orchestrator.ts → journey.ts → /api/ai/report-unknown → DB
```
كلّ حلقةٍ لها مستوردٌ حقيقيّ. **لا طبقةَ يتيمةً في هذه السلسلة.**

### طبقة AKG العليا — **حيّة** (تصحيحٌ لشكٍّ أوّليّ)
شككتُ أنّها «جزيرةٌ مغلقة» (كلّ ملفّاتها `ext=0`). **كان استنتاجًا خاطئًا**: الاستيراد يتمّ عبر **المجلّد** (`from '../lib/akg'` ⇒ `index.ts`)، والسلسلة تنتهي بصفحتين **قابلتين للوصول**:
`UniversalPublish` (`/publish`) و`ControlCenter` (`case 'knowledge'`) في `MainLayout.tsx`.

### كودٌ ميّتٌ مؤكّد (صفر إشارة في المشروع كلّه)
| الملفّ | أسطر | ملاحظة |
|---|---|---|
| `src/components/CapabilityBar.tsx` | 71 | 🔥 **ميزةٌ مكتملةٌ لا يمكن الوصول إليها** — تعرض قدرات الصفحة من AKG. **هذا بالضبط ما طلبه C1** («القدرات → الواجهة») وهو **مكتوبٌ وجاهزٌ ومهجور**. |
| `src/components/CommandCenter.tsx` | — | مهجور |
| `src/components/KeyboardShortcuts.tsx` | — | مهجور |
| `src/components/BrandVideo.tsx` | — | مهجور |
| `src/components/EmptyState.tsx` | — | مهجور |
| `src/utils/cn.ts` | — | أداةٌ مهجورة |
| **المجموع** | **~505 سطر** | |

`Landing/sections/{Bento,Pricing,OSPreview,LiveTicker}.tsx` — **متروكةٌ عمدًا** (وثّقناها M1؛ طلبتَ عدم الحذف). ليست خطأً.

> **تصحيحان آخران لمسحي:** `akg/pages.ts` **ليست يتيمة** (تُستورَد بأثرٍ جانبيّ `import './pages'`)، و`MapView.tsx` **مستعملة** (`lazy` في `Explore.tsx`). كشفي الأوّل أعطى **36 يتيمًا** — الصحيح **6**.

### قاعدة البيانات — **صحّةٌ ممتازة**
**31 جدولًا مُنشأً · 30 مستعملًا فعليًّا** في استعلامات (`FROM/JOIN/INTO/UPDATE/DELETE`).
**غير مستعمل: `sahar_sync` فقط** (جدولٌ واحد = 3٪ هدر).

---

## ⑤ ما أصلحتُه في هذه الجولة (إضافيّ · آمن · مُختبَر)

**ربط ذاكرة المحادثة عبر الطبقات الثلاث** (L3):
1. `src/pages/AssistantPage.tsx` — يمرّر جُمَل المستخدم السابقة في الجلسة (`recentMessages`) للنصّ **وللصورة**.
2. `src/lib/understanding.ts` — `RemoteProvider` يُرسل `recentMessages` (آخر 6) في جسم الطلب.
3. `server/routes/ai.js` — `_recentHistory()` يحوّلها إلى `history` حقيقيّ بدل `history: []` المثبّتة.

**الأثر:** «بغيت سبّاك» ← «فالرباط» صارت **مفهومةً في سياقها**. الحقل `recentMessages` لم يعد ميّتًا.

**التحقّق:** `tsc` **0** · `build` ✅ · **84/84** اختبار عقل · **28/28** اختبار خادم · تحميل `routes/ai.js` سليم.

---

## ⑥ ما لم ألمسه عمدًا (قرارك)

| البند | لماذا تركته |
|---|---|
| حذف الـ6 ملفّات الميّتة (~505 سطر) | قلتَ سابقًا **«لا تحذف ميزات»**. `CapabilityBar` تحديدًا **لا تُحذَف — تُوصَل**: هي حلّ C1 جاهزًا. |
| `/api/payment` · `/api/delivery-auto` | ميزتان مكتملتان بلا واجهة. وصلُهما = قرارُ منتج، لا إصلاحُ خطأ. |
| L4 (`searchNearby` يُسقط بلا موقع) | إصلاحُه يغيّر سلوك البحث؛ **الأهمّ: اطلب موقع المستخدم** لتفعيل وزن المسافة 0.30. |
| `sahar_sync` | جدولٌ واحدٌ غير ضارّ. |
| ذاكرة المستخدم عبر الجلسات | ما‑بعد‑Beta (تحتاج نموذجًا + خصوصيّة). |

---

## الخلاصة (بلا مجاملة)

> **النظام أسلم ممّا توقّعت، وأخطائي في المسح كانت أكثر ممّا توقّعت** — صحّحتُ ثلاثة إيجابيّاتٍ كاذبةٍ لنفسي هنا (15 route «ميّت» ⇒ 3 · 36 ملفًّا يتيمًا ⇒ 6 · «جزيرة AKG» ⇒ حيّة).
> **الحقيقيّ:** 30/30 route مركّبة · 30/31 جدولًا مستعملًا · السلسلة المعرفيّة موصولةٌ بالكامل ·
> **العطب الأخطر كان الذاكرة**: سقالةٌ (`recentMessages`) مُعرَّفةٌ وميّتةٌ عبر ٣ طبقات جعلت المساعد **عاجزًا عن تعدّد الأدوار** — وهذا **أُصلح الآن**.
> يبقى للبيتا: **وصّل `CapabilityBar`** (C1 جاهزٌ مكتوب) · **اطلب الموقع** (يُفعّل أقوى إشارة ترتيب) · **أدخِل المزوّدين**.
