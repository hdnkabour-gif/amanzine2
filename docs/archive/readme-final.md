<div align="center">

# 🛍️ SAHAR shop

### منصّة المغرب الذكية للبيع والخدمات والحجوزات
**AI Commerce OS** — كل ما يحتاجه التاجر المغربي في تطبيق واحد

`Frontend v3.2.0` · `Backend v2.1.0` · `Node ≥ 20` · `5 لغات` · `RTL/LTR`

💬 +212 649 200 188 · +212 612 265 893 · 📍 Casablanca, Maroc

</div>

---

## 📖 جدول المحتويات

1. [ما هو SAHAR shop؟](#1-ما-هو-sahar-shop)
2. [الميزات الكاملة](#2-الميزات-الكاملة)
3. [المعمارية](#3-المعمارية)
4. [التقنيات (Tech Stack)](#4-التقنيات-tech-stack)
5. [هيكل المشروع](#5-هيكل-المشروع)
6. [المتطلّبات](#6-المتطلّبات)
7. [التثبيت والتشغيل](#7-التثبيت-والتشغيل)
8. [متغيّرات البيئة](#8-متغيّرات-البيئة)
9. [السكربتات المتاحة](#9-السكربتات-المتاحة)
10. [قاعدة البيانات](#10-قاعدة-البيانات)
11. [مرجع واجهة API](#11-مرجع-واجهة-api)
12. [اللغات (i18n)](#12-اللغات-i18n)
13. [النشر (Deployment)](#13-النشر-deployment)
14. [الأمان](#14-الأمان)
15. [الاختبارات](#15-الاختبارات)
16. [خارطة الطريق](#16-خارطة-الطريق)
17. [الدعم والتواصل](#17-الدعم-والتواصل)
18. [الترخيص والحقوق](#18-الترخيص-والحقوق)

---

## 1) ما هو SAHAR shop؟

**SAHAR shop** منصّة تجارة إلكترونية متكاملة موجّهة للسوق المغربي، تُمكّن أي تاجر أو مقدّم خدمة أو حِرَفي من إدارة نشاطه **من الألف إلى الياء** عبر تطبيق واحد:

- 🛍️ **بيع المنتجات** بصور وفيديو وخيارات (مقاس/لون) ووصف يكتبه الذكاء الاصطناعي.
- 🛠️ **تقديم الخدمات** مع حجز موعد، طلب عادي، أو طلب عاجل، ومعرض أعمال.
- 📅 **استقبال الحجوزات** بالتاريخ والساعة أو التدخّلات الاستعجالية.
- 🏪 **متجر إلكتروني** برابط خاص + **سوق موحّد** يجمع آلاف الزبائن.
- 🤖 **مساعد ذكاء اصطناعي** يردّ على الزبائن ويجمع الطلبات 24/7.
- 🚚 **توصيل وتتبّع** آلي عبر شركات الشحن.

المنصّة **مجانية للبدء**، تعمل **بدون أي مفتاح خارجي**، وتدعم **5 لغات** مع اتجاه RTL/LTR تلقائي.

---

## 2) الميزات الكاملة

### 🛒 التجارة والكتالوج
- إدارة المنتجات والخدمات والمنتجات الرقمية.
- خيارات المنتج (مقاس/لون)، صور متعدّدة، فيديو.
- حالات النشر (مسودّة/منشور)، إدارة المخزون.
- متجر عام (`Storefront`) برابط خاص لكل تاجر.

### 🏪 السوق الموحّد (Marketplace)
- كتالوج عام يجمع إعلانات كل التجّار.
- **نموذج البائع السريع** المرن: تخصّصات متعدّدة، طرق طلب، نموذج تسعير، **حقول مخصّصة «أضِف ما تريد»**، ووصف ذكي مجاني.
- تقييمات ومراجعات (`reviews`) بنجوم.
- صور للإعلانات + تحقّق هاتف البائع عبر **WhatsApp OTP**.
- لوحة **مراجعة وإشراف** (`ModerationPage`) للمشرف.

### 🤖 الذكاء الاصطناعي
- توليد وصف المنتجات والهاشتاغات.
- ردّ تلقائي على رسائل الزبائن (عام وخاص).
- استخراج بيانات الطلب من المحادثات.
- تصميم صور المنتجات والبانرات (`BannerStudioPage`).

### 💬 الرسائل والقنوات
- صندوق وارد موحّد (WhatsApp / Facebook / Instagram).
- استيراد المحادثات (`ChatImportPage`) واستخراج الطلبات منها.
- ويبهوكات Meta/WhatsApp.

### 🚚 التوصيل
- ربط شركات التوصيل + إرسال تلقائي (`delivery-auto`).
- تتبّع الطلب العام عبر رقم الهاتف أو كود التتبّع.

### 🎁 التسويق والولاء
- كوبونات وأكواد خصم + تحقّق.
- **عجلة الحظ** (lucky wheel).
- نقاط الولاء (`loyalty_points`).
- الإرسال الجماعي (`broadcast`).

### 📊 التحليلات
- زيارات، مبيعات، أرباح، مصادر الزوّار.
- قُمع التحويل (funnel) + تصدير البيانات.
- أحداث المتجر (`store_events`).

### ⚙️ الإدارة
- إعدادات العلامة والعروض الذكية.
- **نسخ احتياطي يومي** قابل للتنزيل (مُصادَق).
- إشعارات Web-Push + إشعارات داخل التطبيق.
- دليل استخدام مدمج (`GuidePage`) + جولة تعريفية (`TourGuide`).

---

## 3) المعمارية

```
┌───────────────────────────────────────────────────────┐
│  React 19 SPA (src/)                                   │
│  Router 7 · Context Store · Tailwind 4 · recharts      │
└───────────────┬───────────────────────┬───────────────┘
                │ REST /api/* (JWT)      │ WebSocket (ws)
┌───────────────▼───────────────────────▼───────────────┐
│  خادم Express واحد (server/)                            │
│  helmet · cors · compression · rate-limit              │
│  17 وحدة Route · auth/validate middleware · lib/       │
└───────┬───────────────┬───────────────┬───────────────┘
        │               │               │
   PostgreSQL       SQLite         Cloudinary
   (إنتاج)          (محلي)         (وسائط)
```

**مبدأ أساسي:** خدمة واحدة تخدم الـAPI والواجهة المبنيّة (`dist/`) معًا — منفذ واحد، نشر بسيط.

---

## 4) التقنيات (Tech Stack)

### الواجهة الأمامية (Frontend)
| التقنية | الإصدار | الدور |
|---|---|---|
| React | ^19.1.0 | مكتبة الواجهة |
| React Router | ^7.1.0 | التوجيه + تقسيم الكود |
| TypeScript | ^5.7.0 | الأنواع |
| Vite | ^6.0.0 | البناء والتطوير |
| Tailwind CSS | ^4.0.0 | التنسيق |
| lucide-react | ^0.383.0 | الأيقونات |
| recharts | ^3.8.1 | الرسوم البيانية |
| zod | ^3.23.8 | تحقّق المخططات |
| clsx · tailwind-merge | — | أدوات الأنماط |

### الخلفية (Backend)
| التقنية | الإصدار | الدور |
|---|---|---|
| Express | ^4.18.2 | الخادم وREST |
| jsonwebtoken | ^9.0.2 | مصادقة JWT |
| bcryptjs | ^2.4.3 | تجزئة كلمات المرور |
| pg | ^8.11.0 | PostgreSQL (إنتاج) |
| helmet · cors | — | الأمان وCORS |
| express-rate-limit | ^7.1.5 | حدود المعدّل |
| multer | ^2.0.1 | رفع الملفات |
| cloudinary | ^2.10.0 | تخزين الوسائط |
| ws | ^8.14.2 | WebSocket لحظي |
| web-push | ^3.6.7 | إشعارات المتصفّح |
| nodemailer | ^6.9.14 | البريد |
| @anthropic-ai/sdk | ^0.39.0 | الذكاء الاصطناعي |
| compression · morgan | — | الضغط والتسجيل |

---

## 5) هيكل المشروع

```
SAHARSHOP2026/
├── index.html                # نقطة دخول HTML (+ SW + toast الأوفلاين)
├── package.json              # تبعيات وسكربتات الواجهة
├── vite.config.ts            # إعداد Vite
├── tsconfig.json             # إعداد TypeScript
├── railway.json·nixpacks.toml·Procfile   # إعداد النشر
├── public/                   # أصول ثابتة (شعارات، أيقونات، manifest، sw.js)
├── dist/                     # مخرجات البناء (تُولَّد)
│
├── src/                      # ── الواجهة الأمامية ──
│   ├── main.tsx · App.tsx    # الإقلاع والتوجيه
│   ├── store.tsx             # المتجر (Context)
│   ├── types.ts              # الأنواع المشتركة
│   ├── pages/                # 24 صفحة
│   ├── components/           # 11 مكوّنًا مشتركًا
│   ├── services/api.ts       # طبقة API مركزية
│   ├── i18n/                 # نظام الترجمة (5 لغات)
│   ├── data/                 # categoryFields…
│   ├── lib/ · utils/         # أدوات مساعدة
│   └── index.css             # أنماط عامة
│
└── server/                   # ── الخلفية ──
    ├── index.js              # نقطة دخول الخادم
    ├── db.js · database.js   # طبقة قاعدة البيانات (PG/SQLite)
    ├── migrate.js            # الترحيلات
    ├── routes/               # 17 وحدة مسارات API
    ├── middleware/           # auth · validate
    ├── lib/                  # ai-engine · otp · logger · secrets · config
    ├── test/                 # اختبارات (secrets · validate)
    └── .env.example          # نموذج متغيّرات البيئة
```

---

## 6) المتطلّبات

- **Node.js ≥ 20**
- **npm** (مضمّن مع Node)
- اختياري للإنتاج: **PostgreSQL**، حساب **Cloudinary**، مفاتيح **AI/WhatsApp**.

---

## 7) التثبيت والتشغيل

### أ) التطوير المحلي (Development)

```bash
# 1) تثبيت تبعيات الواجهة + الخادم (postinstall يثبّت الخادم تلقائيًا)
npm install --legacy-peer-deps

# 2) إعداد البيئة
cp server/.env.example server/.env
#   ثم عدّل القيم (JWT_SECRET على الأقل)

# 3) تشغيل خادم التطوير (الواجهة)
npm run dev          # Vite على http://localhost:5173

# 4) في طرفية أخرى — تشغيل الخادم (API)
cd server && npm run dev   # nodemon على http://localhost:3001
```

> محليًا يعمل التطبيق على **SQLite** تلقائيًا (لا حاجة لـPostgreSQL).

### ب) الإنتاج (Production)

```bash
# بناء الواجهة ثم تشغيل الخادم الذي يخدمها + الـAPI معًا
npm install --legacy-peer-deps
npm run build         # يولّد dist/
npm start             # node server/index.js  → منفذ واحد (افتراضي 3001)
```

### ج) سكربتات جاهزة
- **Linux/macOS:** `./start.sh`
- **Windows:** `start.bat`

---

## 8) متغيّرات البيئة

تُوضع في `server/.env` (انظر `server/.env.example` الكامل). أهمّها:

### إلزامية
| المتغيّر | الوصف |
|---|---|
| `JWT_SECRET` | مفتاح توقيع الجلسات (≥ 32 حرفًا عشوائيًا) |
| `DATABASE_URL` | سلسلة اتصال PostgreSQL (للإنتاج؛ Railway يوفّرها) |

### الخادم
| المتغيّر | الافتراضي |
|---|---|
| `PORT` | 3001 |
| `NODE_ENV` | development |
| `FRONTEND_URL` | http://localhost:5173 |
| `PRODUCTION_URL` | (نطاقك) |

### الوسائط (موصى به للإنتاج)
`CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET`
(أو `CLOUDINARY_URL` المُجمّعة)

### الذكاء الاصطناعي (اختياري — التطبيق يعمل بدونها)
`OPENAI_API_KEY` · `GEMINI_API_KEY`

### WhatsApp / Meta (اختياري)
`META_APP_ID` · `META_APP_SECRET` · `META_VERIFY_TOKEN` · `WHATSAPP_PHONE_ID` · `WHATSAPP_ACCESS_TOKEN`

### إشعارات Web-Push (اختياري)
`VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY`
> توليد المفاتيح: `node -e "console.log(require('web-push').generateVAPIDKeys())"`

### المشرف الأولي (اختياري)
`ADMIN_EMAIL` · `ADMIN_PASSWORD` · `ADMIN_NAME`

### السوق الموحّد (اختياري)
`PLATFORM_ADMIN_EMAIL` · `PLATFORM_WHATSAPP_TOKEN` · `PLATFORM_WHATSAPP_PHONE_ID`
> عند ضبط متغيّرَي WhatsApp يصبح نشر الإعلان مشروطًا بتأكيد هاتف البائع عبر OTP.

### تشفير الأسرار (اختياري)
`ENCRYPT_SECRETS` · `SECRETS_KEY`

---

## 9) السكربتات المتاحة

### جذر المشروع
| السكربت | الوظيفة |
|---|---|
| `npm run dev` | خادم تطوير Vite (الواجهة) |
| `npm run build` | بناء الواجهة إلى `dist/` |
| `npm start` | تشغيل خادم الإنتاج (API + الواجهة) |
| `npm run lint` | فحص الأنواع (`tsc --noEmit`) |
| `npm run format` | تنسيق الكود (Prettier) |

### مجلّد الخادم (`server/`)
| السكربت | الوظيفة |
|---|---|
| `npm start` | تشغيل الخادم |
| `npm run dev` | تشغيل بـnodemon (إعادة تحميل) |
| `npm test` | تشغيل الاختبارات (`node --test`) |

---

## 10) قاعدة البيانات

- **الإنتاج:** PostgreSQL عبر `DATABASE_URL` (سائق `pg`).
- **المحلي/التطوير:** SQLite في `server/data/commerce.db` (وضع WAL).
- **الترحيلات:** `server/migrate.js` (تُشغَّل عند الإقلاع؛ لا تُسقِط الخادم عند الفشل — يبقى الـhealthcheck حيًّا).

**الجداول (19):** `users` · `products` · `orders` · `customers` · `conversations` · `settings` · `coupons` · `loyalty_points` · `delivery_providers` · `broadcasts` · `notifications` · `templates` · `listings` · `reviews` · `otp_tokens` · `refresh_tokens` · `audit_logs` · `store_events` · `sahar_sync`

---

## 11) مرجع واجهة API

كل المسارات تحت `/api`. المحميّة تتطلّب ترويسة `Authorization: Bearer <token>`.

| المجموعة | أمثلة على النقاط | الوصول |
|---|---|---|
| `auth` | `POST /login` · `/register` · `/refresh` · `/forgot-password` · `/reset-password` | عام |
| `products` | `GET /` (محمي) · `GET /public/catalog?userId=` | مختلط |
| `orders` | `POST /public` · `GET /track/:phone` · `GET /track-code/:code` · إدارة (محمي) | مختلط |
| `customers` | CRUD الزبائن | محمي |
| `conversations` | `GET /` · `POST /:id/messages` · `/reply` | محمي |
| `settings` | `GET /` · `GET /backups` · `GET /backups/:filename` | محمي |
| `delivery` · `delivery-auto` | إدارة الشحن + الإرسال التلقائي | محمي |
| `coupons` | `POST /validate` · `POST /public/spin` (عجلة الحظ) | مختلط |
| `loyalty` | نقاط الولاء | محمي |
| `broadcast` | الإرسال الجماعي | محمي |
| `analytics` | `GET /` · `/funnel` · `/export` | محمي |
| `media` | `POST /upload` · `/upload-base64` · `/upload-video` | محمي |
| `ai` | `/generate-description` · `/generate-hashtags` · `/extract-order` · `/public-reply` | مختلط |
| `push` | `GET /vapid-key` · `POST /subscribe` · `/unsubscribe` | مختلط |
| `webhooks` | استقبال Meta/WhatsApp | عام (موقّع) |
| `listings` | `GET /public/catalog` · `POST /public` · `/:id/reviews` · `/otp/request` · `/otp/verify` · مراجعة (محمي) | مختلط |

> **الفحص الصحّي:** `GET /api/health` → `200`.

---

## 12) اللغات (i18n)

| الكود | اللغة | الاتجاه |
|---|---|---|
| `ar` | العربية | RTL |
| `darija` | الدارجة المغربية | RTL |
| `fr` | Français | LTR |
| `en` | English | LTR |
| `zh` | 中文 | LTR |

النظام مركزي في `src/i18n/`. الاتجاه يُضبط تلقائيًا عبر `isRtlLang()`. كل أسطح الزبون مُترجمة بالكامل.

---

## 13) النشر (Deployment)

المشروع مُهيّأ لـ**Railway** (وأي مزوّد يدعم Nixpacks):

- **`railway.json`:** Builder = NIXPACKS، أمر بناء يثبّت ويبني الواجهة ثم يثبّت الخادم، healthcheck على `/api/health` (مهلة 300s)، إعادة تشغيل عند الفشل حتى 10 مرّات.
- **`nixpacks.toml`:** Node 20 + أدوات بناء أصلية (gcc/make/pkg-config).
- **`Procfile`:** `web: node server/index.js`.

**خطوات النشر على Railway:**
1. اربط المستودع بمشروع Railway.
2. أضِف خدمة **PostgreSQL** (يُملأ `DATABASE_URL` تلقائيًا).
3. اضبط `JWT_SECRET` ومفاتيح Cloudinary (وأي تكاملات).
4. ادفع الكود — يبنى ويُشغّل تلقائيًا.

---

## 14) الأمان

- **مصادقة Bearer-only JWT** (لا fallback لكوكي قديم).
- **bcryptjs** لكلمات المرور + **refresh tokens** لتجديد الجلسة.
- **helmet** لترويسات الأمان + **CORS** مضبوط.
- **حدود معدّل متعدّدة الطبقات** (عام/مصادقة/AI/طلبات عامة/تتبّع/عجلة الحظ).
- **تحقّق مدخلات** عبر `middleware/validate.js`.
- **WhatsApp OTP** لتحقّق بائعي السوق.
- **سجلّ تدقيق** (`audit_logs`) + خيار **تشفير الأسرار**.
- **خصوصية:** تتبّع الطلب العام لا يكشف معرّفات داخلية.

> تفاصيل كاملة في **`audit-final.md`**.

---

## 15) الاختبارات

```bash
cd server && npm test
# 10 اختبارات تنجح (secrets + validate)
```

```bash
# فحص الأنواع للواجهة
npm run lint    # tsc --noEmit
```

---

## 16) خارطة الطريق

- [ ] مصادقة كوكيز `HttpOnly` (تحصين XSS).
- [ ] اختبارات تكامل للمسارات (auth/orders/listings).
- [ ] تنظيف تنبيهات الكود الميّت (tsc → 0).
- [ ] secret-scanning في CI.
- [ ] لوحة تاجر أذكى (تحسينات تدريجية حسب الطلب).

---

## 17) الدعم والتواصل

| القناة | التفاصيل |
|---|---|
| 💬 WhatsApp | **+212 649 200 188** · **+212 612 265 893** |
| 📍 الموقع | Casablanca, Maroc |
| 🛠️ التطوير | **Alloservix · Abdellatif hadana** |

---

## 18) الترخيص والحقوق

**AI Commerce OS © 2026** — كل الحقوق محفوظة.
تطوير: **Alloservix · Abdellatif hadana**.

<div align="center">

—

صُنع بـ❤️ للسوق المغربي · **SAHAR shop**

</div>
