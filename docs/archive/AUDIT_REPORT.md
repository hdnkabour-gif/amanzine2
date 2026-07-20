# 🔍 تقرير التدقيق الهندسي الشامل — SAHARSHOP2026

> **اسم المشروع الفعلي في الكود:** `ai-commerce-os` (الإصدار 3.2.0) — "SAHAR shop — AI Commerce OS"
> **تاريخ التدقيق:** 2026-06-14
> **نوع التدقيق:** قراءة فقط (Read-Only) — لم يُعدَّل أي ملف من الكود المصدري. هذا التقرير هو المخرَج الوحيد.
> **منهجية:** قراءة الكود الفعلي سطراً بسطر (Backend كاملاً + Frontend + DB + PWA) — كل ملاحظة مدعومة بـ `path/file:line`.

> ⚠️ **تنبيه منهجي مهم:** الـ Stack المذكور في طلب التدقيق (SQLite + Supabase معاً، Marketplace متعدد البائعين) **لا يطابق الواقع**. الكود الفعلي:
> - **قاعدة البيانات الإنتاجية = PostgreSQL** عبر مكتبة `pg` (وليست SQLite). ملف `commerce.db` موجود لكنه **فارغ تماماً (0 صفوف)** وبقايا من نسخة قديمة لا يستعملها التطبيق إطلاقاً.
> - **Supabase = مزامنة اختيارية أحادية الاتجاه (write-only mirror)** عبر REST، وليست مصدر حقيقة ولا قاعدة ثانية.
> - **ليس Marketplace** — هو نظام SaaS **لتاجر واحد لكل حساب** (single-merchant). لا يوجد بائعون متعددون ولا شركات توصيل كمستأجرين ولا عمولات.

---

## 1. الملخّص التنفيذي (Executive Summary)

**التقييم العام: 68 / 100** — منتج تجاري حقيقي ومتقدّم لتاجر مغربي واحد، بمنطق تجارة + ذكاء اصطناعي + تكاملات اجتماعية **حقيقية وليست وهمية في معظمها**، ونضج أمني ملحوظ في طبقة المصادقة. لكنه **ليس جاهزاً للإنتاج بعد** بسبب ثغرات عزل بين المستأجرين، تسريب بيانات شخصية، تخزين الأسرار في المتصفح، أخطاء تشغيلية، وغياب كامل للاختبارات والمراقبة. كما أن أعمدة "Marketplace / Multi-Vendor / Payments" المذكورة في المتطلبات **غير منجزة**.

### أهم 5 نقاط حرجة (Top 5 Critical)

| # | النقطة | الخطورة | الدليل |
|---|--------|---------|--------|
| 1 | **المشروع ليس Marketplace** — هو نظام لتاجر واحد. لا بائعين متعددين / شركات توصيل / مقدّمي خدمات كمستأجرين، ولا تدفّق عمولات. كل المتطلبات حول "تعدد البائعين" غير موجودة. | 🔴 استراتيجية | `server/migrate.js:9` (جدول `users` بدور `admin` فقط)، كل الجداول مفتاحها `user_id` واحد |
| 2 | **IDOR على الكوبونات** — `PUT/DELETE /api/coupons/:id` بلا أي تحقّق من الملكية، و`GET /api/coupons/validate` العام يكشف `couponId`. أي تاجر مسجّل يقدر يحذف/يعدّل كوبونات متجر منافس. | 🔴 أمان | `server/routes/coupons.js:28-41` + `server/database.js:620` |
| 3 | **تسريب بيانات الزبائن (PII Enumeration)** — `GET /api/orders/track/:phone` يستخدم `.includes()` للمطابقة الجزئية؛ إدخال رقم قصير (مثل "06") يرجع طلبات كل الزبائن (أسماء، هواتف، عناوين، أكواد تتبّع). | 🔴 أمان + قانون 09-08 | `server/routes/orders.js:399-401` |
| 4 | **التوكنات + مفاتيح الـ API في localStorage** — رغم وجود بنية HttpOnly cookies في الـ backend، الـ frontend يخزّن `token` و`refreshToken` وكل مفاتيح الذكاء الاصطناعي في `localStorage` → قابلة للسرقة عبر أي XSS. الفريق نفسه يعرف المشكلة (TODO). | 🔴 أمان | `src/services/api.ts:21-41`، `src/store.tsx:267-268, 319-320`، TODO في `src/store.tsx:114` |
| 5 | **أخطاء تشغيلية + غياب الجاهزية** — كراش React في `OrdersPage` (مخالفة Rules of Hooks)، دالة `findOrderByCode` غير معرّفة (تتبّع بالكود = 500 دائماً)، تكامل توصيل Puppeteer معطّل (غير مثبّت)، **لا اختبارات ولا CI/CD ولا مراقبة أخطاء**، أسرار بنص صريح في القاعدة. | 🔴 جاهزية | `src/pages/OrdersPage.tsx:236-247`، `server/routes/orders.js:418`، `server/routes/delivery-auto.js:21` |

