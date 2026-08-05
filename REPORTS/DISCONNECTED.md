# الاستخراجُ الكامل — كلُّ ما هو موجودٌ ومفصول، وأثرُ ربطه أو حذفه

> وُلِّد بالقياس: خريطةُ استيرادٍ لـ٣٥٥ ملفًّا · ٨٠٦ رمزٍ مُصدَّر · ١٩٠ نقطةَ
> API · ٤٣ جدولًا · ٢٦ صفحة. المرجع: الكود، لا الذاكرة ولا التوثيق.

## الخلاصةُ التنفيذيّة

| الطبقة | الكلّ | مفصول |
|---|--:|--:|
| ملفّاتُ الإنتاج | ٢٧٧ | **٣٩** (٣٠٥٦ سطرًا) |
| رموزٌ مُصدَّرة | ٨٠٦ | **٢١٠** لا يستعملها شيء (٩٩ منها أنواع) |
| نقاطُ API | ١٩٠ | **٢١** لا يستدعيها العميل |
| جداولُ القاعدة | ٤٣ | ٠ — كلُّها مستعملة |
| صفحاتٌ في `PAGE_IDS` | ٢٦ | ٢ بلا مسارٍ في `App` |
| قدراتُ خادمٍ بلا صفحة | — | **٧** |

**ولا استيرادَ ديناميكيًّا بمتغيّرٍ في كود المشروع** — أي أنّ خريطة الاستيراد
كاملةٌ، وما لا يظهر فيها لا يُستدعى بطريقةٍ أخرى. هذا ما يجعل أحكامَ الحذف
أدناه قاطعةً لا ترجيحيّة.

---

## ① الملفّاتُ التي لا يصلها التطبيق

الحكم مبنيٌّ على ثلاثة فحوص: (أ) لا يستوردها ملفٌّ حيّ · (ب) لا يُذكَر مسارُها
في كودٍ حيٍّ غيرِ اختباريّ · (ج) لا استيرادَ ديناميكيًّا في المشروع.

