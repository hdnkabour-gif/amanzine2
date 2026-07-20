# AMANZINE — Full Architecture Audit (Read-Only)

> تدقيق معماري كامل مبني على فحص الكود الفعلي. لا تعديلات — تحليل فقط.
> الحجم: ~31,200 سطر (src + server) · 26 جدول Postgres · 30 مسار API · 15 محرّكًا.

---

# 1. Overall Architecture (المعمار العام)

## الطبقات

```
┌─────────────────────────── FRONTEND (React 19 + Vite + TS strict) ───────────────────────────┐
│  Public: Landing · /explore · /market · /feed · /business/:source/:id · /store/:userId       │
│  Merchant (MainLayout): Dashboard · Products · Orders · Bookings · Messages · Analytics ·    │
│                         Coupons · Delivery · Connections · Settings · Moderation …           │
│  عقد وحيد: src/services/api.ts (businessAPI/bookingsAPI/recommendAPI/feedAPI/trackAPI/…)     │
└───────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                        │ HTTPS (same-origin في الإنتاج) + WebSocket
┌───────────────────────────────────────▼──────────────────────────────────────────────────────┐
│                        BACKEND (Express, server/index.js — عملية واحدة)                      │
│  Middleware: helmet(CSP) · cors(allowlist+credentials) · cookie-parser · rate-limits ·       │
│              auth(JWT: Bearer→HttpOnly cookie) · sanitize/validate · ai-quota                 │
│  Routes (30) ──► Engines (15) ──► database.js (Repository) ──► PostgreSQL                    │
│                     │                                                                         │
│                     └──► Event Bus (in-process) ──► Activity/Analytics/Rules→Notification    │
│  WebSocket: بث فوري لكل تاجر (order_created…) — مصادقة بالكوكي/التوكن                        │
└───────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                        ▼
                     PostgreSQL (Railway) · Cloudinary (صور) · Brevo (بريد) ·
                     Meta Graph (WhatsApp/FB/IG) · مزوّدو AI (OpenAI/Gemini/Claude/…)
```

## كيف تتواصل الوحدات
- **الواجهة ← الخادم:** عقود typed في `api.ts` فقط؛ لا صفحة تعرف SQL أو مصدر البيانات.
- **Routes ← Engines:** المسارات رقيقة؛ المنطق في المحرّكات (`server/lib/engines/*`).
- **Engines ← BusinessService:** البحث/الخريطة/التوصيات/AI كلها تنادي `business.search()/getProfile()` — لا SQL مكرّر.
- **BusinessService ← Adapters:** `StoreAdapter/ProviderAdapter/ListingAdapter` يطبّعون الجداول القائمة إلى نموذج `Business` واحد (Facade — مصدر الحقيقة يبقى الجداول).
- **الأحداث:** أي فعل (`activity.emit`) → **Event Bus** → مشتركون (Analytics تجميع، Rules→Notification إشعار، Feed عرض). المُصدِر لا يعرف المستهلكين.
- **Capabilities تقود الواجهة** (8 قدرات) لا `type`؛ **Presentation Registry** يرتّب الأقسام حسب نوع العرض.

