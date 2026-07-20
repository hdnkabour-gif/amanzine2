# 🧭 تقرير جاهزية النشر — SAHARSHOP2026 (AI Commerce OS)

> تدقيق جاهزية إصدار شامل · **وضع القراءة فقط** (لم يُعدَّل أي كود) · كل ادّعاء مدعوم بدليل `path:line` أو ناتج أمر فعلي.
> التاريخ: 2026-06-18 · الفرع: `claude/ecstatic-ptolemy-2xprhn` · الواجهة `v3.2.0` / الخادم `v2.1.0`.

---

## 1) الحُكم التنفيذي

# ⚠️ CONDITIONAL — صالح للنشر **بشرط ضبط الإعدادات** (ليست مشكلة كود)

التطبيق **يبني نظيفاً، يقلع، يجتاز الاختبارات، ومصادقته وحمايته سليمة**. لا توجد موانع في الكود: البناء ناجح، 10/10 اختبارات خادم تمر، المصادقة مفروضة (401 على المسارات المحميّة)، CORS مقيّد بقائمة سماح، والخادم **يرفض الإقلاع في الإنتاج بدون `JWT_SECRET`**. الذكاء الاصطناعي وكل التكاملات الخارجية **تتدهور بلطف** عند غياب المفاتيح (لا انهيار). 

السبب الوحيد لعدم منح **GO** كامل هو أن **استمرار البيانات يعتمد على متغيّر بيئة**: إن لم يُضبط `DATABASE_URL` (PostgreSQL) يعمل الخادم في «وضع بلا قاعدة بيانات» (كل الاستعلامات ترجع فارغة، بلا حفظ). بمجرّد ضبط `DATABASE_URL` + `JWT_SECRET` (و`Cloudinary` لاستمرار الصور) ⇒ يصبح الحُكم **GO**.

**لا توجد موانع كود (NO‑GO).** الموانع الوحيدة هي **3 متغيّرات بيئة** يجب ضبطها قبل الإطلاق.

---

## 2) قائمة الموانع (Blockers) — كلها إعداد، لا كود

| # | المانع | الدليل | الإصلاح (قبل الإطلاق) |
|---|--------|--------|------------------------|
| B1 | **`DATABASE_URL` غير مضبوط ⇒ لا حفظ للبيانات.** الخادم يدخل «no-database mode» ويُرجع نتائج فارغة. | `server/db.js:4-19` | أضِف خدمة PostgreSQL على Railway (تملأ `DATABASE_URL` تلقائياً). |
| B2 | **`JWT_SECRET` إلزامي في الإنتاج.** الخادم يطبع FATAL ويخرج إن لم يُضبط مع `NODE_ENV=production`. | `server/lib/config.js:5-14` | اضبط `JWT_SECRET` بقيمة عشوائية ≥32 حرف. |
| B3 | **بدون Cloudinary لا تدوم الصور المرفوعة** (تُفقد عند إعادة النشر على Railway). الكود سليم لكنه يحتاج المفاتيح. | `server/.env.example` (CLOUDINARY_*) + `server/routes/media.js` | اضبط `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` (أو `CLOUDINARY_URL`). |

> ملاحظة: B2 ليس ثغرة — الكود **يحمي نفسه** (يرفض الإقلاع). أدرجناه لأنه شرط تشغيل إلزامي.

---

## 3) جدول الخطورة