| الملفّ | سطر | الدور | ما يتوقّف لو حُذف |
|---|--:|---|---|
| `src/pages/Landing/sections/NeedFirst.tsx` | 386 | NeedFirst — الشاشة الأولى. ليست قسمًا تسويقيًّا بل أوّلَ حوارٍ بين الإنسان والعق | اختبارُه فقط (`landingMirror.test.ts`) |
| `src/pages/Landing/data.ts` | 273 | ── الأنواع ────────────────────────────────────────────── | لا شيء |
| `src/pages/Landing/sections/Hero.tsx` | 186 | Hero — «آش واقع؟». ليست إعلانًا؛ إثبات فهم. المستخدم يكتب حالته بالدارجة، فالصفح | لا شيء |
| `src/lib/inference.ts` | 153 | Inference + Confidence — «فكّر قبل أن تسأل». قبل السؤال، نستنتج أكبر قدر من الجم | اختبارُه فقط (`firstFiveMinutes.test.ts`) |
| `src/lib/akg/relations.ts` | 139 | Entity Relations — الكيان ليس نهاية، بل بداية Graph. السيّارة مرتبطة بالتشخيص وا | لا شيء |
| `src/pages/Landing/components.tsx` | 120 | كشف الظهور عند التمرير | لا شيء |
| `src/lib/akg/uiContract.ts` | 112 | UI Contract — العقد الوحيد بين العقل والواجهة. العقل لا يُصدّر «حقولًا» ولا «أنو | اختبارُه فقط (`catalog.test.ts`, `dataLoss.test.ts`, `fashion.test.ts`, `knowledgeReach.test.ts`) |
| `src/lib/executionPolicy.ts` | 112 | سياسةُ التنفيذ — **المكانُ الوحيد** الذي يقول: نفّذ، أم اسأل، أم لا تفعل. كان ال | اختبارُه فقط (`executionPolicy.test.ts`) |
| `src/pages/Landing/sections/OSPreview.tsx` | 111 | نصوص مُحلّية لهذا القسم (5 لغات) | لا شيء |
| `src/lib/akg/decision.ts` | 106 | Decision Engine — «فكّر قبل ما تسأل». يجلس بين Capability Resolver و Question Pl | اختبارُه فقط (`firstFiveMinutes.test.ts`, `merchantSuccess.test.ts`) |
| `src/lib/akg/dna.ts` | 96 | Application DNA — العقل يعرف التطبيق كما يعرفه المطوّر. من جملة المستخدم، نستخرج | لا شيء |
| `src/pages/Landing/index.tsx` | 92 | نقش زاوية (نجمة مغربية) يظهر على البطاقات عند التحويم — مبنيّ من ألوان الثيم | لا شيء |
| `src/lib/akg/resolver.ts` | 91 | Capability Resolver — الطبقة التي تفصل «ماذا يمكن فعله» عن الواجهة. Question Pla | لا شيء |
| `src/lib/akg/planner.ts` | 84 | Question Planner — «المخطّط الغبيّ». لا يعرف صفحات ولا حقولًا ولا استنتاجًا. يسأ | لا شيء |
| `src/pages/Landing/context.tsx` | 76 | — | لا شيء |
| `src/lib/akg/userGraph.ts` | 67 | User Graph — المستخدم ليس مجهولًا يبدأ من الصفر. «أنا تقني شبكات، عندي سيّارة، ن | لا شيء |
| `src/lib/akg/world.ts` | 64 | World State — «متى» و«في أيّ ظرف» يحدث الطلب. بيع الملابس في رمضان ليس مثل الشتا | لا شيء |
| `src/lib/akg/actionPlanner.ts` | 56 | Action Planner — طبقة التنفيذ. AMANZINE ليس نظام فهم فقط، بل نظام تنفيذ. يحوّل ا | لا شيء |
| `src/lib/akg/kb/capabilities.ts` | 52 | Capability Registry (v2) — الاستدلال يعتمد على «القدرات» لا أسماء المهن فقط. سبّ | لا شيء |
| `src/pages/Landing/sections/Header.tsx` | 51 | — | لا شيء |
| `src/lib/akg/capabilities.ts` | 49 | Capabilities Engine — المرحلة ٢. الصفحة لم تعد كودًا مستقلًّا، بل «مجموعة قدرات» | لا شيء |
| `src/pages/Landing/hooks.ts` | 47 | هل تجاوز المستخدم حدّ تمرير معيّن؟ (لرأس الصفحة وزر العودة للأعلى) | لا شيء |
| `server/lib/retryQueue.js` | 46 | طابورُ إعادة المحاولة — تعطُّلٌ لحظيٌّ لدى الشركة لا يُضيع شحنة. API شركةِ التوص | اختبارُه فقط (`retry-queue.test.js`) |
| `src/pages/Landing/sections/Pricing.tsx` | 45 | — | لا شيء |
| `src/pages/Landing/sections/Footer.tsx` | 44 | — | لا شيء |
| `src/lib/akg/kb/categories.ts` | 42 | Category Registry — المجالات العشرة للسوق المغربيّ كبيانات. تربط القطاع بأيقونته | اختبارُه فقط (`food.test.ts`) |
| `src/lib/akg/viewModel.ts` | 40 | ViewModel Builder — الطبقة التي تفصل «نوع الحقل» عن «كيف يُرسَم». العقل لا يُصدّ | لا شيء |
| `src/pages/Landing/sections/LiveTicker.tsx` | 38 | نصوص مُحلّية للشريط (5 لغات) — قصيرة وخاصة بهذا القسم | لا شيء |
| `src/lib/akg/kb/tools.ts` | 36 | Tool & Material Registry — الأدوات والموادّ كمعرفة مرتبطة بالمهن. تُثري الاستدلا | لا شيء |
| `src/pages/Landing/sections/FAQ.tsx` | 34 | — | لا شيء |
| `src/pages/Landing/sections/Cities.tsx` | 30 | — | لا شيء |
| `src/pages/Landing/sections/HowItWorks.tsx` | 30 | — | لا شيء |
| `src/pages/Landing/sections/Bento.tsx` | 29 | — | لا شيء |
| `src/pages/Landing/sections/LiveMarketplace.tsx` | 27 | صدقٌ في العنوان: «إعلانات حقيقيّة» تُقال **فقط** حين تكون حقيقيّة. حين نعرض أمثل | لا شيء |
| `src/pages/Landing/sections/FinalCTA.tsx` | 25 | — | لا شيء |
| `src/pages/Landing/api.ts` | 21 | طبقة API — نقاط نهاية عامة حقيقية فقط (بلا مصادقة)، مع فشل صامت رشيق. | لا شيء |
| `src/pages/Landing/theme.ts` | 20 | نظام الألوان — هويّة Need OS (زمرّد + ذهب على كريم مغربيّ دافئ). الأسماء الدلالي | لا شيء |
| `src/pages/Landing/sections/PromoBanner.tsx` | 19 | شريط علوي ترويجي صادق (بلا عدّ تنازلي وهمي) — قابل للإغلاق | لا شيء |
| `src/utils/cn.ts` | 7 | — | لا شيء |

