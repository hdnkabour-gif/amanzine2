# AMANZINE — الجرد الوظيفي والتقني الكامل + خريطة الإصلاح والاختبارات

> **تاريخ اللقطة:** 2026-11-13. **المستودع:** hdnkabour-gif/amanzine2. **مصدر الفحص:** staging/pre-production @ 6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98.
> **نطاق التغييرات:** هذا المستند فقط؛ لم تُصلح شيفرة الإنتاج أو قواعد البيانات في هذه الجولة.
> **مهم:** كلمة «موجود» تعني أنه ظهر في كود أو بنية المشروع، **لا** أنه اجتاز رحلة مستخدم كاملة. حالات E2E جميعها «NOT RUN» حتى يظهر سجل تنفيذ متصفح حقيقي أو API مع قاعدة اختبار.

## 0. طريقة القراءة والتوثيق

**فئات الأدلة:** CODE_CONFIRMED = قراءة مباشرة لكود النسخة المعيّنة؛ RAILWAY_CONFIRMED = نشر/حالة/سجلات Railway؛ REPORTED = ادعاء في ملفات REPORTS/AUDIT يحتاج إعادة تحقق؛ NOT_IMPLEMENTED = ملف يعلن أو يطبق عدم التنفيذ؛ UNWIRED = خادم/مكوّن موجود لكن استدعاء أو استهلاك مفقود؛ NOT_RUN = لم ينفّذ اختبار حي مستقل؛ BLOCKED_EXTERNAL = يحتاج اعتماد/خدمة خارجية.

**لا تُحوَّل هذه المصطلحات إلى شارة «مكتمل» حتى تكتمل:** UI ↔ API ↔ DB ↔ permissions ↔ logging ↔ refresh ↔ negative cases ↔ cross-user ↔ external sandbox، وتُرفق النتيجة وتاريخها وسجلها.

**مصادر المباشرة:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/App.tsx#L292-L345، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/types.ts#L7-L72، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/pages/MainLayout.tsx، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/index.js#L259-L310، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/migrate.js، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/lib/engines/payment.js.

## 1. هوية التطبيق والتشغيل

- **الفكرة:** Need OS؛ «حاجة → فهم (AKG / understand) → قرار → إجراء»، والتجارة واحدة من المجالات فوق العقل، لا كل هوية المنتج. المرجع README.md وPRODUCT_VISION_v3.md.
- **واجهة:** React 19 + React Router 7 + TypeScript + Vite 6 + Tailwind CSS + Leaflet + Recharts + Lucide + Zod.
- **خادم:** Node.js 20+ + Express 4 + PostgreSQL/pg + JWT + HttpOnly Cookies/Refresh + WebSocket + rate limits + helmet + compression + Cloudinary + Web Push + بريد.
- **محرّكات:** Business، Search، Recommendation، Graph، Ranking، Map، Presentation، Status، Activity + Event Bus، Analytics، Rules، Notification، Payment، AI. مصدر مراجعة إضافي: AMANZINE_FULL_ARCHITECTURE.md — يُعامل كوثيقة تصميم لا كبرهان تشغيل.
- **Staging Railway:** project spectacular-victory، env staging، service amanzine-staging، DB Postgres-rqCO، volume /data، domain https://triumphant-courage-staging.up.railway.app؛ آخر deployment SUCCESS بتاريخ 2026-11-12 على SHA أعلاه؛ التطبيق وقاعدة البيانات Online وفق قراءة Railway.
- **بيئة الإنتاج النشطة المختلفة:** env Amanzine، service balanced-growth، main، https://amanzine.up.railway.app — لا تلمسها عند إصلاح staging. توجد بيئة ثالثة اسمها production بخدمة AMANZINE قديمة Offline وبها 61 staged changes خطرة؛ **ممنوع accept-deploy** قبل فرزها.
- **WhatsApp قرار المالك:** الإرسال حاليًا *يدوي* برابط wa.me، ولا WhatsApp Cloud API إنتاجي مربوط. لا تضع فشل API غير مُهيّأ ضمن أعطال الوظائف اليدوية، ولا ترسل رسالة حقيقية أثناء الاختبار.
- **بيانات العمل:** تجريبية وفق تصريح المالك؛ رغم ذلك النسخ الاحتياطي قبل عمليات تغيير البيانات ضروري.

## 2. كل الصفحات الداخلية — 26 مدخلًا من PAGE_URLS

الجدول مستخرج من src/types.ts ومطابق لمعالجات switch في MainLayout.tsx؛ بعض الروابط تستخدم **نفس المكوّن** (services/products وinsights/analytics)، وهذا مقصود حاليًا وليس دليلًا على اكتمال التخصص.