| # | المشكلة | المسار | الدليل | الأثر | الإصلاح |
|---|---------|--------|--------|-------|---------|
| 🔴1 | `DATABASE_URL` مطلوب لاستمرار البيانات | D/K | `server/db.js:4-19` | لا حفظ بدونه | خدمة Postgres على Railway |
| 🔴2 | `JWT_SECRET` مطلوب في الإنتاج | F | `server/lib/config.js:5-14` | الخادم لا يقلع بدونه | ضبط المتغيّر |
| 🟠3 | **`server/data/commerce.db` (+`-shm`/`-wal`) متعقَّب في git** رغم وجوده في `.gitignore` | D/K | `git ls-files server/data` يُرجعها | SQLite قديم غير مستخدم يُشحن في المستودع (الكود يستعمل Postgres فقط) — تشويش + تضخيم | `git rm --cached server/data/*.db*` |
| 🟠4 | صور `public/` ضخمة (عشرات الميغابايت): `kids.png` 2.5MB، `shoes2.png`/`icons/shoes.png` 2.3MB، `women/men` ~2.1MB، أيقونة 192 تشير إلى شعار 1.1MB | I | ناتج `find public -size +900k` | بطء أول تحميل | ضغط/تصغير الصور (WebP) |
| ✅5 | ~~تبعية `@anthropic-ai/sdk` غير مستخدمة~~ — **تصحيح بعد التحقّق:** السيرفر **يستعمل Anthropic/Claude فعلاً** كمزوّد، إضافةً إلى OpenAI/Gemini/Grok | E | `server/routes/settings.js:149-151`, `server/routes/ai.js:692-709` | لا مشكلة — التبعية مطلوبة | لا إجراء |
| 🟠6 | سعر باقة Pro = «قريباً / Coming soon» | H/J | `src/i18n/translations.ts:194,336,620` | الباقة المدفوعة غير مفعّلة فعلياً | تثبيت السعر أو إخفاء Pro عند الإطلاق |
| 🟡7 | أصول مكرّرة/زائدة: `icon-5121.png`، `sahar-banner-wide1 copy.png`، `shoes (2).png`، `shoes .png` (مسافة زائدة)، `shoes2.png`، `other2.png`، `service2.png` | I | `ls public/**` | فوضى أصول | حذف المكرّرات |
| 🟡8 | عامل الخدمة مُسجَّل **مرّتين** لنفس `/sw.js` | I | `src/main.tsx:24` + `index.html:545` | تكرار غير ضار | إبقاء تسجيل واحد |
| 🟡9 | 19 تنبيه TypeScript (كلها متغيّر/استيراد غير مستخدم) | A | `npx tsc --noEmit` ⇒ 18×TS6133 + 1×TS6196 | تجميلي (CI = continue-on-error) | تنظيف الاستيرادات |
| 🟡10 | `META_VERIFY_TOKEN` افتراضي `'sahar_shop_verify'` | E/F | `server/routes/webhooks.js:7` | يهمّ فقط عند استخدام Meta webhooks | ضبط قيمة سرّية |
| 🟡11 | تغطية اختبارات محدودة (خادم: `secrets`+`validate` فقط؛ لا اختبارات واجهة) | A/J | `server/test/*` | مخاطر انحدار | إضافة اختبارات مسارات/واجهة لاحقاً |

---

## 4) مصفوفة تطابق الواجهة ↔ الخادم (Path C)

- عميل الـAPI المركزي `src/services/api.ts` يشير إلى **56 مسار** API؛ وإجمالي المسارات المتميّزة في `src/**` = **38** (بعد تجريد الديناميكي).
- قوبلت كل المسارات مقابل **110 نقطة نهاية** مركّبة عبر **17 موجّهاً** في `server/index.js:112-128`.

| الفئة | النتيجة | أمثلة (دليل) |
|------|---------|--------------|
| 🔴 استدعاء واجهة بلا معالِج خادم | **لا شيء** | كل مسارات `api.ts` لها موجّه مركّب (auth/products/orders/customers/conversations/settings/delivery/coupons/loyalty/broadcast/analytics/media/ai) |
| 🟡 نقاط خادم لا يستدعيها الـSPA (مقصودة: عامة/خارجية) | طبيعية | `webhooks/*` (Meta)، `listings/public/*` + `listings/otp/*` (Marketplace/الـLanding عبر fetch مباشر)، `coupons/public/spin` و`orders/public` و`orders/track` (المتجر العام)، `push/vapid-key` |
| 🟠 عدم تطابق طريقة/مسار | **لا شيء مكتشَف** | الطرق متوافقة (مثل `POST /orders/${id}/approve` ⇒ `routes/orders.js`) |

**الخلاصة:** لا توجد روابط API مكسورة حرجة. ✅

---

## 5) جدول نقاط النهاية (Path B) + مصفوفة التكاملات (Path E)

