# AMANZINE — سجل تنفيذ حي قابل للاستئناف

> **الوقت:** 2026-11-13، تشغيل مستقل عبر GitHub-hosted runner على Railway Staging الحقيقي (ليس Production).
> **الأصل:** اختبار من commit `14aa175ad0a4acab0e94d73a3b4b1800b78fe3ef` على فرع `audit/amanzine-full-feature-map-20261113`.
> **النتيجة المؤكدة:** 22 PASS و1 FAIL. لا تعني نجاح كل التطبيق أو جميع أدواره.

## أدلة التنفيذ التي لا تضيع بانتهاء المحادثة

- [سجل اختبار Staging باستخدام Chromium وHTTP](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43496388845) (Job `132130477551`).
- [حزمة الأدلة JSON + لقطة شاشة آخر صفحة](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43496388845/artifacts/14072755489) (Artifact احتفاظه **14 يومًا فقط**؛ هذا الملف مرجع دائم للنتائج النصية).
- [CI على نفس الـcommit](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43496388486) (FAIL لسبب اختلاف جرد الملفات: العدد في `REPORTS/audit.json` = 763 بينما git tracked = 765 بعد إضافة 2 ملفات؛ 4 مراحل أساسية اجتازت قبل الحارس).
- [الكود الذي شغّل الاختبار](../test/audit-live-staging.mjs) و[workflow](../.github/workflows/audit-live-staging.yml) — روابط المسارات من جذر المستودع: `test/audit-live-staging.mjs` و`.github/workflows/audit-live-staging.yml`.
- [خطة الإصلاح والجرد](./AMANZINE_FULL_FEATURE_INVENTORY_AND_FIX_PLAN_2026-11-13.md).
- [فرع إصلاح خصوصية التتبع](https://github.com/hdnkabour-gif/amanzine2/tree/repair/amanzine-p0-tracking-privacy-20261113)، **منفصل ولم يُنشر على Staging وقت إثبات الثغرة**.

## نتيجة كل حالة — مستخرجة من GitHub Actions لا من تخمين

| # | الحالة | الاسم الوارد من سجل التشغيل |
|---:|---|---|
| 01 | PASS | Health + DB migration |
| 02 | PASS | Auth configuration public |
| 03 | PASS | Marketplace stats and public catalog |
| 04 | PASS | Payment methods report external adapters honestly |
| 05 | PASS | Marketplace phone OTP configuration |
| 06 | PASS | Protected endpoints reject anonymous requests |
| 07 | PASS | Register disposable merchant A |
| 08 | PASS | Register disposable merchant B (tenant isolation fixture) |
| 09 | PASS | Login with QA account and read /me |
| 10 | PASS | Merchant settings, wallet, orders and customers are DB-backed |
| 11 | PASS | Create test product in STAGING only |
| 12 | PASS | Product persists and can be updated |
| 13 | PASS | Tenant B cannot view or change tenant A product |
| 14 | PASS | Public catalog shows published QA product |
| 15 | PASS | Create order with one item (no external delivery or payment) |
| 16 | PASS | Duplicate order idempotency key replays original order |
| 17 | PASS | Tenant B cannot access tenant A order |
| 18 | FAIL | Public phone lookup must not disclose order line items without proof - CONFIRMED PRIVACY RISK: anonymous phone lookup discloses QA order items |
| 19 | PASS | Create and retrieve QA customer |
| 20 | PASS | Cross-tenant customer cannot be read |
| 21 | PASS | Public SPA renders actual Chromium interface |
| 22 | PASS | Cleanup disposable QA customer |
| 23 | PASS | Cleanup disposable QA product |

### تفسير النتيجة

- فحص تسجيل اثنين من التجار أنشأ مستخدمين QA مؤقتين ذوي بريد `@example.invalid`، دون نشر بيانات دخول.
- فُحِص PostgreSQL عبر REST حفظ وقراءة وتعديل: منتج (135 MAD بعد التعديل)، وطلب تجريبي بمفتاح Idempotency، وزبون.
- فحص Cross-tenant منع قراءة وتعديل منتج من حساب ثانٍ، ومنع الاطلاع على طلب وزبون متجر آخر.
- Chromium Headless فَتَح `/`، `/market`، `/explore`، `/login`، وبعض صفحات التاجر `/home`، `/dashboard`، `/products`، `/orders`، `/customers`؛ تحقّق من HTTP 200 ووجود محتوى مرئي ومن عدم ظهور استثناءات JS في تلك الرحلة. **لم ينقر جميع الأزرار ولم يغطّ 26 صفحة أو جميع خدمات الخادم.**
- أزيل المنتج والزبون QA. بقي الحسابان والطلب التجريبي مؤقتًا للتشخيص. لا توجد معلومات حقيقية للزبناء وفق تصريح المالك.

### الثغرة التي أوقفَت تشغيل الاختبار كـSUCCESS

**CONFIRMED BY LIVE HTTP:** `GET /api/orders/track/:phone?userId=...` أعاد عناصر طلب تجريبي دون مصادقة، اعتمادًا على هاتف ومعرّف متجر فقط؛ فشل اختبار privacy. راجع `server/routes/orders.js` و`server/routes/ai.js`.

الإصلاح تحت PR مستقل يجب أن يجعل رقم الهاتف وحده غير كاف، ويضيف regression tests HTTP + AI + صفحات Storefront وTrackOrder؛ بعدها يجب إعادة نفس السيناريو ضد Staging **بعد نشر الإصلاح** لا قبل.

## مشكلة الحارس في CI

`test/architecture-freshness.test.mjs` يفحص عدد `git ls-files` مقابل `REPORTS/audit.json.totals.tracked`.
- أول تشغيل على توثيق PR #10: 762 معلنة مقابل 763 متتبعة (تمت إضافة ملف الجرد).
- تشغيل لاحق بعد إضافة ملفات الاختبار والـworkflow: 763 معلنة مقابل 765 متتبعة (الملفان الجديدان).
- هذا **فشل سلامة تقرير الجرد**، لا فشل React/Vite. لا يجوز إلغاء الحارس؛ تُجدّد تقارير `REPORTS/audit.json` و`REPORTS/REPO_AUDIT.md` عبر `node scripts/audit.mjs` وتحفظ مع كل إضافة ملف.

## مسار الاستكمال — قواعد لا تُكسر

1. **P0** إصلاح Privacy code + phone في خادم الطلبات والمساعد + واجهتي التتبع + 401/403/404 + Tests.
2. **CI** بناء + Brain + Constitution + Knowledge + Architecture freshness + PostgreSQL migration + server tests + Sabotage + Chromium Golden Journey + tsc. كل مرحلة لها اسم ونتيجة محددة؛ `skipped` ليس PASS.
3. **Staging smoke** لا يختبر الكود الجديد قبل نشره. يلزم PR مجتاز، دمج *Staging فقط*، Railway Deployment SUCCESS مع SHA متطابق، ثم إعادة Smoke وتسجيل 23 حالة.
4. **P1** باقي الإصلاحات من الجرد: استرجاع كلمة المرور، رقم التتبع الاصطناعي، مؤشرات المحفظة، إكمال تعلّم Unknown، Order Events UI، VAPID، Activity retention، Backup Restore.
5. **UI** إكمال 26 صفحة، مدخلات وصلاحيات وعزل + 196 مسار HTTP، إلى جانب أجهزة مختلفة. `NOT RUN` يبقى `NOT RUN`.
6. **النشر الحقيقي:** لا دمج إلى main، ولا تفعيل شحن أو مدفوعات أو WhatsApp API بغير قرار منفصل.

## كيفية الاستئناف بعد انتهاء السياق

1. افتح `AUDIT/00-STATE.md` و**هذا الملف** ثم `AUDIT/AMANZINE_FULL_FEATURE_INVENTORY_AND_FIX_PLAN_2026-11-13.md`.
2. راجع أحدث SHA لفرعي `audit/amanzine-full-feature-map-20261113` و`repair/amanzine-p0-tracking-privacy-20261113` قبل أي كتابة.
3. لا تكرر اختبارًا ناجحًا على نفس SHA دون سبب؛ أعد اختبار الانحدار بعد تغيير كود المسار أو Middleware أو API contracts، أو بعد نشر جديد.
4. احتفظ بروابط تشغيل CI + الخطوة الفاشلة + نتيجة HTTP + وقت + SHA؛ لا تفترض أن المحادثة تحفظ السجلات نيابة عن GitHub.
5. عند أول تعديل لأي ملف مؤثر على قائمة الملفات، شغّل مولّد الجرد قبل إعلان اكتمال CI.

## تصحيحٌ إلزاميّ بعد فتح Artifact نفسه — 2026-11-13

**لا تُفسّر 22/23 على أنها 22 رحلة أعمال ناجحة.** ملفات الأدلة الأصلية فُتحت مباشرةً، لا عبر نص سجل CI فقط:

- `staging-audit-smoke.json`: `browserNotes` أظهر `SPA:/:chars=1550`، `SPA:/market:chars=570`، `SPA:/explore:chars=565`، `SPA:/login:chars=221`، لكن **جميع** صفحات التاجر الخمس كانت `MERCHANT:/home:chars=142` و`/dashboard` و`/products` و`/orders` و`/customers` = 142 حرفًا بالضبط.
- `staging-browser-last-page.png` (في [artifact الأصل](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43496388845/artifacts/14072755489)) يعرض **SplashScreen بخلفية خضراء وزر «تخطّي»**، وليس واجهة صفحة العملاء. معنى `PASS Public SPA renders actual Chromium interface` الوارد في السجل ضعيف ومضلّل؛ الاختبار أثبت إنشاء DOM وHTTP 200 فقط **ولم يثبت ظهور صفحات التاجر**.
- `src/App.tsx` يخفي Splash تلقائيًا خلال 5.5 ثوانٍ أو عند `sessionStorage.amanzine_splash='1'`. كود Playwright القديم انتظر 700–900ms فقط بعد `DOMContentLoaded`، ثم التقط الصورة. حسابات QA الجديدة قد تظهر Onboarding أيضًا حتى `settings.onboardingDone=true`.
- **التصحيح المطلوب للاختبار:** حفظ `sessionStorage.amanzine_splash='1'` مسبقًا؛ استعمال كوكيز HttpOnly الفعلية و`ai_commerce_user`، إكمال Onboarding داخل بيانات QA فقط، ثم التأكد من route الحالي ومحتوى خاص بكل صفحة (heading/action) لا مجرد أي نص. أي إعادة توجيه إلى /login أو بقاء Loading/Onboarding/Splash يجب أن تُسقط اختبار صفحات التاجر.
- **التصنيف الصحيح:** 22 `PASS` و1 `FAIL` سجّلها المشغّل؛ **21 PASS موثوقًا على مستوى فحصه، 1 PASS متصفح غير كافٍ / NOT VERIFIED، و1 FAIL أمني مؤكّد**. ليست شهادة اكتمال 26 صفحة.
- يجب حفظ هذا التصحيح للأجيال التالية: *لا تعتمد مخرجات PASS وحدها دون فحص artifact والتأكد من معنى assertion*.

## التشغيل التشغيلي الموسّع — 58 PASS / 1 FAIL (المرجع النهائي الحالي)

- **المصدر:** [GitHub Actions Operational Staging Audit #43500545608](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43500545608)؛ SHA الاختبار `1e3b25597dd1e2f71b3a52e17ec96e8e71c95a36`.
- **المقاس:** `58 PASS`, `1 FAIL`، والفشل الوحيد: `Public phone lookup must not disclose order line items without proof` — تسريب عناصر الطلب الهاتفي غير المصادَق في **Staging المنشور الذي لم يستلم الإصلاح بعد**.
- **واجهة المتصفح:** Chromium شغّل صفحات `/` و`/landing` و`/market` و`/explore` و`/feed` و`/login` و`/register` و`/store/:userId`، ثم جميع **26** مسارًا داخليًا مع فحص `main.innerText` والنصوص المطلوبة للصفحات الرئيسية، بعد تجاوز Splash وإكمال Onboarding لحساب تجريبي فقط. صفحات `/moderation` و`/knowledge-studio` و`/field-visit` ظهرت للمستخدم العادي مع رسالة الصلاحية الصحيحة؛ هذا **لا** يثبت تجربة أدوات مدير المنصة الفعلية.
- **العمليات الموثقة عبر REST:** تسجيل متجرين QA، دخول، طلب مع Idempotency، تعديل منتج وحفظه في PostgreSQL، ظهور المنتج عامًا، إضافة زبون، عزل منتج/طلب/زبون بين حسابين، حذف المنتج والزبون بعد الاختبار. بقي حسابا QA والطلب التجريبي في Staging؛ لا ترسل رسائل لأرقام QA، ولا تدفع/تشحن فعليًا.
- **الهاتف:** 390×844 px، فحص `/home` و`/market`، سجل PASS. لا يثبت توافق أجهزة iOS وAndroid المختلفة كلها.
- **اللقطات الأصلية**: [Artifact #14073956293](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43500545608/artifacts/14073956293) ويضم `staging-audit-smoke.json` و`screens/home.png` و`screens/dashboard.png` و`screens/products.png` و`screens/orders.png` و`screens/customers.png` و`staging-browser-last-page.png`؛ **تنتهي صلاحية Artifact بعد 14 يومًا**.
- **مدى النجاح:** 58 اختبارًا في Smoke واحد؛ ليس معناها 58 ميزة مكتملة أو اختبار كل زر، ولا اختبار الدفع والتوصيل الحقيقي ولا صلاحيات Platform Admin داخليًا. اختبار الخصوصية ما زال أحمر حتى نشر PR #11 على Staging ثم إعادة نفس التشغيل.

### CI وبوابات الإصلاح — متابعة آخر تقرير

- [PR #11 — أمن التتبع](https://github.com/hdnkabour-gif/amanzine2/pull/11): كود التصحيح واختبارات الانحدار جاهزة على فرع مستقل، **لم ينشر إلى Staging** عند تشغيل 58/1.
- [PR #12 — أمان/صدق الاستعادة والشحن والمالية](https://github.com/hdnkabour-gif/amanzine2/pull/12): Draft يتطلب اختبارًا كاملًا.
- [PR #13 — عزل أثر اختبارات التخريب عن Golden Journeys](https://github.com/hdnkabour-gif/amanzine2/pull/13): يضيف تنظيف وإعادة ترحيل قاعدة بيانات CI التجريبية فقط (مع التحقق الصارم من عنوان `127.0.0.1:5432/amz`). **المسبب المقاس لفشل J12**: بعد `npm run sabotage`، `POST /api/orders` يفشل 500 بسبب فهرس تعارض غير مطابق؛ السجل [CI #43497629733](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43497629733) يثبت 11/12 رحلات ناجحة قبل هذا العطب.
- [PR #14 — مفاتيح VAPID الدائمة](https://github.com/hdnkabour-gif/amanzine2/pull/14): يستعمل `/data/vapid.json` على Railway مع فحص ثبات المفتاح عبر عمليتي Node؛ لا تعلن CI ناجحًا قبل رؤية النتيجة.

**سياسة الحفظ:** سجل PASS/FAIL وSHA والروابط هنا دائمًا؛ Artifacts على GitHub قابلة للانتهاء. إذا لزم إعادة إنشاء لقطات بعد تاريخ انتهاء صلاحيتها، لا تعِد اختبار وظائف سبق توثيقها إلا بعد تغيير SHA منشور أو حاجة للتحقق من الإصلاح.
