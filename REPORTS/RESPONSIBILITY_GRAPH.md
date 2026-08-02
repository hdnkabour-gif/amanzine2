# RESPONSIBILITY_GRAPH — من يملك ماذا

> ليست شجرةَ نداء. هذه تُجيب: **إن أردتَ تغييرَ سلوكٍ ما، أيَّ ملفٍّ تفتح؟**
>
> شجرةُ النداء تتغيّر مع كلّ إعادةِ هيكلة. الملكيّةُ تبقى.
>
> **القاعدةُ الحاكمة في هذا المشروع: لكلّ مسؤوليّةٍ مالكٌ واحد.** حيث وُجد مالكان، فذاك عطبٌ مسجَّلٌ في [`BROKEN_CHAINS.md`](BROKEN_CHAINS.md).

---

## سلسلةُ المسؤوليّة الكبرى

```
إنسانٌ يكتب جملةً بالدارجة
        ↓
فهمُ اللغة                    src/lib/akg/kb/arabizi.ts       deArabizi()
        ↓
قراءةُ النيّة الإنسانيّة        src/lib/humanIntent.ts          readHuman()
        ↓
تحديدُ الاتّجاه (طلب/عرض)      src/lib/akg/kb/index.ts         stanceOf()
        ↓
ربطُ الكلمة بمفهوم            src/lib/akg/kb/knowledge.ts     resolveConcept()
        ↓
بناءُ الحاجة                  src/lib/needEngine.ts           parseNeed()
        ↓
هل ينقص شيء؟                 src/lib/clarify.ts              clarify() · nextClarification()
        ↓
أيُّ واجهةٍ الآن؟              src/lib/interfaceDecision.ts    decideInterface()
        ↓
        ├── وجهةٌ داخليّة  →  src/store.tsx                    setPage()
        └── وجهةٌ عامّة    →  server/lib/engines/search.js      execute()
                                    ↓
                            الترتيب      server/lib/engines/ranking.js
                            العرض        server/lib/engines/presentation.js
                            الحالة       server/lib/engines/status.js
                            الخريطة      server/lib/engines/map.js
                                    ↓
                            البيانات     server/lib/business.js → server/database.js
```

---

## جدولُ الملكيّة الكامل

### الفهم والحوار — **كلُّه في الواجهة**

| المسؤوليّة | المالك | الدالّة |
|---|---|---|
| فكُّ اللاتينيّة (Arabizi) | `src/lib/akg/kb/arabizi.ts` | `deArabizi()` |
| النيّة الإنسانيّة | `src/lib/humanIntent.ts` | `readHuman()` |
| الاتّجاه: طلبٌ أم عرض | `src/lib/akg/kb/index.ts` | `stanceOf()` |
| المفاهيم والمرادفات | `src/lib/akg/kb/knowledge.ts` | `resolveConcept()` · `understand()` |
| بناءُ الحاجة والتوجيه | `src/lib/needEngine.ts` | `parseNeed()` |
| **متى نسأل ومتى ننفّذ** | `src/lib/clarify.ts` | `clarify()` · `CONFIDENCE` |
| اختيارُ الواجهة | `src/lib/interfaceDecision.ts` | `decideInterface()` |
| صوتُ AMANZINE | `src/lib/persona.ts` | — |
| قياسُ الرحلة والقرار | `src/lib/journey.ts` | `recordDecision()` · `clarifyStats()` |
| قوالبُ النشر | `src/lib/blueprints.ts` | `resolveBlueprint()` · `planNext()` |
| السياق (هويّة/مكان/وقت) | `src/lib/core/context.ts` | `buildContext()` |
| تنسيقُ الفهم | `src/lib/core/orchestrator.ts` | `orchestrate()` |

> **لا شريكَ للخادم في هذه السلسلة** إلّا `POST /api/ai/understand` كملاذٍ أخير. من أراد تغييرَ ما يفهمه AMANZINE يفتح `src/lib/` — لا `server/`.

### التجارة

| المسؤوليّة | المالك | ملاحظة |
|---|---|---|
| المنتجات | `server/routes/products.js` | CRUD رقيق فوق `database.js` |
| الطلبات ودورةُ حياتها | `server/routes/orders.js` | approve · reject · ship · deliver |
| **ثمنُ التوصيل** | `server/lib/deliveryPricing.js` | `resolveDeliveryFee()` — **الخادم يحسب لا العميل** |
| قواعدُ التسعير | `server/lib/pricingEngine.js` | `evaluate()` — القواعدُ بيانات، وكلُّ ثمنٍ يشرح نفسَه |
| الزبناء | `server/routes/customers.js` | |
| الكوبونات | `server/routes/coupons.js` | + عجلةُ الحظّ |
| الولاء | `server/routes/loyalty.js` | ⚠️ بلا شاشة |
| المحفظة | `server/lib/engines/payment.js` | محوّلُ `wallet` |
| الدفع | `server/lib/engines/payment.js` | `charge()` — إضافةُ طريقةٍ = محوّل |

### التوصيل

