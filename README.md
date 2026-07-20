<div align="center">

# 🧠 AMANZINE — نظام تشغيل للحاجة

### Need OS · واجهة سهلة وبسيطة، وعقلٌ قويّ يفهم أيّ شخص وأيّ حاجة

**«شنو محتاج اليوم؟»** — يكتب المستخدم حاجته بالدارجة، فيفهمها العقل ويوصّله للحلّ.

`React 19` · `TypeScript` · `Vite` · `Node/Express` · `PostgreSQL` · `WhatsApp Cloud API` · `5 لغات`

</div>

---

## ✨ ما هو AMANZINE؟

AMANZINE **ليس** متجرًا ولا سوقًا ولا super-app. إنه **نظام تشغيل للحاجة**: سلسلة واحدة
تحكم كلّ شيء —

```
حاجة → إدراك (understand) → قرار → إجراء
Need → Perception → Decision → Action
```

المستخدم يرى سؤالًا واحدًا بسيطًا («شنو محتاج؟») ويشعر أنه مفهوم. المطوّر يرى **مركز
قيادة** يرى العقل ويُعلّمه ويطوّره. الاثنان يعملان على **نفس** المعمار.

**المجالات — منتجات، خدمات، سيّارات، عقارات، وظائف، فنادق، صيانة منزليّة… — بيانات لا
ميزات.** لوحة التاجر والمتجر والسوق أدناه هي **أوّل المجالات** المبنيّة على العقل، لا هويّة
التطبيق نفسها.

> المرجع الأعلى للمشروع في `docs/` (الرؤية → الدستور → ADRs). عند أيّ تعارض:
> **الرؤية ← الدستور ← بقية الوثائق ← الكود.**

---

## 🧩 العقل — Application Knowledge Graph (AKG)

قلب AMANZINE طبقات أربع تحت `src/lib/akg/`: **CORE → SERVICES → MODULES → BRAINS**،
تغذّيها سجلّات معرفة، وتفهم الطلب عبر نقطة إدراك واحدة `understand()`:

- **ستّة سجلّات (مجمّدة):** Page · Workflow · Schema · Capability · Relation · Component.
- **أساس المعرفة (`akg/kb/`):** Vocabulary · Problem · SymptomGraph · Capability · Profession · Tool · Geo · Category.
- **الإدراك:** `الما كيهرب` → تسرّب → مشكلة → قدرة → مهنة (سبّاك) → إجراء — بلا تسمية المهنة.
- **بطاقة «فهمنا طلبك»:** تُظهر ما فهمه العقل + «لماذا؟» (reasoning) لحظيًّا بلا شبكة.
- **مركز القيادة (Control Center):** العقل · خريطة النظام · العقل الحيّ · التعلّم — قراءة
  أولًا، ثمّ Teach/Approve عبر بوّابة بشريّة (لا تعديل ذاتيّ للمعرفة).

القاعدة الحاكمة: **كلّ ما يدخل النظام يُسجَّل → يُفهَم → يُربَط → يصبح قابلًا للاستعمال.**

---

## 🚀 تشغيل سريع

```bash
# 1) تثبيت المكتبات
npm install
cd server && npm install && cd ..

# 2) إعداد البيئة
cp server/.env.example server/.env
#   عدّل server/.env وأضِف JWT_SECRET و DATABASE_URL

# 3) بناء الواجهة ثم تشغيل الخادم
npm run build
node server/index.js
```
افتح: **http://localhost:3001** · فحص الصحة: **/api/health**

```bash
# سكربتات جاهزة — Mac/Linux
chmod +x start.sh && ./start.sh
# Windows: انقر مرتين على start.bat
```

---

## ⚙️ متغيّرات البيئة (`server/.env`)

```env
# ── أساسي ───────────────────────────────────────────
JWT_SECRET=ضع-سلسلة-عشوائية-32-حرفاً        # ضروري
DATABASE_URL=postgres://user:pass@host:5432/db  # PostgreSQL

# ── مدير أوّل تلقائي (اختياري) ──────────────────────
ADMIN_EMAIL=admin@mystore.ma
ADMIN_PASSWORD=Admin1234!
ADMIN_NAME=المدير

# ── الذكاء الاصطناعي (يعمل بدونه بمحاكاة محلية) ─────
GEMINI_API_KEY=AIza...          # مجاني من Google
OPENAI_API_KEY=sk-...           # اختياري
# DeepSeek / Claude / Mistral / Groq ... مدعومة أيضاً

# ── تكاملات (اختياري) ───────────────────────────────
PLATFORM_WHATSAPP_TOKEN= / PLATFORM_WHATSAPP_PHONE_ID=   # تأكيد OTP
CLOUDINARY_URL=                 # رفع الصور
VAPID_PUBLIC_KEY= / VAPID_PRIVATE_KEY=   # إشعارات الويب Push
META_VERIFY_TOKEN= / META_APP_SECRET=    # WhatsApp/Facebook webhook
```

---

## 🏬 المجالات المبنيّة على العقل (أوّل ما أُطلق)

