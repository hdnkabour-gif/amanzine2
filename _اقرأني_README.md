# AMANZINE — حزمة التغييرات (Phase Beta)

## 🧠 الجديد: Inference + Confidence + Prediction Brain — «فكّر قبل أن تسأل»
- `src/lib/inference.ts`: يستنتج من الجملة بنسبة ثقة (Golf 7 → Volkswagen 0.97؛ أولويّات
  السوق المغربيّ → مازوط/عاديّة ~0.6). عتبات: ≥0.9 يملأ بصمت ✓ · 0.5–0.9 يملأ ويؤكّد ~ · <0.5 يسأل.
- شريط «افترضنا» في النشر (اضغط لتصحيح). لا يسأل عمّا استنتجه أو استخرجه — فقط المجهول الحقيقيّ.
- السلسلة: نيّة → كيان → سياق → استنتاج → Question Planner.
- مُتحقَّق: «Golf 7 2018 130k» → يستنتج الماركة+الوقود، يستخرج السنة+الكيلومترات، يسأل المدينة فقط. صفر أخطاء.

اقرأ SCENARIO_ENGINE.md. `tsc` صفر أخطاء · build ينجح.

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