**المجموع: ٣٩ ملفًّا · ٣٠٥٦ سطرًا.** حذفُها لا يوقف شيئًا في المنتَج. الاستثناءُ
الوحيد: ستّةُ ملفّاتٍ تُسقط اختباراتِها معها، فتُحذَف مع اختباراتها أو تُوصَل.

---

## ② رموزٌ مُصدَّرةٌ لا يستعملها أحد

**111 دالّةً/ثابتًا** لا يذكرها كودٌ ولا اختبار، و**٩٩ نوعًا**.
وهذه أخطرُ من الملفّات الميّتة: الملفُّ حيٌّ فيبدو كلُّ ما فيه حيًّا.

| الملفّ | رموزٌ ميّتة |
|---|---|
| `src/components/icons.tsx` | `IconAmana` · `IconJibli` · `IconDress` · `IconShoes` · `IconBag` · `IconWatch` · `EmptyProducts` · `EmptyOrders` · `EmptyMessages` · `EmptyCustomers` · `EmptyResults` · `IllStartBusiness` · `IllConnectAccounts` · `IllAIPowered` · `IllSuccess` · `LogoAI` · `RobotMascot` · `AppIcon` · `IllLinkAccounts` · `BgCyberpunk` · `Icons` |
| `src/utils/sounds.ts` | `playNewOrder` · `playApproved` · `playShipped` · `playDelivered` · `playMessage` · `playWarning` · `playSuccess` |
| `src/lib/akg/kb/geo.ts` | `citiesOf` · `regionOfCity` · `districtsOf` · `postalOf` |
| `src/lib/akg/kb/tools.ts` | `registerTool` · `getTool` · `allTools` · `toolsForProfession` |
| `src/lib/akg/userGraph.ts` | `getUserProfile` · `pushUserAttr` · `userInferencesFrom` · `userGraphSize` |
| `src/utils/importSchema.ts` | `ProductSchema` · `CustomerSchema` · `OrderSchema` · `ImportFileSchema` |
| `server/database.js` | `getAvailabilitySlots` · `addAvailabilitySlot` · `syncVerifiedFlag` · `getOrderEvents` |
| `src/lib/akg/kb/capabilities.ts` | `registerCapability` · `getCapability` · `capabilitiesOfProfession` |
| `src/lib/akg/workflow.ts` | `registerWorkflow` · `allWorkflows` · `PHASE_ORDER` |
| `src/lib/understanding.ts` | `RemoteProvider` · `GPTProvider` · `ClaudeProvider` |
| `src/services/api.ts` | `healthCheck` · `couponsAPI` · `mediaAPI` |
| `src/lib/akg/capabilities.ts` | `capabilityState` · `capabilityReadiness` |
| `src/lib/akg/kb/categories.ts` | `registerCategory` · `categoriesByPriority` |
| `src/lib/akg/kb/index.ts` | `isNegated` · `resolveTerm` |
| `src/lib/akg/kb/problems.ts` | `problemsBySeverity` · `PROBLEMS` |
| `src/lib/akg/kb/professions.ts` | `registerProfession` · `professionsBySector` |
| `src/lib/akg/kb/vocabulary.ts` | `registerVocab` · `allVocab` |
| `src/lib/akg/modules.ts` | `registerModule` · `getModule` |
| `src/lib/akg/pageRegistry.ts` | `registerPageDef` · `pageSchema` |
| `src/lib/akg/registry.ts` | `essentialFields` · `describePage` |
| `src/lib/akg/resolver.ts` | `resolveCapabilities` · `capabilityPlan` |
| `src/lib/akg/services.ts` | `registerService` · `servicesByKind` |
| `src/lib/core/plugins.ts` | `registerPlugin` · `listPlugins` |
| `src/lib/experienceLog.ts` | `intentCounts` · `clearExperience` |
| `src/lib/needEngine.ts` | `cityIn` · `maskCities` |
| `src/lib/pushNotifications.ts` | `unsubscribeFromPush` · `getCurrentSubscription` |
| `src/lib/userMemory.ts` | `scheduleMemorySync` · `SYNCED_KEYS` |
| `src/types.ts` | `hasPermission` · `ROLE_PERMISSIONS` |
| `src/components/componentRegistry.tsx` | `registerComponent` |
| `src/lib/aiAvailability.ts` | `IMAGE_PROVIDERS` |
| `src/lib/akg/dna.ts` | `traceDna` |
| `src/lib/akg/kb/ambiguity.ts` | `AMBIGUOUS` |
| `src/lib/akg/kb/memory.ts` | `approvedMemory` |
| `src/lib/akg/kb/merchandise.ts` | `CONTAINER_WORDS` |
| `src/lib/akg/policies.ts` | `registerPolicy` |
| `src/lib/akg/relations.ts` | `relationsSize` |
| `src/lib/akg/uiContract.ts` | `stepActions` |
| `src/lib/akg/world.ts` | `seasonTag` |
| `src/lib/blueprints.ts` | `planNext` |
| `src/lib/domain.ts` | `getActivities` |
| `src/lib/mes.ts` | `getFeedback` |
| `src/pages/Landing/components.tsx` | `CountUp` |
| `src/pages/Landing/hooks.ts` | `useMagnetic` |
| `src/store.tsx` | `useRole` |
| `scripts/knowledge-audit.mjs` | `loadConcepts` |