### نقاط النهاية — ملخّص حسب الموجّه (المجموع 110، مركّبة 17/17، لا موجّه يتيم)

| الموجّه (mount) | بادئة | حماية | ملاحظات |
|---|---|---|---|
| auth | `/api/auth` | عام (login/register/refresh) | rate-limit 10/دقيقة (`index.js:97`) |
| products | `/api/products` | Bearer (إدارة) + `public/catalog` عام (يتطلّب `userId`) | تحقّق `userId` (400) |
| orders | `/api/orders` | إدارة محميّة + `public`/`track`/`track-code` عامة | rate-limits خاصة (`index.js:102,109`) |
| customers · conversations · settings · delivery · delivery-auto · broadcast · analytics · media · loyalty | `/api/*` | **Bearer إلزامي** | media: multer 10MB صور / 50MB فيديو (`routes/media.js:115,205`) |
| coupons | `/api/coupons` | `validate` + `public/spin` عامة | spin rate-limit 10/ساعة (`index.js:101`) |
| ai | `/api/ai` | محمي + `public-reply` عام | rate-limit 120/ساعة (حماية تكلفة) (`index.js:107`) |
| webhooks | `/api/webhooks` | توقيع/توكن تحقّق Meta | `META_VERIFY_TOKEN` (`webhooks.js:7-12`) |
| push | `/api/push` | `vapid-key` عام + اشتراك | web-push |
| listings | `/api/listings` | `public/*` عامة + إشراف محمي (platform admin) | `public/stats`, `public/catalog`, `otp/*` |
| health | `/api/health` | عام | يرجع 200 ✅ |

**الوسطاء:** `helmet` (`index.js:46`)، `cors` allowlist (`index.js:69-88`)، `compression`، `morgan`، `cookie-parser`، حدود معدّل متعدّدة الطبقات (`index.js:96-109`)، حدّ جسم 20MB.

### مصفوفة التكاملات

| التكامل | كود موجود؟ (دليل) | متغيّرات البيئة | إلزامي/اختياري | سلوك الاحتياط | الحالة |
|---|---|---|---|---|---|
| قاعدة البيانات | `server/db.js:4-19` (pg Pool) | `DATABASE_URL` | **إلزامي للحفظ** | بدونه: no-DB mode (فارغ، لا انهيار) | ⚠️ |
| الهجرات | `server/index.js:185,193` (`await migrate()`) | — | تلقائي عند الإقلاع | try/catch لا يُسقط الخادم | ✅ |
| AI (OpenAI/Gemini/Grok/Claude) | `lib/ai-engine.js:92-109`, `routes/ai.js:162-164,329,692-709` | `OPENAI_API_KEY`/`GEMINI_API_KEY` (وClaude/Grok عبر الإعدادات) | اختياري | `if(!key) return null` ⇒ تعطيل لطيف (`ai-engine.js:89`) | ✅ |
| Cloudinary | `routes/media.js` | `CLOUDINARY_*` / `CLOUDINARY_URL` | اختياري (موصى به للإنتاج) | بدونه: الصور لا تدوم بعد النشر | ⚠️ |
| Meta/WhatsApp + webhooks + OTP | `routes/webhooks.js:7-12`, `routes/listings.js` (OTP), `lib/otp.js` | `META_*`, `WHATSAPP_*`, `META_VERIFY_TOKEN` | اختياري | معطّل عند الغياب (النشر يعمل بلا تحقّق) | ✅ |
| web-push / VAPID | `routes/push.js`, `server/data/vapid.json` | `VAPID_PUBLIC_KEY/PRIVATE_KEY` | اختياري | يُولّد/يُعطّل | ✅ |
| nodemailer (بريد/OTP) | `server/package.json` (`nodemailer`) | SMTP (اختياري) | اختياري | تعطيل لطيف | ✅ |
| مزوّدو التوصيل (Amana/Jibli/webhook) | `routes/delivery.js`, `routes/delivery-auto.js` | لكل مزوّد (تُضبط داخل التطبيق) | اختياري | يدوي عند الغياب | ✅ |
| WebSocket `/ws` | `server/index.js` (+ `sync.js`) | — | — | محادثة لحظية | ✅ |

