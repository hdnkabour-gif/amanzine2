# AMANZINE — حزمة التغييرات (Beta Ready)

## 🚀 الجديد: تجهيز البيتا (٥ أشياء خفيفة — لا عقول جديدة)
من سجلّ رحلة واحد:
1. **Analytics** — نسجّل كل خطوة بتوقيتها (`src/lib/journey.ts`). `journeyStats`: نسبة النشر · متوسّط الثواني · الرضا · أكثر نقطة خروج.
2. **Seconds-to-Result** — يُقاس ويُعرض على شاشة النجاح (هدف < 45ث).
3. **twinId** — نحجز هويّة Digital Twin عند النشر (بلا دورة حياة).
4. **Feedback** — 😀/😐/😞 بعد كل رحلة.
5. **Replay** — الرحلة كاملة بخطواتها + لوحة «رحلات المستخدمين» في مركز المعرفة (`JourneyAnalytics`).

مُتحقَّق: «أنا نجّار ألمنيوم» → «نُشِر في 2.5 ثانية 🎯» + twinId + feedback + رحلة مسجّلة (٥ خطوات). صفر أخطاء.

خارطة الطريق: **بعد ٥٠٠–١٠٠٠ رحلة حقيقيّة** → Learning/Evolution/Market Intelligence وضبط الثقة من بيانات فعليّة.

`tsc` صفر أخطاء · `npm run build` ينجح.

## 🆕 جديد
- DESIGN_SYSTEM.md
- SCENARIO_ENGINE.md
- public/brand/amanzine-gate-poster.jpg
- public/brand/amanzine-gate.mp4
- public/brand/amanzine-mark-192.png
- public/brand/amanzine-mark-512.png
- public/brand/amanzine-og.jpg
- public/brand/amanzine-portal.mp4
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
