# CALL_GRAPH — أشجارُ التنفيذ

> من نقطةِ الدخول إلى آخرِ سطرٍ يُنفَّذ. كلُّ عقدةٍ بملفّها الحقيقيّ ودالّتها.
>
> **نوعُ النداء:** `مباشر` = استدعاءُ دالّة · `غير مباشر` = عبر `require` كسولٍ أو تفويض · `حدث` = عبر الناقل (لا يعرف المُصدِرُ من يسمع).
>
> **الثقة:** `HIGH` = نُفِّذ ورُصد · `MEDIUM` = السلسلةُ متتبَّعةٌ في الكود · `UNKNOWN` = غيرُ مُثبت.

---

## ⓪ تسلسلُ الإقلاع (الخادم) — `HIGH`

```
node server/index.js
 ↓ مباشر   dotenv.config()                                    ← .env
 ↓ مباشر   تفكيكُ CLOUDINARY_URL → CLOUDINARY_*                index.js:13
 ↓ مباشر   ربطُ NEXT_PUBLIC_SUPABASE_* → SUPABASE_*            index.js:25
 ↓ مباشر   helmet(CSP) · cors · morgan · compression           index.js:52
 ↓ مباشر   app.set('trust proxy', 1)                           index.js:44
 ↓ مباشر   GET /api/health · GET /api/health/readiness         ← **قبل** المحدِّدات عمدًا
 ↓ مباشر   ١٧ محدِّدَ معدّل                                      index.js:158-197
 ↓ مباشر   readiness.register('rateLimit', true)               ← حقيقةُ تشغيلٍ لا تخمين
 ↓ مباشر   ٢٧ تركيبَ مسار                                       index.js:223-249
 ↓ مباشر   analytics.init() · rules.init(notification) · learning.init(bus)
 ↓ مباشر   ٤ تركيباتِ مساراتٍ أخرى (discover · business · knowledge · needs)
 ↓ مباشر   express.static(dist) + مسارٌ شامل
 ↓ مباشر   معالجاتُ الانهيار + معالجُ الأخطاء
 ↓ مباشر   startServer()
     ↓ مباشر   migrate()                    server/migrate.js → ٤٠ جدولًا
     ↓ مباشر   app.listen(PORT)
     ↓ مباشر   ensureAdmin()                ← ADMIN_EMAIL/PASSWORD إن وُجدا
     ↓ مباشر   WebSocket.Server({path:'/ws'}) → app.set('broadcast', fn)
 ↓ مباشر   sync.ensureTable()               ← Supabase (يفشل بصمت إن لم يُهيَّأ)
 ↓ مباشر   startMorningReportCron()         ← ٠٨:٠٠ يوميًّا
 ↓ مباشر   startDailyBackup()               ← بعد ٥ث ثمّ كلّ ٢٤س
 ↓ مباشر   startAbandonedCartCron()         ← بعد ٣٠ث ثمّ كلّ ساعة
```

> **ترتيبٌ حاسم:** تركيبُ المحرّكات يقع **بين** مجموعتَي المسارات. أربعةُ مسارات (`discover` · `business` · `knowledge` · `needs`) تُركَّب **بعد** المشتركين. لا أثرَ وظيفيًّا اليوم، لكنّه يفسّر لماذا تظهر رسالةُ `[engines] … ready` في وسط سجلّ الإقلاع.

---

## ① الفهمُ والتوجيه — قلبُ AMANZINE — `HIGH`

**يجري كلُّه في المتصفّح. لا نداءَ شبكةٍ في المسار الأساسيّ.**

```
المستخدمُ يكتب «الما كيقطر»
 ↓ مباشر   src/pages/LivingHome.tsx : submit()
 ↓ مباشر   src/lib/core/orchestrator.ts : orchestrate(q, ctx)
     ↓ مباشر   src/lib/needEngine.ts : parseNeed()
         ↓ مباشر   normalize()                       توحيدُ الهمزات والتاء
         ↓ مباشر   src/lib/akg/kb/arabizi : deArabizi()   «bghit» → «بغيت»
         ↓ مباشر   src/lib/humanIntent.ts : readHuman()   SELF|HELP|SELL|BUY|…
         ↓ مباشر   src/lib/akg/kb : stanceOf()            طلبٌ أم عرض
         ↓ مباشر   src/lib/akg/kb/knowledge : resolveConcept()
         ↓ مباشر   PROBLEM_TO_PRO → مهنة · enrich() → ميزانيّة/وقت/مكان
     ↓ مباشر   NeedResult { intent, confidence, steps?, page?, url?, object }
 ↓ مباشر   src/lib/interfaceDecision.ts : decideInterface()
     ↓ مباشر   src/lib/clarify.ts : CONFIDENCE (مصدرُ العتبات الوحيد)
     ↓ يُرجع   direct | guided | confirm | clarify | escalate | welcome
 ↓ مباشر   src/lib/journey.ts : recordDecision() → localStorage + POST /api/ai/report-unknown
 ↓
 ├─ direct/confirm  → go() → setPage() أو navigate()
 ├─ guided/clarify  → عرضُ NeedStep (سؤالٌ بهويّةٍ ثابتة)
 │       ↓ مباشر   pickOption() → recordClarificationAnswered() → POST /api/track
 │       ↓         ❌ applyAnswer() **لا تُستدعى** — انظر BROKEN_CHAINS ④
 └─ escalate        ❌ غيرُ موصولٍ بالواجهة
```