## خريطة الوحدات المطلوبة
| الوحدة | أين | الحالة |
|---|---|---|
| Frontend | `src/` (React+Vite) | ✅ |
| Backend | `server/` (Express) | ✅ |
| Database | PostgreSQL عبر `db.js`(pool)+`database.js`(repo)+`migrate.js` | ✅ |
| Authentication | JWT + HttpOnly cookies + refresh rotation + OTP + Social | ✅ |
| Storage | Cloudinary (صور/فيديو) + uploads محلي fallback | ✅ |
| Business Layer | `lib/business.js` (Adapters+Capabilities) | ✅ |
| Search Engine | `lib/engines/search.js` (Pipeline) | ✅ |
| Business Graph | `lib/engines/graph.js` (موزون) | ✅ |
| Recommendation | `lib/engines/recommend.js` | ✅ |
| Map Engine | `lib/engines/map.js` (عقد) + `MapView.tsx` (Leaflet) | ✅ |
| Activity Engine | `lib/engines/activity.js` + `eventbus.js` | ✅ (in-memory) |
| Analytics | `lib/engines/analytics.js` (+`routes/analytics.js` القديم للمتجر) | ✅ (in-memory) |
| Rules Engine | `lib/engines/rules.js` | ✅ |
| Notification | `lib/engines/notification.js` (in-app فعّال؛ قنوات seams) | 🟡 |
| AI Engine | `lib/engines/ai.js` (rule-adapter + مقعد LLM) + `lib/ai-engine.js` (ردود المتجر) | ✅/🟡 |
| Payment Engine | `lib/engines/payment.js` (cod/wallet/transfer فعّالة؛ CMI/Stripe seams) | 🟡 |
| Wallet | جداول + `walletApply` ذرّي + `/api/wallet` | ✅ |
| Marketplace | `listings` + `/market` + مراجعات + إشراف أدمن | ✅ |
| Bookings | `bookings` + كشف تعارض + واجهتا تاجر/زبون | ✅ |
| Orders | `orders` + خصومات خادمية + تتبّع هاتف/كود | ✅ |
| Products / Services | `products` (type: product/service/digital) + ويزارد | ✅ |
| Stores | `users`+`settings.brand` + Storefront + ملف موحّد | ✅ |
| Providers | `providers`+services+availability | ✅ |

---

# 2. Folder Tree (شجرة المشروع)

```
SAHARSHOP2026/
├── index.html · vite.config.ts · tsconfig.json · package.json     ← إعداد الواجهة
├── railway.json · nixpacks.toml · Procfile · start.sh/.bat        ← النشر (Railway)
├── sw.js + public/sw.js                                           ← Service Workers (⚠️ نسختان)
├── *.md (OVERVIEW/ROADMAP/CHANGELOG/PRELAUNCH/AUDIT/…)            ← وثائق
│
├── public/            أصول ثابتة (شعارات، أيقونات، صور فارغة)
│
├── src/                                        ── FRONTEND ──
│   ├── main.tsx / App.tsx        نقطة الدخول + Router (عام: /explore /market /feed /business /store)
│   ├── store.tsx                 حالة عامة (Context) + إقلاع الجلسة بالكوكي + WS
│   ├── types.ts                  الأنواع (Page/Product/Order/…)
│   ├── services/api.ts           ★ كل عقود الـAPI (auth/products/orders/business/search/feed/track/insights/ai)
│   ├── components/
│   │   ├── MapView.tsx           خريطة Leaflet+OSM (lazy)
│   │   ├── DiscoverSections.tsx  أقسام Discover في /market
│   │   ├── ProvidersBooking.tsx  حجز الزبون في Storefront
│   │   └── (Toast/TourGuide/GlobalSearch/ErrorBoundary/icons/…)
│   ├── pages/
│   │   ├── Explore.tsx           ★ البحث والاكتشاف الموحّد (+AI ask +خريطة)
│   │   ├── BusinessProfile.tsx   ★ صفحة النشاط الديناميكية (Section Registry)
│   │   ├── ActivityFeed.tsx      Feed الأعمال (trending/local/following)
│   │   ├── Marketplace.tsx       السوق المبوّب (listings)
│   │   ├── Storefront.tsx        واجهة متجر التاجر العامة (سلة/طلب/تتبّع/عجلة)
│   │   ├── BookingsPage.tsx      لوحة الحجوزات والمقدّمين (تاجر)
│   │   ├── DashboardPage.tsx     لوحة التاجر (+LivePulse من Analytics)
│   │   ├── ProductsPage.tsx      (⚠️ 2298 سطر — ويزارد المنتجات)
│   │   ├── Orders/Messages/Customers/Analytics/Coupons/Delivery/
│   │   │   Connections/Settings/Moderation/Onboarding/Auth…
│   │   └── Landing/              صفحة الهبوط (أقسام مفكّكة)
│   ├── i18n/                     ترجمات (ar/fr/en/دارجة) — العام مربوط، لوحة التاجر جزئياً
│   └── utils/ · lib/ · data/     أدوات (أصوات/دفع إشعارات/حقول فئات)
│
└── server/                                     ── BACKEND ──
    ├── index.js                  ★ التجميع: helmet/CORS/limits + mount المسارات + WS + crons + init المحرّكات
    ├── db.js                     Pool (pg) + TLS verify + وضع بلا قاعدة
    ├── database.js               ★ Repository: كل CRUD + discover* + wallet/payments (1242 سطر)
    ├── migrate.js                إنشاء 26 جدولًا + فهارس (idempotent عند الإقلاع)
    ├── defaults.js               إعدادات المتجر الافتراضية
    ├── middleware/               auth (Bearer→cookie) · validate/sanitize · ai-quota
    ├── lib/
    │   ├── business.js           ★ Business Engine (Adapters + Capabilities + sections)
    │   ├── engines/              ★ 15 محرّكًا (search/ranking/graph/recommend/map/presentation/
    │   │                            status/eventbus/activity/analytics/rules/notification/ai/payment)
    │   ├── ai-engine.js          ردود AI للمتجر (قوالب+مزوّدون) — قديم لكنه مستعمل
    │   ├── secrets.js            تشفير الأسرار at-rest + قناع العميل
    │   ├── otp.js/logger.js/config.js
    ├── routes/                   30 ملف مسار (انظر §4)
    ├── test/                     23 اختبار وحدة (secrets/validate/engines)
    └── sync.js                   مزامنة اختيارية إلى Supabase
```