**لا يوجد تكامل يُسقِط التطبيق عند غياب مفاتيحه.** ✅

---

## 6) قائمة تحقّق الجاهزية (Checklist)

| البند | الحالة | الدليل |
|------|:---:|--------|
| يبني نظيفاً (`npm run build`) | ✅ | `✓ built in ~15s` |
| فحص الأنواع (`tsc`) بلا أخطاء مانعة | ✅ | 19 تنبيه فقط، كلها متغيّر غير مستخدم |
| اختبارات الخادم تمر | ✅ | `# pass 10 # fail 0` |
| Node ≥ 20 | ✅ | محلي v22؛ `engines >=20.0.0` |
| لا أسرار افتراضية في مسار الإنتاج | ✅ | `JWT_SECRET` الافتراضي للتطوير فقط؛ الإنتاج يخرج إن غاب (`config.js:5-14`)؛ لا أسرار مكتوبة بالكود |
| CORS مقيّد | ✅ | قائمة سماح (`index.js:69-88`) |
| JWT مفروض على المسارات المحميّة | ✅ | `GET /api/products` ⇒ 401 |
| قاعدة البيانات تدوم | ⚠️ مشروط | تتطلّب `DATABASE_URL` (`db.js:4-19`) |
| الهجرات تعمل عند الإقلاع | ✅ | `index.js:193` |
| كل استدعاء API له معالِج | ✅ | لا 🔴 في مصفوفة C |
| تدفّقات أساسية موصولة (مصادقة/CRUD/طلب/رسائل/سوق) | ✅ | موجّهات موجودة + بناء ناجح |
| لا روابط تنقّل مكسورة حرجة | ✅ | مسارات `App.tsx` + catch-all `*` (`App.tsx:226`) |
| ErrorBoundary عام | ✅ | `src/main.tsx:10-16` |
| PWA/manifest صالح | ✅ | `start_url:"/"` + أيقونات 192/512 (`manifest.json`) |
| إعداد النشر متّسق | ✅ | `railway.json`/`nixpacks.toml`/`Procfile` + `healthcheck /api/health` |
| `.env`/`node_modules` مستثناة | ✅ | `.gitignore` (لكن `commerce.db` متعقَّب — 🟠3) |

---

## 7) خطة الإصلاح المرتّبة بالأولوية

### قبل الإطلاق (إلزامي — إعداد فقط)
1. ضبط **`DATABASE_URL`** (خدمة PostgreSQL على Railway) — وإلا لا حفظ. *(B1)*
2. ضبط **`JWT_SECRET`** عشوائي ≥32 حرف. *(B2)*
3. ضبط **`CLOUDINARY_*`** لاستمرار الصور. *(B3)*
4. ضبط **`PRODUCTION_URL`/`FRONTEND_URL`** (أو الاعتماد على `RAILWAY_PUBLIC_DOMAIN`) لـCORS.

### قبل الإطلاق (نظافة سريعة — كود/مستودع)
5. `git rm --cached server/data/commerce.db*` (إزالة قاعدة SQLite القديمة من التعقّب). *(🟠3)*
6. حسم باقة Pro: تثبيت السعر أو إخفاؤها. *(🟠6)*
7. حذف الأصول المكرّرة في `public/` وضغط الصور الضخمة. *(🟠4, 🟡7)*

### يمكن تأجيله بعد الإطلاق
8. حذف تبعية `@anthropic-ai/sdk` غير المستخدمة. *(🟠5)*
9. توحيد تسجيل service worker في مكان واحد. *(🟡8)*
10. تنظيف 19 تنبيه TypeScript. *(🟡9)*
11. ضبط `META_VERIFY_TOKEN` (إن استُخدمت Meta). *(🟡10)*
12. إضافة اختبارات مسارات الخادم والواجهة. *(🟡11)*

---

## 8) ما لم يُمكن التحقّق منه ثابتاً (يتطلّب تشغيلاً / مفاتيح حقيقية)