### الانطباع العام
الكود **أنضج بكثير من المتوقع** لتطبيق بهذا الحجم (~23,700 سطر): مصادقة احترافية (bcrypt + refresh token rotation + OTP)، إعادة حساب الأسعار على الخادم، حماية هامش الربح، Rate Limiting دقيق، CSP، WebSocket فوري، PWA قابل للتثبيت، و**صراحة في وسم الميزات الوهمية** ("محاكاة"، `model:'local'`، `simulated:true`). نقاط الضعف الجوهرية ليست في "الكمية" بل في **العزل الأمني، الجاهزية، وعدم تطابق الرؤية (Marketplace) مع التنفيذ (Single-merchant)**.

---

## 2. 📊 مصفوفة الاكتمال (Completion Matrix)

النسب مبنية على الكود الموجود فعلاً، لا على تقدير عام.

| الوحدة | النسبة | الحالة | الملاحظة المختصرة |
|--------|:-----:|:------:|------------------|
| **Frontend (UI)** | 82% | ✅ | تغطية واسعة، code-splitting، ErrorBoundary، حالات Loading/Empty جيدة — لكن مكوّنات عملاقة و`any` كثيف |
| **Backend / API** | 85% | ✅ | 16 مجموعة Routes كاملة ومنظّمة، مصادقة ناضجة — لكن دالة مفقودة وميزات مكسورة |
| **Database** | 78% | ✅ | Schema احترافي (FK/Index/Transactions) — بلا تشفير at-rest ولا rollback migrations + بقايا SQLite ميتة |
| **Auth / Security** | 70% | 🟡 | مصادقة قوية لكن تُهدَر بتخزين التوكن في localStorage + أسرار بنص صريح |
| **Multi-Tenant** | 45% | 🟡 | عزل جيد على مستوى الـ Routes لكن به ثغرات (IDOR/PII)؛ ولا يوجد تعدّد بائعين أصلاً |
| **UX / UI** | 72% | ✅ | تدفّقات واضحة وتغذية راجعة جيدة — لكن أزرار "حفظ" وهمية وبيانات مُفبركة جزئياً |
| **Marketplace Logic** | 35% | ❌ | منطق متجر واحد قوي (سلة/كوبونات/ولاء/توصيل) — لكن لا Marketplace فعلي |
| **AI Features** | 75% | ✅ | 6 مزوّدين حقيقيين + توليد محتوى/صور — لكن "البحث الذكي" كلمات مفتاحية ولا ضبط تكلفة |
| **Notifications** | 80% | ✅ | Web Push كامل + WhatsApp API + تقرير صباحي — لكن تذكير السلة بـ setTimeout يضيع عند إعادة التشغيل |
| **Delivery / Logistics** | 65% | 🟡 | Amana/Jibli/Webhook حقيقية + محاكاة صادقة — لكن أتمتة الـ URL معطّلة (Puppeteer غير مثبّت) |
| **Payments** | 30% | ❌ | COD + تحويل بنكي يُسجَّل في الملاحظات فقط — لا CMI ولا بوابة دفع ولا محافظ |
| **Social Integrations** | 65% | 🟡 | WhatsApp/Facebook/Instagram حقيقية — TikTok وهمي (Mock) |
| **PWA / Offline** | 70% | 🟡 | Manifest جيد + SW (SWR) + قابل للتثبيت — لكن Offline سطحي بلا Background Sync + أيقونة مفقودة |

---

## 3. 🗺️ الخريطة المعمارية (Architecture Map)

```
                          ┌──────────────────────────────────────────┐
                          │  العميل (Browser / PWA) — React 19 + TS   │
                          │  Vite 6 · Tailwind 4 · react-router 7      │
                          │  حالة عامة: Context واحد كبير (store.tsx)  │
                          │  تخزين: localStorage (token+keys+state) ⚠️ │
                          └───────────────┬───────────────┬──────────┘
                       HTTP /api (Bearer) │               │ WebSocket /ws
                                          ▼               ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │           خادم واحد — Node.js + Express 4  (server/index.js)        │
        │  Helmet(CSP) · CORS allowlist · Rate-limit · compression · morgan  │
        │  يخدم الـ API + الملفات الثابتة (dist) من نفس البروسس              │
        │  Crons: تقرير صباحي 08:00 · نسخ احتياطي يومي JSON · WS broadcast   │
        ├──────────────────────────────────────────────────────────────────┤
        │  16 مجموعة Routes: auth · products · orders · customers ·          │
        │  conversations · settings · delivery · delivery-auto · broadcast · │
        │  webhooks · analytics · media · loyalty · coupons · ai · push      │
        ├──────────────────────────────────────────────────────────────────┤
        │  طبقة بيانات موحّدة (server/database.js) — استعلامات معلَّمة ($1)  │
        └───────┬───────────────────────────────────────────┬───────────────┘
                │ pg (Pool)                                   │ HTTPS REST (اختياري)
                ▼                                             ▼
   ┌─────────────────────────┐                  ┌──────────────────────────────┐
   │  PostgreSQL  ✅ المصدر   │   ──(نسخ فقط)──▶ │  Supabase (sahar_sync) 🟡     │
   │  الحقيقي الوحيد للبيانات │                  │  مرآة كتابة فقط — anon key     │
   └─────────────────────────┘                  └──────────────────────────────┘
                │
                ├─ commerce.db (SQLite) ❌ فارغ/ميت — لا يستعمله الكود
                │
   ───── خدمات خارجية (server-side فقط) ─────────────────────────────────────
   OpenAI · Gemini · Claude(SDK) · DeepSeek · Grok · Mistral   (AI chat/توليد/صور)
   Cloudinary (رفع صور موقّع) · Meta Graph API (WhatsApp/FB/IG) · web-push (VAPID)
   Brevo (إيميل) · hCaptcha · Amana/Jibli (توصيل) · Puppeteer ❌(غير مثبّت)
```