---

# 3. Database (قاعدة البيانات)

## الجداول (26)
| الجدول | الدور | FK رئيسية |
|---|---|---|
| **users** | التجار/الحسابات | — |
| **settings** | JSONB لكل تاجر (brand/ai/social/promotions… أسرار مشفّرة) | user_id→users (PK) |
| **products** | منتجات/خدمات/رقمي (type) | user_id→users CASCADE |
| **orders** | طلبات (+customer_code سرّي للتتبّع) | user_id→users |
| **customers** | زبائن التاجر | user_id→users |
| **conversations** | محادثات + رسائل JSONB | user_id→users |
| **delivery_providers** | شركات توصيل التاجر | user_id→users |
| **broadcasts / templates** | بثّ وقوالب رسائل | user_id |
| **coupons** | كوبونات (+عجلة WHEEL-) | user_id |
| **notifications / audit_logs** | إشعارات وسجلّ | user_id |
| **loyalty_points** | ولاء | user_id + customer_id→customers CASCADE |
| **otp_tokens / refresh_tokens** | 2FA + تدوير الجلسات (SHA-256) | user_id |
| **store_events** | تتبّع زيارات المتجر (analytics قديم) | user_id |
| **listings + reviews** | السوق المبوّب + تقييماته | reviews.listing_id→listings CASCADE |
| **providers** | مقدّمو خدمات (+GPS +status اعتماد) | user_id→users CASCADE |
| **provider_services** | خدمات المقدّم (سعر/مدة/مستوى) | provider_id CASCADE |
| **availability_templates/slots** | جدول أسبوعي + فترات | provider_id CASCADE |
| **bookings** | حجوزات (+كشف تعارض بالاستعلام) | user_id, provider_id CASCADE, service_id SET NULL |
| **wallets / wallet_transactions** | محفظة (رصيد ذرّي) + حركات | user_id CASCADE |
| **payments** | سجلّ المدفوعات (provider/status) | user_id SET NULL |

## الفهارس
- **عزل المستأجر:** user_id على كل الجداول الرئيسية ✅
- **Discover الحارّة:** `products(status, views DESC)` · `products(category)` · `listings(status/type/city)` ✅
- **تشغيلية:** orders(created_at DESC) · bookings(provider_id, scheduled_at) · wallet_tx(user_id, created_at DESC) · payments(user_id/order_id) ✅

