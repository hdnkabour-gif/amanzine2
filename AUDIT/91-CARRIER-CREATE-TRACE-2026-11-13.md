# AMANZINE — تشخيص عدم ظهور الطلب لدى شركة التوصيل
تاريخ الجرد: 2026-11-13 (المغرب). المصدر: قراءة الكود الفعلي على GitHub وبيئات Railway وسجلاتها. لا شحنات حقيقية، ولا وصول لحساب شركة التوصيل، ولا أي مفاتيح منشورة هنا.

## الفارق الأساسي الذي يجب أن يفهمه التاجر
- شراء زبون للمنتج ينشئ طلبًا في `/api/orders`. لا يعني أن شركة التوصيل استقبلت شحنة.
- الموافقة `/api/orders/:id/approve` تشحن تلقائيًا **فقط** عندما `settings.delivery.autoSendOnApproval === true` وتوجد شركة مفعّلة. القيمة الافتراضية في `src/types.ts` هي `false`. في غير ذلك يجب الضغط في `/orders` على زر **«🚚 إنشاء الشحنة»** بعد الموافقة.
- زر إنشاء الشحنة يستدعي `src/store.tsx:shipOrder` ← `POST /api/delivery/create/:orderId` ← `server/lib/shipmentAttempt.js:runShipment` ← `registry.resolve` ← `services/delivery/providers/*.provider.js` أو `adapters/*.adapter.js`. ثم يحفظ الخادم مرجع الشركة إذا **أعطته الشركة مرجعًا فعليًا**.
- رابط موقع الشركة وتسجيل اسمها ليسا ربط API؛ عمل حساب في لوحة الشركة لا يثبت امتلاك API key أو صلاحية CreateShipment. `GET /` أو `HEAD` على موقع الشركة يثبت الاستجابة فقط، لا يقبل/يرفض بيانات الاعتماد.
- الربط المدعوم بالكود: `amana`، `jibli`، `livo`، `forcelog`، `olivraison`، `promo_livraison`، إضافة إلى `webhook` و`url-recipe` كوسيلتي اتصال. الاسم وحده لا يكفي للتعرّف على شركة أخرى؛ التوافق يتوقف على API الرسمي وسلوك حساب التاجر.
- `url-recipe` عبر Puppeteer يسقط إلى المساعدة اليدوية عندما محرّك المتصفح غير متاح؛ `real:false` حينئذ ولا تظهر شحنة آلية على موقع الشركة.

## أخطاء مؤكدة من الكود قبل الإصلاح (لا تخمين بشأن شركة بعينها)
1. **HIGH:** `server/routes/delivery.js`: `const ok=await plugin.testConnection(row)` متبوعًا بـ`!!ok`. شركات كثيرة ترجع كائنًا `{success:false,error:'HTTP 401'}`؛ الكائن truthy ⇒ تظهر **«الشركة تقبل المفتاح»** رغم الرفض. حلّ PR #19: التحقق `verdict.success === true` فقط (أو `true` مباشر) وتوضيح سبب الرفض.
2. **HIGH:** `server/services/delivery/adapters/webhook.adapter.js`: توليد `TRK-...` محلّيًا ثم `success:true` على أي HTTP 2xx دون رقم شركة. المستخدم يفتح لوحة الشركة فلا يرى شحنة رغم تنبيه «شحنة حقيقية». حلّ PR #19: لا رقم مُختلق؛ يُرسَل `clientReference=order.id` و`X-Idempotency-Key`، ويتطلب `shipmentId` أو `trackingNumber` صريحًا من الطرف الخارجي. رد 2xx بلا مرجع = `acceptedUnconfirmed`.
3. **HIGH:** `runShipment` اعتبر `result.success` كافيًا حتى لو `trackingNumber/shipmentId` فارغان. حلّ PR #19: `confirmation_required` مع إشعار وبلا إعادة آلية تمنع تكرار شحنة COD محتملة.
4. **HIGH:** `POST /api/delivery/create/:orderId` كان يمكن استدعاؤه مرة أخرى لطلب لديه رقم شركة أو رد غير مؤكد. حلّ PR #19: 409 مع `SHIPMENT_ALREADY_EXISTS` أو `CARRIER_CONFIRMATION_REQUIRED`؛ التحقق من لوحة الشركة قبل أي إعادة.
5. **MEDIUM:** `/api/delivery/verify` قد يرجع `success:true` دون أي إثبات خارجي إذا لم يُنفّذ فحص API أصلاً. PR #19 لا يقبل ذلك؛ يتطلب إثباتًا من `auth` أو `data` أو `tariffs`. نجاح القراءة لا يثبت نجاح إنشاء الشحنة.
6. **MEDIUM:** `src/pages/DeliveryPage.tsx` حمل شرحًا متقادمًا عن إصدار رقم تتبع محلي؛ PR #19 صححه. واجهة الطلبات أصبحت تعرض `confirmation_required` وتحذر من التكرار.