| البند | كيف يُتحقّق منه يدوياً |
|------|------------------------|
| استمرار البيانات على Railway فعلياً | انشر مع `DATABASE_URL`، أنشئ منتجاً، أعد النشر، تأكّد بقاءه |
| ردّ الذكاء الاصطناعي فعليّاً | اضبط `OPENAI_API_KEY`/`GEMINI_API_KEY` وجرّب `/api/ai/generate-description` |
| استقبال Meta/WhatsApp webhooks | اضبط مفاتيح Meta + `META_VERIFY_TOKEN` واختبر تحقّق الـwebhook الحقيقي |
| رفع الصور إلى Cloudinary | اضبط مفاتيح Cloudinary وارفع صورة وتأكّد من رابطها الدائم |
| إشعارات web-push | اشترك من متصفّح حقيقي وأرسل إشعاراً |
| محادثة WebSocket `/ws` اللحظية | افتح جلستين وتأكّد من وصول الرسائل لحظياً |
| تطابق مفاتيح i18n 100% عبر 5 لغات | تشغيل أداة diff على القواميس (بنيوياً متماثلة: `public.ts` 5 كتل متساوية، `translations.ts` 636 مفتاحاً) |

---

## 9) تحديث ما بعد التدقيق — إصلاحات طُبّقت فعلاً ✅

أُنجزت كل بنود النظافة البرمجية في خطة الإصلاح (الجزء الذي لا يحتاج إعدادات Railway):

| البند | الحالة | الدليل |
|------|:---:|--------|
| 🟠3 إزالة `commerce.db*` من تعقّب git | ✅ تمّ | `git rm --cached server/data/*.db*` (يبقى على القرص، خارج المستودع) |
| 🟡7 حذف 7 أصول مكرّرة/زائدة | ✅ تمّ | `icon-5121.png`, `sahar-banner-wide1 copy.png`, `sahar-banner-wide1.png`, `shoes (2).png`, `shoes .png`, `other2.png`, `service2.png` (تحقّق refs=0 قبل الحذف) |
| 🟡8 توحيد تسجيل service worker | ✅ تمّ | حُذف التسجيل المكرّر من `src/main.tsx`؛ يبقى واحد في `index.html` |
| 🟡9 تنظيف تنبيهات TypeScript | ✅ تمّ | **`tsc --noEmit` = 0** (كان 19) |
| i18n: تطابق المفاتيح عبر 5 لغات | ✅ تمّ | 55 مفتاح لوحة تحكّم + `lang.zh` مُلئت في darija/fr/en/zh ⇒ **0 فجوات** في `translations.ts` و`public.ts` |
| ✅5 تصحيح ادّعاء «Anthropic غير مستخدم» | ✅ صُحّح | Claude مزوّد مستعمَل فعلاً (`routes/ai.js:692-709`) |
| دليل النشر | ✅ أُضيف | `DEPLOY.md` (متغيّرات Railway خطوة بخطوة) |

**بقي فقط (إعداد Railway، ليس كوداً):** `DATABASE_URL` + `JWT_SECRET` + `CLOUDINARY_*` — مفصّلة في `DEPLOY.md`. (وقرار اختياري: سعر باقة Pro «قريباً»، وضغط الصور الكبيرة.)

بعد إصلاحات النظافة: البناء ✓ · `tsc` = **0** · اختبارات **10/10** · فحوص حيّة (health/stats 200، محمي 401).

---

### الخلاصة
**⚠️ CONDITIONAL GO** — الكود جاهز للإنتاج (نظيف الآن: `tsc`=0، i18n مكتمل، أصول منظّفة)؛ النشر الآمن يتطلّب فقط ضبط `DATABASE_URL` و`JWT_SECRET` و`CLOUDINARY_*` (انظر `DEPLOY.md`). لا موانع كود، ولا روابط API مكسورة، ولا تكامل ينهار عند غياب مفاتيحه. بعد ضبط هذه المتغيّرات ⇒ **GO ✅**.

<div align="center">

**SAHAR shop — AI Commerce OS © 2026** · تطوير: Alloservix · Abdellatif hadana

</div>