## ملاحظات
- **جداول غير مستعملة:** لا يوجد جدول ميت. (بقايا SQLite حُذفت هذه الجلسة.)
- **ازدواج بنيوي 🟡:** (1) `store_events`+`routes/analytics.js` (تتبّع قديم بالمسار `/api/analytics/track`) يوازي **Activity/track الجديد** — يعملان معًا؛ يُوحَّدان لاحقًا على Activity. (2) `reviews` مرتبط بـ listings فقط — المتاجر/المقدّمون بلا مراجعات مخزّنة (rating للمقدّم عمودان يدويان). (3) بيانات النشاط موزّعة بين `settings.brand` (متجر) و`providers` (مقدّم) — يوحّدها جدول `businesses` المستقبلي.
- **تحسينات مقترحة:** عمود `published_count` محسوب للمتاجر (بدل subquery في discoverStores) · GIN index على `products(name gin_trgm)` للبحث النصي عند النموّ · جدول `activities` دائم (بدل الذاكرة).

---

# 4. API (30 مسارًا)

**اصطلاحات عامة:** 🔓 عام · 🔐 auth (JWT Bearer/Cookie) · كل المسارات العامة محدودة المعدّل · الإدخال عبر `sanitizeBody` + تحقّقات لكل مسار · الإخراج JSON.

## المحرّكات الموحّدة (الجديدة)
| Endpoint | Auth | In | Out | يعتمد على |
|---|---|---|---|---|
| `GET /api/search` | 🔓 | q,city,type,lat,lng,radiusKm,view,فلاتر(category/verified/ratingMin/delivery/booking/offers/openNow/availableToday/price) | `{intent,filters,weights,businesses,products,(map)}` | Search→Business→Ranking(+Status) |
| `GET /api/discover` | 🔓 alias | q,city | الشكل القديم (products/providers/stores/listings) | يفوّض لـ Search |
| `GET /api/business/search·/nearby·/:source/:id` | 🔓 | — | Business موحّد / `{business,sections,data}` / خريطة | BusinessService |
| `GET /api/recommend` | 🔓 | source+id أو q+city | `{businesses,basedOn/edges}` | Graph+Ranking |
| `GET /api/feed` | 🔓 | type(latest/local/category/trending/following) | `{items,trending?}` | Activity |
| `POST /api/track` | 🔓 (300/5د) | kind+action+businessId | `{ok}` → حدث private | Activity→Bus |
| `GET /api/insights` `/me` | 🔐 | scope? | لقطات التحليلات / مقاييس التاجر | Analytics |
| `POST /api/ai/ask` | 🔓 (ضمن حصص ai) | q,lat,lng | `{understood,filters,businesses,products}` | AI→Search |
| `GET /api/payment/methods` · `POST /charge` 🔐 · `POST /:id/confirm` 🔐 | مختلط | provider,amount,orderId | حالة الدفع/redirect | Payment Engine |
| `GET /api/wallet` | 🔐 | — | رصيد+حركات (قراءة فقط) | walletApply ذرّي |

## alloservix
- `providers`: CRUD 🔐 + `PUT /:id/status` (اعتماد) + services + availability + `GET /public/:userId` 🔓 (معتمَد فقط).
- `bookings`: `GET/POST` 🔐 (كشف تعارض 409) + `PUT /:id/status` + `POST /public` 🔓 (20/س، عزل متجر، سعر خادمي).

