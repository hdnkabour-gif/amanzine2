# أحدث استئناف — Promo Livraison API (2026-11-13)

- **قدّم المستخدم رابط لوحة البائع** `https://promo-livraison.ma/seller/login` ونسخة من **وثيقة Add Order / Track Order API**. تم تثبيت هذا المرجع كما هو في [AUDIT/92-PROMO-LIVRAISON-API-CONTRACT-2026-11-13.md](./92-PROMO-LIVRAISON-API-CONTRACT-2026-11-13.md)؛ لا تخلط `seller/login` مع `seller/api-parcels`.
- **الطلب الفعلي المُعتمد:** `POST https://promo-livraison.ma/seller/api-parcels`، `Content-Type:application/x-www-form-urlencoded`، `action=add`، `token` في الجسم، وحقول `name,phone,marchandise,marchandise_qty,ville,adresse,note,stock,products[i][sku],products[i][qty],price`. نجاح إضافة `status:200` مع `tracking`، فشل Token `status:401`. التتبع `action=track` و`status:true` وتاريخ في `msg[]`. لا `seller_id` في الوثيقة المقدمة.
- **PR #19 محدث**: https://github.com/hdnkabour-gif/amanzine2/pull/19 — الفرع `repair/amanzine-delivery-connection-truth-20261113`، آخر SHA بعد أمثلة وثائق Promo واختبار HTML 200 غير المعروف `ed99729367d9dba891fde404ed1f5cef231dac95`. أضيفت حماية من `seller/login` كـAPI، منع `seller_id` غير الموثق، اختبار read-only برقم تتبع سابق، رد غير مؤكد بلا tracking أو بعد timeout، وحماية Token من التخزين الواضح في JSONB مع ترحيل مرة واحدة واختبارات PostgreSQL.
- **النتيجة الحالية:** الاختبارات الأخيرة على SHA الجديد لا تزال `pending` / قيد التشغيل (GitHub run `43527581996`) ولا تُعتبر ناجحة؛ **لا دمج ولا نشر** لإصلاح Promo حتى يكتمل CI. لا شحنة حقيقية ولا اتصال بحساب Promo قد أُجري؛ كل الاختبارات تستخدم مُحاكٍ أو PostgreSQL معزولة.
- **خطة المتابعة:** اقرأ سجل تشغيل CI على SHA الأخير وحده؛ أصلح أي فشل؛ ادمج PR #19 إلى Staging فقط بعد Green؛ تأكد من Railway SUCCESS لنفس SHA؛ ثم اختبار واجهة/REST مع mock أو Promo sandbox. إنشاء طرود حقيقية يستلزم إذنًا صريحًا لأن له أثرًا ماليًا. لا تضع Token البائع في دردشة أو Commit أو تقرير.
- **Production ما زال على `main` ولم يُعدّل هنا.**

---

# آخر استئناف — بلاغ التوصيل (2026-11-13 23:05Z)

**البلاغ:** التاجر أدخل شركة التوصيل وجرّب شراء منتج، لكن الشحنة لم تظهر في موقع الشركة. **لا تُفترض شركة بعينها؛ لم يقدّم المستخدم اسمها بعد.**

