# 🧪 التدقيق الوظيفي الحقيقي — SAHARSHOP2026

> تدقيق **مبني على الكود الفعلي** (تحقّق سطرًا بسطر)، مع **كشف ما هو صحيح وما هو مُختلَق** في تدقيقَي ChatGPT وDeepSeek المُرسَلَين.
> التاريخ: 2026-06-20 · المنهجية: قراءة الموجّهات والصفحات الحقيقية + مطابقة الاستدعاءات.

---

## 0) تدقيق التدقيقات (Fact-check) — الأهمّ

تدقيق **DeepSeek** استنتاجه العام صحيح (التدفّقات موصولة، CONDITIONAL GO)، **لكن كثيرًا من أدلّته مُختلَقة** (مسارات ملفات وأرقام أسطر لا وجود لها). إليك الحقيقة:

| ما ادّعاه التدقيق | المصدر | الواقع في الكود | الحكم |
|---|---|---|---|
| `src/pages/RegisterPage.tsx` (تسجيل) | DeepSeek | **لا وجود له** — التسجيل والدخول في `src/pages/AuthPage.tsx` (صفحة واحدة) | ❌ مُختلَق |
| `server/lib/whatsapp.js` · `email.js` · `push.js` | DeepSeek | **لا وجود لها** — `server/lib/` = `ai-engine, config, logger, otp, secrets` فقط. واتساب يُرسَل سطريًا (`broadcast.js`)، البريد عبر `lib/otp.js`، الدفع عبر `routes/push.js` | ❌ مُختلَق |
| `/api/products/:id/stock` endpoint | DeepSeek | **لا وجود له** — المخزون يُحدَّث عبر `PUT /api/products/:id` (المنتج كاملاً) | ❌ مُختلَق |
| «تحقّق بريد إلزامي (OTP) عند التسجيل» | DeepSeek | **خطأ** — `register` (`auth.js:37`) يُنشئ الحساب ويُرجع توكن مباشرة؛ بريد ترحيب **غير حاجب** (`sendWelcome`، no-op بلا SMTP). الـOTP لـ2FA/استعادة فقط | ❌ مُختلَق |
| أرقام الأسطر (approve `66-88`، reject `90-108`…) | DeepSeek | **غالبها خاطئ** — الحقيقي: approve `111`, reject `214`, ship `226` | ❌ غير دقيق |
| hCaptcha موجود **ومفروض على الخادم** | DeepSeek | **صحيح** — `orders.js:67` `_verifyHCaptcha` + فحص فعلي `:294-295` عند تفعيل التاجر | ✅ صحيح |
| تسجيل دخول Google / Facebook | ChatGPT/DeepSeek | **صحيح** — UI في `AuthPage.tsx:44-79` ⇒ `POST /api/auth/social` يتحقّق من التوكن خادميًا (`auth.js:105`) — يتطلّب `GOOGLE_CLIENT_ID`/`facebookAppId` | ✅ صحيح (مشروط بإعداد) |
| تسجيل دخول Apple | ChatGPT | **لا وجود له** — لا UI ولا خادم | ❌ غير موجود |

> **القاعدة:** ثِق باستنتاج DeepSeek، لا تثق بمراجعه. هذا التقرير يستبدلها بأدلّة حقيقية.

---

## 1) رحلة التاجر (Merchant) — موصولة فعليًا ✅

| التدفّق | الواجهة (دليل) | الخادم (دليل حقيقي) | الحالة |
|---|---|---|---|
| تسجيل / دخول | `src/pages/AuthPage.tsx` | `auth.js:37` register · `:67` login · `:233` forgot · `:251` reset · `:273` change-pw | ✅ |
| دخول اجتماعي (Google/FB) | `AuthPage.tsx:44-79` | `auth.js:105` `/social` (تحقّق توكن خادمي) | ✅ مشروط بإعداد |
| 2FA (OTP) | — | `auth.js:196` request-otp · `:214` verify-otp (DB + بريد) | ✅ |
| منتجات CRUD | `src/pages/ProductsPage.tsx` (معالج خطوات) | `products.js:12` POST · `:37` PUT · `:47` DELETE (auth + `sanitizeBody` + `validateProduct`) | ✅ |
| المخزون | بطاقة المنتج | عبر `PUT /products/:id` (لا endpoint مستقل) | ✅ |
| الطلبات | `src/pages/OrdersPage.tsx` | `orders.js:111` approve · `:214` reject · `:226` ship · `:256` deliver | ✅ |
| العملاء (CRM) | `src/pages/CustomersPage.tsx` | `/api/customers` (CRUD) | ✅ |
| التحليلات | `src/pages/AnalyticsPage.tsx` | `/api/analytics` (+ funnel/export) | ✅ |
| الإعدادات | `src/pages/SettingsPage.tsx` | `/api/settings` (+ backups) | ✅ |
| ربط الخدمات | `src/pages/ConnectionsPage.tsx` | `/api/settings/*` (WhatsApp/OpenAI/Gemini/Claude/Cloudinary/FB/IG/Supabase/Brevo/hCaptcha) | ✅ |
| المتجر العام | `src/pages/Storefront.tsx` | `products.js:59` `/public/catalog?userId=` | ✅ |

