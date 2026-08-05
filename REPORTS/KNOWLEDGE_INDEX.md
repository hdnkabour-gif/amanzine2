# KNOWLEDGE_INDEX — نقطةُ الدخول

> **ابدأ من هنا.** لا أحدَ يبحث في تسعةِ ملفّات.
>
> لم تقرأ شيئًا بعد؟ افتح [`PROJECT_MAP.md`](PROJECT_MAP.md) — خمسُ دقائق.
> تبحث عن عطب؟ [`BROKEN_CHAINS.md`](BROKEN_CHAINS.md).
> تريد تغييرَ سلوك؟ [`RESPONSIBILITY_GRAPH.md`](RESPONSIBILITY_GRAPH.md).

**آخرُ تدقيق:** 2026-08-02 · على PostgreSQL 16 حيّ · التطبيقُ مُقلَعٌ ومسارُه منفَّذ.

---

## الملفّاتُ التسعة

| الملفّ | يُجيب عن |
|---|---|
| [`PROJECT_MAP`](PROJECT_MAP.md) | ما هو AMANZINE؟ (٥ دقائق) |
| [`ARCHITECTURE`](ARCHITECTURE.md) | كيف يعمل؟ التدفّقات · البيانات · التكاملات · **القيود** |
| [`CALL_GRAPH`](CALL_GRAPH.md) | ما الذي يُنفَّذ حرفيًّا، بأيّ ترتيب |
| [`RESPONSIBILITY_GRAPH`](RESPONSIBILITY_GRAPH.md) | **أيَّ ملفٍّ أفتح لأغيّر س؟** |
| [`SYSTEM_CATALOG`](SYSTEM_CATALOG.md) | كلُّ نظامٍ: دورةُ حياته · حالتُه · أثرُ حذفه |
| [`ARCHITECTURE_DECISIONS`](ARCHITECTURE_DECISIONS.md) | **لماذا** بُني هكذا · البدائلُ المرفوضة |
| [`BROKEN_CHAINS`](BROKEN_CHAINS.md) | ما المعطوب · أين · بأيّ شدّة |
| [`UNKNOWN_AREAS`](UNKNOWN_AREAS.md) | ما لم يُثبَت · وكيف يُثبَت |
| `KNOWLEDGE_INDEX` | هذا الملفّ |

---

## فهرسُ الأنظمة

### الفهم والحوار ← **قلبُ المنتج**

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| **محرّك النيّة** | `src/lib/needEngine.ts` | `ACTIVE` | HIGH |
| **محرّك الاستيضاح** | `src/lib/clarify.ts` | `ACTIVE` — الحلقةُ مُغلَقة | HIGH |
| **طبقة القرار** | `src/lib/interfaceDecision.ts` | `ACTIVE` | HIGH |
| **قاعدة المعرفة** | `src/lib/akg/kb/` (٦٣ ملفًّا) | `ACTIVE` | HIGH |
| النيّة الإنسانيّة | `src/lib/humanIntent.ts` | `ACTIVE` | HIGH |
| قياسُ الرحلة | `src/lib/journey.ts` | `ACTIVE` | HIGH |

المعماريّة: [`ARCHITECTURE#٢`](ARCHITECTURE.md) · الشجرة: [`CALL_GRAPH#①`](CALL_GRAPH.md) · المعطوب: [`BROKEN_CHAINS#④`](BROKEN_CHAINS.md)

### التجارة

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| الطلبات | `server/routes/orders.js` | `ACTIVE` | **HIGH** (مُنفَّذ) |
| المنتجات | `server/routes/products.js` | `ACTIVE` | HIGH |
| ثمنُ التوصيل | `server/lib/deliveryPricing.js` | `ACTIVE` | HIGH |
| قواعدُ التسعير | `server/lib/pricingEngine.js` | `ACTIVE` | HIGH |
| الكوبونات | `server/routes/coupons.js` | `ACTIVE` | MEDIUM |
| **الولاء** | `server/routes/loyalty.js` | `ACTIVE` — شاشةٌ وصرفٌ ذرّيّ | HIGH |
| الدفع | `server/lib/engines/payment.js` | `PARTIAL` — ٣ تعمل · ٣ مقاعدُ مُعلَنةٌ صادقة | HIGH |
| الإعلانات | `server/routes/listings.js` | `ACTIVE` | MEDIUM |
| الخدمات والحجوزات | `server/routes/providers.js` · `bookings.js` | `ACTIVE` | MEDIUM |