## الأدلة والاختبارات
- [PR #19: إصلاح مسار التوصيل](https://github.com/hdnkabour-gif/amanzine2/pull/19)، فرع `repair/amanzine-delivery-connection-truth-20261113`. **Draft** إلى أن تنجح CI والاختبارات التشغيلية. لا دمج ولا نشر تلقائيًا هنا.
- انحدار `server/test/delivery-credentials.test.js`: كائن `success:false` يجب ألا يعلن الربط ناجحًا، ويفحص ارتباط المساعد بمسار HTTP.
- انحدار `server/test/delivery-registry.test.js`: رد Webhook 202 دون مرجع = غير مؤكد، رد 201 بمرجع فعلي = نجاح، HTTP 401 = فشل؛ لا تُجرى طلبات إنترنت حقيقية بل محاكاة `global.fetch`.
- `server/test/shipment-retry.test.js`: على PostgreSQL تجريبية، من دون مزوّد حقيقي، تحقق حالة `confirmation_required` وعدم الإعادة ومرجع الشحن الحقيقي فقط.
- سجلات Railway المعاينة شملت آخر **500 سجل** لكل بيئة؛ أظهرت زيارات `GET /api/delivery` ولم تُثبت محاولة إنشاء شحنة للمستخدم. هذا **لا** يعني أن كل المحاولات التاريخية غير موجودة؛ السجلات المعروضة محدودة. لا تخمين لاسم الشركة أو لحالة طلب معيّن.

## التحقق التشغيلي الذي يلزم بعد CI
1. إنشاء حساب QA مستقل في Staging مع شركة mock/API sandbox (لا يُنشأ COD حقيقي).
2. شراء منتج تجريبي `pending`، الموافقة `approved`، وعرض أن **الشراء وحده لا يرسل** وأن خيار الإرسال التلقائي معطل افتراضيًا.
3. فحص مفتاح مرفوض: `verify` ⇒ `auth:false`, `success:false`, سبب HTTP 401 ظاهر في الواجهة.
4. شركة تُجيب 202 دون مرجع: حالة `confirmation_required` وعدم وجود `trackingNumber` أو إعادة تلقائية، و409 إذا أعيد الإرسال.
5. شركة تُجيب بمُعرّف فعلي: يثبت `providerShipmentId` و`trackingNumber` في PostgreSQL، ثم تتحول حالة `shipped` عند التحديث المشروع.
6. اختبار شركة المستخدم الحقيقية **يتطلب** اسمها ونوع الربط الفعلي (API / webhook / موقع فقط) ولقطة خطأ منزوعة المفاتيح. لا يُرسل طلب حقيقي أو يُحمّل المستخدم رسومًا قبل موافقته الصريحة.

## تنبيه إنتاجي
- البيئة الأساسية `Amanzine` تتبع `main` على Railway، لا `staging/pre-production`. إصلاحات PR #19 لا تظهر تلقائيًا في `https://amanzine.up.railway.app`. لا تُنقل إلى main قبل CI، اختبار Staging، والموافقة على الترقية.
- الاختبارات السابقة الشاملة 59/59 نجحت لخصوصية تتبّع الطلبات وواجهات أخرى؛ لم تكن اختبارات end-to-end مع شركة توصيل حقيقية، ولا تمثل اعتمادًا خارجيًا.