---

## 2) رحلة مقدّم الخدمة (Service Provider) — موصولة ✅

| التدفّق | دليل حقيقي | الحالة |
|---|---|---|
| حقول الخدمة (مدة/منطقة/معرض أعمال) | `ProductsPage.tsx:206-208` (`duration`,`workArea`,`portfolio`) | ✅ |
| أيام/ساعات/مكان الحجز + طريقة | `ProductsPage.tsx:233` (`bookingDays/Time/Location/Method`) | ✅ |
| تقويم الحجوزات | `ProductsPage.tsx:338` `BookingsCalendar` | ✅ |
| استقبال طلب خدمة (3 أنواع: موعد/طلب/عاجل) | `Storefront.tsx:548` `ServiceModal` ⇒ `orders.js:287` `/public` | ✅ |
| السوق الموحّد (بائع سريع + OTP واتساب) | `routes/listings.js` (`public/*`, `otp/*`) | ✅ |

---

## 3) رحلة الزبون (Customer) — موصولة بالكامل ✅

كل أسطح الزبون في `Storefront.tsx` تستدعي **نقاط نهاية عامة حقيقية** (تحقّقت من تطابقها):

| التدفّق | مكوّن (دليل) | نقطة النهاية الحقيقية | الحالة |
|---|---|---|---|
| تصفّح الكتالوج | — | `GET /api/products/public/catalog?userId=` | ✅ |
| تفاصيل منتج + متغيّرات + هدية | `Storefront.tsx:457` `ProductModal` | — | ✅ |
| السلة + الدفع (COD/تحويل) + كوبون | `Storefront.tsx:727` `CartSidebar` | `POST /api/orders/public` | ✅ |
| حماية البوتات | — | `orders.js:294` hCaptcha مفروض (عند تفعيله) | ✅ |
| تتبّع الطلب | `Storefront.tsx:829` `TrackingModal` | `GET /api/orders/track/:phone` · `track-code/:code` | ✅ |
| عجلة الحظ | `Storefront.tsx:685` `LuckyWheel` | `POST /api/coupons/public/spin` | ✅ |
| تحقّق كوبون | — | `GET /api/coupons/validate?code=` | ✅ |
| المساعد الذكي | `Storefront.tsx:858` `FloatingChat` | `POST /api/ai/public-reply` | ✅ |
| طلب خدمة | `Storefront.tsx:548` `ServiceModal` | `POST /api/orders/public` | ✅ |
| تتبّع تحليلي | — | `POST /api/analytics/track` | ✅ |

**لا استدعاء واجهة بلا معالِج خادم (لا 🔴).** ✅

---

## 4) ملاحظات وظيفية حقيقية (لا مُختلَقة)

| # | الملاحظة | الدليل | الخطورة |
|---|---|---|---|
| 1 | التسجيل **لا يتحقّق من البريد** (توكن فوري + بريد ترحيب غير حاجب) — يسمح ببريد غير مؤكَّد | `auth.js:37-21` | 🟡 (اختيار تصميم لتسهيل الإقلاع) |
| 2 | تحديث المخزون يمرّ عبر `PUT /products/:id` كاملًا (لا endpoint ذرّي مستقل) | `products.js:37` | 🟡 |
| 3 | Apple Login غير موجود (Google/FB فقط) | لا كود | 🟡 (إن وُعد به) |
| 4 | إشعارات WhatsApp/التوصيل التلقائي/الصور/AI تتطلّب مفاتيح | `DEPLOY.md` | ⚠️ تدهور لطيف (لا انهيار) |
| 5 | hCaptcha مفروض خادميًا عند تفعيله | `orders.js:294` | 🟢 نقطة قوّة |
| 6 | الدخول الاجتماعي يتحقّق من التوكن خادميًا (لا ثقة عمياء بالعميل) | `auth.js:105-118` | 🟢 نقطة قوّة |

---

## 5) الحُكم الوظيفي النهائي

> **⚠️ CONDITIONAL GO — جاهز وظيفيًا.** المسارات الثلاثة (تاجر / مقدّم خدمة / زبون) **موصولة من البداية إلى النهاية** بنقاط نهاية حقيقية، بلا روابط مكسورة. كل التكاملات الخارجية اختيارية وتتدهور بلطف. يتبقّى فقط ضبط `DATABASE_URL` + `JWT_SECRET` (+ `CLOUDINARY_*` للصور) — كما في `DEPLOY.md` — ليصبح **GO ✅**.

**يتوافق هذا مع استنتاج DeepSeek**، لكن بأدلّة حقيقية بدل المُختلَقة (لا `RegisterPage.tsx`، لا `lib/whatsapp.js`، لا `/:id/stock`، ولا «تحقّق بريد عند التسجيل»).

<div align="center">

**SAHAR shop — AI Commerce OS © 2026** · تطوير: Alloservix · Abdellatif hadana

</div>
