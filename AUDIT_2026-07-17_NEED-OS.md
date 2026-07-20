# تقرير تحقّق — AMANZINE (نظام تشغيل للحاجة) · 2026-07-17

> **الغرض:** جولة كاملة على المشروع قبل التعديل. يرصد ما تبقّى من «فكرة التطبيق
> القديمة» (AI Commerce OS / SAHAR shop) غير المتّسق مع الهويّة الجديدة
> (Need OS — نظام تشغيل للحاجة). **هذا تحقّق فقط — لا تعديل بعد.**

---

## 0. الحالة الصحّية (الآن — أخضر ✅)

| فحص | نتيجة |
|---|---|
| `npx tsc --noEmit` | نظيف |
| `npm run build` | ينجح (12.5s) |
| Control Center — المرحلة أ | حيّ ومُتحقَّق (متصفّح) |
| الصفحة الرئيسيّة | **بالفعل على الهويّة الجديدة**: «شنو محتاج اليوم؟» |
| دستور `docs/` (00–08 + ADR-0001/0002 + DR-0001..0005) | مكتمل ومتّسق — هو المرجع الأعلى |

**خلاصة:** المحرّك والصفحة الرئيسيّة انتقلا للهويّة الجديدة. المتبقّي قديم في
**طبقة السطح** (الميتاداتا الظاهرة) و**الوثائق**، لا في قلب التطبيق.

---

## A. انجراف الهويّة — القديم لا يزال ظاهرًا 🔴 (أولويّة قصوى، خطر صفر)

### A1. `index.html` — يراه **كلّ** مستخدم على شاشة البداية
- `<title>AMANZINE — AI Commerce OS</title>`
- `<div id="splash-sub">AI Commerce OS</div>` ← النصّ الذي ظهر في لقطة الشاشة
- `<meta name="description" content="…نظام تشغيل التجارة الإلكترونية…">`
- `og:title` و `twitter:title` = «AI Commerce OS»
- schema.org `alternateName: "AI Commerce OS"`

**المطلوب لاحقًا:** «نظام تشغيل للحاجة / Need OS» + وصف «شنو محتاج اليوم؟».

### A2. `package.json`
- `"name": "ai-commerce-os"` · `"version": "3.2.0"` (هويّة قديمة في الميتاداتا).

### A3. `src/types.ts`
- ترويسة السطر 2: «AI Commerce OS — Complete Type System v8».
- سطر سِجلّ تجريبيّ 450: «AI Commerce OS v8».

### A4. مبعثرات في الكود (46 إشارة إجمالًا لـ commerce/super-app/متجر ذكي)
`src/pages/Landing/data.ts` (6) · `src/i18n/translations.ts` · `src/components/DiscoverSections.tsx` ·
`src/pages/Landing/sections/Footer.tsx` · `AuthPage.tsx` · `Marketplace.tsx` · `OrdersPage.tsx` · `icons.tsx`.
> ملاحظة: هذه صفحات «الحقبة التجاريّة». بعضها قد يبقى (متجر التاجر مجال Data صالح)،
> لكن **التأطير** (super-app/commerce OS) يجب أن يصير «مجالًا من مجالات الحاجة» لا هويّة.

---

## B. الوثائق — طبقتان متعارضتان 🟠

### B1. الجديدة الصحيحة (تُبقى مرجعًا)
`docs/` كاملة: `00_VISION` → `08_LEARNING_LOOP`, `docs/adr/ADR-0001..0002`,
`docs/decisions/DR-0001..0005`. **متّسقة مع Need OS.**

### B2. القديمة (Jul 11 — حقبة التجارة، تحتاج تحديثًا أو أرشفة)
16 ملفّ جذر: `README.md` (يقول **«SAHAR shop — AI Commerce OS»**!), `readme-final.md`,
`audit-final.md`, `AUDIT_REPORT.md`, `AUDIT_PROFESSIONAL.md`, `AUDIT_VERIFICATION.md`,
`FUNCTIONAL_AUDIT.md`, `PRODUCTION_READINESS.md`, `PROJECT_STATE_AND_ROADMAP.md`,
`SUPERAPP_ROADMAP.md`, `MARKETPLACE_ANALYSIS.md`, `AMANZINE_FULL_ARCHITECTURE.md`,
`AMANZINE_OVERVIEW.md`, `CHANGELOG_SESSION.md`, `PRELAUNCH_CHECKLIST.md`, `DEPLOY.md`.