### ورموزٌ لا يستعملها إلّا الاختبار (37)
- `src/lib/understanding.ts` — `detectLanguage` · `understandRules` · `shouldEscalate` · `hasLLM` · `OfflineProvider` · `GeminiProvider`
- `src/lib/akg/kb/places.ts` — `normPlace` · `allPlaces` · `placeById` · `judgePlace`
- `scripts/emit-cities.mjs` — `buildCities` · `loadSourceCities` · `DEST`
- `src/lib/akg/kb/contexts.ts` — `allContextTerms` · `contextValues`
- `src/lib/akg/kb/goals.ts` — `phantomConcepts` · `LIFE_NEEDS`
- `src/lib/executionPolicy.ts` — `decideExecution` · `explainDecision`
- `src/pages/Landing/sections/NeedFirst.tsx` — `readFacts` · `understandingScore`
- `src/lib/aiAvailability.ts` — `imageAiProviders`
- `src/lib/akg/kb/actions.ts` — `describeAction`
- `src/lib/akg/kb/arabizi.ts` — `isArabizi`
- `src/lib/akg/kb/categories.ts` — `allCategories`
- `src/lib/akg/kb/knowledge.ts` — `knowledgeStats`
- `src/lib/akg/kb/knowledgeGraph.ts` — `graphCoverage`
- `src/lib/akg/kb/merchandise.ts` — `MERCHANDISE`
- `src/lib/catalog.ts` — `allFieldsFor`
- `src/lib/clarify.ts` — `CLARIFICATION_IDS`
- `src/lib/intentSnapshot.ts` — `confidenceGain`
- `src/lib/merchantSuccess.ts` — `allNudgeRules`
- `src/lib/navProgression.ts` — `CORE_PAGES`
- `src/lib/persona.ts` — `PERSONA`
- `src/lib/searchIntent.ts` — `expandAll`
- `server/database.js` — `providersByVerification`
- `scripts/knowledge-audit.mjs` — `audit`

