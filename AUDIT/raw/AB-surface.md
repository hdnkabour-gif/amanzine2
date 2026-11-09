# A+B — سطحُ الخادم ونداءاتُ الواجهة  (HEAD a445577)

## الأرقام (آليّة، لا عيّنة)
| القياس | العدد |
|---|--:|
| نقاطُ تركيب (`app.use`) | 33 |
| مساراتٌ كاملة | **198** |
| ملفّاتُ مساراتٍ غيرُ مركَّبة | **0** |
| مواضعُ نداءٍ في الواجهة | 186 |
| مساراتٌ فريدةٌ تُنادى | 147 |
| **نداءاتٌ بلا وجهة (زرٌّ ميّت)** | **0** |

## ✅ صفرُ نداءٍ يتيم
كلُّ نداءٍ من الواجهة له مسارٌ حقيقيّ. الخمسةُ التي أظهرها المستخرِجُ أوّلًا
كانت كلُّها أثرَ الأداة: `/api/health` مُركَّبٌ بـ`app.get` مباشرةً
(`server/index.js:148,193`) لا عبر ملفِّ مسار؛ و`listings/:id/:action` هي
`approve|reject|suspend` الحرفيّة (`routes/listings.js:170-172`)؛ والباقي
قوالبُ نصّيّةٍ بسلاسل استعلام (`customers` · `providers` · `bookings` ·
`knowledge/concepts` — كلُّها موجودة).

## مساراتٌ لا ينادِها أحد — بعد التحقّق الفرديّ

### F-B1 | MAJOR | UNWIRED — دفترُ أحداث الطلب مبنيٌّ ولا يُقرأ
**الدليل:** `GET /api/orders/:id/timeline` و`POST /api/orders/:id/events`
صفرُ منادٍ في `src/`. و«timeline» الوحيدةُ في الواجهة متغيّرٌ محلّيٌّ في
`src/pages/DashboardPage.tsx:154` يبني شريطَ نشاطٍ من الطلبات والمحادثات —
لا علاقةَ له بالدفتر.
**ما بُني له:** `server/lib/orderLifecycle.js` (213 سطرًا: `deriveFacts`،
`amountDue`، الإرجاعُ الجزئيّ، الانتقالات) + جدول `order_events` +
149 سطرَ اختبارٍ تمرّ كلُّها.
**الأثر:** «رُفضت قطعةٌ من ثلاث» — المنطقُ الذي يحسب المبلغَ الصحيحَ في هذه
الحالة **موجودٌ ويعمل ولا يراه تاجرٌ أبدًا**. يُحسَب المالُ في مكانٍ لا أحدَ
يفتحه.
**الثقة:** CONFIRMED

### مساراتٌ أخرى بلا منادٍ (تحتاج قرارَ منتَجٍ لا إصلاحًا)
`GET /api/business/search` · `GET /api/knowledge/quality` ·
`GET /api/settings/export` · `GET /api/settings/qr` ·
`POST /api/customers/public` · وستّةٌ في `ai.js`:
`product-search` · `whatsapp-confirm` · `comments/:platform` ·
`misread-report` · `judge-misread` · `demand-report`.

### ليست ميّتةً — تُنادى من خارج المتصفّح (صحيح)
`webhooks/delivery/:id` · `webhooks/meta` (مزوّدون خارجيّون) ·
`push/*` (موصولٌ عبر `src/lib/pushNotifications.ts`) ·
`auth/refresh` · `memory/*` · `media/upload` · `insights` ·
`needs/trending` · `listings/public/catalog` — كلُّها لها منادٍ مُتحقَّق.