- **أخطاء مؤكّدة من كود التطبيق وليست نتائج تخمين:** اتصال مزوّد يرجع `{success:false}` لكنه كان يُظهر مقبولًا بسبب `!!object`؛ محوّل Webhook كان يولّد `TRK-...` وهميًا ويُعلن إنشاء شحنة على HTTP 2xx بلا مرجع؛ اختيار شركة صريح كان يُهمل ويُستخدم الافتراضي؛ شحن Offline كان يبدّل الطلب إلى `shipped` رغم عدم الاتصال؛ و`autoSendOnApproval` معطل افتراضيًا، لذا شراء منتج وحده لا يرسل الشحنة.
- **الإصلاحات محفوظة في** [PR #19](https://github.com/hdnkabour-gif/amanzine2/pull/19) على فرع `repair/amanzine-delivery-connection-truth-20261113`. أحدث SHA `32216c60d10ac8b43a18b375501087c56c843b4d`. إصلاحات: فحص اعتماد صارم، طلب مرجع شركة حقيقي بدل رقم داخلي، `confirmation_required` دون إعادة عمياء، منع 409 للإرسال المزدوج، تمرير واختيار شركة التوصيل فعليًا، إيضاح أن WhatsApp للشركة يدوي دون API، اختبارات ردود 401/202/201 وHTTP/PostgreSQL ببيانات وهمية فقط.
- **CI على PR #19:** [Run #43524687206](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43524687206) كان قيد التشغيل عند آخر فحص، وكانت اختبارات Vite والتكوين والمعرفة والمهاجرات ناجحة؛ **لا تسجّل PASS شاملًا أو تدمج حتى رؤية النتيجة النهائية.**
- **الدليل التشخيصي الدائم:** [AUDIT/91-CARRIER-CREATE-TRACE-2026-11-13.md](./91-CARRIER-CREATE-TRACE-2026-11-13.md) يتضمن مسارات الواجهة والخادم وشركات التوصيل المدعومة والاختبارات والحالات.
- **Railway:** آخر نشر ناجح Staging كان SHA `b508733502db92c591a8dd9e0378eba905b724db`، وليس فرع #19. الإنتاج الرئيسي `main` لم يُغيّر. بعد نجاح CI ادمج إلى Staging فقط مع فحص SHA المنشور وREST smoke، ولا ترسل شحنات حقيقية إلى شركة قبل إذن مباشر.
- **معلومة مهمة ناقصة لتحليل الحادث الحقيقي:** اسم شركة التوصيل الفعلية وطريقة الربط (API key / Webhook / رابط موقع فقط). لا تضع مفاتيح API أو كلمات مرور في الدردشة أو GitHub.

---

# AMANZINE — آخر نقطة استئناف: 2026-11-13 22:08Z

> المرجع الأعلى الحالي. الأقسام الأقدم أسفل هذا العنوان محفوظة كتاريخ، وقد أصبحت حالتا #12/#14/#15 فيها قديمتين. **المستودع هو المصدر، وليس ملخص المحادثة.**

- **تم بنجاح في Staging:** PR #13 إصلاح عزل CI (`3b3f34a5`)؛ PR #11 حماية الطلبات (`bcffa870`). نشر Railway للـP0 = `SUCCESS`، واختبار المتصفح/REST/العزل بعد النشر **59/59 PASS**. الدليل الأصلي قبل الإصلاح 58/59 وبعد الإصلاح 59/59 محفوظ في `AUDIT/evidence/` على GitHub. افتح [سجل النتائج](./90-LIVE-EXECUTION-2026-11-13.md).
- **دُمجت إلى Staging كذلك، بعد CI شاملة ناجحة:** PR #12 صدق الاسترجاع/الشحن/المحفظة SHA `083eef32364802b31da030f9f19417201a019758`، PR #14 ثبات مفاتيح Push على `/data` SHA `97f2bd3f4dc8fbb8b8063b9263c177212fa65f0d`، PR #15 دفتر أحداث الطلب في الواجهة SHA `b508733502db92c591a8dd9e0378eba905b724db`. آخر فحص Railway لهذه الدفعة كان `WAITING/BUILDING`، **لا تسجّل نجاح نشرها قبل التأكد من الحالة النهائية والـSHA**.
- **الإصلاحان التاليان غير مدمجين:** PR #16 حماية رموز OTP ومنع التظاهر بإرسال بريد غير موجود؛ PR #17 إعادة تعيين كلمة المرور من الواجهة عبر OTP ورحلة Chromium **J13**. كلاهما Draft، والـCI المرجعي تحت التشغيل. <Link> غير مستخدم؛ راجع https://github.com/hdnkabour-gif/amanzine2/pull/16 و https://github.com/hdnkabour-gif/amanzine2/pull/17.
- **Production الرئيسي لم يتغير.** لا تدفع تغييرات main؛ لا تُرسل رسائل أو شحنًا حقيقيًا أثناء اختبارات Staging.
- **التالي آليًا لدى الاستئناف:** (1) تحقق من آخر Railway SUCCESS على SHA `b508733...`؛ (2) افحص اختبارات #16 و#17 وأصلح الفاشل ثم ادمج فقط ما نجح؛ (3) بعد أي نشر أحدث اختبر regression خاصًا بالمكونات المتغيرة بدل تكرار جميع الاختبارات غير المتأثرة؛ (4) أضف النتيجة وArtifact/JSON إلى `AUDIT/evidence/` وسجل التنفيذ؛ (5) راجع الفروع والـPRs قبل إعادة تشغيل أي شيء.
- **عمّال متوازون حقيقيون:** GitHub Actions يعمل ببناء واختبارات منعزلة لكل فرع، مع evidence/archive workflows، وليس هناك وكلاء AI مستقلون يعملون تلقائيًا بعد انتهاء المحادثة.

---

# استئناف AMANZINE — آخر حالة مؤكدة (2026-11-13، الساعة 21:52Z)

> **هذا القسم أعلى الوثيقة هو مرجع الاستئناف الأحدث.** أي وصف سابق أدناه لفرع #11 أو #13 بأنه Draft وغير مدمج أصبح تاريخيًا ولا يمثل الحالة الحالية. لا تُعتبر تشغيلات CI الجارية PASS.

## الحالة الفعلية

- **PR #13** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/13)) دُمج بنجاح في `staging/pre-production`، SHA=`3b3f34a58a1fa0ad2114e5b7183c0fb3d00f755f`. Railway أعاد نشره `SUCCESS`. أصلح تسمّم PostgreSQL التجريبية بعد اختبار التخريب وقبل Chromium Golden Journeys. [CI ناجح](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43500147084): بناء، PostgreSQL، server tests، sabotage 45، Chromium Golden Journeys 12/12، typecheck.
- **PR #11** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/11)) دُمج بنجاح في Staging، SHA=`bcffa870ab3f9d6495258d18151fcfc00a607bae`؛ [CI على فرع الإصلاح ناجح بالكامل](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43502580400). الخادم العام يمنع الاطلاع على عناصر الطلب بالهاتف وحده؛ التفاصيل تتطلب رمز الطلب ومطابقة الهاتف. **Railway Staging نشر هذا الـSHA بنجاح `SUCCESS`** (Deployment `0445b594-f55e-4383-a7d8-69277cb611b4`، 2026-11-13T21:55:39Z). اختبار الـSmoke التشغيلي أُعيد تشغيله على هذا SHA من [Run #43500545608 محاولة جديدة](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43500545608)، ولا تُعلن 59/59 قبل اكتماله.
- **PR #12** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/12)): استرجاع كلمة المرور، أمان وضع الشحن اليدوي، صدق بيانات المحفظة. أُضيف إلى الفرع CI الموحّد؛ التشغيل المرجعي `43514415090` جارٍ عند آخر معاينة.
- **PR #14** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/14)): إصلاح بقاء VAPID على `/data/vapid.json` عبر نشر Railway وإعادة التشغيل، مع اختبار عملتي Node، ونسخ حارسه المعزول للـCI؛ التشغيل `43514419487` جارٍ.
- **PR #16** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/16)): إصلاح سِرّ OTP: لا تسجيل رمز التحقق في Railway logs عند غياب SMTP أو فشل البريد، ولا ادّعاء إرسال كاذب؛ اختبارات Node وهمية تمنع تسريب الرمز؛ فرع مستقل Draft، يحتاج CI قبل الدمج.
- **PR #15** ([GitHub](https://github.com/hdnkabour-gif/amanzine2/pull/15)): ربط `GET /api/orders/:id/timeline` بالواجهة وعرض دفتر الأحداث الحقيقي والمبلغ والمرتجعات؛ التشغيل `43514428288` جارٍ، ولا دمج قبل نجاح TypeScript.
- **PR #10** وثائق/اختبار، مفتوح Draft؛ خاص بالتدقيق. `AUDIT/90-LIVE-EXECUTION-2026-11-13.md` يحتوي سجل القياسات.
- **الأدلة الدائمة التي لا تنتهي:** `AUDIT/evidence/live-2026-11-13/` فيه ملف `staging-audit-smoke.json` وخمس صور لصفحات التاجر وصورة الهاتف. هذا المستودع يملك النسخ الفعلية؛ ليس مجرد روابط Artifacts المؤقتة. **القياس الأخير قبل نشر الخصوصية:** 58 PASS و1 FAIL أمني.
- **Production الرئيسي (Amanzine / main)** لم يتم تغييره في هذا المسار؛ عمليات الدمج المقصودة تخص staging فقط.

## خطوات الاستكمال دون إعادة أعمال ناجحة

1. تحقق من `Railway amanzine-staging`: البيئة `8a8a6c17-5021-42ac-a15d-3e416d4c2971`، الخدمة `d62e980d-88ef-45a9-8bb9-6ee5a3109581`. لا تدّعِ نشرًا قبل ظهور `SUCCESS` للـSHA الحالي.
2. بعد نجاح نشر `bcffa870...` أعد فقط اختبار Staging التشغيلي على SHA جديد؛ يمكن إعادة job [43500545608](https://github.com/hdnkabour-gif/amanzine2/actions/runs/43500545608) من دون تغيير الكود. إذا نجحت 59/59، احتفظ بالـJSON واللقطات داخل `AUDIT/evidence/` باسم تشغيل جديد؛ **لا تكتب فوق دليل الفشل السابق**.
3. راجع نتائج CI #12/#14/#15 وأصلح الأخطاء الفعلية، ولا تعتبر نجاح `Server tests` وحده نجاحًا للـCI.
4. اجمع الإصلاحات الناجحة إلى staging بدمج متسلسل؛ راجع التعارضات وأعد CI لآخر SHA مع كل حل. لا تتجاوز Production من غير مراجعة.
5. حدّث الملف الحي وسجل الاختبارات بعد كل حدث حاسم. لا تكرر العمل على نفس SHA لمجرد استئناف المحادثة.

---

# نقطة الاستئناف الفعلية — AMANZINE (تحديث 2026-11-13)

> **اقرأ هذا الجزء أوّلًا.** الجدول التاريخي A..Z أسفل هذه الفقرة سجل قديم لوكلاء لم نثبت استمرار تشغيلهم؛ لا تعامله كمهام لا تزال RUNNING. هذه نقطة استئناف قابلة للمراجعة على GitHub بعد توقف المحادثة أو نفاد التوكن.

## ما أُنجز وثُبّت في المستودع

- **الجرد الشامل:** [AMANZINE_FULL_FEATURE_INVENTORY_AND_FIX_PLAN_2026-11-13.md](./AMANZINE_FULL_FEATURE_INVENTORY_AND_FIX_PLAN_2026-11-13.md) — 26 صفحة، 14 مسار عام، 33 وحدة API، 196 تعريف HTTP، 51 مكوّنًا، 45 جدولًا، 19 نتيجة ومصفوفة اختبارات.
- **نتائج تشغيل Staging محفوظة نصيًا:** [90-LIVE-EXECUTION-2026-11-13.md](./90-LIVE-EXECUTION-2026-11-13.md). تشغيل `43496388845`: 22 PASS مسجلة و1 FAIL خصوصية. **تنبيه:** واحدة من 22 PASS (Chromium) كانت False Positive؛ لقطة الشاشة تُظهر Splash «تخطّي». تم تصحيح معيار الاختبار في `test/audit-live-staging.mjs`.
- **PR #10 (Documentation + QA):** https://github.com/hdnkabour-gif/amanzine2/pull/10 — Draft، هدفه staging، لا main.
- **PR #11 (P0 Tracking Privacy):** https://github.com/hdnkabour-gif/amanzine2/pull/11 — Draft، إصلاح خادم + مساعد + TrackOrder/Storefront واختبارات HTTP؛ يجب أن تنجح جميع CI قبل الدمج.
- **PR #12 (P1 Truth & Safety):** https://github.com/hdnkabour-gif/amanzine2/pull/12 — Draft، يستهدف استرجاع كلمة السر وصدق التوصيل والحساب المالي؛ راجع نتائجه قبل الدمج.
- **ضمان طزاجة التقارير:** `.github/workflows/refresh-audit-reports.yml` شُغّل كعامل منفصل على فرع التدقيق وأنتج `REPORTS/audit.json` و`REPORTS/REPO_AUDIT.md` من ملفات Git الفعلية (Tracked=767، Code=484، Lines=92348 في آخر توليد 2026-11-13T20:13:46Z). يبقى الحارس `test/architecture-freshness.test.mjs` مفعّلًا.
- **متصفح تفاعلي حقيقي:** `.github/workflows/audit-live-staging.yml` و`test/audit-live-staging.mjs` — وجهة مسموحة وحيدة Staging، Playwright Chromium، اختبارات هوية وعزل وشاشة، وحفظ JSON ولقطات كـArtifact. لا تكرر تشغيله عند تحديث تقرير.
- **Production لم يتغير.** جميع التغييرات محفوظة في الفروع وPRs، ولم يتم دمجها إلى staging أو main في نقطة الاستئناف هذه. تأكد من حالة الفروع الفعلية قبل أي إعلان جديد.

## توزيع العمل إلى مسارات مستقلة، بلا تعارض

| المسؤولية | المرجع/الفرع | بوابة القبول |
|---|---|---|
| التحقق والوثائق واستعادة السياق | audit/amanzine-full-feature-map-20261113 | Inventory + evidence + freshness |
| أمن خصوصية الطلبات والمجيب | repair/amanzine-p0-tracking-privacy-20261113 | Tests HTTP + tenant isolation + Chromium |
| دقة سلوك التوصيل/الدفع/الاسترجاع | repair/amanzine-p1-truth-and-safety-20261113 | Tests separate + CI |
| PostgreSQL والمهام الثقيلـة والتخريب | .github/workflows/ci.yml | CI green؛ لا Skipped غير مبرر |
| اختبار واجهات Staging الفعلي | .github/workflows/audit-live-staging.yml | لقطات لصفحات حقيقية لا Splash |
| اعتماد الدمج والرجوع | PR review gate | merge staging أولًا، Production فقط بعد موافقة/استعادة |

لا تدّع وجود وكلاء AI مستقلين يعملون في الخلفية إلا إذا كانت هناك مهمات Agent حقيقية مسجلة. GitHub Actions يستعمل عمّال CI مستقلين؛ نتائجهم مرئية في تبويب Actions.

## التالي دون إعادة أعمال سابقة

1. تابع نتائج تشغيل **Operational Staging Audit** المعدّل (فتح صفحات 26 + هاتف + API)، واحفظ artifact في سجل التنفيذ مع SHA.
2. تابع CI للفرعين #11 و#12، وبخاصة `Server tests` و`Golden Journeys` و`Typecheck`. راجع `skipped` قبل أي دمج.
3. أصلح ما يفشل من الاختبارات الحقيقية على الفرع الخاص به؛ لا تعدّل فروع الآخرين عشوائيًا، ولا تفترض نجاح الكود من وجود PR.
4. بعد نجاح CI وبدون تعارضات، استكمل مراجعة ودمج الوثائق ثم الإصلاحات إلى staging، وانتظر نشر Railway SUCCESS ثم أعد smoke على SHA المنشور.
5. انتقل إلى P1 المتبقي: مسار تعلّم unknown-approved → custom_concepts، دفتر أحداث الطلب في الواجهة، VAPID ثابت، Event persistence، offsite backup/restore، و26 صفحة بتجارب فعلية.
6. احفظ فشلًا جديدًا أو نتيجة نجاح في `AUDIT/90-LIVE-EXECUTION-2026-11-13.md` ثم حدّث هذه النقطة. لا تعِد تشغيل حالة PASS على نفس SHA بلا داع.

---

# تدقيقُ AMANZINE المستقلّ — لوحةُ الحالة

> **عقدُ الاستئناف.** هذا الملفُّ هو المصدرُ الوحيدُ لِما أُنجز وما بقي.
> إن انقطعت الجلسةُ أو نفد السياقُ أو توقّف وكيل: يُقرأ هذا الملفُّ أوّلًا،
> ويُستأنَف من أوّل نطاقٍ حالتُه ليست `DONE`. ولا يُعاد ما تمّ.
>
> **قاعدةُ الاستقلال:** لا يُقبَل `REPORTS/**` ولا نصُّ اختبارٍ **دليلًا**.
> الاختبارُ يُقرأ بوصفه *ادّعاءً يُتحقَّق منه*، لا بوصفه حقيقة. الدليلُ
> الوحيدُ المقبول: مصدرٌ (`ملف:سطر`) أو مخرَجُ تنفيذٍ مقيس.

## الحالة

| # | النطاق | الوكيل | المخرَج | الحالة |
|---|---|---|---|---|
| A | سطحُ الخادم: كلُّ مسارٍ ومصادقتُه وملكيّتُه | وكيلٌ يعمل | `AUDIT/raw/A-routes.md` | RUNNING |
| B | مستهلكو الواجهة: كلُّ نداءٍ ووجهتُه | وكيلٌ يعمل | `AUDIT/raw/B-client-calls.md` | RUNNING |
| C | القاعدة: جداولُ وأعمدةٌ وقيودٌ مقابلَ الاستعمال | وكيلٌ يعمل | `AUDIT/raw/C-schema.md` | RUNNING |
| D | سطحُ الواجهة: صفحاتٌ ومسالكُ وأزرارٌ وحقول | وكيلٌ يعمل | `AUDIT/raw/D-ui.md` | RUNNING |
| E | منطقُ الأعمال: طلب · توصيل · دفع · محفظة | وكيلٌ يعمل | `AUDIT/raw/E-domain.md` | RUNNING |
| F | فكرةُ المنتَج: محرّكُ الحاجة/المعرفة — أموصولٌ فعلًا؟ | وكيلٌ يعمل | `AUDIT/raw/F-need-engine.md` | RUNNING |
| G | الهويّةُ والصلاحيّاتُ وعزلُ المستأجرين | وكيلٌ يعمل | `AUDIT/raw/G-security.md` | RUNNING |
| H | التكرارُ والتضاربُ ومصادرُ الحقيقة المتعدّدة | وكيلٌ يعمل | `AUDIT/raw/H-conflicts.md` | RUNNING |
| R | المصالحةُ: تقاطعُ النطاقات وحذفُ المكرّر | أنا | `AUDIT/10-RECONCILED.md` | PENDING |
| V | التحقّقُ التنفيذيّ من كلّ ادّعاءٍ حرج | أنا | `AUDIT/20-VERIFIED.md` | PENDING |
| I | مسحٌ تشغيليٌّ: أخطاءُ متصفّحٍ ونداءاتٌ فاشلة لكلّ صفحة | أنا | `AUDIT/raw/I-runtime.md` | PENDING |
| Z | الحكمُ النهائيُّ وخطّةُ الإصلاح المرحليّة | أنا | `AUDIT/30-VERDICT.md` | PENDING |

## صيغةُ النتيجة المُلزِمة

```
### F-<النطاق><رقم> | BLOCKER|MAJOR|MINOR|INFO | BROKEN|UNWIRED|INCOMPLETE|CONFLICT|DUPLICATE|RISK
**الادّعاء:** سطرٌ واحد.
**الدليل:** ملف:سطر — ونصُّ السطر أو مخرَجُ الأمر.
**الأثرُ على إنسانٍ حقيقيّ:** ماذا ينكسر لتاجرٍ أو زبون.
**الثقة:** CONFIRMED (رأيتُه بعيني) | PLAUSIBLE (يحتاج تنفيذًا)
```

## سجلُّ التقدّم
- تهيئة: أُنشئ العقد.
- الحاويةُ أعادت لقطةً قديمةً (المرّةُ الثالثة) — استُعيدت الحيازةُ من origin قبل أيّ تحليل.
- الأساسُ المقيس على الشجرة الصحيحة: 746 ملفًّا · 58,688 سطرَ إنتاج · 93 خادم · 203 عميل · 51 صفحة.
- أُطلق ثمانيةُ وكلاءَ متوازين (A…H) — كلٌّ يكتب ملفَّه مباشرةً فلا يضيع عملُه بانقطاع.
- قاعدةُ القياس حيّةٌ على المنفذ 5548 (دليلُ البيانات `/var/tmp/amzpg`، 45 جدولًا).
- **مسحٌ تشغيليٌّ بمتصفّح** (نطاق I) يُضاف — لا يغطّيه أيُّ تحليلٍ ساكن.