**ما هو المشروع فعلاً؟** نظام تشغيل تجاري (Commerce OS) **لتاجر مغربي واحد**: لوحة تحكم للتاجر (منتجات، طلبات Kanban، زبائن، محادثات بمساعد AI بالدارجة، تحليلات، كوبونات، ولاء، توصيل، نشر اجتماعي) + **واجهة متجر عامة (Storefront)** للزبون (تصفّح، سلة، Checkout بمدن المغرب، تتبّع، عجلة حظ). الحجم ~23,700 سطر. **هو Store احترافي متكامل، وليس Marketplace.**

---

## 4. 🔴 الأخطاء والمشاكل (مرتّبة بالأولوية)

### 🔴 حرجة (Critical)

**C-1 — IDOR كامل على الكوبونات (كسر عزل بين المتاجر)**
`server/routes/coupons.js:28-41`: مساري التعديل والحذف لا يتحقّقان من ملكية الكوبون إطلاقاً:
```js
router.put('/:id', auth, async (req, res) => { await db.updateCoupon(req.params.id, req.body); res.json({ ok: true }); });
router.delete('/:id', auth, async (req, res) => { await db.deleteCoupon(req.params.id); res.json({ ok: true }); });
```
ودالتا `updateCoupon/deleteCoupon` في `server/database.js:643-656` تحذفان/تعدّلان بالـ `id` فقط بلا `user_id`. والأخطر: `GET /api/coupons/validate` **العام** يُرجع `couponId` (`server/database.js:620`)، فيستطيع المهاجم بأكواد شائعة (`WELCOME10`) الحصول على المعرّف ثم حذف كوبون منافس بحسابه.
**الحل:** اجلب الكوبون أولاً وتحقّق `coupon.userId === req.user.id` قبل أي تعديل/حذف (نفس نمط orders/products)، وأضف `AND user_id = $x` داخل دوال DB، ولا تُرجع `couponId` في المسار العام.

**C-2 — تسريب بيانات شخصية عبر تتبّع الطلب بالهاتف**
`server/routes/orders.js:399-401`:
```js
const orders = (await db.getOrders(userId)).filter(o =>
  o.customerPhone?.replace(/\D/g,'').includes(phone.replace(/\D/g,'')) );
```
المطابقة بـ `.includes()` (تطابق جزئي) + `userId` معروف من رابط المتجر العام → إدخال "2" أو "06" يُعيد طلبات عدد كبير من الزبائن مع الأسماء والعناوين وأكواد التتبّع. مخالفة مباشرة لقانون **09-08** لحماية المعطيات الشخصية.
**الحل:** مطابقة تامّة `=== fullPhone` بعد تطبيع الرقم، اشترط طول رقم كامل (≥9)، وأضف Rate-limit مخصّص على المسار، ويفضّل التتبّع عبر كود سرّي فقط بدل الهاتف.

**C-3 — التوكنات ومفاتيح الـ API مخزّنة في المتصفح (XSS Exfiltration)**
الـ backend يُنشئ HttpOnly cookies بشكل صحيح (`server/routes/auth.js:30-35`)، لكن الـ frontend يتجاهلها ويخزّن كل شيء في `localStorage`:
- `src/services/api.ts:21-41` يقرأ/يكتب `ai_commerce_token` و`ai_commerce_refresh`.
- `src/store.tsx:267-268` يحفظ كامل الحالة (بما فيها `settings.ai.apiKey` لكل المزوّدين) في `ai_commerce_os_state`.
- `src/store.tsx:114` فيه اعتراف صريح: `// TODO v3.3: migrate token storage to HttpOnly secure cookies to eliminate XSS exposure.`
أي ثغرة XSS واحدة = سرقة الجلسة + كل مفاتيح OpenAI/Cloudinary/WhatsApp للتاجر.
**الحل:** اعتمد HttpOnly cookies فقط للتوكن (البنية جاهزة في الـ backend)، أزل التوكن من localStorage، ولا تُعِد مفاتيح الـ API إلى العميل إطلاقاً (أبقِها server-side وأظهر booleans فقط كما في `settings.js:98-112`).