| page id | الرابط | مكوّن العرض | المهمة/الأزرار المطلوب اختبارها | تدقيق |
|---|---|---|---|---|
| home | /home | LivingHome | واجهة الحاجة/البيت الحي، إدراك نية، اقتراح المسار | P1 / UI E2E NOT RUN |
| dashboard | /dashboard | DashboardPage | لوحة التاجر ومؤشرات وملخص الطلبات | P1 / UI E2E NOT RUN |
| products | /products | ProductsPage | منتجات/صور/فيديو/مقاسات/مخزون/نشر | P1 / UI E2E NOT RUN |
| services | /services | ProductsPage | نفس محرك المنتجات مع نوع service | P1 / UI E2E NOT RUN |
| orders | /orders | OrdersPage | طلبات وتأكيد ورفض وشحن وتوصيل وواتساب يدوي | P0 / UI E2E NOT RUN |
| conversations | /messages | MessagesPage | محادثات ومساعد وتحويل بشري | P1 / UI E2E NOT RUN |
| customers | /customers | CustomersPage | CRM والزبناء والولاء | P1 / UI E2E NOT RUN |
| analytics | /analytics | AnalyticsPage | تحليلات المتجر | P1 / UI E2E NOT RUN |
| insights | /insights | AnalyticsPage | صفحة بنفس مكوّن analytics مع سياق آخر | P2 / UI E2E NOT RUN |
| connections | /connections | ConnectionsPage | مفاتيح الربط والتحقق من المزودين | P1 / UI E2E NOT RUN |
| delivery | /delivery | DeliveryPage | شركات التوصيل والمدن والأثمان والأتمتة | P0 / UI E2E NOT RUN |
| notifications | /notifications | NotificationsPage | الإشعارات والبث والحالات | P1 / UI E2E NOT RUN |
| settings | /settings | SettingsPage | العلامة واللغة والتصميم والحماية والنسخ | P0 / UI E2E NOT RUN |
| banner | /studio | BannerStudioPage | إنشاء لافتات | P2 / UI E2E NOT RUN |
| editor | /editor | ImageEditorPage | محرر الصور | P2 / UI E2E NOT RUN |
| import | /import | ChatImportPage | استيراد محادثات/استخراج بيانات عملاء | P1 / UI E2E NOT RUN |
| coupons | /coupons | CouponsPage | الكوبونات وعجلة الحظ | P1 / UI E2E NOT RUN |
| guide | /guide | GuidePage | الدليل والتوجيه | P2 / UI E2E NOT RUN |
| moderation | /moderation | ModerationPage | اعتماد الإعلانات/رفضها/تعليقها — Admin المنصة | P0 / UI E2E NOT RUN |
| bookings | /bookings | BookingsPage | مقدمو الخدمات والحجوزات وتعارض المواعيد | P1 / UI E2E NOT RUN |
| knowledge | /knowledge-studio | ControlCenter | مركز القيادة 11 تبويبًا — أدمن المنصة | P1 / UI E2E NOT RUN |
| wallet | /wallet | WalletPage | رصيد ومعاملات وطرق الدفع | P0 / UI E2E NOT RUN |
| profile | /profile | ProfilePage | هوية المستخدم وملفه | P2 / UI E2E NOT RUN |
| assistant | /assistant | AssistantPage | مساعد الحاجة والمحادثة | P1 / UI E2E NOT RUN |
| publish | /publish | UniversalPublish | نشر عام عبر PageEngine universal.create | P1 / UI E2E NOT RUN |
| field-visit | /field-visit | FieldVisit | زيارات ميدانية والتحقق — أدمن المنصة | P1 / UI E2E NOT RUN |

### 2.1 المسارات العامة للمستخدم والزبون

