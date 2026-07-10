# 07 — عقود الواجهة البرمجية (API Contracts)

> العقود الثابتة بين الواجهة والخادم (القانون ٩). التبديل خلفها (ذاكرة→جدول، محلّي→LLM، DB→Redis) **لا يكسرها**.
> أي تغيير كاسر ⇒ رفع الإصدار + Decision Record. مصدر الحقيقة للأنواع: `src/services/api.ts`.

---

## المبدأ

- كل عقد له **شكل ثابت** لا يتغيّر بتغيّر التنفيذ.
- **إضافة حقل اختياري** = غير كاسر (نفس الإصدار).
- **حذف/إعادة تسمية/تغيير دلالة** = كاسر (إصدار جديد + DR).
- العقد المحوري هو **النيّة** (`intent/v1`) — انظر `03_INTENT_SPEC.md`.

---

## 1) البحث الموحّد — `POST /api/search`

نقطة الدخول القانونية للاكتشاف (`/api/discover` ألياس رجعي يُمرَّر لنفس المحرّك).

**Request**
```jsonc
{ "q": "سباك", "city": "الدار البيضاء", "type": "service",
  "lat": 33.57, "lng": -7.58, "radiusKm": 10,
  "filters": { "openNow": true, "availableToday": true, "verified": true, "ratingMin": 4 },
  "limit": 20 }
```

**Response**
```jsonc
{ "intent":   { "kind": "service", "nearby": true },
  "businesses": [ /* Business[] */ ],
  "products":   [ /* Product[]  */ ] }
```

---

## 2) النموذج الموحّد — `Business`

الوجه الموحّد لكل نشاط (متجر/مزوّد/إعلان) عبر Facade + Adapters:

```jsonc
{ "id": "store_42", "kind": "store", "name": "…", "category": "…",
  "city": "…", "lat": 33.5, "lng": -7.6, "verified": true, "rating": 4.6,
  "capabilities": { "purchasable": true, "bookable": false, "locatable": true,
                    "contactable": true, "deliverable": true /* … 8 flags */ },
  "status":       { "openNow": true, "label": "مفتوح الآن" },
  "availability": { "availableToday": true /* للمزوّدين */ } }
```

- `kind` وصفيّ للعرض؛ **القرارات تُبنى على `capabilities` لا على `kind`** (القانون ٦).
- `id` مسبوق بمصدره (`store_ / provider_ / listing_`) — يبقى ثابتًا بعد أي هجرة لجدول موحّد.

---

## 3) واجهات الأعمال — `businessAPI`

| المسار | الغرض | العقد |
|-------|------|------|
| `POST /api/business/search` | بحث موحّد | `{ businesses, products }` |
| `POST /api/business/nearby` | قرب موقع | `Business[]` مرتّبة بالمسافة |
| `GET  /api/business/:id`    | ملف كامل | `Business + sections[]` (Presentation Registry) |
| `GET  /api/recommend`       | توصيات | `Business[]` (Weighted Graph) |
| `GET  /api/feed`            | نشاط حيّ | `Event[]` |
| `GET  /api/insights[/me]`   | تحليلات تاجر | ملخّصات مجمّعة |
| `POST /api/track`           | تتبّع حدث | `{ ok: true }` (عام، محدود المعدّل) |

`sections[]` تُرتَّب حسب قدرات النشاط، لا نوعه.

---

## 4) النيّة والذكاء — `POST /api/ai-search/ask`

```jsonc
// Request
{ "q": "الباب لا يغلق", "lat": 33.5, "lng": -7.6, "radiusKm": 10 }
// Response
{ "understood": { /* → يتطوّر نحو intent/v1: need, category, urgency, engine, confidence */ },
  "filters":    { /* الفلاتر المشتقّة */ },
  "intent":     { "kind": "service", "nearby": true },
  "businesses": [ … ], "products": [ … ] }
```

> `understood` يتقدّم نحو عقد `intent/v1` الكامل (§9 من `03_INTENT_SPEC`) دون كسر المستهلكين. نقطة استبدال النموذج: `AI.setAdapter(fn)` — بشرط إرجاع نفس العقد.

---

## 5) الحجز والمزوّدون

| المسار | الغرض | ملاحظة |
|-------|------|-------|
| `GET  /api/providers[/:id]` | مزوّدو الخدمات + خدماتهم | يشمل قوالب التوفّر |
| `POST /api/bookings`        | إنشاء حجز | **كشف تعارض المواعيد** ذرّي |
| `GET  /api/bookings`        | حجوزات المستخدم | مقيّد بالمصادقة |

---

## 6) الدفع والمحفظة

| المسار | العقد | أمان |
|-------|------|-----|
| `POST /api/payment/charge` | عبر Payment Adapter registry | `cod/wallet/transfer` تعمل؛ `cmi/stripe/paypal` مقاعد مغلقة env |
| `GET  /api/payment/methods` | طرق الدفع المتاحة | — |
| `GET  /api/wallet` | `{ balance, transactions[] }` | **قراءة فقط** — لا endpoint يرفع الرصيد ذاتيًا (ثغرة مالية مُزالة) |

الخصم ذرّي (لا رصيد سالب). الإضافة (cashback/refund) تتمّ **server-side حصرًا**.

---

## 7) عقود الأحداث (Event Backbone)

```jsonc
// Event (canonical) — يُنشَر على Event Bus
{ "version": "event/v1", "type": "business.viewed", "at": 1720000000000,
  "actorId": "…", "businessId": "…", "payload": { … } }
```

- المشتركون: Activity · Analytics · Rules → Notification · Recommendation.
- التنفيذ الحالي **في الذاكرة**؛ التبديل إلى جدول `activities`/Redis pub-sub يتمّ **خلف نفس العقد** (فجوة durability موثّقة في التدقيق).

---

## قاعدة التغيير

> أي تعديل على هذه العقود يبدأ بسؤال: **هل هو إضافة غير كاسرة؟** إن لا — فهو إصدار جديد + Decision Record. لا استثناء.