**C-4 — كراش React في صفحة الطلبات (Rules of Hooks)**
`src/pages/OrdersPage.tsx:236-247`: المكوّن ينفّذ `return <OrdersSkeleton/>` عند `isLoading` **قبل** استدعاء `useState`، ثم يستدعيها بعده. عند تبدّل `isLoading` يتغيّر عدد الـ hooks → React يرمي "rendered fewer hooks than expected" ويتعطّل العرض.
**الحل:** انقل كل الـ hooks إلى أعلى المكوّن قبل أي `return` شرطي (كما هو صحيح في `DashboardPage.tsx:54-66`).

**C-5 — ميزات مكسورة في الإنتاج**
- `server/routes/orders.js:418` يستدعي `db.findOrderByCode(...)` وهي **غير معرّفة** في `database.js`/`db.js` → `GET /api/orders/track-code/:code` يرمي 500 دائماً (التتبّع بالكود معطّل بالكامل).
- `server/routes/delivery-auto.js:21` يستدعي `require('puppeteer')` لكن **Puppeteer ليس ضمن تبعيات `server/package.json`** → أتمتة التوصيل عبر URL تفشل دائماً وتسقط إلى "مساعدة يدوية".
**الحل:** عرّف `findOrderByCode(userId, code)` بفلترة المستأجر، وإمّا أضف Puppeteer كتبعية أو احذف المسار وأزل الادعاء.

### 🟠 عالية (High)

**H-1 — أسرار الطرف الثالث مخزّنة بنص صريح (Plaintext at Rest)**
كل مفاتيح المتجر (WhatsApp `accessToken`، Cloudinary `apiSecret`، Brevo، مفاتيح AI، `hcaptchaSecret`) تُحفظ في عمود `settings.data` (JSONB) بدون تشفير، وتُعاد كاملةً للعميل عبر `GET /api/settings` (`server/routes/settings.js:6-11`).
**الحل:** شفّر الأسرار at-rest (KMS/`pgcrypto`/AES)، ولا تُعِدها للواجهة (استبدلها بـ `••••` + boolean "مضبوط").

**H-2 — Prototype Pollution محتمل في دمج الإعدادات**
`server/routes/settings.js:76-86` دالة `deepMerge` لا تحمي `__proto__`/`constructor`/`prototype`. مع `PUT /api/settings` المُصادَق، حمولة بـ `__proto__` قد تلوّث السلسلة النموذجية.
**الحل:** تجاهل المفاتيح الخطرة داخل الحلقة، أو استعمل `Object.create(null)` و`structuredClone` مع allowlist للحقول.

**H-3 — تحقّق توقيع Webhook هشّ ومشروط**
`server/routes/webhooks.js:17-24`: (1) التحقّق يعمل فقط إذا ضُبط `META_APP_SECRET` ووُجد الهيدر (`if (appSecret && sig)`) — وإلا تُقبل أي حمولة. (2) يُحسب الـ HMAC على `JSON.stringify(req.body)` (جسم مُعاد تسلسله) بدل **الـ raw body** الذي توقّعه Meta → التواقيع الصحيحة تفشل. (3) مقارنة `!==` عادية بدل `timingSafeEqual`.
**الحل:** استعمل `express.raw()` لهذا المسار، احسب الـ HMAC على البايتات الخام، اجعل التحقّق إلزامياً، وقارن بـ `crypto.timingSafeEqual`.

**H-4 — تذكير السلة المهجورة عبر setTimeout في الذاكرة**
`server/routes/conversations.js:21-34`: `setTimeout(..., 24h)` لكل محادثة. على Railway (إعادة تشغيل متكرّرة) تُفقد كل المؤقّتات، وتتراكم آلاف المؤقّتات في الذاكرة (تسريب + عدم موثوقية).
**الحل:** Cron/مهمّة مجدولة تستعلم من القاعدة عن المحادثات المهجورة (نمط `startMorningReportCron`).

**H-5 — لا ضبط لتكلفة الذكاء الاصطناعي (AI Spend Guard)**
المسارات المُصادَقة (`/ai/reply`, `/generate-description`, `/design-product-image`) عليها فقط الـ limiter العام 100/15د. لا حصص يومية ولا حدّ token لكل حساب. مع مفاتيح env مشتركة قد يُستنزف رصيد المالك. (إيجابي: `max_tokens` وtimeouts مضبوطة، والمسار العام محدود 30/10د — `server/index.js:102`).
**الحل:** حصة يومية لكل مستخدم + عدّاد tokens + سقف إنفاق.

**H-6 — استعلامات عامّة تعبر حدود المستأجر (Cross-tenant references)**
- `POST /api/orders/public` يستدعي `db.getProduct(it.productId)` لأي منتج بصرف النظر عن المتجر (`server/routes/orders.js:303`) → سعر/مخزون من متجر آخر.
- `POST /api/analytics/track` + `incrementProductViews` لأي `productId`/`userId` بلا تحقّق → تلويث تحليلات متجر آخر.
**الحل:** قيّد `getProduct` بـ `user_id = orderUserId`، وتحقّق أن المنتج يخصّ المتجر المستهدف قبل أي قراءة سعر/تعديل مخزون.