---

## ③ نقاطُ API لا يستدعيها العميل (٢١ من ١٩٠)

| المسار | الحكم |
|---|---|
| `POST /api/webhooks/delivery/:id` · `GET+POST /api/webhooks/meta` | ✅ **سليم** — تستدعيها شركاتُ التوصيل ومِتا، لا العميل |
| `GET /api/push/vapid-key` · `POST /api/push/subscribe` · `/unsubscribe` | ⚠️ الدوالُّ موجودةٌ في `pushNotifications.ts` لكن `unsubscribeFromPush` و`getCurrentSubscription` **ميّتتان** — الاشتراكُ نصفُ موصول |
| `GET /api/payment/methods` · `POST /api/payment/charge` · `POST /api/payment/:id/confirm` | ❌ **الدفعُ كلُّه بلا واجهة** |
| `GET /api/ai/misread-report` · `POST /api/ai/judge-misread` | ❌ بنيتُهما أمس — لا لوحةَ أدمن تقرؤهما بعد |
| `POST /api/ai/product-search` · `/whatsapp-confirm` · `GET /api/ai/comments/:platform` | ❌ بلا واجهة |
| `GET /api/settings/export` · `GET /api/settings/qr` | ❌ بلا زرّ |
| `GET /api/business/search` · `POST /api/customers/public` · `POST /api/delivery-auto/:orderId` · `POST /api/media/...` · `/api/knowledge/...` | ❌ بلا واجهة |

## ④ قدراتُ خادمٍ بلا صفحة

`loyalty` · `broadcast` · `track` · `recommend` · `feed` · `discover` · `needs`
— سبعةُ مساراتٍ عاملةٍ على الخادم بلا `PAGE_ID`. أي أنّ التطبيقَ **يقدر** ولا
أحدَ يستطيع أن يطلب.

وصفحتان في `PAGE_IDS` بلا مسارٍ في `App.tsx`: `conversations` · `banner`.

## ⑤ الجداول — الطبقةُ الوحيدةُ السليمة

٤٣ جدولًا، **كلُّها** يقرؤها أو يكتبها كودٌ خارجَ الترحيل. لا جدولَ ميّت.

## ⑥ التكرار — وهو أخطرُ من الموت

| ما هو مكرَّر | كم مرّة | أين | الأثر |
|---|--:|---|---|
| نقطةُ دخولٍ للفهم | **٤** | `parseNeed` · `understand` · `understandRules` · `orchestrate` | صفحتان تفهمان نفس الجملة بجوابَين |
| لغةُ النيّة | **٤** | `HumanIntent`(٧) · `Intent`(١٠) · `Stance`(٣) · `ActionVerb×Object`(٦×١٧) | لا مرجعَ لأيّ طبقةٍ جديدة |
| مطبِّعٌ عربيّ | **١٢** | ٨ منها تُعيد `[أإآٱ]→ا` حرفيًّا | إصلاحُ «سباط» في مكانٍ يترك ١١ |
| جدولُ «شيءٍ يُعرَض» | **٣** | `products` · `listings` · `provider_services` | موثَّقٌ في `DOMAIN_MAP` |
| قائمةُ القدرات | **٢ بالاسم نفسه** | `akg/capabilities.ts` · `akg/kb/capabilities.ts` — كلتاهما ميّتة | الاسمُ محجوزٌ لمعنيَين |

---

# الطريقُ إلى مشروعٍ مترابط

الترتيبُ **تبعيّ**: كلُّ مرحلةٍ تحتاج ما قبلها. والعمودُ الأخير هو الشرطُ
الذي يجعل المرحلةَ قابلةً للقياس — لا «انتهينا» بلا دليل.

