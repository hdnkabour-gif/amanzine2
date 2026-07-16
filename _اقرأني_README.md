# AMANZINE — حزمة التغييرات

## 🚂 إصلاح مشاكل النشر (Railway) — الأهمّ الآن
- **① فشل الـ Migration + ② شهادة SSL الموقّعة ذاتيًّا**: أُصلحا في `server/db.js` —
  الخادم يستعمل الآن TLS متسامحًا تلقائيًّا لأيّ Postgres مُدار (Railway/Supabase)، ويبقى
  صارمًا إن زوّدتَ CA. لا تحتاج شيئًا سوى DATABASE_URL الصحيح.
- **③ VAPID**: الكود سليم (يقرأ متغيّرات البيئة) — فقط ثبّت VAPID_PUBLIC_KEY/PRIVATE_KEY في Railway.
- **④ SecretsUsedInArgOrEnv**: تحذير من Railway لا كودك — ضع الأسرار كـ Runtime Variables.
- دليل كامل: **`server/DEPLOY_RAILWAY.md`** + ملاحظات TLS في `server/.env.example`.
- مُتحقَّق: روابط Railway/Supabase → TLS متسامح؛ محلّي → بلا TLS؛ CA → صارم. اختبارات الخادم 13/13.

## سابقًا: محرّك السيناريوهات · المحادثة · الاستنتاج بثقة · رحلات البيتا (ثوانٍ/twinId/رضا/Replay) · الصفحات · الهويّة.

## ⭐️ صورك في public/brand/: amanzine-logo.png · amanzine-icon.png · amanzine-final.jpg · amanzine-bg-1.jpg · amanzine-bg-2.jpg

`tsc` صفر أخطاء · `npm run build` ينجح · اختبارات الخادم 13/13.

## 🆕 جديد
- DESIGN_SYSTEM.md
- SCENARIO_ENGINE.md
- public/brand/amanzine-gate-poster.jpg
- public/brand/amanzine-gate.mp4
- public/brand/amanzine-mark-192.png
- public/brand/amanzine-mark-512.png
- public/brand/amanzine-og.jpg
- public/brand/amanzine-portal.mp4
- server/DEPLOY_RAILWAY.md
- src/components/ActivityTimeline.tsx
- src/components/JourneyAnalytics.tsx
- src/components/MasterBackground.tsx
- src/components/MySpaceSections.tsx
- src/lib/blueprints.ts
- src/lib/core/context.ts
- src/lib/core/orchestrator.ts
- src/lib/core/plugins.ts
- src/lib/domain.ts
- src/lib/experienceLog.ts
- src/lib/gateTransition.ts
- src/lib/inference.ts
- src/lib/journey.ts
- src/lib/knowledge/candidates.ts
- src/lib/knowledge/graph.ts
- src/lib/needEngine.ts
- src/pages/AssistantPage.tsx
- src/pages/KnowledgeStudio.tsx
- src/pages/LivingHome.tsx
- src/pages/ProfilePage.tsx
- src/pages/UniversalPublish.tsx
- src/pages/WalletPage.tsx
- src/styles/background-system.css
## ✏️ معدّل
- index.html
- public/amanzine-logo.svg
- public/manifest.json
- server/.env.example
- server/db.js
- server/routes/track.js
- src/App.tsx
- src/pages/AuthPage.tsx
- src/pages/DashboardPage.tsx
- src/pages/Explore.tsx
- src/pages/Landing/context.tsx
- src/pages/MainLayout.tsx
- src/pages/Marketplace.tsx
- src/pages/NavBar.tsx
- src/services/api.ts
- src/store.tsx
- src/types.ts