### 🟡 متوسطة (Medium)

- **M-1 — `any` كثيف رغم strict mode:** ~169 `as any` و~340 استخدام `any` في `src` (الأسوأ `SettingsPage.tsx` 51، `ProductsPage.tsx` 41)، و`[key:string]: any` في `src/pages/ProductsPage.tsx:229` يُلغي فحص الأنواع لكامل معالج الويزارد. **الحل:** عرّف نوع `Settings` كامل واستبدل الـ casts تدريجياً.
- **M-2 — مكوّن عملاق:** `src/pages/ProductsPage.tsx` 2299 سطراً (المكوّن الرئيسي ~1870 سطر)، `useMemo` مرّة واحدة و`useCallback` صفر → إعادة رسم كامل عند كل ضغطة مفتاح في الويزارد. تبعيات ناقصة في `filtered` (ينقصها `typeFilter`، `:529/541`). **الحل:** تقسيم الويزارد لمكوّنات + memoization.
- **M-3 — i18n واجهة فقط (Facade):** البنية موجودة (`src/i18n`, `useT`, 4 لغات) لكن **صفحات التاجر لا تستعملها** — كل النصوص عربية مكتوبة مباشرة؛ فقط `TourGuide.tsx` يستعمل `useT`. تبديل اللغة لا يغيّر شيئاً تقريباً. **الحل:** ربط الصفحات بـ `useT` فعلياً أو حذف وعد ثنائية اللغة.
- **M-4 — بيانات تحليلية مُفبركة:** Sparklines في `src/pages/AnalyticsPage.tsx:129-132` مُولَّدة (`revenue*0.35`، منحنيات مصطنعة حول القيمة الحالية) لا تاريخ حقيقي — تبدو كاتجاه حقيقي. (الـ KPIs الرئيسية حقيقية). **الحل:** ارسم من بيانات شهرية حقيقية أو احذف الـ sparkline.
- **M-5 — أزرار "حفظ" وهمية:** في `SettingsPage.tsx:273` (وتكرارات) الزر يُظهر توست نجاح فقط؛ الحفظ الحقيقي يتم live-on-change → ارتباك المستخدم. **الحل:** وحّد الحفظ في زرّ صريح أو احذف الأزرار الوهمية.
- **M-6 — إعلان "إرسال" غير حقيقي:** البثّ يضيف "(محاكاة)" ويُبلّغ "تم الإرسال" لرسائل لم تُرسَل (`src/pages/NotificationsPage.tsx:44-74`). صادق في الوسم لكنه مضلّل في النتيجة. **الحل:** ميّز بوضوح "محاكاة (لم يُرسَل)".
- **M-7 — TikTok وهمي:** `src/components/TikTokFeed.tsx` أرقام تفاعل ثابتة (1.2k إعجاب، 45 تعليق، سعر مشطوب `price*1.2`)، لا تكامل API. `server/routes/ai.js:585` يرفض النشر على TikTok. **الحل:** أزل الادعاء أو نفّذ TikTok API.
- **M-8 — DB TLS غير محقَّق:** `server/db.js:20` `rejectUnauthorized: false` في الإنتاج → عرضة MITM على اتصال القاعدة. **الحل:** استعمل سلسلة الشهادات (CA) الصحيحة.
- **M-9 — multer 1.x (EOL):** `server/package.json` يستعمل `multer ^1.4.5-lts.1` المهجور. **الحل:** الترقية إلى 2.x.

### 🟢 منخفضة (Low / Hygiene)

- **L-1** — ملفات SQLite ميتة مُتتبَّعة في git رغم `.gitignore` (`server/data/commerce.db*` فارغة) + `server/database-check.js` يستورد `better-sqlite3` غير المثبّت (سيتعطّل لو نُفّذ) + `server/.npmrc` بقايا better-sqlite3. **الحل:** حذفها كلها.
- **L-2** — مفاتيح مكرّرة في `server/defaults.js:6-15` (`name` 3 مرّات، `logo` مرّتين) → القيم الافتراضية للعلامة تُكتب فوقها بصمت. **الحل:** إزالة التكرار.
- **L-3** — `public/sw.js:49` يشير إلى `/icon-192.png` **المفقود** (الأيقونات الموجودة 512 فقط) → أيقونة إشعار 404. **الحل:** أضف الأيقونة.
- **L-4** — `src/pages/ProductsPage.tsx:1759/1765` يخزّن DOM ref على `window.__portfolioRef` (تسريب + anti-pattern). **الحل:** استعمل `useRef`.
- **L-5** — قائمة "المزيد" في `NavBar.tsx` (`showMore`) كود ميت لا يُستدعى أبداً. **الحل:** حذفها.
- **L-6** — رسائل git غير وصفية ("ok ok ok 1306"، "xcc") → لا انضباط في الـ commits. **الحل:** Conventional Commits.

---

## 5. ✅ نقاط القوة (Strengths)