المعماريّة: [`ARCHITECTURE#٣`](ARCHITECTURE.md) · الشجرة: [`CALL_GRAPH#②`](CALL_GRAPH.md) · المعطوب: [`BROKEN_CHAINS#⑤⑧`](BROKEN_CHAINS.md)

### التوصيل

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| العقد | `services/delivery/contract.js` | `ACTIVE` | HIGH |
| **السجلّ** | `services/delivery/registry.js` | `ACTIVE` | **HIGH** (مُنفَّذ) |
| Livo | `providers/livo.provider.js` | `ACTIVE` — ٤٤١ مدينة | **HIGH** |
| Amana · Jibli | `providers/*.provider.js` | `UNKNOWN` | UNKNOWN |
| الوسائل | `adapters/webhook` · `url-recipe` | `ACTIVE` | MEDIUM |
| محرّك المدن | `server/lib/cityEngine.js` | `ACTIVE` | HIGH |

الشجرة: [`CALL_GRAPH#③`](CALL_GRAPH.md) · **المعطوب: [`BROKEN_CHAINS#①`](BROKEN_CHAINS.md) ← اقرأ هذا** · المجهول: [`UNKNOWN_AREAS#أ`](UNKNOWN_AREAS.md)

### الاكتشاف

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| **البحث الموحّد** | `lib/engines/search.js` | `ACTIVE` | **HIGH** (مُنفَّذ) |
| الترتيب | `lib/engines/ranking.js` | `ACTIVE` | MEDIUM |
| الخريطة | `lib/engines/map.js` + `MapView.tsx` | `ACTIVE` — بابُها في «الاكتشاف» | HIGH |
| الملفُّ الموحّد | `server/lib/business.js` | `ACTIVE` | HIGH |
| التوصية | `lib/engines/recommend.js` | `ACTIVE` | MEDIUM |
| الخلاصة | `lib/engines/activity.js` + `ActivityFeed.tsx` | `ACTIVE` — بابُها في «الاكتشاف» | HIGH |

الشجرة: [`CALL_GRAPH#④`](CALL_GRAPH.md) · المعطوب: [`BROKEN_CHAINS#⑥`](BROKEN_CHAINS.md)

### الذكاء

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| موصّلُ المزوّدين | `server/routes/ai.js:aiChat()` | `PARTIAL` — بلا مفتاح | HIGH |
| فهمُ المحتاج | `POST /api/ai/understand` | `PARTIAL` | HIGH |
| مساعدُ بيع التاجر | `server/lib/ai-engine.js` | `ACTIVE` | MEDIUM |
| الفهمُ الهجين | `src/lib/understanding.ts` | `ACTIVE` (يسقط للقواعد) | HIGH |

المعماريّة: [`ARCHITECTURE#٤`](ARCHITECTURE.md) · المجهول: [`UNKNOWN_AREAS#٥`](UNKNOWN_AREAS.md)

### الأحداث والتعلّم

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| **ناقلُ الأحداث** | `lib/engines/eventbus.js` | `ACTIVE` — ١٧ مشتركًا | **HIGH** |
| النشاط | `lib/engines/activity.js` | `ACTIVE` | HIGH |
| **حلقةُ التعلّم** | `lib/engines/learning.js` | `ACTIVE` | **HIGH** (مُنفَّذ) |
| التحليلات | `lib/engines/analytics.js` | `ACTIVE` | MEDIUM |
| القواعد | `lib/engines/rules.js` | `ACTIVE` | MEDIUM |
| المعرفة والفجوات | `lib/engines/knowledge.js` | `ACTIVE` | MEDIUM |
| التقاطُ الطلب | `server/routes/needs.js` | `ACTIVE` | MEDIUM |
| ذاكرةُ المستخدم | `server/routes/memory.js` · `server/lib/userMemory.js` | `ACTIVE` | HIGH |

