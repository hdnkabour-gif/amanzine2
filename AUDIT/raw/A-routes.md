# A — جرد سطح HTTP الكامل للخادم (AMANZINE)
**الفرع:** staging/pre-production · **التاريخ:** 2026-08-19
**المنهج:** استخراج آليّ لكل `router.<method>` تحت `server/routes/` + كل `app.use('/api/...', require('./routes/...'))` في `server/index.js`، ثم قراءة كل معالج يدويًّا. الدليل الوحيد المقبول: `file:line`.

## العدد الإجمالي
- تصريحات `router.<method>` تحت `server/routes/`: **196** (أُحصيت بـ `node` على 33 ملف راوتر)
- نقاط معرَّفة مباشرة في `server/index.js`: **3** — `GET /api/health` (index.js:148) · `GET /api/health/readiness` (index.js:193) · `GET *` catch-all SPA (index.js:303)
- **الإجمالي: 199 نقطة نهاية** (منها 198 تحت `/api/`).
- ملفات الراوتر: 33 — كلها مركَّبة (لا ملف يتيم).
- تنبيه تركيب: `/api/ai` مركَّب مرّتين (index.js:267 `ai-search` ثم index.js:268 `ai`).