1. **مصادقة احترافية:** bcrypt (`auth.js:48`) + JWT قصير (1h) + **Refresh Token Rotation** أحادي الاستخدام مخزّن كـ SHA-256 (`auth.js:18-25, 159-180`) + HttpOnly cookies + OTP/2FA + إعادة تعيين كلمة المرور + Social login بتحقّق الـ token على الخادم + منع تعداد المستخدمين (`auth.js:240`).
2. **منطق تجاري دفاعي ممتاز:** `POST /api/orders/public` يعيد حساب كل الأسعار من القاعدة (لا ثقة بالمتصفح)، يتحقّق من الكوبون على الخادم، **حارس هامش ربح** يمنع الخصم من أكل >80% من الهامش، وخصم واحد فقط (`server/routes/orders.js:298-351`).
3. **DB مصمَّمة جيداً:** Foreign Keys مع `ON DELETE CASCADE`، فهارس على `user_id` وكل الأعمدة المستعلَم عنها (`migrate.js:199-213`)، **معاملة ذرّية** لإنشاء الطلب+الزبون (`database.js:406-455`)، واستعلامات معلَّمة `$1` في كل مكان (**لا SQL Injection**).
4. **عزل المستأجر على مستوى الـ Routes متّسق** (عدا الكوبونات): نمط "اجلب ثم تحقّق `x.userId === req.user.id`" مطبّق على orders/products/customers/conversations/delivery.
5. **أمان شبكي معقول:** Helmet + CSP (إنتاج)، CORS allowlist (لا wildcard، `index.js:69-88`)، Rate-limiting طبقي ودقيق للمسارات العامة (`index.js:95-103`).
6. **AI حقيقي وصادق:** 6 مزوّدين (OpenAI/Gemini/Claude SDK/DeepSeek/Grok/Mistral) مع fallback تلقائي وقالب محلي موسوم `model:'local'`؛ توليد أوصاف/هاشتاغات/صور (DALL·E/Gemini/Grok) حقيقي.
7. **تكاملات حقيقية:** Cloudinary برفع **موقّع** + fallback، WhatsApp Cloud API + wa.me، نشر Facebook/Instagram، Web Push (VAPID) كامل end-to-end.
8. **تجربة عميل ناضجة:** Frontend مقسّم (`lazy`)، ErrorBoundary جذري، حالات Loading/Empty/Error متّسقة، Storefront مستقل بـ splash فاخر، Checkout حقيقي بمدن المغرب + عجلة حظ + ولاء + تتبّع.
9. **الصدق في الوسم:** الميزات غير المربوطة موسومة "محاكاة"/`real:false`/`simulated:true` بدل إخفائها — نزاهة هندسية نادرة.

---

## 6. ⚠️ نقاط الضعف (Weaknesses)

- **عدم تطابق الرؤية مع التنفيذ:** كل أدبيات المشروع (والطلب) تتحدّث عن Marketplace/تعدد بائعين/SQLite+Supabase — والواقع تطبيق تاجر واحد على PostgreSQL.
- **الأمان يُهدَر في الواجهة:** بنية backend قوية تُفسدها ممارسات frontend (localStorage، إعادة الأسرار للعميل).
- **هشاشة الجاهزية:** صفر اختبارات، صفر CI/CD، صفر Docker، صفر مراقبة أخطاء (107 `console.*` + `morgan('dev')` فقط).
- **دين تقني في الأنواع:** `any` حمّال (load-bearing) بدل نماذج مُعرّفة.
- **مكوّنات متضخّمة + design system نصف-مُرحَّل:** فضاءا متغيّرات CSS متوازيان (`--ink*` و`--txt-*/--clr-*`) + hex ثابت + inline styles.
- **اعتماد على الذاكرة لمهام مجدولة** (setTimeout) في بيئة سحابية سريعة الإطفاء.

---

## 7. 🔒 تقرير الأمان (Security Report)

### 7.1 Multi-Tenant Isolation
- **النموذج:** مستأجر = `user` واحد (دور `admin`). لا أدوار/فصل صلاحيات حقيقي. **لا Supabase RLS مطبّق على البيانات** (PostgreSQL هو المصدر، وفلترة المستأجر تتم بالكود لا بسياسات DB). إذا فُعّلت مزامنة Supabase، فجدول `sahar_sync` يُكتب بـ **anon key** — إن لم تُضبط سياسات RLS فالجدول مكشوف للكتابة العامة (`server/sync.js:28-31, 63`).
- **يعمل:** عزل orders/products/customers/conversations/delivery/loyalty عبر تحقّق الملكية في الـ Routes.
- **مكسور:** الكوبونات (C-1)، تتبّع الهاتف (C-2)، مراجع المنتج/التحليلات العامة (H-6).