## التجارة الأساسية
- `auth` (12): register/login/social/me/refresh/logout/OTP/forgot/reset/change — كوكيز HttpOnly + rotation.
- `products` (6): CRUD 🔐 + `GET /public/catalog` 🔓.
- `orders` (11): CRUD+approve/reject/ship/deliver 🔐 · `POST /public` 🔓 (أسعار خادمية+hCaptcha+حارس هامش) · تتبّع هاتف (تطابق تام) /كود.
- `customers/conversations/coupons/loyalty/delivery/broadcast/media/push/settings`: CRUD تاجر قياسي؛ `settings` يقنّع الأسرار (H-1) وverify-connection يفكّ القناع خادميًا.
- `listings` (13): نشر عام بـ OTP + كتالوج 🔓 + إشراف أدمن (approve/reject/suspend) + مراجعات.
- `ai` القديم (10) 🔐+حصص: ردود/توليد وصف/هاشتاغ/صور/نشر اجتماعي.
- `webhooks/meta`: تحقّق توقيع HMAC على raw body + timingSafeEqual.

---

# 5. Business Flows (تدفّقات المستخدم)

- **Searching:** `/explore` → `/api/search` (نيّة تلقائية: "سباك"=خدمة) → Ranking موزون (مسافة/تقييم/موثّق/مفتوح الآن) → بطاقات موحّدة → نقرة = `track(clicked)` + صفحة النشاط. AI: "أريد نجار اليوم في الرباط" → `/ai/ask` → فلاتر مفهومة.
- **Buying (منتج):** Storefront → سلة → `POST /orders/public` (السعر من القاعدة، كوبون خادمي، حارس هامش، hCaptcha، حدود كميات) → إشعار تاجر + WhatsApp → تتبّع بالهاتف/الكود.
- **Selling:** تاجر: تسجيل → onboarding → منتجات (ويزارد) → مدينة+ساعات في الإعدادات → يظهر في Explore. بائع سريع: `/market` → نشر إعلان بـ OTP → إشراف أدمن → كتالوج عام.
- **Booking:** زبون: صفحة نشاط/Storefront → حجز (تاريخ/خدمة) → `bookings/public` (تعارض 409) → pending → تأكيد التاجر. تاجر: BookingsPage (اعتماد مقدّمين، تأكيد/إنهاء/إلغاء).
- **Marketplace:** listings معتمدة + Discover موحّد فوقها + مراجعات نجوم.
- **Merchant Dashboard:** LivePulse (views/clicks/CTR/bookings من `/insights/me`) + إيرادات/طلبات/تنبيهات + تقرير صباحي cron.
- **Orders/Delivery:** Kanban حالات → ship (تتبّع) → مزوّدو توصيل + أتمتة URL (Puppeteer اختياري) + إشعار WhatsApp.
- **Wallet:** عرض رصيد+حركات؛ الشحن server-side فقط (لا self-credit) · الدفع بالمحفظة خصم ذرّي.
- **Notifications:** حدث → Bus → Rules (throttle) → in-app (DB) والقنوات الأخرى seams.
- **AI:** زبون Storefront: ردّ آلي بالقوالب/المزوّد · تاجر: توليد محتوى · منصّة: `/ai/ask`.
- **Recommendations:** صفحة نشاط: "ذات صلة" (Graph موزون) · بحث: "قد يعجبك" (فئات مكمّلة).
- **Maps:** Explore→Map (Leaflet, lazy) → markers من نفس نتائج البحث → "ابحث في هذه المنطقة".
- **Reviews:** على listings (نموذج + نجوم + متوسط)؛ للمقدّمين حقول rating فقط (بلا نموذج بعد).
- **Business Profile:** Hero(حالة حيّة/توفّر/أزرار) → تبويبات حسب capabilities → أقسام Registry (+related+activity).

---

# 6. Engines (المحرّكات وتبعياتها)

```
                         ┌────────── Event Bus ──────────┐
   emit() من المسارات →  │  activity  analytics  rules──►notification
                         └───────────────┬───────────────┘
                                         │ (يقرأ لاحقاً)
   ai ──► search ──► business(BusinessService) ──► db(repo) ──► PostgreSQL
             │            ▲         ▲
          ranking      adapters  status
             │            │
           map        presentation
   recommend ──► graph ──► business
   payment ──► db + bus
```