**نقطةُ الذكاء (ملاذٌ أخير، خارج المسار الأساسيّ):**

```
عجزُ القواعد (unknown)
 ↓ مباشر   src/lib/understanding.ts : RemoteProvider
 ↓ شبكة    POST /api/ai/understand
     ↓ مباشر   server/routes/ai.js : _resolveAIKeys(req, db, env)
     ↓ مباشر   _providerOrder(preferred, keys)   ← المهيّأ فقط
     ↓ مباشر   aiChat({ keys, provider, jsonMode:true })
     ↓ مباشر   _normUnderstanding(_safeJson(out.text))
     ↓ حدث     activity.emit('ai.understood', { provider })
     ↓ يُرجع   { available, provider, result }
 ↓          بلا مفتاح ⇒ { available:false } ⇒ **تبقى نتيجةُ القواعد**
```

---

## ② الطلب — من الزبون إلى التاجر — `HIGH` (مُنفَّذ ومرصود)

```
POST /api/orders            (لوحةُ التاجر · مصادَق)
 ↓ مباشر   server/routes/orders.js  (سطر ٣٥)
 ↓ مباشر   middleware/validate : sanitizeBody
 ↓ مباشر   middleware/auth : auth            ← JWT من الترويسة أو الكوكي
 ↓ مباشر   db.createOrder()                  server/database.js → INSERT orders
 ↓ مباشر   db.addLog()                       → audit_logs
 ↓ مباشر   db.addNotification()              → notifications        ✅ مرصود
 ↓ حدث     emitOrderCreated() → activity.emit('order.created')
 │     ↓ حدث   eventbus.publish → learning.js
 │     ↓ مباشر db.recordLearningStage('order') → learning_daily     ✅ مرصود
 │     ↓ حدث   eventbus.publish → analytics.js · rules.js
 ↓ مباشر   sync.syncOrder()                  → Supabase (صامتٌ إن لم يُهيَّأ)
 ↓ مباشر   routes/push.notifyUser()          → web-push
 ↓ مباشر   app.get('broadcast')(userId, …)   → WebSocket
 ↓ يُرجع   201 + الطلب
```

```
POST /api/orders/public     (واجهةُ المتجر · بلا حساب)
 ↓ مباشر   validateOrder → فحصُ العناصر والهاتف
 ↓ مباشر   resolveDeliveryFee()   server/lib/deliveryPricing.js   ← الخادمُ يحسب، لا العميل
 ↓ مباشر   db.validateCoupon() → خصمٌ/شحنٌ مجّانيّ
 ↓ مباشر   db.createOrderWithCustomer()   ← معاملةٌ واحدة
 ↓ حدث     emitOrderCreated(userId, order, source)
 ↓ مباشر   إشعارٌ + بريدُ Brevo + واتساب (إن هُيّئ)
```

---

## ③ التوصيل — `HIGH` (مُنفَّذ ومرصود)

```
POST /api/delivery                     حفظُ شركة
 ↓ مباشر   routes/delivery.js
 ↓ مباشر   registry.suggest(body)      ← لا api_type؟ استدلالٌ من النطاق
 │            ↓ مباشر  meta.match.hosts في كلّ مزوّد     ✅ «rest.livo.ma» → livo
 ↓ مباشر   db.upsertDeliveryProvider() ← مُقيَّدٌ بـ user_id (سدُّ IDOR)
 ↓ مباشر   secrets.encrypt(apiKey)     AES-256-GCM
 ↓ يُرجع   { id, adopted:'livo', providers }                        ✅ مرصود
```

```
POST /api/delivery/verify/:id          التحقّقُ الكامل
 ↓ مباشر   db.getDeliveryProviders() → إيجادُ الصفّ
 ↓ مباشر   registry.suggest() إن غاب النوع → db.upsert (تثبيتٌ دائم)
 ↓ مباشر   registry.resolve(row) → { handler, kind, label }
 │            ↓ مباشر  get(apiType) → مزوّد · وإلّا getAdapter → وسيلة
 ↓ مباشر   plugin.testConnection(row)  → GET rest.livo.ma/auth/keys   ❌ مفتاحٌ مزيّف
 ↓ مباشر   plugin.getCities(row)       → GET rest.livo.ma/cities
 │            ↓ ❌ (result.data || []).map — الردُّ متداخل           انظر BROKEN_CHAINS ①
 ↓ مباشر   cityEngine.matchAll() → db.saveCityMappings()  (لا يُبلَغ بسبب ما سبق)
 ↓ يُرجع   { success, checks[], unmatched[] }
```