| المسؤوليّة | المالك | القاعدة |
|---|---|---|
| **العقد** | `server/services/delivery/contract.js` | نوحّد النتيجةَ لا الـAPI |
| **السجلّ** | `server/services/delivery/registry.js` | مسحُ مجلّد — لا خريطةَ أسماء |
| شركةٌ بعينها | `providers/<id>.provider.js` | **الملفُّ الوحيد** الذي يعرف اسمَها |
| قناةُ اتّصالٍ عامّة | `adapters/<id>.adapter.js` | webhook · url-recipe |
| مطابقةُ المدن | `server/lib/cityEngine.js` | «كازا» = «Casablanca» = `18` |
| إعادةُ المحاولة | `server/lib/retryQueue.js` | الفشلُ الدائم لا يُعاد |

> **قيدٌ مفروضٌ باختبار:** لا ملفَّ خارج `providers/` يذكر اسمَ شركةِ توصيل. يحرسه `test/architecture.test.mjs`.

### المعرفة والتعلّم

| المسؤوليّة | المالك |
|---|---|
| قاعدةُ المعرفة (مفاهيم · مهن · أعراض) | `src/lib/akg/kb/` (١٨ ملفًّا) |
| «ما لم نفهمه» | `server/lib/engines/knowledge.js` → `search_misses` |
| قِمعُ التعلّم | `server/lib/engines/learning.js` → `learning_daily` |
| التقاطُ الطلب غيرِ الملبّى | `server/routes/needs.js` → `need_requests` |
| المفاهيمُ المخصّصة + النسخ | `server/routes/knowledge.js` |
| الوصفُ الذاتيّ للنظام | `src/lib/akg/describe.ts` · `systemMap.ts` |

### البنية التحتيّة

| المسؤوليّة | المالك |
|---|---|
| **كلُّ SQL** | `server/database.js` (٢٠٧٢ سطرًا) — لا استعلامَ خارجه |
| المخطّط والترحيل | `server/migrate.js` |
| المصادقة | `server/routes/auth.js` + `middleware/auth.js` |
| أدمن المنصّة | `server/middleware/platformAdmin.js` |
| الأسرار | `server/lib/secrets.js` — AES-256-GCM |
| الأحداث | `server/lib/engines/eventbus.js` |
| الإشعار | `server/lib/engines/notification.js` |
| قواعدُ الإشعار | `server/lib/engines/rules.js` |
| واتساب | `server/lib/whatsapp.js` |
| البريد | `server/lib/mailer.js` |
| الوسائط | `server/routes/media.js` |
| الجاهزيّة | `server/lib/readiness.js` |
| السجلّ | `server/lib/logger.js` |

---

## حدودٌ لا تُخترَق (مرصودةٌ في الكود)

| الحدّ | الحالة |
|---|---|
| الواجهةُ لا تلمس SQL | ✅ كلُّ نداءٍ عبر `src/services/api.ts` |
| المساراتُ لا تحوي SQL | ✅ كلُّها عبر `db.*` |
| المحرّكاتُ لا تعرف Express | ✅ لا `req`/`res` في `lib/engines/` |
| الناقلُ لا ينادي الواجهة | ✅ اتّجاهٌ واحد |
| لا اسمَ شركةِ توصيلٍ خارج ملفّها | ✅ **مفروضٌ باختبار** |
| العميلُ لا يُملي ثمنًا | ✅ `deliveryCost` القادمُ من العميل يُتجاهَل صراحةً |

---

## حيث الملكيّةُ مشتَّتة (ديونٌ مسجّلة)

| المسؤوليّة | المالك المُعلَن | المالك الفعليّ الآخر | الأثر |
|---|---|---|---|
| القياس | `engines/activity` → الناقل | `routes/analytics.js` → `store_events` | مساران؛ جُسِرا لكنّ الجدولين باقيان |
| الإشعار | `engines/notification` | `routes/orders.js` ينادي `push.notifyUser` مباشرةً | تجاوزٌ للقواعد |
| فهمُ اللغة | `src/lib/akg/kb` | `server/lib/ai-engine.js` (`detectIntent` للبيع) | غرضان مختلفان بنفس الاسم |
| النسخُ الاحتياطيّة | `index.js:startDailyBackup` | `readiness.js` يقول «خارج التطبيق» | وصفٌ غيرُ دقيق |

---

## فخُّ التسمية الأهمّ

```
routes/conversations.js   = صندوقُ رسائل التاجر ⇄ الزبون (تجميعُ واتساب)
                            يملكه: routes/conversations.js + lib/ai-engine.js

«المحادثة» في الرؤية      = حوارُ الفهم («شنو محتاج؟»)
                            يملكه: src/lib/needEngine.ts + clarify.ts
                            **ولا مسارَ خادمٍ له إطلاقًا**
```

**لا يوجد محرّكُ محادثةٍ في الخادم.** من يبحث عن `ConversationService` أو `conversation-runtime.js` لن يجد شيئًا — لأنّه غيرُ موجود، لا لأنّه مخفيّ.
