# 🚂 AMANZINE — نشر الخادم على Railway (إصلاح المشاكل الثلاث)

سجلّاتك أظهرت ٣ مشاكل. اثنتان أُصلحتا في الكود، والثالثة إعداد متغيّرات.

---

## ① فشل الـ Migration + ② شهادة SSL الموقّعة ذاتيًّا ✅ أُصلحت في الكود
كان الخطأ:
```
DB migration failed — starting in degraded mode
self-signed certificate in certificate chain
```
**السبب:** كان الخادم يفرض تحقّق TLS صارمًا (`rejectUnauthorized:true`)، لكن Postgres على
Railway/Supabase يقدّم سلسلة شهادات **موقّعة ذاتيًّا** → يُرفض الاتصال → يفشل الـ migration.

**الإصلاح (`server/db.js`):** صار الخادم يستعمل تلقائيًّا **TLS متسامحًا** لأيّ قاعدة بيانات
بعيدة مُدارة، ويبقى **صارمًا** إن زوّدتَ شهادة CA. لا تحتاج أن تفعل شيئًا — فقط اضبط
`DATABASE_URL` الصحيح.

> ✅ تحقّقنا: مع رابط Railway/Supabase → `ssl = { rejectUnauthorized: false }` (يعمل).

---

## ③ مفاتيح VAPID تتولّد كل تشغيل ⚠️ إعداد (الكود سليم)
```
Generated new VAPID keys — existing subscriptions are now invalid
```
**السبب:** قرص Railway مؤقّت (ephemeral) → ملفّ `data/vapid.json` يُفقد كل نشر → يُعاد توليده.
الكود **يستعمل متغيّرات البيئة إن وُجدت** (`push.js`). فقط ثبّتها مرّة:

1. ولّد المفاتيح مرّة واحدة محليًّا:
   ```bash
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```
2. ضعهما في **Railway → Variables**:
   ```
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   ```
   (أو انسخهما من السطر الذي يطبعه السجلّ عند أوّل تشغيل.)

---

## متغيّرات Railway المطلوبة (Variables tab)
```
DATABASE_URL=postgresql://...        ← من Postgres plugin (Railway يملؤه)
JWT_SECRET=<عشوائيّ 32+ حرفًا>        ← node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
NODE_ENV=production
FRONTEND_URL=https://<نطاقك>
# رفع الصور (مستحسن):
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
لست بحاجة لأيّ متغيّر SSL على Railway/Supabase — `DATABASE_URL` وحده يكفي.

---

## ④ تحذير `SecretsUsedInArgOrEnv` (Docker) — ليس سبب توقّف
هذا من نظام بناء Railway (Nixpacks)، لا من كودك. **الحلّ:** ضع المفاتيح الحسّاسة
(OPENAI_API_KEY…) كـ **Runtime Variables** في تبويب Variables — لا كـ Build Args.
الخادم يقرؤها وقت التشغيل عبر `process.env`، فلا حاجة لتمريرها وقت البناء.

---

## تحقّق بعد النشر
```
GET /api/health → 200        ✅ الخادم يعمل
```
- لو ظهر «degraded mode» بعدُ → راجع `DATABASE_URL` (خطأ إملائيّ/منفذ/كلمة سر).
- Cron/Backup/Cloudinary/AbandonedCart في السجلّ = ✅ طبيعيّ.