### 7.2 API Security
| المحور | الحالة | الدليل |
|--------|:------:|--------|
| JWT + Refresh (rotation, revoke) | ✅ | `auth.js:13-25,159-193` |
| تخزين التوكن آمن | ❌ | localStorage (C-3) |
| Rate Limiting / Brute-force | ✅ | `index.js:95-103` (login 10/د) |
| CORS allowlist | ✅ | `index.js:69-88` |
| CSP / Helmet | 🟡 | إنتاج فقط + `'unsafe-inline'` للسكربت (`index.js:46-65`) |
| SQL Injection | ✅ آمن | استعلامات معلَّمة في كل `database.js` |
| XSS (مدخلات) | 🟡 | تعقيم بسيط يزيل `<>` و`<script>` (`validate.js:32-53`)؛ لا DOMPurify |
| CSRF | 🟡 | الاعتماد على Bearer يقلّل الخطر؛ لكن مع الكوكيز يلزم حماية CSRF |
| تحقّق المدخلات | 🟡 | تحقّق أساسي للطلب/المنتج/المصادقة (`validate.js`)، لا مخطّط Zod على الـ backend |
| Prototype Pollution | 🟠 | `deepMerge` (H-2) |

### 7.3 Database Security
- ✅ FK/Cascade/Constraints/Transactions/Indexes. ✅ لا حقن SQL.
- 🟠 أسرار بنص صريح at-rest (H-1). 🟡 TLS بلا تحقّق شهادة (M-8). 🟡 لا rollback migrations. 🟡 "النسخ الاحتياطي" = ملفات JSON محلية على قرص Railway المؤقّت (`index.js:327-356`) → تُفقد عند إعادة الإنشاء؛ ليست استراتيجية backup حقيقية.

---

## 8. 🔧 التحسينات الضرورية (Impact vs Effort)

| الأولوية | التحسين | الأثر | الجهد |
|:--------:|---------|:-----:|:-----:|
| 1 | إصلاح IDOR الكوبونات + تتبّع الهاتف + مراجع المنتج العامة (C-1,C-2,H-6) | 🔴 عالٍ | 🟢 منخفض |
| 2 | نقل التوكن إلى HttpOnly cookie فقط + إيقاف إعادة الأسرار للعميل (C-3,H-1) | 🔴 عالٍ | 🟡 متوسط |
| 3 | إصلاح كراش OrdersPage + `findOrderByCode` + Puppeteer (C-4,C-5) | 🔴 عالٍ | 🟢 منخفض |
| 4 | تشفير الأسرار at-rest + حارس `deepMerge` + تحقّق Webhook على raw body (H-1,H-2,H-3) | 🟠 عالٍ | 🟡 متوسط |
| 5 | إضافة اختبارات (vitest/jest) + GitHub Actions CI + Sentry | 🟠 عالٍ | 🟡 متوسط |
| 6 | تذكير السلة عبر Cron + حصص تكلفة AI (H-4,H-5) | 🟠 متوسط | 🟢 منخفض |
| 7 | حذف بقايا SQLite + إصلاح defaults المكرّرة + أيقونة 192 (L-1,L-2,L-3) | 🟢 متوسط | 🟢 منخفض |
| 8 | تقسيم ProductsPage + memoization + نوع Settings (M-1,M-2) | 🟡 متوسط | 🔴 عالٍ |
| 9 | ربط i18n الفعلي بصفحات التاجر (M-3) | 🟡 متوسط | 🟡 متوسط |

---

## 9. ➕ الميزات الناقصة والأفكار التنافسية

**ناقص مقارنة بالمتطلبات:**
- **Marketplace فعلي:** بائعون متعددون، لوحة لكل بائع، شركات توصيل كمستأجرين، مقدّمو خدمات/حجوزات، **تدفّق عمولات** بين الأطراف، فصل أدوار (vendor/delivery/customer/admin).
- **حجوزات حقيقية (Booking):** يوجد نوع منتج "service/booking" و`BookingsCalendar` لكن لا منطق توفّر/تعارض مواعيد/إلغاء/تذكيرات فعلي.
- **مدفوعات مغربية:** **CMI** (بطاقة بنكية)، محافظ محلية، أو حتى تأكيد دفع — حالياً COD/تحويل في الملاحظات فقط.
- **التقييمات والمراجعات (Reviews):** تُطلب عبر واتساب بعد التوصيل لكن لا نظام تقييم/نجوم مخزّن.
- **البحث الدلالي الحقيقي:** الحالي كلمات مفتاحية موزونة (`ai.js:10-32`) لا embeddings.

**أفكار تنافسية للسوق المغربي:**
- دمج CMI + "ادفع عند الاستلام مع تأمين ضد الإرجاع".
- تتبّع موحّد عبر كود سرّي فقط (يحلّ C-2 ويحسّن الخصوصية).
- دعم الدارجة الكامل في الواجهة (موجود في القالب، غير مربوط).
- تقارير ضريبية/فواتير متوافقة مع المتطلبات المغربية.

---

## 10. 👤 تقرير تجربة المستخدم (UX Report)