### الإشعار

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| **المحرّك** | `lib/engines/notification.js` | `PARTIAL` | **HIGH** (مُنفَّذ) |
| داخل التطبيق | `CHANNELS['in-app']` | `ACTIVE` | HIGH |
| واتساب | `server/lib/whatsapp.js` | `PARTIAL` — بديلٌ يدويٌّ يعمل | HIGH |
| البريد | `server/lib/mailer.js` | `PARTIAL` | HIGH |
| Push | `server/routes/push.js` | `PARTIAL` — يحتاج VAPID، ويقول الحقيقة | HIGH |

المعطوب: [`BROKEN_CHAINS#⑦`](BROKEN_CHAINS.md)

### البنية التحتيّة

| النظام | المالك | الحالة | الثقة |
|---|---|---|---|
| **قاعدة البيانات** | `server/database.js` (٢٠٧٢ سطرًا) | `ACTIVE` | **HIGH** |
| المخطّط | `server/migrate.js` — ٤٠ جدولًا | `ACTIVE` | **HIGH** |
| المصادقة | `routes/auth.js` + `middleware/auth.js` | `ACTIVE` | **HIGH** |
| أدمن المنصّة | `middleware/platformAdmin.js` | `ACTIVE` | HIGH |
| الأسرار | `server/lib/secrets.js` | `ACTIVE` | HIGH |
| الجاهزيّة | `server/lib/readiness.js` | `ACTIVE` | HIGH |
| الوسائط | `routes/media.js` | **`BROKEN`** — قرصٌ زائل | HIGH |
| **النسخُ الاحتياطيّة** | `server/lib/backup.js` | `PARTIAL` — تعمل، والدوامُ يحتاج `BACKUP_DIR` | HIGH |
| WebSocket | `index.js` | `ACTIVE` | MEDIUM |
| مزامنة Supabase | `server/sync.js` | `UNKNOWN` | UNKNOWN |

---

## أوّلُ ما تفعله كمهندسٍ جديد

1. **`PROJECT_MAP`** — خمسُ دقائق.
2. **`BROKEN_CHAINS`** — ①②⑦ أُصلحت؛ ③ تهيئةُ بيئة. الباقي مفتوحٌ ومرتَّبٌ بالشدّة.
3. **`ARCHITECTURE#٨`** — القيودُ التي يوقفك خرقُها.
4. **`RESPONSIBILITY_GRAPH`** — احفظ الجدول. يوفّر عليك ساعاتِ بحث.
5. شغّل: `npm test` (٤٣٥ اختبارًا) · `npx tsc --noEmit` · `npm run build`.

**ثلاثةُ أشياء ستوفّر عليك يومًا كاملًا:**
- «المحادثة» شيئان مختلفان. لا محرّكَ محادثةٍ في الخادم.
- لا `controllers` ولا `services`. لا تبحث عنها.
- الفهمُ كلُّه في المتصفّح. الخادمُ يبحث ويحفظ ويشحن — **ولا يفهم**.

---

## طزاجةُ هذه المعرفة

يحرسها `test/architecture-freshness.test.mjs`: يقارن **الحقائقَ المُدّعاة هنا** (مُعرِّفاتُ المحرّكات والمزوّدين وأسماءُ المسارات وعددُ الجداول) بالواقع. العدُّ وحدَه لا يكفي — مسارٌ يُنقل منطقُه لمحرّكٍ آخر يُبقي العددَ ثابتًا ويجعل التقريرَ كذبًا.

**إن سقط:** حدِّث التقريرَ، لا الاختبار.