- **«SAHAR»** (اسم أقدم) في 11 ملفّ وثائقيّ فقط — **لا في الكود الحيّ** (جيّد).

---

## C. كود ميّت / دَيْن تقنيّ 🟡 (كما رصد ADR-0002)

- `src/components/TikTokFeed.tsx` — **غير مستورد في أيّ مكان** → ميّت، آمن الحذف.
- بقايا SQLite في الخادم: `server/database-check.js`, `server/defaults.js`.
- ملفّات عملاقة (God files): `ProductsPage.tsx` 2298 · `SettingsPage.tsx` 1369 ·
  `Storefront.tsx` 985 · `store.tsx` 853 سطر.
  > التقسيم مؤجّل لمرحلة beta-hardening حسب ADR-0002 (ليس الآن).

---

## D. المراحل المتبقّية (حسب خارطة ADR-0002)

| # | المرحلة | الحالة |
|---|---|---|
| 1 | تجميد المعمار | ✅ |
| 2 | Knowledge Foundation v2 | ✅ |
| 3 | «فهمنا طلبك» | ✅ |
| 4 | **Control Center** | أ (قراءة فقط) ✅ → **ب Teach/Approve** ⏳ → Versioning/Sandbox ⏳ |
| 5 | Closed Beta (الدار البيضاء · صيانة منزليّة · 100–150 مزوّدًا) | ⏸️ مؤجّل عمدًا |
| 6 | Production hardening (Sentry · backups · God-split · Redis عند الحاجة) | ⏸️ مؤجّل |
| 7 | Memory · Learning suggestions · Semantic · Embeddings | ⏸️ مؤجّل حتى بيانات حقيقيّة |

**تنبيه معماريّ مهمّ:** المراحل 5–7 **مؤجّلة عمدًا** في ADR-0001/0002 حتى تتوفّر
بيانات البيتا. بناؤها الآن = «over-engineering» الذي تحذّر منه وثائقنا نفسها.
المرحلة الوحيدة القابلة للبناء قبل البيتا هي **Control Center — ب (Teach/Approve
عبر البوّابة البشريّة، القانون #3)**.

---

## الخطّة المقترحة للتعديل (بعد موافقتك — مرتّبة بالأثر/الخطر)

**Tier 1 — هويّة ظاهرة (أثر فوريّ، خطر صفر):**
1. `index.html`: title · splash-sub · meta description · og · twitter · schema →
   «نظام تشغيل للحاجة / Need OS» + «شنو محتاج اليوم؟».
2. `package.json`: `name` → `amanzine`.
3. `src/types.ts`: الترويسة + السطر التجريبيّ.

**Tier 2 — وثائق:**
4. `README.md`: إعادة كتابة كاملة على هويّة Need OS (إزالة SAHAR/Commerce OS).
5. توحيد ملفّات Audit: إبقاء هذا التقرير حديثًا + نقل القديمة إلى `docs/archive/`
   (لا حذف — تاريخ المشروع)، أو تحديث ترويساتها بلافتة «أرشيف — حقبة التجارة».

**Tier 3 — تنظيف كود (اختياريّ الآن):**
6. حذف `TikTokFeed.tsx` الميّت + بقايا SQLite في الخادم.
7. (God-split يبقى مؤجّلًا لـ beta-hardening.)

**Tier 4 — مرحلة قابلة للبناء:**
8. Control Center — المرحلة ب (Teach/Approve): تحويل «ما لم يُفهَم» في العقل الحيّ
   إلى مرشّحات معرفة تمرّ عبر اعتماد بشريّ (القانون #3) — بلا تعديل ذاتيّ.

> **قرار مطلوب منك:** هل نمشي Tier 1→2→3 (تنظيف الهويّة والوثائق أولًا)، أم تريد
> Tier 4 (المرحلة ب) قبلها؟ وهل نؤرشف الوثائق القديمة أم نحدّثها واحدةً واحدة؟