| المحرّك | المسؤولية | يعتمد على |
|---|---|---|
| **Business** | تطبيع المصادر إلى Business + Capabilities + sections + getProfile | db, presentation, status |
| **Ranking** | score موزون (distance .30, rating .20, verified .15, availability .10, openNow .10, popularity .05, relevance .10) | — (نقي) |
| **Search** | Pipeline: Normalize→Intent(ع/دارجة/فر)→Business→Filters→Ranking→Response(+map) | business, ranking, map |
| **Graph** | حواف موزونة (same_category/same_owner/related_to عبر affinity 0..1) | business |
| **Recommend** | forBusiness/forQuery مرتّبة بقوّة العلاقة | graph, business, ranking |
| **Map** | عقد {viewport,bounds,markers,clusters,legend} مستقل عن المكتبة | — (نقي) |
| **Presentation** | ترتيب الأقسام لكل kind (store/service/restaurant/doctor/hotel) | — (نقي) |
| **Status** | حالة حيّة (ساعات+override) + توفّر ذكي (اليوم/غدًا/الأسبوع) | — (نقي) |
| **Event Bus** | pub/sub بأنماط، غير حاجب | — |
| **Activity** | Event موحّد {version,…} + ring 1000 + timelines + trending | bus |
| **Analytics** | وحدات مشتركة (Search/Business/Marketplace/Provider/Platform) + forBusiness | bus |
| **Rules** | حدث→قاعدة→إشعار (+throttle 60ث) | bus → notification |
| **Notification** | قنوات موحّدة (in-app فعّال؛ WA/Email/Push seams) | db |
| **AI** | NL→استعلام (فئة/مدينة/اليوم/ثقة + problem-hints) + setAdapter لـ LLM | search, graph |
| **Payment** | charge() فوق adapters (cod/wallet/transfer فعّالة؛ cmi/stripe/paypal seams) + أحداث | db, bus |

---

# 7. Current Features (كل ما هو منفَّذ)

**منصّة عامة:** بحث موحّد ذكي بالنيّة · Discover=بحث بلا q · فلاتر شاملة (11) · خريطة Leaflet تفاعلية (بحث بالمنطقة) · Activity Feed (رائج/محلي/متابَع) · صفحة نشاط ديناميكية موحّدة (حالة حيّة، توفّر، حجز، ذات صلة، آخر نشاط) · توصيات موزونة · AI ask · سوق مبوّب بمراجعات وإشراف · اكتشاف حسب المدينة.
**تجارة التاجر:** متجر عام كامل (سلة، خصومات ذكية bundle/شحن مجاني، عجلة حظ، كوبونات، تتبّع، عجلة، واتساب) · منتجات (ويزارد، معرض، فيديو، حقول مخصّصة) · طلبات Kanban + موافقة/شحن/تسليم · زبائن+ولاء · محادثات+AI ردود · بثّ · توصيل (مزوّدون+أتمتة) · تحليلات متجر + LivePulse · كوبونات+عجلة · إعدادات غنية (هوية/مدينة/ساعات/حالة حيّة/ربط 10+ خدمات) · نشر اجتماعي · لوحة حجوزات ومقدّمين.
**بنية:** مصادقة كوكيز HttpOnly+rotation+OTP+Social · تشفير أسرار at-rest+قناع · عزل مستأجرين كامل · rate-limits شاملة · حصص AI · Payment (cod/wallet/transfer) + Wallet ذرّي · Event backbone + Analytics + Rules→Notifications(in-app) · 23 اختبار وحدة · PWA جزئي (sw) · i18n بنية 4 لغات.

# 8. Missing Features (الناقص، بالأولوية)

**🔴 Critical (قبل إطلاق واسع):**
1. **Durability للأحداث/التحليلات** — in-memory تُفقد عند restart (جدول activities + تجميعات يومية).
2. **SEO/SSR** — SPA بلا prerender: صفحات الأنشطة غير قابلة للفهرسة (قاتل لمنصّة اكتشاف).
3. **تفعيل دفع إلكتروني فعلي** — CMI (اعتمادات) + webhook موقَّع.
4. **نسخ احتياطي حقيقي** — pg_dump→S3 بدل JSON على قرص مؤقّت.