```
POST /api/delivery/create/:orderId     شحنةٌ حقيقيّة
 ↓ مباشر   registry.resolve(row)
 ↓ مباشر   db.getExternalCityId()      ← مُعرِّفُ المدينة عند الشركة
 ↓ مباشر   plugin.createShipment(order, cfg)
 ↓ مباشر   db.updateOrder({ providerShipmentId, trackingNumber })
```

---

## ④ البحثُ والاكتشاف — `HIGH`

```
GET /api/search?q=&city=&view=map
 ↓ مباشر   routes/search.js : parseFilters()
 ↓ مباشر   lib/engines/search.js : execute()
     ↓ مباشر   detectIntent(q)              ← عامّ/قريب/فعل
     ↓ مباشر   lib/business.js              ← الملفّ الموحّد (متاجر + مزوّدون)
     │            ↓ مباشر  db (products · providers · listings)
     │            ↓ مباشر  lib/engines/status.js : computeStatus()
     │            ↓ مباشر  lib/engines/presentation.js : orderSections()
     ↓ مباشر   lib/engines/ranking.js : rank()   ← ٧ أوزان
     ↓ مباشر   lib/engines/map.js : build()      ← إن view=map
     ↓ مباشر   lib/engines/knowledge.js : recordSearch/recordMiss → search_daily · search_misses
 ↓ حدث     activity.emit('search.executed')
 ↓ يُرجع   { intent, filters, weights, businesses, products, map? }   ✅ مرصود
```

`GET /api/discover` و`GET /api/business/search` **يفوّضان إلى نفس `execute()`** — لا محرّكَ ثانٍ.

---

## ⑤ الإشعار — `HIGH` (مُنفَّذ ومرصود)

```
أيُّ حدثٍ على الناقل
 ↓ حدث     lib/engines/rules.js : defineRules()
 │            booking.created → 3/دقيقة · offer.created · review.created · business.verified
 ↓ مباشر   lib/engines/notification.js : notify({businessId, channel[]})
     ↓ مباشر   db.getBusinessOwner(businessId)
     │            store:<id> → مباشرةً · provider:<id> → استعلام · listing:<id> → vendor_id|seller_phone
     ↓ مباشر   CHANNELS['in-app']  → db.addNotification()             ✅ مرصود
     ↓ غير مباشر CHANNELS['push']  → routes/push.notifyUser()         ⚠️ يدّعي النجاح (⑦)
     ↓ مباشر   CHANNELS['email']   → lib/mailer.js : send()           ➖ غيرُ مهيّأ
     ↓ مباشر   CHANNELS['whatsapp']→ lib/whatsapp.js : sendText()
     │            غيرُ مهيّأ ⇒ إشعارٌ داخليٌّ برابط wa.me              ✅ مرصود
     ↓ يُرجع   { [channel]: { sent, reason } }
```

---

## ⑥ المصادقة — `HIGH`

```
POST /api/auth/register|login
 ↓ مباشر   routes/auth.js → bcrypt → db.createUser|getUserByEmail
 ↓ مباشر   jwt.sign(JWT_SECRET, '1h') + db.createRefreshToken(30d)
 ↓ مباشر   res.cookie('token', HttpOnly)     ← حمايةٌ من XSS
 ↓ يُرجع   { token, user }                                            ✅ مرصود

كلُّ طلبٍ لاحق
 ↓ مباشر   middleware/auth.js → jwt.verify(الترويسة || الكوكي) → req.user
 ↓ مباشر   middleware/platformAdmin.js (للأدمن) → مقارنةُ بريدٍ غيرُ حسّاسةٍ لحالة الأحرف
```

---

## ⑦ الواجهة — من الجذر إلى الصفحة — `MEDIUM`

```
src/main.tsx
 ↓ مباشر   StoreProvider (src/store.tsx)  ← الحالةُ كلُّها + نداءاتُ API
 ↓ مباشر   src/App.tsx
     ↓ مباشر   BrowserRouter → ١٣ <Route>
     │            عامّة: /store · /explore · /feed · /market · /business/:source/:id
     │            /landing · /auth · /login · /register
     ↓ مباشر   RouterSync  ← يزامن URL ⇄ الصفحة الداخليّة
     ↓ مباشر   MainLayout (src/pages/MainLayout.tsx)
         ↓ مباشر   switch(page) → ٢٦ حالةً من PAGE_IDS
         ↓ مباشر   lazy() لأكثر الصفحات
     ↓ مباشر   NavBar · NextStepHint · NotificationToast · ErrorBoundary
```

> `PAGE_IDS` في `src/types.ts` هو **المصدرُ الوحيد** لأسماء الصفحات؛ يحرسه `test/architecture.test.mjs` (صفحةٌ بلا `case` أو بلا رابطٍ تُسقط البناء).