| المسار | المكوّن/التحويل | الحالة |
|---|---|---|
| / | LandingPage or redirect /home if authenticated | CODE ROUTED / E2E NOT RUN |
| /landing | LandingPage | CODE ROUTED / E2E NOT RUN |
| /auth | AuthPage /home if authenticated | CODE ROUTED / E2E NOT RUN |
| /login | AuthPage /home if authenticated | CODE ROUTED / E2E NOT RUN |
| /register | AuthPage /home if authenticated | CODE ROUTED / E2E NOT RUN |
| /store | Storefront | CODE ROUTED / E2E NOT RUN |
| /store/:userId | Storefront | CODE ROUTED / E2E NOT RUN |
| /store/* | Storefront | CODE ROUTED / E2E NOT RUN |
| /explore | Explore | CODE ROUTED / E2E NOT RUN |
| /feed | ActivityFeed | CODE ROUTED / E2E NOT RUN |
| /market | Marketplace | CODE ROUTED / E2E NOT RUN |
| /business/:source/:id | BusinessProfile | CODE ROUTED / E2E NOT RUN |
| /track/:userId | TrackOrder | CODE ROUTED / E2E NOT RUN |
| * | Fallback landing/home | CODE ROUTED / E2E NOT RUN |

**ملاحظات مسارات:** RouterSync يمنع إعادة توجيه المسارات العامة المعرفة؛ اختبار مباشر عبر URL جديد + تحديث + Back/Forward + Cookie expiry + RTL/LTR + Mobile لكل مسار. مسار track يحتاج userId في الرابط؛ المسار العام آمن فقط إن كان برمز غير قابل للتخمين/إثبات هوية عند عرض البيانات الحساسة.

### 2.2 ملفات Landing والصفحات الداعمة

- صفحات الدعم الموجودة: ActivityFeed، AnalyticsPage، AssistantPage، AuthPage، BannerStudioPage، BookingsPage، BusinessProfile، ChatImportPage، ConnectionsPage، ControlCenter، CouponsPage، CustomersPage، DashboardPage، DeliveryPage، Explore، FieldVisit، GuidePage، ImageEditorPage، KnowledgeStudio، LandingPage، LivingHome، MainLayout، Marketplace، MessagesPage، ModerationPage، NavBar، NotificationsPage، Onboarding، OrdersPage، ProductsPage، ProfilePage، SettingsPage، Storefront، TrackOrder، UniversalPublish، WalletPage.
- Landing المقسمة: Landing/index.tsx، context، data، hooks، api، components، theme، وأقسام Header / PromoBanner / NeedFirst / HowItWorks / LiveMarketplace / Cities / FinalCTA / Footer.
- KnowledgeStudio **ليس ميتًا**: يُحمّل Lazy من تبويب learn داخل ControlCenter. UniversalPublish غلاف لـ PageEngine(page=universal.create). https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/pages/ControlCenter.tsx#L24-L60 وhttps://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/pages/UniversalPublish.tsx#L1-L11.
- لا تفترض أن مجرد استيراد المكوّن يعني أن جميع أزراره موصولة. تقرير REPORTS/REPO_AUDIT.md يشير إلى تغطية اختبار محدودة للصفحات/المكوّنات، ويجب إعادة توليده على نفس SHA.

## 3. جرد API الكامل — 33 Router، و196 تصريح HTTP

**الطريقة:** 33 ملفًا موجودًا تحت server/routes، مركّبة في server/index.js. كل طريق أدناه يضاف إلى البادئة في العمود الأول. المجموع 196 تصريح router.get/post/put/patch/delete؛ خارج هذا العد توجد GET /api/health و GET /api/health/readiness في server/index.js، ومسار SPA fallback وWebSocket /ws. لا يعادل العد 196 سيناريو E2E، ولا يغطي الفروع الداخلية أو اختبار 4xx/5xx.

| بادئة API | العدد | التعريفات METHOD /relative-path |
|---|---:|---|
| /api/auth | 12 | GET /config; GET /me; POST /register; POST /login; POST /social; POST /refresh; POST /logout; POST /request-otp; POST /verify-otp; POST /forgot-password; POST /reset-password; POST /change-password |
| /api/products | 6 | GET /; POST /; GET /:id; PUT /:id; DELETE /:id; GET /public/catalog |
| /api/orders | 13 | GET /; POST /; GET /:id; PUT /:id; PUT /:id/approve; PUT /:id/reject; PUT /:id/ship; PUT /:id/deliver; POST /public; GET /track/:phone; GET /track-code/:code; GET /:id/timeline; POST /:id/events |
| /api/customers | 6 | GET /; POST /; GET /:id; PUT /:id; DELETE /:id; POST /public |
| /api/conversations | 5 | GET /; POST /; PUT /:id; DELETE /:id; POST /:id/messages |
| /api/settings | 16 | GET /; PUT /; GET /logs; GET /notifications; POST /notifications/read; DELETE /notifications; GET /templates; PUT /templates; GET /export; GET /qr; GET /server-config; POST /verify-connection; POST /verify-all; GET /backups; GET /backups/:filename; POST /test-whatsapp |
| /api/delivery | 16 | GET /; POST /; DELETE /:id; POST /create/:orderId; POST /test-connection; GET /cities; GET /quote; POST /track/:orderId; POST /verify/:providerRowId; GET /cities/canonical; POST /sync-cities/:providerRowId; GET /city-mappings/:providerRowId; GET /pricing-rules; POST /pricing-rules; DELETE /pricing-rules/:id; GET /registry |
| /api/broadcast | 2 | GET /history; POST / |
| /api/webhooks | 3 | POST /delivery/:providerRowId; GET /meta; POST /meta |
| /api/analytics | 4 | POST /track; GET /store; GET /; GET /funnel |
| /api/media | 4 | POST /upload; POST /upload-base64; POST /upload-video; GET /files/:filename |
| /api/loyalty | 4 | GET /; GET /:customerId; POST /add; POST /redeem |
| /api/coupons | 6 | GET /; POST /; PUT /:id; DELETE /:id; GET /validate; POST /public/spin |
| /api/ai-search | 1 | POST /ask |
| /api/ai | 20 | POST /reply; POST /generate-description; POST /generate-hashtags; POST /design-product-image; POST /product-search; POST /extract-order; POST /public-reply; POST /whatsapp-confirm; POST /publish; GET /comments/:platform; POST /understand; POST /report-unknown; POST /report-misread; GET /misread-report; POST /judge-misread; POST /uncovered; GET /demand-report; GET /unknown-report; POST /suggest-unknown; POST /judge-unknown |
| /api/delivery-auto | 1 | POST /:orderId |
| /api/push | 3 | GET /vapid-key; POST /subscribe; POST /unsubscribe |
| /api/listings | 13 | POST /public; GET /public/catalog; GET /public/stats; GET /public/:id; GET /; PUT /:id/approve; PUT /:id/reject; PUT /:id/suspend; GET /otp/config; POST /otp/request; POST /otp/verify; GET /:id/reviews; POST /:id/reviews |
| /api/providers | 17 | GET /; GET /my-vouches; POST /:id/verify; GET /:id/visits; GET /field-visits; GET /:id; PUT /:id/concepts; POST /field-visit; GET /by-concept/:conceptId; POST /; PUT /:id; PUT /:id/status; DELETE /:id; POST /:id/services; DELETE /:id/services/:sid; PUT /:id/availability; GET /public/:userId |
| /api/bookings | 4 | GET /; POST /; PUT /:id/status; POST /public |
| /api/search | 1 | GET / |
| /api/recommend | 1 | GET / |
| /api/feed | 1 | GET / |
| /api/insights | 2 | GET /; GET /me |
| /api/track | 1 | POST / |
| /api/wallet | 1 | GET / |
| /api/payment | 4 | GET /; GET /methods; POST /charge; POST /:id/confirm |
| /api/discover | 1 | GET / |
| /api/business | 3 | GET /search; GET /nearby; GET /:source/:id |
| /api/knowledge | 14 | GET /misses; GET /quality; GET /brain; POST /misses/:id/resolve; GET /coverage; GET /concepts/public; GET /concepts; POST /concepts; PUT /concepts/:id; GET /concepts/:id/versions; POST /concepts/:id/revert/:versionId; POST /concepts/merge; GET /aliases; DELETE /concepts/:id |
| /api/needs | 5 | POST /; GET /trending; GET /demand; GET /; PATCH /:id |
| /api/memory | 3 | GET /; POST /sync; DELETE /:key |
| /api/verify | 3 | GET /channels; POST /start; POST /check |

**حراس يجب تدقيقها لكل API:** عام/مصادَق/Platform Admin، ownerId يشتق من token، Rate Limit، Sanitization، Idempotency، Input schema، transaction boundaries، status 400/401/403/404/409، عدم تسريب PII، Webhook signature، CSRF/Origin، سلوك الخطأ ووقت timeout.

## 4. جرد المكوّنات — 51 ملفًا فعليًا

المسار المشترك src/components؛ القائمة شاملة لأسماء ملفات المكوّنات في SHA، ولا تدعي تشغيلًا فرديًا لكل منها:

1. ActivityTimeline .tsx
2. AddConceptPanel .tsx
3. AppKnowledgePanel .tsx
4. BetaMonitorPanel .tsx
5. CapabilityBar .tsx
6. CityPicker .tsx
7. CommandCenter .tsx
8. ConceptPicker .tsx
9. CreateFlow .tsx
10. DeferredAuthBanner .tsx
11. DeliveryOpsPanel .tsx
12. DiscoverSections .tsx
13. ErrorBoundary .tsx
14. ExplainPanel .tsx
15. FeedbackButton .tsx
16. FocusedEdit .tsx
17. GlobalSearch .tsx
18. JourneyAnalytics .tsx
19. KeyboardShortcuts .tsx
20. LiveBrainPanel .tsx
21. LiveSentence .tsx
22. LoyaltyPanel .tsx
23. MapView .tsx
24. MasterBackground .tsx
25. Mirror .tsx
26. MyActivities .tsx
27. MySpaceSections .tsx
28. NeedCapture .tsx
29. NeedDemandPanel .tsx
30. NextStepHint .tsx
31. NotificationToast .tsx
32. OwnerConsolePanel .tsx
33. PageEngine .tsx
34. PlaceImport .tsx
35. PlatformPulsePanel .tsx
36. ProvidersBooking .tsx
37. QRCode .tsx
38. ReadinessPanel .tsx
39. ShareShop .tsx
40. Sparkline .tsx
41. SystemCheck .tsx
42. SystemMapPanel .tsx
43. Threshold .tsx
44. TourGuide .tsx
45. UnderstandingCard .tsx
46. UniversalRenderer .tsx
47. UnknownReview .tsx
48. VerifyCode .tsx
49. VisitFlow .tsx
50. componentRegistry.tsx
51. icons.tsx

**فئات عملية للفحص:**
- **العقل والمعرفة:** AppKnowledgePanel، LiveBrainPanel، UnderstandingCard، ExplainPanel، UnknownReview، AddConceptPanel، SystemMapPanel، ConceptPicker، CommandCenter، ReadinessPanel، BetaMonitorPanel.
- **نشاط/بحث:** ActivityTimeline، MyActivities، GlobalSearch، MapView، DiscoverSections، NeedCapture، NeedDemandPanel، PlatformPulsePanel، JourneyAnalytics.
- **تجارة وخدمات:** ProvidersBooking، DeliveryOpsPanel، LoyaltyPanel، CreateFlow، FocusedEdit، PlaceImport، ShareShop، QRCode، VerifyCode، VisitFlow.
- **واجهة وبنية:** PageEngine، componentRegistry، UniversalRenderer، ErrorBoundary، NavBar (في pages)، NextStepHint، TourGuide، NotificationToast، MasterBackground، KeyboardShortcuts، Mirror، Threshold، Sparkline، icons.
- **ملاحظة:** REPORTS/DISCONNECTED.md يدّعي 0 ملفات إنتاج مفصولة؛ REPORTS/REPO_AUDIT.md يذكر 3 ملفات git يتيمة من نطاق أوسع (build-package.js، sw.js الجذري، .probe1.ts). لا تناقض إن اختلف مجال العد، ويجب عدم حذف أي ملف قبل اختبار bundle ومسار الاستيراد.

## 5. قاعدة البيانات — المكوّنات المعَرّفة في migrate.js

الجداول التالية تظهر في أوامر CREATE TABLE IF NOT EXISTS المقروءة من server/migrate.js على SHA الحالي؛ بعض الجداول متعلقة بمعرفة/سوق/زيارات لا بالبيع فقط. **وجود DDL ليس إثبات وجود البيانات أو سلامة التطبيق الفعلية**.

1. users · 2. products · 3. orders · 4. order_events · 5. customers · 6. conversations · 7. delivery_providers · 8. delivery_provider_city_mappings · 9. delivery_pricing_rules · 10. broadcasts · 11. templates · 12. coupons · 13. notifications · 14. settings · 15. audit_logs · 16. loyalty_points · 17. learning_unknowns · 18. capability_demand · 19. learning_misreads · 20. otp_tokens · 21. refresh_tokens · 22. store_events · 23. listings · 24. reviews · 25. providers · 26. provider_services · 27. availability_templates · 28. availability_slots · 29. bookings · 30. wallets · 31. wallet_transactions · 32. payments · 33. search_misses · 34. search_daily · 35. search_terms_daily · 36. custom_concepts · 37. concept_versions · 38. concept_aliases · 39. provider_concepts · 40. field_visits · 41. provider_verifications · 42. learning_daily · 43. need_requests · 44. user_memory · 45. schema_migrations

**تدفّقات يجب وصلها بالجداول:** المنتجات↔المخزون↔الطلبات↔الأحداث↔المدفوعات؛ المستخدم↔settings↔الكوكي↔Refresh؛ الإعلان↔المراجعة↔الكتالوج؛ مقدّم↔الخدمات↔التوفّر↔الحجز؛ تعلّم unknown/misses↔custom_concepts↔Runtime Knowledge؛ شحن↔تتبّع↔سجل أحداث؛ إشعار↔Push/Email/WA؛ Wallet↔Transactions↔Payment.

**اختبارات DB المطلوبة:** migrate twice and concurrent؛ عدد القيود المخالفة سابقًا ثم VALIDATE؛ audit foreign keys؛ negative and duplicate Idempotency؛ transaction rollback؛ isolation User A/B؛ restore dump إلى DB معزولة؛ عدم مقارنة بيانات الإنتاج إلا read-only.

## 6. مصفوفة الميزات التجارية/الذكية وحالتها الفعلية

| المجال | القدرات الموجودة بالكود | المرحلة/الحكم الصادق | اختبار قبول أساسي |
|---|---|---|---|
| الهوية | Register/Login/Refresh/Logout/OTP/Reset/Social | CODE؛ توجد ملاحظات خصوصية | دخول→تحديث→خروج، استرجاع، عزل حسابين |
| Onboarding | أدوار الحاجة/البائع/المقدم وإعدادات المتجر | CODE؛ E2E NOT RUN | مرة واحدة، لا يمسح الإعدادات في جهاز ثانٍ |
| Need OS | فهم ع/دارجة/فر، قرارات، تفسير، AKG | CODE؛ تعلّم قناة approved غير موصول | عبارة جديدة→تصحيح→اعتماد→فهم بعد reload |
| البحث | Search/Discover/Filters/Map/AI ask | CODE؛ API live E2E NOT RUN | فلاتر مدينة/سعر/مهنة/مرادفات/بدون نتائج |
| Marketplace | قائمة منتجات وخدمات + إعلان سريع + مراجعة أدمن | CODE؛ OTP هاتف معطّل حسب إعداد WA | نشر→pending→admin approve→public |
| المتجر | Storefront/Cart/Service request/Coupon/Spin | CODE؛ E2E NOT RUN | سعر/مخزون يثبتان من الخادم، كوبون صحيح وخاطئ |
| المنتجات | CRUD وصور وفيديو ومتغيرات وتخصيص | CODE؛ E2E NOT RUN | حفظ دائم، صور بعد restart، مخزون عند الطلب |
| الخدمات | Product type=service + provider bookings | CODE؛ مدخلان مختلفان للخدمة | خدمة عادية/عاجلة مقابل booking |
| الطلبات | دورة pending→approved→processing→shipped→delivered/cancelled | CODE؛ دفتر أحداث UI غير موصول | طلب كامل + رفض + تطابق حالات |
| تاريخ الطلب | order_events وTimeline API + orderLifecycle | UNWIRED على واجهة التاجر (التقرير المراجع يدّعي ذلك) | جدول أحداث، رد جزئي، مبلغ متبق |
| الزبناء | CRM + Import + Loyalty | CODE؛ E2E NOT RUN | طلب يرتبط بالزبون وتحديث عبر أجهزة |
| الرسائل | Conversations + AI + WS | CODE؛ E2E NOT RUN | وصول رسالة + عدم تسربها بين المتاجر |
| الاستيراد | ChatImport، استخراج زبناء | CODE؛ E2E NOT RUN | نص دارجة/فرنسي دون تكرار/حفظ صامت |
| شركات الشحن | registry/quotes/cities/manual/auto/retry | CODE + BLOCKED_EXTERNAL للشحن الحي | مساعدة يدوية، لا يولد tracking مزور |
| الدفع | COD/Transfer/Wallet | IMPLEMENTED in code؛ E2E NOT RUN | سجل دفع/تأكيد/استرداد وعزل مالك |
| CMI/Stripe/PayPal | Adapter placeholders | NOT_IMPLEMENTED | لا تُعرض على أنها خيارات حية |
| المحفظة | Balance، transactions، list payments | CODE؛ عرض earned يحتاج تصحيح | مدفوع فقط لا = approved |
| Push | Subscribe/Unsubscribe/send | CODE؛ مفاتيح تتغير بين الإقلاعات | مفتاح ثابت، إعادة اتصال |
| Email | sendOTP، sendWelcome، Notification adapter | EXTERNAL dependent | اختبار صندوق بريد تجريبي |
| WhatsApp | wa.me يدوي + code/API paths مشروطة | **اليدوي هو المعتمد**؛ API غير مفعّل | تحقق من نص ورابط فقط |
| AI خارجي | Gemini/OpenAI/Claude/Grok وغيره ببدائل | بعض Errors في prod logs؛ E2E NOT RUN | تقرير per provider + Fallback صادق |
| analytics | Tracking/Insights/Charts | CODE؛ بعض أحداث ring تضيع عند restart | حدث→مؤشر→restart→بقاء |
| Activity Feed | Feed/Events/Recommendations | CODE؛ durable event storage ناقص | وصول حدث وتثبيته عبر restart |
| التقارير | Dashboard/LivePulse/MorningReport | CODE؛ jobs scheduled في logs | بيانات غير وهمية وتعريف المؤشر |
| العروض | Coupons/Spin/Promo/BannerStudio | CODE؛ E2E NOT RUN | قواعد صلاحية وحدود استخدام |
| الصور | Image Editor + Upload Base64/Video + Cloudinary | CODE؛ Cloudinary adapter active في logs | Upload→Link→Reload→Delete |
| الصلاحيات | Store admin vs Platform admin | CODE؛ E2E multi-user NOT RUN | 401/403/404 على 3 أدوار |
| التحقق الموحّد | verify channels/start/check | CODE؛ channels حسب موفّر | OTP لكل purpose وعدم إعادة استخدام |
| الثيم واللغات | RTL/LTR، Seasonal Theme، i18n | CODE؛ تكامل الترجمة الجزئي يحتاج مراجعة | AR/Darija/FR/EN وتغيّر جهاز |
| PWA / هاتف | sw موجود وMobile UI | NEED REVIEW؛ sw نسختان في التاريخ | Offline, install, caching, reload |
| SEO/SSR | SPA/Vite | NOT IMPLEMENTED SSR بحسب البنية | صفحات عامة قابلة للفهرسة والـmetadata |

## 7. نتائج دقيقة تحتاج إصلاحًا — لا تنفَّذ بلا اختبار انحدار

### F-SEC-01 — P0 / بيانات الطلب العام دون إثبات هوية — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/orders.js#L612-L650 وhttps://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/ai.js#L408-L440.
- **التصرف:** يمكن الاستعلام بهاتف + userId إلى تفاصيل منها المبلغ وعناصر الطلب؛ المجيب العام يستخدم الهاتف أيضًا. حدود المعدل موجودة لكنها ليست إثبات ملكية.
- **الإصلاح:** نقل الوصول إلى token تتبع قوي منفصل أو OTP purpose=order_tracking، وعدم إعادة بيانات PII اعتمادًا على رقم الهاتف وحده؛ حجب العناصر/المال حتى التحقق. ثبّت compatibility للرابط القديم على نحو لا يسرب.
- **التحقق:** اختبارات بدون token، User A/B، اختلاف الأرقام، throttling، عدم تسريب عبر AI.

### F-SEC-02 — P1 / استرجاع كلمة المرور يكشف وجود البريد — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/auth.js#L275-L291.
- **التصرف:** غير الموجود يعيد {sent:true}، والموجود يعيد {sent:true,email:masked}. هذه إشارة تمنعها التعليقات لكنها متاحة فعلاً.
- **الإصلاح:** استجابة موحّدة دائمًا؛ sendOTP وrate-limit غير كاشفين؛ لا تعكس حالة وجود الحساب.
- **التحقق:** نفس HTTP status والحقول والنص لعنوان مسجل وغير مسجل، مع مراقبة Rate Limit.

### F-DEL-03 — P1 / رقم تتبع مختلَق في أتمتة الموقع — CODE_CONFIRMED (مشروط بتوفّر Puppeteer)
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/delivery-auto.js#L19-L85.
- **التصرف:** fallback يولد TRK- عند غياب trackingSelector، ثم يحدّث الطلب ويُرجع real:true.
- **الإصلاح:** لا real:true دون تأكيد خارجي مثبت من المزوّد؛ أرجع manual_required وtracking فارغًا، ولا تنسب رقمًا مولدًا لشركة الشحن.
- **التحقق:** Puppeteer mock success with absent tracking = manual only؛ نجاح حقيقي مع reference valid.

### F-AKG-04 — P1 / اعتماد اقتراح المعرفة لا يغيّر العقل — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/database.js#L1528-L1598، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/lib/understanding.ts#L203-L241، https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/ai.js#L945-L989.
- **التصرف:** judgeUnknown يبدل status في learning_unknowns، بينما مسار المعرفة الفعال يعتمد custom_concepts؛ لا قارئ مثبت لـapproved ضمن هذه القناة.
- **الإصلاح:** تصميم عملية اعتماد ذرّية تصنع أو تصل concept/variant بعد تحقق التصادم، وترصد المصدر والإصدار؛ توحيد learning_unknowns/search_misses أو ربط صريح بينهما.
- **التحقق:** كلمة جديدة قبل وبعد الاعتماد في نافذة مستخدم جديدة + منع الازدواج والتصادم.

### F-ORDER-05 — P1 / دفتر أحداث الطلب غير ظاهر للتاجر — UNWIRED (مؤيد بالتقرير)
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/orders.js#L652-L689، REPORTS/AB-surface وserver/lib/orderLifecycle.js؛ لم يظهر استدعاء من صفحة OrdersPage في الفحص.
- **الإصلاح:** واجهة OrderTimeline داخل تفاصيل الطلب، مع أحداث لا تُعدل، وعمليات الرد الجزئي/المبلغ المستحق الموثقة.
- **التحقق:** approve/ship/deliver/reject timeline ومراجعة المال عند جزء مرفوض.

### F-MONEY-06 — P1 / مؤشر مالية غير دقيق — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/pages/WalletPage.tsx#L57-L67 وhttps://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/src/pages/WalletPage.tsx#L130-L133.
- **التصرف:** earned يجمع delivered + approved رغم تسمية «مداخيل مسلّمة».
- **الإصلاح:** ثلاثة مؤشرات مختلفة: طلبات موافَق عليها، طلبات مسلّمة، مبالغ مدفوعة فعلاً من payments؛ لا مساواة بين الحالة والتحصيل.
- **التحقق:** طلب approved غير مدفوع لا يرفع paid_total.

### F-PUSH-07 — P1 / مفاتيح VAPID تتغير عند الإقلاع — RAILWAY_CONFIRMED + CODE
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/push.js#L9-L47؛ logs بتاريخ 10-12 نوفمبر تولد مفاتيح جديدة كل restart. volume مربوط /data لا server/data.
- **الإصلاح:** زوج ثابت في Railway secrets أو ملف تحت /data بمسار مضبوط، private never logged/committed؛ لا تغيّر المفاتيح كل نشر.
- **التحقق:** subscribe → deploy/restart → نفس public key → إشعار مستلم.

### F-ACT-08 — P1 / Activity Engine volatile — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/lib/engines/activity.js#L11-L61.
- **التصرف:** _ring في ذاكرة السيرفر، وبالتالي يضيع تاريخ نشاط المنصّة بعد restart.
- **الإصلاح:** event outbox/table + consumer idempotent + retention/daily aggregates؛ البث في RAM يصبح cache وليس المصدر الوحيد.
- **التحقق:** emit→restart→feed/insights تحتفظ بالبيانات.

### F-MARKET-09 — P2 / التحقق الهاتفي في سوق الإعلانات غير مفعّل — EXPECTED EXTERNAL DEPENDENCY
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/listings.js#L14-L20 وhttps://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/routes/listings.js#L73-L99.
- **التصرف:** غياب PLATFORM_WHATSAPP_* يجعل OTP بلا gate، لكن listing يبقى pending ولا يظهر إلا بقرار أدمن. هذا يتوافق مع قرار WhatsApp اليدوي الحالي.
- **الإصلاح:** عدم فرض تكامل WA. إبقاء moderation + rate limits؛ إذا لزم إثبات المالك استخدم OTP بريد أو قناة موحدة مستقلة.
- **التحقق:** pending hidden / approved visible / wrong admin 403 / spam throttle.

### F-PAY-10 — P2 / بوابات مالية خارجية غير منفذة — NOT_IMPLEMENTED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/server/lib/engines/payment.js#L65-L86.
- **الإصلاح:** اترك CMI/Stripe/PayPal غير متاحة إلى أن يقرر المالك عقود الدفع وتكتب adapters/webhooks موقعة؛ لا تُعدّ مفاتيح البيئة دليلاً على التنفيذ.

### F-CI-11 — P1 / CI لا يعمل على Push مباشرة لـstaging — CODE_CONFIRMED
- **الدليل:** https://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/.github/workflows/ci.yml#L1-L6، وhttps://github.com/hdnkabour-gif/amanzine2/blob/6c7e5d328e842d5b2b3599eea632c8a4cfbdeb98/.github/workflows/ci.yml#L12-L110.
- **الإصلاح:** تضمين staging/pre-production في push branches، مع require pull request checks، Postgres حقيقي + build + lint + brain/knowledge/server + Golden Journeys + Playwright + no-skips gate.
- **التحقق:** PR للفحص يطلق CI ويكشف كسرًا اصطناعيًا؛ لا نشر إذا فشل.

### F-OPS-12 — P1 / نسخ احتياطي دون برهان Restore خارج الجهاز — NOT VERIFIED
- **الدليل:** Railway logs تعرض Daily Backup إلى /data/backups، وvolumes، لكنها لا تثبت نسخة بعيدة أو نجاح restore.
- **الإصلاح:** pg_dump encrypted إلى تخزين خارجي + retain + checksum + تجارب restore في Staging isolated. لا تنقل/تسترجع في Production دون خطة منفصلة.
- **التحقق:** fresh DB restore + counts + business smoke.

### F-OPS-13 — P1 / بيئة production القديمة تحوي تغييرات مدمرة معلقة — RAILWAY_CONFIRMED
- **التصرف:** old env production غير متاح؛ 61 change تشمل تغيير repo إلى Tech-Platform- وإزالة أسرار؛ لا علاقة لها بخدمة live Amanzine.
- **الإصلاح:** تجميد accept-deploy، توثيق ملكية البيئات، تنظيف/إلغاء التغييرات فقط بعد backup وموافقة صريحة.

### F-SEC-14 — P2 / ملف SQLite موروث داخل المستودع — CODE TREE CONFIRMED
- **الدليل:** server/data/commerce.db و-shm و-wal ضمن شجرة Git.
- **الإصلاح:** فحص البيانات محليًا مع عدم نشر أي محتوى حساس، ثم التخلص من الملفات من current Git وتقييم الحاجة لتنظيف history؛ لا حذف قبل فحص التبعيات.

### F-AI-15 — P2 / أعطال مزوّدي AI الخارجيين — RAILWAY_CONFIRMED in active Production logs
- **الدليل:** log 2026-11-12 يوضح Claude credit too low وGrok API error؛ بعض ردود HTTP 200 كانت ناجحة لكنها ليست إثبات نجاح كل provider.
- **الإصلاح:** health per provider، timeout/circuit breaker، credits alert، clear fallback label، عدم عدّ نص القالب كإجابة LLM.
- **التحقق:** ask known/unknown، provider outage، cost ceiling، honest model field.

### F-DISC-16 — P2 / نقاط API موجودة بلا مستهلك واجهة معروف — REPORTED + SAMPLE CODE
- **دليل أولي:** REPORTS/AB-surface يسجل /api/business/search، /api/knowledge/quality، /api/settings/export، /api/settings/qr، /api/customers/public، وبعض /api/ai (product-search، whatsapp-confirm، comments/:platform، misread-report، judge-misread، demand-report).
- **الإصلاح:** قرّر لكل واحدة: (a) consumer حقيقي في الواجهة + اختبار، (b) API موجه للغير موثق، (c) deprecate بعد التحقق. لا تحذف لمجرد عدم العثور على fetch حرفي.

### F-UI-17 — P2 / فجوات الرؤية/اللغة/التغطية — REPORTED
- **المصدر:** REPORTS/PAGE_ACTIONS.md يذكر 31 فعلًا، منها 25 قابلاً للطلب بالكلام و2 لا و4 غير مستخدمة حسب محلله. REPORTS/REPO_AUDIT.md يقول إن صفحات كثيرة بلا اختبارات.
- **الإصلاح:** قياس click graph & navigation & localization؛ لا تدمج كل action في المحادثة عشوائيًا، بل إذا خدم قرار Need OS.
- **التحقق:** كل زر له أثر قابل للرصد أو وسم «غير متاح»، وليس toast نجاح كاذب.

### F-SCALE-18 — P2 / قوائم بلا pagination خادمي كامل — REPORTED + CODE REVIEW NEEDED
- **المصدر:** AUDIT/raw/G-security-load.md؛ عرض products/orders/customers/conversations غير محدود. لا تضع LIMIT مفاجئًا فتُفقد بيانات مشتقة بالواجهة.
- **الإصلاح:** cursor pagination + summary API مستقل + lazy/load-more + عقد متوافق.
- **التحقق:** 5,000 طلب مع توافق totals والبحث والفلاتر.

### F-UX-19 — P2 / SEO وPWA واللغات — NOT FULLY VERIFIED
- **SEO:** React SPA من دون SSR/prerender موثق؛ يجب قياس crawlability، canonical، metadata، sitemap.
- **PWA:** public/sw.js وsw.js الجذري ضمن تاريخ المشروع؛ تحديد النسخة الفعلية + purge strategy.
- **i18n:** اختبار النصوص RTL/LTR والواجهة الداخلية، حتى إن كان الهيكل موجودًا.
- **تجارب:** Chrome Android، iOS Safari، desktop narrow، keyboard، slow network.

## 8. الاختبارات العملية المطلوبة + وضعها الآن

**النتيجة الحالية:** لم أشغّل Playwright فعليًا داخل Staging ولم أنفذ Login / CRUD / payment mutations، ولم أستعمل اعتمادًا سريًا. Railway أعطى Online وHealth 200 من السجل؛ هذه ليست نهاية مسار الأعمال. REST URL من أداة تصفح عامة لم يُفتح (tool inaccessible)، وهو عائق وصول لا دليل خطأ في الخادم.

| ID | اختبار متصفح/API/DB | الحالة الآن | شرط النجاح |
|---|---|---|---|
| T01 | التسجيل والدخول/الخروج/الكوكي وRefresh عبر reload | NOT RUN | لا ضياع ولا تسرب هوية |
| T02 | استرجاع كلمة المرور ببريد موجود وغير موجود | CODE ISSUE | رد موحد، إرسال فقط لمالك العنوان |
| T03 | Onboarding على جهازين | NOT RUN | نفس الإعدادات والصفحة وعدم reset |
| T04 | المنتجات/الخدمات CRUD + Media upload | NOT RUN | persisted، روابط صحيحة بعد reload |
| T05 | سلة الزبون + stock + coupon + server recalculation | NOT RUN | مبلغ آمن ومنع تزوير |
| T06 | دورة الطلب + idempotency + events | NOT RUN | حالة واتساق DB وUI |
| T07 | تتبع الهاتف/الكود وإثبات الهوية | CODE ISSUE | لا PII بدون proof |
| T08 | الرسائل في تبويبين + WebSocket | NOT RUN | عزل كامل ورسالة واحدة |
| T09 | بائع سريع→pending→approve/reject→catalog | NOT RUN | صحة أدوار وعدم تجاوز gate |
| T10 | حجوزات زمن متداخل 409 وحجز صحيح | NOT RUN | لا double booking |
| T11 | شحن يدوي، مزود غير موصول، URL recipe بلا tracking | CODE ISSUE | manual_required وليس real |
| T12 | طرق الدفع COD/transfer/wallet والبطاقات غير المنفذة | NOT RUN | حسابات وسجلات دقيقة |
| T13 | Knowledge unknown→judge→runtime | CODE ISSUE | تحديث فهم حقيقي عبر صفحة جديدة |
| T14 | AI fallback/credits/per-provider | NOT RUN | جواب صادق ومقاس |
| T15 | Push subscription ثم restart | LOG ISSUE | VAPID ثابت واستمرار الإشعارات |
| T16 | Analytics/Feed بعد restart | CODE ISSUE | تاريخ الأحداث محفوظ |
| T17 | Users A/B, role admin store vs admin platform | NOT RUN | 401/403/404 بلا تسريب |
| T18 | XSS/CSRF/rate-limit/idempotency | NOT RUN | لا تنفيذ غير مصرح به |
| T19 | Mobile+RTL/LTR+accessibility | NOT RUN | لا أخطاء تفاعل/عرض |
| T20 | Database backup/restore on isolated new DB | NOT RUN | data+constraints+smoke passes |
| T21 | صفحات 26 + عامة 14، URL reload/navigation | NOT RUN | صفر 404/blank |
| T22 | E2E كل مسارات API المتصلة بالواجهة | NOT RUN | وثّق response schema/errors |
| T23 | CI on staging current SHA | NOT RUN | كل بوابات الشيفرة والإجراءات خضراء |
| T24 | تحقق كل زر/نموذج/تحميل وصلاحية | NOT RUN | لكل Action أثر أو سبب واضح |

**مصفوفة البيانات التجريبية:** أنشئ Store A وStore B وPlatform Admin وCustomer public، منتج بمخزون وحد أدنى، خدمة بحجزين متداخلين، طلب COD مع كوبون، إعلان pending، مقدّم approved، طلب شحن manual. استخدم أسماء QA_ وdummy numbers، لا تتواصل مع أشخاص حقيقيين ولا موفرين خارجيين.

## 9. التنفيذ المرحلي لتصحيح العطب دون كسر التطبيق

1. **Freeze & Baseline (P0):** لا تغيير main أو Railway Production؛ Snapshot staging commit + اختبار read-only + نسخة DB معزولة؛ جرد كل API وواجهة/مخطط؛ CI على Staging.
2. **Privacy/Security (P0):** أمر تتبّع الطلب وAI العام، تماثل رد forgot-password، عزل Platform Admin، تأكيد حدود rate-limit؛ اختبارات سلبية وUser A/B.
3. **Business Truth (P1):** إزالة tracking الاصطناعي وreal:true؛ فصل Approved/Delivered/Paid؛ عرض سجل order_events من قاعدة صحيحة؛ الاستردادات الجزئية.
4. **Knowledge Loop (P1):** مسار unknown→human approve→concept published بتنسيق واحد وتعارضات معروفة؛ إغلاق الحلقة وتجربة كلمات لم يفهمها التطبيق سابقًا.
5. **Ops Durability (P1):** VAPID ثابت؛ Event persistence؛ Offsite encrypted backups وrestore test؛ مراقبة لكل provider.
6. **UI Contracts (P1/P2):** جدول لكل click/action من 26 صفحة، استهلاك APIs غير الظاهرة، إصلاح أخطاء router/forms/refresh، اختبارات Playwright/real DB.
7. **External Integrations (P2):** WhatsApp اليدوي يبقى يدويًا حتى قرار جديد؛ التوصيل وAI حسب credentials sandbox؛ بوابات الدفع الإلكتروني لا تُعلن جاهزة قبل كتابة adapters والعقود.
8. **Performance/Launch (P2/P3):** pagination متوافقة، UI chunks، i18n RTL، SEO، PWA، وتحميل/موبايل.

**ضمان إصلاح كل مشكلة:** branch مستقل fix/<domain>-<slug>، اختبار يفشل قبل التعديل ويمر بعده، patch صغير، CI كامل، Test on staging، سجل Before/After (request + DB + screenshot)، PR مراجعة، ثم merge للفرع staging فقط. الانتقال للإنتاج يتم بطلب مستقل بعد readiness gate وrollback plan.

## 10. البوابة المطلوبة قبل إعلان «مكتمل»

- [ ] لكل صفحة داخلية وعامة سيناريو Load/Refresh/Back + role/permission.
- [ ] كل عنصر CRUD أساسي يكتب DB حقيقية ويظهر عبر تسجيل دخول جديد.
- [ ] لا يعرض API أو AI عام تفاصيل طلب إلا بعد إثبات هوية مناسب.
- [ ] كل مورد خاص مقيد بهوية المالك (Tenant Isolation) ويثبت رفضه من حساب آخر.
- [ ] الدفع لا يسجل «تم التحصيل» اعتمادًا على الطلب الموافق عليه.
- [ ] الشحن لا يولّد رقم تتبع وهميًا؛ يُذكر real/manual بوضوح.
- [ ] ملفّات push/backup/events تبقى بعد restart؛ Restore مجرب.
- [ ] لا اختبارات skip مخفية في CI ولا PR مدمج إذا فشل gate.
- [ ] كل تكامل خارجي له status واضح ACTIVE / MANUAL / NOT_CONFIGURED / NOT_IMPLEMENTED.
- [ ] لقطات وسجلات E2E وأرقام tests مع تواريخها تُضاف لتقرير مستقل قبل كلمة VERIFIED.

## 11. مراجع ذات صلة وكيفية الاستئناف

- AUDIT/00-STATE.md يسجل أعمالًا معلقة A-H/R/V/I/Z **وفق حالته التاريخية**؛ لا تُقرأ RUNNING دليلًا أنها ما زالت تعمل الآن.
- AUDIT/raw/A-routes.md، AUDIT/raw/AB-surface.md، AUDIT/raw/F-need-engine.md، AUDIT/raw/G-security-load.md.
- REPORTS/REPO_AUDIT.md، REPORTS/PAGE_ACTIONS.md، REPORTS/DISCONNECTED.md؛ هذه تقارير مولدة/قديمة نسبيًا، قابلة للمقارنة وليست بديلًا عن التنفيذ الحالي.
- REPORTS/REPAIRS/STAGING_READY.md يوثق اختبارات محلية مع Postgres/Playwright من جلسة سابقة. بعد ذلك أنشئت خدمة Railway Staging حقيقةً؛ لا تعتمد جملة «Staging غير موجود» في ذلك الملف.
- README.md، AMANZINE_FULL_ARCHITECTURE.md، PRODUCT_VISION_v3.md و .github/workflows/ci.yml.

**آخر عمل تم هنا:** GitHub read-only للملفات والشجرة + Railway service/status/logs؛ هذا المستند هو أول تغيير مقصود في GitHub. لم تتغير Routes/DB/env vars/Secrets/Production. عند استئناف المشروع: اقرأ هذا الملف، ابدأ P0، وسجّل لكل Finding الإصلاح والاختبار في PR منفصل، ولا تحوّل NOT RUN إلى VERIFIED بالتخمين.