**🟠 Important:**
5. قنوات إشعار فعلية (WhatsApp/Email/Push عبر seams الجاهزة) · 6. Redis (cache بحث + rate-limit موزّع + bus) · 7. Monitoring (Sentry) + structured logging · 8. E2E (Playwright) + supertest للعزل/الدفع · 9. مراجعات للمتاجر/المقدّمين (النموذج موجود لـ listings فقط) · 10. ربط AI بـ LLM حقيقي عبر setAdapter · 11. متابعة (followers) حقيقية مخزّنة (الآن localStorage) · 12. توحيد التتبّع القديم (store_events) على Activity.

**🟡 Optional:** طلب خدمة بثّ للمقدّمين (service_requests) · طلب منتج غير موجود · Occasion/مستعمل كنوع · تقويم توفّر مرئي بالساعات · clusters فعلية على الخريطة (العقد جاهز) · صفحة أعمال Feed للنشر اليدوي (منشورات).

**🔵 Future:** هجرة جدول businesses موحّد · عمولات/اشتراكات · مزادات · حجوزات قطاعية (فندق/طبيب بمخططات خاصة) · بحث دلالي embeddings · تطبيق موبايل (Capacitor جاهز جزئيًا).

# 9. Technical Debt (الدين التقني)

**تكرار:**
- `src/components/SystemCheck.tsx` = `src/pages/SystemCheck.tsx` (نسختان متطابقتان تقريبًا).
- `sw.js` (جذر) + `public/sw.js` — المخدوم هو public؛ الجذر legacy.
- تتبّع مزدوج: `store_events`/analytics القديم + Activity الجديد.
- STATUS_AR معرّفة في orders.js وbookings.js (قاموسان).

**كود ميت:** `showMore` في NavBar (state+markup غير مفعّلة من زر ظاهر) · `(window as any).__portfolioRef` و`__sfProducts` (anti-pattern refs على window).

**مكوّنات ضخمة:** ProductsPage **2298** · SettingsPage 1369 · DeliveryPage 1030 · Storefront 985 · MessagesPage 838 — تحتاج تفكيكًا و`useMemo/useCallback` (شبه غائبة).

**أنماط:** `as any` ×254 + `any` واسع (types.ts جزئي) · `alert/confirm` متناثرة · CSS inline بالكامل (لا نظام تصميم مشترك) · i18n غير مربوط بلوحة التاجر (نصوص عربية صلبة) · TikTokFeed بأرقام وهمية.

**أداء:** chunks رئيسية >500kB (تقسيم إضافي مطلوب) · لا cache خادمي · subquery العدّ في discoverStores · بحث LIKE بلا trigram index.

**أمن (متبقٍ منخفض):** `/api/track` يقبل businessId من العميل (تضخيم مقاييس فقط — محدود المعدّل) · بوابات الدفع عند تفعيلها تحتاج تدقيق توقيع مستقلًا · `unsafe-inline` في CSP scripts (قيد React الحالي).

---

# 10. الخلاصة

**AMANZINE اليوم = منصّة أعمال موحّدة مكتملة الهيكل:** 15 محرّكًا فوق Facade+Adapters+Event backbone، عقود ثابتة من القاعدة حتى الواجهة، أمان مُحصّن، و23 اختبارًا أخضر. **نقاط القوة:** قابلية توسّع بلا إعادة تصميم (نوع نشاط جديد = Adapter+قدرات+layout). **الفجوات الحاكمة قبل الإطلاق الواسع:** durability الأحداث، SEO/SSR، تفعيل CMI، نسخ احتياطي حقيقي، Redis/Sentry — كلّها بنية تحتية تُركَّب خلف العقود القائمة. **الدين الأثقل داخليًا:** ProductsPage والـ`any` وi18n لوحة التاجر.