- **لوحة التاجر** — الرئيسية الحيّة، المنتجات (حقول حسب الفئة، وصف بالذكاء)، الخدمات
  للحرفيين، الطلبات (5 مراحل + واتساب)، الزبائن (CRM)، الرسائل الموحّدة، التوصيل،
  الكوبونات + عجلة الحظ، استوديو البانر، محرّر الصور، التحليلات، والإعدادات.
- **صفحة الزبون (Storefront)** — `‎/store/<userId>`: كتالوج بفلترة، سلّة، دفع عند
  الاستلام، 3 تدفّقات للخدمات (حجز/طلب/عاجل)، مساعد دردشة، وتتبّع الطلب.
- **السوق الموحّد (Marketplace)** — `‎/market`: نشر مجاني بلا حساب → مراجعة إدارة →
  تقييمات ⭐ → تواصل مباشر مع البائع عبر واتساب.
- **الذكاء الاصطناعي** — 6 مزوّدين مع تحويل تلقائي عند الفشل ومحاكاة محلّية.
- **تعدّد اللغات** — واجهات الزبون والصفحة الرئيسيّة بخمس لغات مع اتجاه تلقائي RTL/LTR.

---

## 🗺️ المسارات العامة

| المسار | الوصف |
|--------|-------|
| `/` | الصفحة الرئيسيّة — «شنو محتاج اليوم؟» |
| `/market` | السوق المغربي الموحّد |
| `/store/<userId>` | متجر التاجر للزبائن |
| `/login` · `/dashboard` | دخول التاجر · لوحة التحكم |
| `/knowledge-studio` | مركز القيادة (للمطوّر/الأدمن) |

---

## 🔗 واجهة الـ API (موجز)

```text
Auth        POST /api/auth/register · /api/auth/login · /api/auth/refresh
Products    GET  /api/products · GET /api/products/public/catalog?userId=X
Orders      POST /api/orders/public            ← من المتجر/السوق
            GET  /api/orders/track/:phone      ← تتبّع الزبون
            PUT  /api/orders/:id/approve|ship   ← + إشعار واتساب تلقائي
Marketplace POST /api/listings/public          ← نشر إعلان (مراجعة)
            GET  /api/listings/public/catalog   ← الكتالوج الموحّد
            PUT  /api/listings/:id/approve|reject|suspend
            GET/POST /api/listings/:id/reviews  ← التقييمات
AI          POST /api/ai/reply · /api/ai/public-reply · /api/ai/publish
Knowledge   GET  /api/knowledge/brain · /api/knowledge/misses
Health      GET  /api/health
```

---

## 📂 هيكل المشروع

```text
amanzine/
├── src/                      # الواجهة (React + TS + Vite)
│   ├── pages/                # الصفحات (LivingHome, ControlCenter, Dashboard,
│   │                         #   Products, Orders, Storefront, Marketplace ...)
│   ├── components/           # مكوّنات مشتركة (UnderstandingCard, SystemMapPanel,
│   │                         #   LiveBrainPanel, NavBar, GlobalSearch ...)
│   ├── lib/akg/              # العقل: السجلّات الستّ + المحرّكات + systemMap
│   │   └── kb/               # أساس المعرفة (vocabulary, problems, symptomGraph ...)
│   ├── lib/                  # inference, experienceLog, needEngine ...
│   ├── i18n/                 # الترجمة: translations.ts (الإدارة) + public.ts (الزبون)
│   └── store.tsx             # حالة التطبيق (Context)
├── server/                   # الخادم (Node + Express + PostgreSQL)
│   ├── index.js · database.js · migrate.js
│   ├── routes/               # auth, products, orders, listings, ai, knowledge ...
│   └── middleware/ · lib/
├── docs/                     # الدستور: 00_VISION → 08 + adr/ + decisions/
├── public/                   # الأصول الثابتة (الشعار، الأيقونات، PWA)
└── package.json · tsconfig.json · vite.config.ts · Procfile · railway.json
```

---

## ☁️ النشر (Railway / Nixpacks)

البناء عبر Nixpacks ثم `node server/index.js` (يخدم الواجهة المبنيّة + الـAPI). فحص الصحة
على `/api/health`، وتوجيه SPA عبر catch-all. اضبط `DATABASE_URL` و`JWT_SECRET` في
متغيّرات البيئة على المنصّة.

---

## ✅ التحقق والجودة

```bash
npm run build            # بناء الواجهة (Vite)
npx tsc --noEmit         # فحص الأنواع
cd server && npm test    # اختبارات الخادم (node:test)
```
أمان: مصادقة JWT (ساعة) + رموز تحديث دوّارة مُجزّأة (SHA‑256)، استعلامات مُعاملة (لا حقن
SQL)، تشفير أسرار الإعدادات (AES‑256‑GCM)، وحدّ معدّل على النقاط الحسّاسة.

---

## 📞 الدعم والتطوير

<div align="center">

💬 واتساب: **[+212 649 200 188](https://wa.me/212649200188)** · **[+212 612 265 893](https://wa.me/212612265893)**
📍 الدار البيضاء، المغرب 🇲🇦

**تطوير · Developed by:** Alloservix · Abdellatif hadana

`AMANZINE — نظام تشغيل للحاجة © 2026 — جميع الحقوق محفوظة`

</div>
