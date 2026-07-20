# AMANZINE — الخلاصة الشاملة (المنصّة النهائية)

> **AMANZINE ليس متجرًا إلكترونيًا ولا منصة خدمات ولا سوقًا — بل منصة أعمال مغربية موحّدة
> (Unified Moroccan Business Platform / Super App).** كل نشاط (متجر، حرفي، مطعم، طبيب،
> صيدلية، شركة…) هو كيان واحد `Business`، وكل الميزات مبنية فوق محرّكات مشتركة.

---

## 1) الفكرة الجوهرية
مكان واحد يجمع: 🛍️ منتجات · 🛠️ خدمات · 👨‍🔧 مقدّمي خدمات · 🏬 متاجر · 🏷️ سوق مفتوح ·
📅 حجوزات · 🚚 توصيل · ⭐ تقييمات · 💬 محادثات · 📍 اكتشاف محلي · 🤖 ذكاء اصطناعي.
المستخدم لا يفكّر "أنا في قسم الخدمات/المتجر" — بل يبحث عمّا يريد، فيعرض **محرّك واحد** كل ما يناسبه.

---

## 2) المعمار — Evolutionary Architecture (نمَت دون إعادة كتابة)
```
                         Event Bus  (pub/sub داخلي)
                              │
     ┌──────────────┬─────────┼───────────────┬───────────────┐
  Activity       Analytics   Rules Engine   Recommendation   (AI لاحقاً)
  Engine         (وحدات)         │
     │              │            ▼
     ▼              ▼      Notification Engine → in-app / whatsapp / email / push
  Feed          Dashboards
  timelines     (/insights)

        Business Engine (Facade)  ← مصدر الحقيقة يبقى الجداول القائمة
        ┌─────────────┬─────────────┬──────────────┐
     StoreAdapter  ProviderAdapter ListingAdapter  (+ أنواع مستقبلية = Adapter فقط)
        └─────────────┴─────────────┴──────────────┘
                 │ يغذّي
     Search Engine (Pipeline) · Ranking · Presentation Registry · Business Graph (موزون) · Map contract
```
**المبدأ:** الجداول الحالية مصدر الحقيقة؛ المحرّكات طبقات Facade فوقها. إضافة نوع نشاط جديد
(فندق/عيادة/نقل) = Adapter + قدرات + مكوّن عرض — بلا إعادة تصميم.

---

## 3) المحرّكات (Engines) — ما أُنجز
| المحرّك | الدور | المسار/الملف |
|---|---|---|
| **Business Engine** | نموذج Business موحّد عبر Adapters | `lib/business.js` · `/api/business/:source/:id` |
| **Capabilities Engine** | 8 قدرات (products/services/booking/delivery/offers/chat/appointments/marketplace) تقود الواجهة بدل `type` | داخل `business.js` |
| **Presentation Registry** | ترتيب أقسام العرض حسب النوع، منفصل عن القدرات | `lib/engines/presentation.js` |
| **Search Engine** | Pipeline: Normalize→Intent→Engine→Ranking→Response | `lib/engines/search.js` · `/api/search` |
| **Ranking Engine** | ترتيب موزون (مسافة/تقييم/موثوقية/توفّر/شعبية/صِلة) | `lib/engines/ranking.js` |
| **Business Graph** | علاقات موزونة (related/same_category/same_owner) | `lib/engines/graph.js` |
| **Recommendation** | توصيات بقوّة العلاقة | `lib/engines/recommend.js` · `/api/recommend` |
| **Map Engine** | عقد ثابت { viewport, markers, clusters, legend } مستقل عن المكتبة | `lib/engines/map.js` · `/api/search?view=map` |
| **Event Bus** | pub/sub داخلي (أنماط `offer.*`,`*`) | `lib/engines/eventbus.js` |
| **Activity Engine** | كل فعل = Event موحّد (+version)؛ يغذّي كل شيء | `lib/engines/activity.js` · `/api/feed` |
| **Analytics Engine** | مشتركون (Search/Business/Marketplace/Provider/Platform) | `lib/engines/analytics.js` · `/api/insights` |
| **Rules Engine** | قواعد العمل بين الأحداث والإشعارات (+throttle) | `lib/engines/rules.js` |
| **Notification Engine** | توزيع على القنوات خلف واجهة موحّدة | `lib/engines/notification.js` |

---

## 4) الميزات
**للمستهلك:** استكشاف محلي حسب المدينة (`/explore`) · بحث موحّد ذكي بالنيّة (عربي/دارجة/فرنسي) ·
فلاتر شاملة (مدينة/تصنيف/سعر/تقييم/موثّق/توصيل/حجز/عروض/مسافة) · صفحة نشاط موحّدة ديناميكية
(`/business/:source/:id`) · حجز موعد (مع كشف تعارض) · تتبّع طلب · سوق مبوّب (`/market`) · عجلة حظّ.

**للتاجر/المقدّم:** لوحة تحكم (منتجات/طلبات/زبائن/محادثات/تحليلات/كوبونات/ولاء/توصيل/بثّ) ·
إدارة الحجوزات ومقدّمي الخدمات · مساعد AI · نشر اجتماعي · ربط WhatsApp/Cloudinary/AI keys.

**للمنصّة:** لوحات تحليلية من تدفّق الأحداث · إشعارات مقودة بقواعد · Activity Feed (local/category/trending/following).

---

## 5) الأساسيات التقنية والأمان
- **الواجهة:** React + Vite + TypeScript (strict) · **الخادم:** Express + PostgreSQL (pg) · WebSocket فوري · نشر Railway/Nixpacks.
- **مصادقة:** JWT + **كوكيز HttpOnly فقط** (C-3) + تدوير refresh + OTP/2FA + Social login.
- **أمان مُحصّن هذه الجلسة:** إخفاء أسرار الطرف الثالث عن العميل (H-1) · عزل المستأجرين (C-1/H-6) ·
  منع تسريب PII (C-2) · تحقّق توقيع Webhook (H-3) · حماية Prototype Pollution (H-2) ·
  حصص تكلفة AI (H-5) · تحقّق TLS للقاعدة (M-8).
- **العزل في الطبقة العامة:** الاكتشاف يكشف **فقط** المنشور/المعتمَد (لا PII، لا أسرار)، محدود المعدّل.

---

## 6) الحالة والمتبقّي
**مُنجز:** كل ما سبق (backend كامل + واجهات Explore/BusinessProfile/Bookings).
**التالي (فوق نفس الأساس، بلا إعادة تصميم):**
1. واجهة Activity Feed + الخريطة التفاعلية (Leaflet فوق عقد Map الجاهز)
2. AI Engine (يقرأ Business Graph + Activity Stream عبر `find()`)
3. Payment + Wallet Engine (CMI/COD/محافظ — خلف واجهة موحّدة)
4. تفعيل قنوات Notification الفعلية (WhatsApp/Email/Push) — المقاعد جاهزة
5. الهجرة التدريجية إلى جدول `businesses` عند الحاجة (العقود ثابتة)

---
*AMANZINE 🇲🇦 — منصة أعمال موحّدة قابلة للنموّ سنوات دون إعادة كتابة.*