**رحلة الزبون (Storefront):** ✅ سلسة ومكتملة — تصفّح بفلترة/ترتيب، سلة متعددة، Checkout بمدن المغرب وحساب توصيل تلقائي، اختيار COD/تحويل، عجلة حظ، تتبّع، تأكيد عبر WhatsApp deep-link. حالات Loading/Empty/Error متمايزة (`src/pages/Storefront.tsx:821-846`). **نقاط احتكاك:** الدفع ينتهي برابط واتساب يدوي (لا تأكيد آلي للزبون داخل الصفحة)، "شريط النشاط الحيّ" بيانات شبه-وهمية من localStorage (دليل اجتماعي مصطنع)، والـ Storefront عربي فقط (لا يحترم اختيار اللغة).

**رحلة التاجر:** ✅ غنية — Dashboard + تقرير صباحي، منتجات CRUD بويزارد 7 خطوات، طلبات Kanban، محادثات بمساعد AI، تحليلات، كوبونات، ولاء، توصيل، نشر. **نقاط احتكاك:** كراش محتمل في صفحة الطلبات (C-4)، أزرار حفظ وهمية تربك (M-5)، Sparklines مُفبركة قد تضلّل القرار (M-4)، وويزارد المنتج ثقيل (إعادة رسم).

**التغذية الراجعة والثقة:** توست لكل إجراء، أصوات، WebSocket فوري، تتبّع طلب، عجلة حظ، ولاء — عناصر ثقة جيدة. ينقص: تقييمات حقيقية، شارات أمان دفع، سياسة إرجاع واضحة.

---

## 11. 🚀 تقرير الجاهزية للإنتاج (Production Readiness)

| المحور | الحالة |
|--------|--------|
| Logging | 🟡 `morgan('dev')` + 107 `console.*` — لا logging مهيكل |
| Error Tracking / Monitoring | ❌ لا Sentry/أي شيء |
| Tests | ❌ صفر اختبارات |
| CI/CD | ❌ لا `.github/workflows`، لا Docker |
| Secrets Management | 🟡 env للخادم (جيد) لكن أسرار المتجر بنص صريح في DB + المتصفح |
| Env separation | 🟡 dev/prod فقط (لا staging) |
| Health check | ✅ `/api/health` (Railway) |
| Backup | 🟡 ملفات JSON على قرص مؤقّت — ليست استراتيجية حقيقية |
| Migrations | 🟡 idempotent لكن بلا rollback |
| Graceful degradation | ✅ يعمل بلا DB/AI (stub/قالب محلي) |
| النشر | ✅ Railway/Nixpacks، بروسس واحد يخدم API+الواجهة |

**الخلاصة:** صالح كـ **بيئة عرض/Beta لتاجر واحد**، **غير جاهز** لإنتاج متعدّد المستأجرين قبل معالجة الحرجة (القسم 4) وإضافة Tests/CI/Monitoring.

---

## 12. 🗺️ خارطة الطريق (Roadmap)

### الآن (Sprint 0 — أمان حرج، أيام)
1. إصلاح C-1 (IDOR كوبونات) + C-2 (تسريب PII) + H-6 (مراجع عامة) — تحقّق ملكية في كل المسارات.
2. C-3: التوكن في HttpOnly cookie فقط + إيقاف إعادة مفاتيح الـ API للعميل + H-1 تشفير at-rest.
3. C-4 (كراش OrdersPage) + C-5 (`findOrderByCode`, Puppeteer).
4. H-3 (توقيع Webhook على raw body) + H-2 (حارس deepMerge).

### قريباً (Sprint 1-2 — صلابة، أسابيع)
5. اختبارات (vitest + supertest لمسارات العزل) + GitHub Actions CI + Sentry + logging مهيكل.
6. H-4 (Cron للسلة المهجورة) + H-5 (حصص تكلفة AI) + نسخ احتياطي حقيقي (Supabase/S3).
7. تنظيف الدين: حذف بقايا SQLite، defaults المكرّرة، أيقونة 192، multer→2.x.
8. نوع `Settings` كامل + تقليص `as any` + تقسيم ProductsPage + memoization.

### لاحقاً (Sprint 3+ — تحويل لـ Marketplace، أشهر)
9. نموذج أدوار حقيقي (vendor/delivery/service-provider/admin) + لوحة لكل بائع + **عمولات**.
10. مدفوعات مغربية (CMI + COD مؤمَّن) + تقييمات حقيقية + بحث دلالي (embeddings) + حجوزات بمنطق توفّر/تعارض.
11. ربط i18n الفعلي (عربي/فرنسي/دارجة) عبر كل الواجهة + توحيد الـ Design System (فضاء متغيّرات واحد).

---

> **خلاصة المدقّق:** "SAHARSHOP2026" منتج تجاري مغربي **حقيقي ومثير للإعجاب في عمقه** (AI + تكاملات + منطق دفاعي + UX)، مبنيّ بصدق هندسي. لكنه اليوم **متجر ذكي لتاجر واحد، لا Marketplace**، وبه **ثغرات عزل وخصوصية حرجة قابلة للإصلاح بجهد منخفض**، ويفتقر لأساسيات الجاهزية (اختبارات/CI/مراقبة). معالجة القسم 4 (الحرجة + العالية) ترفعه من "Beta واعد" إلى "إنتاج موثوق"، وتحقيق رؤية الـ Marketplace مشروع منفصل أكبر.