| # | المرحلة | تعتمد على | الأثرُ المتوقَّع | كيف نتحقّق |
|--:|---|:--:|---|---|
| ١ | **`abilities.ts`** — كتالوجُ قدرات التطبيق: لكلّ قدرةٍ (الفعل · الكيان · ما تحتاجه · هل خطِرة · صلاحيّتها · صفحتُها ومسارُها) | — | مرجعٌ واحدٌ لأوّل مرّة | اختبارٌ يكسر البناءَ حين يوجد مسارُ خادمٍ أو صفحةٌ خارجَ الكتالوج |
| ٢ | **مطبِّعٌ واحد** `lib/normalize.ts` يستورده الاثنا عشر | — | «سباط=صباط» تُصلَح مرّةً | سبرٌ: تغييرُ المطبِّع يجب أن يُسقط اختباراتٍ في ملفّاتٍ متعدّدة |
| ٣ | **وصلُ `executionPolicy`** بالشاشة، و`canDo` من الكتالوج | ١ | «ما نقدرش» تصير ممكنة · ينتهي «السؤالُ الدائم» | عدُّ الأحكام على جمل المالك: `execute/confirm/ask/refuse` |
| ٤ | **تصنيفُ القرار بالمخاطرة** بدل عتبةٍ واحدة (٠٫٩٠) | ١،٣ | عرضٌ وبحثٌ ينفّذان بثقةٍ أقلّ · الحذفُ يُؤكَّد دائمًا | كلُّ قدرةٍ في الكتالوج تحمل `risk`، واختبارٌ يمنع `execute` على `high` |
| ٥ | **طبقةُ حقائق الشخص** (`أنا خضار` · `عندي محل` · `أنا فكازا`) تكتب في الذاكرة المتزامنة | ١ | لا يُسأل عمّا قاله | `facts` تتوقّف عن كونها صفرًا |
| ٦ | **تفكيكُ الجملة إلى أحداث** (لا على «و» بل على الأحداث المنطقيّة) | ٥ | «عندي محل وبغيت نبيع وبدلت النمرة» ⇒ ٣ لا ١ | عدُّ الأحداث المستخرَجة |
| ٧ | **توحيدُ العقول الأربعة** خلف الكتالوج | ١،٢،٥ | جوابٌ واحدٌ لكلّ جملة | اختبار: نفسُ الجملة تعطي نفسَ النتيجة من كلّ مدخل |
| ٨ | **الاقتراحاتُ الحيّة** أثناء الكتابة (بغيت… ⇒ بيع/شراء/تعديل) | ١ | يعرف ما يمكن بلا أن يحفظ كلمات | — |
| ٩ | **حذفُ الميّت**: ٣٩ ملفًّا · ١١١ رمزًا | ٧ (بعد النقل) | ‑٣٠٥٦ سطرًا | البناءُ والاختباراتُ تمرّ |
| ١٠ | **سدُّ القدرات بلا باب**: صفحاتٌ للسبع، أو إزالتُها | ١ | لا قدرةَ بلا طلب | فحصُ الكتالوج |
| ١١ | **`workspace_id`** ثمّ توحيدُ `products/listings/provider_services` | ٧ | كيانٌ واحدٌ لما يُعرَض | كما في `DOMAIN_MAP` |

## ما يجب ألّا يُحذَف رغم أنّه ميّت

- **`akg/world.ts` · `userGraph.ts` · `actionPlanner.ts`** — نموذجُ العالم الذي
  نحتاجه في المرحلتَين ٥ و٦. يُوصَل لا يُحذَف.
- **`executionPolicy.ts`** — المرحلة ٣.
- **`NeedFirst.tsx`** (٣٨٦ سطرًا) — يُنقَل إلى `LandingPage` قبل حذف المجلّد.
- **`retryQueue.js`** — منطقُ إعادة المحاولة للتوصيل؛ يُوصَل أو يُحذَف بقرارٍ صريح.

## ما يُحذَف بلا تردّد

`src/pages/Landing/` كلُّها عدا `NeedFirst` (٢٠ ملفًّا · ١٣١٨ سطرًا) ·
`akg/kb/tools.ts` · `akg/kb/capabilities.ts` · `akg/resolver.ts` ·
`akg/viewModel.ts` · `akg/dna.ts` · و١١١ رمزًا ميّتًا.
