# AMANZINE — سجل التغييرات الكامل لهذه الجلسة

**20 commit · 69 ملفًا · +3722 / −246 سطر · tsc نظيف · build ناجح · اختبارات الخادم 13/13**

---

## 🔒 أولًا: إصلاحات أمنية وجودة (على الكود القائم)

| الرمز | ماذا أُصلح | الملفات |
|---|---|---|
| **H-1** | الأسرار (مفاتيح AI/واتساب/Cloudinary/Brevo/hCaptcha) لم تعد تُعاد للمتصفح — تُقنَّع بـ `••••`، والحفظ يتجاهل القناع فلا يمسح السر | `lib/secrets.js`, `routes/settings.js` |
| **C-3** | هجرة كاملة للمصادقة إلى **كوكيز HttpOnly**: middleware يقبل Bearer أو الكوكي، refresh/logout عبر الكوكي، إزالة التوكن من localStorage (مع هجرة سلسة)، WS backoff + إيقاف بعد الخروج | `middleware/auth.js`, `routes/auth.js`, `src/services/api.ts`, `src/store.tsx`, صفحات متعددة |
| **H-5** | حصّة يومية لطلبات الذكاء الاصطناعي لكل مستخدم (حماية التكلفة) | `middleware/ai-quota.js`, `routes/ai.js` |
| **M-8** | تحقّق شهادة TLS لقاعدة البيانات في الإنتاج (بدل قبول أي شهادة) | `server/db.js` |
| **M-5** | أزرار "حفظ" الوهمية أصبحت صادقة (حفظ تلقائي) | `SettingsPage.tsx` |
| **BrandVideo** | إصلاح خطأ TS2367 (مقارنات ميتة) | `components/BrandVideo.tsx` |

> ملاحظة: بنود Sprint 0 الأخرى (C-1 كوبونات IDOR، C-2 تسريب PII، C-4 كراش OrdersPage، C-5 التتبع بالكود، H-2 deepMerge، H-3 توقيع Webhook، H-6 عزل المستأجرين) كانت **مُصلَحة فعلًا** في الكود المدفوع سابقًا — تحقّقتُ منها ولم تكن تحتاج تغييرًا.

## 🗑️ ثانيًا: محذوفات (تنظيف)
- `server/.npmrc` · `server/database-check.js` (يستورد better-sqlite3 غير المثبّت) · `server/data/commerce.db{,-shm,-wal}` (بقايا SQLite ميتة) — **L-1**
- مفاتيح `brand.name`/`brand.logo` المكرّرة في `defaults.js` — **L-2**

## 🧩 ثالثًا: وحدة alloservix (خدمات + حجوزات)
- **جداول جديدة:** `providers`, `provider_services`, `availability_templates`, `availability_slots`, `bookings` (مقيّدة بالمستأجر) — `migrate.js`, `database.js`
- **مسارات:** `routes/providers.js` (CRUD + اعتماد أدمن + خدمات + توفّر + اكتشاف عام) · `routes/bookings.js` (إدارة + حجز عام مع **كشف تعارض المواعيد** + عزل بين المتاجر)
- **واجهات:** `BookingsPage.tsx` (لوحة التاجر) · `ProvidersBooking.tsx` (حجز الزبون في الـ Storefront)

## 🏛️ رابعًا: Universal Business Platform (المعمار الأساسي)
- **Business Engine (Facade)** — `lib/business.js`: نمط **Adapter** (Store/Provider/Listing) + **Capabilities Engine** (8 قدرات تقود الواجهة بدل `type`). الجداول القائمة تبقى مصدر الحقيقة.
- **Business Profile ديناميكية** — `BusinessProfile.tsx` + `/api/business/:source/:id`: مكوّن واحد لكل الأنشطة، أقسام يقودها **Section Registry** + capabilities، مع "ذات صلة" و"آخر النشاط".
- **عقد API واحد** يعتمد عليه كل الواجهة (`businessAPI`).

## ⚙️ خامسًا: المحرّكات (Engines)
| المحرّك | الملف | الدور |
|---|---|---|
| Ranking | `engines/ranking.js` | ترتيب موزون (مسافة/تقييم/موثوقية/توفّر/شعبية/صِلة) |
| Search (Pipeline) | `engines/search.js` | Normalize→Intent→Engine→Ranking→Response + فلاتر شاملة |
| Presentation | `engines/presentation.js` | ترتيب الأقسام حسب النوع، منفصل عن القدرات |
| Business Graph (موزون) | `engines/graph.js` | علاقات بأوزان 0..1 (كاميرات→إنذار 0.95…) |
| Recommendation | `engines/recommend.js` | توصيات بقوّة العلاقة · `/api/recommend` |
| Map | `engines/map.js` | عقد ثابت { viewport, markers, clusters, legend } |
| **Event Bus** | `engines/eventbus.js` | pub/sub داخلي (أنماط) |
| **Activity** | `engines/activity.js` | كل فعل = Event موحّد (+version) · `/api/feed` |
| **Analytics** | `engines/analytics.js` | مشتركون معياريون + `forBusiness` · `/api/insights` |
| **Rules** | `engines/rules.js` | قواعد العمل بين الأحداث والإشعارات (+throttle) |
| **Notification** | `engines/notification.js` | توزيع على القنوات (in-app فعّال؛ WA/Email/Push مقاعد) |

**المسارات الجديدة:** `/api/search` (موحّد، يلغي Discover كمحرّك مستقل) · `/api/discover` (alias رجعي) · `/api/business/*` · `/api/recommend` · `/api/feed` · `/api/insights` (+`/me`) · `/api/track`.

## 🖥️ سادسًا: واجهات المستخدم
- **`/explore`** — بحث موحّد ذكي (نيّة عربي/دارجة/فرنسي) + فلاتر شاملة + 🔥رائج + ❤️قد يعجبك + تبديل **قائمة/خريطة**.
- **الخريطة** — `MapView.tsx`: **Leaflet + OpenStreetMap** مضمّنة (بلا CDN، lazy، آمنة CSP)، علامات متجهية + "ابحث في هذه المنطقة".
- **`/feed`** — `ActivityFeed.tsx`: نشاط أعمال (رائج/محلي/متابَع).
- **لوحة التاجر** — `LivePulse` في `DashboardPage`: مشاهدات/نقرات/CTR/حجوزات + الأكثر مشاهدة (من Analytics)، مع تتبّع view/click من Explore/Profile.
- **Discover على `/market`** — `DiscoverSections.tsx` (منتجات/مقدّمون/متاجر عبر كل المتاجر).

## 📚 وثائق
`SUPERAPP_ROADMAP.md` · `AMANZINE_OVERVIEW.md` · `CHANGELOG_SESSION.md` (هذا الملف).

## ⏭️ المتبقّي (فوق نفس الأساس، بلا إعادة تصميم)
Live Business Status + Smart Availability · AI Engine (يقرأ Graph+Stream عبر `find()`) · Payment+Wallet · تفعيل قنوات الإشعار الفعلية · هجرة تدريجية لجدول `businesses` · أداء/Redis/فهارس/اختبارات E2E/PWA/مراقبة.
