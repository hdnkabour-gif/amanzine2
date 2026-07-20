# 🚀 دليل النشر — AMANZINE على Railway

> الكود **جاهز** (يبني نظيفاً، `tsc` = 0، اختبارات تمر). يكفي ضبط متغيّرات البيئة أدناه ليصبح الحُكم **GO ✅**.
> خدمة واحدة: `npm run build` يبني الواجهة، ثم `node server/index.js` يقدّم `dist/` + الـAPI + WebSocket على منفذ واحد.

---

## 1) متغيّرات إلزامية (بدونها لا يكتمل النشر)

| المتغيّر | الوصف | كيف تولّده |
|---|---|---|
| `DATABASE_URL` | اتصال PostgreSQL — **بدونه لا تُحفظ أي بيانات** (الخادم يعمل في «no-DB mode»). | أضِف خدمة **PostgreSQL** على Railway ⇒ تُملأ تلقائياً. |
| `JWT_SECRET` | مفتاح توقيع الجلسات — **الخادم يرفض الإقلاع في الإنتاج بدونه**. | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | اضبطه على `production`. | — |

## 2) موصى بها بشدّة (لاستمرار الصور)

| المتغيّر | الوصف |
|---|---|
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | تخزين دائم للصور. بدونها تُفقد الصور المرفوعة عند كل إعادة نشر. (أو استعمل `CLOUDINARY_URL` المجمّعة) |
| `PRODUCTION_URL` / `FRONTEND_URL` | نطاقك العلني لسياسة CORS (أو اعتمد على `RAILWAY_PUBLIC_DOMAIN` الذي يضيفه Railway تلقائياً). |

## 3) اختيارية (ميزات تُفعَّل عند توفّر مفاتيحها — التطبيق يعمل بدونها)

| المجموعة | المتغيّرات | الأثر عند الغياب |
|---|---|---|
| الذكاء الاصطناعي | `OPENAI_API_KEY` و/أو `GEMINI_API_KEY` (يدعم الكود أيضاً Anthropic/Claude و Grok عبر إعدادات التطبيق) | ميزات AI معطّلة بلطف (لا انهيار) |
| Meta/WhatsApp | `META_APP_ID` · `META_APP_SECRET` · `META_VERIFY_TOKEN` · `WHATSAPP_PHONE_ID` · `WHATSAPP_ACCESS_TOKEN` | قنوات Meta + OTP معطّلة |
| إشعارات Web-Push | `VAPID_PUBLIC_KEY` · `VAPID_PRIVATE_KEY` (`node -e "console.log(require('web-push').generateVAPIDKeys())"`) | الإشعارات معطّلة |
| البريد | إعدادات SMTP لـ nodemailer | بريد/OTP بالبريد معطّل |
| المشرف الأولي | `ADMIN_EMAIL` · `ADMIN_PASSWORD` · `ADMIN_NAME` | لا يُنشأ مشرف افتراضي |
| سوق المنصّة | `PLATFORM_ADMIN_EMAIL` · `PLATFORM_WHATSAPP_TOKEN` · `PLATFORM_WHATSAPP_PHONE_ID` | تحقّق هاتف البائع (OTP) معطّل |
| تشفير الأسرار | `ENCRYPT_SECRETS` · `SECRETS_KEY` | الأسرار تُحفظ بلا تشفير إضافي |

> ⚠️ **لا تستعمل القيم الافتراضية في `server/.env.example`** (مثل `Admin1234!` أو `CHANGE-THIS...`) في الإنتاج.

---

## 4) خطوات النشر على Railway

1. اربط مستودع GitHub بمشروع Railway جديد.
2. أضِف خدمة **PostgreSQL** (Add Service → Database → PostgreSQL) ⇒ يُضبط `DATABASE_URL` تلقائياً.
3. في **Variables**، اضبط على الأقل: `JWT_SECRET`, `NODE_ENV=production`, ومفاتيح `CLOUDINARY_*`.
4. Railway يقرأ `railway.json` / `nixpacks.toml` تلقائياً:
   - بناء: `npm install --legacy-peer-deps && npm run build && cd server && npm install`
   - تشغيل: `node server/index.js`
   - فحص صحّة: `GET /api/health`
5. ادفع الكود ⇒ يبنى ويُشغّل. الهجرات تُنفَّذ تلقائياً عند الإقلاع (`server/index.js`).

---

## 5) التحقّق بعد النشر (Smoke test)

```bash
curl https://<your-domain>/api/health                 # ⇒ 200
curl https://<your-domain>/api/listings/public/stats  # ⇒ 200 + أرقام حقيقية
curl -i https://<your-domain>/api/products            # ⇒ 401 (الحماية تعمل)
```
ثم من المتصفّح: أنشئ حساباً → أضِف منتجاً → **أعد النشر** → تأكّد من بقاء المنتج (يثبت أن `DATABASE_URL` يعمل والبيانات تدوم).

---

## 6) قائمة فحص سريعة قبل الإطلاق

- [ ] خدمة PostgreSQL مضافة و`DATABASE_URL` مضبوط
- [ ] `JWT_SECRET` عشوائي ≥32 حرف
- [ ] `NODE_ENV=production`
- [ ] `CLOUDINARY_*` مضبوط (لاستمرار الصور)
- [ ] `PRODUCTION_URL`/`FRONTEND_URL` أو الاعتماد على `RAILWAY_PUBLIC_DOMAIN`
- [ ] فحص `/api/health` = 200 بعد النشر
- [ ] اختبار بقاء البيانات عبر إعادة نشر

<div align="center">

**AMANZINE — نظام تشغيل للحاجة © 2026** · تطوير: Alloservix · Abdellatif hadana

</div>
