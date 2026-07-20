# AMANZINE — قائمة صلابة ما قبل الإطلاق

## ✅ أُنجز هذه الجلسة (بلا تبعيات خارجية)
- **فهارس PostgreSQL** لمسارات Discover/Explore الحارّة: `products(status, views DESC)` و`products(category)` — إضافةً إلى الفهارس القائمة (user_id/status/city لكل الجداول).
- **اختبارات المحرّكات:** `server/test/engines.test.js` — Ranking, Presentation, Weighted Graph, Live Status, Event Bus, Activity, Analytics, Search intent, AI parsing. **`npm test` → 23/23 ✅**
- **أمان مُحصّن** (الجلسة كاملة): كوكيز HttpOnly · إخفاء الأسرار · عزل المستأجرين · توقيع Webhook · حصص AI · تحقّق TLS للقاعدة · rate-limiting على كل المسارات العامة.
- **أداء الواجهة:** الخريطة (Leaflet) lazy-loaded في chunk منفصل · بحث بـ debounce.

## ⏳ يتطلّب قرارك/بنيتك التحتية (موصى به قبل إطلاق واسع)
| البند | لماذا | كيف |
|---|---|---|
| **Redis Cache** | تسريع Discover/Search المتكرّر + عدّادات معدّل موزّعة | أضف `ioredis`؛ خزّن نتائج `/api/search` بمفتاح (q+city+filters) TTL 60ث؛ انقل الـ rate-limit إلى Redis store |
| **Monitoring (Sentry)** | رصد الأخطاء في الإنتاج | `@sentry/node` + DSN في env؛ `Sentry.init` + middleware — **يحتاج مفتاح DSN** |
| **Logging مهيكل** | تتبّع الطلبات | يوجد `lib/logger`؛ استبدل `morgan('dev')` بـ JSON logger (pino) في الإنتاج |
| **اختبارات E2E** | ثقة قبل الإطلاق | Playmright (مثبّت) — سيناريوهات: دخول/بحث/حجز/طلب |
| **نسخ احتياطي حقيقي** | قرص Railway مؤقّت | جدولة `pg_dump` إلى S3/Supabase Storage (بدل ملفات JSON المحلية) |
| **SEO** | اكتشاف عبر Google | SSR/prerender لصفحات `/business/:id` و`/explore` (Vite SSR أو prerender) + `sitemap.xml` + Open Graph tags |
| **PWA** | تثبيت كتطبيق | `sw.js` موجود — أضف manifest كامل + offline shell + أيقونات كل المقاسات |
| **CDN للصور** | سرعة | Cloudinary مربوط أصلاً — تأكّد أن كل الصور تمرّ عبره لا base64 |

## 🔭 ميزات مؤجّلة (فوق نفس الأساس، بلا إعادة تصميم)
- Payment + Wallet Engine (CMI/COD/محافظ) خلف واجهة موحّدة
- تفعيل قنوات Notification الفعلية (WhatsApp/Email/SMS/Push) — المقاعد جاهزة في `lib/engines/notification.js`
- ربط AI Adapter بنموذج لغوي حقيقي (`ai.setAdapter`) بدل المحلّل القائم على القواعد
- الهجرة التدريجية إلى جدول `businesses` موحّد (العقود ثابتة → بلا تغيير في الواجهة)

## قاعدة ذهبية
البنية الآن **مبنية على محرّكات وعقود ثابتة**؛ كل ما سبق يُضاف كطبقات صغيرة أو يُستبدَل خلف نفس الواجهات — دون إعادة تصميم النظام.
